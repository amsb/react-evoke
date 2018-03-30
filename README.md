![logo](./logo.png)


## Introduction

React Synaptic is a Command Query Responsibility Segregation (CQRS) style shared application state management library that provides a straightforward framework for dispatching asynchronous state updating actions and accessing that state throughout the application. 

It currently requires React 16.3+.


## Store
The `Store` *component* holds shared application **state** and a registery of **actions** for modifying that state. The store object also provides a `meta` property for storing references to objects that are not part of the application's view state. This is a good place to stash API objects and the like for later use in executing actions. The `nutshell` example creates the following global `Store` component:

```javascript
const { Store, Connector } = createStore();

ReactDOM.render(
  <Store
    /* define actions consumers can dispatch */
    actions={{
      nextRandomComic
    }}

    /* set initial data state */
    initialState={{
      comic: null
    }}

    /* define default placeholder render function to show when
       consumers are waiting to be initialized */
    defaultPlaceholder={({ message }) => (
      <b>{message ? message : "Fetching..."}</b>
    )}

    /* define default placeholder error to show when initialization
       encounters error */
    defaultPlaceholderError={(error, retry) => (
      <div>
        {error.toString()} <button onClick={() => retry()}>Retry</button>
      </div>
    )}
  >
    <App />
  </Store>,
  document.getElementById("root")
);
```


## Actions
The application defines handlers for performing **actions** that typically involve updating the current application state. Action handlers are defined as `async` functions with the signature `(store, payload) => Promise` (defining them with `async` will automatically cause the function to return a `Promise`).

### Immer Copy-On-Write Mutations
An action handler can update the state of the store with the `store.update` method. The *update method takes an updater function* of the current state as its argument. The current state will be passed as an [Immer](https://github.com/mweststrate/immer) draft state which can be directly mutated. It does not need to return anything, but it can return either the mutated state object provided as input or arbitrary new state (as long as it did not modify the draft state provided to the updater function). Immer will process these mutations to produce an immutable update to the React component state managed by `Store`.

### Conventional setState Updates
Alternatively, the `store.update` method takes a second `replace` argument which can be set to `true` so that React's conventional state updating semantics can be used. In this mode, the updater method receives current state as its argument and returns the next state: `(prevState) => nextState`. As this directly uses React's setState method (wrapped in a Promise), the **updater function must NOT mutate `prevState`**, but instead must return a new state object that structurally shares previous state objects where possible.

The action handler can make asynchronous calls like fetching data from a remote server as well as dispatching other actions. The action function can also update the state mutliple times if desired.

Here is the action handler created in the *nutshell* example:

```javascript
async function nextRandomComic(store) {
  // fetch random comic
  const comicNumber = Math.floor(Math.random() * Math.floor(MAX_COMIC_NUMBER));
  const comic = await (await window.fetch(
    "https://xkcd.now.sh/" + comicNumber
  )).json();

  // update comic data using copy-on-write semantics (via immer)
  await store.update(state => {
    state.comic = comic
  });
}
```

More than one action handler can be assigned to a single named action and all will be executed (with no control over execution order). This allows the application to be extended cooperatively with different parts of the application responding as each needs to a dispatched action. This enables actions to be used as a mechanism for intra-application coordination. For example, a failed sign-in attempt can dispatch a `handleSigninFailure` action that multiple parts of the application may respond to independently.


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
    initializer={async (actions) => await actions.nextRandomComic()}

    /* but only if not already initialized  */ 
    initializeWhen={(state) => !state.comic}

    /* show after delay while waiting for initializer to resolve*/
    placeholder={{ message: "Reticulating splines..." }}
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

If the component defines an `initializer`, then it is called when the component is mounted as
long as `initializeWhen` is undefined, is set to `true`, or is a function that returns `true`.

While waiting for the `initializer` to resolve, the component will show a placeholder after a configurable delay. If the initializer throws an error, then an error placeholder will be shown, If the `initializer` resolves without an error, then the children will be rendered.

The `placeholder` can be a custom render function for this component or an argument to pass to
the `defaultPlaceholder` defined by the `Store`.


## Dispatch

Actions can be declaratively but asynchronously dispatched with the `Dispatch` component:

```javascript
<Dispatch action="nextRandomComic" />
```


## Register

If your application is large enough to benefit from a more modular appraoch, potentially with code splitting and dynamic imports, then you may want to maintain actions modularly as well. You can do this with the `Register` component:

```javascript
import Register from "../store.js"; // from app root directory
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
