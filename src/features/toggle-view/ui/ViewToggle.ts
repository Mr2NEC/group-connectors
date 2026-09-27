import type { ExplorableView, ExplorationSession } from "#entities/session";
import { Text } from "#shared/lib";
import { Component } from "#shared/ui";
import { ViewSwitcher } from "../model/ViewSwitcher";
import "./view-toggle.css";

export interface ToggleableView extends ExplorableView {
  readonly label: string;
}

export class ViewToggle extends Component {
  readonly #session: ExplorationSession<ToggleableView>;
  readonly #switcher: ViewSwitcher;
  #segmented?: HTMLElement;

  constructor(root: HTMLElement, session: ExplorationSession<ToggleableView>) {
    super(root);
    this.#session = session;
    this.#switcher = new ViewSwitcher(session);
  }

  override mount(): this {
    this.root.innerHTML = `<div class="segmented" role="radiogroup" aria-label="Which relationships count"></div>`;
    this.#segmented = this.query(".segmented");
    this.listen(
      "click",
      (e) => {
        const b = (e.target as Element).closest<HTMLElement>("[data-view]");
        if (b) this.#switcher.switchTo(Number(b.dataset.view));
      },
      this.#segmented,
    );
    this.watch([this.#session.viewIndex]);
    return super.mount();
  }

  override render(): void {
    if (!this.#segmented) return;
    const s = this.#session;
    this.#segmented.innerHTML = s.views
      .map((v, i) => `<button type="button" role="radio" aria-checked="${i === s.viewIndex.value}" data-view="${i}">${Text.escape(v.label)}</button>`)
      .join("");
  }
}
