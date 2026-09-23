# Modeling against reference images

Start with the [image-to-3D contract](../plugins/blender-agent-studio/skills/blender-modeling-workflow/references/image-to-3d.md):
resolve faithful reconstruction versus adaptation or single-shot intent, record
binding visible features and inferred hidden structure, and preserve at least
one independent view when refining the matched projection.

Use `blender_compare_reference` alongside bpy construction and scene analysis.
It renders the current geometry through a camera you author, then returns an
inline board: reference, model silhouette, and overlay. This makes proportion
errors visible without repeatedly switching between separate files.

## Match the view before changing geometry

1. Open the reference. Identify its crop, perspective, pose, major widths,
   heights, negative spaces and visible part connections. Record uncertainty
   about occluded shapes; a single photograph does not define the back or depth.
2. Build the primary masses in bpy. Add a named camera matching the reference.
   Use orthographic projection for an orthographic drawing; use perspective
   for photographs. Match framing, orientation and focal length as closely as
   the evidence allows. Camera alignment is a separate operation from modeling.
3. Save the `.blend`, then call the tool at 256 or 512 pixels. Keep the same
   reference, camera, crop and pose through a local geometry comparison.
4. Fix the largest visible proportion or negative-space mismatch in durable
   source, regenerate, and call again into a new directory. Preserve successful
   parts. Check another angle before accepting an ambiguous depth change.
5. Refine materials and topology after the primary form matches. This tool
   checks projected geometry; use normal evidence renders for surface finish.

```json
{
  "assetPath": "C:/assets/subject.blend",
  "referencePath": "C:/references/front.png",
  "cameraName": "ReferenceFront",
  "outputDir": "C:/reviews/front-iteration-01",
  "maxEdge": 256
}
```

The tool uses the active camera if `cameraName` is omitted. It reads the current
scene/frame and respects authored object visibility. Exclude staging floors
and unrelated objects from the reference scene when they are not part of the
subject. It never saves changes to the source. Outputs must be new or empty.

## Optional silhouette measurements

Supply `maskPath` only for a reviewed silhouette mask with white subject pixels
on black background and exactly the reference image dimensions. Photographs
are not masks. Thresholding a photo's brightness would confuse lighting with
geometry, so the tool does not do that automatically.

With a mask, green is shared coverage, pink is missing model coverage, and cyan
is excess model coverage. The report includes intersection-over-union (IoU),
missing/excess pixel counts and occupied widths at five image rows. Rows are
measured from the top. These are projection measurements, not an aesthetic
score. Without a mask, metrics are null and cyan simply marks model coverage.

No independent stretching, centering or automatic registration is applied to
make the score look better. Reference aspect ratio is retained at the requested
maximum edge length. A clipping flag identifies geometry touching the image
border. Transparent materials become opaque in this geometry-only pass.

The report records source/reference/mask hashes and the camera transform, lens,
projection and frame. Freeze these when checking an edit; changes to viewpoint
or mask make scores incomparable. One matching projection can still hide a bad
3D model, so check complementary references and a normal multiview render.

This tool complements bpy and MCP; it does not reconstruct a mesh, estimate a
camera, segment a photo, infer hidden geometry or apply repairs automatically.

## Landmark feedback without a mask

For a visible feature such as a hinge center, tip, eye or corner, supply a named
correspondence between the reference and the model. `referenceUv` is normalized
XY from the image's top-left; `localPoint` is object-local XYZ and defaults to
the object's origin. An empty placed at a feature is a useful stable anchor.

```json
{
  "landmarks": [
    {"name": "hinge", "objectName": "HingeAnchor", "referenceUv": [0.32, 0.45]},
    {"name": "tip", "objectName": "Handle", "localPoint": [0, 0, 1], "referenceUv": [0.6, 0.2]}
  ]
}
```

The overlay marks reference points yellow and model points blue. The report
returns signed pixel offsets (positive right/down), error distance, and whether
the point is in front of the camera and inside its frame. Behind-camera points
have no pixel error. Projection is not an occlusion test: a hidden point can
still project inside the image. Up to 32 landmarks are supported, with or without
a silhouette mask. Use only correspondences you can identify; the tool neither
detects landmarks nor fits the camera automatically.
