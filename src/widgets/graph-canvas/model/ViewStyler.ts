import type { AnalysisView } from "#entities/analysis";
import type { NetworkGraph } from "#entities/network";
import { GraphTheme } from "#shared/config";

export class ViewStyler {
  constructor(private readonly graph: NetworkGraph) {}

  apply(view: AnalysisView): void {
    const g = this.graph;
    g.forEachNode((id) => {
      const m = view.has(id) ? view.metric(id) : null;
      g.mergeNodeAttributes(id, {
        inView: !!m,
        color: m ? view.group(m.group).color : GraphTheme.dimNode,
        size: m ? 2.5 + Math.sqrt(m.degree) * 1.6 : 2,
      });
    });
    g.forEachEdge((key, attrs, s, t) => {
      const rels = view.countedRels(attrs.rels);
      const w = rels.reduce((sum, r) => sum + r.weight, 0);
      g.mergeEdgeAttributes(key, {
        inView: rels.length > 0,
        size: Math.min(0.5 + w * 0.15, 3),
        cross: rels.length > 0 && view.metric(s).group !== view.metric(t).group,
      });
    });
  }
}
