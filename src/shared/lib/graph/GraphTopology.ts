import type { AbstractGraph } from "graphology-types";
import { connectedComponents } from "graphology-components";

export interface Position {
  x: number;
  y: number;
}

interface Frame {
  node: string;
  parent: string | null;
  neighbours: string[];
  i: number;
}

export class GraphTopology {
  static articulationPoints(graph: AbstractGraph): string[] {
    const disc = new Map<string, number>();
    const low = new Map<string, number>();
    const result = new Set<string>();
    const at = (m: Map<string, number>, n: string) => m.get(n) ?? 0;
    let time = 0;

    graph.forEachNode((root) => {
      if (disc.has(root)) return;
      disc.set(root, time);
      low.set(root, time++);
      let rootChildren = 0;
      const stack: Frame[] = [{ node: root, parent: null, neighbours: graph.neighbors(root), i: 0 }];

      for (let frame = stack.at(-1); frame; frame = stack.at(-1)) {
        const nb = frame.neighbours[frame.i];
        if (nb !== undefined) {
          frame.i++;
          if (!disc.has(nb)) {
            disc.set(nb, time);
            low.set(nb, time++);
            if (frame.node === root) rootChildren++;
            stack.push({ node: nb, parent: frame.node, neighbours: graph.neighbors(nb), i: 0 });
          } else if (nb !== frame.parent) {
            low.set(frame.node, Math.min(at(low, frame.node), at(disc, nb)));
          }
          continue;
        }
        stack.pop();
        const { node, parent } = frame;
        if (parent === null) continue;
        low.set(parent, Math.min(at(low, parent), at(low, node)));
        if (parent !== root && at(low, node) >= at(disc, parent)) result.add(parent);
      }
      if (rootChildren > 1) result.add(root);
    });
    return [...result];
  }

  static piecesWithout(graph: AbstractGraph, node: string): string[][] {
    const rest = graph.copy();
    rest.dropNode(node);
    const around = new Set(graph.neighbors(node));
    return connectedComponents(rest)
      .filter((c) => c.some((m) => around.has(m)))
      .sort((a, b) => b.length - a.length);
  }

  static countComponents(graph: AbstractGraph): number {
    return connectedComponents(graph).length;
  }
}
