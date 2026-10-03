import type { BenchmarkTask } from "./tasks.ts";

export const DEPOT_ASSETS = [
  { id: "terrain", count: 1, triangles: 2500, detail: "20 by 16 m terrain tile with a level walkable surface at Z=0 and deliberate edge treatment" },
  { id: "depot", count: 1, triangles: 24000, detail: "complete depot building with a pitched roof, overhangs, trim, doorway, framed windows, rear wall and readable construction" },
  { id: "platform", count: 1, triangles: 8000, detail: "covered loading platform with connected posts, roof and deck" },
  { id: "ramp", count: 1, triangles: 2500, detail: "usable loading ramp with connected top and bottom and edge protection" },
  { id: "cart", count: 1, triangles: 6000, detail: "cargo cart with supported wheels, axles, connected handles and a detailed bed" },
  { id: "crate", count: 4, triangles: 1600, detail: "wooden shipping crates with slats, corner reinforcement and recessed panels" },
  { id: "barrel", count: 3, triangles: 1600, detail: "faceted barrels with fitted hoops, lids and bungs" },
  { id: "pallet", count: 2, triangles: 1200, detail: "pallets with top and bottom slats, blocks and fork openings" },
  { id: "bench", count: 2, triangles: 3000, detail: "benches with seats, backs, frames and supported legs" },
  { id: "notice_board", count: 1, triangles: 2200, detail: "notice board with posts, framed panel, small roof and readable graphic notices" },
  { id: "lantern", count: 2, triangles: 2200, detail: "wall lanterns with a chamber, cap, bracket and warm inset light" },
  { id: "fence", count: 6, triangles: 1400, detail: "fence modules with posts, connected rails and end treatment" },
  { id: "pine", count: 4, triangles: 1800, detail: "pines with grounded trunks and multiple intentionally shaped foliage tiers" },
  { id: "broadleaf", count: 2, triangles: 2400, detail: "broadleaf trees with trunks, branches and distinct canopy clusters" },
  { id: "rock", count: 3, triangles: 900, detail: "rock clusters with varied designed facets and grounded masses" },
  { id: "grass", count: 6, triangles: 500, detail: "small grass clusters with varied blade silhouettes and grounded roots" },
  { id: "signpost", count: 1, triangles: 1500, detail: "direction sign with a post, connected boards and legible arrows" },
  { id: "hand_truck", count: 1, triangles: 3000, detail: "hand truck with frame, toe plate, axle, wheels and connected handles" },
  { id: "mailbox", count: 1, triangles: 2200, detail: "mailbox with post, supported box, door, slot and small flag" },
  { id: "water_pump", count: 1, triangles: 3000, detail: "water pump with a grounded plinth, body, connected handle, pivot and spout" },
  { id: "counter", count: 1, triangles: 3500, detail: "outdoor service counter with top, supports, panels and a parcel shelf" },
] as const;

export const DEPOT_LAYOUT = {
  bounds: { min: [-10, -8, -0.35], max: [10, 8, 7] },
  // A conservative exclusion prism: any overlapping asset bounds need review.
  walkway: { min: [-0.9, -7.8, 0.08], max: [0.9, 1, 2] },
  anchors: [
    { root: "depot_01", x: 0, y: 4.5, radius: 1, yawDegrees: 0 },
    { root: "platform_01", x: 5.5, y: 3.5, radius: 1.5 },
    { root: "bench_01", x: -4, y: -2, radius: 1.2, yawDegrees: 90 },
  ],
};

export const WHOLE_SCENE_TASK: BenchmarkTask = {
  id: "low_poly_courier_depot", title: "Low-poly courier depot: complete game scene",
  category: "environment_creation", suites: ["whole_scene"],
  capabilities: ["geometry", "materials", "lighting", "placement", "spatial_relations", "composition", "instruction_following"],
  animationFrames: [], wholeScene: true,
  prompt: `Model an entire cohesive low-poly courier-depot game environment, not just a hero prop or a diorama facade. The complete 20 by 16 meter scene must be inspectable from a player-height camera, overhead, rear and close to every asset. Use intentional flat facets, a restrained coordinated palette, clean silhouettes, purposeful primary/secondary details and efficient geometry. Every asset family must look individually finished; do not fill the background with unfinished primitives.

Required asset families, exact instance counts, per-instance evaluated triangle ceilings and features:
${DEPOT_ASSETS.map(asset => `- ${asset.id}: ${asset.count} instance(s), at most ${asset.triangles} triangles each; ${asset.detail}.`).join("\n")}

Coordinates and layout:
- Blender meters, Z up. Terrain bounds X=-10..10, Y=-8..8; walkable ground surface Z=0. Keep all geometry inside those XY limits, above Z=-0.35 and below Z=7.
- Depot centered near (0,4.5), within 1 m; its entrance faces world -Y. Loading platform near (5.5,3.5), within 1.5 m, connected by a usable ramp.
- First bench near (-4,-2), within 1.2 m, facing world +X toward the central route. All asset root local -Y is its forward direction, local +Z its up direction. Use purposeful yaw rotations, upright roots and unit root scales.
- Leave a continuous 1.8 m wide approach lane at X=-0.9..0.9, Y=-7.8..1 unobstructed up to 2 m high. Arrange secondary gathering and loading zones without blocking access or doors.
- Every ground-resting part must meet its actual support. Stacked cargo must rest on crates, pallets or decks; lantern brackets must meet the depot. Avoid floating feet, buried props, intersecting unrelated objects, hovering foliage and unsupported decoration. Intentional embedded joints inside an asset are allowed. Preserve designed openings.

Deliverables and inspectable asset contract:
- Use Blender Python and {{BLENDER_EXECUTABLE}}. Work only in this task directory. No downloaded models. Deliver self-contained create_asset.py, asset.blend, asset.glb, scene_manifest.json, work_state.md and final_report.md. Rebuilding create_asset.py alone in a clean directory must regenerate all four source/scene/manifest outputs.
- Put each instance under an EMPTY root named family_NN (for example crate_01..crate_04). Parent all of its visible mesh pieces below that root; roots must not be nested inside other asset roots. Mesh names must be unique, semantic and preserved in fresh GLB import. Cameras/lights may be outside these roots. No extra visible meshes outside the asset roots.
- Use at most 180,000 evaluated triangles and 24 materials for the entire scene. Solid palette materials are acceptable; any image textures need usable UVs and embedded images. Export actual materials and intended hard edges, with no missing faces, degenerate geometry, negative scale or external dependencies. Do not add unnecessary subdivision to low-poly assets.
- scene_manifest.json must be {"schemaVersion":1,"assets":[{"root":"crate_01","family":"crate","support":"terrain_01","supportMeshes":["crate_01_body"],"supportMode":"resting"}, ...]}. List EVERY instance once, including terrain_01 with support:null, supportMeshes:[], supportMode:"foundation". supportMeshes names the actual mesh pieces that touch the declared support (all feet/wheels where relevant). Those meshes must belong to the asset. Resting mode is for downward support; only lanterns use supportMode:"attached", with their bracket mesh listed and support:"depot_01". All other assets use resting. Stacks must declare the actual supporting asset and must ultimately connect to terrain without cycles. The evaluator uses actual evaluated geometry; a self-authored manifest does not prove correct placement or contact.
- Provide complete-scene views plus readable views of every individual family, including reverse sides and joints. Record which images you actually opened and unresolved issues. Verify the fresh GLB as well as the authored scene. A good overview is not evidence that every asset is finished.

Do not ask follow-up questions. Build, inspect, refine and finish within the assigned budget.`,
  visualBrief: "A complete playable low-poly courier-depot environment with 21 finished asset families, coherent palette, a fully constructed depot, loading platform and ramp, cargo, furniture, utility props and varied vegetation. Individual assets must retain detail and coherent construction under close inspection. All supports, placements and orientations must be credible, with open routes, doors and intentional negative spaces.",
  visualCriteria: [
    ...DEPOT_ASSETS.flatMap(asset => Array.from({ length: asset.count }, (_, index) => {
      const root = `${asset.id}_${String(index + 1).padStart(2, "0")}`;
      return { id: `asset_${root}`, category: "style" as const,
        question: `Across close and reverse views, is instance ${root} individually finished with ${asset.detail}, with credible orientation and supported placement in its contextual views, free of visible floating or unintended penetration? A pass requires both asset quality and integration; occluded contacts remain unclear.`, critical: true };
    })),
    { id: "scene_support", category: "spatial_relation", question: "Are all visible ground contacts, stacked cargo and wall attachments supported without floating or excessive burial?", critical: true },
    { id: "scene_clearance", category: "spatial_relation", question: "Are doors, loading access and the central approach open, with no unintended interpenetrating props?", critical: true },
    { id: "scene_orientation", category: "spatial_relation", question: "Do the entrance, bench and functional props face their intended areas and sit at credible rotations and scale?", critical: true },
    { id: "scene_consistency", category: "style", question: "Does the whole scene have consistent low-poly finish, scale, palette and detail quality across foreground, background and reverse sides?", critical: true },
  ],
  rubric: {
    requiredNameGroups: DEPOT_ASSETS.map(asset => [asset.id]), minimumMeshObjects: 45,
    minimumMaterials: 6, triangleRange: [10000, 180000], maximumExtent: 26,
    requireAnimation: false, finishProfile: "intentional_low_poly", minimumUvMeshRatio: 0,
    minimumSmoothFaceRatio: 0, maximumSmoothFaceRatio: 0.25, requireRefinementEvidence: false,
  },
};
