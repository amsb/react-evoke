import React from "react";
import PropTypes from "prop-types";

const createContext = React.createContext;
  // ? React.createContext
  // : require("react-broadcast").createContext;

export const createStore = () => {
  const StoreContext = createContext({ state: {}, actions: {} });

  class Store extends React.Component {
    constructor(props) {
      super(props);

      this.meta = props.meta || {}; // meta state (api objects, etc.) -- mutable!

      let actions = {};
      this.handlers = {};
      if (props.actions) {
        actions = { ...actions, ...this._register(props.actions) };
      }

      this.state = {
        state: props.initialState || {},
        actions: actions
      };
    }

    _register(handlers) {
      const newActions = {};
      Object.entries(handlers).forEach(([action, handler]) => {
        if (!this.handlers.hasOwnProperty(action)) {
          // use Set to avoid double adding same handler function
          this.handlers[action] = new Set();
          newActions[action] = payload => this.dispatch(action, payload);
        }
        this.handlers[action].add(handler);
      });
      return newActions;
    }

    register = handlers => {
      this.setState({
        state: this.state.state,
        actions: {
          ...this.state.actions,
          ...this._register(handlers)
        }
      });
    };

    update = updater =>
      new Promise(resolve =>
        this.setState(state => ({ state: updater(state.state) }), resolve)
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
          <pre>{JSON.stringify(this.state, null, 2)}</pre>
          {this.props.children}
        </StoreContext.Provider>
      );
    }
  }

  class Connector extends React.Component {
    componentDidMount = () => {
      // if (this.props.actions) {
      //   this.context.store.register(this.props.handlers);
      // }
    };
    render() {
      return (
        <StoreContext.Consumer>
          {({ state, actions }) =>
            this.props.children(this.props.select(state, actions))
          }
        </StoreContext.Consumer>
      );
    }
  }

  class Invoke extends React.Component {
    static propTypes = {
      function: PropTypes.func.isRequired,
      payload: PropTypes.object,
      when: PropTypes.oneOfType([PropTypes.func, PropTypes.bool])
    };

    componentDidMount = () => {
      if (
        this.props.function &&
        (this.props.when === undefined ||
          ((typeof this.props.when === "function" && this.props.when()) ||
            this.props.when))
      ) {
        this.props.function(this.props.payload); // async
      }
    };

    render() {
      return this.props.children;
    }
  }

  class Action extends React.Component {
    static propTypes = {
      name: PropTypes.string.isRequired,
      payload: PropTypes.object,
      when: PropTypes.oneOfType([PropTypes.func, PropTypes.bool])
    };

    render() {
      return (
        <StoreContext.Consumer>
          {({ state, actions }) => (
            <Invoke
              function={actions[this.props.name]}
              payload={this.props.payload}
              when={this.props.when}
            >
              <pre>{JSON.stringify(state, null, 2)}</pre>
            </Invoke>
          )}
        </StoreContext.Consumer>
      );
    }
  }
  return { Store, Connector, Action };
};
