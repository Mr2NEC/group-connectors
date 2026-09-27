import { GroupChip, PairSentence, type AnalysisView, type NodeMetric } from "#entities/analysis";
import { NodeLink, RelationshipText, type Network, type Organisation, type Relationship } from "#entities/network";
import { Text } from "#shared/lib";
import { Chip } from "#shared/ui";

const MAX_PAIRS = 6;

interface Neighbour {
  nb: string;
  rels: Relationship[];
}

export class NodeDetailsSection {
  constructor(private readonly network: Network) {}

  render(view: AnalysisView, id: string): string {
    const m = view.metric(id);
    const org = this.network.get(id);
    return `
      <button class="back" data-action="back">← Back</button>
      <p class="details-title">${Text.escape(org.label)}
        <span class="details-type">${Text.escape(this.network.schema.entityTypeLabel(org.type))}</span></p>
      <p>${GroupChip.render(view.group(m.group))}</p>
      ${this.#attributes(org)}
      ${this.#cutOff(org, m)}${this.#bridges(view, m)}
      <h3>Direct links (${m.degree})</h3>
      ${this.#neighbours(view, id, m)}`;
  }

  #attributes(org: Organisation): string {
    const rows = this.network.details(org).map(([label, value]) => `<dt>${Text.escape(label)}</dt><dd>${Text.escape(value)}</dd>`);
    return rows.length ? `<dl class="details-attrs">${rows.join("")}</dl>` : "";
  }

  #cutOff(org: Organisation, m: NodeMetric): string {
    if (!m.cutOff.length) return "";
    const { one, many } = this.network.schema.nouns;
    const chips = m.cutOff.map((c) => Chip.render(Text.escape(this.network.labelOf(c)), { as: "button", attrs: { "data-node": c } }));
    return `<div class="callout"><p><b>Without ${Text.escape(org.label)}, ${Text.plural(m.cutOff.length, one, many)} lose every connection:</b></p>
      ${chips.join("")}</div>`;
  }

  #bridges(view: AnalysisView, m: NodeMetric): string {
    if (!m.pairs.length) return "";
    const nouns = this.network.schema.nouns;
    const items = m.pairs.slice(0, MAX_PAIRS).map((p) => `<li>${PairSentence.render(view, p, nouns)}</li>`);
    const more = m.pairs.length > MAX_PAIRS ? `<li class="muted">+${m.pairs.length - MAX_PAIRS} more</li>` : "";
    return `<h3>Groups it connects</h3><ul class="sentences">${items.join("")}${more}</ul>`;
  }

  #neighbours(view: AnalysisView, id: string, m: NodeMetric): string {
    const net = this.network;
    const g = net.graph;
    const byGroup = new Map<number, Neighbour[]>();
    g.forEachNeighbor(id, (nb) => {
      if (!view.has(nb)) return;
      const rels = view.countedRels(g.getEdgeAttribute(g.edge(id, nb), "rels"));
      if (!rels.length) return;
      const grp = view.metric(nb).group;
      byGroup.set(grp, [...(byGroup.get(grp) ?? []), { nb, rels }]);
    });
    const order = [...byGroup.keys()].sort((x, y) => (x === m.group ? -1 : y === m.group ? 1 : x - y));
    return order
      .map((grp) => {
        const rows = (byGroup.get(grp) ?? [])
          .sort((p, q) => net.labelOf(p.nb).localeCompare(net.labelOf(q.nb)))
          .map(({ nb, rels }) => {
            const desc = rels.map((r) => RelationshipText.render(net, r, id)).join(", ");
            return `<li>${NodeLink.render(net, nb)}<span class="rel">${desc}</span></li>`;
          });
        return `<h3>${GroupChip.render(view.group(grp))}</h3><ul class="neighbours">${rows.join("")}</ul>`;
      })
      .join("");
  }
}
