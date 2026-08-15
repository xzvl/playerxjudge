"use client";

import { useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { ThumbnailUploadField } from "@/components/tournaments/wizard/ThumbnailUploadField";
import { uploadCommunityLogo, applyCommunityLogoAs, clearCommunityLogoVariant } from "@/app/account/organizer/community/shared-actions";

// The community's main logo plus two optional variants — Alternative Logo
// and Pin Location Logo (the icon shown for this community's marker on
// maps) — each with a "Use community logo" checkbox shortcut so an
// organizer without separate art doesn't have to upload the same image
// three times.
//
// `communityId: null` (the New wizard, before the community exists yet)
// just reports converted files up via the `onXFileReady` callbacks instead
// of uploading — CreateCommunityWizard holds onto them and uploads once it
// has a real id back from creating the community. `communityId` set
// (Settings) uploads immediately, same as ThumbnailSection's tournamentId.
export function CommunityLogoSection({
  communityId,
  initialLogoUrl,
  initialAltUrl,
  initialPinUrl,
  initialUseLogoForAlt = false,
  initialUseLogoForPin = false,
  onLogoFileReady,
  onAltFileReady,
  onPinFileReady,
  onUseLogoForAltChange,
  onUseLogoForPinChange,
}: {
  communityId: string | null;
  initialLogoUrl: string | null;
  initialAltUrl: string | null;
  initialPinUrl: string | null;
  initialUseLogoForAlt?: boolean;
  initialUseLogoForPin?: boolean;
  onLogoFileReady?: (file: File) => void;
  onAltFileReady?: (file: File) => void;
  onPinFileReady?: (file: File) => void;
  onUseLogoForAltChange?: (checked: boolean) => void;
  onUseLogoForPinChange?: (checked: boolean) => void;
}) {
  const [useLogoForAlt, setUseLogoForAlt] = useState(initialUseLogoForAlt);
  const [useLogoForPin, setUseLogoForPin] = useState(initialUseLogoForPin);
  const [error, setError] = useState<string | null>(null);

  async function handleLogoReady(file: File) {
    if (!communityId) {
      onLogoFileReady?.(file);
      return;
    }
    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadCommunityLogo(communityId, "logo", formData);
    if (result.status === "error") {
      setError(result.message ?? "Upload failed.");
      return;
    }
    // The logo itself changed — any variant still reusing it needs to point
    // at the new image too.
    if (useLogoForAlt) await applyCommunityLogoAs(communityId, "alt");
    if (useLogoForPin) await applyCommunityLogoAs(communityId, "pin");
  }

  async function handleAltReady(file: File) {
    if (!communityId) {
      onAltFileReady?.(file);
      return;
    }
    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadCommunityLogo(communityId, "alt", formData);
    if (result.status === "error") setError(result.message ?? "Upload failed.");
  }

  async function handlePinReady(file: File) {
    if (!communityId) {
      onPinFileReady?.(file);
      return;
    }
    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadCommunityLogo(communityId, "pin", formData);
    if (result.status === "error") setError(result.message ?? "Upload failed.");
  }

  async function toggleAlt(checked: boolean) {
    setUseLogoForAlt(checked);
    onUseLogoForAltChange?.(checked);
    setError(null);
    if (!communityId) return;
    const result = checked ? await applyCommunityLogoAs(communityId, "alt") : await clearCommunityLogoVariant(communityId, "alt");
    if (result.status === "error") setError(result.message ?? "Something went wrong.");
  }

  async function togglePin(checked: boolean) {
    setUseLogoForPin(checked);
    onUseLogoForPinChange?.(checked);
    setError(null);
    if (!communityId) return;
    const result = checked ? await applyCommunityLogoAs(communityId, "pin") : await clearCommunityLogoVariant(communityId, "pin");
    if (result.status === "error") setError(result.message ?? "Something went wrong.");
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <ThumbnailUploadField
          label="Community Logo"
          aspectClassName="aspect-square w-full max-w-[220px]"
          maxDimension={1000}
          initialUrl={initialLogoUrl}
          onFileReady={handleLogoReady}
        />

        <div className="space-y-3">
          <ThumbnailUploadField
            key={useLogoForAlt ? "logo-as-alt" : "own-alt"}
            label="Community Alternative Logo"
            aspectClassName="aspect-square w-full max-w-[220px]"
            maxDimension={1000}
            initialUrl={useLogoForAlt ? initialLogoUrl : initialAltUrl}
            disabled={useLogoForAlt}
            onFileReady={handleAltReady}
          />
          <label className="flex cursor-pointer items-center gap-3 text-sm text-on-surface/70">
            <Checkbox checked={useLogoForAlt} onChange={(e) => toggleAlt(e.target.checked)} />
            Use community logo
          </label>
        </div>

        <div className="space-y-3">
          <ThumbnailUploadField
            key={useLogoForPin ? "logo-as-pin" : "own-pin"}
            label="Pin Location Logo"
            aspectClassName="aspect-square w-full max-w-[160px]"
            maxDimension={512}
            initialUrl={useLogoForPin ? initialLogoUrl : initialPinUrl}
            disabled={useLogoForPin}
            onFileReady={handlePinReady}
          />
          <label className="flex cursor-pointer items-center gap-3 text-sm text-on-surface/70">
            <Checkbox checked={useLogoForPin} onChange={(e) => togglePin(e.target.checked)} />
            Use community logo
          </label>
        </div>
      </div>

      <p className="text-xs text-on-surface/50">JPG, PNG, or WebP — JPG/PNG are converted to WebP automatically.</p>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
