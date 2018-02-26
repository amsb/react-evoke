# React Synaptic
A simple redux-inspired async state management built on setState and the React 16.3.0+ Context API. An experimental foray into lightweight shared state management built with components.

![logo](./logo.png)


## Introduction

React Synaptic is an approach to shared application state management that embraces React's built-in APIs while providing a simple and intuitive mechanism for dispatching **asynchronous** state updating actions.


## Store
React Synaptic provides a `Store` *component* for holding the global application state (although there is nothing global about it, so you could use multiple instances in your component tree if desired) as well as providng the methods for modifying that state. The `Store` contains both **state** and a registry of **actions** with their **handlers**.

The store object also provides a `meta` property for storing references to objects that are not part of the applications view state. This is a good place to stash API objects and the like for later use in executing actions.

The `nutshell` example creates the following global `Store` component:

```javascript
const { Store, Connector, Action } = createStore();

ReactDOM.render(
  <Store
    actions={{
      nextRandomComic
    }}
    initialState={{
      comic: null,
      isLoading: false
    }}
  >
    <App />
  </Store>,
  document.getElementById("root")
);
```


## Actions
The application defines **handlers** for performing **actions** that typically involve updating the current application state. Action handlers are defined as `async` functions with the signature `(store, payload) => Promise` (defining them with `async` will automatically cause the function to return a `Promise`).

An action handler can update the state of the store with the `store.update` method. The *update method takes a function* of the current state as its argument and returns the next state: `(prevState) => nextState`. This method simply wraps React's setState in a Promise and should return a new state object that structurally shares previous state objects where possible *but does not mutate `prevState`*.

The action handler can make asynchronous calls like fetching data from a remote server as well as dispatching other actions. The action function can also update the state mutliple times if desired.

Here is the action handler created in the *nutshell* example:

```javascript
async function nextRandomComic(store) {
  // set loading state
  await store.update(prevState => ({
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
  await store.update(prevState => ({
    ...prevState,
    isLoading: false,
    comic: comic
  }));
}
```

More than one action handler can be assigned to a single named action and all will be executed (with no control over execution order). This allows the application to be extended cooperatively with different parts of the application responding as each needs to a dispatched action. This enables actions to be used as a mechanism for intra-application coordination. For example, a failed sign-in attempt can dispatch a `handleSigninFailure` action that multiple parts of the application may respond to as needed.

Actions can be declaratively but asynchronously dispatched with the `Dispatch` component:

```javascript
<Dispatch action="nextRandomComic" />
```

or can be invoked via `Connector` component described below.


## Connector

The shared state and the actions come together through the `Connector` component. The desired shared state and actions from the `Store` can be chosen using the `select` prop of the `Connector` component. The component follows the same function-as-child pattern as the React 16.3+ createContext API. From the *nutshell* example:

```javascript
const App = () => (
  <Connector
    select={(state, actions) => ({
      // select specific state properties
      comic: state.comic,
      isLoading: state.isLoading,
      // multi-dispatch and *async* actions
      onClick: actions.nextRandomComic
    })}
  >
    { ({ comic, isLoading, onClick }) => (
      <div>
        <hr/>
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
    )
  }
  </Connector>
);
```


## Register

If your application is large enough to benefit from a more modular appraoch, potentially with code splitting and dynamic imports, then you may want to maintain actions modularly as well. You can do this with the `Register` component:

```javascript
import Register from "../store.js"; // from app proot directory
import * as actions from "./actions"; // inside feature-x directory  

const FeatureX = () => (
  <Register actions={actions}>
    <DetailsOfFeatureX />
  </Register>
)
```

This component simply adds its actions to the `Store` when mounted.


## Legal

Released under MIT license.

Copyright &copy; 2018 Alexander M. Sauer-Budge
