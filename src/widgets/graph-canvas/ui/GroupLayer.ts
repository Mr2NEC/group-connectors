import type Sigma from "sigma";
import type { NetworkEdgeAttributes, NetworkNodeAttributes } from "#entities/network";
import { GraphTheme } from "#shared/config";
import type { GroupGeometry, IslandShape } from "../model/GroupGeometry";

type Renderer = Sigma<NetworkNodeAttributes, NetworkEdgeAttributes>;

function blend(color: string, background: string, amount: number): string {
  const rgb = (hex: string) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
  const [c, b] = [rgb(color), rgb(background)];
  return `rgb(${c.map((v, i) => Math.round((b[i] ?? 0) + (v - (b[i] ?? 0)) * amount)).join(",")})`;
}

interface Circle {
  x: number;
  y: number;
  r: number;
}

function labelSpot(a: Circle, b: Circle, circles: Circle[]): { x: number; y: number } | null {
  const clearance = 8;
  const candidates = Array.from({ length: 41 }, (_, i) => i / 40)
    .map((t) => ({ t, x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }))
    .filter((p) => circles.every((c) => Math.hypot(p.x - c.x, p.y - c.y) > c.r + clearance));
  const middle = (a.r + (Math.hypot(b.x - a.x, b.y - a.y) - a.r - b.r) / 2) / (Math.hypot(b.x - a.x, b.y - a.y) || 1);
  candidates.sort((p, q) => Math.abs(p.t - middle) - Math.abs(q.t - middle));
  return candidates[0] ?? null;
}

export class GroupLayer {
  readonly #canvas: HTMLCanvasElement;
  readonly #ctx: CanvasRenderingContext2D;

  constructor(private readonly renderer: Renderer) {
    this.#canvas = renderer.createCanvas("groups", { beforeLayer: "edges" });
    const ctx = this.#canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D is not available");
    this.#ctx = ctx;
  }

  draw(geometry: GroupGeometry, overview: boolean): void {
    const ctx = this.#ctx;
    const { width, height } = this.renderer.getDimensions();
    const ratio = window.devicePixelRatio || 1;
    if (this.#canvas.width !== Math.round(width * ratio) || this.#canvas.height !== Math.round(height * ratio)) {
      this.#canvas.width = Math.round(width * ratio);
      this.#canvas.height = Math.round(height * ratio);
    }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const circles = new Map(geometry.islands.map((island) => [island, this.#toViewport(island)]));
    const midpoints: [number, number, number][] = [];
    if (overview) {
      for (const bridge of geometry.bridges) {
        const a = circles.get(bridge.from);
        const b = circles.get(bridge.to);
        if (!a || !b) continue;
        this.#drawBridge(a, b, bridge.count);
        const spot = labelSpot(a, b, [...circles.values()]);
        if (spot) midpoints.push([spot.x, spot.y, bridge.count]);
      }
    }
    for (const [island, c] of circles) this.#drawIsland(island, c, overview);
    if (!overview) return;
    for (const [x, y, count] of midpoints) this.#text(String(count), x, y, "600 11px", GraphTheme.muted);
    for (const [island, c] of circles) this.#drawName(island, c);
  }

  #toViewport(island: IslandShape): Circle {
    const centre = this.renderer.graphToViewport({ x: island.x, y: island.y });
    const edge = this.renderer.graphToViewport({ x: island.x + island.radius, y: island.y });
    return { x: centre.x, y: centre.y, r: Math.hypot(edge.x - centre.x, edge.y - centre.y) };
  }

  #drawIsland(island: IslandShape, c: Circle, overview: boolean): void {
    const ctx = this.#ctx;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, 2 * Math.PI);
    ctx.fillStyle = blend(island.group.color, GraphTheme.halo, overview ? 0.1 : 0.05);
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = `${island.group.color}${overview ? "55" : "22"}`;
    ctx.stroke();
  }

  #drawBridge(a: Circle, b: Circle, count: number): void {
    const ctx = this.#ctx;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineCap = "round";
    ctx.lineWidth = Math.min(1 + Math.sqrt(count) * 1.3, 9);
    ctx.strokeStyle = GraphTheme.edgeCross;
    ctx.stroke();
  }

  #drawName(island: IslandShape, c: Circle): void {
    this.#text(island.group.name, c.x, c.y - c.r - 8, "600 12px", GraphTheme.label);
  }

  #text(value: string, x: number, y: number, font: string, color: string): void {
    const ctx = this.#ctx;
    ctx.font = `${font} ${GraphTheme.font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = 4;
    ctx.strokeStyle = GraphTheme.halo;
    ctx.strokeText(value, x, y);
    ctx.fillStyle = color;
    ctx.fillText(value, x, y);
  }
}
