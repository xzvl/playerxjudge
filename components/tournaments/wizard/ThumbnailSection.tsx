"use client";

import { useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { ThumbnailUploadField } from "@/components/tournaments/wizard/ThumbnailUploadField";
import {
  clearTournamentBanner,
  uploadTournamentThumbnail,
  applySquareThumbnailAsBanner,
} from "@/app/account/organizer/tournament/shared-actions";

// Square image (cards/listings) + optional horizontal banner (tournament
// detail page), with a shortcut to reuse the square image as the banner.
//
// `tournamentId: null` (the New wizard, before the tournament exists yet)
// just reports converted files up via the `onXFileReady` callbacks instead
// of uploading — CreateTournamentWizard holds onto them and uploads once it
// has a real id back from creating the tournament. `tournamentId` set
// (Settings) uploads immediately, same as the profile photo uploader.
export function ThumbnailSection({
  tournamentId,
  initialSquareUrl,
  initialBannerUrl,
  initialUseSquareForBanner = false,
  onSquareFileReady,
  onBannerFileReady,
  onUseSquareForBannerChange,
}: {
  tournamentId: string | null;
  initialSquareUrl: string | null;
  initialBannerUrl: string | null;
  initialUseSquareForBanner?: boolean;
  onSquareFileReady?: (file: File) => void;
  onBannerFileReady?: (file: File) => void;
  onUseSquareForBannerChange?: (checked: boolean) => void;
}) {
  const [useSquareForBanner, setUseSquareForBanner] = useState(initialUseSquareForBanner);
  const [error, setError] = useState<string | null>(null);

  async function handleSquareReady(file: File) {
    if (!tournamentId) {
      onSquareFileReady?.(file);
      return;
    }
    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadTournamentThumbnail(tournamentId, "square", formData);
    if (result.status === "error") {
      setError(result.message ?? "Upload failed.");
      return;
    }
    if (useSquareForBanner) {
      const bannerResult = await applySquareThumbnailAsBanner(tournamentId);
      if (bannerResult.status === "error") setError(bannerResult.message ?? "Something went wrong.");
    }
  }

  async function handleBannerReady(file: File) {
    if (!tournamentId) {
      onBannerFileReady?.(file);
      return;
    }
    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadTournamentThumbnail(tournamentId, "banner", formData);
    if (result.status === "error") setError(result.message ?? "Upload failed.");
  }

  async function handleToggleUseSquare(checked: boolean) {
    setUseSquareForBanner(checked);
    onUseSquareForBannerChange?.(checked);
    setError(null);
    if (!tournamentId) return;

    const result = checked ? await applySquareThumbnailAsBanner(tournamentId) : await clearTournamentBanner(tournamentId);
    if (result.status === "error") setError(result.message ?? "Something went wrong.");
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-6 sm:grid-cols-2">
        <ThumbnailUploadField
          label="Square Image"
          aspectClassName="aspect-square w-full max-w-[220px]"
          maxDimension={1000}
          initialUrl={initialSquareUrl}
          onFileReady={handleSquareReady}
        />
        <div className="space-y-3">
          <ThumbnailUploadField
            key={useSquareForBanner ? "square-as-banner" : "own-banner"}
            label="Horizontal Image"
            aspectClassName="aspect-[16/9] w-full"
            maxDimension={1600}
            initialUrl={useSquareForBanner ? initialSquareUrl : initialBannerUrl}
            disabled={useSquareForBanner}
            onFileReady={handleBannerReady}
          />
          <label className="flex cursor-pointer items-center gap-3 text-sm text-on-surface/70">
            <Checkbox checked={useSquareForBanner} onChange={(e) => handleToggleUseSquare(e.target.checked)} />
            Use square image field on horizontal image
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
