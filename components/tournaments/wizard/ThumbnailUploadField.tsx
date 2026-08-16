"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { fileToWebp } from "@/lib/images/to-webp";
import { ALLOWED_THUMBNAIL_TYPES, MAX_THUMBNAIL_INPUT_BYTES } from "@/lib/validations/tournament-wizard";

// One image slot (square or horizontal) — picks a file, validates type/size,
// converts to WebP client-side, previews it, and hands the converted File up
// via `onFileReady`. Doesn't know or care whether the caller uploads it
// immediately (Settings) or holds onto it until the tournament exists
// (New wizard) — see ThumbnailSection for that branching.
export function ThumbnailUploadField({
  label,
  aspectClassName,
  maxDimension,
  initialUrl,
  disabled,
  onFileReady,
  preserveAspectRatio = false,
}: {
  label: string;
  // Sizes the empty "No image" placeholder box always, and (when
  // preserveAspectRatio is unset) also the cropped preview box once an
  // image is chosen.
  aspectClassName: string;
  maxDimension: number;
  initialUrl: string | null;
  disabled?: boolean;
  onFileReady: (file: File) => Promise<void> | void;
  // Sponsor logos and BeyZ IDs (unlike community/tournament thumbnails,
  // which are meant to crop to a fixed square/banner shape) need the whole
  // image visible — this switches the preview, once a real image exists,
  // to its own natural aspect ratio (object-contain, capped at
  // maxDimension) instead of aspectClassName's fixed shape via
  // object-cover.
  preserveAspectRatio?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);

    if (!ALLOWED_THUMBNAIL_TYPES.includes(file.type)) {
      setError("Only JPG, PNG, or WebP files are allowed.");
      return;
    }
    if (file.size > MAX_THUMBNAIL_INPUT_BYTES) {
      setError("File must be 8MB or smaller.");
      return;
    }

    setBusy(true);
    try {
      const webpBlob = await fileToWebp(file, maxDimension);
      const webpFile = new File([webpBlob], "image.webp", { type: "image/webp" });
      await onFileReady(webpFile);
      setPreviewUrl(URL.createObjectURL(webpBlob));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-on-surface">{label}</p>
      {previewUrl ? (
        preserveAspectRatio ? (
          <div className="flex items-center justify-center overflow-hidden border border-outline-variant/40 bg-surface-container-low p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="" className="max-h-72 w-auto max-w-full object-contain" />
          </div>
        ) : (
          <div className={`flex items-center justify-center overflow-hidden border border-outline-variant/40 bg-surface-container-low ${aspectClassName}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="" className="h-full w-full object-cover" />
          </div>
        )
      ) : (
        <div className={`flex items-center justify-center overflow-hidden border border-outline-variant/40 bg-surface-container-low ${aspectClassName}`}>
          <span className="text-xs text-on-surface/40">No image</span>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        disabled={disabled}
        onChange={handleFileChange}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        tooltip="JPG, PNG, or WebP — JPG/PNG are converted to WebP automatically"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? "Processing..." : previewUrl ? "Replace Image" : "Upload Image"}
      </Button>
      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
    </div>
  );
}
