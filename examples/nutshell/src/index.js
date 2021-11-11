import React, { Suspense } from "react"
import ReactDOM from "react-dom"
import createStore, { consoleLogger } from "./react-evoke"
import quotes from "./quotes"

const { Store, useStore, ErrorBoundary } = createStore()

const MAX_QUOTE_ID = quotes.length

// fetch quote data via fake network request
function fetchQuote(quoteId) {
  // if (Math.random() > 0.75) {
  //   // randomly return error because that's what happens IRL
  //   return Promise.reject(Error("Network Error"));
  // }
  return new Promise((resolve) =>
    // fake a slow network request
    setTimeout(() => resolve(quotes[quoteId - 1]), 1000)
  )
}

// define an action to load quote data
async function loadQuote(store, quoteId) {
  const quote = await fetchQuote(quoteId)
  await store.update((state) => {
    if (!state.quotes) {
      state.quotes = {}
    }
    state.quotes[quoteId] = quote
  })
  return { quoteId }
}

// define action the move to next quote
async function nextQuote(store) {
  await store.update((state) => {
    state.quoteId = state.quoteId + 1
    if (state.quoteId >= MAX_QUOTE_ID) {
      state.quoteId = 1
    }
  })
}

// define action the move to previous quote
async function prevQuote(store) {
  await store.update((state) => {
    state.quoteId = state.quoteId - 1
    if (state.quoteId <= 0) {
      state.quoteId = MAX_QUOTE_ID
    }
  })
}

// define action to toggle color
async function toggleColor(store) {
  await store.update((state) => {
    if (state.color === "blue") {
      state.color = "green"
    } else {
      state.color = "blue"
    }
  })
}

// simple component to format quote
const Quote = React.memo(({ title, description, color }) => (
  <>
    <h4>{title}</h4>
    <p style={{ color: color }}>{description}</p>
  </>
))

function QuoteView({ quoteId }) {
  const [quote, { prevQuote, nextQuote }] = useStore("quotes", quoteId)
  const [color, { toggleColor }] = useStore("color")

  return (
    <>
      <Quote {...quote} color={color} />
      <button onClick={() => prevQuote()}>Previous Quote</button>{" "}
      <button onClick={() => nextQuote()}>Next Quote</button>{" "}
      <button onClick={() => toggleColor()}>Toggle Color</button>
    </>
  )
}

// a component for displaying an error message
function ErrorMessage({ state, error, clearError }) {
  return (
    <>
      <h1 style={{ color: "red" }}>{error.message}</h1>
      <button onClick={() => clearError()}>Try Again</button>
      <pre>{JSON.stringify(state, null, 2)}</pre>
    </>
  )
}

// read current quoteId from Store and render
function CurrentQuote() {
  const [quoteId] = useStore("quoteId")
  const [quoteLength] = useStore("quoteLengths", quoteId)

  return (
    <>
      <p>The following quote is {quoteLength} characters long:</p>
      <QuoteView quoteId={quoteId} />
    </>
  )
}

// the "application"
function App() {
  return (
    <Store
      actions={{
        loadQuote,
        prevQuote,
        nextQuote,
        toggleColor,
      }}
      initializers={{
        quotes: "loadQuote",
        numQuotes: "loadQuote",
      }}
      initialState={{
        quoteId: 1,
        color: "blue",
      }}
      derivedState={{
        quoteLengths: (getState, quoteId) => {
          return getState("quotes", quoteId).description.length
        },
      }}
      middleware={[consoleLogger]}
    >
      <ErrorBoundary fallback={ErrorMessage}>
        <Suspense fallback={<p>Loading...</p>}>
          <CurrentQuote />
        </Suspense>
      </ErrorBoundary>
    </Store>
  )
}

ReactDOM.render(<App />, document.getElementById("root"))
