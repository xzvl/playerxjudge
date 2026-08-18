-- ============================================================
-- Real starter content for the three "still-hardcoded-placeholder" pages
-- called out in 20250101000037_backend_admin.sql: Privacy Policy, Terms &
-- Conditions (static_pages), and FAQs.
--
-- Privacy Policy / Terms & Conditions bodies use a light markdown-lite
-- convention parsed by lib/legal-content.ts and rendered by
-- components/legal/LegalDocumentLayout.tsx (same section/quick-link look
-- as /rules):
--   "## Heading"  -> starts a new section (its id is the slugified heading)
--   "- item"      -> a bullet list item
--   blank line    -> paragraph break
-- Edit this content going forward from /backend/privacy-policy and
-- /backend/terms — this migration only seeds the initial copy.
--
-- The FAQ rows below replace the 3-item placeholder set that shipped in
-- supabase/seed.sql (that block is now a pointer back to this migration —
-- see the comment there — so re-running seed.sql won't duplicate these).
-- ============================================================

update public.static_pages set
  title = 'Privacy Policy',
  body = $pp$This Privacy Policy explains what information PlayerXJudge collects when you create an account, register for tournaments, judge or organize events, or list your community or sponsorship, and how that information is used, shared, and protected.

## Information We Collect
- Account details you provide when you register: email address, username, display name, and password (handled by our authentication provider — we never see or store your raw password).
- Profile information you add in Account Settings: first and last name, country, province, city, favorite Beyblade, bio, social links, and blader (in-battle) names.
- Photos you upload: your avatar, main photo, full-body photo, and half-body photo, each converted to WebP on upload.
- Identity verification: a Beyz ID photo submitted by players applying to judge, used only to confirm your identity before a judge application is approved.
- Tournament activity: pre-registrations, participant links, match results, scores, and reports you file or are named in.
- Community and role data: the communities you join or own, judge assignments, and role applications for Judge, Organizer, or Sponsor.
- Beyblade collection data: the Beyblades, combos, and decks you build in your account.
- Payment records: the amount, currency, payment method (GCash, Maya, or bank transfer), and reference number for subscription payments and paid tournament entries. We do not collect or store your card, GCash, or Maya account credentials — those are handled by the payment channel you use.
- Technical data: basic usage analytics collected through Vercel Analytics, and standard server logs.

## How We Use Your Information
- Create and secure your account, and let you sign in with email/password or Google.
- Run tournaments: matching you to brackets, matches, stations, and judges, and showing your registration and results to the organizers and judges of the event you joined.
- Review and approve applications to become a Judge, Organizer, or Sponsor, including verifying identity documents where required.
- Process subscription and tournament payments and keep a record of what was paid, when, and how.
- Show your public profile, blader names, and tournament results to other users on leaderboards, community pages, and tournament pages.
- Send you tournament, registration, match, and system notifications.
- Moderate the platform, including reviewing reports and, where necessary, suspending accounts that violate these policies.
- Improve the platform using aggregated, non-identifying usage analytics.

## Photo & Identity Verification
Profile photos are visible to other users and, where relevant, to tournament organizers and judges for check-in purposes. Beyz ID photos submitted with a Judge application are reviewed by administrators solely to verify identity and are not shown publicly; the application is marked pending, approved, or declined.

## Cookies & Analytics
We use essential cookies to keep you signed in and to protect the sign-in process. We use Vercel Analytics to understand overall traffic and usage patterns; this does not include a persistent tracking cookie that follows you across other sites.

## Payments
Subscription and paid tournament entries are currently processed manually through GCash, Maya, or bank transfer. You submit a reference number that an organizer or admin confirms; PlayerXJudge does not receive or store your banking or e-wallet login credentials.

## How We Share Information
- With tournament organizers, judges, and community owners, limited to the information needed to run the event or community you're part of (registration status, blader names, match results).
- With other users, limited to what your public profile and tournament results show — we never display your email address, full legal name, or payment details publicly.
- With service providers that host our infrastructure (Supabase for database, authentication, and file storage; Vercel for hosting and analytics; Resend for transactional email), strictly to operate the platform.
- When required by law, or to protect the safety, rights, or property of PlayerXJudge, our community, or the public.
- We do not sell your personal information.

## Data Retention
We keep your account and tournament history for as long as your account is active, so results and standings remain accurate for the communities and tournaments you took part in. If you'd like your account removed, contact us — see Contact Us below.

## Your Rights & Choices
- Access and update most of your profile information at any time in Account Settings.
- Change your password from Account Settings.
- Request a copy of your data, or ask us to delete your account, by contacting us.
- Suspended ("banned") accounts are a moderation action taken by administrators for rule violations and are separate from account deletion.

## Children's Privacy
PlayerXJudge is intended for the Beyblade X community broadly, including younger players participating with a parent or guardian's involvement. We don't knowingly collect more information from a child than is needed to register for and take part in a tournament. If you believe a child's account was created without appropriate consent, contact us and we will review it.

## Security
Row Level Security is enabled on every table in our database, so data is only readable and writable by the people who are meant to see it. Authentication and password storage are handled by Supabase Auth. All traffic to the site is encrypted (HTTPS).

## Changes to This Policy
We may update this Privacy Policy as the platform grows. Material changes will be reflected on this page with an updated "Last updated" date.

## Contact Us
Questions about this Privacy Policy or your data can be sent to our support team through the contact details listed on the site.$pp$
where slug = 'privacy-policy';

update public.static_pages set
  title = 'Terms & Conditions',
  body = $tc$These Terms and Conditions govern your use of PlayerXJudge — our tournament registration, judging, community, and Beyblade deck-building platform. By creating an account, you agree to these terms.

## Acceptance of Terms
By registering an account, pre-registering for a tournament, or applying for a role on PlayerXJudge, you agree to these Terms and Conditions and to the Beyblade X Regulations enforced at every event.

## Eligibility & Accounts
- You must provide accurate information when creating your account and keep your profile up to date.
- You are responsible for activity under your account and for keeping your password secure.
- One account per person. Accounts found to be duplicated to manipulate standings, registrations, or votes may be suspended.
- Players under the age of majority in their region should have a parent or guardian's involvement when registering for paid or in-person events.

## Roles & Applications
- Player is the default role for every account. Judge, Organizer, and Sponsor are additional roles you apply for through Become a Judge, Become an Organizer, or Become a Sponsor.
- Role applications are reviewed by administrators and may require supporting information, including an identity photo for Judge applications, before approval.
- Judges are assigned to specific communities and tournaments, and their access is limited to the events they're assigned to.
- Administrators may revoke a role at any time for a violation of these terms or the Beyblade X Regulations.

## Tournament Registration & Participation
- Pre-registering for a tournament reserves your spot subject to the organizer's confirmation and, for paid events, confirmation of payment.
- You must complete Beyblade and launcher checks and follow all judge instructions at the event, per the Beyblade X Regulations (see /rules).
- Organizers may set additional rules for their tournament (format, prize structure, check-in requirements); those rules apply alongside these Terms.
- Judge decisions on finishes, restarts, and penalties are final. Disputes are handled through the tournament's report process, not by contacting PlayerXJudge support after the fact.
- Withdrawing after confirming registration may affect your standing in future events at the organizer's discretion.

## Communities & Sponsorship
- Anyone can create or join a community. Joining an existing community requires the community owner or organizer's approval.
- Community owners and organizers are responsible for the tournaments and members they manage, within these Terms and the Beyblade X Regulations.
- Sponsor listings and donation tiers are reviewed and approved by administrators before appearing publicly.

## Beyblade Decks & Content
- The Beyblades, combos, and decks you register are for planning and reference; only officially released, unmodified parts may be used in an actual tournament match, per the Beyblade X Regulations.
- You're responsible for the accuracy of the content you submit — profile info, blader names, community descriptions, tournament details, and reports.
- Don't upload content that is offensive, infringing, or that impersonates someone else.

## Subscriptions & Payments
- PlayerXJudge offers a Free plan and a paid Premium plan. Premium pricing and included features are shown at checkout and may change with notice.
- Supported payment methods today are GCash, Maya, and manual bank transfer. Card payments may be added in the future.
- Subscription payments are billed on the cycle shown at signup and can be set to stop renewing at the end of the current period.
- Paid tournament entries follow the same payment methods; a payment is confirmed once the organizer or admin verifies your reference number.
- Refunds for subscriptions or tournament entries are handled case-by-case — contact the organizer (for tournament entries) or PlayerXJudge support (for subscriptions).

## Conduct
- Follow the Beyblade X Regulations, community guidelines, and judge instructions at every event.
- Don't cheat, modify parts outside the regulations, harass other players, judges, or organizers, or attempt to manipulate tournament results.
- Don't use the platform to spam, scrape, or interfere with its normal operation.

## Suspension & Termination
Violating these Terms or the Beyblade X Regulations may result in a warning, match forfeiture, disqualification from an event, or suspension of your account by an administrator. We may suspend or restrict access to protect the platform, its users, or the integrity of a tournament.

## Disclaimers & Limitation of Liability
PlayerXJudge is a tournament management and community platform; we don't manufacture or guarantee Beyblade X products, and we aren't responsible for injuries, lost items, or disputes arising at physical events beyond providing the tools organizers and judges use to run them fairly. The platform is provided "as is" without warranties of any kind, to the extent permitted by law.

## Changes to These Terms
We may update these Terms as the platform grows. Continuing to use PlayerXJudge after a change means you accept the updated Terms. Material changes will be reflected on this page with an updated "Last updated" date.

## Contact Us
Questions about these Terms can be sent to our support team through the contact details listed on the site.$tc$
where slug = 'terms-of-service';

insert into public.faqs (question, answer, category, sort_order) values
  ($q$What is PlayerXJudge?$q$, $q$PlayerXJudge is a community tournament management platform for Beyblade X — find and register for tournaments, track results on the leaderboard, join a community, and build your Beyblade decks, all in one place.$q$, 'Getting Started', 1),
  ($q$How do I create an account?$q$, $q$Click Sign Up and register with an email and password, or continue with Google. You can fill in your profile — blader names, photos, and community — from Account Settings afterward.$q$, 'Getting Started', 2),
  ($q$I forgot my password. How do I reset it?$q$, $q$On the login page, choose "Forgot password" and follow the email link to set a new one.$q$, 'Getting Started', 3),

  ($q$How do I register for a tournament?$q$, $q$Open the tournament's details page and click Pre-register (or Register Now once registration opens). Paid tournaments ask for payment confirmation before your spot is locked in.$q$, 'Tournaments', 4),
  ($q$What happens after I pre-register?$q$, $q$The organizer confirms your registration — and payment, for paid events. You'll get a notification once you're confirmed, checked in, or if your registration needs attention.$q$, 'Tournaments', 5),
  ($q$Can I withdraw from a tournament after registering?$q$, $q$Yes, from the tournament page, though withdrawing after confirmation may be noted by the organizer for future events.$q$, 'Tournaments', 6),
  ($q$How are brackets and matches decided?$q$, $q$The organizer sets the bracket format for the tournament. Once brackets are generated, your matches, stations, and results appear on the tournament page as the event runs.$q$, 'Tournaments', 7),

  ($q$What rules do tournaments follow?$q$, $q$All PlayerXJudge tournaments follow the official Beyblade X Regulations — see the full Rules page for Bey checks, launcher checks, stadium rules, shooting method, and scoring.$q$, 'Judging & Rules', 8),
  ($q$Who scores my matches?$q$, $q$Assigned judges record finishes and scores at their station in real time. Judge decisions on finishes, restarts, and penalties are final.$q$, 'Judging & Rules', 9),
  ($q$I disagree with a match result. What can I do?$q$, $q$Raise it with the judge at the time of the match — decisions are final once made. For a pattern of concerns, use the tournament's report option so organizers and admins can review it.$q$, 'Judging & Rules', 10),

  ($q$How do I join a community?$q$, $q$From Account Settings, pick a community to request to join. The community's owner or an organizer approves the request before you're a member.$q$, 'Communities', 11),
  ($q$Can I create my own community?$q$, $q$Yes — community creation is available to registered players, and new communities are reviewed before they're listed publicly.$q$, 'Communities', 12),
  ($q$What does a community give me?$q$, $q$A home base with its own tournaments, members, and judges, plus community-specific results feeding into your profile and the leaderboard.$q$, 'Communities', 13),

  ($q$What is the deck builder for?$q$, $q$It lets you catalog your Beyblades and combos and build decks for planning and reference. Only officially released, unmodified parts are allowed in an actual tournament match.$q$, 'Beyblades & Decks', 14),
  ($q$Can I use custom or modified parts in a tournament?$q$, $q$No — only genuine, unmodified BEYBLADE X parts assembled as intended are permitted, per the Beyblade X Regulations.$q$, 'Beyblades & Decks', 15),

  ($q$How do I become a judge, organizer, or sponsor?$q$, $q$Use Become a Judge, Become an Organizer, or Become a Sponsor from the site menu. Submit the application — Judge applications include an identity photo — and an administrator will review it.$q$, 'Roles & Applications', 16),
  ($q$How long does a role application take to review?$q$, $q$Review times vary; you'll see your application's status (pending, approved, or declined) and get a notification once a decision is made.$q$, 'Roles & Applications', 17),
  ($q$What can a Judge do that a Player can't?$q$, $q$Approved judges get access to the Judge Dashboard for the communities and tournaments they're assigned to, including running stations and recording scores.$q$, 'Roles & Applications', 18),

  ($q$What does Premium include?$q$, $q$Premium unlocks unlimited tournaments, the Judge Dashboard, analytics, and priority listing. Pricing is shown at checkout.$q$, 'Subscriptions & Payments', 19),
  ($q$What payment methods are supported?$q$, $q$GCash, Maya, and manual bank transfer are supported today; card payments are on the roadmap.$q$, 'Subscriptions & Payments', 20),
  ($q$How is a payment confirmed?$q$, $q$You submit your reference number, and an organizer or admin verifies it against the payment before your registration or subscription is marked confirmed.$q$, 'Subscriptions & Payments', 21),
  ($q$Can I cancel my Premium subscription?$q$, $q$Yes — cancel from your subscription settings; access continues until the end of the period you've already paid for.$q$, 'Subscriptions & Payments', 22),

  ($q$Who can see my profile and photos?$q$, $q$Your display name, blader names, and public tournament results are visible to other users. Your Beyz ID identity photo is only used by admins to verify Judge applications and isn't shown publicly.$q$, 'Account & Privacy', 23),
  ($q$How do I delete my account or data?$q$, $q$Contact PlayerXJudge support to request account deletion or a copy of your data — see the Privacy Policy for details.$q$, 'Account & Privacy', 24);
