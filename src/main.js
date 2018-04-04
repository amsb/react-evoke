import React from "react";
import PropTypes from "prop-types";
import produce from "immer";

const createContext = React.createContext;
// ? React.createContext
// : require("react-broadcast").createContext;

const DefaultPlaceholder = ({ message }) => (
  <b>{message ? message : "Loading..."}</b>
);

const DefaultPlaceholderError = ({ error, retry, clear }) => (
  <div>
    {error.toString()} <button onClick={() => retry()}>Retry</button>
  </div>
);

const createStore = () => {
  const StoreContext = createContext({ state: {}, actions: {} });

  /**
   * General component description.
   */
  class Store extends React.Component {
    static propTypes = {
      actions: PropTypes.object,
      initialState: PropTypes.object,
      placeholder: PropTypes.func,
      placeholderDelay: PropTypes.number,
      placeholderError: PropTypes.func,
      meta: PropTypes.object
    };

    constructor(props) {
      super(props);

      this.state = {
        state: props.initialState || {},
        actions: {},
        placeholder: this.props.placeholder,
        placeholderDelay: props.placeholderDelay,
        placeholderError: props.placeholderError
      };

      this.handlers = {};
      // meta state (api objects, etc.) -- mutable!
      this.meta = props.meta || {};
    }

    register = handlers => {
      let newActions = {};
      Object.entries(handlers).forEach(([action, handler]) => {
        if (!this.handlers.hasOwnProperty(action)) {
          // use Set to avoid double-adding same handler function
          this.handlers[action] = new Set();
          newActions[action] = payload => this.dispatch(action, payload);
        }
        this.handlers[action].add(handler);
      });
      this.setState({
        ...this.state,
        actions: { ...this.state.actions, ...newActions }
      });
    };

    update = (updater, replace) =>
      replace
        ? new Promise(resolve =>
            // use traditional react setState semantics
            this.setState(
              ({ state: prevState, ...rest }) => ({
                state: updater(prevState),
                ...rest
              }),
              resolve
            )
          )
        : new Promise(resolve =>
            // user immer copy-on-write (mutate draft) semantics
            this.setState(
              ({ state: prevState, ...rest }) => ({
                state: produce(prevState, draftState => updater(draftState)),
                ...rest
              }),
              resolve
            )
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

    componentDidMount() {
      if (this.props.actions) {
        this.register(this.props.actions);
      }
    }

    render() {
      return (
        <StoreContext.Provider value={this.state}>
          {this.props.children}
        </StoreContext.Provider>
      );
    }
  }

  Store.defaultProps = {
    placeholderDelay: 250,
    placeholder: ({ message }) => <DefaultPlaceholder message={message} />,
    placeholderError: ({ error, retry }) => (
      <DefaultPlaceholderError error={error} retry={retry} />
    )
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
      placeholder: PropTypes.func,
      placeholderData: PropTypes.object,
      placeholderDelay: PropTypes.number,
      placeholderError: PropTypes.func
    };

    state = {
      showPlaceholder: this.props.initializer != null,
      placeholderData: null,
      retry: null,
      error: null
    };

    componentDidMount() {
      if (this.props.initializer != null) {
        this.setState(
          prevState => ({
            ...prevState,
            retry: () =>
              Promise.resolve(
                this.props.initializer(this.props.state, this.props.actions)
              ),
            showPlaceholder: true
          }),
          () => {
            Promise.resolve(
              this.props.initializer(this.props.state, this.props.actions)
            )
              .then(() =>
                this.setState(prevState => ({
                  ...prevState,
                  retry: null,
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
            retry: null,
            showPlaceholder: false,
            placeholderData: null
          }),
          resolve
        )
      );

    withPlaceholder = (func, placeholderData = null) =>
      new Promise(resolve =>
        this.setState(
          prevState => ({
            ...prevState,
            error: null,
            retry: func,
            showPlaceholder: true,
            ...(placeholderData ? { placeholderData } : {})
          }),
          () =>
            func()
              .then(() =>
                this.setState(
                  prevState => ({
                    ...prevState,
                    error: null,
                    retry: null,
                    showPlaceholder: false,
                    placeholderData: null
                  }),
                  resolve
                )
              )
              .catch(error =>
                this.setState(
                  prevState => ({
                    ...prevState,
                    error,
                    showPlaceholder: true
                  }),
                  resolve
                )
              )
        )
      );

    render() {
      if (this.state.showPlaceholder) {
        if (!this.state.error) {
          return (
            <Delayed delay={this.props.placeholderDelay}>
              {this.props.placeholder
                ? this.props.placeholder(
                    this.state.placeholderData ||
                      this.props.placeholderData ||
                      {}
                  )
                : null}
            </Delayed>
          );
        } else {
          return this.props.placeholderError
            ? this.props.placeholderError({
                error: this.state.error,
                retry: () =>
                  this.withPlaceholder(this.state.retry)
                    ? this.state.retry
                    : null,
                clear: this.clearError
              })
            : null;
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
      placeholder: PropTypes.func,
      placeholderData: PropTypes.object,
      placeholderDelay: PropTypes.number,
      placeholderError: PropTypes.func
    };

    render() {
      return (
        <StoreContext.Consumer>
          {context => (
            <Connection {...context} {...this.props}>
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
