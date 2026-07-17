import { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "../db/schema";

export type Bindings = {
  DB: D1Database;
};

export type Database = DrizzleD1Database<typeof schema>;

export type Env = { Bindings: Bindings; Variables: { db: Database } };