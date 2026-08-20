import type { createClient } from "@/lib/supabase/server";
import type { ParticipantLinkInfo } from "@/components/dashboard/organizer/ParticipantLinkControls";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// An already-approved participant_links row, made without the normal
// self-serve "Link Me" + organizer-confirm flow — allowed by the
// "participant_links_insert_organizer_or_admin" RLS policy
// (20250101000050_preregistration_username.sql). Used wherever a
// pre-registration's captured username (see submitPreRegistration,
// app/tournaments/[slug]/actions.ts) rides along into the roster: the single
// "Add to roster" button (addPreRegisteredParticipant) and Copy All -> Bulk
// Add paste (bulkAddParticipants).
//
// Best-effort by design: an unknown username, or a 23505 conflict (that
// profile already has an active claim in this tournament, or this
// participant somehow already has one), is swallowed rather than failing the
// roster add that's calling it — the participant itself is the thing that
// must succeed. Returns the new link (or null on no-op/failure) so the
// caller can hand it straight to the UI — a caller that ignores the return
// value is left with rows that *are* linked in the database but still read
// "Not linked" client-side until a full reload, since nothing else
// refreshes the client's local `links` map after a bulk/programmatic add.
export async function autoLinkParticipant(
  supabase: SupabaseClient,
  tournamentId: string,
  participantId: string,
  username: string | null | undefined,
  decidedBy: string
): Promise<{ participantId: string; link: ParticipantLinkInfo } | null> {
  if (!username) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, username")
    .ilike("username", username)
    .maybeSingle();
  if (!profile) return null;

  const { data: link, error } = await supabase
    .from("participant_links")
    .insert({
      tournament_id: tournamentId,
      participant_id: participantId,
      profile_id: profile.id,
      status: "approved",
      decided_at: new Date().toISOString(),
      decided_by: decidedBy,
    })
    .select("id")
    .single();
  // Errors (23505 conflicts, RLS denial, etc.) intentionally swallowed — see
  // comment above.
  if (error || !link) return null;

  return {
    participantId,
    link: { id: link.id, status: "approved", requesterName: profile.display_name ?? profile.username },
  };
}
