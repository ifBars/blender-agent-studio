# Quality campaign: 23 September 2026

This is a directional comparison of committed plugin `e7b9cc8` and a frozen
working revision containing the quality-workflow changes delivered in 0.6.3.
The later upstream funding edit and installation version metadata do not change
the evaluated workflows. Raw models, videos, traces and reports remain local.

## Controls

Each task has one independent generation per condition, using GPT-6 Astra at
medium effort, a 20-minute generation limit, isolated skills and pinned MCP.
Both conditions use the same revised evaluator, task contract, Blender build,
permissions and neutral render settings. Three sequential GPT-5.6 Terra medium
judges review the same pair with blinded, alternating A/B labels. Strict
comparison checks verify matching controls. Character ran committed first;
liquid ran revised first. Runs and campaigns are sequential.

The Blender build was 5.2.2 LTS, `d13f752e3b9c`. Frozen revised source
fingerprint: `ccc258ceed503415021b76f3b98fb20c5330956408b1767be0d48b840b8e8178`.
Evaluator fingerprint: `fef0af156c977e1475e3f060de6be52d5a9405b5a824218c7a6d16f991ffc3a3`.
The final installation also includes the reproduction-directory isolation repair
described below; that evaluator repair was tested but not campaign-rerun.

## Character form

Both conditions passed technical gates with 100/100. All three judges preferred
the revision and strict non-regression passed. Mean task fidelity rose from
7.03 to 8.93; silhouette/proportion from 7.07 to 8.53; craftsmanship/detail from
6.60 to 8.60; material readability from 6.70 to 9.00.

The gain cost time and tokens: generation took 10.33 versus 15.07 minutes
(+46%), with 1,202,296 versus 1,692,594 total tokens (+41%, including cached
inputs). Tool calls were 41 versus 46, with zero versus one failed call.
Reference images were unavailable in both conditions. Some visual review still
found insufficiently readable webbing and dense candidate hardware.

## Liquid pour

All three blinded judges preferred the committed plugin. The visual non-regression
gate failed. Mean task fidelity fell from 8.00 to 7.00 and construction plausibility
from 7.33 to 5.33. Judges found the revision's basin/support arrangement less
convincingly grounded and both liquid meshes visibly tessellated. Both passed
visible sequence, containment and surface criteria. Continuous stability remained
unclear for both because the judges saw stills rather than playback.

Generation took 8.69 versus 12.26 minutes (+41%), with 1,319,685 versus
2,167,816 total tokens (+64%, including cached inputs); tool calls were 24 versus
34 with no failed calls. The revision therefore did not demonstrate a liquid
quality or efficiency gain on this pair.

### Reproduction measurement defect

The raw evaluator reported 89/100 for committed and 100/100 for revised. Do not
interpret that difference as a quality gain. The committed agent had already
created a `reproduction` folder for its own successful check. The evaluator reused
that folder, and the generated script correctly refused to overwrite an existing
bake. The supposed clean-directory check was not clean. The baseline technical
comparison is therefore inconclusive; the raw failure and visual regression are
preserved rather than silently rescored.

The delivered harness now allocates a fresh unique reproduction directory and
records its path in each result. Rescoring follows that path and requires a
successful generation process as well as inspectable files. A regression test
checks that existing agent caches and previous evaluator outputs remain intact.
This repair was not used to rerun either generation or retrofit provenance.
Liquid was the final campaign at the user's request.

## Interpretation

Three judge votes on one generated pair are not three independent replications.
These results do not establish statistical significance, general model rankings,
or improvements to every workflow. Automated visual judges see stills;
continuous timing, flicker and contact stability require playback review.
Clarification intake, image reconstruction, walk cycles, facial expressions and
cloth have new evaluation coverage but were not run in this campaign. Technical
fixture tests are tool validation, not evidence of generated-art quality.
