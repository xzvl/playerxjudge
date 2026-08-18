import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Swords } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ComboMatchStats, ComboPartsLine, ComboThumbnails } from "@/components/dashboard/beyblade/combo-ui";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { EMPTY_COMBO_MATCH_STATS, getComboMatchStatsForProfile, listUserCombos } from "@/app/account/beyblade/data";

export const metadata: Metadata = { title: "Beyblade Dashboard", robots: { index: false, follow: false } };

export default async function BeybladeDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/account/beyblade/dashboard");

  const [combos, comboStats] = await Promise.all([listUserCombos(user.id), getComboMatchStatsForProfile(user.id)]);
  const statsFor = (id: string) => comboStats.get(id) ?? EMPTY_COMBO_MATCH_STATS;

  // "Most Used"/"Best Combo" are backed by real battle records (see
  // getComboMatchStatsForProfile) once any exist; a combo that's never
  // actually been used in a judge-scored battle yet falls back to
  // most-recently-saved, same as before this linkage existed.
  const byUsage = [...combos].sort((a, b) => statsFor(b.id).matches - statsFor(a.id).matches);
  const mostUsed = (byUsage[0] && statsFor(byUsage[0].id).matches > 0 ? byUsage[0] : combos[0]) ?? null;

  const byWinRate = combos.filter((c) => statsFor(c.id).matches > 0).sort((a, b) => statsFor(b.id).winRate - statsFor(a.id).winRate);
  const bestCombos = (byWinRate.length > 0 ? byWinRate : combos).slice(0, 3);

  return (
    <div>
      <p className="label-mono text-primary">Beyblade Dashboard</p>
      <h1 className="heading mt-2 text-3xl">Overview</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">Your saved combos, deck, and match usage at a glance.</p>

      {combos.length === 0 ? (
        <Card className="mt-8">
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <Swords className="h-8 w-8 text-on-surface/30" aria-hidden="true" />
            <p className="text-sm text-on-surface/60">You haven&apos;t saved any combos yet.</p>
            <Button asChild className="gap-1.5" tooltip="Create your first Beyblade combo">
              <Link href="/account/beyblade/combos/new">
                <Plus className="h-3.5 w-3.5" /> Add Beyblade Combo
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="relative mt-8 overflow-hidden">
            {mostUsed && mostUsed.blade.imageUrl ? (
              <div className="pointer-events-none absolute inset-y-0 right-0 w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mostUsed.blade.imageUrl} alt="" className="h-full w-full object-cover object-right" />
                <div className="absolute inset-0 bg-gradient-to-r from-surface-container-lowest via-surface-container-lowest/70 to-transparent" />
              </div>
            ) : null}
            <CardContent className="relative z-10 p-6">
              <p className="label-mono text-on-surface/40">Most Used Combo</p>
              {mostUsed ? (
                <>
                  <p className="heading mt-1 text-xl">{mostUsed.name}</p>
                  <ComboPartsLine bladeDisplay={mostUsed.bladeDisplay} ratchet={mostUsed.ratchet} bit={mostUsed.bit} />
                  <div className="mt-5 max-w-sm">
                    <ComboMatchStats {...statsFor(mostUsed.id)} />
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>

          <div className="mt-8">
            <h2 className="heading text-lg">Best Combo</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {bestCombos.map((combo) => (
                <Card key={combo.id}>
                  <CardContent className="p-5">
                    <ComboThumbnails bladeParts={combo.bladeParts} ratchet={combo.ratchet} bit={combo.bit} fit="contain" />
                    <p className="mt-3 heading truncate text-on-surface">{combo.name}</p>
                    <ComboPartsLine bladeDisplay={combo.bladeDisplay} ratchet={combo.ratchet} bit={combo.bit} />
                    <div className="my-4 border-t border-outline-variant/20" />
                    <ComboMatchStats {...statsFor(combo.id)} />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
