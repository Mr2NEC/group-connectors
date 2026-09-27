import "./styles/index.css";
import { bundledSource } from "#shared/api";
import { App } from "./App";

declare global {
  interface Window {
    __viewer?: App["debugHandle"];
  }
}

const root = document.getElementById("root");
if (!root) throw new Error("index.html has no #root element");
window.__viewer = new App(root, bundledSource).start().debugHandle;
