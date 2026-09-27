import type { UndirectedGraph } from "graphology";
import type { ViewConfig } from "#shared/api";
import { RARE_BRIDGE_MAX } from "#shared/config";
import type { Position } from "#shared/lib";
import type { Group } from "./Group";
import { GroupLayout } from "./GroupLayout";

export type GroupPair = [a: number, b: number, linkers: number];

export interface NodeMetric {
  group: number;
  degree: number;
  groupsTouched: number;
  pairs: GroupPair[];
  bridgeScore: number;
  cutOff: string[];
  betweenness: number;
}

export interface ViewEdgeAttributes {
  weight: number;
}

export type ViewGraph = UndirectedGraph<Record<string, never>, ViewEdgeAttributes>;

export interface AnalysisViewInit {
  config: ViewConfig;
  graph: ViewGraph;
  groups: Group[];
  metrics: Map<string, NodeMetric>;
  critical: string[];
  bridges: string[];
  groupLinks: GroupPair[];
  isolated: string[];
  components: number;
}

export class AnalysisView {
  readonly id: string;
  readonly label: string;
  readonly excludeTypes: readonly string[];
  readonly graph: ViewGraph;
  readonly groups: Group[];
  readonly critical: string[];
  readonly bridges: string[];
  readonly groupLinks: GroupPair[];
  readonly isolated: string[];
  readonly components: number;
  #positions?: Record<string, Position>;
  readonly #metrics: Map<string, NodeMetric>;
  readonly #excluded: Set<string>;

  constructor(init: AnalysisViewInit) {
    this.id = init.config.id;
    this.label = init.config.label;
    this.excludeTypes = init.config.exclude_types;
    this.#excluded = new Set(init.config.exclude_types);
    this.graph = init.graph;
    this.groups = init.groups;
    this.#metrics = init.metrics;
    this.critical = init.critical;
    this.bridges = init.bridges;
    this.groupLinks = init.groupLinks;
    this.isolated = init.isolated;
    this.components = init.components;
  }

  get positions(): Record<string, Position> {
    this.#positions ??= new GroupLayout().compute(this);
    return this.#positions;
  }

  static isRarePair(pair: GroupPair): boolean {
    return pair[2] <= RARE_BRIDGE_MAX;
  }

  has(id: string): boolean {
    return this.#metrics.has(id);
  }

  metric(id: string): NodeMetric {
    const m = this.#metrics.get(id);
    if (!m) throw new Error(`${id} has no links in view "${this.id}"`);
    return m;
  }

  get nodeIds(): string[] {
    return [...this.#metrics.keys()];
  }

  group(id: number): Group {
    const g = this.groups[id];
    if (!g) throw new Error(`No group ${id} in view "${this.id}"`);
    return g;
  }

  groupOf(id: string): Group {
    return this.group(this.metric(id).group);
  }

  countsRelationship(rel: { type: string }): boolean {
    return !this.#excluded.has(rel.type);
  }

  countedRels<R extends { type: string }>(rels: readonly R[]): R[] {
    return rels.filter((r) => this.countsRelationship(r));
  }

  rarePairs(id: string): GroupPair[] {
    return this.metric(id).pairs.filter(AnalysisView.isRarePair);
  }

  rareGroupsOf(id: string): number[] {
    return this.rarePairs(id).flatMap(([a, b]) => [a, b]);
  }

  groupsLinkedBy(id: string): number[] {
    return [...new Set(this.metric(id).pairs.flatMap(([a, b]) => [a, b]))];
  }

  get rareBridges(): string[] {
    return this.bridges.filter((id) => !this.critical.includes(id) && this.rarePairs(id).length > 0);
  }

  get connectors(): string[] {
    return [...this.critical, ...this.rareBridges];
  }

  get bestConnected(): string | null {
    let best: [string, number] | null = null;
    for (const [id, m] of this.#metrics) if (!best || m.degree > best[1]) best = [id, m.degree];
    return best?.[0] ?? null;
  }
}
