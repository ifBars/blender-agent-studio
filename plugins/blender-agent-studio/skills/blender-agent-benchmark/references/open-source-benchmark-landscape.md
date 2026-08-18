# Open-source Blender benchmark landscape

Research refreshed 2026-08-09. These projects inform the local methodology;
they are not bundled, copied, or claimed as equivalent benchmark conditions.

## Deliberate practice, Self-Refine, and Reflexion

Primary sources:

- https://onlinelibrary.wiley.com/doi/10.1111/j.1553-2712.2008.00227.x
- https://arxiv.org/abs/2303.17651
- https://github.com/noahshinn/reflexion

Deliberate practice is focused performance against explicit goals with timely
feedback, reflection, and corrected repetition. Self-Refine applies the same
shape at inference time: generate, critique, make a targeted revision, and
stop on a defined condition. Reflexion adds retained verbal feedback across
trials.

Applicable lessons:

- treat the first complete asset as a candidate rather than the default final;
- convert inspection and multiview review into specific causal feedback;
- change the durable source, then re-run identical evidence;
- retain a repair only when the targeted requirement improves without a gate
  or critical-requirement regression;
- measure the additional turns, time, and verification work that created the
  gain.

Self-critique is not ground truth. Iterative optimization against the same
imperfect judge can reward-hack its proxy and reduce human-perceived quality:
https://arxiv.org/abs/2407.04549. Keep deterministic gates, blinded judges,
task-authored criteria, holdouts, and human-reviewable evidence independent.

## BlenderGym

Primary sources:

- https://blendergym.github.io/
- https://github.com/richard-guyunqi/BlenderGym-Open
- https://arxiv.org/abs/2504.01786

BlenderGym provides 245 hand-crafted start/goal Blender scene pairs across
procedural geometry, lighting, procedural materials, blend shapes, and object
placement. Instances include Blender files, start and goal scripts, renders,
and language descriptions. Its evaluator uses task-appropriate image and 3D
metrics and its generator/verifier experiments separate generation work from
verification work.

Applicable lessons:

- report capability coverage rather than treating “Blender” as one task;
- preserve fixed inputs, outputs, and evaluator versions;
- add reference-scene editing as a separate future lane instead of mixing it
  into from-scratch asset creation;
- measure verification effort as well as generation effort;
- prefer deterministic reference metrics when a true goal scene exists.

## CADBench / BlenderLLM

Primary sources:

- https://github.com/FreedomIntelligence/BlenderLLM
- https://huggingface.co/datasets/FreedomIntelligence/CADBench
- https://arxiv.org/abs/2412.14203

CADBench contains 700 text-to-Blender-script examples: 500 simulated prompts
and 200 prompts collected from online forums. Its criteria are grouped around
object attributes, spatial relationships, and instruction satisfaction, and it
reports syntax failures separately.

Applicable lessons:

- keep synthetic fixtures and user-like or “wild” holdouts distinct;
- express requirements as multiple task-specific criteria instead of relying
  on one object name or one aesthetic score;
- keep script execution/syntax validity separate from semantic and spatial
  correctness;
- retain short prompts as well as detailed prompts so benchmark performance
  does not depend on unusually complete user specifications.

## EZBlender

Primary source:

- https://arxiv.org/abs/2601.07143

EZBlender uses a Plan-and-ReAct design and evaluates multi-task editing while
also analyzing responsiveness and economic efficiency.

Applicable lessons:

- record planning/decomposition and verification stages without leaking hidden
  rubric answers into the generation prompt;
- report duration, failures, and cost or token proxies beside quality;
- compare an improvement under identical tool permissions and time limits;
- evaluate iterative editing separately from one-shot creation.

## TIFA and VQAScore

Primary sources:

- https://tifa-benchmark.github.io/
- https://github.com/linzhiqiu/t2v_metrics

TIFA decomposes a text specification into interpretable visual questions and
uses VQA to test image faithfulness. VQAScore provides open evaluation code for
text-to-image, video, and 3D outputs and reports stronger compositional
alignment than one-vector CLIP-style scoring in its evaluated settings.

Applicable lessons:

- author explicit checks for presence, count, attributes, spatial relations,
  materials, lighting, motion, deformation, and style;
- answer each check against multiview and critical-frame evidence;
- preserve `unclear` rather than coercing missing evidence into pass/fail;
- report per-category pass rates and critical failures instead of collapsing
  everything into one semantic similarity number;
- calibrate model-based checks against blinded human review before using them
  as gates.

The local benchmark adopts the structured-question format but does not bundle
TIFA or VQAScore model weights.

## DreamSim, CLIPScore, Open3D, and PyTorch3D

Primary sources:

- https://github.com/ssundaram21/dreamsim
- https://github.com/jmhessel/clipscore
- https://www.open3d.org/docs/latest/python_api/open3d.t.geometry.Metric.html
- https://pytorch3d.readthedocs.io/en/latest/modules/loss.html

DreamSim measures human-aligned perceptual image similarity; CLIPScore measures
image-text alignment; Open3D exposes Chamfer, Hausdorff, and F-score geometry
comparison; PyTorch3D exposes Chamfer and point-to-mesh losses. These answer
different questions and must not be treated as interchangeable quality scores.

Applicable future lanes:

- use DreamSim or carefully normalized image metrics only when a licensed
  reference view and matched camera/render setup exist;
- use CLIP-style alignment as a weak diagnostic, never as proof of part counts,
  mechanics, topology, or finish;
- use Chamfer/Hausdorff/F-score only for aligned reference geometry, with
  scale, orientation, sampling, and symmetry controlled;
- keep metric versions, weights, preprocessing, cameras, and hardware in the
  run manifest, and calibrate thresholds on known good/bad pairs.

## ImageCritic

Primary source:

- https://openaccess.thecvf.com/content/CVPR2026/html/Ouyang_The_Consistency_Critic_Correcting_Inconsistencies_in_Generated_Images_via_Reference-Guided_CVPR_2026_paper.html

ImageCritic uses reference-guided detection and localized post-editing to
repair fine-grained inconsistencies while preserving unaffected content. It is
an image-generation system rather than a Blender evaluator, but its invariant-
preserving local-repair pattern transfers directly: identify the failing
region or relationship, change only its causal source, and compare the same
evidence before retaining the edit.

## Local adoption

Blender Agent Studio currently adopts:

- capability and finish-profile tags on fixtures;
- polished-smooth default tasks plus an explicit low-poly control;
- deterministic execution/export, geometry, UV, shading, and refinement
  signals;
- task-specific visible briefs for judges;
- counterbalanced blinded A/B order across judges;
- separate automated, multiview, animation, timing, and failure evidence.
- an opt-in first-candidate, critic, targeted-repair, same-evidence recheck
  loop, isolated from the historical generator path until it clears the
  regression anchor;
- task-authored structured visual criteria with criticality and category tags;
- an unchanged historical regression suite plus opt-in challenge and
  integrated gauntlet suites;
- a strict non-regression gate that does not average losses away.

Still separate future lanes:

- fixed start/goal scene editing with photometric, CLIP, or Chamfer-style
  reference metrics;
- calibrated optional VQAScore/TIFA-style local-model adapters;
- licensed reference-view packs with matched cameras for DreamSim-style
  perceptual comparison;
- material-only, lighting-only, placement-only, and blend-shape suites;
- calibrated human baselines;
- larger “wild prompt” sampling with licensing and provenance review.
