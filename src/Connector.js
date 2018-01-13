import React from "react";
import PropTypes from "prop-types";

export class Connector extends React.Component {
  static propTypes = {
    dispatchers: PropTypes.func,
    state: PropTypes.func,
    handlers: PropTypes.object,
    onMount: PropTypes.func,
    render: PropTypes.func,
    children: PropTypes.func
  };

  static contextTypes = {
    store: PropTypes.shape({
      getState: PropTypes.func.isRequired,
      subscribe: PropTypes.func.isRequired,
      register: PropTypes.func.isRequired,
      dispatch: PropTypes.func.isRequired,
      meta: PropTypes.object.isRequired
    }).isRequired
  };

  constructor(props) {
    super(props);
    this.unsubscribe = null;
  }

  // don't do this because it breaks context updates
  // needed for things like react-router's Link component
  // // shouldComponentUpdate = () => !this.props.state;

  componentDidMount = () => {
    if (this.props.state) {
      this.unsubscribe = this.context.store.subscribe(() => {
        this.forceUpdate();
      });
    }

    if (this.props.handlers) {
      this.context.store.register(this.props.handlers);
    }

    if (this.props.onMount) {
      this.props.onMount(this.context.store.dispatch);
    }
  };

  componentWillUnmount = () => {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  };

  render() {
    const props = {
      ...(this.props.dispatchers
        ? this.props.dispatchers(this.context.store.dispatch)
        : {}),
      ...(this.props.state
        ? this.props.state(this.context.store.getState())
        : {})
    };

    if (this.props.render) {
      return this.props.render(props);
    } else if (this.props.children) {
      return this.props.children(props);
    } else {
      return null;
    }
  }
}
