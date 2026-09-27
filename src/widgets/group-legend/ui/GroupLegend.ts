import { GroupChip, type AnalysisView } from "#entities/analysis";
import type { ExplorationSession } from "#entities/session";
import { GroupSelector } from "#features/select-group";
import { Text } from "#shared/lib";
import { Component } from "#shared/ui";
import "./group-legend.css";

export interface GroupLegendDeps {
  session: ExplorationSession<AnalysisView>;
}

export class GroupLegend extends Component {
  readonly #session: ExplorationSession<AnalysisView>;
  readonly #groups: GroupSelector;
  #list?: HTMLElement;

  constructor(root: HTMLElement, { session }: GroupLegendDeps) {
    super(root);
    this.#session = session;
    this.#groups = new GroupSelector(session);
  }

  override mount(): this {
    this.root.classList.add("group-legend");
    this.root.innerHTML = `
      <h2>Groups</h2>
      <ul class="group-legend__list"></ul>`;
    this.#list = this.query(".group-legend__list");
    this.listen(
      "click",
      (e) => {
        const b = (e.target as Element).closest<HTMLElement>("[data-legend]");
        if (b) this.#groups.toggle(Number(b.dataset.legend));
      },
      this.#list,
    );
    this.watch<unknown>([this.#session.viewIndex, this.#session.selectedGroup]);
    return super.mount();
  }

  override render(): void {
    if (!this.#list) return;
    const selected = this.#session.selectedGroup.value;
    this.#list.innerHTML = this.#session.view.groups
      .map(
        (g) => `
        <li><button type="button" data-legend="${g.id}" aria-pressed="${selected === g.id}">
          ${GroupChip.dot(g)}
          <span><b>${Text.escape(g.name)}</b>${g.profile ? ` <span class="profile">· ${Text.escape(g.profile)}</span>` : ""}</span>
          <span class="size">${g.size}</span>
        </button></li>`,
      )
      .join("");
  }
}
