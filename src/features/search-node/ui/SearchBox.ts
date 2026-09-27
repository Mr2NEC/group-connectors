import type { Network } from "#entities/network";
import { Text } from "#shared/lib";
import { Component } from "#shared/ui";
import "./search-box.css";

export interface SearchBoxOptions {
  onPick: (id: string) => void;
}

export class SearchBox extends Component {
  constructor(
    root: HTMLElement,
    private readonly network: Network,
    private readonly options: SearchBoxOptions,
  ) {
    super(root);
  }

  override mount(): this {
    const options = this.network.organisations.map((o) => `<option value="${Text.escape(o.label)}">`).join("");
    this.root.innerHTML = `
      <input class="search-box" type="search" list="search-box-options" placeholder="Search…" autocomplete="off">
      <datalist id="search-box-options">${options}</datalist>`;
    const input = this.query<HTMLInputElement>("input");
    this.listen(
      "change",
      () => {
        const hit = this.network.find(input.value);
        if (hit) this.options.onPick(hit.id);
        input.value = "";
      },
      input,
    );
    return super.mount();
  }
}
