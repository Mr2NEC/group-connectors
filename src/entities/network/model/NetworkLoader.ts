import type { DataSource, EntityConfig } from "#shared/api";
import { CsvParser, type CsvRow } from "#shared/lib";
import { Link, Relationship } from "./Link";
import { Network, type LoadIssues } from "./Network";
import { NetworkSchema } from "./NetworkSchema";
import { Organisation, type OrganisationAttrs } from "./Organisation";

export const LoadIssue = {
  unknownEntity: "unknown ID",
  selfLoop: "self-loop",
  duplicate: "duplicate",
} as const;

export type LoadIssueKind = (typeof LoadIssue)[keyof typeof LoadIssue];

const DIRECTED_VALUES = new Set(["directed", "true", "1", "yes"]);

export class NetworkLoader {
  constructor(
    private readonly source: DataSource,
    private readonly parser = new CsvParser(),
  ) {}

  load(): Network {
    const schema = new NetworkSchema(this.source.schema);
    const organisations = this.#loadOrganisations(schema.entities);
    const { links, issues } = this.#loadLinks(schema, new Map(organisations.map((o) => [o.id, o])));
    return new Network(schema, organisations, links, issues);
  }

  #rows(path: string): CsvRow[] {
    return this.parser.parse(this.source.read(path));
  }

  #loadOrganisations(cfg: EntityConfig): Organisation[] {
    const missing = new Set(cfg.missing_values ?? [""]);
    return this.#rows(cfg.file).map((row) => {
      const attrs: OrganisationAttrs = {};
      for (const [col, raw] of Object.entries(row)) {
        if (col === cfg.id || col === cfg.label) continue;
        const v = raw.trim();
        attrs[col] = missing.has(v) ? null : v;
      }
      return new Organisation(row[cfg.id] ?? "", (row[cfg.label] ?? "").trim(), row[cfg.type] ?? "", attrs);
    });
  }

  #loadLinks(schema: NetworkSchema, byId: Map<string, Organisation>): { links: Link[]; issues: LoadIssues } {
    const cfg = schema.relationships;
    const issues: LoadIssues = new Map();
    const report = (kind: LoadIssueKind, text: string) => {
      const list = issues.get(kind) ?? [];
      list.push(text);
      issues.set(kind, list);
    };
    const labelOf = (id: string) => byId.get(id)?.label ?? `${id} (unknown)`;
    const column = (row: CsvRow, name: string | undefined) => (name ? (row[name] ?? "").trim() : "");
    const describe = (s: string, t: string, type: string, directed: boolean, year: string | null) =>
      [`${labelOf(s)} ${directed ? "→" : "–"} ${labelOf(t)}`, schema.relationshipLabel(type), year].filter(Boolean).join(" · ");
    const links = new Map<string, Link>();
    const kept = new Map<string, Relationship>();

    for (const row of this.#rows(cfg.file)) {
      const s = column(row, cfg.source);
      const t = column(row, cfg.target);
      const type = column(row, cfg.type);
      const directed = DIRECTED_VALUES.has(column(row, cfg.direction).toLowerCase());
      const year = column(row, cfg.year) || null;
      if (!byId.has(s) || !byId.has(t)) {
        report(LoadIssue.unknownEntity, describe(s, t, type, directed, year));
        continue;
      }
      if (s === t) {
        report(LoadIssue.selfLoop, [labelOf(s), schema.relationshipLabel(type), year].filter(Boolean).join(" · "));
        continue;
      }
      const ends = directed ? [s, t] : [s, t].sort();
      const key = [type, year, ...ends].join("|");
      const original = kept.get(key);
      if (original) {
        original.addCopy();
        report(LoadIssue.duplicate, describe(s, t, type, directed, year));
        continue;
      }

      const [a, b] = s < t ? [s, t] : [t, s];
      const pair = `${a}|${b}`;
      const link = links.get(pair) ?? new Link(a, b);
      links.set(pair, link);
      const weight = column(row, cfg.weight) ? Number.parseFloat(column(row, cfg.weight)) : 1;
      const relationship = new Relationship(type, s, t, directed, year ? Number.parseInt(year, 10) : null, weight);
      kept.set(key, relationship);
      link.add(relationship);
    }
    return { links: [...links.values()], issues };
  }
}
