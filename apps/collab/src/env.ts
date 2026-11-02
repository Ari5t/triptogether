import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  COLLAB_PORT: z.coerce.number().default(4200),
  COLLAB_JWT_SECRET: z.string().min(16),
  COLLAB_INTERNAL_SECRET: z.string().min(16),
});

export function loadEnv(source: NodeJS.ProcessEnv = process.env) {
  const rootEnv = resolve(process.cwd(), "../../.env");
  if (source === process.env && existsSync(rootEnv)) process.loadEnvFile(rootEnv);
  return schema.parse(source);
}
