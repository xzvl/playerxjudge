"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createCommunity } from "@/app/account/organizer/community/new/actions";
import { checkCommunitySlugAvailable, uploadCommunityLogo, applyCommunityLogoAs } from "@/app/account/organizer/community/shared-actions";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CommunityLogoSection } from "@/components/dashboard/organizer/CommunityLogoSection";
import { CommunityLocationSection } from "@/components/dashboard/organizer/CommunityLocationSection";
import { createCommunitySchema, DEFAULT_CREATE_COMMUNITY_VALUES, type CreateCommunityInput } from "@/lib/validations/community";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function CreateCommunityWizard() {
  const router = useRouter();
  const [serverMessage, setServerMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [altFile, setAltFile] = useState<File | null>(null);
  const [pinFile, setPinFile] = useState<File | null>(null);
  const [useLogoForAlt, setUseLogoForAlt] = useState(false);
  const [useLogoForPin, setUseLogoForPin] = useState(false);

  const form = useForm<CreateCommunityInput>({
    resolver: zodResolver(createCommunitySchema),
    defaultValues: DEFAULT_CREATE_COMMUNITY_VALUES,
  });

  const slugTouched = useRef(false);
  const slug = form.watch("slug");
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");

  useEffect(() => {
    if (!slug || slug.length < 3 || form.formState.errors.slug) {
      setSlugStatus("idle");
      return;
    }
    setSlugStatus("checking");
    const handle = setTimeout(async () => {
      const result = await checkCommunitySlugAvailable(slug);
      setSlugStatus(result.available ? "available" : "taken");
    }, 500);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function onSubmit(values: CreateCommunityInput) {
    setSubmitting(true);
    setServerMessage(null);
    const result = await createCommunity(values);

    if (result.status === "error") {
      setSubmitting(false);
      setServerMessage({ type: "error", text: result.message ?? "Something went wrong." });
      return;
    }

    // Logos only have somewhere to go once the community row (and its id)
    // exists — same reasoning as ThumbnailSection's deferred upload in the
    // tournament wizard.
    if (result.id) {
      if (logoFile) {
        const formData = new FormData();
        formData.set("file", logoFile);
        await uploadCommunityLogo(result.id, "logo", formData);
      }
      if (useLogoForAlt) {
        await applyCommunityLogoAs(result.id, "alt");
      } else if (altFile) {
        const formData = new FormData();
        formData.set("file", altFile);
        await uploadCommunityLogo(result.id, "alt", formData);
      }
      if (useLogoForPin) {
        await applyCommunityLogoAs(result.id, "pin");
      } else if (pinFile) {
        const formData = new FormData();
        formData.set("file", pinFile);
        await uploadCommunityLogo(result.id, "pin", formData);
      }
    }

    router.push("/account/organizer/community");
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
              communityId={null}
              initialLogoUrl={null}
              initialAltUrl={null}
              initialPinUrl={null}
              onLogoFileReady={setLogoFile}
              onAltFileReady={setAltFile}
              onPinFileReady={setPinFile}
              onUseLogoForAltChange={setUseLogoForAlt}
              onUseLogoForPinChange={setUseLogoForPin}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Community Location</CardTitle>
          </CardHeader>
          <CardContent>
            <CommunityLocationSection />
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

        <Button type="submit" size="lg" tooltip="Submit this community for creation" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit Application"}
        </Button>
      </form>
    </Form>
  );
}
