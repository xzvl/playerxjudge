-- ============================================================
-- Rich-text (WYSIWYG) bodies for the three static pages, rewritten from an
-- audit of the current system: roles (player / judge / organizer / sponsor /
-- team manager), tournaments with Swiss + elimination stages, the live
-- player view and judge console, decks and combos, teams and leagues,
-- notifications, maps, and the payment-proof upload.
--
-- `static_pages.body` now holds HTML written by the editor at
-- /backend/content/<page>. The public pages sanitize it and split it into
-- sections at every <h2> (see lib/legal-content.ts). Rows still holding the
-- old markdown-lite text keep rendering, so this migration is optional but
-- is how the new copy gets in. Edit the copy from the backend afterwards.
-- ============================================================

update public.static_pages set
  title = 'Privacy Policy',
  body = $pp$<p>This Privacy Policy explains what PlayerXJudge collects when you create an account, join communities or teams, register for or play in tournaments, judge or organize events, build Beyblade decks, or list a sponsorship, and how that information is used, shared and protected.</p>
<h2>Information We Collect</h2>
<ul>
<li><strong>Account details:</strong> email address, username, display name and password. Sign-in is handled by our authentication provider (email and password, or Google); we never see or store your raw password.</li>
<li><strong>Profile information</strong> you add in Account Settings: first and last name, country, province, city, bio, social links, favorite Beyblade and your blader (in-battle) names.</li>
<li><strong>Photos</strong> you upload: avatar, main, full-body and half-body photos, converted to WebP when uploaded.</li>
<li><strong>Identity verification:</strong> a Beyz ID photo submitted by people applying to be a judge.</li>
<li><strong>Tournament activity:</strong> pre-registrations, registrations, participant links (linking you to your name on a bracket), match results, scores, finishes, penalties and reports you file or are named in.</li>
<li><strong>Communities, teams and roles:</strong> the communities and teams you join or manage, team invites, league rosters and matches, judge assignments, and role applications for Judge, Organizer or Sponsor.</li>
<li><strong>Beyblade data:</strong> the blades, ratchets, bits, combos and decks you build in your account.</li>
<li><strong>Payment records:</strong> the amount, payment method (GCash, Maya or bank transfer), reference number and any payment screenshot you upload for paid tournament entries or organizer plans. We never receive your card, GCash, Maya or bank login details.</li>
<li><strong>Location:</strong> the address an organizer enters for a tournament venue. If you use "near me" on the map, your browser asks for permission and your position is used on your device to sort results; it is not saved to your profile.</li>
<li><strong>Technical data:</strong> basic usage analytics (Vercel Analytics) and standard server logs.</li>
</ul>
<h2>How We Use Your Information</h2>
<ul>
<li>Create and secure your account and let you sign in.</li>
<li>Run tournaments: registration, groups, Swiss and elimination brackets, stations, judge assignments, live standings and results.</li>
<li>Show your results, statistics, achievements and leaderboard position to you and, where public, to others.</li>
<li>Review and approve applications for the Judge, Organizer and Sponsor roles, and community and sponsor listings.</li>
<li>Confirm tournament entry payments and organizer plan payments.</li>
<li>Send in-app notifications about registrations, match results, announcements, judge and team invites, and system messages.</li>
<li>Show tournament venues on maps and geocode the venue address you enter.</li>
<li>Moderate the platform, review reports and suspend accounts that break the rules.</li>
<li>Improve the platform using aggregated, non-identifying analytics.</li>
</ul>
<h2>What Other People Can See</h2>
<ul>
<li><strong>Publicly:</strong> your display name, username, avatar, community, blader names, tournament results, statistics, achievements and leaderboard standing, and the public parts of tournaments, communities, teams and sponsors you take part in.</li>
<li><strong>Tournament organizers and judges</strong> see the registration details, payment proof and match data needed to run the event you joined.</li>
<li><strong>Community owners and team managers</strong> see the members of their own community or team.</li>
<li><strong>Administrators</strong> see what is needed to review applications, payments, reports and moderation.</li>
<li>Your email address, legal name and payment details are never shown publicly.</li>
</ul>
<h2>Photos &amp; Identity Verification</h2>
<p>Profile photos are visible to other users and, for check-in purposes, to the organizers and judges of events you join. A Beyz ID photo submitted with a judge application is reviewed by administrators only to confirm who you are, is not shown publicly, and the application is marked pending, approved or declined.</p>
<h2>Cookies &amp; Analytics</h2>
<p>We use essential cookies to keep you signed in and to protect the sign-in process, and a theme preference (light or dark) stored in your browser. We use Vercel Analytics to understand overall traffic; it does not follow you across other sites.</p>
<h2>Payments</h2>
<p>Tournament entries and organizer plans are currently paid manually through GCash, Maya or bank transfer. You submit a reference number and, where asked, a screenshot, which the organizer or an administrator checks before confirming. PlayerXJudge does not process card payments or store your e-wallet or banking credentials.</p>
<h2>Service Providers</h2>
<p>We share data only with providers that run the platform, and only as needed to operate it:</p>
<ul>
<li>Supabase for the database, authentication and file storage.</li>
<li>Vercel for hosting and analytics.</li>
<li>Resend for transactional email such as password resets.</li>
<li>OpenStreetMap services (map tiles and Nominatim geocoding) for tournament maps.</li>
<li>Google, if you choose to sign in with Google.</li>
</ul>
<p>We may also disclose information when the law requires it or to protect the safety, rights or property of PlayerXJudge and its users. We do not sell your personal information.</p>
<h2>Data Retention</h2>
<p>We keep your account and tournament history while your account is active so that results, standings and leaderboards stay accurate for everyone who took part. To have your account removed, contact us using the details on the site; some tournament results may be kept in anonymized form so past standings remain correct.</p>
<h2>Your Choices</h2>
<ul>
<li>Update most profile information, photos and your password in Account Settings at any time.</li>
<li>Choose whether to allow location access in your browser.</li>
<li>Ask for a copy of your data or for your account to be deleted by contacting us.</li>
<li>A suspended account is a moderation action taken by administrators for rule violations and is separate from account deletion.</li>
</ul>
<h2>Children</h2>
<p>PlayerXJudge is for the Beyblade X community, including younger players who take part with a parent or guardian's involvement. We collect only what is needed to register for and take part in tournaments. If you believe a child's account was created without appropriate consent, contact us and we will review it.</p>
<h2>Security</h2>
<p>Row Level Security is enabled on our database tables so data can only be read or changed by the people meant to see it. Passwords are handled by Supabase Auth and all traffic is encrypted over HTTPS. No online service is perfectly secure, so please use a strong, unique password.</p>
<h2>Changes to This Policy</h2>
<p>We may update this policy as the platform grows. Material changes will be shown on this page with a new "Last updated" date.</p>
<h2>Contact Us</h2>
<p>Questions about this policy or your data can be sent to our support team through the contact details listed on the site.</p>$pp$
where slug = 'privacy-policy';

update public.static_pages set
  title = 'Terms & Conditions',
  body = $tc$<p>These Terms and Conditions govern your use of PlayerXJudge, the platform for Beyblade X tournament registration, judging, communities, teams and deck building. By creating an account or using the platform you agree to them.</p>
<h2>Acceptance of Terms</h2>
<p>By registering, pre-registering for a tournament, joining a community or team, or applying for a role, you agree to these Terms and to the Beyblade X Regulations enforced at every event (see the Rules page).</p>
<h2>Eligibility &amp; Accounts</h2>
<ul>
<li>Give accurate information and keep your profile up to date.</li>
<li>You are responsible for activity under your account and for keeping your password secure.</li>
<li>One account per person. Duplicate accounts used to manipulate registrations, standings or results may be suspended.</li>
<li>Players under the age of majority in their region should take part with a parent or guardian's involvement, especially for paid or in-person events.</li>
</ul>
<h2>Roles &amp; Applications</h2>
<ul>
<li>Player is the default role for every account. Judge, Organizer and Sponsor are additional roles you apply for through Become a Judge, Become an Organizer or Become a Sponsor.</li>
<li>Applications are reviewed by administrators and may need supporting information, such as a Beyz ID photo for judges, before approval.</li>
<li>Judges can only act on the tournaments they are assigned to. Organizers manage the tournaments and communities they create.</li>
<li>Organizers use either the Free plan, which has a tournament limit, or the Premium plan, as shown when applying and in the organizer dashboard.</li>
<li>Administrators may remove a role at any time for breaking these Terms or the Beyblade X Regulations.</li>
</ul>
<h2>Tournament Registration &amp; Participation</h2>
<ul>
<li>Pre-registering or registering reserves a place subject to the organizer's confirmation and, for paid events, confirmation of your payment.</li>
<li>Follow the organizer's rules and the Beyblade X Regulations, including Beyblade and launcher checks, and obey judges at the event.</li>
<li>Matches are recorded live by judges at stations. A judge's decision on finishes, restarts and penalties is final for that match.</li>
<li>Results, standings, Swiss rounds and brackets are generated from the scores judges and organizers record. Organizers may correct recorded results, and the corrected standings apply.</li>
<li>If you believe something went wrong, use the tournament's report option so the organizer or an administrator can review it.</li>
<li>Withdrawing after confirming may affect your standing in future events at the organizer's discretion.</li>
</ul>
<h2>Communities, Teams &amp; Leagues</h2>
<ul>
<li>Anyone can create a community. Joining requires approval from its owner or an organizer, and new communities may be reviewed before they appear publicly.</li>
<li>Team managers can invite members and run team leagues. Match results entered for a league may need approval before they count.</li>
<li>Community owners, organizers and team managers are responsible for the people and events they manage, within these Terms.</li>
<li>Sponsor listings are reviewed and approved by administrators before appearing publicly.</li>
</ul>
<h2>Beyblade Decks &amp; Your Content</h2>
<ul>
<li>Blades, combos and decks you build are for planning and reference. Only officially released, unmodified parts may be used in a tournament match.</li>
<li>You are responsible for the accuracy of what you submit: profile details, blader names, descriptions, payment proof, tournament information and reports.</li>
<li>Do not upload content that is offensive, unlawful, infringing or that impersonates someone else. You give PlayerXJudge permission to display content you submit as needed to run the platform.</li>
</ul>
<h2>Payments</h2>
<ul>
<li>Payments are currently made manually by GCash, Maya or bank transfer. Card payments may be added later.</li>
<li>A tournament entry is confirmed once the organizer verifies your reference number or payment screenshot. Organizer plan payments are confirmed by an administrator.</li>
<li>Entry fees are set and collected by the organizer. Refunds are decided by the organizer for tournament entries and by PlayerXJudge for organizer plans, case by case.</li>
<li>Submitting false or altered payment proof is a serious violation and may lead to suspension.</li>
</ul>
<h2>Conduct</h2>
<ul>
<li>Follow the Beyblade X Regulations, community guidelines and judge instructions.</li>
<li>Do not cheat, use prohibited parts, harass players, judges or organizers, or try to manipulate results, brackets or the leaderboard.</li>
<li>Do not spam, scrape, probe or interfere with the platform's normal operation.</li>
</ul>
<h2>Suspension &amp; Termination</h2>
<p>Breaking these Terms or the Beyblade X Regulations may lead to a warning, match forfeiture, disqualification from an event, removal of a role, or suspension of your account by an administrator. We may restrict access when needed to protect users, the platform or the integrity of a tournament. You may stop using PlayerXJudge at any time and can ask us to delete your account.</p>
<h2>Service Availability</h2>
<p>We work to keep the platform available, but it may occasionally be unavailable, for example during maintenance. Live scoring and brackets depend on your connection, so organizers should keep their own record of results at physical events.</p>
<h2>Disclaimers &amp; Limitation of Liability</h2>
<p>PlayerXJudge is a tournament management and community platform. We do not make or guarantee Beyblade X products and are not responsible for injuries, lost or damaged items, or disputes at physical events beyond providing the tools used to run them fairly. The platform is provided "as is" and, to the extent the law allows, we are not liable for indirect or consequential losses.</p>
<h2>Changes to These Terms</h2>
<p>We may update these Terms as the platform grows. Continuing to use PlayerXJudge after a change means you accept the updated Terms. Material changes will be shown on this page with a new "Last updated" date.</p>
<h2>Contact</h2>
<p>Questions about these Terms can be sent to our support team through the contact details listed on the site.</p>$tc$
where slug = 'terms-of-service';

update public.static_pages set
  title = 'How to Use PlayerXJudge',
  body = $htu$<p>This guide walks you through PlayerXJudge, from creating an account to playing in a tournament, judging one, or running your own.</p>
<h2>Create Your Account</h2>
<ul>
<li>Sign up with an email and password, or continue with Google. Every account starts as a <strong>Player</strong>.</li>
<li>Forgot your password? Use "Forgot password" on the sign-in page to reset it by email.</li>
<li>Your <strong>Dashboard</strong> (from the profile menu in the top bar) is the home for everything below.</li>
</ul>
<h2>Set Up Your Profile</h2>
<ul>
<li>In <strong>Settings</strong>, add your name, country, province, city and social links.</li>
<li>Add your blader (in-battle) names and the community you play under.</li>
<li>Upload your photos: avatar, main, full-body and half-body. They are converted to WebP automatically.</li>
<li>Use the light/dark toggle in the top bar to pick the look you prefer.</li>
</ul>
<h2>Find Tournaments</h2>
<ul>
<li>Browse <strong>Tournaments</strong>, check the <strong>Calendar</strong>, or open the <strong>Map</strong> to see events near you.</li>
<li>Use the search icon in the top bar (or press <strong>/</strong>) to find players, events and communities.</li>
<li>Open a tournament to see its details, schedule, venue, format, prizes and announcements.</li>
</ul>
<h2>Register for a Tournament</h2>
<ul>
<li>Open the tournament and choose <strong>Pre-register</strong> or <strong>Register</strong>.</li>
<li>For paid tournaments, send your payment by GCash, Maya or bank transfer and submit the reference number or a screenshot. The organizer confirms it before your place is locked in.</li>
<li>Follow your registration under <strong>Registered Tournaments</strong> and watch your notifications for updates.</li>
</ul>
<h2>Play in a Tournament</h2>
<ul>
<li>Bring Beyblades and launchers that pass the checks. Only genuine, unmodified BEYBLADE X parts are allowed, as set out on the Rules page.</li>
<li>Open the tournament's <strong>Player</strong> view to see your stats, your current Beyblade combo, the stages and standings, and your upcoming and recent matches.</li>
<li>If you are on the bracket under a different name, use <strong>Link Me</strong> so your results are tied to your account once approved.</li>
<li>Tournaments can use group stages (including Swiss rounds) followed by a final stage with brackets. Standings update as judges record results.</li>
</ul>
<h2>Build Your Beyblade Decks</h2>
<ul>
<li>Go to <strong>Beyblade</strong> in your dashboard. Create combos from a blade, ratchet and bit, then group three combos into a <strong>deck</strong>.</li>
<li>Keep several decks and choose one as active; your active deck shows in the tournament player view.</li>
<li>Combo statistics show how each combo has performed in your matches.</li>
<li>The deck builder is for planning. Only officially released, unmodified parts may be used in a real match.</li>
</ul>
<h2>Communities &amp; Teams</h2>
<ul>
<li>Browse <strong>Communities</strong> and request to join. The owner or an organizer approves requests. Can't find yours? Create one and it will be reviewed.</li>
<li>Mark communities as favorites to follow their events.</li>
<li>In the <strong>Team</strong> dashboard you can create a team, invite members, and play team leagues. Accept or decline invites from your notifications.</li>
</ul>
<h2>Judge a Tournament</h2>
<ul>
<li>Apply through <strong>Become a Judge</strong>, including your Beyz ID photo. You are notified when it is approved or declined.</li>
<li>Organizers can also invite you to judge a tournament. Accept the invite from your notifications.</li>
<li>Open the tournament's <strong>Judge</strong> console, pick your station, choose the two players, and record each battle's finishes and penalties. Use <strong>Switch</strong> to swap sides and <strong>Clear</strong> to reset the match.</li>
<li>Both sides confirm the result before it is saved. Your decisions on finishes, restarts and penalties are final for that match.</li>
<li>Your past matches are in <strong>Match History</strong> in the judge dashboard.</li>
</ul>
<h2>Organize a Tournament</h2>
<ul>
<li>Apply through <strong>Become an Organizer</strong>. The Free plan has a tournament limit and the Premium plan removes it.</li>
<li>Create a tournament with the step-by-step wizard: basics, schedule and venue (with map), format and stages, registration and fees, prizes and options.</li>
<li>Manage pre-registrations and participants, assign judges and stations, post announcements, run the group and final stages, and publish standings and top finishers.</li>
<li>Use the spectator board for live displays, and export participants and results when you need them.</li>
<li>Track revenue, reports and analytics from your organizer dashboard.</li>
</ul>
<h2>Sponsors</h2>
<ul>
<li>Apply through <strong>Become a Sponsor</strong> and create your listing. Administrators approve it before it appears on the Sponsors page.</li>
<li>Manage and edit your listing from the sponsor dashboard.</li>
</ul>
<h2>Notifications &amp; Progress</h2>
<ul>
<li>The bell in the top bar shows registrations, match results, announcements, judge and team invites, and system messages.</li>
<li>Check the <strong>Leaderboard</strong> and your <strong>Statistics</strong>, <strong>Match History</strong> and <strong>Achievements</strong> to follow your progress.</li>
</ul>
<h2>Get Help</h2>
<ul>
<li>Read the <strong>FAQs</strong> for quick answers and the <strong>Rules</strong> page for the Beyblade X Regulations.</li>
<li>Still stuck? Contact PlayerXJudge support through the details listed on the site.</li>
</ul>$htu$
where slug = 'how-to-use';
