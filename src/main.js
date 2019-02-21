import React from "react"
import PropTypes from "prop-types"
import produce from "immer"

function isPromise(obj) {
  return (
    !!obj &&
    (typeof obj === "object" || typeof obj === "function") &&
    typeof obj.then === "function"
  )
}

const ALL_ITEMS = undefined
const UNINITIALIZED = null

class UninitializedError extends Error {
  constructor(name, item) {
    super()
    this.uninitializedName = name
    this.uninitializedItem = item
  }
}

const shallowEqual = (obj1, obj2) => {
  const keys = Object.keys(obj1)
  return (
    keys.length === Object.keys(obj2).length &&
    keys.every(key => obj1[key] === obj2[key])
  )
}

function memoizeDeriver(select, derive) {
  let lastState = null
  let lastValue = null
  return function(getState, item) {
    const state = select(getState, item)
    if (!(lastState && shallowEqual(state, lastState))) {
      lastValue = derive(state)
    }
    lastState = state
    return lastValue
  }
}

const createStore = defaultProps => {
  let NAME_COUNT = 0
  const NAME_BITS = {}

  // calculate changed bits for StoreContext, whose value is
  // { state, actions, register, read }
  function getChangedBits({ state: prevState }, { state: nextState }) {
    let mask = 0
    for (let id in nextState) {
      if (prevState[id] !== nextState[id]) {
        mask |= NAME_BITS[id]
      }
    }
    return mask
  }

  // get the observed bits (bitmask) for a given top-level name
  // note: every 32nd name will share a bitmask
  function getObservedBits(name, item) {
    if (NAME_BITS.hasOwnProperty(name)) {
      return NAME_BITS[name]
    } else {
      const bits = 1 << NAME_COUNT++
      return (NAME_BITS[name] = bits)
    }
  }

  // create context for sharing THIS store
  const StoreContext = React.createContext({}, getChangedBits)

  // Store component
  class Store extends React.Component {
    static propTypes = {
      actions: PropTypes.object,
      initializers: PropTypes.object,
      initialState: PropTypes.object,
      derivedState: PropTypes.object,
      logger: PropTypes.func,
      meta: PropTypes.object
    }

    static defaultProps = defaultProps

    constructor(props) {
      super(props)

      this.actions = {}
      this.handlers = {}
      this.register(props.actions)

      if (props.initialState) {
        this.state = { ...props.initialState }
      } else {
        this.state = {}
      }

      this.derivedState = {}
      if (props.derivedState) {
        this.registerDerivedState(props.derivedState)
      }

      // meta state (api objects, etc.) -- mutable!
      this.meta = props.meta || {}

      // internal tracking
      this._pendingInitializations = {}
      this._dispatchId = 1
    }

    componentDidMount() {
      if (this.actions.hasOwnProperty("__SETUP__")) {
        this.actions["__SETUP__"]()
      }
    }

    componentWillUnmount() {
      if (this.actions.hasOwnProperty("__TEARDOWN__")) {
        this.actions["__TEARDOWN__"]()
      }
      // alert developer of an unmount during a pending initialization so they can
      // add the missing Suspense component
      if (process.env.NODE_ENV !== "production")
        if (Object.keys(this._pendingInitializations).length) {
          console.error(
            "Store unmounted during initialization. It must have a Suspense component below it."
          )
        }
    }

    componentDidUpdate() {
      // clear pending initializations if resolved after Store update
      Object.keys(this._pendingInitializations).forEach(name => {
        Object.keys(this._pendingInitializations[name]).forEach(item => {
          if (this._pendingInitializations[name][item] === true) {
            // only delete successfully resolved promises, leave
            // pending promises and errors
            delete this._pendingInitializations[name][item]
            if (!Object.keys(this._pendingInitializations[name]).length) {
              delete this._pendingInitializations[name]
            }
          }
        })
      })
    }

    register = handlers => {
      Object.keys(handlers).forEach((action) => {
        const handler = handlers[action]
        if (!this.handlers.hasOwnProperty(action)) {
          this.handlers[action] = new Set()
          this.actions[action] = payload => this.dispatch(action, payload)
        }
        this.handlers[action].add(handler)
      })
    }

    dispatch = (action, ...payload) => {
      const dispatchId = this._dispatchId++
      this.props.logger &&
        this.props.logger({
          type: "dispatch",
          dispatchId,
          action,
          payload
        })
      if (this.handlers.hasOwnProperty(action)) {
        const promises = []
        this.handlers[action].forEach((
          handler // Set.forEach for IE11
        ) =>
          promises.push(
            handler(
              {
                // only provide a public Store interface to actions
                update: mutator =>
                  this.update(mutator, { action, payload, dispatchId }),
                // set: replacer =>
                //   this.set(replacer, { action, payload, dispatchId }),
                getState: this.getState,
                actions: this.actions,
                meta: this.meta
              },
              ...payload
            )
          )
        )
        return Promise.all(promises)
          .then(values => {
            const result = Object.assign(
              Object.defineProperty({}, "dispatchId", {
                value: dispatchId,
                enumerable: false
              }),
              ...values.map(v => v || {})
            )
            this.props.logger &&
              this.props.logger({
                type: "executed",
                dispatchId,
                action,
                result
              })
            return result
          })
          .catch(error => {
            if (error) {
              if (!error.hasOwnProperty("dispatchId")) {
                Object.defineProperty(error, "dispatchId", {
                  value: dispatchId,
                  enumerable: false
                })
              }
            }
            this.props.logger &&
              this.props.logger({
                type: "error",
                dispatchId,
                action,
                payload,
                error
              })
            throw error
          })
      } else {
        if (process.env.NODE_ENV !== "production") {
          console.warn(`Unregistered action ${action} dispatched`)
        }
        return Promise.resolve(null) // ignore undeclared actions
      }
    }

    getState = (name, item) => {
      // provide abstract public interface for read-only access state
      // (in case we change how we manage it. for example, we may use
      // react-cache when it supports invalidation).
      if (name) {
        if (item) {
          if (this.state.hasOwnProperty(name)) {
            return this.state[name][item]
          } else {
            return undefined
          }
        } else {
          return this.state[name]
        }
      } else {
        return this.state
      }
    }

    registerDerivedState = derivedState => {
      Object.keys(derivedState).forEach((name) => {
        const deriver = derivedState[name]
        if (Array.isArray(deriver)) {
          this.derivedState[name] = memoizeDeriver(...deriver)
        } else {
          this.derivedState[name] = deriver
        }
        NAME_BITS[name] = 1073741823 // dependent on everything until first executed
      })
    }

    read = (name, item = ALL_ITEMS) => {
      // short-circuit return when already initialized
      if (
        this.state.hasOwnProperty(name) &&
        this.state[name] != UNINITIALIZED // eslint-disable-line eqeqeq
      ) {
        if (item === ALL_ITEMS) {
          return this.state[name]
        } else if (this.state[name].hasOwnProperty(item)) {
          return this.state[name][item]
        }
        // otherwise this.state[name][item] isn't initialized
      }

      // value isn't in store, check for derived state
      if (this.derivedState.hasOwnProperty(name)) {
        let mask = 0
        const getState = (name, item) => {
          mask |= getObservedBits(name, item)
          const value = this.getState(name, item)
          // eslint-disable-next-line eqeqeq
          if (value == UNINITIALIZED) {
            throw new UninitializedError(name, item)
          } else {
            return value
          }
        }
        try {
          const derivedValue = this.derivedState[name](getState, item)
          if (process.env.NODE_ENV !== "production") {
            if (isPromise(derivedValue)) {
              console.error(
                "derivedState state functions cannot be async, please do async work in actions"
              )
              throw new Error("Invalid derivedState")
            }
          }
          NAME_BITS[name] = mask // update derivedState bitmask w/dependencies
          return derivedValue
        } catch (error) {
          if (error instanceof UninitializedError) {
            name = error.uninitializedName
            item = error.uninitializedItem
          } else {
            throw error
          }
        }
      }

      // get initialization action
      const action = this.props.initializers[name]
      if (!action) {
        if (item === ALL_ITEMS) {
          throw Error(
            `Cannot use undefined ${name} without Store initializer for ${name}`
          )
        } else {
          throw Error(
            `Cannot use undefined ${name}[${item}] without Store initializer for ${name} with payload ${item}`
          )
        }
      }

      // create temporary cache for pending initialization
      if (!this._pendingInitializations.hasOwnProperty(name)) {
        this._pendingInitializations[name] = {}
      }
      const cache = this._pendingInitializations[name]

      // retrieve pending cache state for this item
      const cacheKeyForItem = item // could be ALL_ITEMS (=== undefined)
      const value = cache[cacheKeyForItem]
      if (
        value === undefined ||
        (value === true &&
          (!this.state.hasOwnProperty(name) ||
            this.state[name] == UNINITIALIZED)) // eslint-disable-line eqeqeq
      ) {
        // if there is no pending cache entry for this item
        // OR it resolved without error and state still uninitialized
        // warning: we may not want to be this lenient but it can be helpful
        // for signaling that a retry is worthwhile
        this.props.logger &&
          this.props.logger({
            type: "initialize",
            action,
            payload: item,
            initializer: name
          })
        const promise = new Promise(resolve =>
          // avoid updating state during existing state transition by deferring dispatch
          // until after promise is thrown and the calling render function exits.
          // https://developer.mozilla.org/en-US/docs/Web/JavaScript/EventLoop#Zero_delays
          setTimeout(resolve, 0)
        ).then(() => this.dispatch(action, item))

        // put pending promise in the cahce
        cache[cacheKeyForItem] = promise

        // suspend render and update cache when resolved
        throw promise.then(
          value => {
            cache[cacheKeyForItem] = true
          },
          error => {
            cache[cacheKeyForItem] = error
          }
        )
      } else {
        // item already in pending initialization cache
        if (isPromise(value)) {
          // re-suspend with pending initializer promise
          throw value
        } else if (value === true) {
          // noop throw to trigger short-circuit/synchronous read
          throw Promise.resolve()
        } else {
          // throw initializer error to error boundary
          value.isInitializer = true
          value.clear = () => {
            delete cache[cacheKeyForItem]
          }
          throw value
        }
      }
    }

    update = (mutator, context) =>
      // use immer copy-on-write (mutate draft) semantics to update current state
      new Promise(resolve => {
        let changes = []
        let reverts = []
        this.setState(
          prevState => {
            let nextState = produce(
              prevState,
              draftState => mutator(draftState),
              this.props.logger
                ? (p, r) => {
                    changes.push(...p)
                    reverts.push(...r)
                  }
                : undefined
            )

            if (this.props.middleware) {
              this.props.middleware.forEach(middleware => {
                nextState = produce(
                  nextState,
                  draftState =>
                    middleware(draftState, {
                      ...context,
                      changes,
                      reverts
                    }),
                  this.props.logger
                    ? (p, r) => {
                        changes.push(...p)
                        reverts.push(...r)
                      }
                    : undefined
                )
              })
            }

            return nextState
          },
          () =>
            resolve({
              type: "update",
              ...context,
              changes,
              reverts
            })
        )
      }).then(event => {
        this.props.logger && this.props.logger(event)
      })

    render() {
      return (
        <StoreContext.Provider
          value={{
            state: this.state,
            actions: this.actions,
            register: this.register,
            read: this.read
          }}
        >
          {this.props.children}
        </StoreContext.Provider>
      )
    }
  }

  class ErrorBoundary extends React.Component {
    static propTypes = {
      fallback: PropTypes.func.isRequired,
      onError: PropTypes.func,
      errorType: PropTypes.object
    }

    state = { error: null }

    static getDerivedStateFromError(error) {
      // Update state so the next render will show the fallback UI.
      return { error: error }
    }

    clearError = () => {
      if (this.state.error.isInitializer) {
        this.state.error.clear()
      }
      this.setState({ error: null })
    }

    componentDidCatch(error, info) {
      // You can also do things like log the error to an error reporting service
      if (this.props.onError) {
        this.props.onError(error, info)
      }
    }

    render() {
      if (this.state.error) {
        if (
          !this.props.errorType ||
          this.state.error instanceof this.props.errorType
        ) {
          return (
            <StoreContext.Consumer>
              {store =>
                this.props.fallback({
                  error: this.state.error,
                  state: store.state,
                  actions: store.actions,
                  clearError: this.clearError
                })
              }
            </StoreContext.Consumer>
          )
        } else {
          throw this.state.error
        }
      } else {
        return this.props.children
      }
    }
  }

  class UseStore extends React.Component {
    static propTypes = {
      name: PropTypes.string,
      item: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number,
        PropTypes.bool,
        PropTypes.symbol
      ])
    }

    render() {
      return (
        <StoreContext.Consumer
          observedBits={
            this.props.name
              ? getObservedBits(this.props.name, this.props.item)
              : 0
          }
        >
          {store =>
            this.props.name
              ? this.props.children(
                  store.read(this.props.name, this.props.item),
                  store.actions
                )
              : this.props.children(store.actions)
          }
        </StoreContext.Consumer>
      )
    }
  }

  const exports = {
    Store,
    ErrorBoundary,
    UseStore
  }

  if (React.useContext) {
    function useStore(name, item) {
      const store = React.useContext(
        StoreContext,
        this.props.name ? getObservedBits(name, item) : 0
      )
      if (name) {
        return [store.read(name, item), store.actions]
      } else {
        return store.actions
      }
    }
    exports["useStore"] = useStore
  }

  return exports
}

export function consoleLogger({ type, action, ...info }) {
  switch (type) {
    case "initialize":
      console.log(
        `%c${type} %c${info.initializer}%c%s %cwith %c${action}`,
        "font-weight: bold;",
        "color: green; font-weight: bold;",
        "color: black; font-weight: bold;",
        info.payload ? `["${info.payload}"]` : "",
        "color: black; font-weight: normal;",
        "color: blue; font-weight: bold;"
      )
      break
    case "dispatch":
      console.group(
        `[${info.dispatchId}] ${type} %c${action}%c`,
        "color: blue;",
        "color: black"
      )
      info.payload.forEach(arg => arg != null && console.log(arg))
      console.groupEnd()
      break
    case "executed":
      console.group(
        `[${info.dispatchId}] ${type} %c${action}%c`,
        "color: blue;",
        "color: black"
      )
      Object.keys(info.result).length > 0 && console.log(info.result)
      console.groupEnd()
      break
    case "update":
      console.group(
        `[${info.dispatchId}] ${type} %cfrom %c${action}%c`,
        "font-weight: normal;",
        "color: blue;",
        "color: black"
      )
      info.changes.forEach(patch => {
        if (patch.path.length > 1) {
          console.groupCollapsed(
            `%c${patch.op} %c${patch.path.slice(0, patch.path.length - 1)}%c["${
              patch.path[patch.path.length - 1]
            }"]`,
            "font-weight: normal; font-style: italic;",
            "color: green",
            "color: black"
          )
        } else {
          console.groupCollapsed(
            `%c${patch.op} %c${patch.path[0]}`,
            "font-weight: normal; font-style: italic;",
            "color: green"
          )
        }
        console.log(patch.value)
        console.groupEnd()
      })
      console.groupEnd()
      break
    case "error":
      console.groupCollapsed(
        `[${info.dispatchId}] %c${type} %cin %c${action}`,
        "color: red",
        "color: black; font-weight: normal;",
        "color: black"
      )
      console.log(info.error)
      console.groupEnd()
      break
    default:
      console.groupCollapsed(
        `%c${type} %c${action}`,
        "color: lightgrey",
        "color: black"
      )
      console.log(info)
      console.groupEnd()
  }
}

export default createStore
