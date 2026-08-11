"use client";

import { useEffect, useState } from "react";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
}

function getTimeLeft(target: string): TimeLeft {
  const diff = Math.max(0, new Date(target).getTime() - Date.now());
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    done: diff <= 0,
  };
}

// `Date.now()` differs between the server render and the client's initial
// (pre-hydration) render, so seeding state from it directly causes a
// hydration mismatch. Instead, both renders start from `null` (a
// deterministic "--" placeholder) and the real value is only computed
// client-side after mount, in an effect.
export function CountdownTimer({ target, completed = false }: { target: string; completed?: boolean }) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

  useEffect(() => {
    setTimeLeft(getTimeLeft(target));
    const id = setInterval(() => setTimeLeft(getTimeLeft(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (completed) {
    return <p className="heading text-primary">Completed</p>;
  }

  if (timeLeft?.done) {
    return <p className="heading text-primary">In Progress / Started</p>;
  }

  const units = [
    { label: "Days", value: timeLeft?.days },
    { label: "Hrs", value: timeLeft?.hours },
    { label: "Min", value: timeLeft?.minutes },
    { label: "Sec", value: timeLeft?.seconds },
  ];

  return (
    <div className="flex gap-1" role="timer" aria-live="polite">
      {units.map((unit) => (
        <div key={unit.label} className="flex flex-col items-center border border-outline-variant/30 px-3 py-2">
          <span className="heading text-xl text-primary">
            {unit.value === undefined ? "--" : String(unit.value).padStart(2, "0")}
          </span>
          <span className="label-mono text-[9px] text-on-surface/40">{unit.label}</span>
        </div>
      ))}
    </div>
  );
}
