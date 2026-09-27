import type { AnalysisView } from "#entities/analysis";
import type { Network } from "#entities/network";
import type { ExplorationSession } from "#entities/session";
import { Store, Text } from "#shared/lib";
import { Component } from "#shared/ui";
import "./data-notes.css";

export interface DataNotesDeps {
  network: Network;
  session: ExplorationSession<AnalysisView>;
}

export class DataNotes extends Component {
  readonly #network: Network;
  readonly #session: ExplorationSession<AnalysisView>;
  readonly #openIssue = new Store<string | null>(null);

  constructor(root: HTMLElement, { network, session }: DataNotesDeps) {
    super(root);
    this.#network = network;
    this.#session = session;
  }

  override mount(): this {
    this.root.classList.add("data-notes");
    this.listen("click", (e) => {
      const b = (e.target as Element).closest<HTMLElement>("[data-issue]");
      if (!b?.dataset.issue) return;
      this.#openIssue.set(this.#openIssue.value === b.dataset.issue ? null : b.dataset.issue);
    });
    this.watch<unknown>([this.#session.viewIndex, this.#openIssue]);
    return super.mount();
  }

  override render(): void {
    const net = this.#network;
    const unlinked = net.unlinked;
    const isolatedHere = this.#session.view.isolated.length;
    const summary = [
      Text.plural(net.organisations.length, net.schema.nouns.one, net.schema.nouns.many),
      isolatedHere > unlinked.length
        ? `${isolatedHere} without links in this view (${unlinked.length} in all data)`
        : `${unlinked.length} without links`,
    ].join(" · ");

    const open = this.#openIssue.value;
    const toggles = [...net.issues].map(
      ([kind, items]) =>
        `<button type="button" class="data-notes__toggle" data-issue="${Text.escape(kind)}" aria-expanded="${open === kind}">${Text.escape(Text.plural(items.length, kind))}</button>`,
    );
    const items = open ? (net.issues.get(open) ?? []) : [];
    const list = items.length ? `<ul class="data-notes__list">${items.map((i) => `<li>${Text.escape(i)}</li>`).join("")}</ul>` : "";

    this.root.innerHTML = `${Text.escape(summary)}${toggles.length ? `<br>Dropped: ${toggles.join(", ")}` : ""}${list}`;
  }
}
