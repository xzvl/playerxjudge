import "server-only";

import { after } from "next/server";
import sharp from "sharp";

import { createAdminClient } from "@/lib/supabase/admin";

// Image optimization backfill for /backend/content/images.
//
// "Optimized" means the original is WebP and all four size variants exist
// next to it:
//   photo.webp            original (WebP)
//   photo-thumbnail.webp  150×150, cropped to fill
//   photo-small.webp      fits in 320 px
//   photo-medium.webp     fits in 768 px
//   photo-large.webp      fits in 1280 px
// Variants never upscale. A non-WebP original (e.g. a PNG from before
// uploads were converted in the browser) gets a WebP copy beside it, and
// every database URL that pointed at the old file is switched over; the
// old file is kept so nothing that cached its URL breaks.

export const IMAGE_SIZES = {
  thumbnail: { width: 150, height: 150, fit: "cover" as const },
  small: { width: 320, height: 320, fit: "inside" as const },
  medium: { width: 768, height: 768, fit: "inside" as const },
  large: { width: 1280, height: 1280, fit: "inside" as const },
};
export type ImageSizeName = keyof typeof IMAGE_SIZES;
export const IMAGE_SIZE_NAMES = Object.keys(IMAGE_SIZES) as ImageSizeName[];

// Public buckets holding site imagery. Match screenshots and payment
// proofs are evidence, not display images, so they're left alone.
export const OPTIMIZABLE_BUCKETS = [
  "beyblade-images",
  "community-logos",
  "profile-photos",
  "sponsor-logos",
  "team-images",
  "tournament-thumbnails",
  "site-assets",
] as const;
export type OptimizableBucket = (typeof OPTIMIZABLE_BUCKETS)[number];

// Where each bucket's public URLs are stored, so a converted original can
// be re-pointed. site-assets URLs live inside site_settings JSON instead.
const URL_COLUMNS: Record<OptimizableBucket, { table: string; columns: string[] }[]> = {
  "beyblade-images": [
    { table: "beyblades", columns: ["image_url"] },
    { table: "beyblade_variations", columns: ["image_url"] },
  ],
  "community-logos": [{ table: "communities", columns: ["logo_url", "alt_logo_url", "pin_logo_url"] }],
  "profile-photos": [
    { table: "profiles", columns: ["avatar_url", "main_photo_url", "full_body_photo_url", "half_body_photo_url", "beyz_id_url"] },
  ],
  "sponsor-logos": [{ table: "sponsors", columns: ["logo_url", "logo_light_url"] }],
  "team-images": [{ table: "teams", columns: ["logo_url", "cover_url"] }],
  "tournament-thumbnails": [{ table: "tournaments", columns: ["thumbnail_url", "banner_url", "preregistration_qr_url"] }],
  "site-assets": [],
};

const SOURCE_EXT = /\.(webp|png|jpe?g|gif|avif)$/i;
const VARIANT_RE = new RegExp(`-(${IMAGE_SIZE_NAMES.join("|")})\\.webp$`, "i");

export interface StoredImage {
  bucket: OptimizableBucket;
  path: string;
  url: string;
  size: number;
  updatedAt: string | null;
  isWebp: boolean;
  variants: Record<ImageSizeName, boolean>;
  optimized: boolean;
}

const stripExt = (path: string) => path.replace(/\.[^./]+$/, "");
export const variantPath = (path: string, size: ImageSizeName) => `${stripExt(path)}-${size}.webp`;

type Admin = ReturnType<typeof createAdminClient>;
type ListedFile = { path: string; size: number; updatedAt: string | null };

// Every file in a bucket, walking folders (Storage lists one level at a time).
async function listBucket(admin: Admin, bucket: string): Promise<ListedFile[]> {
  const files: ListedFile[] = [];
  const queue: string[] = [""];
  const PAGE = 1000;
  const CONCURRENCY = 8;

  async function listFolder(prefix: string) {
    for (let offset = 0; ; offset += PAGE) {
      const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: PAGE, offset, sortBy: { column: "name", order: "asc" } });
      if (error || !data) return;
      for (const item of data) {
        const full = prefix ? `${prefix}/${item.name}` : item.name;
        // Folders come back with a null id.
        if (item.id === null) queue.push(full);
        else if (item.name !== ".emptyFolderPlaceholder") {
          const meta = (item.metadata ?? {}) as { size?: number };
          files.push({ path: full, size: meta.size ?? 0, updatedAt: item.updated_at ?? item.created_at ?? null });
        }
      }
      if (data.length < PAGE) return;
    }
  }

  while (queue.length > 0) {
    const batch = queue.splice(0, CONCURRENCY);
    await Promise.all(batch.map(listFolder));
  }
  return files;
}

export async function listStoredImages(): Promise<StoredImage[]> {
  const admin = createAdminClient();
  const perBucket = await Promise.all(
    OPTIMIZABLE_BUCKETS.map(async (bucket) => ({ bucket, files: await listBucket(admin, bucket) }))
  );

  const images: StoredImage[] = [];
  for (const { bucket, files } of perBucket) {
    const names = new Set(files.map((f) => f.path));
    for (const file of files) {
      if (!SOURCE_EXT.test(file.path) || VARIANT_RE.test(file.path)) continue;
      const isWebp = /\.webp$/i.test(file.path);
      // A PNG whose WebP twin already exists was converted earlier; the
      // WebP is the one that counts.
      if (!isWebp && names.has(`${stripExt(file.path)}.webp`)) continue;

      const variants = Object.fromEntries(
        IMAGE_SIZE_NAMES.map((size) => [size, names.has(variantPath(file.path, size))])
      ) as Record<ImageSizeName, boolean>;
      images.push({
        bucket,
        path: file.path,
        url: admin.storage.from(bucket).getPublicUrl(file.path).data.publicUrl,
        size: file.size,
        updatedAt: file.updatedAt,
        isWebp,
        variants,
        optimized: isWebp && IMAGE_SIZE_NAMES.every((s) => variants[s]),
      });
    }
  }
  return images.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
}

async function repointUrls(admin: Admin, bucket: OptimizableBucket, oldUrl: string, newUrl: string) {
  // Stored URLs often carry a ?v= cache buster, hence the prefix match.
  const escaped = oldUrl.replace(/[\\%_]/g, (c) => `\\${c}`);
  for (const { table, columns } of URL_COLUMNS[bucket]) {
    for (const column of columns) {
      // Best effort per column: a column that doesn't exist just errors.
      await admin
        .from(table as "profiles")
        .update({ [column]: newUrl } as never)
        .like(column as "id", `${escaped}%`);
    }
  }

  if (bucket === "site-assets") {
    const { data } = await admin.from("site_settings").select("key, value");
    for (const row of (data as { key: string; value: unknown }[] | null) ?? []) {
      const before = JSON.stringify(row.value);
      if (!before.includes(oldUrl)) continue;
      const after = JSON.parse(before.split(oldUrl).join(newUrl));
      await admin.from("site_settings").update({ value: after }).eq("key", row.key);
    }
  }
}

export interface OptimizeResult {
  path: string;
  converted: boolean;
}

export async function optimizeStoredImage(bucket: OptimizableBucket, path: string): Promise<OptimizeResult> {
  if (!OPTIMIZABLE_BUCKETS.includes(bucket)) throw new Error("That bucket isn't optimizable.");
  if (path.includes("..") || VARIANT_RE.test(path) || !SOURCE_EXT.test(path)) throw new Error("Not an original image.");

  const admin = createAdminClient();
  const storage = admin.storage.from(bucket);

  const { data: blob, error } = await storage.download(path);
  if (error || !blob) throw new Error(error?.message ?? "Couldn't download the image.");
  const input = Buffer.from(await blob.arrayBuffer());
  // .rotate() applies EXIF orientation before the metadata is dropped.
  const base = sharp(input, { failOn: "none", animated: false }).rotate();

  let originalPath = path;
  let converted = false;
  if (!/\.webp$/i.test(path)) {
    originalPath = `${stripExt(path)}.webp`;
    const webp = await base.clone().webp({ quality: 85 }).toBuffer();
    const { error: upErr } = await storage.upload(originalPath, webp, { contentType: "image/webp", upsert: true });
    if (upErr) throw new Error(upErr.message);
    converted = true;
  }

  await Promise.all(
    IMAGE_SIZE_NAMES.map(async (size) => {
      const { width, height, fit } = IMAGE_SIZES[size];
      const out = await base
        .clone()
        .resize({ width, height, fit, withoutEnlargement: true, position: "attention" })
        .webp({ quality: size === "thumbnail" ? 80 : 82 })
        .toBuffer();
      const { error: upErr } = await storage.upload(variantPath(originalPath, size), out, {
        contentType: "image/webp",
        upsert: true,
        cacheControl: "31536000",
      });
      if (upErr) throw new Error(upErr.message);
    })
  );

  if (converted) {
    await repointUrls(admin, bucket, storage.getPublicUrl(path).data.publicUrl, storage.getPublicUrl(originalPath).data.publicUrl);
  }

  return { path: originalPath, converted };
}

// Generates the size variants for a freshly uploaded image once the
// response has been sent (so uploads don't wait on it). Never throws: a
// failure just leaves the image for the backfill in /backend/content/images.
export function queueImageVariants(bucket: OptimizableBucket, path: string) {
  try {
    after(async () => {
      try {
        await optimizeStoredImage(bucket, path);
      } catch {
        // Left for the backfill.
      }
    });
  } catch {
    // Outside a request scope; nothing to schedule against.
  }
}
