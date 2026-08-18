import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { DeckSlots } from "@/components/dashboard/beyblade/DeckSlots";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { getComboMatchStatsForProfile, getComboPickerOptions, getDeckCombos, getUserDeck, listUserCombos } from "@/app/account/beyblade/data";

export const metadata: Metadata = { title: "Customize Deck", robots: { index: false, follow: false } };

export default async function CustomizeDeckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirectTo=/account/beyblade/deck/${id}`);

  const deck = await getUserDeck(id, user.id);
  if (!deck) notFound();

  const [slots, combos, pickerOptions, comboStats] = await Promise.all([
    getDeckCombos(deck, user.id),
    listUserCombos(user.id),
    getComboPickerOptions(),
    getComboMatchStatsForProfile(user.id),
  ]);

  return (
    <div>
      <Link href="/account/beyblade/deck" className="label-mono flex items-center gap-1.5 text-primary hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Decks
      </Link>
      <h1 className="heading mt-2 text-3xl">{deck.name}</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">
        3 combo slots for this deck{deck.is_active ? " — currently your active deck." : "."}
      </p>
      <div className="mt-8">
        <DeckSlots deckId={deck.id} slots={slots} availableCombos={combos} pickerOptions={pickerOptions} comboStats={comboStats} />
      </div>
    </div>
  );
}
