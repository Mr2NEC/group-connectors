import type { AnalysisView } from "#entities/analysis";
import type { Network } from "#entities/network";
import type { ExplorationSession } from "#entities/session";
import { NodeFocus } from "#features/focus-node";
import { GroupSelector } from "#features/select-group";
import { Component } from "#shared/ui";
import { AnswerSection } from "./AnswerSection";
import { NodeDetailsSection } from "./NodeDetailsSection";
import "./insight-panel.css";

export interface InsightPanelDeps {
  network: Network;
  session: ExplorationSession<AnalysisView>;
}

export class InsightPanel extends Component {
  readonly #session: ExplorationSession<AnalysisView>;
  readonly #focus: NodeFocus;
  readonly #groups: GroupSelector;
  readonly #answer: AnswerSection;
  readonly #details: NodeDetailsSection;

  constructor(root: HTMLElement, { network, session }: InsightPanelDeps) {
    super(root);
    this.#session = session;
    this.#focus = new NodeFocus(session);
    this.#groups = new GroupSelector(session);
    this.#answer = new AnswerSection(network);
    this.#details = new NodeDetailsSection(network);
  }

  override mount(): this {
    const s = this.#session;
    this.root.classList.add("insight-panel");
    this.root.setAttribute("aria-live", "polite");

    this.listen("click", (e) => this.#onClick(e));
    this.listen("keydown", (e) => {
      const card = (e.target as Element).closest<HTMLElement>(".card");
      if (card?.dataset.node && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        this.#focus.focus(card.dataset.node);
      }
    });
    this.listen("mouseover", (e) => s.hoveredNode.set((e.target as Element).closest<HTMLElement>(".card")?.dataset.node ?? null));
    this.listen("mouseleave", () => s.hoveredNode.set(null));

    this.watch<unknown>([s.viewIndex, s.focusedNode, s.answerMode]);
    return super.mount();
  }

  override render(): void {
    const s = this.#session;
    const focus = s.focusedNode.value;
    if (focus) this.root.innerHTML = this.#details.render(s.view, focus);
    else if (s.answerMode.value) this.root.innerHTML = this.#answer.render(s.view);
    else this.root.innerHTML = "";
    this.root.hidden = this.root.innerHTML === "";
  }

  #onClick(e: MouseEvent): void {
    const t = (e.target as Element).closest<HTMLElement>("[data-node], [data-group], [data-action]");
    if (!t) return;
    const { action, node, group } = t.dataset;
    if (action === "back") this.#focus.clear();
    else if (node) this.#focus.focus(node);
    else if (group !== undefined) this.#groups.select(Number(group));
  }
}
