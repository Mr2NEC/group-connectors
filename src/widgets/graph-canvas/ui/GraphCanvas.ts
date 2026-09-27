import Sigma from "sigma";
import type { EdgeDisplayData, NodeDisplayData } from "sigma/types";
import type { AnalysisView } from "#entities/analysis";
import type { Network, NetworkEdgeAttributes, NetworkNodeAttributes } from "#entities/network";
import type { CameraRequest, ExplorationSession } from "#entities/session";
import { NodeFocus } from "#features/focus-node";
import { GroupSelector } from "#features/select-group";
import { GraphTheme } from "#shared/config";
import { Component } from "#shared/ui";
import { measureGroups } from "../model/GroupGeometry";
import { Highlighter, type Highlight } from "../model/Highlighter";
import { NodeMotion } from "../model/NodeMotion";
import { ViewStyler } from "../model/ViewStyler";
import { GroupLayer } from "./GroupLayer";
import "./graph-canvas.css";

export interface GraphCanvasDeps {
  network: Network;
  session: ExplorationSession<AnalysisView>;
}

type Renderer = Sigma<NetworkNodeAttributes, NetworkEdgeAttributes>;

export class GraphCanvas extends Component {
  readonly #network: Network;
  readonly #session: ExplorationSession<AnalysisView>;
  readonly #styler: ViewStyler;
  readonly #highlighter: Highlighter;
  readonly #focus: NodeFocus;
  readonly #groups: GroupSelector;
  readonly #motion: NodeMotion;
  #highlight: Highlight | null = null;
  #renderer?: Renderer;
  #resizeObserver?: ResizeObserver;

  constructor(root: HTMLElement, { network, session }: GraphCanvasDeps) {
    super(root);
    this.#network = network;
    this.#session = session;
    this.#styler = new ViewStyler(network.graph);
    this.#highlighter = new Highlighter(network.graph);
    this.#focus = new NodeFocus(session);
    this.#groups = new GroupSelector(session);
    this.#motion = new NodeMotion(network);
  }

  get renderer(): Renderer | undefined {
    return this.#renderer;
  }

  override mount(): this {
    const s = this.#session;
    this.root.classList.add("graph-canvas");
    this.root.innerHTML = `
      <div class="graph-canvas__graph"></div>
      <div class="graph-canvas__tools">
        <button type="button" data-action="reset" title="Clear selection and reset zoom">Reset</button>
      </div>`;

    this.#styler.apply(s.view);
    this.#motion.place(s.view);
    const renderer: Renderer = new Sigma(this.#network.graph, this.query(".graph-canvas__graph"), {
      zIndex: true,
      labelFont: GraphTheme.font,
      labelSize: 12,
      labelWeight: "500",
      labelColor: { color: GraphTheme.label },
      labelRenderedSizeThreshold: 9,
      stagePadding: 60,
      minCameraRatio: 0.08,
      maxCameraRatio: 3,
      nodeReducer: (node, data) => this.#reduceNode(node, data),
      edgeReducer: (edge, data) => this.#reduceEdge(edge, data),
    });
    this.#renderer = renderer;
    const groupLayer = new GroupLayer(renderer);
    renderer.on("afterRender", () => groupLayer.draw(measureGroups(s.view, this.#network.graph), this.#highlight === null));
    this.#resizeObserver = new ResizeObserver(() => {
      renderer.resize(true);
      renderer.refresh();
    });
    this.#resizeObserver.observe(this.query(".graph-canvas__graph"));

    this.watch([s.viewIndex], () => {
      this.#styler.apply(s.view);
      this.#motion.animate(s.view);
      this.render();
      void renderer.getCamera().animatedReset();
    });
    this.watch<unknown>([s.focusedNode, s.selectedGroup, s.answerMode]);
    this.watch([s.hoveredNode], () => renderer.refresh());
    this.watch([s.cameraRequests], (kind: CameraRequest) => (kind === "fit" ? this.#fitHighlight() : renderer.getCamera().animatedReset()));

    renderer.on("clickNode", ({ node }) => this.#focus.focus(node));
    renderer.on("clickStage", () => {
      this.#groups.clear();
      this.#focus.clear();
    });
    renderer.on("enterNode", ({ node }) => s.hoveredNode.set(node));
    renderer.on("leaveNode", () => s.hoveredNode.set(null));
    this.listen("click", () => s.reset(), this.query("[data-action=reset]"));
    return super.mount();
  }

  override render(): void {
    const s = this.#session;
    this.#highlight = this.#highlighter.compute({
      view: s.view,
      focus: s.focusedNode.value,
      group: s.selectedGroup.value,
      answer: s.answerMode.value,
    });
    this.#renderer?.refresh();
  }

  override destroy(): void {
    super.destroy();
    this.#motion.stop();
    this.#resizeObserver?.disconnect();
    this.#renderer?.kill();
  }

  #reduceNode(node: string, data: NetworkNodeAttributes): Partial<NodeDisplayData> {
    const hl = this.#highlight;
    const res: Partial<NodeDisplayData> = { ...data };
    if (!data.inView) return { ...res, hidden: true };
    if (hl && !hl.nodes.has(node)) {
      Object.assign(res, { color: GraphTheme.dimNode, label: "", zIndex: 0 });
    } else if (hl) {
      res.zIndex = 2;
      if (hl.labels.has(node)) res.forceLabel = true;
    }
    if (node === this.#session.focusedNode.value) {
      Object.assign(res, { size: (data.size ?? 2) * 1.5, forceLabel: true, highlighted: true, zIndex: 3 });
    }
    if (node === this.#session.hoveredNode.value) {
      Object.assign(res, { color: data.color, label: data.label, highlighted: true, forceLabel: true, zIndex: 3 });
    }
    return res;
  }

  #reduceEdge(edge: string, data: NetworkEdgeAttributes): Partial<EdgeDisplayData> {
    const hl = this.#highlight;
    const res: Partial<EdgeDisplayData> = { size: data.size };
    if (!data.inView) return { ...res, hidden: true };
    if (hl) {
      const g = this.#network.graph;
      const on = hl.edge(edge, g.source(edge), g.target(edge));
      Object.assign(res, on ? { color: GraphTheme.edgeHighlight, zIndex: 1 } : { color: GraphTheme.edgeDim, zIndex: 0 });
      return res;
    }
    const g = this.#network.graph;
    const hovered = this.#session.hoveredNode.value;
    if (hovered && (g.source(edge) === hovered || g.target(edge) === hovered)) {
      return { ...res, color: GraphTheme.edgeHighlight, zIndex: 1 };
    }
    if (data.cross) return { ...res, hidden: true };
    res.color = GraphTheme.edge;
    return res;
  }

  #fitHighlight(): void {
    const renderer = this.#renderer;
    if (!renderer) return;
    const camera = renderer.getCamera();
    const pts = [...(this.#highlight?.nodes ?? [])].map((n) => renderer.getNodeDisplayData(n)).filter((p) => p !== undefined);
    if (!pts.length) {
      void camera.animatedReset();
      return;
    }
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const ratio = Math.min(1, Math.max(0.25, Math.max(x1 - x0, y1 - y0) * 1.25));
    void camera.animate({ x: (x0 + x1) / 2, y: (y0 + y1) / 2, ratio }, { duration: 500 });
  }
}
