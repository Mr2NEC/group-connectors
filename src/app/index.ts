import "./styles/index.css";
import { bundledSource } from "#shared/api";
import { App, type AppSnapshot } from "./App";

declare global {
  interface Window {
    __viewer?: App["debugHandle"];
  }
}

const root = document.getElementById("root");
if (!root) throw new Error("index.html has no #root element");

const app = new App(root, bundledSource).start(import.meta.hot?.data.snapshot as AppSnapshot | undefined);
window.__viewer = app.debugHandle;

if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose((data: { snapshot?: AppSnapshot }) => {
    data.snapshot = app.snapshot();
    app.destroy();
  });
}
