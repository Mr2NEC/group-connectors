import { Text } from "#shared/lib";
import "./chip.css";

export interface ChipOptions {
  as?: "span" | "button";
  attrs?: Record<string, string | number | undefined | null>;
}

export class Chip {
  static render(content: string, { as = "span", attrs = {} }: ChipOptions = {}): string {
    const attrString = Object.entries(attrs)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => ` ${k}="${Text.escape(v)}"`)
      .join("");
    return `<${as} class="chip"${attrString}>${content}</${as}>`;
  }

  static dot(color: string): string {
    return `<span class="dot" style="background:${color}"></span>`;
  }
}
