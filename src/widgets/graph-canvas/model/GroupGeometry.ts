import type { AnalysisView, Group } from "#entities/analysis";
import type { NetworkGraph } from "#entities/network";
import { DEFAULT_LAYOUT } from "#shared/config";

export interface IslandShape {
  group: Group;
  x: number;
  y: number;
  radius: number;
}

export interface GroupBridge {
  from: IslandShape;
  to: IslandShape;
  count: number;
}

export interface GroupGeometry {
  islands: IslandShape[];
  bridges: GroupBridge[];
}

export function measureGroups(view: AnalysisView, graph: NetworkGraph): GroupGeometry {
  const margin = DEFAULT_LAYOUT.nodeSpacing * 0.8;
  const islands = view.groups.map((group): IslandShape => {
    const points = group.members.filter((id) => graph.hasNode(id)).map((id) => graph.getNodeAttributes(id));
    const n = Math.max(points.length, 1);
    const x = points.reduce((sum, p) => sum + p.x, 0) / n;
    const y = points.reduce((sum, p) => sum + p.y, 0) / n;
    const radius = Math.max(...points.map((p) => Math.hypot(p.x - x, p.y - y)), 0) + margin;
    return { group, x, y, radius };
  });
  const bridges = view.groupLinks.flatMap(([a, b, count]): GroupBridge[] => {
    const from = islands[a];
    const to = islands[b];
    return from && to ? [{ from, to, count }] : [];
  });
  return { islands, bridges };
}
