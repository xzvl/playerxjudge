import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DeckRows, type DeckSummary } from "@/components/dashboard/beyblade/DeckRows";
import { getCurrentUser } from "@/lib/supabase/get-user";
import {
  getComboMatchStatsForProfile,
  getComboPickerOptions,
  getDeckCombos,
  listOrCreateUserDecks,
  listUserCombos,
} from "@/app/account/beyblade/data";

export const metadata: Metadata = { title: "Build Your Deck", robots: { index: false, follow: false } };

export default async function BuildDeckPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/account/beyblade/deck");

  const decks = await listOrCreateUserDecks(user.id);
  const [deckSummaries, combos, pickerOptions, comboStats] = await Promise.all([
    Promise.all(decks.map(async (deck): Promise<DeckSummary> => ({ deck, combos: await getDeckCombos(deck, user.id) }))),
    listUserCombos(user.id),
    getComboPickerOptions(),
    getComboMatchStatsForProfile(user.id),
  ]);

  return (
    <div>
      <p className="label-mono text-primary">Beyblade Dashboard</p>
      <h1 className="heading mt-2 text-3xl">Build Your Deck</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">
        Rename, select, or customize any of your decks — each one holds 3 combo slots.
      </p>

      <div className="mt-8">
        <DeckRows decks={deckSummaries} availableCombos={combos} pickerOptions={pickerOptions} comboStats={comboStats} />
      </div>
    </div>
  );
}
