"use client";

import { useRef, useState } from "react";

import { uploadProfilePhoto } from "@/app/account/settings/actions";
import { Button } from "@/components/ui/button";
import { ALLOWED_PHOTO_TYPES, MAX_PHOTO_BYTES, type PhotoSlot } from "@/lib/validations/settings";

const SLOT_LABELS: Record<PhotoSlot, string> = {
  main: "Main Photo",
  full_body: "Full Body Photo",
  half_body: "Half Body Photo",
};

function fileToWebp(file: File, maxDimension = 1024, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        const scale = maxDimension / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Canvas isn't supported in this browser."));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);
          if (blob) resolve(blob);
          else reject(new Error("Couldn't convert image to WebP."));
        },
        "image/webp",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Couldn't load the selected image."));
    };
    img.src = objectUrl;
  });
}

function PhotoSlotUploader({ slot, initialUrl }: { slot: PhotoSlot; initialUrl: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);

    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      setError("Only JPG and PNG files are allowed.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError("File must be 250KB or smaller.");
      return;
    }

    setUploading(true);
    try {
      const webpBlob = await fileToWebp(file);
      const webpFile = new File([webpBlob], `${slot}.webp`, { type: "image/webp" });
      const formData = new FormData();
      formData.set("file", webpFile);
      const result = await uploadProfilePhoto(slot, formData);
      if (result.status === "error") {
        setError(result.message ?? "Upload failed.");
      } else {
        setPreviewUrl(URL.createObjectURL(webpBlob));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-bold text-on-surface">{SLOT_LABELS[slot]}</p>
      <div className="flex h-40 w-32 items-center justify-center overflow-hidden border border-outline-variant/40 bg-surface-container-low">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-xs text-on-surface/40">No photo</span>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        tooltip="Choose a JPG or PNG, 250KB or smaller"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? "Uploading..." : "Upload Photo"}
      </Button>
      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
    </div>
  );
}

export function PhotoUploadForm({
  mainPhotoUrl,
  fullBodyPhotoUrl,
  halfBodyPhotoUrl,
}: {
  mainPhotoUrl: string | null;
  fullBodyPhotoUrl: string | null;
  halfBodyPhotoUrl: string | null;
}) {
  return (
    <div className="flex flex-wrap gap-6">
      <PhotoSlotUploader slot="main" initialUrl={mainPhotoUrl} />
      <PhotoSlotUploader slot="full_body" initialUrl={fullBodyPhotoUrl} />
      <PhotoSlotUploader slot="half_body" initialUrl={halfBodyPhotoUrl} />
    </div>
  );
}
