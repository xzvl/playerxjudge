"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { updateTournamentInfo } from "@/app/account/settings/actions";
import { tournamentInfoSchema } from "@/lib/validations/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { cn } from "@/lib/utils";

const NO_COMMUNITY = "__none__";

export function TournamentInfoForm({
  communities,
  defaultBladerNames,
  defaultCommunityIds,
  defaultMainCommunityId,
}: {
  communities: ComboboxOption[];
  defaultBladerNames: string[];
  defaultCommunityIds: string[];
  defaultMainCommunityId: string | null;
}) {
  const [bladerNames, setBladerNames] = useState<string[]>(defaultBladerNames);
  const [bladerInput, setBladerInput] = useState("");
  const [communityIds, setCommunityIds] = useState<string[]>(defaultCommunityIds);
  const [mainCommunityId, setMainCommunityId] = useState<string | null>(defaultMainCommunityId);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverMessage, setServerMessage] = useState<{ type: "error" | "success"; text: string } | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);

  function addBladerName() {
    const name = bladerInput.trim();
    if (!name || bladerNames.includes(name)) return;
    setBladerNames((names) => [...names, name]);
    setBladerInput("");
  }

  function removeBladerName(name: string) {
    setBladerNames((names) => names.filter((n) => n !== name));
  }

  function addCommunity(id: string) {
    if (!id || communityIds.includes(id)) return;
    setCommunityIds((ids) => [...ids, id]);
    setMainCommunityId((current) => current ?? id);
  }

  // Explicitly declares "I'm not part of any community" — clears whatever
  // was selected rather than being just another chip alongside real ones.
  function selectNoCommunity() {
    setCommunityIds([]);
    setMainCommunityId(null);
  }

  function handleCommunityPick(id: string) {
    if (id === NO_COMMUNITY) selectNoCommunity();
    else addCommunity(id);
  }

  function removeCommunity(id: string) {
    setCommunityIds((ids) => ids.filter((c) => c !== id));
    setMainCommunityId((current) => (current === id ? null : current));
  }

  async function handleSubmit() {
    const parsed = tournamentInfoSchema.safeParse({
      bladerNames,
      communityIds,
      mainCommunityId: mainCommunityId ?? "",
    });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setErrors({
        bladerNames: flat.bladerNames?.[0] ?? "",
        communityIds: flat.communityIds?.[0] ?? "",
        mainCommunityId: flat.mainCommunityId?.[0] ?? "",
      });
      return;
    }
    setErrors({});
    setSubmitting(true);
    setServerMessage(null);
    const result = await updateTournamentInfo(parsed.data);
    setSubmitting(false);
    if (result.status === "error") {
      setServerMessage({ type: "error", text: result.message ?? "Something went wrong." });
    } else if (result.status === "success") {
      setServerMessage({ type: "success", text: result.message ?? "Saved." });
    }
  }

  const communityLabel = (id: string) => communities.find((c) => c.value === id)?.label ?? id;
  const availableCommunities = communities.filter((c) => !communityIds.includes(c.value));

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium text-on-surface">Blader Name(s)</label>
        <div className="flex gap-2">
          <Input
            value={bladerInput}
            onChange={(e) => setBladerInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addBladerName();
              }
            }}
            placeholder="Add a blader name"
          />
          <Button type="button" variant="outline" tooltip="Add this blader name" onClick={addBladerName}>
            Add
          </Button>
        </div>
        {bladerNames.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {bladerNames.map((name) => (
              <span
                key={name}
                className="flex items-center gap-2 border border-outline-variant/40 px-3 py-1.5 text-sm text-on-surface/80"
              >
                {name}
                <button
                  type="button"
                  onClick={() => removeBladerName(name)}
                  aria-label={`Remove ${name}`}
                  className="text-on-surface/40 hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        ) : null}
        {errors.bladerNames ? <p className="text-xs font-medium text-destructive">{errors.bladerNames}</p> : null}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-on-surface">Communities</label>
        <Combobox
          label="Add community"
          value=""
          onValueChange={handleCommunityPick}
          options={[{ value: NO_COMMUNITY, label: "No Community" }, ...availableCommunities]}
        />
        {communityIds.length > 0 ? (
          <div className="space-y-2">
            {communityIds.map((id) => (
              <div
                key={id}
                className="flex flex-wrap items-center justify-between gap-3 border border-outline-variant/25 p-3"
              >
                <span className="text-sm text-on-surface">{communityLabel(id)}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMainCommunityId(id)}
                    className={cn(
                      "label-mono border px-3 py-1.5 text-[10px] transition-colors",
                      mainCommunityId === id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-outline-variant/40 text-on-surface/50 hover:border-outline-variant/60"
                    )}
                  >
                    {mainCommunityId === id ? "Main" : "Set as Main"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeCommunity(id)}
                    aria-label={`Remove ${communityLabel(id)}`}
                    className="text-on-surface/40 hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-on-surface/50">No Community.</p>
        )}
        {errors.communityIds ? <p className="text-xs font-medium text-destructive">{errors.communityIds}</p> : null}
        {errors.mainCommunityId ? (
          <p className="text-xs font-medium text-destructive">{errors.mainCommunityId}</p>
        ) : null}
      </div>

      {serverMessage ? (
        <p
          role={serverMessage.type === "error" ? "alert" : "status"}
          className={serverMessage.type === "error" ? "text-sm text-destructive" : "text-sm text-primary"}
        >
          {serverMessage.text}
        </p>
      ) : null}

      <Button type="button" tooltip="Save your blader names and communities" disabled={submitting} onClick={handleSubmit}>
        {submitting ? "Saving..." : "Save Tournament Information"}
      </Button>
    </div>
  );
}
