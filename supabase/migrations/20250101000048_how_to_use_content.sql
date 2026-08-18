-- ============================================================
-- Real starter content for the third "still-hardcoded-placeholder" page
-- called out in 20250101000037_backend_admin.sql: How to Use.
-- Same markdown-lite convention as 20250101000047_faq_and_legal_content.sql
-- ("## Heading" -> section, "- item" -> bullet, blank line -> paragraph
-- break), parsed by lib/legal-content.ts and rendered by
-- components/legal/LegalDocumentLayout.tsx — same section/quick-link look
-- as /rules. Edit this content going forward from /backend/how-to-use.
-- ============================================================

update public.static_pages set
  title = 'How to Use PlayerXJudge',
  body = $htu$This guide walks you through PlayerXJudge from creating an account to competing at your first tournament — where to go, what each step does, and how the pieces fit together.

## Create Your Account
- Sign up with an email and password, or continue with Google — either way you land on your dashboard as a Player, the default role every account starts with.
- Forgot your password later? Use "Forgot password" on the login page to reset it by email.

## Set Up Your Profile
- Head to Account Settings to fill in your personal information: display name, first/last name, country, province, city, and social links.
- Add your Tournament Information — your blader (in-battle) names and the community you compete under.
- Upload your photos (avatar, main, full-body, half-body) — JPG or PNG, 250KB max; PlayerXJudge converts them to WebP automatically.

## Join or Create a Community
- Browse Communities and request to join one — the community's owner or an organizer approves the request before you're a member.
- Don't see your local scene listed? Create your own community; new communities are reviewed before they go public.
- Your community shows up on your profile and feeds its own tournaments, members, and judges.

## Find & Register for a Tournament
- Browse Tournaments, or use Search to find one by name, community, or location.
- Open a tournament's details page and click Pre-register (or Register Now once registration opens).
- For paid tournaments, submit your payment reference number (GCash, Maya, or bank transfer); the organizer confirms it before your spot is locked in.
- Watch your notifications for updates on your registration, check-in, and match results.

## Compete at a Tournament
- Bring Beyblades and launchers that pass Bey and launcher checks — only genuine, unmodified BEYBLADE X parts are allowed. See the full Beyblade X Regulations on the Rules page.
- Judges run your matches station by station, recording finishes and scores as you play; their decisions on finishes, restarts, and penalties are final.
- If something goes wrong during the event, use the tournament's report option so organizers and admins can review it.

## Build Your Beyblade Decks
- Catalog the Beyblades and combos you own from your account, then group them into decks for planning and reference.
- Only one deck can be active at a time; switch between decks as you prepare for different events.
- Remember: the deck builder is for planning — only officially released, unmodified parts are usable in an actual match.

## Apply to Become a Judge, Organizer, or Sponsor
- Use Become a Judge, Become an Organizer, or Become a Sponsor from the site menu to apply for an additional role.
- Judge applications include an identity photo (your Beyz ID) so admins can verify who you are before approving you.
- Track your application's status — pending, approved, or declined — and you'll get a notification once a decision is made.
- Approved judges get the Judge Dashboard for the communities and tournaments they're assigned to; approved organizers can create and run tournaments for their community.

## Go Premium
- The Free plan covers the basics; Premium unlocks unlimited tournaments, the Judge Dashboard, analytics, and priority listing.
- Subscribe with GCash, Maya, or bank transfer from your account; cancel any time and keep access until the period you've already paid for ends.

## Track Your Progress
- Check the Leaderboard to see how you and your community stack up.
- Your profile keeps a running record of your tournament history, results, and achievements as you compete.

## Get Help
- Check the FAQs for quick answers, or the Rules page for the full Beyblade X Regulations.
- Still stuck? Contact PlayerXJudge support through the details listed on the site.$htu$
where slug = 'how-to-use';
