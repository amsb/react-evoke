## Introduction

Straightforward action-driven state management for straightforward apps built on the React 16.3+ [Context API](https://reactjs.org/docs/context.html) and [Immer](https://github.com/mweststrate/immer). React Evoke provides a simple framework for dispatching asynchronous state updating actions and accessing that state throughout the application. It is a lightweight library for shared application state management in the spirit of Command Query Responsibility Segregation (CQRS), flux, redux, etc.


## Rationale

Why create yet another React state management framework? React provides an unopinionated open architecture ecosystem that makes React an extremely flexible application development component. While there is the tendency to want the "one true solution", the reality is that different applications and teams have different needs and preferences. This, unfortunately, creates a bit of barrier to newcomers, but it creates a lot of adaptability for application development. React provides an extremely effective local state management solution, but doesn't offer much help for shared state management when your needs extend beyond lifting state up and passing down props. There is a spectrum of community frameworks available spanning the gamut from reactive (mobx) to reductive (redux). The two frameworks at the extremes are both amazing in their own right, but there remain many opportunities for different trade-offs in the middle to suit different use cases. React Evoke is one such middle dweller. If you like the trade-offs it makes and the style of its API, feel free to use it in your own projects!

In particular, React Evoke was designed for applications that want to use the CQRS/redux style primarily for relatively coarse-grained interactions with remote services. As a result, it is easy to define async actions that get/post from/to remote services, but the framework is not well suited for making every key-stroke or local interaction an "action" since every action creates and resolves a promise. Furthermore, React Evoke forgoes the (sometimes very helpful) formalism of separating remote query/mutation from local query/mutation by embedding the local mutation operation inside the action instead of separating the two as would be done with redux. If these trade-offs make sense for your app, so might React Evoke!

## Store
The `Store` *component* holds shared application **state** and a registery of **actions** for modifying that state. Here's an example:

```javascript
import createStore from "react-evoke";

const { Store, Connector } = createStore();

ReactDOM.render(
  <Store
    initialState={{
      quoteId: 1,
      quotes: {}
    }}
    actions={{
      loadQuote,
      nextQuote
    }}
    placeholder={() => <div>Loading...</div>}
    loaderError={(error, retry) => (
      <div>
        <b>{error.toString()}</b> <button onClick={() => retry()}>Retry</button>
      </div>
    )}
  >
    <App />
  </Store>,
  document.getElementById("root")
);
```
You can have as many layered or indpendent stores as makes sense for you application.

### `Store` Component Properties
#### **actions**
An object (or module!) declaring actions.

#### **initialState** *(optional)*
An object to use for the initial state.

#### **placeholder** *(optional)*
A render prop for the placeholder to show while connected data is loading. Can be defined or overridden for each `Connector`. If not defined, no placeholder is shown.

#### **placeholderDelay** *(optional)*
How long in milliseconds to wait while loader promise is pending before showing the placeholder. The default is `500`, set to `0` to show placeholder without delay.

#### **loaderError** *(optional)*
A render prop that takes two arguments `(error, retry)` for what to render when the promise returned by the loader is rejected. Can be defined or overridden for each `Connector`. If not defined (the default), the error is thrown so you can catch it in an [Error Boundary](https://reactjs.org/docs/error-boundaries.html). The `retry` function can be invoked to attempt to execute the action throwing the error again. Useful to respond to network availability errors.

#### **meta**
An object to store stuff that is not part of the application's view state. This is a good place to stash API objects and the like for later use in executing actions.


## Actions
The application defines handlers for performing **actions** that typically involve updating the current application state. Action handlers are defined as functions with the signature `(store, payload) => Promise` (defining them with `async` will automatically cause the function to return a `Promise`). Here is an example action handler:

```javascript
async function loadQuote(store, quoteId) {
  const quote = await fetchQuote(quoteId);
  await store.mutate(state => {
    // update immer draft state with direct mutation
    state.quotes[quoteId] = quote;
  });
}
```

Action handlers update the state of the store with the `store.mutate` method. The mutate method takes a *function of the current state* as its argument. The **mutator function must MUTATE the provided state object** ([examples](https://github.com/mweststrate/immer#example-patterns)) which is an Immer draft state that will be used to produce an immutable update to the React component state managed by `Store`.

Alternatively, the `store.update` uses React's conventional state updating semantics. In this mode, the updater method receives current state as its argument and returns the next state: `(prevState) => nextState`. The **updater function must NOT mutate `prevState`**, but instead must return a new state object (that structurally shares previous state objects where possible).

The action handler can make asynchronous calls like fetching data from a remote server, update the state as many times as desired, or dispatch other actions using the pattern `store.actions.someAction()` (either `await`-ed or not as needed).

> More than one action handler can be assigned to a single named action and all will be executed (with no control over execution order), allowing the application to be extended cooperatively with different parts of the application responding as each needs to a dispatched action. This enables actions to be used as a mechanism for intra-application coordination. For example, a failed sign-in attempt can dispatch a `handleSigninFailure` action that multiple parts of the application may respond to independently.


## Connector

The shared state and the actions come together through the `Connector` component. The desired shared state and actions made available by the `Store` can be chosen using the `select` prop of the `Connector` component. The component follows the same function-as-child pattern as the React 16.3+ createContext API. Here's an example:


```javascript
const App = () => (
  
  <Connector
    select={(state, actions) => ({
      // select specific state properties from context store
      comic: state.comic,
      // multi-dispatch *async* actions registered with store
      onClick: actions.nextRandomComic
    })}
    loader={(state, actions) => actions.loadQuote(state.quoteId)}
    loadIf={state => !state.quotes[state.quoteId]}
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

### `Connector` Properties

#### **select**
A function of `(state, actions)` that returns an object to be passed to the
function-as-child render prop.

#### **loader** *(optional)*
A function of `(state, actions)` that dispatches actions for loading data
into the store and returns a Promise. If `loadIf` is not defined, then the
loader function is **always** and **only** called when component mounts
(`componentDidMount`). You can include logic in the loader to determine
exactly what should happen.

#### **loadIf** *(optional)*
If `loadIf` is defined, then it will be evaluated on mount **and on every
update** (`getDerivedStateFromProps`). If `loadIf` returns something truthy,
then `loader` will be called after the component mounts or updates
(`componentDidMount` or `componentDidUpdate`).

> ADVANCED: Normally, the `loader` won't be executed again if the Connector
updates again while loading. You can *optionally* return an identifier (something
that isn't false-y) from `loadIf` that will cause `loader` to be executed
again even if already loading but only if the identifer is different than
the one being loaded. The previous promise isn't canceled, so this may
produce unintended consquences like concurrent fetches that resolve out of
order and currupt your application state.

#### **placeholder** *(optional)*
A render prop for the placeholder to show while connected data is loading. If
not defined here, the default set on the `Store` provider is used, if available.

#### **placeholderDelay** *(optional)*
Override the default delay set by the `Store` provider.

#### **loaderError**
A render prop that takes two arguments `(error, retry)` for what to render when the promise returned by the loader is rejected. A default can be defined on the `Store`. If not defined anywhere, the error is thrown so you can catch it in an [Error Boundary](https://reactjs.org/docs/error-boundaries.html). The `retry` function can be invoked to attempt to execute the action throwing the error again. Useful to respond to network availability errors.

## Status

While hopefully, this library reflects a refined simplicity as I've iterated on it over the past few months, there are still some moving pieces I hope to pin down:

* I want to be able to take advantage of the optimistic synchronicity enabled by React Suspense through the `Timeout` component (as I understand it). This is an immediate objective that can hopefully be accomplished once the suspense/`Timeout` API is finalized.
* Implicitly resolve undefined state in select statements by capturing the undefined select path and implicitly dispatching path-based actions defined for the `Store`. This is a more aspirational objective that may not be reasonably realized.

## Legal

Released under MIT license.

Copyright &copy; 2018 Alexander M. Sauer-Budge
