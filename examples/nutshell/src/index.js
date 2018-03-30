import React from "react";
import ReactDOM from "react-dom";
import { createStore } from "react-synaptic";

const { Store, Connector } = createStore();

const MAX_COMIC_NUMBER = 1941;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function nextRandomComic(store) {
  // randomly throw error
  if (Math.random() > 0.75) {
    throw Error("Network Error");
  }

  // fetch random comic
  const comicNumber = Math.floor(Math.random() * Math.floor(MAX_COMIC_NUMBER));
  const comic = await (await window.fetch(
    "https://xkcd.now.sh/" + comicNumber
  )).json();

  // make it slow
  await sleep(1000);

  // update comic data using copy-on-write semantics (via immer)
  await store.update(state => {
    state.comic = comic;
  });
}

const App = () => (
  <Connector
    select={(state, actions, withPlaceholder) => ({
      // select state from shared store
      comic: state.comic,
      // select multi-dispatch *async* actions dispatchers from store
      // withPlaceholder causes placeholder to show until resolved
      onClick: () => withPlaceholder(actions.nextRandomComic)
    })}

    /* call when component mounts  */
    initializer={actions => actions.nextRandomComic()}

    /* but only if not already initialized  */
    initializeWhen={state => !state.comic}

    /* show after delay if initializer called, until resolved */
    placeholder={{ message: "Reticulating splines..." }}
  >
    {({ comic, onClick }) => (
      <div>
        <img src={comic.img} alt={comic.alt} />
        <br />
        <button onClick={onClick}>Laugh Again</button>
      </div>
    )}
  </Connector>
);

ReactDOM.render(
  <Store
    /* define actions that consumers can dispatch */
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
