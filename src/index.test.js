import React, { Suspense } from "react"
import createStore, { consoleLogger } from "./main"
import quotes from "../examples/nutshell/src/quotes"
import { renderHook, act } from "@testing-library/react-hooks"
const { useStore, Store, ErrorBoundary } = createStore()

const MAX_QUOTE_ID = quotes.length
const USE_MIDDLEWARE = false

function fetchQuote(quoteId) {
  return new Promise((resolve) =>
    setTimeout(() => resolve(quotes[quoteId - 1]), 1000)
  )
}

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

async function nextQuote(store) {
  await store.update((state) => {
    state.quoteId = state.quoteId + 1
    if (state.quoteId >= MAX_QUOTE_ID) {
      state.quoteId = 1
    }
  })
}

async function prevQuote(store) {
  await store.update((state) => {
    state.quoteId = state.quoteId - 1
    if (state.quoteId <= 0) {
      state.quoteId = MAX_QUOTE_ID
    }
  })
}

async function toggleColor(store) {
  await store.update((state) => {
    if (state.color === "blue") {
      state.color = "green"
    } else {
      state.color = "blue"
    }
  })
}

function ErrorMessage({ state, error, clearError }) {
  return (
    <>
      <h1 style={{ color: "red" }}>{error.message}</h1>
      <button onClick={() => clearError()}>Try Again</button>
      <pre>{JSON.stringify(state, null, 2)}</pre>
    </>
  )
}

function App({ children }) {
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
      middleware={USE_MIDDLEWARE ? [consoleLogger] : null}
    >
      <ErrorBoundary fallback={ErrorMessage}>
        <Suspense fallback={<p>Loading...</p>}>{children}</Suspense>
      </ErrorBoundary>
    </Store>
  )
}

test("store context initial state", () => {
  const wrapper = ({ children }) => <App>{children}</App>
  const { result } = renderHook(() => useStore("quoteId"), { wrapper })
  const [quoteId] = result.current
  expect(quoteId).toStrictEqual(1)
})

test("derived state", async () => {
  const wrapper = ({ children }) => <App>{children}</App>
  const { result, waitForNextUpdate } = renderHook(
    () => useStore("quoteLengths", 1),
    {
      wrapper,
    }
  )

  await waitForNextUpdate({ timeout: 2000 })
  const [quoteLength] = result.current
  expect(quoteLength).toStrictEqual(76)
})

test("toggle color", () => {
  const wrapper = ({ children }) => <App>{children}</App>
  const { result } = renderHook(() => useStore("color"), { wrapper })
  act(() => {
    result.current[1].toggleColor()
  })
  expect(result.current[0]).toBe("green")
})

test("change quote", async () => {
  const wrapper = ({ children }) => <App>{children}</App>
  const { result, waitForNextUpdate } = renderHook(() => useStore("quotes"), {
    wrapper,
  })
  await waitForNextUpdate({ timeout: 2000 })
  await act(async () => await result.current[1].loadQuote(1))
  expect(result.current[0]["1"].title).toBe("Care About Your Craft")
  await act(async () => await result.current[1].loadQuote(2))
  expect(result.current[0]["2"].title).toBe("Think! About Your Work")
})

test("load quote 4", async () => {
  const wrapper = ({ children }) => <App>{children}</App>
  const { result, rerender } = renderHook((...args) => useStore(...args), {
    wrapper,
  })
  await act(async () => await result.current.loadQuote(4))
  rerender("quotes", 4)
  expect(result.current[0]["4"].title).toBe("Don't Live with Broken Windows")
})

test("generic test", async () => {
  const wrapper = ({ children }) => <App>{children}</App>
  const { result, rerender, waitForNextUpdate } = renderHook(
    ({ name, item }) => useStore(name, item),
    {
      wrapper,
      initialProps: { name: undefined, item: undefined },
    }
  )
  rerender({ name: "quotes", item: 4 })
  await waitForNextUpdate({ timeout: 3000 })
  expect(result.current[0].title).toBe("Don't Live with Broken Windows")

  rerender({ name: "quotes", item: 6 })
  await waitForNextUpdate({ timeout: 3000 })
  expect(result.current[0].title).toBe("Remember the Big Picture")

  rerender({ name: "quoteLengths", item: 3 })
  await waitForNextUpdate({ timeout: 3000 })
  expect(result.current[0]).toBe(90)
})
