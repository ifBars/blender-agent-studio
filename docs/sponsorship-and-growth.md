# Sponsorship and organic-growth package

Prepared October 20, 2026 against `d5cf1a3c773dacdc89aa83aa85d251426533f153`.
This is a maintainer plan with publication drafts, not a record of posts sent or
new sponsorship tiers enabled. The README appeal is the user-facing change.

## Positioning and realistic income

**Support the work that makes agent-created Blender scenes inspectable,
editable, and rebuildable.** The strongest case is continued maintenance of
local Blender workflows, compatibility, examples, and honest validation. A
render attracts attention; the `.blend`, Python source, and evidence explain
why a developer would keep using the project.

Roughly 90 stars is a discovery signal, not an active-user count or evidence of
willingness to pay. Budget for no new sponsorship income until it arrives.
Illustrative arithmetic only: five people at $5/month is $25/month; twenty at
$10/month is $200/month before fees. Neither is a forecast or a star-conversion
estimate. Sustainable income needs repeated use and demonstrated value, likely
across the maintainer's projects rather than this repository alone.

### Existing funding destinations

- [FUNDING.yml](../.github/FUNDING.yml) already contains `github: [ifBars]` and
  `ko_fi: ifbars`; no integration changes are needed.
- [GitHub Sponsors](https://github.com/sponsors/ifBars) is indexed as the ifBars
  sponsorship page, and the GitHub profile exposes Sponsor. Direct page reads
  were blocked/rate-limited during this review. This verifies the configured
  destination, not its current tiers, checkout, or payout readiness.
- [Ko-fi](https://ko-fi.com/ifbars) resolves to Bars, describes the work as
  building free software, and exposes a support form. No payment was attempted;
  payout readiness and enabled recurring options were not verified.

Before an external launch, the maintainer should check both pages signed in and
signed out. Do not create duplicate payment accounts or promise benefits that
are not configured. These are maintainer-wide destinations: the appeal does
not claim funds are ring-fenced for Blender Agent Studio.

### Comparable approaches

These are examples of offer design, not comparable revenue forecasts. Their
audiences, portfolios, and adoption differ substantially.

| Maintainer / tools | Observed approach | Applicable lesson |
| --- | --- | --- |
| [Isaac Muse](https://github.com/sponsors/facelessuser), SoupSieve and PyMdown Extensions | Funds time across several projects; small appreciation tiers include $2 and $5/month. | Start with voluntary appreciation and a concrete explanation of maintenance work. |
| [Anthony Fu](https://github.com/sponsors/antfu), Vitest, VueUse and other tools | Small recurring tiers and public recognition; some higher tiers also promise prioritization. | A portfolio-wide appeal fits a multi-project maintainer. Recognition may be useful later; do not copy priority-work promises. |

Recommend keeping the existing support options and asking satisfied users to
contribute at an amount they choose. No paid features, private builds, support
SLA, custom modeling, scheduled calls, or new subscriber content are needed.
Use existing release notes to show what support helps sustain, without adding
a publishing schedule. If a repeat business user later wants to contribute,
offer the same voluntary support route. A simple opt-in acknowledgment could
be considered then; do not sell logo exposure without evidence of audience
value. Commissioned integrations or tutorials would need separate scope and
are deferred because they create more delivery work.

## Evidence to reuse

| Asset | Appropriate use | Required qualification |
| --- | --- | --- |
| [Reading-room walkthrough](https://ifbars.github.io/blender-agent-studio/reading-room/) | Three views, adapted brief, file delivery and review workflow. | Selected Sonnet 5.5 / Claude Code result; skills and scripts, no optional MCP tools. The adapted prompt does not recreate the exact room. |
| [Paired gallery](https://ifbars.github.io/blender-agent-studio/comparisons/) and [scene report](scene-comparison-2026-10-04.md) | Let readers inspect matched scenes and mixed results. | At review time: 31 pairs, one generation per condition per pair; some reviews missing. No general success rate. |
| [Five-pair quality report](plugin-quality-evidence.md) | Discuss technical gates separately from visual preference. | Skills passed 5/5 technical gates; baselines 0/5. Blinded AI judges preferred skills in 4/5 pairs; one baseline won visually. More reported tokens; press/drawbridge took about twice as long. No MCP tools. Some visual baseline rerenders hid oversized floors; original technical failures remain. |

Rebuilding a saved Python script with its dependencies is different from asking
an agent the same prompt again. Do not claim deterministic generation, fully
offline AI, free agent usage, production-ready characters, or that technical
checks establish artistic quality. Blender runs locally; agent services and
their costs still apply. Do not imply all benchmark `.blend` files are public
downloads: raw runs are retained outside Git. Refer readers to published
previews, reports, and the runnable workflow.

The existing character-workflow PR #31 is unfinished and is not evidence for
the released version. This package uses main-branch demonstrations only.

## Three channel experiments

These are distinct from directory listings. The already-merged
[awesome-ai-plugins PR #491](https://github.com/hashgraph-online/awesome-ai-plugins/pull/491)
and existing plugin listings do not need resubmission. Exact-name web searches
did not identify existing project posts on the three channels below, but search
coverage is incomplete: check account history before posting.

Effort estimates are planning allowances, not measured production times.

| Priority / channel | Why it fits | Additional work | Measure after 7 and 30 days |
| --- | --- | --- | --- |
| 1. DEV technical tutorial | Lowest preparation cost; turns the existing walkthrough into a useful developer lesson. | About 1–2 hours to verify installation on a fresh session, review the draft, and add an actual result. | Article views, meaningful questions, GitHub referrers, and people reporting a completed first scene. |
| 2. YouTube on the maintainer's channel | Shows editability and multiple views more convincingly than a directory card. | About 2–4 hours to record a real scene opening, Python source, one edit, and a fresh render; edit a 60–90 second clip. | Retention, description-link traffic where available, and attributed example submissions. |
| 3. Show HN, conditional | A runnable local developer tool with inspectable evidence fits technical discussion. | About 30–60 minutes preparation plus time to answer questions; verify account eligibility and prior submissions. | Relevant comments, unique GitHub visitors/clones, reported successful setups, and returning users. |

[Show HN rules](https://news.ycombinator.com/showhn.html) call for something
people can try, not a fundraiser, and forbid soliciting votes. A
[current restriction notice](https://news.ycombinator.com/showlim) asks newer
participants to become contributors before posting. Defer if the account is
restricted; do not manufacture engagement or use another account to bypass it.
For DEV, consult its [publishing help](https://dev.to/help) and disclose AI
assistance in accordance with the rules in effect when publishing. Review and
verify the article personally. The drafts below are unsent.

## Draft: DEV tutorial

**Title:** From an agent prompt to an editable Blender scene: what to keep and what to check

I maintain Blender Agent Studio, a free MIT-licensed plugin for Codex and
Claude Code. It runs Blender locally and guides the agent through building,
rendering, inspecting, and revising a scene. The useful deliverables are the
editable `.blend`, the Python build script, and renders you can review.

Start small. Install the plugin using the
[quick start](https://github.com/ifBars/blender-agent-studio#quick-start), open
a new agent session, and ask it to check your Blender Agent Studio setup.
You need Blender, Bun, and a supported agent. The plugin adds no subscription;
your agent provider's usage costs still apply.

Then try:

> Use Blender Agent Studio to build a walnut desk lamp. Give it warm lighting,
> render it from two angles, and save the .blend and Python source.

Open the saved scene and both images. Check whether the base supports the lamp,
whether the shade reads from both angles, and whether the materials look right.
A geometry check cannot decide whether the design is convincing. Keep the
original files before asking for a specific revision.

For a larger example, the
[reading-room walkthrough](https://ifbars.github.io/blender-agent-studio/reading-room/)
shows hero, reverse, and detail views from one selected Claude Code / Sonnet 5.5
run. Its adapted brief asks for a 6 × 5 meter interior, two furnished areas,
three cameras, a `.blend`, and a Python script. Reusing the prompt will not
recreate the pictured room exactly. Rebuilding from saved source also requires
the appropriate dependencies and assets.

The [paired gallery](https://ifbars.github.io/blender-agent-studio/comparisons/)
includes failures and mixed visual reviews. In a separate five-pair Codex
study, the skills condition passed all five technical gates and the baseline
passed none, but blinded AI judges preferred the baseline's appearance in one
pair. The skills condition used more reported tokens. The
[report](https://github.com/ifBars/blender-agent-studio/blob/main/docs/plugin-quality-evidence.md)
details controls, adjusted visual rerenders, and limits. These runs did not
use the optional MCP tools and do not establish a general success rate.

If you try it, [share an example](https://github.com/ifBars/blender-agent-studio/issues/new?template=share-an-example.yml)
with your prompt, host/model, Blender version, and what failed or needed manual
work. The source script is useful if you have permission to share it.
If the workflow becomes useful to you, optional support through
[GitHub Sponsors](https://github.com/sponsors/ifBars) or
[Ko-fi](https://ko-fi.com/ifbars) helps sustain maintenance and validation.

## Draft: YouTube demonstration

**Title:** An editable Blender scene from Claude Code — source files and honest checks

**Production notes:** Use the published reading-room previews for the opening,
clearly labeled as a selected benchmark result. For the file inspection and
edit, use the original scene only if available; otherwise record a fresh lamp
run and label the switch. Do not reconstruct fake tool activity or suggest a
fresh run produced the published image. Include host/model, Blender version,
plugin revision, and actual elapsed time in the description. Cut waits with
visible edit markers rather than presenting the clip length as generation time.

| Time | Picture | Narration |
| --- | --- | --- |
| 0–12 s | Reading-room hero, reverse, and detail previews | “This is one selected scene from Blender Agent Studio's gallery. The project works with Codex or Claude Code and runs Blender locally.” |
| 12–30 s | Real saved scene in Blender; select objects, orbit, then show its Python source | “The workflow delivers an editable Blender scene and the Python that built it. You can inspect the objects and keep changing the source.” |
| 30–50 s | Record one specific edit and its resulting render | “Here is one edit and a new render. Saving the build script helps make the work reproducible; repeating an AI prompt does not guarantee the same scene.” |
| 50–70 s | Paired gallery with review/validation panel visible | “A technical pass isn't a visual approval. The published comparisons include failures and mixed reviews. The selected room used skills and scripts, without the optional MCP tools.” |
| 70–90 s | README quick start, then support section | “It's free and MIT-licensed. Your agent's costs still apply. Try the setup check, share a scene or a reproducible bug, and consider supporting maintenance if it helps you.” |

**Description copy:**

Blender Agent Studio: local Blender workflows for Codex and Claude Code, with
editable `.blend` files, Python source, and renders to inspect. The reading-room
images are one selected result, not a typical-quality claim. Agent generation
varies; technical checks do not guarantee good art.

- Install: https://github.com/ifBars/blender-agent-studio#quick-start
- Walkthrough: https://ifbars.github.io/blender-agent-studio/reading-room/
- Comparisons and limitations: https://ifbars.github.io/blender-agent-studio/comparisons/
- Optional support: https://github.com/sponsors/ifBars or https://ko-fi.com/ifbars

Add the recording's actual version and timing details before publishing.

## Draft: Show HN submission and first comment

**Title:** Show HN: Blender Agent Studio – editable scenes and Python from coding agents

**Submission URL:** https://github.com/ifBars/blender-agent-studio

**First comment:**

I'm the maintainer. Blender Agent Studio is an MIT-licensed plugin for Codex
and Claude Code that runs your local Blender. The workflows ask the agent to
deliver an editable `.blend`, the Python build script, and inspected renders.
There is also a local MCP server for inspection and rendering.

The quick start includes a setup check and a small lamp task. The
[reading-room walkthrough](https://ifbars.github.io/blender-agent-studio/reading-room/)
shows a larger selected example. Keeping the script and dependencies makes a
scene rebuildable; repeating the prompt is not deterministic.

I've published [paired comparisons](https://ifbars.github.io/blender-agent-studio/comparisons/)
and their limitations. A separate five-pair Codex study favored the skills
condition on technical gates, but one baseline won the blinded AI visual vote.
The plugin condition used more reported tokens. Those runs tested skills
without the optional MCP tools; they do not establish general success rates.
The reports retain failures and explain adjustments to visual evidence.

Blender runs locally; this does not make the agent offline or remove its usage
costs. I'd appreciate reports of setup failures and examples where the saved
scene or export fails despite a convincing render. What would you need to
inspect before trusting this workflow in your own project?

## Small measurement loop

Before posting, record the date, repository stars, available GitHub traffic,
current sponsor count and recurring amount, and recent example submissions.
These values have not been collected here; do not substitute estimates. Keep
private financial details outside this public document.

Publish one channel experiment at a time, around a week apart, so the work and
responses stay manageable. Capture GitHub traffic weekly while its short
history remains available. Record post URL, preparation hours, views, relevant
referrers, setup reports, examples, new supporters, cancellations, and recurring
income separately from one-time tips. Ask willing users where they found the
project; local installs are not measured automatically. Clones are not installs
and stars are not retained users. Without existing analytics, do not assume
UTM links alone measure clicks or attribute sponsorships.

After 30 days, compare useful outcomes per hour spent, not just impressions.
An example someone can reproduce, a returning user, or an actionable setup
report is stronger evidence than a star spike. Keep the best-performing format
and improve its main setup bottleneck before making more content. Treat a few
supporters as early validation, not salary replacement. If sponsorship stays
at zero, retain the unobtrusive appeal and avoid building paid features to
force conversion.
