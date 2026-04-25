import "server-only";
import { publicEnv } from "./public";
import { parseServerEnv, type ServerEnv } from "./server.schema";

export type { ServerEnv } from "./server.schema";

export const serverEnv: ServerEnv = parseServerEnv(process.env, publicEnv);
