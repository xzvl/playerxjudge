"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { checkCommunitySlugAvailable } from "@/app/account/organizer/community/shared-actions";
import { updateCommunity } from "@/app/account/organizer/community/[slug]/settings/actions";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CommunityLogoSection } from "@/components/dashboard/organizer/CommunityLogoSection";
import { CommunityLocationSection } from "@/components/dashboard/organizer/CommunityLocationSection";
import { COMMUNITY_STATUS_OPTIONS, createCommunitySchema, type CreateCommunityInput } from "@/lib/validations/community";
import type { CommunityRow } from "@/lib/types/database";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function communityToFormValues(community: CommunityRow): CreateCommunityInput {
  return {
    name: community.name,
    slug: community.slug,
    headquarterName: community.headquarter_name ?? "",
    addressLine: community.address_line ?? "",
    city: community.city ?? "",
    province: community.province ?? "",
    latitude: community.latitude,
    longitude: community.longitude,
    facebookUrl: community.facebook_url ?? "",
    instagramUrl: community.instagram_url ?? "",
    youtubeUrl: community.youtube_url ?? "",
    messengerUrl: community.messenger_url ?? "",
    startedAt: community.started_at ?? "",
    status: community.status,
  };
}

export function CommunitySettingsForm({ community }: { community: CommunityRow }) {
  const router = useRouter();
  const [serverMessage, setServerMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<CreateCommunityInput>({
    resolver: zodResolver(createCommunitySchema),
    defaultValues: communityToFormValues(community),
  });

  const slugTouched = useRef(false);
  const slug = form.watch("slug");
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");

  useEffect(() => {
    if (!slug || slug === community.slug || slug.length < 3 || form.formState.errors.slug) {
      setSlugStatus("idle");
      return;
    }
    setSlugStatus("checking");
    const handle = setTimeout(async () => {
      const result = await checkCommunitySlugAvailable(slug, community.id);
      setSlugStatus(result.available ? "available" : "taken");
    }, 500);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function onSubmit(values: CreateCommunityInput) {
    setSubmitting(true);
    setServerMessage(null);
    const result = await updateCommunity(community.id, community.slug, values);
    setSubmitting(false);

    if (result.status === "error") {
      setServerMessage({ type: "error", text: result.message ?? "Something went wrong." });
      return;
    }
    if (result.slug && result.slug !== community.slug) {
      router.push(`/account/organizer/community/${result.slug}/settings`);
      return;
    }
    setServerMessage({ type: "success", text: "Saved." });
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Basic Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Community Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        if (!slugTouched.current) {
                          form.setValue("slug", slugify(e.target.value), { shouldValidate: true });
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Slug</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 text-sm text-on-surface/40">/communities/</span>
                      <Input
                        {...field}
                        onChange={(e) => {
                          slugTouched.current = true;
                          field.onChange(slugify(e.target.value));
                        }}
                      />
                    </div>
                  </FormControl>
                  {slugStatus === "checking" ? <p className="text-xs text-on-surface/40">Checking availability...</p> : null}
                  {slugStatus === "available" ? <p className="text-xs text-primary">Available.</p> : null}
                  {slugStatus === "taken" ? <p className="text-xs text-destructive">Already taken — try another.</p> : null}
                  <FormMessage />
                </FormItem>
              )}
            />

            <CommunityLogoSection
              communityId={community.id}
              initialLogoUrl={community.logo_url}
              initialAltUrl={community.alt_logo_url}
              initialPinUrl={community.pin_logo_url}
              initialUseLogoForAlt={community.alt_logo_url !== null && community.alt_logo_url === community.logo_url}
              initialUseLogoForPin={community.pin_logo_url !== null && community.pin_logo_url === community.logo_url}
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="startedAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Community Started Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                <p className="text-sm font-bold text-on-surface">Status</p>
                <SegmentedControl
                  value={form.watch("status")}
                  onChange={(v) => form.setValue("status", v, { shouldValidate: true })}
                  options={COMMUNITY_STATUS_OPTIONS}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Community Location</CardTitle>
          </CardHeader>
          <CardContent>
            <CommunityLocationSection pinIconUrl={community.pin_logo_url} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Social Media</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="facebookUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Facebook</FormLabel>
                  <FormControl>
                    <Input placeholder="facebook.com/yourcommunity" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="instagramUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instagram</FormLabel>
                  <FormControl>
                    <Input placeholder="instagram.com/yourcommunity" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="youtubeUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>YouTube</FormLabel>
                  <FormControl>
                    <Input placeholder="youtube.com/@yourcommunity" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="messengerUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Messenger</FormLabel>
                  <FormControl>
                    <Input placeholder="m.me/yourcommunity" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {serverMessage ? (
          <p
            role={serverMessage.type === "error" ? "alert" : "status"}
            className={serverMessage.type === "error" ? "text-sm text-destructive" : "text-sm text-primary"}
          >
            {serverMessage.text}
          </p>
        ) : null}

        <Button type="submit" size="lg" tooltip="Save changes to this community" disabled={submitting}>
          {submitting ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </Form>
  );
}
