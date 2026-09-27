export const GraphTheme = {
  groupPalette: ["#4e79a7", "#f28e2b", "#59a14f", "#e15759", "#b07aa1", "#76b7b2", "#edc948", "#ff9da7", "#9c755f"],
  groupFallback: "#a0a4a8",
  isolatedGroup: "#9aa0a6",
  dimNode: "#e4e4e0",
  edge: "#d5d5d0",
  edgeCross: "#b9b9b3",
  edgeDim: "#efefec",
  edgeHighlight: "#5b6168",
  label: "#2b2f33",
  muted: "#6a737d",
  halo: "#f7f7f5",
  font: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
} as const;

export const RARE_BRIDGE_MAX = 3;

export const ISOLATED_GROUP_NAME = "Without links";

export const ANALYSIS_DEFAULTS = {
  community_seed: 42,
  community_resolution: 1.0,
  top_connectors: 12,
  min_cut_off: 2,
} as const;

export const ALL_RELATIONSHIPS_VIEW = { id: "all", label: "All relationships", exclude_types: [] as string[] };

export interface LayoutSettings {
  seed: number;
  islandIterations: number;
  metaIterations: number;
  nodeSpacing: number;
  islandGap: number;
  packingSteps: number;
}

export const DEFAULT_LAYOUT: Readonly<LayoutSettings> = {
  seed: 7,
  islandIterations: 400,
  metaIterations: 500,
  nodeSpacing: 1,
  islandGap: 3,
  packingSteps: 400,
};
