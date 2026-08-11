import type { Metadata } from "next";
import { AlertTriangle, BookOpenCheck } from "lucide-react";

import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "Beyblade X Regulations",
  description: "Official Beyblade X tournament regulations: Bey checks, launcher checks, stadium rules, shooting method, battle rules, and scoring.",
};

const QUICK_LINKS = [
  { href: "#about-beyblade", label: "About Beyblade" },
  { href: "#beyblade-checks", label: "Beyblade Checks" },
  { href: "#launcher-checks", label: "Launcher Checks" },
  { href: "#stadium-rules", label: "Stadium Rules" },
  { href: "#shooting-method", label: "Shooting Method" },
  { href: "#battle-rules", label: "Battle Rules" },
  { href: "#scoring-system", label: "Scoring System" },
  { href: "#additional-rules", label: "Additional Rules" },
];

const SCORING = [
  { finish: "Xtreme Finish", points: "3 Points" },
  { finish: "Over Finish", points: "2 Points" },
  { finish: "Burst Finish", points: "2 Points" },
  { finish: "Spin Finish", points: "1 Point" },
];

function RuleSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="mb-4 heading text-xl leading-none text-primary">{title}</h2>
      {children}
    </section>
  );
}

function RuleList({ items }: { items: string[] }) {
  return (
    <ul className="list-inside list-disc space-y-2 text-sm text-on-surface/70">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export default function RulesPage() {
  return (
    <div className="cyber-grid px-4 py-20 md:px-16">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <div className="glass-panel mx-auto flex h-16 w-16 items-center justify-center">
            <BookOpenCheck className="h-7 w-7 text-primary" aria-hidden="true" />
          </div>
          <p className="label-mono mt-6 text-primary">Reference</p>
          <h1 className="heading mt-3 text-4xl md:text-5xl">Beyblade X Regulations</h1>
          <p className="mx-auto mt-4 max-w-xl text-primary">
            (12th Edition, March 2026)
          </p>
          <p className="mx-auto mt-4 max-w-xl text-on-surface/60">
            The full tournament regulation set every PlayerXJudge event follows.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {QUICK_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="label-mono border border-outline-variant/40 px-3 py-2 text-[10px] text-on-surface/60 transition-colors hover:border-primary hover:text-primary"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="mt-10 flex gap-3 border border-primary/40 bg-primary/5 p-5">
          <AlertTriangle className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <p className="label-mono text-primary">Important Notice</p>
            <p className="mt-2 text-sm text-on-surface/70">
              By participating in our tournaments, you agree to follow these regulations. Any
              violation may result in warnings, point deductions, match forfeiture, or
              disqualification. All judge decisions are final.
            </p>
          </div>
        </div>

        <div className="mt-12 space-y-10">
          <RuleSection id="about-beyblade" title="About Beyblade">
            <RuleList
              items={[
                "Only officially released BEYBLADE X Series products (released from July 2023 onward) may be used.",
                "Previous Beyblade generations, launchers, stadiums, and tools are not permitted.",
                "In team or battle formats where allowed, multiple Beys may be used according to the event rules.",
                "Players must follow all judge instructions during Bey checks and battles.",
                "Unauthorized modifications, intentional cheating, or unsportsmanlike conduct may result in immediate disqualification.",
              ]}
            />
          </RuleSection>

          <Separator />

          <RuleSection id="beyblade-checks" title="Beyblade Checks">
            <RuleList
              items={[
                "Only genuine BEYBLADE X parts are permitted.",
                "Parts may not be omitted or assembled in ways other than their intended design.",
                "Disassembling or modifying official parts is prohibited.",
                "Parts with altered or enhanced performance are not allowed.",
                "Certain cosmetic decorations (such as permitted stickers or paint) are allowed only if they do not affect performance or violate the official regulations.",
                "After presenting your Bey for inspection, you may not change it unless the judge grants permission.",
                "Judges may request that competitors disassemble and reassemble their Beys for inspection.",
                "Swapping parts between battles is not allowed unless specifically permitted by the judge.",
              ]}
            />
          </RuleSection>

          <Separator />

          <RuleSection id="launcher-checks" title="Launcher Checks">
            <RuleList
              items={[
                "Only official BEYBLADE X launchers, grips, and accessories may be used.",
                "Omitting parts or combining launcher components in unintended ways is prohibited.",
                "Modified, repaired, or disassembled launcher parts are not permitted.",
                "Launchers or grips with altered performance cannot be used.",
                "Judges may prohibit the use of damaged, defective, or modified launchers and accessories.",
                "Decorations that interfere with gameplay may be removed at the judge's discretion.",
              ]}
            />
          </RuleSection>

          <Separator />

          <RuleSection id="stadium-rules" title="Stadium Rules">
            <RuleList
              items={[
                "Only official BEYBLADE X Stadiums may be used.",
                "A stadium consists of the stadium body and the stadium cover.",
                "The Shoot Area is the hole located at the center of the stadium cover.",
                "The Xtreme, Over, and Battle Zones are defined according to the official stadium type being used.",
              ]}
            />
            <p className="label-mono mt-4 mb-2 text-on-surface/40">Tournament organizers may use</p>
            <RuleList items={["Xtreme Stadium", "Wide Xtreme Stadium", "Infinity Stadium"]} />
          </RuleSection>

          <Separator />

          <RuleSection id="shooting-method" title="Shooting Method">
            <RuleList
              items={[
                "Launch your Bey from 20 cm (8 inches) or less above the stadium.",
                "Players determine shooting positions by rock-paper-scissors before the match.",
                "Do not interfere with your opponent's launch.",
              ]}
            />
            <p className="my-4 border border-outline-variant/30 bg-surface-container-low p-4 text-center text-sm text-on-surface/70">
              The judge will call: <span className="text-primary">&ldquo;Three, Two, One, Go Shoot!&rdquo;</span>
            </p>
            <RuleList
              items={[
                'Launch your Bey during the word "Shoot."',
                "Your Bey must pass through the designated Shoot Area.",
                "Do not keep your Bey touching the stadium while launching.",
                "Stand within the designated shooting position for the stadium being used.",
              ]}
            />
          </RuleSection>

          <Separator />

          <RuleSection id="battle-rules" title="Battle Rules">
            <RuleList
              items={[
                "After launching, step back one step.",
                "Do not lean over or peer into the stadium during battle.",
                "The battle begins once all Beys have entered the stadium correctly.",
                "Do not touch the stadium or any Bey until the judge gives permission.",
                "Intentional interference during battle may result in disqualification.",
                "Judge decisions regarding finishes, restarts, and penalties are final.",
              ]}
            />
            <p className="label-mono mt-4 mb-2 text-on-surface/40">Shooting errors include</p>
            <RuleList
              items={[
                "Bey fails to detach from the launcher.",
                "Bey falls before entering the stadium.",
                "Bey is launched outside the designated Shoot Area.",
              ]}
            />
          </RuleSection>

          <Separator />

          <RuleSection id="scoring-system" title="Scoring System">
            <p className="mb-4 text-sm text-on-surface/70">
              The first player to earn <span className="text-primary">4 points</span> wins the match.
            </p>
            <div className="overflow-x-auto border border-outline-variant/25">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="label-mono border-b border-outline-variant/25 text-on-surface/40">
                    <th className="p-4" scope="col">
                      Finish Type
                    </th>
                    <th className="p-4" scope="col">
                      Points
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {SCORING.map((row) => (
                    <tr key={row.finish} className="border-b border-outline-variant/15 last:border-0">
                      <td className="p-4 font-medium text-on-surface">{row.finish}</td>
                      <td className="p-4 text-primary">{row.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </RuleSection>

          <Separator />

          <RuleSection id="additional-rules" title="Additional Rules">
            <RuleList
              items={[
                "If multiple finishing moves occur simultaneously, the finish that occurred first determines the result.",
                "If no valid finishing move can be determined, the judge may order a replay.",
                "Once points have been awarded, previous launch errors are no longer considered.",
                "Match results cannot be overturned after the judge's final ruling except in cases specifically covered by the official regulations.",
              ]}
            />
          </RuleSection>
        </div>

        <p className="mt-12 text-center text-xs text-on-surface/40">
          This page reflects the 12th Edition (March 2026) official regulations, condensed for
          tournament registration.
        </p>
      </div>
    </div>
  );
}
