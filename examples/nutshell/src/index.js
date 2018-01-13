import React from "react";
import ReactDOM from "react-dom";
import { Store, Dispatch, Connector } from "react-synaptic";

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

const App = ({ comic, isLoading }) => (
  <Connector
    dispatchers={dispatch => ({
      onClick: () => dispatch("nextRandomComic")
    })}
    render={({ onClick }) => (
      <div>
        {isLoading ? (
          <p>Loading...</p>
        ) : comic ? (
          <div>
            <img src={comic.img} alt={comic.alt} />
            <br />
            <button onClick={onClick}>Laugh Again</button>
          </div>
        ) : (
          <Dispatch action="nextRandomComic" />
        )}
      </div>
    )}
  />
);

ReactDOM.render(
  <Store
    handlers={{
      nextRandomComic
    }}
    initialState={{
      comic: null,
      isLoading: false
    }}
    render={store => (
      <App comic={store.state.comic} isLoading={store.state.isLoading} />
    )}
  />,
  document.getElementById("root")
);
