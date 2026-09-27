import { Signal, Store } from "#shared/lib";

export type CameraRequest = "fit" | "reset";

export interface ExplorableView {
  has(id: string): boolean;
}

export class ExplorationSession<V extends ExplorableView = ExplorableView> {
  readonly viewIndex = new Store(0);
  readonly focusedNode = new Store<string | null>(null);
  readonly hoveredNode = new Store<string | null>(null);
  readonly selectedGroup = new Store<number | null>(null);
  readonly answerMode = new Store(false);
  readonly cameraRequests = new Signal<CameraRequest>();

  constructor(readonly views: readonly V[]) {
    if (!views.length) throw new Error("A session needs at least one view");
  }

  get view(): V {
    return this.viewAt(this.viewIndex.value);
  }

  viewAt(index: number): V {
    const v = this.views[index];
    if (!v) throw new Error(`No view #${index}`);
    return v;
  }

  requestCamera(kind: CameraRequest): void {
    this.cameraRequests.emit(kind);
  }

  reset(): void {
    this.answerMode.set(false);
    this.focusedNode.set(null);
    this.selectedGroup.set(null);
    this.requestCamera("reset");
  }
}
