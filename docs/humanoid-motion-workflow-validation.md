# Humanoid motion workflow follow-up

This follow-up adds reusable authoring and review guidance to the character
construction PR. It changes skills and documentation, not a game, rig, solver
or export implementation. No new animation-quality or performance improvement
is claimed from this documentation change.

## Inputs and scope

Two project discussions motivated the additions:

- A Definitely Not Customs conversation rejected both stiff NPC swivels and
  forced stepping turns. The correction asked for research and better grounded
  turning with IK, rather than removing the stepping and restoring the old
  problem. Its later project notes describe support transfers, forefoot
  anchors, heel pivots, bounded pelvis correction and a shared half-turn yaw
  convention. Those are implementation lessons, not universal pose values.
- A PitRats gameplay discussion requested better seated poses, explicit instant
  seat entry/exit, relaxed first-person hands, interaction gestures, IK and
  emote refinement. The implementation report distinguished completed clip
  changes from missing new IK work and missing live observer-camera validation.
  Later animated knockdowns were explicitly distinguished from ragdolls.

The first located conversation concerns ambient NPC turns; it is not evidence
of a player locomotion implementation. Source discussions and project records
were read locally. Private transcripts, game code, assets and media are not
copied into this repository. Historical test counts from those games are not
reused as validation of this PR.

## What was missing

The prior animation workflow concentrated on mechanical phases and connections.
The character workflow required IK only for a named need but did not explain
support phases, target spaces, singularities, cumulative contact drift or
first-person versus observer presentation. Existing attachment inspection
measures paired mesh patches; it cannot establish natural gait or ground
planting. An unqualified warning against teleportation also needed a clear
exception for an explicitly requested gameplay seat snap.

The new guide and manual review record address those gaps. Character,
animation, validation and refinement skills link to the same contract, and
the published skills page describes its capabilities and limits.

## Contract review cases

These are document walkthroughs, not executed animation fixtures or an agent
benchmark. They check whether the written rules distinguish the known failure
modes without inventing a new solver or claiming visual quality from metrics.

| Case | Required disposition in the new guidance |
| --- | --- |
| Tiny consecutive-frame foot displacement accumulates into visible skating | Measure maximum displacement from the independent plant anchor over the interval. |
| Expected contact is recomputed from the same foot every frame | Reject the circular check; capture a plant anchor or fixed support-local anchor. |
| Stable mid-stance hides a pop at IK blend-in | Report exclusions and evaluate entry/release separately. |
| Forefoot is planted while the heel deliberately lifts | Measure the declared forefoot contact; do not fail the intended heel pivot as a full-sole plant. |
| Numerically accurate stepping looks forced | Fail the normal-speed visual row; repair choreography instead of substituting a stiff swivel. |
| Hand position is correct but palm faces away from the prop | Review grip orientation, finger/thumb closure and gameplay views. |
| First-person reach works but other players see no gesture | Keep the observer gate unverified or failed; a private viewmodel cannot pass it. |
| Seat entry is explicitly specified as instant | Validate the snap, seated fit and exit/recovery; do not add unrequested sliding or sit-down animation. |
| Native IK succeeds but only a baked clip is exported | Verify fresh-import motion; do not claim a runtime solver or adaptation to new terrain. |
| Exactly 180 degrees sends root and feet opposite ways | Use and test one signed-yaw convention with a stable tie break. |

## Validation scope

Local validation passed: `bun run check`, all 45 documentation tests, the
documentation build and local Markdown target checks. The clean worktree first
needed its pinned site dependencies and benchmark previews restored with
`bun install --cwd site --frozen-lockfile` and `bun run docs:assets`;
the initial missing-font and missing-preview failures were setup failures.
No TypeScript, Python, Rust, MCP
implementation, plugin metadata or installed plugin package is changed.
Live Blender, engine and multiplayer runs are not evidence for this
documentation-only revision. Their required evidence is specified for future
tasks, not marked complete here.
