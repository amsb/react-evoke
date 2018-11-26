## Introduction

Straightforward action-driven state management for straightforward apps built with React 16.6+ Suspense and [Immer](https://github.com/mweststrate/immer). React Evoke provides a simple framework for dispatching both synchronous and asynchronous state updating actions and accessing that state throughout the application. It is a lightweight library for shared application state management in the spirit of Command Query Responsibility Segregation (CQRS), flux, redux, etc.

Using Evoke involves three primary building blocks:

1. **Store** component for shared state
2. **actions** functions for updating shared state
3. **UseStore** component (or the experimental **useStore** hook) for using shared state

You can [browse a simple yet complete example](https://github.com/amsb/react-evoke/blob/master/examples/nutshell/src/index.js), or walk through how to use Evoke block by block below.

## Store
The `Store` *component* holds shared application **state** and a registry of **actions** for modifying that state:

```javascript
import createStore from "react-evoke";
const { Store, UseState } = createStore();

ReactDOM.render(
  <Store
    actions={{
      loadQuote,
      nextQuote
    }}
    initialState={{
      quoteId: 1
    }}
  >
    <App />
  </Store>,
  document.getElementById("root")
);
```

Although this example uses a single global Store, you can have as many layered or independent stores as makes sense for your application. The `Store` component takes four props: `actions`, `initializers`, `initialState`, and `meta`.:

* **actions** An object (or module!) declaring action handlers. The next section explains how to create an action handler function.
* **initializers** *(optional)* An object that maps state names to initialization actions (more on this in the Initializers section below).
* **initialState** *(optional)* An object containing the initial state.
* **errorAction** *(optional)* An action name to dispatch when another dispatched throws an exception or rejects a promise. The payload will be `{ action, error }` where `action` is the (string) name of the action throwing/rejecting and error is the error value rejected/thrown.
* **meta** *(optional)* An object containing data that is not part of the application's view state. This is a good place to stash API objects and the like for later use in executing actions.


## Actions
The application defines handlers for performing **actions** that typically involve updating the current application state. Action handlers are defined as functions with the signature `(store, payload) => undefined || Promise`. You can defining asynchronous actions with `async` or explicitly return a `Promise`. Here is an example action handler to perform an async fetch:

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
    <UseStore name="quotes" item={quoteId}>
      {(quote, { nextQuote }) => (
        <>
          <Quote {...quote} />
          <button onClick={() => nextQuote()}>Next Quote</button>
        </>
      )}
    </UseStore>
  );
}
```

The `UseStore` component uses the same function-as-a-child pattern (a type of render prop) as React's Context. The arguments to the function are `(value, actions)` where `value` is the value selected from the state by the key `name` and *optionally* the sub-key `item`. Evoke manages state updates using React Context so that only components using state under `name` will update if that shared state changes.

## Initializers

What if `quoteId` hasn't been loaded into `quotes` yet? You can declare a `Store` `initializer` to tell Evoke to first execute `loadQuote(quoteId)` action if that `item` isn't available:

```javascript
  <Store
    actions={{
      loadQuote,
      nextQuote
    }}
    initializers={{
      quotes: "loadQuote"
    }}
    initialState={{
      quoteId: 1
    }}
  >
    <App />
  </Store>,
```

To use this feature, you will also need to insert a [`Suspense`](https://reactjs.org/docs/code-splitting.html#suspense) component somewhere in the component tree above the `UseStore` component. The Suspense component will suspend rendering of its children while the item is being initialized.

```javascript
import createStore from "react-evoke";
const { Store, UseState } = createStore();
import actions from "./actions"

ReactDOM.render(
  <Store actions={actions} initializers={...}>
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
  const [quote, { nextQuote }] = useStore("quotes", quoteId);
  return (
    <>
      <Quote {...quote} />
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
  const [quoteId] = useStore("quoteId");
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

* This library uses `React.Context` `Consumer`'s `unstable_observedBits` internally to limit consumer updates to only those "subscribing" to the modified substate. This unstable/experimental feature of `React` may be removed/replaced in future version of React.
* This library makes use of [`Suspense`](https://reactjs.org/docs/code-splitting.html#suspense) in a way that might not yet be officially sanctioned.

## Rationale

Why create yet another React state management library? React provides an unopinionated open architecture ecosystem that makes it a flexible application development foundation. While there is the tendency to want the "one true solution", the reality is that different applications and teams have different needs and preferences. This, unfortunately, creates a bit of barrier to newcomers, but it creates a lot of adaptability for application development. React provides an effective local state management solution, but until recently didn't much help for shared state management when your needs extend beyond lifting state up and passing down props. There is a spectrum of community frameworks available spanning the gamut from reactive (mobx) to reductive (redux). The two frameworks at the extremes are both amazing in their own right, but there remain many opportunities for different trade-offs in the middle to suit different use cases. React Evoke is one such middle dweller. With the new class Context API and recently released Suspense features, React now provides a firm foundation to create lightweight solutions to accommodate different needs and preferences. If you like the trade-offs it makes and the style of its API, feel free to use it in your own projects!


## Legal

Released under MIT license.

Copyright &copy; 2018 Alexander M. Sauer-Budge
