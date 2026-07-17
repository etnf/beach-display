import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const tournaments = sqliteTable("tournaments", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  stage: text("stage").notNull().default("setup"),
  totalSets: integer("totalSets").notNull().default(1),
  scoreInSet: integer("scoreInSet").notNull().default(15),
  pointsWin: integer("pointsWin").notNull().default(2),
  pointsTie: integer("pointsTie").notNull().default(1),
  pointsLoss: integer("pointsLoss").notNull().default(0),
  createdAt: text("createdAt").notNull(),
});

export const groups = sqliteTable("groups", {
  id: text("id").primaryKey(),
  tournamentId: text("tournamentId")
    .notNull()
    .references(() => tournaments.id),
  name: text("name").notNull(),
});

export const teams = sqliteTable("teams", {
  id: text("id").primaryKey(),
  tournamentId: text("tournamentId")
    .notNull()
    .references(() => tournaments.id),
  name: text("name").notNull(),
  groupId: text("groupId").references(() => groups.id),
  createdAt: text("createdAt").notNull(),
});

export const courts = sqliteTable("courts", {
  id: text("id").primaryKey(),
  tournamentId: text("tournamentId")
    .notNull()
    .references(() => tournaments.id),
  name: text("name").notNull(),
});

export const matches = sqliteTable("matches", {
  id: text("id").primaryKey(),
  tournamentId: text("tournamentId")
    .notNull()
    .references(() => tournaments.id),
  stage: text("stage").notNull(),
  groupId: text("groupId").references(() => groups.id),
  queuePosition: integer("queuePosition"),
  bracketRound: integer("bracketRound"),
  bracketPosition: integer("bracketPosition"),
  teamAId: text("teamAId").references(() => teams.id),
  teamBId: text("teamBId").references(() => teams.id),
  courtId: text("courtId").references(() => courts.id),
  status: text("status").notNull().default("scheduled"),
  winnerId: text("winnerId").references(() => teams.id),
  startedAt: text("startedAt"),
  completedAt: text("completedAt"),
});

export const display_config = sqliteTable("display_config", {
  id: text("id").primaryKey(),
  tournamentId: text("tournamentId")
    .notNull()
    .references(() => tournaments.id)
    .unique(),
  enabled: integer("enabled").notNull().default(0),
  displayName: text("displayName").notNull(),
  message: text("message"),
  updatedAt: text("updatedAt").notNull(),
  // Emergency "dummy mode": when 1, /data serves the manually entered
  // matches from manualState instead of the matches table
  manualMode: integer("manualMode").notNull().default(0),
  manualState: text("manualState"),
});

export const sessions = sqliteTable("sessions", {
  token: text("token").primaryKey(),
  createdAt: text("createdAt").notNull(),
  expiresAt: text("expiresAt").notNull(),
});

export const sets = sqliteTable("sets", {
  id: text("id").primaryKey(),
  matchId: text("matchId")
    .notNull()
    .references(() => matches.id),
  setNumber: integer("setNumber").notNull(),
  teamAScore: integer("teamAScore").notNull(),
  teamBScore: integer("teamBScore").notNull(),
});