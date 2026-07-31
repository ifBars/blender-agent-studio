# Open-source Blender benchmark landscape

Research refreshed 2026-07-27. These projects inform the local methodology;
they are not bundled, copied, or claimed as equivalent benchmark conditions.

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

## Local adoption

Blender Agent Studio currently adopts:

- capability and finish-profile tags on fixtures;
- polished-smooth default tasks plus an explicit low-poly control;
- deterministic execution/export, geometry, UV, shading, and refinement
  signals;
- task-specific visible briefs for judges;
- counterbalanced blinded A/B order across judges;
- separate automated, multiview, animation, timing, and failure evidence.

Still separate future lanes:

- fixed start/goal scene editing with photometric, CLIP, or Chamfer-style
  reference metrics;
- material-only, lighting-only, placement-only, and blend-shape suites;
- calibrated human baselines;
- larger “wild prompt” sampling with licensing and provenance review.
