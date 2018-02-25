import React from "react";
import ReactDOM from "react-dom";
import { createStore } from "react-synaptic";

const { Store, Connector, Action } = createStore();

const MAX_COMIC_NUMBER = 1941;

async function nextRandomComic(store) {
  // set loading state
  store.update(prevState => ({
    ...prevState,
    isLoading: true,
    comic: null
  }));

  // fetch random comic
  const comicNumber = Math.floor(Math.random() * Math.floor(MAX_COMIC_NUMBER));
  const comic = await (await window.fetch(
    "https://xkcd.now.sh/" + comicNumber
  )).json();

  // update comic data
  store.update(prevState => ({
    ...prevState,
    isLoading: false,
    comic: comic
  }));
}

const App = () => (
  <Connector
    select={(state, actions) => ({
      // select specific state properties
      comic: state.comic,
      isLoading: state.isLoading,
      // multi-dispatch and *async* actions
      onClick: actions.nextRandomComic
    })}
  >
    { ({ comic, isLoading, onClick }) => (
      <div>
        <hr/>
        {isLoading ? (
          <p>Loading...</p>
        ) : comic ? (
          <div>
            <img src={comic.img} alt={comic.alt} />
            <br />
            <button onClick={onClick}>Laugh Again</button>
          </div>
        ) : (
          <Action name="nextRandomComic" />
        )}
      </div>
    )
  }
  </Connector>
);

ReactDOM.render(
  <Store
    actions={{
      nextRandomComic
    }}
    initialState={{
      comic: null,
      isLoading: false
    }}
  >
    <App />
  </Store>,
  document.getElementById("root")
);
