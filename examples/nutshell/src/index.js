import React from "react";
import ReactDOM from "react-dom";
import createStore from "./react-synaptic";

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
      comic: state.comic, // select state from shared store
      onClick: () => withPlaceholder(actions.nextRandomComic) // map actions
    })}
    initializer={(state, actions) => !state.comic && actions.nextRandomComic()}
  >
    {({ comic, onClick }) => (
      <div>
        <img src={comic.img} alt={comic.alt} /> <br />
        <button onClick={onClick}>Laugh Again</button>
      </div>
    )}
  </Connector>
);

ReactDOM.render(
  <Store
    actions={{
      nextRandomComic
    }}
  >
    <App />
  </Store>,
  document.getElementById("root")
);
