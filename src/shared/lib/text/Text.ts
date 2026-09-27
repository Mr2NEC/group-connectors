const ENTITIES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export class Text {
  static escape(s: unknown): string {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ENTITIES[c] ?? c);
  }

  static plural(n: number, one: string, many = `${one}s`): string {
    return `${n} ${n === 1 ? one : many}`;
  }

  static humanize(key: string): string {
    return key.replace(/[_-]+/g, " ").trim();
  }

  static capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}
