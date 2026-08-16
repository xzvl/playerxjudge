"use client";

import { useState } from "react";

import { uploadJudgeBeyzId } from "@/app/account/judge/profile/actions";
import { BeyzIdStatusBadge } from "@/components/dashboard/judge/badges";
import { ThumbnailUploadField } from "@/components/tournaments/wizard/ThumbnailUploadField";
import type { BeyzIdStatus } from "@/lib/types/database";

export function JudgeBeyzIdUploader({
  initialUrl,
  initialStatus,
}: {
  initialUrl: string | null;
  initialStatus: BeyzIdStatus | null;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState<string | null>(null);

  async function handleFileReady(file: File) {
    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadJudgeBeyzId(formData);
    if (result.status === "error") {
      setError(result.message ?? "Upload failed.");
      return;
    }
    setError(null);
    setStatus("pending");
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium text-on-surface">BeyZ ID</p>
        <BeyzIdStatusBadge status={status} />
      </div>
      <ThumbnailUploadField
        label="BeyZ ID Image"
        aspectClassName="aspect-square w-full max-w-[220px]"
        maxDimension={1000}
        initialUrl={initialUrl}
        onFileReady={handleFileReady}
        preserveAspectRatio
      />
      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
      <p className="text-xs text-on-surface/50">
        Don&apos;t have a BeyZ ID yet? Generate one at{" "}
        <a href="https://bey-z-generation.web.app/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          bey-z-generation.web.app
        </a>
        , then upload the image here. An admin reviews every submission before it&apos;s confirmed.
      </p>
    </div>
  );
}
