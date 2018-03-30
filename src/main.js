import React from "react";
import PropTypes from "prop-types";
import produce from "immer";

const createContext = React.createContext;
// ? React.createContext
// : require("react-broadcast").createContext;

export const createStore = () => {
  const StoreContext = createContext({ state: {}, actions: {} });

  class Store extends React.Component {
    static propTypes = {
      actions: PropTypes.object,
      initialState: PropTypes.object,
      defaultPlaceholder: PropTypes.func,
      defaultPlaceholderDelay: PropTypes.number,
      defaultPlaceholderError: PropTypes.func,
      meta: PropTypes.object
    };

    constructor(props) {
      super(props);

      this.actions = {};
      this.meta = props.meta || {}; // meta state (api objects, etc.) -- mutable!

      this.handlers = {};
      if (props.actions) {
        this.register(props.actions);
      }

      this.state = props.initialState || {};
    }

    register = handlers => {
      Object.entries(handlers).forEach(([action, handler]) => {
        if (!this.handlers.hasOwnProperty(action)) {
          // use Set to avoid double-adding same handler function
          this.handlers[action] = new Set();
          this.actions[action] = payload => this.dispatch(action, payload);
        }
        this.handlers[action].add(handler);
      });
    };

    update = (updater, replace) =>
      replace
        ? new Promise(resolve =>
            // use traditional react setState semantics
            this.setState(prevState => updater(prevState), resolve)
          )
        : new Promise(resolve =>
            // user immer copy-on-write (mutate draft) semantics 
            this.setState(produce(draftState => updater(draftState)), resolve)
          );

    dispatch = (action, payload) => {
      if (this.handlers.hasOwnProperty(action)) {
        const promises = [];
        this.handlers[action].forEach(handler =>
          // IE 11 supports Set.forEach but not Set.values
          promises.push(handler(this, payload))
        );
        return Promise.all(promises);
      } else {
        // ignore undeclared actions
        return Promise.resolve();
      }
    };

    render() {
      return (
        <StoreContext.Provider
          value={{
            state: this.state,
            actions: this.actions,
            register: this.register,
            defaultPlaceholder: this.props.defaultPlaceholder,
            defaultPlaceholderDelay: this.props.defaultPlaceholderDelay,
            defaultPlaceholderError: this.props.defaultPlaceholderError
          }}
        >
          {this.props.children}
        </StoreContext.Provider>
      );
    }
  }

  Store.defaultProps = {
    defaultPlaceholderDelay: 500
  };

  class Invoke extends React.Component {
    static propTypes = {
      function: PropTypes.func.isRequired,
      payload: PropTypes.object,
      when: PropTypes.oneOfType([PropTypes.func, PropTypes.bool]),
      callback: PropTypes.func
    };

    componentDidMount = () => {
      if (
        this.props.function &&
        (this.props.when === undefined ||
          ((typeof this.props.when === "function" && this.props.when()) ||
            this.props.when))
      ) {
        this.props
          .function(this.props.payload)
          .then(
            () => this.props.callback !== undefined && this.props.callback()
          );
      } else if (this.props.callback !== undefined) {
        this.props.callback(); // callback even when function not executed
      }
    };

    render() {
      return this.props.children || null;
    }
  }

  class Delayed extends React.Component {
    static propTypes = {
      delay: PropTypes.number
    };

    constructor(props) {
      super(props);
      this.state = {
        hidden: props.delay > 0
      };
      this._isMounted = false;
      this._timeout = null;
    }

    componentDidMount = () => {
      this._isMounted = true;
      if (this.props.delay > 0 && !this.state.hidden) {
        this.setState({ ...this.state, hidden: true });
      }
      this._timeout = setTimeout(() => {
        if (this._isMounted) {
          this.setState({ hidden: false });
        }
      }, this.props.delay);
    };

    componentWillUnmount() {
      this._isMounted = false;
    }

    render() {
      if (!this.state.hidden) {
        return this.props.children || null;
      } else {
        return null;
      }
    }
  }

  Delayed.defaultProps = {
    delay: 500
  };

  const Connected = ({ children, ...props }) => children(props);

  class Connection extends React.Component {
    static propTypes = {
      state: PropTypes.object,
      actions: PropTypes.object,
      select: PropTypes.func.isRequired,
      initializer: PropTypes.func,
      initializeWhen: PropTypes.oneOfType([PropTypes.func, PropTypes.bool]),
      placeholder: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
      placeholderDelay: PropTypes.number,
      placeholderError: PropTypes.func,
      defaultPlaceholder: PropTypes.func,
      defaultPlaceholderDelay: PropTypes.number,
      defaultPlaceholderError: PropTypes.func
    };

    state = {
      isInitializing: true,
      showPlaceholder: false,
      retryFunc: null,
      error: null
    };

    mustInitialize() {
      if (this.props.initializer) {
        if (this.props.initializeWhen != null) {
          return typeof this.props.initializeWhen === "function"
            ? this.props.initializeWhen(this.props.state)
            : !!this.props.initializeWhen;
        } else {
          return true;
        }
      } else {
        return false;
      }
    }

    componentDidMount() {
      if (this.state.isInitializing && this.mustInitialize()) {
        this.setState(
          prevState => ({
            ...prevState,
            retryFunc: () => this.props.initializer(this.props.actions),
            showPlaceholder: true,
            isInitializing: true
          }),
          () => {
            this.props
              .initializer(this.props.actions)
              .then(() =>
                this.setState(prevState => ({
                  ...prevState,
                  retryFunc: null,
                  showPlaceholder: false,
                  isInitializing: false
                }))
              )
              .catch(error =>
                this.setState(prevState => ({
                  ...prevState,
                  error,
                  showPlaceholder: true,
                  isInitializing: false
                }))
              );
          }
        );
      } else {
        this.setState(prevState => ({
          ...prevState,
          showPlaceholder: false,
          isInitializing: false
        }));
      }
    }

    clearError = () =>
      new Promise(resolve =>
        this.setState(
          prevState => ({
            ...prevState,
            error: null,
            retryFunc: null,
            showPlaceholder: false
          }),
          resolve
        )
      );

    withPlaceholder = func =>
      new Promise(resolve =>
        this.setState(
          prevState => ({
            ...prevState,
            error: null,
            retryFunc: func,
            showPlaceholder: true
          }),
          () =>
            func()
              .then(() =>
                this.setState(
                  prevState => ({
                    ...prevState,
                    error: null,
                    retryFunc: null,
                    showPlaceholder: false
                  }),
                  resolve
                )
              )
              .catch(error =>
                this.setState(
                  prevState => ({ ...prevState, error, showPlaceholder: true }),
                  resolve
                )
              )
        )
      );

    getRetryFunc = () => {
      if (this.state.retryFunc) {
        return () => this.withPlaceholder(this.state.retryFunc);
      } else {
        return null;
      }
    };

    renderPlaceholder() {
      return typeof this.props.placeholder === "function"
        ? this.props.placeholder()
        : this.props.defaultPlaceholder
          ? this.props.defaultPlaceholder(this.props.placeholder || {})
          : null;
    }

    renderPlaceholderError() {
      if (typeof this.props.placeholderError === "function") {
        return this.props.placeholderError(
          this.state.error,
          this.getRetryFunc()
        );
      } else if (this.props.defaultPlaceholderError) {
        return this.props.defaultPlaceholderError(
          this.state.error,
          this.getRetryFunc()
        );
      } else {
        throw this.state.error;
      }
    }

    render() {
      if (this.state.showPlaceholder) {
        if (!this.state.error) {
          return (
            <Delayed
              delay={
                this.props.placeholderDelay ||
                this.props.defaultPlaceholderDelay
              }
            >
              {this.renderPlaceholder()}
            </Delayed>
          );
        } else {
          return this.renderPlaceholderError();
        }
      } else if (!this.state.isInitializing) {
        return (
          <Connected
            {...this.props.select(
              this.props.state,
              this.props.actions,
              this.withPlaceholder
            )}
          >
            {this.props.children}
          </Connected>
        );
      } else {
        return null;
      }
    }
  }

  class Connector extends React.Component {
    static propTypes = {
      select: PropTypes.func.isRequired,
      initializer: PropTypes.func,
      initializeWhen: PropTypes.oneOfType([PropTypes.func, PropTypes.bool]),
      placeholder: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
      placeholderDelay: PropTypes.number,
      placeholderError: PropTypes.func
    };

    render() {
      return (
        <StoreContext.Consumer>
          {context => (
            <Connection {...this.props} {...context}>
              {this.props.children}
            </Connection>
          )}
        </StoreContext.Consumer>
      );
    }
  }

  class Dispatch extends React.Component {
    static propTypes = {
      action: PropTypes.string.isRequired,
      payload: PropTypes.object,
      when: PropTypes.oneOfType([PropTypes.func, PropTypes.bool]),
      callback: PropTypes.func
    };

    render() {
      return (
        <StoreContext.Consumer>
          {({ state, actions }) => (
            <Invoke
              function={actions[this.props.action]}
              payload={this.props.payload}
              when={this.props.when}
              callback={this.props.callback}
            >
              {this.props.children || null}
            </Invoke>
          )}
        </StoreContext.Consumer>
      );
    }
  }

  class Register extends React.Component {
    static propTypes = {
      actions: PropTypes.object.isRequired
    };

    render() {
      return (
        <StoreContext.Consumer>
          {({ state, actions, register }) => (
            <Invoke function={register} payload={this.props.actions}>
              {this.props.children || null}
            </Invoke>
          )}
        </StoreContext.Consumer>
      );
    }
  }

  return { Store, Connector, Dispatch, Register };
};
