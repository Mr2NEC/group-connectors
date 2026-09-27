import type { CameraState } from "sigma/types";
import { NetworkAnalyzer, type AnalysisView } from "#entities/analysis";
import { NetworkLoader, type Network } from "#entities/network";
import { ExplorationSession } from "#entities/session";
import { GraphExplorerPage } from "#pages/graph-explorer";
import type { DataSource } from "#shared/api";

export interface AppSnapshot {
  viewIndex: number;
  focusedNode: string | null;
  selectedGroup: number | null;
  answerMode: boolean;
  camera?: CameraState;
}

export class App {
  #started?: { network: Network; session: ExplorationSession<AnalysisView>; page: GraphExplorerPage };

  constructor(
    private readonly root: HTMLElement,
    private readonly source: DataSource,
  ) {}

  start(snapshot?: AppSnapshot): this {
    const network = new NetworkLoader(this.source).load();
    const views = new NetworkAnalyzer(network).analyzeAll();
    const session = new ExplorationSession(views);
    if (snapshot) App.#restoreSession(session, snapshot);
    const page = new GraphExplorerPage(this.root, { network, session }).mount();
    if (snapshot?.camera) page.canvas?.renderer?.getCamera().setState(snapshot.camera);
    this.#started = { network, session, page };
    return this;
  }

  snapshot(): AppSnapshot | undefined {
    const s = this.#started;
    if (!s) return undefined;
    return {
      viewIndex: s.session.viewIndex.value,
      focusedNode: s.session.focusedNode.value,
      selectedGroup: s.session.selectedGroup.value,
      answerMode: s.session.answerMode.value,
      camera: s.page.canvas?.renderer?.getCamera().getState(),
    };
  }

  destroy(): void {
    this.#started?.page.destroy();
    this.#started = undefined;
  }

  get debugHandle() {
    const s = this.#started;
    return s && { network: s.network, session: s.session, renderer: s.page.canvas?.renderer };
  }

  static #restoreSession(session: ExplorationSession<AnalysisView>, snapshot: AppSnapshot): void {
    if (snapshot.viewIndex >= session.views.length) return;
    session.viewIndex.set(snapshot.viewIndex);
    const view = session.view;
    if (snapshot.focusedNode && view.has(snapshot.focusedNode)) session.focusedNode.set(snapshot.focusedNode);
    if (snapshot.selectedGroup !== null && snapshot.selectedGroup < view.groups.length) session.selectedGroup.set(snapshot.selectedGroup);
    session.answerMode.set(snapshot.answerMode);
  }
}
