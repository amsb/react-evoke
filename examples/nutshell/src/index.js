import React from "react";
import ReactDOM from "react-dom";
import createStore from "react-synaptic";
import quotes from "../node_modules/pragmatic-motd/data/quotes.json";

const { Store, Connector } = createStore();

const MAX_QUOTE_ID = quotes.length + 1;

function fetchQuote(quoteId) {
  console.log("Fetching...");
  if (Math.random() > 0.5) {
    // randomly throw error
    console.error("Throwing Error!");
    throw Error("Network Error");
  }
  return new Promise(resolve =>
    setTimeout(() => resolve(quotes[quoteId - 1]), 1000)
  );
}

async function loadQuote(store, quoteId) {
  const quote = await fetchQuote(quoteId);
  await store.mutate(state => {
    if (!state.quotes) {
      state.quotes = {};
    }
    state.quotes[quoteId] = quote;
  });
}

async function nextQuote(store) {
  await store.mutate(state => {
    state.quoteId = state.quoteId + 1;
    if (state.quoteId >= MAX_QUOTE_ID) {
      state.quoteId = 1;
    }
  });
}

const App = () => (
  <div>
    <Connector
      select={(state, actions) => ({
        quote: state.quotes[state.quoteId],
        onClick: () => actions.nextQuote()
      })}
      loadIf={state => !state.quotes[state.quoteId]}
      loader={(state, actions) => actions.loadQuote(state.quoteId)}
    >
      {({ quote, onClick }) => (
        <div>
          <h4>{quote.title}</h4>
          <p>{quote.description}</p>
          <button onClick={onClick}>Next Quote</button>
        </div>
      )}
    </Connector>
  </div>
);

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
