import "./styles/index.css";
import { bundledSource } from "#shared/api";
import { App } from "./App";

const root = document.getElementById("root");
if (!root) throw new Error("index.html has no #root element");
new App(root, bundledSource).start();
