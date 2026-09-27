import { Text } from "#shared/lib";
import type { Relationship } from "../model/Link";
import type { Network } from "../model/Network";

export class RelationshipText {
  static render(network: Network, rel: Relationship, viewpointId: string): string {
    const label = network.schema.relationshipLabel(rel.type);
    const year = rel.year ? ` ${rel.year}` : "";
    const arrow = rel.directed ? (rel.from === viewpointId ? "→ " : "← ") : "";
    const sentence = rel.directed
      ? `${network.labelOf(rel.from)} ${label} ${network.labelOf(rel.to)}`
      : `${network.labelOf(rel.from)} and ${network.labelOf(rel.to)}: ${label}`;
    const title = `${sentence}${rel.year ? ` (${rel.year})` : ""}`;
    return `<span title="${Text.escape(title)}">${arrow}${Text.escape(label)}${year}</span>`;
  }
}
