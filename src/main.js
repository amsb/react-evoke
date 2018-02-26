import React from "react";
import PropTypes from "prop-types";

const createContext = React.createContext;
// ? React.createContext
// : require("react-broadcast").createContext;

const Connected = ({ children, ...props }) => children(props);

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
    return this.props.children || null;
  }
}

export const createStore = () => {
  const StoreContext = createContext({ state: {}, actions: {} });

  class Store extends React.Component {
    static propTypes = {
      actions: PropTypes.object,
      initialState: PropTypes.object,
      meta: PropTypes.object,
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

    update = updater =>
      new Promise(resolve =>
        this.setState(prevState => updater(prevState), resolve)
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
            register: this.register
          }}
        >
          {this.props.children}
        </StoreContext.Provider>
      );
    }
  }

  class Connector extends React.Component {
    static propTypes = {
      select: PropTypes.func.isRequired
    };

    render() {
      return (
        <StoreContext.Consumer>
          {({ state, actions }) => (
            <Connected {...this.props.select(state, actions)}>
              {this.props.children}
            </Connected>
          )}
        </StoreContext.Consumer>
      );
    }
  }

  class Dispatch extends React.Component {
    static propTypes = {
      action: PropTypes.string.isRequired,
      payload: PropTypes.object,
      when: PropTypes.oneOfType([PropTypes.func, PropTypes.bool])
    };

    render() {
      return (
        <StoreContext.Consumer>
          {({ state, actions }) => (
            <Invoke
              function={actions[this.props.action]}
              payload={this.props.payload}
              when={this.props.when}
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
