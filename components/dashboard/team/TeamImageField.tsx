"use client";

import { useRef, useState } from "react";
import { useBusyTransition } from "@/components/dashboard/DashboardBusy";
import { useRouter } from "next/navigation";
import { ImageIcon, Trash2, Upload } from "lucide-react";

import { removeTeamImage, uploadTeamImage, type TeamImageKind } from "@/app/account/team/actions";
import { Button } from "@/components/ui/button";
import { fileToWebp } from "@/lib/images/to-webp";
import { MAX_TEAM_COVER_BYTES, MAX_TEAM_LOGO_BYTES } from "@/lib/validations/team";
import { cn } from "@/lib/utils";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;

export function TeamImageField({ teamId, kind, initialUrl }: { teamId: string; kind: TeamImageKind; initialUrl: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(initialUrl);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useBusyTransition();
  const isLogo = kind === "logo";

  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    if (!ACCEPTED.includes(file.type)) return setError("Use a JPG, PNG or WebP image.");
    if (file.size > MAX_SOURCE_BYTES) return setError("That file is over 10 MB.");

    startTransition(async () => {
      try {
        const blob = await fileToWebp(file, isLogo ? 512 : 1920, 0.85);
        if (blob.size > (isLogo ? MAX_TEAM_LOGO_BYTES : MAX_TEAM_COVER_BYTES)) {
          setError("That image is still too large after compression. Try a smaller one.");
          return;
        }
        const formData = new FormData();
        formData.append("file", new File([blob], `${kind}.webp`, { type: "image/webp" }));
        const result = await uploadTeamImage(teamId, kind, formData);
        if (result.status === "error") return setError(result.message ?? "Upload failed.");
        setUrl(result.url ?? null);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't process that image.");
      }
    });
  };

  const onRemove = () =>
    startTransition(async () => {
      setError(null);
      const result = await removeTeamImage(teamId, kind);
      if (result.status === "error") return setError(result.message ?? "Couldn't remove it.");
      setUrl(null);
      router.refresh();
    });

  return (
    <div className={cn("flex gap-4", isLogo ? "items-center" : "flex-col")}>
      <div
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-outline-variant/25 bg-surface-container",
          isLogo ? "h-20 w-20" : "aspect-[4/1] w-full"
        )}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImageIcon className="h-5 w-5 text-on-surface/30" aria-hidden="true" />
        )}
      </div>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={pending}>
            <Upload /> {pending ? "Uploading…" : url ? "Replace" : "Upload"}
          </Button>
          {url ? (
            <Button type="button" variant="ghost" size="sm" onClick={onRemove} disabled={pending}>
              <Trash2 /> Remove
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-on-surface/45">
          {isLogo ? "Square image, at least 256×256." : "Wide image, around 1600×400."} JPG, PNG or WebP.
        </p>
        {error ? <p className="text-xs text-primary">{error}</p> : null}
        <input ref={inputRef} type="file" accept={ACCEPTED.join(",")} className="hidden" onChange={onFile} />
      </div>
    </div>
  );
}
