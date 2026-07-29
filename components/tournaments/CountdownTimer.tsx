"use client";

import { useEffect, useState } from "react";

function getTimeLeft(target: string) {
  const diff = Math.max(0, new Date(target).getTime() - Date.now());
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    done: diff <= 0,
  };
}

export function CountdownTimer({ target }: { target: string }) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(target));

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(getTimeLeft(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (timeLeft.done) {
    return <p className="heading text-primary">In Progress / Started</p>;
  }

  const units = [
    { label: "Days", value: timeLeft.days },
    { label: "Hrs", value: timeLeft.hours },
    { label: "Min", value: timeLeft.minutes },
    { label: "Sec", value: timeLeft.seconds },
  ];

  return (
    <div className="flex gap-3" role="timer" aria-live="polite">
      {units.map((unit) => (
        <div key={unit.label} className="flex flex-col items-center border border-outline-variant/30 px-3 py-2">
          <span className="heading text-xl text-primary">{String(unit.value).padStart(2, "0")}</span>
          <span className="label-mono text-[9px] text-on-surface/40">{unit.label}</span>
        </div>
      ))}
    </div>
  );
}
