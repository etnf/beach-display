import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Bindings } from "./lib/types";

const app = new Hono<{ Bindings: Bindings }>();

app.use("*", cors());

// Manually entered match from display_config.manualState (emergency mode).
// The admin app sanitizes these on write; parsing stays defensive anyway.
type ManualMatch = {
  id: string;
  courtName: string;
  group: string;
  teamA: string;
  teamB: string;
  status: "current" | "upcoming";
  startedAt: string | null;
};

// Parse the stored manual state, tolerating any corruption
function parseManualState(raw: unknown): ManualMatch[] {
  if (typeof raw !== "string" || !raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

app.get("/data", async (c) => {
  const DB = c.env.DB;

  // Phase 1: the display config alone. In emergency (manual) mode the rest
  // of the tournament data may be broken — a batched query that touches the
  // match tables could fail as a whole, so the config must be readable on
  // its own before anything else is queried.
  const config = (await DB.prepare(
    "SELECT * FROM display_config WHERE enabled = 1 LIMIT 1"
  ).first()) as Record<string, unknown> | null;

  if (!config) {
    return c.json(null);
  }

  // Manual (emergency) mode: serve the manually entered matches in the exact
  // same response shape as live data. The viewer must never be able to tell
  // which mode produced the payload, so nothing else differs — not even the
  // cache header. Only display_config (and, best-effort, the tournament
  // stage) is read; the match tables are never touched here.
  if (config.manualMode === 1) {
    let stage = "groups";
    try {
      const t = (await DB.prepare("SELECT stage FROM tournaments WHERE id = ?")
        .bind(config.tournamentId)
        .first()) as { stage: string } | null;
      if (t?.stage) stage = t.stage;
    } catch {
      // tournament row unreadable — keep the fallback stage
    }

    const manual = parseManualState(config.manualState);
    c.header("Cache-Control", "public, max-age=5");
    return c.json({
      display_name: config.displayName,
      display_message: config.message || null,
      stage,
      courts: manual
        .filter((m) => m.status === "current")
        .map((m) => ({
          name: m.courtName || "Kurt",
          match: {
            group: m.group || null,
            teamA: m.teamA || null,
            teamB: m.teamB || null,
            startTime: m.startedAt || null,
          },
        })),
      upcoming_matches: manual
        .filter((m) => m.status === "upcoming")
        .map((m) => ({
          group: m.group || null,
          teamA: m.teamA || null,
          teamB: m.teamB || null,
        })),
    });
  }

  // Phase 2 (regular mode): live tournament data in one batched round trip
  const tid = config.tournamentId as string;
  const [tournamentRes, courtsRes, matchesRes, teamsRes, groupsRes] =
    await DB.batch([
      DB.prepare("SELECT * FROM tournaments WHERE id = ?").bind(tid),
      DB.prepare("SELECT * FROM courts WHERE tournamentId = ?").bind(tid),
      DB.prepare(
        "SELECT * FROM matches WHERE tournamentId = ? AND status != 'completed'"
      ).bind(tid),
      DB.prepare("SELECT id, name FROM teams WHERE tournamentId = ?").bind(tid),
      DB.prepare("SELECT id, name FROM groups WHERE tournamentId = ?").bind(tid),
    ]);

  const tournament = tournamentRes.results[0] as
    | Record<string, unknown>
    | undefined;
  if (!tournament) {
    return c.json(null);
  }

  const courtList = courtsRes.results as Record<string, unknown>[];
  const allMatches = matchesRes.results as Record<string, unknown>[];
  const teamMap = new Map(
    (teamsRes.results as { id: string; name: string }[]).map((t) => [
      t.id,
      t.name,
    ])
  );
  const groupMap = new Map(
    (groupsRes.results as { id: string; name: string }[]).map((g) => [
      g.id,
      g.name,
    ])
  );

  // Split matches by status
  const activeMatches = allMatches.filter((m) => m.status === "in_progress");
  const scheduledMatches = allMatches.filter(
    (m) => m.status === "scheduled" && m.teamAId && m.teamBId
  );

  // Filter out matches where either team is currently busy
  const busyTeamIds = new Set<string>();
  for (const m of activeMatches) {
    if (m.teamAId) busyTeamIds.add(m.teamAId as string);
    if (m.teamBId) busyTeamIds.add(m.teamBId as string);
  }

  const upcoming = scheduledMatches
    .filter(
      (m) =>
        !busyTeamIds.has(m.teamAId as string) &&
        !busyTeamIds.has(m.teamBId as string)
    )
    .sort((a, b) => {
      if (a.stage === "group" && b.stage === "group") {
        return ((a.queuePosition as number) ?? 0) - ((b.queuePosition as number) ?? 0);
      }
      if (a.stage === "bracket" && b.stage === "bracket") {
        const roundDiff =
          ((a.bracketRound as number) ?? 0) - ((b.bracketRound as number) ?? 0);
        if (roundDiff !== 0) return roundDiff;
        return ((a.bracketPosition as number) ?? 0) - ((b.bracketPosition as number) ?? 0);
      }
      return a.stage === "group" ? -1 : 1;
    })
    .slice(0, 10);

  // Build court match map
  const courtMatchMap = new Map<string, Record<string, unknown>>();
  for (const m of activeMatches) {
    if (m.courtId) courtMatchMap.set(m.courtId as string, m);
  }

  // Assemble response
  c.header("Cache-Control", "public, max-age=5");
  return c.json({
    display_name: config.displayName,
    display_message: config.message || null,
    stage: tournament.stage,
    courts: courtList.map((court) => {
      const match = courtMatchMap.get(court.id as string);
      return {
        name: court.name,
        match: match
          ? {
              group: match.groupId
                ? groupMap.get(match.groupId as string) ?? null
                : null,
              teamA: match.teamAId
                ? teamMap.get(match.teamAId as string) ?? null
                : null,
              teamB: match.teamBId
                ? teamMap.get(match.teamBId as string) ?? null
                : null,
              startTime: match.startedAt,
            }
          : null,
      };
    }),
    upcoming_matches: upcoming.map((m) => ({
      group: m.groupId ? groupMap.get(m.groupId as string) ?? null : null,
      teamA: m.teamAId ? teamMap.get(m.teamAId as string) ?? null : null,
      teamB: m.teamBId ? teamMap.get(m.teamBId as string) ?? null : null,
    })),
  });
});

export default app;
