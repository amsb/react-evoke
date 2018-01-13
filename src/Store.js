import React from "react";
import PropTypes from "prop-types";

export class Store extends React.Component {
  static propTypes = {
    handlers: PropTypes.object,
    initialState: PropTypes.object,
    render: PropTypes.func,
    meta: PropTypes.object
  };

  static childContextTypes = {
    store: PropTypes.shape({
      getState: PropTypes.func.isRequired,
      subscribe: PropTypes.func.isRequired,
      register: PropTypes.func.isRequired,
      dispatch: PropTypes.func.isRequired,
      meta: PropTypes.object.isRequired
    }).isRequired
  };

  getChildContext() {
    return {
      store: {
        getState: this.getState,
        subscribe: this.subscribe,
        register: this.register,
        dispatch: this.dispatch,
        meta: this.meta
      }
    };
  }

  constructor(props) {
    super(props);

    this.state = props.initialState || {}; // view state -- immutable!
    this.meta = props.meta || {}; // meta state (api objects, etc.) -- mutable!

    this.actions = {};
    if (props.handlers) {
      this.register(props.handlers);
    }

    this.subscribers = new Set();
  }

  componentWillUpdate = () => {
    this.subscribers.forEach(listener => listener());
  };

  getState = () => this.state;

  subscribe = listener => {
    this.subscribers.add(listener);
    return () => {
      this.subscribers.delete(listener);
    };
  };

  register = handlers => {
    Object.entries(handlers).forEach(([action, handler]) => {
      if (!this.actions.hasOwnProperty(action)) {
        // use Set to avoid double adding same handler function
        this.actions[action] = new Set();
      }
      this.actions[action].add(handler);
    });
  };

  update = updater => new Promise(resolve => this.setState(updater, resolve));

  dispatch = (action, payload) => {
    //console.log(action);
    if (this.actions.hasOwnProperty(action)) {
      const promises = [];
      this.actions[action].forEach(handler =>
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
    return this.props.render(this);
  }
}
