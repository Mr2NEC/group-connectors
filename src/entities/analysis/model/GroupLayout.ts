import type { UndirectedGraph } from "graphology";
import forceAtlas2 from "graphology-layout-forceatlas2";
import { DEFAULT_LAYOUT, type LayoutSettings } from "#shared/config";
import { SeededRandom, type Position } from "#shared/lib";
import type { AnalysisView } from "./AnalysisView";

type LayoutGraph = UndirectedGraph<Position, { layoutWeight: number }>;

export class GroupLayout {
  constructor(private readonly settings: Readonly<LayoutSettings> = DEFAULT_LAYOUT) {}

  compute(view: AnalysisView): Record<string, Position> {
    const s = this.settings;
    const g = view.graph.copy() as unknown as LayoutGraph;
    const rng = new SeededRandom(s.seed);
    g.forEachNode((n) => g.mergeNodeAttributes(n, { x: rng.next() * 100, y: rng.next() * 100 }));
    g.forEachEdge((e, _attrs, a, b) =>
      g.setEdgeAttribute(e, "layoutWeight", view.metric(a).group === view.metric(b).group ? s.intraGroupWeight : s.interGroupWeight),
    );
    return forceAtlas2(g, {
      iterations: s.iterations,
      getEdgeWeight: "layoutWeight",
      settings: { linLogMode: true, outboundAttractionDistribution: true, scalingRatio: s.scalingRatio, gravity: s.gravity },
    });
  }
}
