import type { AnalysisView } from "#entities/analysis";
import type { Network } from "#entities/network";
import type { Position } from "#shared/lib";

const HIDDEN_SPOT: Position = { x: 0, y: 0 };

export class NodeMotion {
  #frame = 0;

  constructor(private readonly network: Network) {}

  place(view: AnalysisView): void {
    cancelAnimationFrame(this.#frame);
    this.network.placeNodes(this.#targets(view));
  }

  animate(view: AnalysisView, duration = 600): void {
    cancelAnimationFrame(this.#frame);
    const graph = this.network.graph;
    const targets = this.#targets(view);
    const starts: Record<string, Position> = {};
    graph.forEachNode((id, attrs) => (starts[id] = { x: attrs.x, y: attrs.y }));
    const began = performance.now();

    const step = (now: number) => {
      const t = Math.min((now - began) / duration, 1);
      const k = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
      const frame: Record<string, Position> = {};
      for (const [id, to] of Object.entries(targets)) {
        const from = starts[id] ?? to;
        frame[id] = { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k };
      }
      this.network.placeNodes(frame);
      if (t < 1) this.#frame = requestAnimationFrame(step);
    };
    this.#frame = requestAnimationFrame(step);
  }

  stop(): void {
    cancelAnimationFrame(this.#frame);
  }

  #targets(view: AnalysisView): Record<string, Position> {
    const positions = view.positions;
    const targets: Record<string, Position> = {};
    this.network.graph.forEachNode((id) => (targets[id] = positions[id] ?? HIDDEN_SPOT));
    return targets;
  }
}
