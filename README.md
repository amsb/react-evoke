## Introduction

Straightforward action-driven state management for straightforward apps with React 16.6+ Suspense and [Immer](https://github.com/mweststrate/immer). React Evoke provides a simple framework for dispatching asynchronous state updating actions and accessing that state throughout the application. It is a lightweight library for shared application state management in the spirit of Command Query Responsibility Segregation (CQRS), flux, redux, etc.

React Evoke enables components to read existing shared state synchronously (through context) or suspend and initialize asynchronously if the state doesn't yet exist. Here is an example using function-as-child render props (hooks are supported as well):

```javascript
function App() {
  return (
    <Store
      actions={{ loadQuote, nextQuote }}
      initializers={{ quotes: "loadQuote" }}
      initialState={{ quoteId: 1 }}
    >
      <ErrorBoundary fallback={ErrorMessage}>
        <Suspense fallback={<p>Loading...</p>}>
          <UseStore name="quoteId">
            {quoteId => (<QuoteView quoteId={quoteId} />)}
          </UseStore>
        </Suspense>
      </ErrorBoundary>
    </Store>
  );
}

function QuoteView({ quoteId }) {
  return (
    <UseStore name="quotes" item={quoteId}>
      {(quote, { nextQuote }) => (
        <div>
          <h4>{quote.title}</h4>
          <p>{quote.description}</p>
          <button onClick={() => nextQuote()}>Next Quote</button>
        </div>
      )}
    </UseStore>
  );
}
```

On first render, the quote data for `quoteId` 1 isn't yet available, so the render is suspended while the `loadQuote(quoteId)` initializer action fetches it and updates the Store state. Once the action is completed, React Suspense retries the render which succeeds because the quote data has been loaded by the `loadQuote` action.

You can [browse a simple yet complete example](https://github.com/amsb/react-evoke/blob/master/examples/nutshell/src/index.js), or walk through how to use Evoke block by block below.


## Store
Using Evoke involves three primary building blocks:

1. A **Store** for shared state
2. Asynchronous **actions** for updating shared state
3. Access shared state with **UseStore** component or **useStore** hook (React 16.7+)

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

The `Store` component takes four props: `actions`, `initializers`, `initialState`, and `meta`.:

* **actions** An object (or module!) declaring action handlers. The next section explains these.
* **initializers** *(optional)* An object that maps state names to initialization actions (more on this in the Initializers section below).
* **initialState** *(optional)* An object containing the initial state.
* **meta** *(optional)* An object containing data that is not part of the application's view state. This is a good place to stash API objects and the like for later use in executing actions.


## Actions
The application defines **actions** for performing shared state updates. Actions are defined as functions with the signature `(store, payload) => Promise`. You can use async/await or explicitly return a `Promise`. Here is an example action to perform an async fetch:

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

Actions can make asynchronous calls like fetching data from a remote server, update the store state as many times as desired, or dispatch other actions using the pattern `store.actions.someAction(payload)` (either `await`-ed or not as needed).

To keep your code organized, you might want to define your actions in a separate module that you import and feed to the `Store` component:

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

## UseStore

The shared state and the actions come together through the `UseStore` component or the `useStore` hook (React 16.7+). Here's an example showing how to use the `UseStore` component to access the `Store`'s `quotes` data:

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

The `UseStore` component uses the function-as-a-child render prop pattern. The arguments consumed by the function are `(value, actions)` where `value` is the value selected from the state by the key `name` and *optionally* the sub-key `item`. Evoke manages state updates using React Context so that only components using state under `name` will update if that shared state changes.

### useStore Hook

The same functionality that the `UseStore` component provides is also provided through the `useStore` hook for React 16.7+. The `useStore` hook takes the same two arguments as the `UseState` component: a state key `name` and an *optional* `item` sub-key. Here's what the above example looks like as a hook:

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

To use this feature, you will also need to insert at least one [`Suspense`](https://reactjs.org/docs/code-splitting.html#suspense) component with a `fallback` somewhere in the component tree above the `UseStore` component or the component using the `useStore` hook. The Suspense component will suspend rendering of its children while the item is being initialized.

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

The `ErrorBoundary` component must be a descendant of the Store component. The `fallback` prop provides a component which takes `{ state, actions, error, clearError }` as props, where:

* `state` is the current state of the Store which must be treated as **read-only**.
* `actions` are the callable async actions defined by the store.
* `error` is the error object that was thrown.
* `clearError` is an argument-less function that clears the error (and effectively "retries") *when the error was thrown by an initializer*.

## Caveats

* This library uses React Context's `unstable_observedBits` internally to limit consumer updates to only those "subscribing" to the modified substate. This unstable/experimental feature of React may be removed/replaced in future version of React. Hopefully it will be replaced by something even better.
* This library makes use of [`Suspense`](https://reactjs.org/docs/code-splitting.html#suspense) in a way that isn't (yet) officially sanctioned.

## Rationale

Why create yet another React state management library? React provides an unopinionated open architecture ecosystem that makes it a flexible application development foundation. While there is the tendency to want the "one true solution", the reality is that different applications and teams have different needs and preferences. This, unfortunately, creates a bit of barrier to newcomers, but it creates a lot of adaptability for application development. React provides an effective local state management solution, but until recently didn't much help for shared state management when your needs extend beyond lifting state up and passing down props. There is a spectrum of community frameworks available spanning the gamut from reactive (mobx) to reductive (redux). The two frameworks at the extremes are both amazing in their own right, but there remain many opportunities for different trade-offs in the middle to suit different use cases. React Evoke is one such middle dweller. With the new class Context API and recently released Suspense features, React now provides a firm foundation to create lightweight solutions to accommodate different needs and preferences.  If you like the trade-offs it makes and the style of its API, feel free to use it in your own projects!

In particular, React Evoke was designed for applications that want to use the CQRS/redux style primarily for relatively coarse-grained interactions with remote services while embracing React's primitives. As a result, it is easy to define async actions that get/post from/to remote services, but the framework is not well suited for making every key-stroke or local interaction an "action" since every action creates and resolves a promise. In practice, this means using local state to control form and other micro-interactions while using Evoke to process the end result. Furthermore, React Evoke forgoes the (sometimes very helpful) formalism of separating remote query/mutation from local query/mutation by embedding the local mutation operation inside the action instead of separating the two as would be done with redux. If these trade-offs make sense for your app, so might React Evoke!


## Legal

Released under MIT license.

Copyright &copy; 2018 Alexander M. Sauer-Budge
