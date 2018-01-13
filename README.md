# React Synaptic
A simple redux-inspired async state management built on setState. An experimental foray into lightweight shared state management built with components.

![logo](./logo.png)

## Introduction

React Synaptic is an approach to shared application state management that embraces React's state and lifecycle model while providing a simple and intuitive mechanism for dispatching asynchronous state updating actions. You pass root component state down the component hierarchy using props while you asynchronously dispatch requests to update the root component state from any level in the hierarchy. Action handlers perform immutable updates on the root component state.


## Store
React Synaptic provides a `Store` *component* for holding the global application state (although there is nothing global about it, so you could use multiple instances in your component tree if desired) as well as providng the methods for modifying that state. The `Store` contains both **state** and a registry of **actions** with their **handlers**.

The store object also provides a `meta` property for storing references to objects that are not part of the applications view state. This is a good place to stash API objects and the like for later use in executing actions.

The `nutshell` example creates the following global `Store` component:

```javascript
ReactDOM.render(
  <Store
    handlers={{
      nextRandomComic
    }}
    initialState={{
      comic: null,
      isLoading: false
    }}
    render={store => (
      <App comic={store.state.comic} isLoading={store.state.isLoading} />
    )}
  />,
  document.getElementById("root")
);
```

## Actions
The application defines **handlers** for performing **actions** that typically involve updating the current application state. Action handlers are defined as `async` functions with the signature `(store, payload) => Promise` (defining them with `async` will automatically cause the function to return a `Promise`).

An action handler can update the state of the store with the `store.update` method. The *update method takes a function* of the current state as its argument and returns the next state: `prevState => nextState`. This method simply wraps React's setState in a Promise and should return a new state object that structurally shares previous state objects where possible *but does not mutate `prevState`*.

The action handler can make asynchronous calls like fetching data from a remote server as well as dispatching other actions. The action function can also update the state mutliple times if desired.

Here is the action handler created in the *nutshell* example:

```javascript
async function nextRandomComic(store) {
  // set loading state
  store.update(prevState => ({
    ...prevState,
    isLoading: true,
    comic: null
  }));

  // fetch random comic
  const comicNumber = Math.floor(Math.random() * Math.floor(MAX_COMIC_NUMBER));
  const comic = await (await window.fetch(
    "https://xkcd.now.sh/" + comicNumber
  )).json();

  // update comic data
  store.update(prevState => ({
    ...prevState,
    isLoading: false,
    comic: comic
  }));
}
```

## Dispatch
Registered action handlers are executed by **dispatch**-ing an action. More than one action handler can be assigned to a single named action and all will be executed (with no control over execution order). This allows the application to be extended cooperatively with different parts of the application responding as each needs to a dispatched action. This also allows actions to be used as a mechanism for intra-application communication. For example, a failed sign-in attempt can dispatch a `handleSigninFailure` action that multiple parts of the application may respond to as needed.

Actions can be declaratively dispatched with the `Dispatch` component or dispatchers can be created using the `Connector` component. The *nutshell* example uses both in its main component:

```javascript
const App = ({ comic, isLoading }) => (
  <Connector
    dispatchers={dispatch => ({
      onClick: () => dispatch("nextRandomComic")
    })}
    render={({ onClick }) => (
      <div>
        {isLoading ? (
          <p>Loading...</p>
        ) : comic ? (
          <div>
            <img src={comic.img} alt={comic.alt} />
            <br />
            <button onClick={onClick}>Laugh Again</button>
          </div>
        ) : (
          <Dispatch action="nextRandomComic" />
        )}
      </div>
    )}
  />
);
```

## Side-Loading State
Occasionally, the need to side-load state cannot be avoided. The `Connector` element provides a mechanism for doing this, but it is considered an escape hatch and not prototypical usage.

## Legal

Released under MIT license.

Copyright &copy; 2018 Alexander M. Sauer-Budge
