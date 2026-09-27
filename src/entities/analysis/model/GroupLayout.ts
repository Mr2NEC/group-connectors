import { UndirectedGraph } from "graphology";
import forceAtlas2 from "graphology-layout-forceatlas2";
import { DEFAULT_LAYOUT, type LayoutSettings } from "#shared/config";
import { SeededRandom, type Position } from "#shared/lib";
import type { AnalysisView } from "./AnalysisView";
import type { Group } from "./Group";

type LayoutGraph = UndirectedGraph<Position, { weight: number }>;

interface Island {
  group: Group;
  offsets: Map<string, Position>;
  radius: number;
}

interface Body {
  x: number;
  y: number;
  radius: number;
}

export class GroupLayout {
  readonly #rng: SeededRandom;

  constructor(private readonly settings: Readonly<LayoutSettings> = DEFAULT_LAYOUT) {
    this.#rng = new SeededRandom(settings.seed);
  }

  compute(view: AnalysisView): Record<string, Position> {
    const islands = view.groups.map((group) => this.#island(view, group));
    const centers = this.#placeIslands(view, islands);
    const positions: Record<string, Position> = {};
    islands.forEach((island, i) => {
      const c = centers[i] ?? { x: 0, y: 0 };
      for (const [id, p] of island.offsets) positions[id] = { x: c.x + p.x, y: c.y + p.y };
    });
    return positions;
  }

  #island(view: AnalysisView, group: Group): Island {
    const s = this.settings;
    const g: LayoutGraph = new UndirectedGraph();
    for (const id of group.members) g.addNode(id, this.#randomPoint(10));
    for (const id of group.members) {
      if (!view.graph.hasNode(id)) continue;
      view.graph.forEachEdge(id, (_e, attrs, a, b) => {
        if (g.hasNode(a) && g.hasNode(b) && !g.hasEdge(a, b)) g.addEdge(a, b, { weight: attrs.weight });
      });
    }

    const raw =
      g.order > 1
        ? forceAtlas2(g, {
            iterations: s.islandIterations,
            getEdgeWeight: "weight",
            settings: { gravity: 1, scalingRatio: 2, strongGravityMode: true, linLogMode: true },
          })
        : Object.fromEntries(g.mapNodes((id) => [id, { x: 0, y: 0 }]));

    const size = (id: string) => (1 + Math.sqrt(view.metric(id).degree) / 4) * s.nodeSpacing;
    const bodies = new Map(group.members.map((id) => [id, { ...(raw[id] ?? { x: 0, y: 0 }), radius: size(id) / 2 }]));
    const list = [...bodies.values()];
    this.#normaliseSpacing(list);
    const area = list.reduce((sum, b) => sum + (2 * b.radius) ** 2, 0);
    const limit = Math.sqrt(area / Math.PI) * 1.25;
    for (let round = 0; round < 30; round++) {
      this.#centre(list);
      for (const b of list) {
        const d = Math.hypot(b.x, b.y);
        if (d > limit) {
          b.x *= limit / d;
          b.y *= limit / d;
        }
      }
      this.#separate(list, 0, 10);
    }
    this.#centre(list);

    const offsets = new Map<string, Position>();
    let radius = s.nodeSpacing;
    for (const [id, b] of bodies) {
      offsets.set(id, { x: b.x, y: b.y });
      radius = Math.max(radius, Math.hypot(b.x, b.y) + b.radius);
    }
    return { group, offsets, radius };
  }

  #placeIslands(view: AnalysisView, islands: Island[]): Position[] {
    const s = this.settings;
    const gap = s.islandGap * s.nodeSpacing;
    const connected = islands.filter((island) => !island.group.isolated);
    const bodies = new Map<Island, Body>(this.#packConnected(view, connected).map((b, i) => [connected[i] as Island, b]));

    const all = [...bodies.values()];
    let right = Math.max(0, ...all.map((b) => b.x + b.radius));
    const floor = Math.min(0, ...all.map((b) => b.y - b.radius));
    for (const island of islands.filter((i) => i.group.isolated)) {
      const body = { x: right + gap + island.radius, y: floor + island.radius, radius: island.radius };
      bodies.set(island, body);
      right = body.x + body.radius;
    }

    const placed = islands.map((island) => bodies.get(island) ?? { x: 0, y: 0, radius: 0 });
    this.#centre(placed);
    return placed.map(({ x, y }) => ({ x, y }));
  }

  #packConnected(view: AnalysisView, islands: Island[]): Body[] {
    const s = this.settings;
    const index = new Map(islands.map((island, i) => [island.group.id, i]));
    const meta: LayoutGraph = new UndirectedGraph();
    islands.forEach((_, i) => meta.addNode(String(i), this.#randomPoint(10)));
    for (const [a, b, count] of view.groupLinks) {
      const [ia, ib] = [index.get(a), index.get(b)];
      if (ia !== undefined && ib !== undefined) meta.addEdge(String(ia), String(ib), { weight: count });
    }

    const raw =
      meta.order > 1
        ? forceAtlas2(meta, {
            iterations: s.metaIterations,
            getEdgeWeight: "weight",
            settings: { gravity: 1, scalingRatio: 10, edgeWeightInfluence: 0.5 },
          })
        : { "0": { x: 0, y: 0 } };

    const bodies: Body[] = islands.map((island, i) => ({ ...(raw[String(i)] ?? { x: 0, y: 0 }), radius: island.radius }));
    this.#centre(bodies);
    const meanGap = bodies.reduce((sum, b) => sum + b.radius, 0) / Math.max(bodies.length, 1);
    const spread = Math.max(...bodies.map((b) => Math.hypot(b.x, b.y)), 1e-6);
    for (const b of bodies) {
      b.x *= (meanGap * bodies.length) / spread;
      b.y *= (meanGap * bodies.length) / spread;
    }

    const gap = s.islandGap * s.nodeSpacing;
    for (let step = 0; step < s.packingSteps; step++) {
      for (const b of bodies) {
        b.x *= 0.98;
        b.y *= 0.98;
      }
      this.#separate(bodies, gap, 8);
    }
    return bodies;
  }

  #randomPoint(extent: number): Position {
    return { x: (this.#rng.next() - 0.5) * extent, y: (this.#rng.next() - 0.5) * extent };
  }

  #normaliseSpacing(bodies: Body[]): void {
    if (bodies.length < 2) return;
    const nearest = bodies.map((a) => Math.min(...bodies.filter((b) => b !== a).map((b) => Math.hypot(a.x - b.x, a.y - b.y))));
    nearest.sort((a, b) => a - b);
    const median = nearest[Math.floor(nearest.length / 2)] ?? 1;
    const scale = median > 1e-9 ? this.settings.nodeSpacing / median : 1;
    for (const b of bodies) {
      b.x *= scale;
      b.y *= scale;
    }
  }

  #separate(bodies: Body[], gap: number, passes: number): void {
    for (let pass = 0; pass < passes; pass++) {
      let moved = false;
      for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
          const a = bodies[i] as Body;
          const b = bodies[j] as Body;
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let dist = Math.hypot(dx, dy);
          const min = a.radius + b.radius + gap;
          if (dist >= min) continue;
          if (dist < 1e-9) {
            const angle = this.#rng.next() * 2 * Math.PI;
            [dx, dy, dist] = [Math.cos(angle), Math.sin(angle), 1];
          }
          const push = (min - dist) / 2;
          a.x -= (dx / dist) * push;
          a.y -= (dy / dist) * push;
          b.x += (dx / dist) * push;
          b.y += (dy / dist) * push;
          moved = true;
        }
      }
      if (!moved) return;
    }
  }

  #centre(bodies: Body[]): void {
    if (!bodies.length) return;
    const cx = bodies.reduce((sum, b) => sum + b.x, 0) / bodies.length;
    const cy = bodies.reduce((sum, b) => sum + b.y, 0) / bodies.length;
    for (const b of bodies) {
      b.x -= cx;
      b.y -= cy;
    }
  }
}
