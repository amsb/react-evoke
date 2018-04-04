![logo](./logo.png)


## Introduction

Straightforward action-driven state management for straightforward apps built on the React 16.3+ [Context API](https://reactjs.org/docs/context.html) and [Immer](https://github.com/mweststrate/immer). React Synaptic provides a simple framework for dispatching asynchronous state updating actions and accessing that state throughout the application. It is a lightweight library for shared application state management in the spirit of Command Query Responsibility Segregation (CQRS), flux, redux, etc.

## Store
The `Store` *component* holds shared application **state** and a registery of **actions** for modifying that state. The `nutshell` example creates the following global `Store` component

```javascript
import createStore from "react-synaptic";

const { Store, Connector } = createStore();

ReactDOM.render(
  <Store
    actions={{
      nextRandomComic
    }}
  >
    <App />
  </Store>,
  document.getElementById("root")
);
```

> The store object also provides a `meta` property for storing references to objects that are not part of the application's view state. This is a good place to stash API objects and the like for later use in executing actions.

## Actions
The application defines handlers for performing **actions** that typically involve updating the current application state. Action handlers are defined as functions with the signature `(store, payload) => Promise` (defining them with `async` will automatically cause the function to return a `Promise`). Here is the action handler created in the *nutshell* example:

```javascript
async function nextRandomComic(store) {
  const comicNumber = Math.floor(Math.random() * Math.floor(MAX_COMIC_NUMBER));
  const comic = await (await window.fetch(
    "https://xkcd.now.sh/" + comicNumber
  )).json();
  await store.update(state => {
    state.comic = comic
  });
}
```

Action handlers update the state of the store with the `store.update` method. The update method takes a *function of the current state* as its argument. **The current state will be passed as an Immer draft state which can be directly mutated.** Immer will process these mutations to produce an immutable update to the React component state managed by `Store`. It does not need to return anything.

Alternatively, the `store.update` method takes a second argument, `replace`, which can be set to `true` to use React's conventional state updating semantics. In this mode, the updater method receives current state as its argument and returns the next state: `(prevState) => nextState`. The **updater function must NOT mutate `prevState`**, but instead must return a new state object (that structurally shares previous state objects where possible).

The action handler can make asynchronous calls like fetching data from a remote server, update the state as many times as desired, or dispatch other actions.

> More than one action handler can be assigned to a single named action and all will be executed (with no control over execution order), allowing the application to be extended cooperatively with different parts of the application responding as each needs to a dispatched action. This enables actions to be used as a mechanism for intra-application coordination. For example, a failed sign-in attempt can dispatch a `handleSigninFailure` action that multiple parts of the application may respond to independently.


## Connector

The shared state and the actions come together through the `Connector` component. The desired shared state and actions made available by the `Store` can be chosen using the `select` prop of the `Connector` component. The component follows the same function-as-child pattern as the React 16.3+ createContext API. From the *nutshell* example:


```javascript
const App = () => (
  <Connector
    select={(state, actions) => ({
      // select specific state properties from context store
      comic: state.comic,
      // multi-dispatch *async* actions registered with store
      onClick: actions.nextRandomComic
    })}

    /* call when component mounts  */ 
    initializer={(state, actions) => !state.comic && actions.nextRandomComic()}
  >
    { ({ comic, onClick }) => (
      <div>
        <hr/>
        <img src={comic.img} alt={comic.alt} />
        <br />
        <button onClick={onClick}>Laugh Again</button>
      </div>
    )
  }
  </Connector>
);
```

If the component defines an `initializer`, then it is called when the component is mounted. While waiting for the `initializer` to resolve, the component will show a placeholder (after a configurable delay). If the initializer throws an error, then an error placeholder will be shown. If the `initializer` resolves without an error, then the children will be rendered.


## Legal

Released under MIT license.

Copyright &copy; 2018 Alexander M. Sauer-Budge
