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
      initialState: PropTypes.object,
      actions: PropTypes.object,
      meta: PropTypes.object
    };

    constructor(props) {
      super(props);

      this.actions = {};
      this.handlers = {};
      this.initializers = {};

      this.register(props.actions);

      this.state = {
        state: props.initialState || {},
        initialize: this.initialize,
        register: this.register,
        actions: this.actions
      };

      // meta state (api objects, etc.) -- mutable!
      this.meta = props.meta || {};
    }

    register = handlers => {
      Object.entries(handlers).forEach(([action, handler]) => {
        if (!this.handlers.hasOwnProperty(action)) {
          this.handlers[action] = new Set();
          this.initializers[action] = {};
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
          console.warning(`Unregistered action ${action} dispatched`);
        }
        return Promise.resolve(); // ignore undeclared actions
      }
    };

    initialize = (action, payload) => {
      const cache = this.initializers[action];
      const key = payload;
      const value = cache[key];
      if (value === undefined) {
        const promise = this.dispatch(action, payload);
        cache[key] = promise;
        promise.then(
          value => {
            cache[key] = true;
          },
          error => {
            cache[key] = error;
          }
        );
        throw promise;
      } else {
        if (isPromise(value)) {
          throw value; // pending initializer
        } else if (value === true) {
          return value; // resolved initializer
        } else {
          value.isInitializer = true;
          value.clear = () => {
            delete cache[key];
          };
          throw value; // initializer error
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
      initializer: PropTypes.array
    };

    render() {
      return (
        <StoreContext.Consumer
          unstable_observedBits={getObservedBits(this.props.name)}
        >
          {store =>
            (this.props.initializer
              ? store.initialize(...this.props.initializer)
              : true) &&
            this.props.children(store.state[this.props.name], store.actions)
          }
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
    function useStore(name, initializer = null) {
      const store = React.useContext(StoreContext, getObservedBits(name));
      if (initializer) {
        store.initialize(...initializer);
      }
      if (name) {
        return [store.state[name], store.actions];
      }
    }
    exports["useStore"] = useStore;
  }

  return exports;
};

export default createStore;
