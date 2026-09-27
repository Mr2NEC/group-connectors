import { NetworkAnalyzer, type AnalysisView } from "#entities/analysis";
import { NetworkLoader, type Network } from "#entities/network";
import { ExplorationSession } from "#entities/session";
import { GraphExplorerPage } from "#pages/graph-explorer";
import type { DataSource } from "#shared/api";

export class App {
  #started?: { network: Network; session: ExplorationSession<AnalysisView>; page: GraphExplorerPage };

  constructor(
    private readonly root: HTMLElement,
    private readonly source: DataSource,
  ) {}

  start(): this {
    const network = new NetworkLoader(this.source).load();
    const views = new NetworkAnalyzer(network).analyzeAll();
    const session = new ExplorationSession(views);
    const page = new GraphExplorerPage(this.root, { network, session }).mount();
    this.#started = { network, session, page };
    return this;
  }

  get debugHandle() {
    const s = this.#started;
    return s && { network: s.network, session: s.session, renderer: s.page.canvas?.renderer };
  }
}
