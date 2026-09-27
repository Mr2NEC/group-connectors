import { UndirectedGraph } from "graphology";
import louvain from "graphology-communities-louvain";
import betweennessCentrality from "graphology-metrics/centrality/betweenness.js";
import type { AnalysisConfig, ViewConfig } from "#shared/api";
import { GraphTopology, SeededRandom } from "#shared/lib";
import type { AnalyzableNetwork } from "./AnalyzableNetwork";
import { AnalysisView, type GroupPair, type NodeMetric, type ViewGraph } from "./AnalysisView";
import { Group } from "./Group";

const round = (x: number, digits: number) => Math.round(x * 10 ** digits) / 10 ** digits;
const pairKey = (a: number, b: number) => `${a}|${b}`;

function* pairsOf<T>(items: readonly T[]): Generator<[T, T]> {
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) yield [items[i] as T, items[j] as T];
}

function pushTo<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const list = map.get(key) ?? [];
  list.push(value);
  map.set(key, list);
}

export class NetworkAnalyzer {
  readonly #network: AnalyzableNetwork;
  readonly #cfg: AnalysisConfig;

  constructor(network: AnalyzableNetwork) {
    this.#network = network;
    this.#cfg = network.schema.analysis;
  }

  analyzeAll(): AnalysisView[] {
    return this.#network.schema.views.map((config) => this.analyze(config));
  }

  analyze(config: ViewConfig): AnalysisView {
    const g = this.#viewGraph(new Set(config.exclude_types));
    const groups = this.#detectGroups(g);
    const groupOf = new Map(groups.flatMap((gr) => gr.members.map((n) => [n, gr.id] as const)));
    const groupIdOf = (n: string) => groupOf.get(n) ?? -1;

    const touches = new Map<string, number[]>();
    const bridgers = new Map<string, Set<string>>();
    g.forEachNode((n) => {
      const gs = [...new Set([groupIdOf(n), ...g.neighbors(n).map(groupIdOf)])].sort((a, b) => a - b);
      touches.set(n, gs);
      for (const [a, b] of pairsOf(gs)) {
        const set = bridgers.get(pairKey(a, b)) ?? new Set<string>();
        set.add(n);
        bridgers.set(pairKey(a, b), set);
      }
    });

    const betweenness = betweennessCentrality(g, { getEdgeWeight: null });
    const cutOff = this.#cutOff(g);

    const metrics = new Map<string, NodeMetric>();
    g.forEachNode((n) => {
      const touched = touches.get(n) ?? [];
      const pairs: GroupPair[] = [...pairsOf(touched)]
        .map(([a, b]): GroupPair => [a, b, bridgers.get(pairKey(a, b))?.size ?? 0])
        .sort((p, q) => p[2] - q[2]);
      metrics.set(n, {
        group: groupIdOf(n),
        degree: g.degree(n),
        groupsTouched: touched.length,
        pairs,
        bridgeScore: round(pairs.reduce((sum, [, , k]) => sum + 1 / k, 0), 3),
        cutOff: cutOff.get(n) ?? [],
        betweenness: round(betweenness[n] ?? 0, 4),
      });
    });

    const m = (n: string) => metrics.get(n) as NodeMetric;
    const critical = [...cutOff.keys()]
      .filter((n) => m(n).cutOff.length >= this.#cfg.min_cut_off)
      .sort((a, b) => m(b).cutOff.length - m(a).cutOff.length || m(b).bridgeScore - m(a).bridgeScore);
    const bridges = g
      .filterNodes((n) => m(n).groupsTouched > 1)
      .sort((a, b) => m(b).bridgeScore - m(a).bridgeScore || m(b).betweenness - m(a).betweenness)
      .slice(0, this.#cfg.top_connectors);

    const isolated = this.#network.organisations
      .filter((o) => !g.hasNode(o.id))
      .map((o) => o.id)
      .sort(this.#byLabel);

    return new AnalysisView({
      config,
      graph: g,
      groups,
      metrics,
      critical,
      bridges,
      groupLinks: this.#groupLinks(g, groupIdOf),
      isolated,
      components: GraphTopology.countComponents(g),
    });
  }

  readonly #byLabel = (a: string, b: string): number => {
    const [x, y] = [this.#network.labelOf(a), this.#network.labelOf(b)];
    return x < y ? -1 : x > y ? 1 : 0;
  };

  #viewGraph(excluded: Set<string>): ViewGraph {
    const g: ViewGraph = new UndirectedGraph();
    for (const link of this.#network.links) {
      const rels = link.rels.filter((r) => !excluded.has(r.type));
      if (!rels.length) continue;
      g.mergeNode(link.s);
      g.mergeNode(link.t);
      g.addEdge(link.s, link.t, { weight: rels.reduce((sum, r) => sum + r.weight, 0) });
    }
    return g;
  }

  #detectGroups(g: ViewGraph): Group[] {
    const communityOf = louvain(g, {
      getEdgeWeight: "weight",
      resolution: this.#cfg.community_resolution,
      rng: new SeededRandom(this.#cfg.community_seed).asFunction(),
    });
    const byCommunity = new Map<number, string[]>();
    for (const [n, c] of Object.entries(communityOf)) pushTo(byCommunity, c, n);

    const first = (ms: string[]) => ms[0] ?? "";
    return [...byCommunity.values()]
      .map((ms) => ms.sort())
      .sort((a, b) => b.length - a.length || (first(a) < first(b) ? -1 : 1))
      .map((members, id) => {
        const { name, profile } = this.#describeGroup(members, g);
        return new Group(id, members, name, profile);
      });
  }

  #describeGroup(members: string[], g: ViewGraph): { name: string; profile: string } {
    const inside = new Set(members);
    const innerDegree = (n: string) => g.neighbors(n).filter((m) => inside.has(m)).length;
    const ranked = [...members].sort((a, b) => innerDegree(b) - innerDegree(a) || this.#byLabel(a, b));
    const name = ranked
      .slice(0, 2)
      .map((n) => this.#network.labelOf(n))
      .join(" & ");

    const profile: string[] = [];
    for (const field of this.#network.schema.entities.profile_fields ?? []) {
      const counts = new Map<string, number>();
      for (const n of members) {
        const v = this.#network.get(n).attrs[field];
        if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
      }
      let top: [string, number] | null = null;
      for (const entry of counts) if (!top || entry[1] > top[1]) top = entry;
      if (top && top[1] / members.length >= 0.4) profile.push(top[0]);
    }
    return { name, profile: profile.join(" · ") };
  }

  #cutOff(g: ViewGraph): Map<string, string[]> {
    const result = new Map<string, string[]>();
    for (const n of GraphTopology.articulationPoints(g)) {
      const [, ...smaller] = GraphTopology.piecesWithout(g, n);
      result.set(n, smaller.flat().sort(this.#byLabel));
    }
    return result;
  }

  #groupLinks(g: ViewGraph, groupIdOf: (n: string) => number): GroupPair[] {
    const counts = new Map<string, GroupPair>();
    g.forEachEdge((_e, _attrs, s, t) => {
      const [a, b] = [groupIdOf(s), groupIdOf(t)].sort((x, y) => x - y) as [number, number];
      if (a === b) return;
      const entry = counts.get(pairKey(a, b)) ?? [a, b, 0];
      entry[2]++;
      counts.set(pairKey(a, b), entry);
    });
    return [...counts.values()].sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  }
}
