import { Text } from "#shared/lib";
import type { Network } from "../model/Network";
import "./node-link.css";

export class NodeLink {
  static render(network: Network, id: string): string {
    return `<button class="link" data-node="${Text.escape(id)}">${Text.escape(network.labelOf(id))}</button>`;
  }
}
