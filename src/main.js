import React from "react";
import PropTypes from "prop-types";
import produce from "immer";

function isPromise(obj) {
  return (
    !!obj &&
    (typeof obj === "object" || typeof obj === "function") &&
    typeof obj.then === "function"
  );
}

const createStore = () => {
  let NAME_COUNT = 0;
  const NAME_BITS = {};

  function getChangedBits({ state: prev }, { state: next }) {
    let mask = 0;
    for (let id in next) {
      if (prev[id] !== next[id]) {
        mask |= NAME_BITS[id];
      }
    }
    return mask;
  }

  function getObservedBits(name) {
    if (NAME_BITS.hasOwnProperty(name)) {
      return NAME_BITS[name];
    } else {
      return (NAME_BITS[name] = 1 << NAME_COUNT++);
    }
  }

  const StoreContext = React.createContext({}, getChangedBits);

  class Store extends React.Component {
    static propTypes = {
      actions: PropTypes.object,
      initializers: PropTypes.object,
      initialState: PropTypes.object,
      meta: PropTypes.object
    };

    constructor(props) {
      super(props);

      this.actions = {};
      this.handlers = {};

      this.register(props.actions);

      this.state = {
        state: props.initialState || {},
        read: this.read,
        register: this.register,
        actions: this.actions
      };

      // meta state (api objects, etc.) -- mutable!
      this.meta = props.meta || {};

      // internal tracking
      this._pendingInitializations = {};
    }

    componentDidUpdate() {
      Object.keys(this._pendingInitializations).forEach(name => {
        Object.keys(this._pendingInitializations[name]).forEach(item => {
          if (
            this.state.state.hasOwnProperty(name) &&
            this.state.state[name].hasOwnProperty(item)
          ) {
            delete this._pendingInitializations[name][item];
            if (!Object.keys(this._pendingInitializations[name]).length) {
              delete this._pendingInitializations[name];
            }
          }
        });
      });
    }

    register = handlers => {
      Object.entries(handlers).forEach(([action, handler]) => {
        if (!this.handlers.hasOwnProperty(action)) {
          this.handlers[action] = new Set();
          this.actions[action] = payload => this.dispatch(action, payload);
        }
        this.handlers[action].add(handler);
      });
    };

    dispatch = (action, payload) => {
      if (this.handlers.hasOwnProperty(action)) {
        const promises = [];
        this.handlers[action].forEach(handler =>
          // IE 11 supports Set.forEach but not Set.values
          promises.push(handler(this, payload))
        );
        return Promise.all(promises);
      } else {
        if (process.env.NODE_ENV !== "production") {
          console.warn(`Unregistered action ${action} dispatched`);
        }
        return Promise.resolve(); // ignore undeclared actions
      }
    };

    read = (name, item) => {
      // short-circuit return when already initialized
      if (this.state.state.hasOwnProperty(name)) {
        if (item === undefined) {
          return this.state.state[name];
        } else if (this.state.state[name].hasOwnProperty(item)) {
          return this.state.state[name][item];
        }
      }
      if (!this._pendingInitializations.hasOwnProperty(name)) {
        this._pendingInitializations[name] = {};
      }
      const cache = this._pendingInitializations[name];
      const action = this.props.initializers[name];
      if (!action) {
        if (item === undefined) {
          throw Error(
            `Cannot use undefined ${name} without Store initializer for ${name}`
          );
        } else {
          throw Error(
            `Cannot use undefined ${name}[${item}] without Store initializer for ${name} with payload ${item}`
          );
        }
      }
      const cacheKeyForItem = item;
      const value = cache[cacheKeyForItem];
      if (value === undefined) {
        const promise = new Promise(resolve =>
          // avoid updating state during existing state transition by deferring dispatch
          // until after promise is thrown and the calling render function exits.
          // https://developer.mozilla.org/en-US/docs/Web/JavaScript/EventLoop#Zero_delays
          setTimeout(resolve, 0)
        ).then(() => this.dispatch(action, item));
        cache[cacheKeyForItem] = promise;
        promise.then(
          value => {
            cache[cacheKeyForItem] = true;
          },
          error => {
            cache[cacheKeyForItem] = error;
          }
        );
        throw promise;
      } else {
        if (isPromise(value)) {
          // suspend with pending initializer promise
          throw value;
        } else if (value === true) {
          // resolved initializer (unreached due to short-circuit at top of method)
          if (item === undefined) {
            return this.state.state[name];
          } else {
            return this.state.state[name][item];
          }
        } else {
          // throw initializer error to error boundary
          value.isInitializer = true;
          value.clear = () => {
            delete cache[cacheKeyForItem];
          };
          throw value;
        }
      }
    };

    replace = replacer =>
      new Promise(resolve =>
        // use traditional react setState semantics to replace current state with
        // new state that uses structural sharing where values haven't changed
        this.setState(
          ({ state: prevState, ...rest }) => ({
            state: replacer(prevState),
            ...rest
          }),
          resolve
        )
      );

    update = mutator =>
      new Promise(resolve =>
        // use immer copy-on-write (mutate draft) semantics to update current state
        this.setState(
          ({ state: prevState, ...rest }) => ({
            state: produce(prevState, draftState => mutator(draftState)),
            ...rest
          }),
          resolve
        )
      );

    render() {
      return (
        <StoreContext.Provider value={this.state}>
          {this.props.children}
        </StoreContext.Provider>
      );
    }
  }

  class ErrorBoundary extends React.Component {
    static propTypes = {
      fallback: PropTypes.func.isRequired,
      onError: PropTypes.func,
      errorType: PropTypes.object
    };

    state = { error: null };

    static getDerivedStateFromError(error) {
      // Update state so the next render will show the fallback UI.
      return { error: error };
    }

    clearError = () => {
      if (this.state.error.isInitializer) {
        this.state.error.clear();
      }
      this.setState({ error: null });
    };

    componentDidCatch(error, info) {
      // You can also do things like log the error to an error reporting service
      if (this.props.onError) {
        this.props.onError(error, info);
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
          );
        } else {
          throw this.state.error;
        }
      } else {
        return this.props.children;
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
    };

    render() {
      return (
        <StoreContext.Consumer
          unstable_observedBits={getObservedBits(this.props.name || 0)}
        >
          {store => {
            if (this.props.name) {
              return this.props.children(
                store.read(this.props.name, this.props.item),
                store.actions
              );
            } else {
              return this.props.children(store.actions);
            }
          }}
        </StoreContext.Consumer>
      );
    }
  }

  const exports = {
    Store,
    ErrorBoundary,
    UseStore
  };

  if (React.useContext) {
    function useStore(name, item) {
      const store = React.useContext(StoreContext, getObservedBits(name || 0));
      if (name) {
        return [store.read(name, item), store.actions];
      } else {
        return store.actions;
      }
    }
    exports["useStore"] = useStore;
  }

  return exports;
};

export default createStore;
