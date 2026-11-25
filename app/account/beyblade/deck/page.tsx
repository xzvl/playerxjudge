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
import { PageHeader } from "@/components/dashboard/erp";

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
      <PageHeader
        eyebrow="Beyblade Dashboard"
        title="Build Your Deck"
        description="Create as many decks as you like, then rename them, pick your active deck and fill each one's 3 combo slots."
      />

      <div className="mt-5">
        <DeckRows key={deckSummaries.map((d) => d.deck.id).join()} decks={deckSummaries} availableCombos={combos} pickerOptions={pickerOptions} comboStats={comboStats} />
      </div>
    </div>
  );
}
