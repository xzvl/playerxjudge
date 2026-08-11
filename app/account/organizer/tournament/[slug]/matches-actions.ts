"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { computeGroupStandings, generateInitialPairings, generateNextRoundPairings } from "@/lib/swiss";
import { buildPlacementSections, buildRound1Pairings, qualifiedSlots } from "@/lib/final-stage-placeholder";
import { logTournamentEvent } from "@/app/account/organizer/tournament/[slug]/workspace-panels-actions";
import type { Bracket, Match, TournamentGroup, TournamentParticipant } from "@/lib/types/database";
import type { RoleActionState } from "@/lib/validations/roles";
import type { TieBreakMetric } from "@/lib/validations/tournament-wizard";

function groupStagePath(slug: string) {
  return `/account/organizer/tournament/${slug}`;
}

function finalStagePath(slug: string) {
  return `/account/organizer/tournament/${slug}/final-stage`;
}

// Called alongside the status→"ongoing" transition when "Start Group Stage"
// is clicked: seeds Round 1 for every group that doesn't have matches yet.
// Safe to call more than once — groups that already have matches are skipped.
export async function startGroupStageMatches(tournamentId: string, slug: string): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { data: groups, error: groupsError } = await supabase
    .from("tournament_groups")
    .select("id")
    .eq("tournament_id", tournamentId);
  if (groupsError) return { status: "error", message: groupsError.message };
  if (!groups || groups.length === 0) return { status: "success" };

  for (const group of groups) {
    const { data: existingMatches } = await supabase.from("matches").select("id").eq("group_id", group.id).limit(1);
    if (existingMatches && existingMatches.length > 0) continue;

    const { data: members } = await supabase
      .from("tournament_participants")
      .select("*")
      .eq("group_id", group.id)
      .order("seed");
    if (!members || members.length < 2) continue;

    const pairings = generateInitialPairings(members.map((m) => ({ id: m.id, seed: m.seed })));
    await supabase.from("matches").insert(
      pairings.map((p) => ({
        tournament_id: tournamentId,
        group_id: group.id,
        round: 1,
        match_number: p.matchNumber,
        participant_a_id: p.participantAId,
        participant_b_id: p.participantBId,
        winner_id: p.participantBId === null ? p.participantAId : null,
        status: p.participantBId === null ? "completed" : "scheduled",
        completed_at: p.participantBId === null ? new Date().toISOString() : null,
      }))
    );
  }

  await logTournamentEvent(tournamentId, "Organizer", "started the group stage");
  revalidatePath(groupStagePath(slug), "layout");
  return { status: "success" };
}

export async function generateNextRound(
  tournamentId: string,
  groupId: string,
  slug: string
): Promise<RoleActionState & { round?: number; matches?: Match[] }> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();

  const [{ data: tournament }, { data: members }, { data: allMatches }] = await Promise.all([
    supabase.from("tournaments").select("format_settings").eq("id", tournamentId).eq("organizer_id", user.id).maybeSingle(),
    supabase.from("tournament_participants").select("*").eq("group_id", groupId).order("seed"),
    supabase.from("matches").select("*").eq("group_id", groupId),
  ]);

  if (!tournament) return { status: "error", message: "Tournament not found." };
  if (!members || members.length < 2) return { status: "error", message: "This group needs at least 2 participants." };

  const matches = (allMatches as Match[] | null) ?? [];
  const currentRound = matches.reduce((max, m) => Math.max(max, m.round), 0);
  const currentRoundMatches = matches.filter((m) => m.round === currentRound);
  if (currentRoundMatches.length === 0) {
    return { status: "error", message: "Start the group stage first." };
  }
  if (currentRoundMatches.some((m) => m.status !== "completed")) {
    return { status: "error", message: "Every match in the current round needs a result first." };
  }

  const swissRounds = tournament.format_settings?.groupStage?.swissRounds ?? 5;
  if (currentRound >= swissRounds) {
    return { status: "error", message: `This group is already at its configured ${swissRounds} rounds.` };
  }

  const swissPoints = tournament.format_settings.groupStage.swissPoints;
  const groupTieBreaks = tournament.format_settings.groupTieBreaks;
  const tieBreakMetrics: [TieBreakMetric, TieBreakMetric, TieBreakMetric] = [
    groupTieBreaks.tieBreak1,
    groupTieBreaks.tieBreak2,
    groupTieBreaks.tieBreak3,
  ];
  const pairings = generateNextRoundPairings(members as TournamentParticipant[], matches, swissPoints, tieBreakMetrics);
  const nextRound = currentRound + 1;
  // Match numbers continue on from this group's previous rounds rather than
  // resetting to 1 each round (round 1's 22 matches are 1-22, so round 2
  // starts at 23, and so on) — same continuous-numbering fix already applied
  // to the final-stage bracket.
  const matchNumberOffset = matches.reduce((max, m) => Math.max(max, m.match_number), 0);

  const { data: inserted, error } = await supabase
    .from("matches")
    .insert(
      pairings.map((p) => ({
        tournament_id: tournamentId,
        group_id: groupId,
        round: nextRound,
        match_number: matchNumberOffset + p.matchNumber,
        participant_a_id: p.participantAId,
        participant_b_id: p.participantBId,
        winner_id: p.participantBId === null ? p.participantAId : null,
        status: p.participantBId === null ? "completed" : "scheduled",
        completed_at: p.participantBId === null ? new Date().toISOString() : null,
      }))
    )
    .select();

  if (error) return { status: "error", message: error.message };

  revalidatePath(groupStagePath(slug), "layout");
  return { status: "success", round: nextRound, matches: inserted as Match[] };
}

export async function startMatch(matchId: string, slug: string): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { error } = await supabase.from("matches").update({ status: "ongoing" }).eq("id", matchId);

  if (error) return { status: "error", message: error.message };
  revalidatePath(groupStagePath(slug), "layout");
  return { status: "success" };
}

export async function reportMatchResult(
  matchId: string,
  slug: string,
  scoreA: number,
  scoreB: number
): Promise<RoleActionState & { match?: Match; advancedMatches?: Match[]; advancedBrackets?: { key: string; id: string }[] }> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };
  if (!Number.isInteger(scoreA) || !Number.isInteger(scoreB) || scoreA < 0 || scoreB < 0) {
    return { status: "error", message: "Scores must be zero or a positive whole number." };
  }

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("matches")
    .select("participant_a_id, participant_b_id")
    .eq("id", matchId)
    .maybeSingle();
  if (fetchError) return { status: "error", message: fetchError.message };
  if (!existing) return { status: "error", message: "Match not found." };

  const winnerId = scoreA === scoreB ? null : scoreA > scoreB ? existing.participant_a_id : existing.participant_b_id;

  const { data, error } = await supabase
    .from("matches")
    .update({
      score: { a: scoreA, b: scoreB, inputBy: "organizer" },
      winner_id: winnerId,
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", matchId)
    .select()
    .single();

  if (error) return { status: "error", message: error.message };

  revalidatePath(groupStagePath(slug), "layout");

  const match = data as Match;
  if (match.group_id !== null) return { status: "success", match };

  // Final-stage match — automatically pair up the next round (and any
  // placement-bracket rounds that just became reachable) the moment this
  // was the last result a round needed, no manual "Generate Round" click.
  const advanced = await autoAdvanceFinalStage(match.tournament_id, slug);
  return { status: "success", match, advancedMatches: advanced.matches, advancedBrackets: advanced.brackets };
}

// Best-effort sweep run after every final-stage result: pairs up the main
// bracket's next round from the current one's winners, and does the same
// for every placement section (buildPlacementSections) whose feeder round
// just finished — creating that section's `brackets` row on its first
// round. Loops (bounded) since one round completing can itself complete
// another (all-bye rounds) or unlock more than one section at once.
// Swallows errors from individual generate calls (they just mean "not ready
// yet") rather than failing the result report itself.
async function autoAdvanceFinalStage(
  tournamentId: string,
  slug: string
): Promise<{ matches: Match[]; brackets: { key: string; id: string }[] }> {
  const insertedMatches: Match[] = [];
  const newBrackets: { key: string; id: string }[] = [];

  const supabase = await createClient();
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("format_settings")
    .eq("id", tournamentId)
    .maybeSingle();
  const settings = tournament?.format_settings;
  if (!settings || settings.stageType !== "two_stage" || settings.finalStageStarted !== true) {
    return { matches: insertedMatches, brackets: newBrackets };
  }
  if (settings.finalStage?.format !== "single_elimination") {
    return { matches: insertedMatches, brackets: newBrackets };
  }
  const throughPlace = settings.finalStage.breakTiesWithPlacementMatches ? settings.finalStage.breakTiesThroughPlace ?? 0 : 0;

  for (let guard = 0; guard < 20; guard++) {
    let progressed = false;

    const mainResult = await generateNextFinalRound(tournamentId, slug, null);
    if (mainResult.status === "success" && mainResult.matches?.length) {
      insertedMatches.push(...mainResult.matches);
      progressed = true;
    }

    if (throughPlace >= 3) {
      const { data: allMatches } = await supabase.from("matches").select("*").eq("tournament_id", tournamentId).is("group_id", null);
      const round1Count = ((allMatches as Match[] | null) ?? []).filter((m) => m.bracket_id === null && m.round === 1).length;

      if (round1Count > 0) {
        const mainTotalRounds = Math.log2(round1Count) + 1;
        const sections = buildPlacementSections(mainTotalRounds, throughPlace);
        const { data: allBrackets } = await supabase.from("brackets").select("*").eq("tournament_id", tournamentId);
        const bracketByKey = new Map(
          ((allBrackets as Bracket[] | null) ?? []).filter((b) => b.structure?.key).map((b) => [b.structure.key, b.id])
        );

        for (const section of sections) {
          // Round 1 is per-position too (see generatePlacementRound1) — a
          // section already underway can still gain more Round 1 matches as
          // the rest of its feeder round finishes, so this runs whether or
          // not the section's `brackets` row exists yet, not just once.
          const wasNew = !bracketByKey.has(section.key);
          if (wasNew && section.feederKey !== null && !bracketByKey.has(section.feederKey)) continue; // parent section not generated yet
          const feederBracketId = section.feederKey === null ? null : bracketByKey.get(section.feederKey) ?? null;

          const round1Result = await generatePlacementRound1(tournamentId, slug, section, feederBracketId);
          if (round1Result.status === "success" && round1Result.bracketId) {
            if (round1Result.matches?.length) {
              insertedMatches.push(...round1Result.matches);
              progressed = true;
            }
            if (wasNew) {
              newBrackets.push({ key: section.key, id: round1Result.bracketId });
              bracketByKey.set(section.key, round1Result.bracketId);
            }
          }

          const bracketId = bracketByKey.get(section.key) ?? null;
          if (bracketId !== null) {
            const nextResult = await generateNextFinalRound(tournamentId, slug, bracketId);
            if (nextResult.status === "success" && nextResult.matches?.length) {
              insertedMatches.push(...nextResult.matches);
              progressed = true;
            }
          }
        }
      }
    }

    if (!progressed) break;
  }

  if (insertedMatches.length > 0) revalidatePath(finalStagePath(slug), "layout");
  return { matches: insertedMatches, brackets: newBrackets };
}

// Marks the group stage as finished — only once every group has reached its
// configured Swiss round count with every match in that round reported.
// Hides the Start/Rounds controls on the workspace page in favor of the
// finished-state summary.
export async function endGroupStage(tournamentId: string, slug: string): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { data: tournament, error: fetchError } = await supabase
    .from("tournaments")
    .select("format_settings")
    .eq("id", tournamentId)
    .eq("organizer_id", user.id)
    .maybeSingle();
  if (fetchError) return { status: "error", message: fetchError.message };
  if (!tournament) return { status: "error", message: "Tournament not found." };

  const swissRounds = tournament.format_settings?.groupStage?.swissRounds ?? 5;
  const [{ data: groups }, { data: allMatches }] = await Promise.all([
    supabase.from("tournament_groups").select("id").eq("tournament_id", tournamentId),
    supabase.from("matches").select("group_id, round, status").eq("tournament_id", tournamentId),
  ]);

  const matches = (allMatches as Pick<Match, "group_id" | "round" | "status">[] | null) ?? [];
  const finished = (groups ?? []).every((g) => {
    const groupMatches = matches.filter((m) => m.group_id === g.id);
    if (groupMatches.length === 0) return false;
    const latestRound = groupMatches.reduce((max, m) => Math.max(max, m.round), 0);
    if (latestRound < swissRounds) return false;
    return groupMatches.filter((m) => m.round === latestRound).every((m) => m.status === "completed");
  });

  if (!finished) {
    return { status: "error", message: "Every group needs to finish all of its rounds first." };
  }

  const { error } = await supabase
    .from("tournaments")
    .update({ format_settings: { ...tournament.format_settings, groupStageEnded: true } })
    .eq("id", tournamentId)
    .eq("organizer_id", user.id);

  if (error) return { status: "error", message: error.message };

  await logTournamentEvent(tournamentId, "Organizer", "ended the group stage");
  revalidatePath(groupStagePath(slug), "layout");
  return { status: "success" };
}

// Seeds real Round 1 matches for the final bracket from the group stage's
// final standings, then marks the final stage as started. Only supports
// Single Elimination — the only final format with real bracket generation
// behind it right now (see DISABLED_FINAL_FORMATS in tournament-wizard.ts).
// Safe to call more than once — a no-op if Round 1 already exists.
export async function startFinalStage(tournamentId: string, slug: string): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { data: tournament, error: fetchError } = await supabase
    .from("tournaments")
    .select("format_settings")
    .eq("id", tournamentId)
    .eq("organizer_id", user.id)
    .maybeSingle();
  if (fetchError) return { status: "error", message: fetchError.message };
  if (!tournament) return { status: "error", message: "Tournament not found." };

  const settings = tournament.format_settings;
  if (settings?.groupStageEnded !== true) {
    return { status: "error", message: "End the group stage first." };
  }
  if (settings.finalStage?.format !== "single_elimination") {
    return { status: "error", message: "Only the Single Elimination final format is supported right now." };
  }
  if (settings.finalStageStarted === true) {
    return { status: "success" };
  }

  const [{ data: groups }, { data: participants }, { data: groupMatches }] = await Promise.all([
    supabase.from("tournament_groups").select("*").eq("tournament_id", tournamentId).order("sort_order"),
    supabase.from("tournament_participants").select("*").eq("tournament_id", tournamentId).order("seed"),
    supabase.from("matches").select("*").eq("tournament_id", tournamentId).not("group_id", "is", null),
  ]);

  const realGroups = (groups as TournamentGroup[] | null) ?? [];
  const realParticipants = (participants as TournamentParticipant[] | null) ?? [];
  const realMatches = (groupMatches as Match[] | null) ?? [];
  if (realGroups.length === 0) return { status: "error", message: "No groups to seed the bracket from." };

  const standingsByGroupId = new Map(
    realGroups.map((g) => {
      const members = realParticipants.filter((p) => p.group_id === g.id);
      const matches = realMatches.filter((m) => m.group_id === g.id);
      const rows = computeGroupStandings(members, matches, settings.groupStage.swissPoints, [
        settings.groupTieBreaks.tieBreak1,
        settings.groupTieBreaks.tieBreak2,
        settings.groupTieBreaks.tieBreak3,
      ]);
      return [g.id, rows.map((r) => ({ participantId: r.participantId, name: r.name, teamName: r.teamName }))] as const;
    })
  );
  const slots = qualifiedSlots(realGroups, standingsByGroupId, settings.groupStage.participantsAdvancePerGroup);
  if (slots.length < 2) return { status: "error", message: "Not enough qualified participants to seed a bracket." };

  const { data: existing } = await supabase
    .from("matches")
    .select("id")
    .eq("tournament_id", tournamentId)
    .is("group_id", null)
    .limit(1);
  if (!existing || existing.length === 0) {
    const pairings = buildRound1Pairings(slots.map((s) => ({ id: s.id })));
    const { error: insertError } = await supabase.from("matches").insert(
      pairings.map((p) => ({
        tournament_id: tournamentId,
        group_id: null,
        round: 1,
        match_number: p.matchNumber,
        participant_a_id: p.participantAId,
        participant_b_id: p.participantBId,
        winner_id: p.participantBId === null ? p.participantAId : null,
        status: p.participantBId === null ? "completed" : "scheduled",
        completed_at: p.participantBId === null ? new Date().toISOString() : null,
      }))
    );
    if (insertError) return { status: "error", message: insertError.message };
  }

  const { error } = await supabase
    .from("tournaments")
    .update({ format_settings: { ...settings, finalStageStarted: true } })
    .eq("id", tournamentId)
    .eq("organizer_id", user.id);
  if (error) return { status: "error", message: error.message };

  await logTournamentEvent(tournamentId, "Organizer", "started the final stage");
  revalidatePath(finalStagePath(slug), "layout");
  return { status: "success" };
}

type FeederMode = "winner" | "loser";

// What a specific feeder match contributes to whatever it feeds into:
// `undefined` = not decided yet (still in progress, or tied — a tie makes
// no sense for single elimination, so it's treated the same as "not ready"
// until the organizer edits it to a real result); `null` = decided, but
// with no one at this slot (the feeder itself was a bye, so it has no
// loser); a real id = the winner (mode "winner") or loser (mode "loser").
function resolveParticipant(m: Match | undefined, mode: FeederMode): string | null | undefined {
  if (!m || m.status !== "completed" || !m.winner_id) return undefined;
  if (mode === "winner") return m.winner_id;
  if (m.participant_a_id === m.winner_id) return m.participant_b_id;
  if (m.participant_b_id === m.winner_id) return m.participant_a_id;
  return undefined;
}

interface ReadyPairing {
  matchNumber: number;
  aId: string;
  bId: string | null;
}

// Which positions of the round being fed INTO are now determinable —
// per-position, not gated on the whole feeder round finishing: position i
// only needs its own two feeders (match numbers 2i+1 and 2i+2) done, so an
// early match can be started while the rest of its round is still playing.
function computeReadyPairings(feederMatches: Match[], existingNumbers: Set<number>, mode: FeederMode): ReadyPairing[] {
  const sorted = [...feederMatches].sort((a, b) => a.match_number - b.match_number);
  const pairings: ReadyPairing[] = [];

  for (let i = 0; i * 2 < sorted.length; i++) {
    const matchNumber = i + 1;
    if (existingNumbers.has(matchNumber)) continue;
    const a = resolveParticipant(sorted[i * 2], mode);
    const b = resolveParticipant(sorted[i * 2 + 1], mode);
    if (a === undefined || b === undefined) continue;
    if (a === null) continue; // nothing to seat here — the seeding keeps byes apart, but stay safe
    pairings.push({ matchNumber, aId: a, bId: b });
  }

  return pairings;
}

async function fetchBracketMatches(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tournamentId: string,
  bracketId: string | null
): Promise<Match[]> {
  let query = supabase.from("matches").select("*").eq("tournament_id", tournamentId).is("group_id", null);
  query = bracketId === null ? query.is("bracket_id", null) : query.eq("bracket_id", bracketId);
  const { data } = await query;
  return (data as Match[] | null) ?? [];
}

async function insertBracketMatches(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tournamentId: string,
  bracketId: string | null,
  round: number,
  pairings: ReadyPairing[]
): Promise<Match[]> {
  if (pairings.length === 0) return [];
  const { data, error } = await supabase
    .from("matches")
    .insert(
      pairings.map((p) => ({
        tournament_id: tournamentId,
        group_id: null,
        bracket_id: bracketId,
        round,
        match_number: p.matchNumber,
        participant_a_id: p.aId,
        participant_b_id: p.bId,
        winner_id: p.bId === null ? p.aId : null,
        status: p.bId === null ? "completed" : "scheduled",
        completed_at: p.bId === null ? new Date().toISOString() : null,
      }))
    )
    .select();
  if (error) return [];
  return (data as Match[] | null) ?? [];
}

// Pairs up winners into a bracket's next round(s) — winner of match 1 vs
// winner of match 2, winner of match 3 vs winner of match 4, etc. Checks
// every round already present (not just the latest), and within each round
// creates whichever *specific* next-round matches are ready — so a match
// gets its Start/Report/Details icons the moment its own two feeders are
// done, without waiting on the rest of that round. Bracket sizes are always
// a power of two (see buildRound1Pairings), so pairing always divides
// evenly; no Swiss-style re-pairing needed since the bracket shape was
// fixed at seeding time. `bracketId: null` means the main final-stage
// bracket; otherwise a placement section's own `brackets` row id (see
// generatePlacementRound1). Safe to call repeatedly — only inserts matches
// that don't exist yet.
export async function generateNextFinalRound(
  tournamentId: string,
  slug: string,
  bracketId: string | null = null
): Promise<RoleActionState & { matches?: Match[] }> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  // Callable by a judge as well as the organizer (a judge's reported result
  // can trigger this automatically via autoAdvanceFinalStage) — RLS is what
  // actually enforces who's allowed to write these matches, same as
  // reportMatchResult/startMatch above.
  const { data: tournament } = await supabase.from("tournaments").select("id").eq("id", tournamentId).maybeSingle();
  if (!tournament) return { status: "error", message: "Tournament not found." };

  const matches = await fetchBracketMatches(supabase, tournamentId, bracketId);
  if (matches.length === 0) return { status: "success" };

  const maxRound = matches.reduce((max, m) => Math.max(max, m.round), 0);
  const inserted: Match[] = [];

  for (let round = 1; round <= maxRound; round++) {
    const feederMatches = matches.filter((m) => m.round === round);
    if (feederMatches.length < 2) continue;
    const existingNumbers = new Set(matches.filter((m) => m.round === round + 1).map((m) => m.match_number));
    const pairings = computeReadyPairings(feederMatches, existingNumbers, "winner");
    const newRows = await insertBracketMatches(supabase, tournamentId, bracketId, round + 1, pairings);
    inserted.push(...newRows);
  }

  if (inserted.length === 0) return { status: "success" };
  revalidatePath(finalStagePath(slug), "layout");
  return { status: "success", matches: inserted };
}

// Seeds a placement section's Round 1 from the losers of its feeder round —
// the main bracket's round (`feederBracketId: null`) or another placement
// section's round (`feederBracketId` = that section's `brackets.id`). Same
// per-position readiness as generateNextFinalRound: creates whichever Round
// 1 matches are determinable now, and can be called again later to add
// more as the rest of the feeder round finishes. Creates the section's own
// `brackets` row on its first real match (not before, so an unrelated
// bracket's result doesn't spawn empty rows for every configured tier). See
// buildPlacementSections/populateSectionFromFeeder for how sections and
// their loser-pairing are derived.
export async function generatePlacementRound1(
  tournamentId: string,
  slug: string,
  section: { key: string; basePlace: number; poolSize: number; feederKey: string | null; feederRound: number },
  feederBracketId: string | null
): Promise<RoleActionState & { bracketId?: string; matches?: Match[] }> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  // Same as generateNextFinalRound: callable by a judge via
  // autoAdvanceFinalStage, not just the organizer. RLS still restricts the
  // actual `brackets` insert below to organizer/admin — a judge's session
  // hitting that is treated as "not ready yet" by the caller and simply
  // retried on the next result (see autoAdvanceFinalStage).
  const { data: tournament } = await supabase.from("tournaments").select("id, bracket_format").eq("id", tournamentId).maybeSingle();
  if (!tournament) return { status: "error", message: "Tournament not found." };

  const feederMatches = (await fetchBracketMatches(supabase, tournamentId, feederBracketId)).filter(
    (m) => m.round === section.feederRound
  );
  if (feederMatches.length === 0) return { status: "success" };

  const { data: existingBrackets, error: bracketFetchError } = await supabase
    .from("brackets")
    .select("*")
    .eq("tournament_id", tournamentId);
  if (bracketFetchError) return { status: "error", message: bracketFetchError.message };
  let bracket = (existingBrackets ?? []).find((b) => b.structure?.key === section.key) ?? null;

  const existingNumbers = bracket
    ? new Set((await fetchBracketMatches(supabase, tournamentId, bracket.id)).filter((m) => m.round === 1).map((m) => m.match_number))
    : new Set<number>();

  const pairings = computeReadyPairings(feederMatches, existingNumbers, "loser");
  if (pairings.length === 0) return { status: "success", bracketId: bracket?.id };

  if (!bracket) {
    const { data: newBracket, error: bracketError } = await supabase
      .from("brackets")
      .insert({
        tournament_id: tournamentId,
        format: tournament.bracket_format,
        // Only the fields `PlacementSection` needs to be reconstructed — the
        // caller may pass the full client-side object (which also carries
        // its placeholder `rounds`); no need to persist those.
        structure: {
          key: section.key,
          basePlace: section.basePlace,
          poolSize: section.poolSize,
          feederKey: section.feederKey,
          feederRound: section.feederRound,
        },
      })
      .select()
      .single();
    if (bracketError || !newBracket) return { status: "error", message: bracketError?.message ?? "Couldn't create the placement bracket." };
    bracket = newBracket;
  }

  const inserted = await insertBracketMatches(supabase, tournamentId, bracket.id, 1, pairings);
  if (inserted.length === 0) return { status: "success", bracketId: bracket.id };

  revalidatePath(finalStagePath(slug), "layout");
  return { status: "success", bracketId: bracket.id, matches: inserted };
}

// Closes out the tournament once every final-stage match (main bracket and
// every placement section) has a result — the champion is read off the
// main bracket's last round (highest round number, bracket_id null), which
// needs a decisive winner (a tied Grand Final blocks this the same way a
// tie blocks bracket advancement elsewhere).
export async function endTournament(tournamentId: string, slug: string): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .select("*")
    .eq("tournament_id", tournamentId)
    .is("group_id", null);
  if (matchesError) return { status: "error", message: matchesError.message };

  const finalMatches = (matches as Match[] | null) ?? [];
  if (finalMatches.length === 0) return { status: "error", message: "The final stage hasn't started yet." };
  if (finalMatches.some((m) => m.status !== "completed")) {
    return { status: "error", message: "Every match needs a result first." };
  }

  const mainMatches = finalMatches.filter((m) => m.bracket_id === null);
  const grandFinal = mainMatches.reduce<Match | null>(
    (latest, m) => (!latest || m.round > latest.round ? m : latest),
    null
  );
  if (!grandFinal?.winner_id) {
    return { status: "error", message: "The Grand Final needs a decisive result before ending the tournament." };
  }

  const { data: champion } = await supabase
    .from("tournament_participants")
    .select("name, team_name")
    .eq("id", grandFinal.winner_id)
    .maybeSingle();

  const { error } = await supabase
    .from("tournaments")
    .update({
      status: "completed",
      champion_name: champion ? champion.team_name ?? champion.name : null,
      ends_at: new Date().toISOString(),
    })
    .eq("id", tournamentId)
    .eq("organizer_id", user.id);
  if (error) return { status: "error", message: error.message };

  const championName = champion ? champion.team_name ?? champion.name : null;
  await logTournamentEvent(
    tournamentId,
    "Organizer",
    championName ? `ended the tournament — ${championName} is the champion` : "ended the tournament"
  );
  revalidatePath(finalStagePath(slug), "layout");
  revalidatePath(groupStagePath(slug), "layout");
  revalidatePath("/account/organizer/tournament");
  return { status: "success" };
}

// Wipes every match (group stage and final stage share the same `matches`
// table) and un-ends the group stage, so the organizer can restart from
// scratch. Called from the Settings page's Reset button — also stops the
// tournament (back to "registration_closed", the same status "Start Group
// Stage" transitions out of), so resuming requires deliberately starting the
// group stage again rather than silently staying "ongoing" with no matches.
export async function resetTournamentProgress(tournamentId: string, slug: string): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { data: tournament, error: fetchError } = await supabase
    .from("tournaments")
    .select("format_settings, status")
    .eq("id", tournamentId)
    .eq("organizer_id", user.id)
    .maybeSingle();
  if (fetchError) return { status: "error", message: fetchError.message };
  if (!tournament) return { status: "error", message: "Tournament not found." };

  const { error: deleteError } = await supabase.from("matches").delete().eq("tournament_id", tournamentId);
  if (deleteError) return { status: "error", message: deleteError.message };

  const { error: updateError } = await supabase
    .from("tournaments")
    .update({
      format_settings: { ...tournament.format_settings, groupStageEnded: false, finalStageStarted: false },
      // Only stop a tournament that had actually started — leave one still
      // in draft/published/registration_* (i.e. reset before it ever
      // started) at whatever status it already had.
      ...(tournament.status === "ongoing" || tournament.status === "completed"
        ? { status: "registration_closed" as const, champion_name: null, ends_at: null }
        : {}),
    })
    .eq("id", tournamentId)
    .eq("organizer_id", user.id);
  if (updateError) return { status: "error", message: updateError.message };

  revalidatePath(groupStagePath(slug), "layout");
  revalidatePath(`/account/organizer/tournament/${slug}/settings`);
  return { status: "success" };
}
