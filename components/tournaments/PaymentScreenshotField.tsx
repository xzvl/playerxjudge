"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { fileToWebp } from "@/lib/images/to-webp";
import { ALLOWED_THUMBNAIL_TYPES, MAX_THUMBNAIL_INPUT_BYTES } from "@/lib/validations/tournament-wizard";

interface FileMeta {
  name: string;
  sizeBytes: number;
  width: number;
  height: number;
}

function loadImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(blob);
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(objectUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Couldn't read the image."));
    };
    img.src = objectUrl;
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

// A compact row-style image upload field — label above, a small 60px preview
// thumbnail on the left, and the file name/size/dimensions plus an
// upload/replace button on the right. Distinct from ThumbnailUploadField's
// big-preview-box layout (built for banners/QR codes); this one suits a
// receipt-style upload where the metadata matters more than a large
// preview — see PreRegisterDialog's "Payment Screenshot" field.
export function PaymentScreenshotField({
  label,
  maxDimension,
  disabled,
  onFileReady,
}: {
  label: string;
  maxDimension: number;
  disabled?: boolean;
  onFileReady: (file: File) => Promise<void> | void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [meta, setMeta] = useState<FileMeta | null>(null);
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
      const { width, height } = await loadImageDimensions(webpBlob);
      const webpFile = new File([webpBlob], "payment-screenshot.webp", { type: "image/webp" });
      await onFileReady(webpFile);
      setPreviewUrl(URL.createObjectURL(webpBlob));
      setMeta({ name: file.name, sizeBytes: webpBlob.size, width, height });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-on-surface">{label}</p>
      <div className="flex items-center gap-3 border border-outline-variant/40 bg-surface-container-low p-3">
        <div className="flex h-[60px] w-[60px] shrink-0 items-center justify-center overflow-hidden border border-outline-variant/30 bg-surface-container-lowest">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="px-1 text-center text-[9px] leading-tight text-on-surface/30">No image</span>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="truncate text-sm text-on-surface">{meta?.name ?? "No image selected"}</p>
          <p className="text-xs text-on-surface/40">
            {meta ? `${formatFileSize(meta.sizeBytes)} · ${meta.width}×${meta.height}px` : "No size yet"}
          </p>
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
            {busy ? "Processing..." : previewUrl ? "Replace" : "Upload"}
          </Button>
        </div>
      </div>
      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
    </div>
  );
}
