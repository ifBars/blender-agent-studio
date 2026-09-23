---
name: blender-art-direction-intake
description: Clarify a Blender creation request and optionally generate a concept/mockup image before modeling. Use before modeling, procedural scene creation, rendering, simulation, or character work when art style, subject, scale, platform, shot, materials, constraints, or reference direction are unclear.
---

# Blender Art Direction Intake

Read [the shared execution guidance](references/astra-workflow.md) once per task
for autonomous decisions, evidence cadence, and long-task continuity.

Resolve the visual contract from the request, supplied references, and existing
scene. Record routine assumptions and start authorized work; a missing field
does not by itself require a question or a user-approved contract.

## Clarify the brief

Consider these decisions, asking only about consequential unresolved choices
for which context provides no reasonable default:

- subject, purpose, platform, scale, and export target;
- art style, reference period/genre, level of realism, and visual priorities;
- required parts, materials, colors, logos/text, motion, and interaction;
- camera/view requirements, lighting/mood, and whether the result is for a
  single shot, turntable, animation, or runtime asset;
- performance, topology, rigging, simulation, and delivery constraints.

Distinguish a missing routine setting from competing interpretations of the
request. Ask when plausible answers change the identity, silhouette, style,
motion, simulation type, or usable deliverable. A plausible default alone does
not resolve a consequential ambiguity. Do not silently choose a human versus
creature character, realistic versus cartoon treatment, liquid versus smoke,
static sculpt versus rigged avatar, or single-view illusion versus full 3D asset.
Use supplied context to avoid asking questions already answered.

Bundle the one to three highest-impact questions, with concrete choices and a
recommended option when helpful. Explain briefly what the choice changes. Use
the host's asynchronous question tool when available, otherwise ask in ordinary
conversation. Continue independent reference inspection, scene inventory and
tool checks. Keep dependent geometry, rigging and expensive bakes pending when
the answer is necessary; elapsed time is not an answer. For optional preferences,
allow time to respond, then proceed with a stated assumption. If the user asks
for no questions, make and record reasonable assumptions instead.

Default routine settings (names, preview resolution, folders) without a survey.
Ask about animation duration only when it affects the requested use or timing;
do not ask for solver substeps the agent can determine from preview evidence.
Respect explicit requests for consultation or approval at stage boundaries.

## Offer optional concept generation

Reference retrieval is part of ordinary preparation for recognizable subjects;
it does not require a concept-generation offer. Follow the shared guidance to
find complementary angles and separate observed structure from intended style.
Use existing user references first and record what remains uncertain.

When requested, or when a concept would resolve a consequential visual
ambiguity, offer an optional image-generation pass. Do not routinely interrupt
an actionable modeling brief with a concept offer. A concept is not a
prerequisite for geometry:

> I can generate a concept/mockup reference before modeling; it will guide
> silhouette, materials, palette, and camera—not become the final 3D asset.

When accepted, generate one focused concept using the agreed subject, style,
material palette, environment, camera, and exclusions. Inspect it with the
user, then record what is binding (silhouette, palette, major forms, mood) and
what remains flexible. Do not imply image generation guarantees manufacturable
geometry, clean topology, rigging, or a usable texture set.

## Hand off

Write a short working contract with the resolved decisions, assumptions,
unanswered consequential questions, reference-image path if any, and review
questions. Map each must-have to evidence: a named view, motion phase, measured
constraint, or export check. Mark requirements as verified, failed, unclear or
not tested; never mark a requirement verified from an object name alone. Update
the contract when the user steers the work and recheck affected evidence.
Then invoke the smallest
appropriate workflow: modeling, procedural, rendering, simulation, character,
or animation.
