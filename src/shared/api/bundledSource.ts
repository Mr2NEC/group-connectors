import schema from "../../../schema.json";
import type { DataSource, RawSchema } from "./types";

const files = import.meta.glob<string>("/data/*.csv", { query: "?raw", import: "default", eager: true });

export const bundledSource: DataSource = {
  schema: schema as RawSchema,
  read(path) {
    const text = files[`/${path}`];
    if (text === undefined) throw new Error(`Data file is not bundled: ${path} (expected under /data)`);
    return text;
  },
};
