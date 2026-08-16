import { createClient } from "@/lib/supabase/server";
import type { StaticPage, StaticPageSlug } from "@/lib/types/database";

// Shared fetch behind both the /backend editors and the public Privacy/
// Terms/How to Use pages — see 20250101000037_backend_admin.sql. Falls
// back to a minimal placeholder rather than 404ing if the seed row is
// somehow missing (e.g. a fresh database the seed insert hasn't run on).
export async function getStaticPage(slug: StaticPageSlug): Promise<StaticPage> {
  const supabase = await createClient();
  const { data } = await supabase.from("static_pages").select("*").eq("slug", slug).maybeSingle();
  if (data) return data as StaticPage;

  return { id: slug, slug, title: slug, body: "This page hasn't been published yet.", updated_at: new Date().toISOString(), updated_by: null };
}
