import React, { Suspense } from "react";
import ReactDOM from "react-dom";
import createStore from "./react-evoke";
import quotes from "../node_modules/pragmatic-motd/data/quotes.json";

const { Store, UseStore, ErrorBoundary } = createStore();
// // Experimental Hooks Alternative for React 16.7.0-alpha:
// const { Store, ErrorBoundary, useStore } = createStore();

const MAX_QUOTE_ID = quotes.length + 1;

// fetch quote data via fake network request
function fetchQuote(quoteId) {
  if (Math.random() > 0.75) {
    // randomly return error because that's what happens IRL
    return Promise.reject(Error("Network Error"));
  }
  return new Promise(resolve =>
    // fake a slow network request
    setTimeout(() => resolve(quotes[quoteId - 1]), 1000)
  );
}

// define an action to load quote data
async function loadQuote(store, quoteId) {
  const quote = await fetchQuote(quoteId);
  await store.update(state => {
    if (!state.quotes) {
      state.quotes = {};
    }
    state.quotes[quoteId] = quote;
  });
}

// define action the move to next quote
async function nextQuote(store) {
  await store.update(state => {
    state.quoteId = state.quoteId + 1;
    if (state.quoteId >= MAX_QUOTE_ID) {
      state.quoteId = 1;
    }
  });
}

// simple component to format quote
function Quote({ title, description }) {
  return (
    <>
      <h4>{title}</h4>
      <p>{description}</p>
    </>
  );
}

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

// // Experimental Hooks Alternative for React 16.7.0-alpha:
// function QuoteView({ quoteId }) {
//   const [quote, { nextQuote }] = useStore("quotes", quoteId);
//   return (
//     <>
//       <Quote {...quote} />
//       <button onClick={() => nextQuote()}>Next Quote</button>
//     </>
//   );
// }

// a component for displaying an error message
function ErrorMessage({ state, error, clearError }) {
  return (
    <>
      <h1 style={{ color: "red" }}>{error.message}</h1>
      <button onClick={() => clearError()}>Try Again</button>
      <pre>{JSON.stringify(state, null, 2)}</pre>
    </>
  );
}

// read current quoteId from Store and render
function CurrentQuote() {
  return (
    <UseStore name="quoteId">
      {quoteId => <QuoteView quoteId={quoteId} />}
    </UseStore>
  );
}

// // Experimental Hooks Alternative for React 16.7.0-alpha:
// function CurrentQuote() {
//   const [quoteId] = useStore("quoteId");
//   return <QuoteView quoteId={quoteId} />;
// }

// the "application"
function App() {
  return (
    <Suspense>
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
        <ErrorBoundary fallback={ErrorMessage}>
          <Suspense fallback={<p>Loading...</p>}>
            <CurrentQuote />
          </Suspense>
        </ErrorBoundary>
      </Store>
    </Suspense>
  );
}

ReactDOM.render(<App />, document.getElementById("root"));
