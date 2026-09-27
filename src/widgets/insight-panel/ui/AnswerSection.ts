import { AnalysisView, GroupChip, PairSentence } from "#entities/analysis";
import { NodeLink, type Network } from "#entities/network";
import { Text } from "#shared/lib";

export class AnswerSection {
  constructor(private readonly network: Network) {}

  render(view: AnalysisView): string {
    const nouns = this.network.schema.nouns;
    const critCards = view.critical.map((id) => {
      const m = view.metric(id);
      const best = m.pairs[0];
      const extra = best && AnalysisView.isRarePair(best) ? ` ${PairSentence.render(view, best, nouns)}` : "";
      return this.#card(view, id, `Without it, <b>${Text.plural(m.cutOff.length, nouns.one, nouns.many)}</b> lose every connection.${extra}`);
    });
    const bridgeCards = view.rareBridges.map((id) => {
      const rare = view.rarePairs(id);
      const shown = rare.slice(0, 2).map((p) => PairSentence.render(view, p, nouns));
      const more = rare.length > 2 ? ` <span class="muted">+${rare.length - 2} more</span>` : "";
      return this.#card(view, id, shown.join("<br>") + more);
    });
    return `
      ${critCards.length ? `<h3>Cut others off when removed</h3><ul class="cards">${critCards.join("")}</ul>` : ""}
      ${bridgeCards.length ? `<h3>Rare bridges between groups</h3><ul class="cards">${bridgeCards.join("")}</ul>` : ""}
      ${this.#hubNote(view)}`;
  }

  #card(view: AnalysisView, id: string, why: string): string {
    const org = this.network.get(id);
    const chips = view.groupsLinkedBy(id).map((g) => GroupChip.render(view.group(g), { clickable: false }));
    return `<li class="card" tabindex="0" data-node="${Text.escape(id)}">
      <div><span class="name">${Text.escape(org.label)}</span><span class="type">${Text.escape(this.network.schema.entityTypeLabel(org.type))}</span></div>
      <div class="why">${why}</div>
      <div class="chips">${chips.join("")}</div>
    </li>`;
  }

  #hubNote(view: AnalysisView): string {
    const hub = view.bestConnected;
    if (!hub || view.connectors.includes(hub)) return "";
    return `<p class="muted">Not listed: ${NodeLink.render(this.network, hub)} (${Text.plural(view.metric(hub).degree, "link")}), the groups it links stay connected without it.</p>`;
  }
}
