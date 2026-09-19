# Scene understanding

The TypeScript MCP stays the interface to Blender. A small Rust executable adds
scene analysis between extraction and agent review:

```text
.blend / exported asset -> evaluated Blender extraction -> SceneIR 0.1
                       -> bas-runtime -> compact description and quality report
baseline + candidate SceneIR -> bas-runtime -> structural diff and declared regression gates
```

This first implementation makes hierarchy, dimensions, topology and explicit
constraints queryable. It does not measure aesthetic quality or establish that
the agent creates better assets. That needs repeated, controlled benchmarks.

## Setup

The existing inspection, rendering and download tools still work without Rust.
For `blender_describe_scene`, `blender_quality_report` and
`blender_compare_scenes`, install a stable Rust
toolchain and run this **from the installed plugin directory** (the directory
containing `mcp`, `runtime` and `package.json`):

```bash
bun run setup:runtime
```

This builds the committed Cargo lockfile into `runtime/target/release`. Rebuild
after updating the plugin. Alternatively, set `BAS_RUNTIME_EXECUTABLE` to a
compatible built `bas-runtime` executable before starting Codex. Binaries and
build directories are not committed or downloaded automatically. The MCP does
not invoke Cargo or install dependencies during analysis.

On Windows, Rust's MSVC target requires the Visual Studio C++ build tools and
Windows SDK. If the linker reports missing `msvcrt.lib`, verify the installed
C++ libraries and use a correctly configured developer shell. Do not change the
repository's target or dependencies to hide a missing system library.

## Use the tools

Start with `blender_describe_scene` and an `assetPath`. Results include object
IDs, authored `bas_role` properties, mesh counts, evaluated world-space bounds,
dimensions, centers, hierarchy and bounded spatial candidates.

Then focus on an object or assembly:

```json
{
  "assetPath": "/assets/deer.blend",
  "objectId": "deer",
  "includeDescendants": true,
  "limit": 40,
  "offset": 0
}
```

IDs are exact Blender `name_full` values and stay stable only while names and
library identity stay stable. Roles come exclusively from an authored string
custom property, for example `obj["bas_role"] = "torso"`. Names do not prove
anatomy, physical attachment or correct proportions. Collection membership alone
does not define an assembly: assembly selection follows object parenting.

Use `pagination.next_offset` to request another page. Bounds and quality
constraints cover the **entire selection**, regardless of the returned page.
Spatial candidates compare objects within the returned page only. Cross-page
pairs are not analyzed. Parent links can point outside the page.

For `blender_quality_report`, add only constraints grounded in the brief:

```json
{
  "assetPath": "/assets/deer.blend",
  "objectId": "deer",
  "triangleBudget": 2500,
  "groundZ": 0,
  "groundObjects": ["front_left_hoof", "front_right_hoof"],
  "tolerance": 0.001,
  "requireClosedMesh": false
}
```

Ground checks require a supplied plane and exact object IDs inside the selected
assembly. They compare the minimum world Z of each object with that plane.
They do not infer a floor, terrain contact or whether elevated parts should be
supported. All distances use Blender world units; `meters_per_unit` is reported
separately. `proximity` defaults to 0.01 world units and `tolerance` to 0.001.

Triangle budgets and requested closed-mesh constraints produce errors when
violated. Without a closed-mesh requirement, non-manifold edges are review
findings, because an open surface may be intentional. Disconnected components
also require interpretation. Degenerate faces use the existing inspector's
local-space area threshold of `1e-12`; they are warnings, not style rules.

Both calls return the same analysis envelope. `constraints_failed` means an
explicit constraint or empty-mesh check failed; `review_required` is **not a
quality pass**. Required visual questions remain open in either case. Use the
existing inspector for additional material, rig and animation metrics.

Optional `outputJson` saves `{scene, analysis}` for later comparison. It must be
a new file in an existing directory. Extraction uses a unique temporary file,
disables automatic script execution, and never saves the source. Failed runs
return MCP errors, never a prior analysis artifact. Extraction has the supplied
`timeoutMs`; Rust analysis has a separate 30-second limit.

### Compare a repair with its baseline

Use `blender_compare_scenes` after preserving a complete candidate and
regenerating a repair. It extracts both assets independently and reports added,
removed, changed and unchanged objects; aggregate triangle and bounds changes;
and per-object transform, bounds, hierarchy, role and mesh-summary changes.
Matching uses exact object IDs, so keep semantic names stable across iterations.

The factual diff is not a quality verdict. Changes become failures only through
explicit options grounded in the task contract:

- `requiredObjects` must be present in the candidate, but may be newly added;
- `forbidRemovedObjects` rejects every removed object;
- `preserveParenting` and `preserveSemanticRoles` protect those authored fields;
- `maxTriangleIncrease` gates the complete-scene triangle delta;
- `maxCenterShift` and `maxDimensionChange` gate matched objects;
- `forbidNewTopologyFindings` rejects increased disconnected-component,
  non-manifold-edge, degenerate-face or missing-material-face counts.

Use `invariantObjects` to apply per-object preservation gates only to baseline
parts that the repair should not alter. Each named invariant must exist in the
baseline and retain the declared baseline properties. An empty list applies the
gates to every matched object. This prevents an intended local repair from
failing merely because its target moved or changed size. Required names absent
from both scenes and invariant names absent from the baseline are rejected
instead of silently weakening the comparison.

`review_required` means no declared invariant failed; it is not proof that the
candidate improved. Compare baseline and candidate with identical cameras,
frames, render settings and export/import paths before retaining the repair.
Use `outputJson` when the full snapshots and diff need to remain auditable.

### Declared contact checks

`contactPairs` accepts up to 200 pairs of exact mesh-object IDs that the brief
or construction contract requires to touch. For example,
`[["leg", "foot"], ["handle", "mount"]]`. Each target must belong to the full
selected assembly and have mesh bounds. Self-pairs and unknown targets fail.
For a joint with intermediate hardware, specify the individual touching pairs.

The result's `contact_checks` records the AABB distance lower bound and the
supplied tolerance in world units. A gap beyond tolerance produces an
`expected_contact_gap` constraint error. Close or overlapping bounds return
`contact_unverified`, never a proven contact pass. These explicit checks cover
the entire selection regardless of pagination. They are separate from the
page-local, automatically generated proximity candidates.

This catches definite separation while leaving ambiguous surface geometry to
multiview review. It does not infer missing supporters or choose required joints
automatically. The runtime equivalent option is `contact_pairs`.

## SceneIR 0.1 contract

`runtime/src/lib.rs` defines the versioned, strict input schema. The executable
reads one JSON request from stdin and writes one analysis or diff JSON response
to stdout. Errors go to stderr with a nonzero exit status. It does not read
assets or execute code. Analysis requests contain `scene`; diff requests contain
`baseline` and `candidate`.

```json
{
  "scene": {
    "schema_version": "bas-scene-ir/0.1",
    "source": "/assets/example.blend",
    "blender_version": "5.2.0",
    "frame": 1,
    "meters_per_unit": 1,
    "limitations": [],
    "objects": []
  },
  "options": {"limit": 40}
}
```

Each object has `id`, `kind`, nullable `parent` and `semantic_role`, a row-major
4x4 `world_matrix`, nullable `bounds: {min: [x,y,z], max: [x,y,z]}`, and nullable
`mesh`. Mesh fields are `vertices`, `triangles`, `connected_components`,
`non_manifold_edges`, `degenerate_faces`, and `missing_material_faces`.
Non-mesh objects have null bounds and mesh summaries. Empty meshes have null
bounds. Positions come from evaluated vertices transformed by the evaluated
world matrix, including modifiers and parent transforms.

The Rust options use snake_case equivalents of the MCP arguments. Unknown
fields, unsupported schema versions, duplicate or missing IDs, cyclic parents,
non-finite coordinates, reversed bounds and invalid pagination are rejected.

Limits: 2,048 scene objects; 2 million evaluated vertices across the scene;
2 million polygons per object; 15 MiB per extraction JSON; 32 MiB runtime request;
200 returned objects per page; and 200 returned findings/relations per response.
Totals and truncation flags identify omitted findings. Geometry limits are
checked after Blender evaluates the mesh, so they do not cap modifier evaluation
memory. Isolate complex assemblies before extraction if needed.

## Evidence boundaries and next steps

- The active scene and current frame are extracted using the viewport dependency
  graph. Render-only modifiers can differ. Hidden objects are included.
- Only mesh objects have geometry summaries. Curves and volumes need other
  inspection. Dependency-graph instances are detected and reported as omitted;
  realize instances before relying on totals. This is not a complete renderer
  scene representation.
- `bounds_overlap_candidate` is a broad-phase observation, not an intersection.
  `aabb_distance_lower_bound` is not surface separation. Parenting is not proof
  of physical connection. No symmetry or support relationship is inferred.
- Exact triangle intersections, surface proximity, symmetry, reference-mask
  comparison, checkpoints and semantic modeling primitives are follow-on work.
- Scene diffs compare exact object IDs and numeric summaries. They do not infer
  correspondence after renaming, localize vertex-level edits, or prove that a
  reported change is desirable.
- Before claiming improved modeling reliability, compare the previous plugin
  and this runtime on the same tasks, model, effort, budgets and evidence
  settings, with repeated runs. Report completion, technical findings, visual
  ratings, token/tool cost, time and **variance**. A single fixture smoke test
  validates the integration, not a quality improvement in generated models.
