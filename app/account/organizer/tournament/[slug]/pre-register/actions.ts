"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { logTournamentEvent } from "@/app/account/organizer/tournament/[slug]/workspace-panels-actions";
import type { PreregistrationPaymentStatus, TournamentParticipant, TournamentPreregistration } from "@/lib/types/database";
import type { RoleActionState } from "@/lib/validations/roles";

// Authorization is enforced by RLS, same as the sibling participants
// actions.ts — getCurrentUser() here is just a fast, friendly bail-out.

function preRegisterPath(slug: string) {
  return `/account/organizer/tournament/${slug}/pre-register`;
}

// Promotes a guest pre-registration submission straight onto the roster,
// next open seed — the pre-registration row itself stays put afterward (it's
// the organizer's record of the original submission, not consumed by this).
// Uses the Blader Name as the roster entry's display name, matching how
// bladers are identified everywhere else in the tournament (seeds, brackets,
// standings) rather than their real name.
export async function addPreRegisteredParticipant(
  tournamentId: string,
  slug: string,
  bladerName: string
): Promise<RoleActionState & { participant?: TournamentParticipant }> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };
  const name = bladerName.trim();
  if (!name) return { status: "error", message: "Blader name is required." };

  const supabase = await createClient();
  const { data: highestSeed } = await supabase
    .from("tournament_participants")
    .select("seed")
    .eq("tournament_id", tournamentId)
    .order("seed", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("tournament_participants")
    .insert({ tournament_id: tournamentId, seed: (highestSeed?.seed ?? 0) + 1, name, team_name: null })
    .select()
    .single();

  if (error) return { status: "error", message: error.message };
  const added = data as TournamentParticipant;
  await logTournamentEvent(tournamentId, "Organizer", `added pre-registered player ${added.name} to the roster`);
  revalidatePath(preRegisterPath(slug));
  revalidatePath(`/account/organizer/tournament/${slug}/participants`);
  return { status: "success", participant: added };
}

export async function updatePreRegistration(
  preregistrationId: string,
  slug: string,
  input: { fullName: string; bladerName: string; facebookName: string }
): Promise<RoleActionState & { preregistration?: TournamentPreregistration }> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const fullName = input.fullName.trim();
  const bladerName = input.bladerName.trim();
  const facebookName = input.facebookName.trim();
  if (!fullName || !bladerName || !facebookName) {
    return { status: "error", message: "Full Name, Blader Name, and Facebook Name are all required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tournament_preregistrations")
    .update({ full_name: fullName, blader_name: bladerName, facebook_name: facebookName })
    .eq("id", preregistrationId)
    .select()
    .single();

  if (error) return { status: "error", message: error.message };
  revalidatePath(preRegisterPath(slug));
  return { status: "success", preregistration: data as TournamentPreregistration };
}

// Organizer override of the guest's own "hide me on public" checkbox — lets
// the organizer hide someone who forgot to check it, or unhide someone who
// checked it by mistake, without going back to the guest.
export async function updatePreRegistrationVisibility(
  preregistrationId: string,
  slug: string,
  hidePublic: boolean
): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("tournament_preregistrations")
    .update({ hide_public: hidePublic })
    .eq("id", preregistrationId);
  if (error) return { status: "error", message: error.message };

  revalidatePath(preRegisterPath(slug));
  return { status: "success" };
}

// Payment verification — the organizer checks a submitted screenshot (or an
// on-site payment) and records the outcome here. Applies to any submission,
// not just ones that used Advance Payment.
export async function updatePreRegistrationPaymentStatus(
  preregistrationId: string,
  slug: string,
  paymentStatus: PreregistrationPaymentStatus
): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("tournament_preregistrations")
    .update({ payment_status: paymentStatus })
    .eq("id", preregistrationId);
  if (error) return { status: "error", message: error.message };

  revalidatePath(preRegisterPath(slug));
  return { status: "success" };
}

export async function removePreRegistration(preregistrationId: string, slug: string): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { error } = await supabase.from("tournament_preregistrations").delete().eq("id", preregistrationId);
  if (error) return { status: "error", message: error.message };

  revalidatePath(preRegisterPath(slug));
  return { status: "success" };
}
