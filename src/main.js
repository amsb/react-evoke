import React from "react";
import PropTypes from "prop-types";
import produce from "immer";

const createContext = React.createContext;
// ? React.createContext
// : require("react-broadcast").createContext;

// const REGISTER = Symbol("register");

class Delayed extends React.Component {
  static propTypes = {
    render: PropTypes.func.isRequired,
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
      return this.props.render();
    } else {
      return null;
    }
  }
}

Delayed.defaultProps = {
  delay: 500
};

const Connected = ({ children, ...props }) => children(props);

const createStore = () => {
  const StoreContext = createContext({ state: {}, actions: {} });

  class Store extends React.Component {
    static propTypes = {
      actions: PropTypes.object,
      initialState: PropTypes.object,
      // loaders: PropTypes.object, // FUTURE: automatically call when select throws
      placeholder: PropTypes.func,
      placeholderDelay: PropTypes.number,
      loadError: PropTypes.func,
      meta: PropTypes.object
    };

    constructor(props) {
      super(props);

      this.handlers = {};

      this.state = {
        state: props.initialState || {},
        actions: {
          // [REGISTER]: this.register, // FUTURE: dynamically register new actions
          ...this.createActions(this.props.actions || {})
        },
        placeholder: props.placeholder,
        placeholderDelay: props.placeholderDelay,
        loadError: props.loadError
      };

      // meta state (api objects, etc.) -- mutable!
      this.meta = props.meta || {};
    }

    createActions = handlers => {
      let newActions = {};
      Object.entries(handlers).forEach(([action, handler]) => {
        if (!this.handlers.hasOwnProperty(action)) {
          // use Set to avoid double-adding same handler function
          this.handlers[action] = new Set();
          newActions[action] = payload => this.dispatch(action, payload);
        }
        this.handlers[action].add(handler);
      });
      return newActions;
    };

    register = handlers => {
      return new Promise(resolve =>
        this.setState(
          prevState => ({
            ...prevState,
            actions: { ...this.state.actions, ...this.createActions(handlers) }
          }),
          resolve
        )
      );
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

    render() {
      return (
        <StoreContext.Provider value={this.state}>
          {this.props.children}
        </StoreContext.Provider>
      );
    }
  }

  class Connection extends React.Component {
    static propTypes = {
      state: PropTypes.object,
      actions: PropTypes.object,
      select: PropTypes.func,
      loader: PropTypes.func,
      loadIf: PropTypes.func,
      loadError: PropTypes.func,
      placeholder: PropTypes.func,
      placeholderDelay: PropTypes.number
    };

    state = {
      shouldLoad: false,
      loadingId: null,
      error: null
    };

    load = () => {
      this.setState(
        prevState => ({ ...prevState, error: false, shouldLoad: false }),
        () => {
          Promise.resolve(
            this.props.loader(this.props.state, this.props.actions)
          ).then(
            () =>
              this.setState(prevState => ({
                ...prevState,
                loadingId: null
              })),
            error => {
              if (this.props.loadError) {
                this.setState(prevState => ({
                  ...prevState,
                  error: error
                }));
              } else {
                throw error;
              }
            }
          );
        }
      );
    };

    static getDerivedStateFromProps(nextProps, prevState) {
      if (nextProps.loadIf) {
        const loadingId = nextProps.loadIf(nextProps.state);
        if (loadingId && loadingId !== prevState.loadingId) {
          return {
            ...prevState,
            shouldLoad: true,
            loadingId: loadingId
          };
        }
      }
      return null;
    }

    componentDidMount() {
      if (this.state.shouldLoad) {
        this.load();
      }
    }

    componentDidUpdate() {
      if (this.state.shouldLoad) {
        this.load();
      }
    }

    render() {
      /*
      FUTURE: Replace Delayed and placeholder logic with React.Timeout
      when React Suspense released. Throw the promise returned by
      props.loader when props.loadIf.
      */
      if (this.state.error) {
        return this.props.loadError(this.state.error, this.load)
      } else if (this.state.loadingId) {
        if (this.props.placeholder) {
          if (this.props.placeholderDelay) {
            return (
              <Delayed
                render={this.props.placeholder}
                delay={this.props.placeholderDelay}
              />
            );
          } else {
            return this.props.placeholder();
          }
        } else {
          return null;
        }
      } else if (this.props.select) {
        return (
          <Connected
            {...this.props.select(this.props.state, this.props.actions)}
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
      select: PropTypes.func,
      loader: PropTypes.func,
      loadIf: PropTypes.func,
      loadError: PropTypes.func,
      placeholder: PropTypes.func,
      placeholderDelay: PropTypes.number
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
