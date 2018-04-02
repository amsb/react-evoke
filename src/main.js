import React from "react";
import PropTypes from "prop-types";
import produce from "immer";

const createContext = React.createContext;
// ? React.createContext
// : require("react-broadcast").createContext;

const DefaultPlaceholder = ({ message }) => (
  <b>{message ? message : "Loading..."}</b>
);

const DefaultPlaceholderError = ({ error, retry }) => (
  <div>
    {error.toString()} <button onClick={() => retry()}>Retry</button>
  </div>
);

const createStore = () => {
  const StoreContext = createContext({ state: {}, actions: {} });

  class Store extends React.Component {
    static propTypes = {
      actions: PropTypes.object,
      initialState: PropTypes.object,
      defaultPlaceholder: PropTypes.func,
      defaultPlaceholderDelay: PropTypes.number,
      defaultPlaceholderError: PropTypes.func,
      defaultPlaceholderComponent: PropTypes.func,
      defaultPlaceholderErrorComponent: PropTypes.func,
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

    defaultPlaceholder = () => {
      if (this.props.defaultPlaceholder === undefined) {
        return ({ message }) => <DefaultPlaceholder message={message} />;
      } else {
        return this.props.defaultPlaceholder;
      }
    };

    defaultPlaceholderError = () => {
      if (this.props.defaultPlaceholderError === undefined) {
        return ({ error, retry }) => (
          <DefaultPlaceholderError error={error} retry={retry} />
        );
      } else {
        return this.props.defaultPlaceholderError;
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
            defaultPlaceholderError: this.props.defaultPlaceholderError,
            defaultPlaceholderComponent: this.props.defaultPlaceholderComponent,
            defaultPlaceholderErrorComponent: this.props
              .defaultPlaceholderErrorComponent
          }}
        >
          {this.props.children}
        </StoreContext.Provider>
      );
    }
  }

  Store.defaultProps = {
    defaultPlaceholderDelay: 250,
    defaultPlaceholderComponent: DefaultPlaceholder,
    defaultPlaceholderErrorComponent: DefaultPlaceholderError
  };

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
      select: PropTypes.func,
      initializer: PropTypes.func,
      register: PropTypes.func,
      registerActions: PropTypes.object,
      placeholder: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
      placeholderDelay: PropTypes.number,
      placeholderError: PropTypes.func,
      defaultPlaceholder: PropTypes.func,
      defaultPlaceholderDelay: PropTypes.number,
      defaultPlaceholderError: PropTypes.func,
      defaultPlaceholderComponent: PropTypes.func,
      defaultPlaceholderErrorComponent: PropTypes.func
    };

    state = {
      showPlaceholder: this.props.initializer != null,
      retryFunc: null,
      error: null
    };

    componentDidMount() {
      if (this.props.registerActions != null) {
        // synchronously add new action handlers
        this.props.register(this.props.registerActions);
      }

      if (this.props.initializer != null) {
        this.setState(
          prevState => ({
            ...prevState,
            retryFunc: () =>
              this.props.initializer(this.props.state, this.props.actions),
            showPlaceholder: true
          }),
          () => {
            this.props
              .initializer(this.props.state, this.props.actions)
              .then(() =>
                this.setState(prevState => ({
                  ...prevState,
                  retryFunc: null,
                  showPlaceholder: false
                }))
              )
              .catch(error =>
                this.setState(prevState => ({
                  ...prevState,
                  error,
                  showPlaceholder: true
                }))
              );
          }
        );
      } else if (this.props.state.showPlaceholder) {
        this.setState(prevState => ({
          ...prevState,
          showPlaceholder: false
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
      if (this.props.placeholder !== null) {
        // this.props.placeholder is a function or undefined
        if (typeof this.props.placeholder === "function") {
          return this.props.placeholder();
        } else if (this.props.defaultPlaceholder !== null) {
          // this.props.defaultPlaceholder is a function or undefined
          if (typeof this.props.defaultPlaceholder === "function") {
            this.props.defaultPlaceholder(this.props.placeholder || {});
          } else {
            const placeholderProps = this.props.placeholder || {};
            return (
              <this.props.defaultPlaceholderComponent {...placeholderProps} />
            );
          }
        } else {
          // this.props.defaultPlaceholder is null,
          // render nothing as this.props.placeholder is null
          return null;
        }
      } else {
        // this.props.placeholder is null, render nothing
        return null;
      }
    }

    renderPlaceholderError() {
      if (this.props.placeholderError !== null) {
        // this.props.placeholder is a function or undefined
        if (typeof this.props.placeholderError === "function") {
          return this.props.placeholder();
        } else if (this.props.defaultPlaceholderError !== null) {
          // this.props.defaultPlaceholder is a function or undefined
          if (typeof this.props.defaultPlaceholderError === "function") {
            this.props.defaultPlaceholder(this.props.placeholderError || {});
          } else {
            return (
              <this.props.defaultPlaceholderErrorComponent
                error={this.state.error}
                retry={this.getRetryFunc()}
              />
            );
          }
        } else {
          // this.props.defaultPlaceholderError is null,
          // render nothing as placeholderError is null
          return null;
        }
      } else {
        // this.props.placeholderError is null, render nothing
        return null;
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
      } else if (this.props.select) {
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
        return this.props.children;
      }
    }
  }

  class Connector extends React.Component {
    static propTypes = {
      select: PropTypes.func,
      initializer: PropTypes.func,
      registerActions: PropTypes.object,
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

  return { Store, Connector };
};

export default createStore;
