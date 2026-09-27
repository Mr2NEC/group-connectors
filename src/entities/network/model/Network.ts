import { UndirectedGraph } from "graphology";
import type { Position } from "#shared/lib";
import type { Link, Relationship } from "./Link";
import type { NetworkSchema } from "./NetworkSchema";
import type { Organisation } from "./Organisation";

export interface NetworkNodeAttributes {
  label: string;
  x: number;
  y: number;
  inView?: boolean;
  color?: string;
  size?: number;
}

export interface NetworkEdgeAttributes {
  rels: Relationship[];
  inView?: boolean;
  size?: number;
  cross?: boolean;
}

export type NetworkGraph = UndirectedGraph<NetworkNodeAttributes, NetworkEdgeAttributes>;

export type LoadIssues = Map<string, string[]>;

export class Network {
  readonly graph: NetworkGraph = new UndirectedGraph();
  readonly #byId: Map<string, Organisation>;
  readonly #linked: Set<string>;

  constructor(
    readonly schema: NetworkSchema,
    organisations: Organisation[],
    readonly links: Link[],
    readonly issues: LoadIssues,
  ) {
    this.#byId = new Map(organisations.map((o) => [o.id, o]));
    this.#linked = new Set(links.flatMap((l) => [l.s, l.t]));
    for (const o of organisations) this.graph.addNode(o.id, { label: o.label, x: 0, y: 0 });
    for (const l of links) this.graph.addEdge(l.s, l.t, { rels: l.rels });
  }

  get organisations(): Organisation[] {
    return [...this.#byId.values()];
  }

  get unlinked(): string[] {
    return this.organisations
      .filter((o) => !this.#linked.has(o.id))
      .map((o) => o.label)
      .sort();
  }

  get relationshipCount(): number {
    return this.links.reduce((n, l) => n + l.rels.length, 0);
  }

  get(id: string): Organisation {
    const org = this.#byId.get(id);
    if (!org) throw new Error(`Unknown organisation: ${id}`);
    return org;
  }

  labelOf(id: string): string {
    return this.#byId.get(id)?.label ?? id;
  }

  find(query: string): Organisation | undefined {
    const q = query.trim().toLowerCase();
    if (!q) return undefined;
    const all = this.organisations;
    return all.find((o) => o.label.toLowerCase() === q) ?? all.find((o) => o.label.toLowerCase().includes(q));
  }

  details(org: Organisation): [label: string, value: string][] {
    const typeColumn = this.schema.entities.type;
    return Object.entries(org.attrs).flatMap(([column, value]): [string, string][] =>
      column !== typeColumn && value ? [[this.schema.columnLabel(column), value]] : [],
    );
  }

  placeNodes(positions: Record<string, Position>): void {
    for (const [id, { x, y }] of Object.entries(positions)) this.graph.mergeNodeAttributes(id, { x, y });
  }
}
