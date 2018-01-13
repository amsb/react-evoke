import React from "react";
import PropTypes from "prop-types";

export class Dispatch extends React.Component {
  static propTypes = {
    action: PropTypes.string.isRequired,
    payload: PropTypes.object,
    when: PropTypes.oneOfType([PropTypes.func, PropTypes.bool])
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

  componentDidMount = () => {
    if (
      this.props.action &&
      (this.props.when === undefined ||
        ((typeof this.props.when === "function" && this.props.when()) ||
          this.props.when))
    ) {
      this.context.store.dispatch(this.props.action, this.props.payload);
    }
  };

  render() {
    return null;
  }
}
