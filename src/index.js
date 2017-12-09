import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import registerServiceWorker from "./registerServiceWorker";
// import { providers, Contract } from "ethers";

registerServiceWorker();

window.addEventListener("load", async () => {
  console.log("load");
  ReactDOM.render(<App />, document.getElementById("root"));
});
