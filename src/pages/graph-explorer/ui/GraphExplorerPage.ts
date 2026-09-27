import type { AnalysisView } from "#entities/analysis";
import type { Network } from "#entities/network";
import type { ExplorationSession } from "#entities/session";
import { NodeFocus } from "#features/focus-node";
import { SearchBox } from "#features/search-node";
import { AnswerButton } from "#features/show-answer";
import { ViewToggle } from "#features/toggle-view";
import { DataNotes } from "#widgets/data-notes";
import { GraphCanvas } from "#widgets/graph-canvas";
import { GroupLegend } from "#widgets/group-legend";
import { InsightPanel } from "#widgets/insight-panel";
import { Text } from "#shared/lib";
import { Component } from "#shared/ui";
import "./graph-explorer-page.css";

export interface GraphExplorerDeps {
  network: Network;
  session: ExplorationSession<AnalysisView>;
}

export class GraphExplorerPage extends Component {
  readonly #deps: GraphExplorerDeps;
  #children: Component[] = [];
  #canvas?: GraphCanvas;

  constructor(root: HTMLElement, deps: GraphExplorerDeps) {
    super(root);
    this.#deps = deps;
  }

  get canvas(): GraphCanvas | undefined {
    return this.#canvas;
  }

  override mount(): this {
    const { network, session } = this.#deps;
    this.root.classList.add("graph-explorer");
    this.root.innerHTML = `
      <aside class="graph-explorer__sidebar">
        <header class="graph-explorer__header">
          <h1>${Text.escape(network.schema.title)}</h1>
        </header>
        <div class="graph-explorer__controls">
          <div data-slot="view-toggle"></div>
          <div data-slot="answer-button"></div>
          <div data-slot="search"></div>
        </div>
        <section data-slot="insight-panel"></section>
        <section data-slot="group-legend"></section>
        <footer data-slot="data-notes"></footer>
      </aside>
      <main class="graph-explorer__stage"><div data-slot="graph-canvas"></div></main>`;

    const slot = (name: string) => this.query(`[data-slot="${name}"]`);
    const focus = new NodeFocus(session);
    this.#canvas = new GraphCanvas(slot("graph-canvas"), this.#deps);
    this.#children = [
      new ViewToggle(slot("view-toggle"), session),
      new AnswerButton(slot("answer-button"), session),
      new SearchBox(slot("search"), network, { onPick: (id) => focus.focus(id) }),
      new InsightPanel(slot("insight-panel"), this.#deps),
      new GroupLegend(slot("group-legend"), this.#deps),
      new DataNotes(slot("data-notes"), this.#deps),
      this.#canvas,
    ];
    this.#children.forEach((c) => c.mount());

    const sidebar = this.query(".graph-explorer__sidebar");
    this.watch([session.focusedNode], (id) => {
      if (id) sidebar.scrollTop = 0;
    });
    return super.mount();
  }

  override destroy(): void {
    this.#children.forEach((c) => c.destroy());
    super.destroy();
  }
}
