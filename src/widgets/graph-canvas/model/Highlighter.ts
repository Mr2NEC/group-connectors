import type { AnalysisView } from "#entities/analysis";
import type { NetworkGraph } from "#entities/network";

export interface Highlight {
  nodes: Set<string>;
  labels: Set<string>;
  edge: (key: string, source: string, target: string) => boolean;
}

export interface HighlightState {
  view: AnalysisView;
  focus: string | null;
  group: number | null;
  answer: boolean;
}

export class Highlighter {
  constructor(private readonly graph: NetworkGraph) {}

  compute({ view, focus, group, answer }: HighlightState): Highlight | null {
    if (focus) return this.#forNode(view, focus);
    if (group !== null) return this.#forGroup(view, group);
    if (answer) return this.#forAnswer(view);
    return null;
  }

  #forNode(view: AnalysisView, focus: string): Highlight {
    const neighbours = this.graph.neighbors(focus);
    const cut = new Set(view.metric(focus).cutOff);
    return {
      nodes: new Set([focus, ...neighbours.filter((n) => view.has(n)), ...cut]),
      labels: new Set([...neighbours, focus]),
      edge: (_k, s, t) => s === focus || t === focus || (cut.has(s) && cut.has(t)),
    };
  }

  #forGroup(view: AnalysisView, group: number): Highlight {
    const nodes = new Set(view.group(group).members);
    return { nodes, labels: new Set(), edge: (_k, s, t) => nodes.has(s) && nodes.has(t) };
  }

  #forAnswer(view: AnalysisView): Highlight {
    const critical = new Set(view.critical);
    const rareGroups = new Map(view.connectors.map((id) => [id, new Set(view.rareGroupsOf(id))]));
    const nodes = new Set(rareGroups.keys());
    const counts = (k: string, c: string, other: string) =>
      critical.has(c) || (!!this.graph.getEdgeAttribute(k, "cross") && !!rareGroups.get(c)?.has(view.metric(other).group));
    return {
      nodes,
      labels: nodes,
      edge: (k, s, t) => (nodes.has(s) && counts(k, s, t)) || (nodes.has(t) && counts(k, t, s)),
    };
  }
}
