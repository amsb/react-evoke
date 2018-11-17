import React, { Suspense } from "react";
import ReactDOM from "react-dom";
import createStore from "./react-evoke";
import quotes from "../node_modules/pragmatic-motd/data/quotes.json";

const { Store, UseStore, ErrorBoundary, useStore } = createStore();

const MAX_QUOTE_ID = quotes.length + 1;

function fetchQuote(quoteId) {
  if (Math.random() > 0.75) {
    // randomly return error
    return Promise.reject(Error("Network Error"));
  }
  return new Promise(resolve =>
    setTimeout(() => resolve(quotes[quoteId - 1]), 1000)
  );
}

async function loadQuote(store, quoteId) {
  const quote = await fetchQuote(quoteId);
  await store.update(state => {
    if (!state.quotes) {
      state.quotes = {};
    }
    state.quotes[quoteId] = quote;
  });
}

async function nextQuote(store) {
  await store.update(state => {
    state.quoteId = state.quoteId + 1;
    if (state.quoteId >= MAX_QUOTE_ID) {
      state.quoteId = 1;
    }
  });
}

function Quote({ title, description }) {
  return (
    <>
      <h4>{title}</h4>
      <p>{description}</p>
    </>
  );
}

// Render function
// function QuoteView({ quoteId }) {
//   return (
//     <UseStore name="quotes" initializer={["loadQuote", quoteId]}>
//       {(quotes, { nextQuote }) => (
//         <>
//           <Quote {...quotes[quoteId]} />
//           <button onClick={() => nextQuote()}>Next Quote</button>
//         </>
//       )}
//     </UseStore>
//   );
// }

// Hooks
function QuoteView({ quoteId }) {
  const [quotes, { nextQuote }] = useStore("quotes", ["loadQuote", quoteId]);
  return (
    <>
      <Quote {...quotes[quoteId]} />
      <button onClick={() => nextQuote()}>Next Quote</button>
    </>
  );
}

function ErrorMessage({ state, error, clearError }) {
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

// function App() {
//   return (
//     <UseStore name="quoteId">
//       {quoteId => (
//         <Suspense
//           maxDuration={1000}
//           fallback={
//             <p style={{ color: "blue", fontWeight: "bold" }}>Loading...</p>
//           }
//         >
//           <QuoteView quoteId={quoteId} />
//         </Suspense>
//       )}
//     </UseStore>
//   );
// }

ReactDOM.render(
  <Suspense>
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
    </Store>
  </Suspense>,
  document.getElementById("root")
);
