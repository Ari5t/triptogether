import { readFileSync } from "node:fs";

const keys = (o, p = "") => Object.entries(o).flatMap(([k, v]) => (typeof v === "object" ? keys(v, `${p}${k}.`) : [`${p}${k}`]));
const load = (l) => new Set(keys(JSON.parse(readFileSync(`apps/web/messages/${l}.json`, "utf8"))));
const uk = load("uk");
const en = load("en");
const missing = [...uk].filter((k) => !en.has(k)).map((k) => `en: ${k}`).concat([...en].filter((k) => !uk.has(k)).map((k) => `uk: ${k}`));
if (missing.length) {
  console.error("Missing i18n keys:\n" + missing.join("\n"));
  process.exit(1);
}
