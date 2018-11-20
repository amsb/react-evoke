## Introduction

Straightforward action-driven state management for straightforward apps built on the React 16.6+ (Context, Suspense and, experimentally, hooks) and [Immer](https://github.com/mweststrate/immer). React Evoke provides a simple framework for dispatching asynchronous state updating actions and accessing that state throughout the application. It is a lightweight library for shared application state management in the spirit of Command Query Responsibility Segregation (CQRS), flux, redux, etc.

Using Evoke involves three primary building blocks:

1. **Store** component for shared state
2. **actions** functions for updating shared state
3. **UseStore** component (or the experimental useStore hook) for using shared state

You can [browse a simple yet complete example](https://github.com/amsb/react-evoke/blob/master/examples/nutshell/src/index.js), or walk through how to use Evoke block by block below.

## Store
The `Store` *component* holds shared application **state** and a registry of **actions** for modifying that state:

```javascript
import createStore from "react-evoke";
const { Store, UseState } = createStore();

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
  >
    <App />
  </Store>,
  document.getElementById("root")
);
```

Although this example uses a single global Store, you can have as many layered or independent stores as makes sense for you application. The `Store` component takes three props: `initialState`, `actions`, and `meta`.:

* **actions** An object (or module!) declaring action handlers. The next section explains how to create an action handler function.
* **initialState** *(optional)* An object containing the initial state.
* **meta** *(optional)* An object containing data that is not part of the application's view state. This is a good place to stash API objects and the like for later use in executing actions.


## Actions
The application defines handlers for performing **actions** that typically involve updating the current application state. Action handlers are defined as functions with the signature `(store, payload) => Promise`. You can ddefining them with `async` or explicitly return a `Promise`. Here is an example action handler to performan an async fetch:

```javascript
async function loadQuote(store, quoteId) {
  const quote = await fetchQuote(quoteId);
  await store.update(state => {
    // update immer draft state with direct mutation
    state.quotes[quoteId] = quote;
  });
}
```

Action handlers update the state of the store with the `store.update` method. The update method takes a *function of the current state* as its argument. The **updater function must MUTATE the provided state object** ([examples](https://github.com/mweststrate/immer#example-patterns)) which is an Immer draft state that will produce an *immutable update to the React component state* managed by `Store`.

Alternatively, the `store.replace` uses React's conventional state setting semantics. In this mode, the supplied replacer function receives current state as its argument and returns the next state: `(prevState) => nextState`. The **replacer function must NOT MUTATE `prevState`**, but instead *must return a new state object that structurally shares previous state objects where possible*.

The action handler can make asynchronous calls like fetching data from a remote server, update the store state as many times as desired, or dispatch other actions using the pattern `store.actions.someAction()` (either `await`-ed or not as needed).

> More than one action handler can be assigned to a single named action and all will be executed (in an undefined execution order), allowing the application to be extended cooperatively with different parts of the application responding as each needs to a dispatched action. This enables actions to be used as a mechanism for intra-application coordination. For example, a failed sign-in attempt can dispatch a `handleSigninFailure` action that multiple parts of the application may respond to independently.

To keep your code organized, you might want to define your actions in a separate module that you import and ffed to the `Store` component:

```javascript
import createStore from "react-evoke";
const { Store, UseState } = createStore();
import actions from "./actions"

ReactDOM.render(
  <Store actions={actions}>
    <App />
  </Store>,
  document.getElementById("root")
);
```

## UseStore Component

The shared state and the actions come together through the `UseStore` component or the `useStore` hook (an experimental feature available in React 16.7-alpha). Here's an example showing how to use the `UseStore` component to access the `Store`'s `quotes` data:

```javascript
function QuoteView({ quoteId }) {
  return (
    <UseStore name="quotes">
      {(quotes, { nextQuote }) => (
        <>
          <Quote {...quotes[quoteId]} />
          <button onClick={() => nextQuote()}>Next Quote</button>
        </>
      )}
    </UseStore>
  );
}
```

The `UseStore` component uses the same function-as-a-child pattern (a type of render prop) as React's Context. The arguments to the function are `(substate, actions)` where `substate` is the sub-state selected by the key `name`. Sub-states are used to organize the shared data and to limit updates to only Store consumers subscribing to the sub-state that's changed.

But what if `quoteId` hasn't been loaded into `quotes` yet? You can declare an `initializer` to ensure that the `loadQuote(quoteId)` action has been executed at least once before the children are rendered. Initializers are declared as an `[action, payload]` array pair.

```javascript
function QuoteView({ quoteId }) {
  return (
    <UseStore name="quotes" initializer={["loadQuote", quoteId]}>
      {(quotes, { nextQuote }) => (
        <>
          <Quote {...quotes[quoteId]} />
          <button onClick={() => nextQuote()}>Next Quote</button>
        </>
      )}
    </UseStore>
  );
}
```

 An internal cache is maintained so that the initializer action isn't executed more than once when called as an initializer. To use this feature, you will also need to insert a [`Suspense`](https://reactjs.org/docs/code-splitting.html#suspense) component somewhere in the component tree above the `UseStore` component.

```javascript
import createStore from "react-evoke";
const { Store, UseState } = createStore();
import actions from "./actions"

ReactDOM.render(
  <Store actions={actions}>
    <Suspense fallback={<p>Loading...</p>}>
      <App />
    </Suspense>
  </Store>,
  document.getElementById("root")
);
```

## useStore Hook

The same functionality that the `UseStore` component provides is also provided through the `useStore` hook for React 16.7+ (currently a proposed feature only available in alpha). The `useStore` hook takes two arguments, the substate key `name` and an *optional* initializer. Here's what the above example looks like as a hook:

```javascript
function QuoteView({ quoteId }) {
  const [quotes, { nextQuote }] = useStore("quotes", ["loadQuote", quoteId]);
  return (
    <>
      <Quote {...quotes[quoteId]} />
      <button onClick={() => nextQuote()}>Next Quote</button>
    </>
  );
}
```

## ErrorBoundary

Initializers (and other code) can throw errors during render. The `createStore` function also returns an `ErrorBoundary` component to help in handling these errors. Here's an example of how it gets used:

```javascript
const { Store, ErrorBoundary, useStore } = createStore();

function ErrorMessage({ state, actions, error, clearError }) {
  return (
    <>
      <h1 style={{ color: "red" }}>{error.message}</h1>
      <button onClick={() => clearError()}>Try Again</button>
      <pre>{JSON.stringify(state, null, 2)}</pre>
    </>
  );
}

function App() {
  const [quoteId, _] = useStore("quoteId");
  return (
    <ErrorBoundary fallback={ErrorMessage}>
      <Suspense
        maxDuration={1000}
        fallback={
          <p style={{ color: "blue", fontWeight: "bold" }}>Loading...</p>
        }
      >
        <QuoteView quoteId={quoteId} />
      </Suspense>
    </ErrorBoundary>
  );
}
```

The fallback prop provides a component which takes `{ state, actions, error, clearError }` as props, where:

* `state` is the current state of the Store which should be treated as **read-only**.
* `actions` are the callable async actions defined by the store.
* `error` is the error object that was thrown.
* `clearError` is an argument-less function that clears the error (and effectively "retries") *when the error was thrown by an initializer*.

## Caveats

* This library uses `React.Context` `Consumer`'s `unstable_observedBits` internally to limit consumer updates to only those "subscribing" to the modified substate. This unstable/experimental feature of `React` may be replaced by an alternative mechanism to accomplish the same end.
* This library makes use of [`Suspense`](https://reactjs.org/docs/code-splitting.html#suspense) in a way that might not yet be officially sanctioned.

## Rationale

Why create yet another React state management library? React provides an unopinionated open architecture ecosystem that makes it a flexible application development foundation. While there is the tendency to want the "one true solution", the reality is that different applications and teams have different needs and preferences. This, unfortunately, creates a bit of barrier to newcomers, but it creates a lot of adaptability for application development. React provides an effective local state management solution, but until recently didn't much help for shared state management when your needs extend beyond lifting state up and passing down props. There is a spectrum of community frameworks available spanning the gamut from reactive (mobx) to reductive (redux). The two frameworks at the extremes are both amazing in their own right, but there remain many opportunities for different trade-offs in the middle to suit different use cases. React Evoke is one such middle dweller. With the new class Context API and recently released Suspense features, React now provides a firm foundation to create lightweight solutions to accommodate different needs and preferences.  If you like the trade-offs it makes and the style of its API, feel free to use it in your own projects!

In particular, React Evoke was designed for applications that want to use the CQRS/redux style primarily for relatively coarse-grained interactions with remote services while embracing React's primitives. As a result, it is easy to define async actions that get/post from/to remote services, but the framework is not well suited for making every key-stroke or local interaction an "action" since every action creates and resolves a promise. In practice, this means using local state to control form and other micro-interactions while using Evoke to process the end result. Furthermore, React Evoke forgoes the (sometimes very helpful) formalism of separating remote query/mutation from local query/mutation by embedding the local mutation operation inside the action instead of separating the two as would be done with redux. If these trade-offs make sense for your app, so might React Evoke!


## Legal

Released under MIT license.

Copyright &copy; 2018 Alexander M. Sauer-Budge
