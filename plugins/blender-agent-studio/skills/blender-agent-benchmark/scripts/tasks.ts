export type VisualCriterion = {
  id: string;
  category:
    | "object_presence"
    | "count"
    | "attribute"
    | "spatial_relation"
    | "material"
    | "lighting"
    | "style"
    | "motion"
    | "deformation";
  question: string;
  critical: boolean;
};

export type CategorySignalMetric =
  | "lights"
  | "cameras"
  | "node_materials"
  | "geometry_nodes_modifiers"
  | "simulation_modifiers"
  | "rigid_body_objects"
  | "armatures"
  | "bones"
  | "weighted_meshes"
  | "shape_keys"
  | "constraints";

export type BenchmarkTask = {
  id: string;
  title: string;
  category:
    | "prop_creation"
    | "assembly_creation"
    | "animation_creation"
    | "finish_quality_control"
    | "environment_creation"
    | "procedural_creation"
    | "character_creation"
    | "simulation_creation"
    | "integrated_gauntlet";
  capabilities: Array<
    | "geometry"
    | "materials"
    | "lighting"
    | "placement"
    | "animation"
    | "spatial_relations"
    | "instruction_following"
    | "composition"
    | "camera"
    | "procedural_system"
    | "rigging"
    | "deformation"
    | "simulation"
  >;
  suites: Array<"smoke" | "quick" | "full" | "challenge" | "gauntlet">;
  difficultyProfile?: "gauntlet";
  prompt: string;
  visualBrief: string;
  visualCriteria: VisualCriterion[];
  animationFrames: number[];
  requiredVideo?: {
    filename: string;
    durationSeconds: number;
    fps: number;
    toleranceSeconds: number;
  };
  requireIterationReview?: boolean;
  rubric: {
    requiredNameGroups: string[][];
    minimumMeshObjects: number;
    minimumMaterials: number;
    triangleRange: [number, number];
    maximumExtent: number;
    requireAnimation: boolean;
    minimumActionSpan?: number;
    finishProfile: "polished_smooth" | "intentional_low_poly";
    minimumUvMeshRatio: number;
    minimumSmoothFaceRatio: number;
    maximumSmoothFaceRatio?: number;
    requireRefinementEvidence: boolean;
    categorySignals?: Array<{
      metric: CategorySignalMetric;
      minimum: number;
      label: string;
    }>;
  };
};

export const BENCHMARK_TASKS: BenchmarkTask[] = [
  {
    id: "signal_lantern",
    title: "Stylized signal lantern",
    category: "prop_creation",
    capabilities: [
      "geometry",
      "materials",
      "lighting",
      "spatial_relations",
      "instruction_following",
    ],
    suites: ["smoke", "quick", "full"],
    prompt: `Create a polished, game-ready stylized railway signal lantern in Blender.

The lantern must have a stable base, a visibly separate body, a warm glass chamber with a readable light or flame inside, a protective top cap, and an arched carry handle that is visibly attached at both sides. Add purposeful secondary and tertiary construction detail so it reads as a finished manufactured prop from every side. Use smooth curves, clean bevels, and polished stylized surfaces; low-poly is not requested.

Requirements:
- Use Blender Python and the Blender CLI at {{BLENDER_EXECUTABLE}}.
- Work only in the current task directory.
- Deliver create_asset.py, asset.blend, and asset.glb.
- Use semantic object and material names.
- Keep the asset under 24,000 evaluated triangles and under 3 meters on its largest axis.
- The GLB must preserve the intended orientation and materials.
- Include a short final_report.md describing the result and any known limitations.

Do not ask follow-up questions. Build, inspect, and refine the asset before finishing.`,
    visualBrief:
      "A polished stylized railway signal lantern with a stable base, separate manufactured body, warm glass chamber and visible flame/light, protective cap, and a handle attached at both sides. It should have smooth curves, clean bevels, secondary and tertiary construction detail, coherent materials, and no blockout or floating-part residue.",
    visualCriteria: [
      { id: "lantern_parts", category: "object_presence", question: "Are the base, body, glass chamber, internal light, cap, and handle all visibly present?", critical: true },
      { id: "lantern_handle_attachment", category: "spatial_relation", question: "Is the arched handle visibly attached to both sides of the lantern?", critical: true },
      { id: "lantern_glass_light", category: "material", question: "Does the chamber read as warm glass with a distinct visible light or flame inside?", critical: true },
      { id: "lantern_finish", category: "style", question: "Do the silhouette, curves, bevels, and detail read as a polished stylized prop rather than a blockout?", critical: false },
    ],
    animationFrames: [],
    rubric: {
      requiredNameGroups: [
        ["base", "foot"],
        ["body", "housing", "frame"],
        ["glass", "lens", "chamber"],
        ["light", "flame", "emitter"],
        ["cap", "top", "roof"],
        ["handle", "grip"],
      ],
      minimumMeshObjects: 8,
      minimumMaterials: 4,
      triangleRange: [1_200, 24_000],
      maximumExtent: 3,
      requireAnimation: false,
      finishProfile: "polished_smooth",
      minimumUvMeshRatio: 0.6,
      minimumSmoothFaceRatio: 0.35,
      requireRefinementEvidence: true,
    },
  },
  {
    id: "realistic_fire_lantern_showcase",
    title: "Realistic animated oil lantern with moving flame",
    category: "animation_creation",
    capabilities: [
      "geometry",
      "materials",
      "lighting",
      "placement",
      "animation",
      "spatial_relations",
      "instruction_following",
      "composition",
      "camera",
      "deformation",
    ],
    suites: ["challenge"],
    prompt: `Create a realistic, portfolio-quality vintage oil railway lantern in Blender with a continuously moving fire animation.

The lantern must look physically manufactured rather than stylized or primitive-built. Include a weighted aged-metal base, vented fuel reservoir and burner controls, a visible wick and wick collar, a clear curved glass globe with believable thickness and reflections, a protective upper chimney and vent cap, structural side rails, and an arched carry handle visibly attached at both sides. Use realistic scale, small assembly seams, fasteners, rolled edges, subtle wear, roughness variation, and grounded contacts. Materials must clearly read as aged brass or copper, blackened steel, clear heat-resistant glass, dark wick, and warm emissive flame. The glass must remain visibly transparent and non-emissive in the final render engine: an opaque, white, or blown-out globe is a failed result even when the material graph uses transmission.

Create a 15-second fire animation at 24 fps over frames 1 through 360. The flame must visibly evolve throughout the shot with asymmetric shape change, lean, stretch, compression, split-tip or tongue variation, emissive/color variation, and coupled light flicker. It must remain attached to the wick, stay inside the globe, avoid looping every few frames, and never collapse, teleport, clip through the glass, or look like a rigid glowing cone. Use exportable object, armature, or shape-key animation for the visible flame; procedural shader variation may supplement but not replace visible geometry motion. A traceable orange, yellow, and blue flame silhouette must remain visibly separate from the glass and burner in every sampled frame and in the encoded MP4. Light-only flicker, exposure change, or a uniformly glowing globe does not satisfy visible flame motion.

Render a locked-camera 15-second MP4 named lamp_fire_15s.mp4 at exactly 24 fps. Use a realistic product-shot composition where the full lamp remains visible and the flame motion is readable through the glass. Encode with Blender's FFmpeg output using MPEG-4/H.264 or another broadly playable MP4-compatible codec. Also preserve the 1-360 animation in asset.blend and asset.glb.

Requirements:
- Use Blender Python and the Blender CLI at {{BLENDER_EXECUTABLE}}.
- Work only in the current task directory.
- Deliver create_asset.py, asset.blend, asset.glb, lamp_fire_15s.mp4, iteration_review.json, and final_report.md.
- Use semantic object, material, light, camera, action, flame-control, and moving-part names.
- Keep the asset between 12,000 and 60,000 evaluated triangles and under 1.2 meters on its largest aggregate world-bounds axis.
- Use at least six visually distinct node-based materials, two authored lights, one authored hero camera, and at least three shape keys or equivalent exportable deformation controls for the flame.
- Preserve orientation, materials, hierarchy, smooth shading, flame deformation, and the 1-360 action in the GLB.
- Render and inspect the fixed six-view evidence plus flame frames 1, 90, 180, 270, and 360.
- Preserve the first complete candidate, run the separate critic pass, repair the highest-impact visible flame, glass, material, or construction defect in durable source, and retain the repair only after an identical evidence recheck shows no regression.

Do not ask follow-up questions. Produce a complete realistic deliverable and verify the full video at normal speed before finishing.`,
    visualBrief:
      "A realistic vintage oil railway lantern with aged manufactured metal, clear thick glass, visible wick and burner, chimney, side rails, attached carry handle, and a warm deforming flame. Six views must remain portfolio-finished. Across the sampled 15-second animation the flame must visibly change shape and color while staying attached to the wick and contained inside the globe; the lamp and camera remain stable.",
    visualCriteria: [
      { id: "fire_lantern_parts", category: "object_presence", question: "Are the weighted base, reservoir and controls, wick and collar, thick glass globe, chimney and vent cap, side rails, and attached handle visibly present?", critical: true },
      { id: "fire_lantern_realism", category: "style", question: "Does the lantern read as a realistically manufactured portfolio prop with seams, fasteners, rolled edges, wear, grounded contacts, and no primitive blockout residue?", critical: true },
      { id: "fire_lantern_materials", category: "material", question: "Do aged brass or copper, blackened steel, clear heat-resistant glass, dark wick, and emissive fire read as distinct believable substances?", critical: true },
      { id: "fire_lantern_glass", category: "material", question: "Is the glass visibly curved, thick, transparent, and non-emissive with controlled reflection and transmission, with no opaque white-out, while leaving the flame and burner readable?", critical: true },
      { id: "fire_lantern_flame_motion", category: "deformation", question: "Across frames 1, 90, 180, 270, and 360 is a distinct orange, yellow, or blue flame silhouette visible and does it show substantial asymmetric shape evolution rather than light-only flicker, a rigid cone, or simple uniform scale?", critical: true },
      { id: "fire_lantern_flame_attachment", category: "motion", question: "Does the moving flame remain attached to the wick, contained inside the globe, and free of teleporting, collapse, or clipping at every sampled frame?", critical: true },
      { id: "fire_lantern_flicker", category: "lighting", question: "Do emissive color and nearby illumination vary plausibly with the flame without unstable exposure or unreadable black frames?", critical: false },
      { id: "fire_lantern_finish", category: "style", question: "Are the silhouette, backside construction, small details, surface finish, and product presentation consistently realistic in all six views?", critical: false },
    ],
    animationFrames: [1, 90, 180, 270, 360],
    requiredVideo: {
      filename: "lamp_fire_15s.mp4",
      durationSeconds: 15,
      fps: 24,
      toleranceSeconds: 0.25,
    },
    requireIterationReview: true,
    rubric: {
      requiredNameGroups: [
        ["base", "foot"],
        ["reservoir", "fuel", "tank"],
        ["burner", "control", "knob"],
        ["wick"],
        ["glass", "globe", "chamber"],
        ["chimney", "vent"],
        ["cap", "roof", "top"],
        ["rail", "guard", "frame"],
        ["handle", "grip"],
        ["flame", "fire"],
      ],
      minimumMeshObjects: 24,
      minimumMaterials: 6,
      triangleRange: [12_000, 60_000],
      maximumExtent: 1.2,
      requireAnimation: true,
      minimumActionSpan: 359,
      finishProfile: "polished_smooth",
      minimumUvMeshRatio: 0.75,
      minimumSmoothFaceRatio: 0.65,
      requireRefinementEvidence: true,
      categorySignals: [
        { metric: "lights", minimum: 2, label: "authored lights" },
        { metric: "cameras", minimum: 1, label: "authored cameras" },
        { metric: "node_materials", minimum: 6, label: "node-based materials" },
        { metric: "shape_keys", minimum: 3, label: "flame shape keys" },
      ],
    },
  },
  {
    id: "tabletop_press",
    title: "Tabletop lever press",
    category: "assembly_creation",
    capabilities: [
      "geometry",
      "materials",
      "placement",
      "spatial_relations",
      "instruction_following",
    ],
    suites: ["quick", "full"],
    prompt: `Create a polished, game-ready stylized tabletop manual press in Blender.

It must visibly explain how it works: a stable base supports an upright frame; a hand lever rotates around a real pivot; a connected linkage or rack drives a vertical ram; the ram aligns over a die; and a supported collection tray sits below or beside the die. Include a readable return spring or equivalent return mechanism. No major functional part should appear to float or connect only by visual coincidence. Finish it as a smooth, detailed manufactured prop rather than a primitive blockout. Low-poly is not requested.

Requirements:
- Use Blender Python and the Blender CLI at {{BLENDER_EXECUTABLE}}.
- Work only in the current task directory.
- Deliver create_asset.py, asset.blend, and asset.glb.
- Use semantic object and material names.
- Keep the asset under 24,000 evaluated triangles and under 3 meters on its largest axis.
- Use at least three visually distinct materials suitable for a stylized industrial prop.
- The GLB must preserve the intended orientation and materials.
- Include a short final_report.md describing the result and any known limitations.

Do not ask follow-up questions. Build, inspect, and refine the asset before finishing.`,
    visualBrief:
      "A finished tabletop manual press whose base, frame, lever pivot, linkage or rack, ram, die, spring, and collection tray visibly form a plausible mechanism. The asset should have polished industrial surfaces, smooth curves and bevels where appropriate, coherent material separation, supported contacts, and no blockout residue.",
    visualCriteria: [
      { id: "press_parts", category: "object_presence", question: "Are the base, upright frame, lever, pivot, linkage or rack, ram, die, return mechanism, and tray visibly present?", critical: true },
      { id: "press_drive_chain", category: "spatial_relation", question: "Does the lever visibly connect through a plausible drive mechanism to a ram aligned over the die?", critical: true },
      { id: "press_supports", category: "spatial_relation", question: "Are the spring, tray, and major functional parts visibly supported without floating or coincidental contacts?", critical: true },
      { id: "press_finish", category: "style", question: "Does the assembly read as a finished manufactured prop with coherent material separation and refinement?", critical: false },
    ],
    animationFrames: [],
    rubric: {
      requiredNameGroups: [
        ["base", "foot"],
        ["frame", "upright", "column"],
        ["lever", "handle"],
        ["pivot", "hinge", "pin"],
        ["link", "rack", "cam", "gear"],
        ["ram", "punch", "plunger"],
        ["die", "anvil"],
        ["spring", "return"],
        ["tray", "collector"],
      ],
      minimumMeshObjects: 12,
      minimumMaterials: 3,
      triangleRange: [1_800, 24_000],
      maximumExtent: 3,
      requireAnimation: false,
      finishProfile: "polished_smooth",
      minimumUvMeshRatio: 0.6,
      minimumSmoothFaceRatio: 0.3,
      requireRefinementEvidence: true,
    },
  },
  {
    id: "winch_drawbridge",
    title: "Animated miniature winch drawbridge",
    category: "animation_creation",
    capabilities: [
      "geometry",
      "materials",
      "placement",
      "animation",
      "spatial_relations",
      "instruction_following",
    ],
    suites: ["quick", "full"],
    prompt: `Create a polished, game-ready stylized miniature winch drawbridge assembly in Blender.

The scene must include two sturdy side towers or supports, a hinged bridge deck, a crossbeam, a visible winch drum with axle or crank, and two visible chains or cables that plausibly connect the winch system to the deck. Animate a mechanically readable lift cycle: frame 1 is fully lowered, frame 24 is about halfway raised, and frame 48 is fully raised. The deck must rotate around its hinge rather than translating freely, and the cables should remain visually associated with the moving system.

Requirements:
- Use Blender Python and the Blender CLI at {{BLENDER_EXECUTABLE}}.
- Work only in the current task directory.
- Deliver create_asset.py, asset.blend, and asset.glb with the animation exported.
- Use semantic object, material, action, and moving-part names.
- Set the scene range to include frames 1 through 48.
- Keep the asset under 28,000 evaluated triangles and under 4 meters on its largest axis.
- The GLB must preserve orientation, materials, hierarchy, and animation.
- Include a short final_report.md describing the result and any known limitations.

Do not ask follow-up questions. Build, inspect, and refine the asset before finishing.`,
    visualBrief:
      "A polished miniature winch drawbridge with sturdy supports, hinged deck, crossbeam, visible drum and crank, and two cables that remain plausibly connected throughout a lowered-to-raised cycle. Construction, pivots, materials, and finish must remain coherent in every view and critical frame.",
    visualCriteria: [
      { id: "bridge_parts", category: "object_presence", question: "Are two supports, the hinged deck, crossbeam, winch drum, axle or crank, and two cables visibly present?", critical: true },
      { id: "bridge_hinge", category: "motion", question: "Does the deck rotate around a fixed visible hinge from lowered through halfway to raised?", critical: true },
      { id: "bridge_cables", category: "motion", question: "Do both cables remain plausibly connected to the winch system and moving deck at every critical frame?", critical: true },
      { id: "bridge_finish", category: "style", question: "Does construction and surface finish remain coherent across views and animation frames without blockout residue?", critical: false },
    ],
    animationFrames: [1, 24, 48],
    rubric: {
      requiredNameGroups: [
        ["tower", "support", "pier"],
        ["bridge", "deck"],
        ["hinge", "pivot"],
        ["beam", "crossbeam", "gantry"],
        ["winch", "drum", "spool"],
        ["axle", "crank", "handle"],
        ["chain", "cable", "rope"],
      ],
      minimumMeshObjects: 12,
      minimumMaterials: 3,
      triangleRange: [2_200, 28_000],
      maximumExtent: 4,
      requireAnimation: true,
      minimumActionSpan: 47,
      finishProfile: "polished_smooth",
      minimumUvMeshRatio: 0.55,
      minimumSmoothFaceRatio: 0.2,
      requireRefinementEvidence: true,
    },
  },
  {
    id: "foot_pump_holdout",
    title: "Animated foot-operated air pump",
    category: "animation_creation",
    capabilities: [
      "geometry",
      "materials",
      "placement",
      "animation",
      "spatial_relations",
      "instruction_following",
    ],
    suites: ["full"],
    prompt: `Create a polished, game-ready stylized foot-operated air pump in Blender.

The pump must have a stable base, a hinged foot pedal with a non-slip pad, a cylinder, a piston or plunger connection driven by the pedal, a visible return spring, a hose with a nozzle, and a small readable pressure gauge. Animate one complete pumping stroke over frames 1 through 36. The pedal must rotate around a plausible hinge and visibly drive the piston connection.

Requirements:
- Use Blender Python and the Blender CLI at {{BLENDER_EXECUTABLE}}.
- Work only in the current task directory.
- Deliver create_asset.py, asset.blend, and asset.glb with the animation exported.
- Use semantic object, material, action, and moving-part names.
- Keep the asset under 24,000 evaluated triangles and under 3 meters on its largest axis.
- The GLB must preserve orientation, materials, hierarchy, and animation.
- Include a short final_report.md describing the result and any known limitations.

Do not ask follow-up questions. Build, inspect, and refine the asset before finishing.`,
    visualBrief:
      "A polished foot-operated air pump with a stable base, hinged non-slip pedal, cylinder and driven piston connection, return spring, hose, nozzle, and readable gauge. The pumping stroke must be mechanically connected and the finished prop must not read as a primitive blockout.",
    visualCriteria: [
      { id: "pump_parts", category: "object_presence", question: "Are the base, pedal and pad, hinge, cylinder, piston connection, spring, hose, nozzle, and gauge visibly present?", critical: true },
      { id: "pump_drive", category: "motion", question: "Does the pedal rotate around a plausible hinge and visibly drive the piston through the full stroke?", critical: true },
      { id: "pump_hose_gauge", category: "spatial_relation", question: "Are the hose, nozzle, and gauge connected and readable rather than floating decoration?", critical: true },
      { id: "pump_finish", category: "style", question: "Does the prop read as polished and intentionally manufactured rather than a primitive blockout?", critical: false },
    ],
    animationFrames: [1, 18, 36],
    rubric: {
      requiredNameGroups: [
        ["base", "foot"],
        ["pedal", "tread"],
        ["hinge", "pivot"],
        ["cylinder", "barrel"],
        ["piston", "plunger", "rod"],
        ["spring", "return"],
        ["hose", "tube"],
        ["nozzle", "valve"],
        ["gauge", "dial"],
      ],
      minimumMeshObjects: 12,
      minimumMaterials: 3,
      triangleRange: [1_800, 24_000],
      maximumExtent: 3,
      requireAnimation: true,
      minimumActionSpan: 35,
      finishProfile: "polished_smooth",
      minimumUvMeshRatio: 0.6,
      minimumSmoothFaceRatio: 0.35,
      requireRefinementEvidence: true,
    },
  },
  {
    id: "ceramic_lamp_finish_holdout",
    title: "Smooth ceramic table lamp finish study",
    category: "finish_quality_control",
    capabilities: [
      "geometry",
      "materials",
      "lighting",
      "placement",
      "spatial_relations",
      "instruction_following",
    ],
    suites: ["full"],
    prompt: `Create a polished, game-ready ceramic table lamp in Blender.

The lamp must have a stable weighted base, a smooth ceramic body with an intentional profile, a metal neck and socket assembly, a translucent fabric shade with visible thickness and clean top and bottom rims, a bulb visible from a reasonable low angle, a small switch, and a power cord that rests naturally on the ground. The result should look like a finished portfolio prop: smooth silhouettes, controlled bevels, coherent UVs or procedural coordinates, material variation that clearly separates glazed ceramic, brushed metal, fabric, glass, and rubber, and restrained tertiary detail. This is not a low-poly request.

Requirements:
- Use Blender Python and the Blender CLI at {{BLENDER_EXECUTABLE}}.
- Work only in the current task directory.
- Deliver create_asset.py, asset.blend, and asset.glb.
- Use semantic object and material names.
- Keep the asset under 36,000 evaluated triangles and under 2 meters on its largest axis.
- Preserve editable refinement where practical and verify the evaluated result.
- The GLB must preserve orientation, materials, UVs, hierarchy, and smooth shading.
- Include a short final_report.md that names the stages completed and any known limitations.

Do not ask follow-up questions. Build, inspect, and refine the asset before finishing.`,
    visualBrief:
      "A portfolio-quality ceramic table lamp with a smooth profiled body, metal socket and neck, thick-rimmed fabric shade, bulb, switch, and naturally resting power cord. Glazed ceramic, brushed metal, fabric, glass, and rubber must read as distinct materials. Smooth finish, restrained tertiary detail, grounded contacts, and absence of blockout residue are central.",
    visualCriteria: [
      { id: "lamp_parts", category: "object_presence", question: "Are the weighted base, ceramic body, metal neck and socket, thick shade, bulb, switch, and power cord visibly present?", critical: true },
      { id: "lamp_materials", category: "material", question: "Do glazed ceramic, brushed metal, fabric, glass, and rubber read as distinct substances?", critical: true },
      { id: "lamp_cord_contact", category: "spatial_relation", question: "Does the power cord connect to the lamp and rest naturally on the ground?", critical: true },
      { id: "lamp_finish", category: "style", question: "Are the silhouette, rims, bevels, and tertiary detail portfolio-finished without faceting or blockout residue?", critical: false },
    ],
    animationFrames: [],
    rubric: {
      requiredNameGroups: [
        ["base", "foot"],
        ["ceramic", "body", "vessel"],
        ["neck", "stem"],
        ["socket", "holder"],
        ["shade", "fabric"],
        ["bulb", "lamp"],
        ["switch", "toggle"],
        ["cord", "cable", "wire"],
      ],
      minimumMeshObjects: 10,
      minimumMaterials: 5,
      triangleRange: [4_000, 36_000],
      maximumExtent: 2,
      requireAnimation: false,
      finishProfile: "polished_smooth",
      minimumUvMeshRatio: 0.75,
      minimumSmoothFaceRatio: 0.65,
      requireRefinementEvidence: true,
    },
  },
  {
    id: "low_poly_radio_control",
    title: "Explicit low-poly field radio control",
    category: "finish_quality_control",
    capabilities: [
      "geometry",
      "materials",
      "placement",
      "spatial_relations",
      "instruction_following",
    ],
    suites: ["full"],
    prompt: `Create an intentionally low-poly, game-ready portable field radio in Blender.

The style must use deliberate planar forms, selective hard edges, a compact faceted silhouette, and a small coherent color palette. Include a stable body, front speaker grille, readable tuning display, two knobs, a top carry handle attached at both sides, a short antenna with a protected base, corner guards, and a battery compartment seam. Preserve the intentionally faceted style; do not subdivide it into a smooth high-poly prop.

Requirements:
- Use Blender Python and the Blender CLI at {{BLENDER_EXECUTABLE}}.
- Work only in the current task directory.
- Deliver create_asset.py, asset.blend, and asset.glb.
- Use semantic object and material names.
- Keep the asset between 300 and 6,000 evaluated triangles and under 1 meter on its largest axis.
- Use UVs or procedural coordinates intentionally and avoid default materials.
- The GLB must preserve orientation, materials, hierarchy, and intentional hard edges.
- Include a short final_report.md that names the stages completed and any known limitations.

Do not ask follow-up questions. Build, inspect, and refine the asset before finishing.`,
    visualBrief:
      "An explicitly low-poly portable field radio with deliberate planar forms, selective hard edges, body, speaker grille, tuning display, two knobs, attached handle, protected antenna base, corner guards, and battery seam. The control tests whether intentional faceting is preserved instead of being smoothed away.",
    visualCriteria: [
      { id: "radio_parts", category: "object_presence", question: "Are the body, speaker grille, tuning display, two knobs, attached handle, antenna, corner guards, and battery seam visibly present?", critical: true },
      { id: "radio_counts", category: "count", question: "Are exactly two primary control knobs visible?", critical: true },
      { id: "radio_attachments", category: "spatial_relation", question: "Is the handle attached at both sides and the antenna seated in a protected base?", critical: true },
      { id: "radio_low_poly_style", category: "style", question: "Does the asset preserve deliberate planar forms and selective hard edges without accidental smoothing?", critical: true },
    ],
    animationFrames: [],
    rubric: {
      requiredNameGroups: [
        ["body", "housing"],
        ["speaker", "grille"],
        ["display", "tuning", "dial"],
        ["knob", "control"],
        ["handle", "grip"],
        ["antenna", "aerial"],
        ["guard", "corner"],
        ["battery", "compartment"],
      ],
      minimumMeshObjects: 9,
      minimumMaterials: 3,
      triangleRange: [300, 6_000],
      maximumExtent: 1,
      requireAnimation: false,
      finishProfile: "intentional_low_poly",
      minimumUvMeshRatio: 0.5,
      minimumSmoothFaceRatio: 0,
      maximumSmoothFaceRatio: 0.65,
      requireRefinementEvidence: false,
    },
  },
  {
    id: "observatory_workshop_challenge",
    title: "Compact observatory workshop environment",
    category: "environment_creation",
    capabilities: [
      "geometry",
      "materials",
      "lighting",
      "placement",
      "spatial_relations",
      "composition",
      "camera",
      "instruction_following",
    ],
    suites: ["challenge"],
    prompt: `Create a polished, game-ready compact observatory workshop environment in Blender.

Build a circular or octagonal room with a raised telescope platform, a ceiling aperture or split dome opening, a telescope on a mechanically plausible adjustable mount, a workbench with tools and papers, wall shelving, a ladder or stair connection to the platform, a cable route from the telescope to a control console, and clear walking space between the entrance, workbench, and platform. Establish a deliberate hero camera plus neutral diagnostic readability. Use a cool night source through the aperture and warm practical task lighting without hiding geometry in darkness.

Requirements:
- Use Blender Python and the Blender CLI at {{BLENDER_EXECUTABLE}}.
- Work only in the current task directory.
- Deliver create_asset.py, asset.blend, and asset.glb.
- Use semantic names for room assemblies, telescope parts, furniture, lights, camera, and materials.
- Keep the scene under 90,000 evaluated triangles and under 14 meters on its largest axis.
- Use at least six visually distinct node-based materials, at least three authored lights, and one authored hero camera.
- The GLB must preserve orientation, hierarchy, materials, and the walkable layout.
- Include a short final_report.md naming the critic pass, targeted repair, and any known limitations.

Do not ask follow-up questions. Build a complete first candidate, inspect it from fixed views, repair the highest-impact visible defect, and verify that the repair introduces no regression before finishing.`,
    visualBrief:
      "A compact observatory workshop whose room shell, raised platform, open dome or aperture, mounted telescope, workbench, shelves, access ladder or stairs, control console, and routed cable form a coherent navigable environment. Cool exterior night light and warm practical lights should clarify the scene without hiding unfinished areas.",
    visualCriteria: [
      { id: "observatory_zones", category: "object_presence", question: "Are the room shell, platform, aperture, mounted telescope, workbench, shelves, access route, console, and cable visibly present?", critical: true },
      { id: "observatory_navigation", category: "spatial_relation", question: "Is there believable clear circulation between the entrance, workbench, and raised telescope platform?", critical: true },
      { id: "observatory_telescope_mount", category: "spatial_relation", question: "Does the telescope sit on a mechanically plausible adjustable mount rather than floating or resting arbitrarily?", critical: true },
      { id: "observatory_lighting", category: "lighting", question: "Do cool aperture light and warm practical task lights create readable separation without concealing geometry?", critical: false },
      { id: "observatory_finish", category: "style", question: "Does the entire environment read as consistently finished across all views rather than as a dressed hero corner plus graybox backsides?", critical: false },
    ],
    animationFrames: [],
    rubric: {
      requiredNameGroups: [
        ["room", "shell", "wall"],
        ["platform", "deck"],
        ["aperture", "dome", "opening"],
        ["telescope", "scope"],
        ["mount", "tripod", "gimbal"],
        ["workbench", "desk"],
        ["shelf", "storage"],
        ["ladder", "stair", "step"],
        ["console", "control"],
        ["cable", "wire", "conduit"],
      ],
      minimumMeshObjects: 28,
      minimumMaterials: 6,
      triangleRange: [12_000, 90_000],
      maximumExtent: 14,
      requireAnimation: false,
      finishProfile: "polished_smooth",
      minimumUvMeshRatio: 0.55,
      minimumSmoothFaceRatio: 0.2,
      requireRefinementEvidence: true,
      categorySignals: [
        { metric: "lights", minimum: 3, label: "authored lights" },
        { metric: "cameras", minimum: 1, label: "authored cameras" },
        { metric: "node_materials", minimum: 6, label: "node-based materials" },
      ],
    },
  },
  {
    id: "procedural_bridge_challenge",
    title: "Editable procedural stone bridge generator",
    category: "procedural_creation",
    capabilities: [
      "geometry",
      "materials",
      "placement",
      "spatial_relations",
      "procedural_system",
      "instruction_following",
    ],
    suites: ["challenge"],
    prompt: `Create an editable procedural stylized stone bridge generator in Blender.

Use Geometry Nodes for the authored bridge system. Expose meaningful controls for span length, deck width, arch rise, pier count, parapet height, stone variation seed, and optional lantern spacing. The default result must form a complete bridge with two grounded abutments, a readable arch or repeated arches, a traversable deck, parapets on both sides, structural piers where needed, and evenly distributed stones that do not visibly overlap or detach. Include a second named seeded variation in the scene for parameter-surface evidence. Preserve the editable node group in asset.blend and export a realized default bridge to asset.glb.

Requirements:
- Use Blender Python and the Blender CLI at {{BLENDER_EXECUTABLE}}.
- Work only in the current task directory.
- Deliver create_asset.py, asset.blend, and asset.glb.
- Use semantic names for the node group, inputs, source assets, bridge assemblies, and materials.
- Keep the realized default under 80,000 evaluated triangles and under 20 meters on its largest axis.
- Use at least three node-based materials and deterministic seeds.
- Include a short final_report.md listing exposed controls, tested values, the critic pass, targeted repair, and known limitations.

Do not ask follow-up questions. Build a complete first candidate, inspect the default and variation, repair the highest-impact defect, and verify the same configurations before finishing.`,
    visualBrief:
      "A finished stylized stone bridge generated by an editable Geometry Nodes system, with grounded abutments, readable arch structure, traversable deck, two parapets, plausible piers, and controlled stone variation. The default and seeded variation should both remain coherent without floating, overlapping, or detached pieces.",
    visualCriteria: [
      { id: "bridge_generator_structure", category: "object_presence", question: "Does the visible result contain grounded abutments, arch structure, a deck, two parapets, and plausible piers?", critical: true },
      { id: "bridge_generator_contacts", category: "spatial_relation", question: "Do stones, parapets, deck, arches, and piers connect without obvious floating, overlap, or detached repetition?", critical: true },
      { id: "bridge_generator_traversable", category: "spatial_relation", question: "Does the deck read as a continuous traversable path with protected sides?", critical: true },
      { id: "bridge_generator_variation", category: "style", question: "Does the seeded variation remain recognizably the same coherent generator rather than breaking layout or finish?", critical: false },
      { id: "bridge_generator_finish", category: "material", question: "Do stone, deck, and accent materials remain readable and intentionally varied across views?", critical: false },
    ],
    animationFrames: [],
    rubric: {
      requiredNameGroups: [
        ["bridge", "generator"],
        ["abutment", "anchor"],
        ["arch", "vault"],
        ["deck", "walkway"],
        ["parapet", "railing"],
        ["pier", "support"],
        ["stone", "block"],
        ["variation", "seed"],
      ],
      minimumMeshObjects: 8,
      minimumMaterials: 3,
      triangleRange: [8_000, 80_000],
      maximumExtent: 20,
      requireAnimation: false,
      finishProfile: "polished_smooth",
      minimumUvMeshRatio: 0.4,
      minimumSmoothFaceRatio: 0.1,
      requireRefinementEvidence: true,
      categorySignals: [
        { metric: "geometry_nodes_modifiers", minimum: 1, label: "Geometry Nodes modifiers" },
        { metric: "node_materials", minimum: 3, label: "node-based materials" },
      ],
    },
  },
  {
    id: "courier_robot_rig_challenge",
    title: "Rigged courier robot deformation challenge",
    category: "character_creation",
    capabilities: [
      "geometry",
      "materials",
      "placement",
      "animation",
      "spatial_relations",
      "rigging",
      "deformation",
      "instruction_following",
    ],
    suites: ["challenge"],
    prompt: `Create a polished, game-ready stylized biped courier robot with a reusable rig in Blender.

The robot must have a readable head and face display, torso cargo compartment, pelvis, two segmented arms with hands or grippers, two segmented legs with stable feet, shoulder and hip guards, and a small backpack or battery module. Build a semantic armature with deform bones and usable controls or constraints. Skin or rigid-bind the visible body appropriately. Animate a 48-frame delivery gesture: neutral at frame 1, balanced step and reach with the cargo compartment open by frame 24, and a stable presentation pose by frame 48. Elbows, knees, shoulders, hips, and torso must retain volume and avoid interpenetration in the extreme pose.

Requirements:
- Use Blender Python and the Blender CLI at {{BLENDER_EXECUTABLE}}.
- Work only in the current task directory.
- Deliver create_asset.py, asset.blend, and asset.glb with the rigged animation exported.
- Use semantic mesh, material, armature, bone, control, and action names.
- Keep the character under 55,000 evaluated triangles and under 2.5 meters tall.
- Use at least four visually distinct materials.
- Include a short final_report.md listing tested poses, the critic pass, targeted repair, and known export limitations.

Do not ask follow-up questions. Build a complete first candidate, inspect neutral and extreme poses from multiple views, repair the highest-impact deformation or readability defect, and re-check the same poses before finishing.`,
    visualBrief:
      "A polished biped courier robot with readable head display, cargo torso, segmented limbs, stable feet, protective guards, and backpack or battery. Neutral, reaching, and presentation poses should remain balanced and readable, with mechanically plausible joints, preserved volume, open cargo compartment, and no major clipping.",
    visualCriteria: [
      { id: "robot_parts", category: "object_presence", question: "Are the head display, cargo torso, pelvis, two segmented arms, grippers, two segmented legs, stable feet, guards, and backpack or battery visible?", critical: true },
      { id: "robot_pose_story", category: "motion", question: "Do the critical frames clearly progress from neutral to step-and-reach with open cargo to a stable presentation pose?", critical: true },
      { id: "robot_balance", category: "spatial_relation", question: "Do the feet, pelvis, torso, and reaching limb remain mechanically balanced and grounded in every critical frame?", critical: true },
      { id: "robot_deformation", category: "deformation", question: "Do shoulders, elbows, hips, knees, and torso preserve volume without major clipping or collapse in the extreme pose?", critical: true },
      { id: "robot_finish", category: "style", question: "Does the character read as a coherent game-ready stylized robot rather than disconnected primitives?", critical: false },
    ],
    animationFrames: [1, 24, 48],
    rubric: {
      requiredNameGroups: [
        ["head", "face", "display"],
        ["torso", "chest", "cargo"],
        ["pelvis", "hip"],
        ["arm", "shoulder"],
        ["hand", "gripper"],
        ["leg", "thigh", "shin"],
        ["foot", "ankle"],
        ["guard", "armor"],
        ["backpack", "battery"],
        ["armature", "rig"],
      ],
      minimumMeshObjects: 18,
      minimumMaterials: 4,
      triangleRange: [8_000, 55_000],
      maximumExtent: 2.5,
      requireAnimation: true,
      minimumActionSpan: 47,
      finishProfile: "polished_smooth",
      minimumUvMeshRatio: 0.55,
      minimumSmoothFaceRatio: 0.3,
      requireRefinementEvidence: true,
      categorySignals: [
        { metric: "armatures", minimum: 1, label: "armature objects" },
        { metric: "bones", minimum: 12, label: "armature bones" },
        { metric: "weighted_meshes", minimum: 1, label: "weighted meshes" },
      ],
    },
  },
  {
    id: "rigid_body_sorter_challenge",
    title: "Rigid-body marble sorter simulation",
    category: "simulation_creation",
    capabilities: [
      "geometry",
      "materials",
      "animation",
      "spatial_relations",
      "simulation",
      "instruction_following",
    ],
    suites: ["challenge"],
    prompt: `Create a deterministic rigid-body marble sorter simulation in Blender.

Build an elevated hopper that releases at least eight visible marbles onto a sloped track. The track must guide them through a passive alternating gate or splitter into two supported collection bins. Include side rails, a grounded frame, visible collision surfaces, and a stop or containment feature so marbles do not simply leave the apparatus. Use physically plausible scale, gravity, collision margins, mass, friction, and damping. Bake or convert the simulation to exportable keyframed motion over frames 1 through 96 while preserving the authored rigid-body setup in asset.blend.

Requirements:
- Use Blender Python and the Blender CLI at {{BLENDER_EXECUTABLE}}.
- Work only in the current task directory.
- Deliver create_asset.py, asset.blend, and asset.glb with the motion exported.
- Use semantic names for the hopper, marbles, track, rails, splitter, frame, bins, rigid bodies, and action data.
- Keep the apparatus under 45,000 evaluated triangles and under 6 meters on its largest axis.
- Use at least three visually distinct materials and a deterministic setup.
- Include a short final_report.md listing solver settings, observed critical frames, the critic pass, targeted repair, and any known limitations.

Do not ask follow-up questions. Build and bake a complete first candidate, inspect onset, split, and settle frames, repair the highest-impact causal defect, rebake only what is needed, and verify no containment or export regression before finishing.`,
    visualBrief:
      "A grounded rigid-body marble sorter with hopper, at least eight marbles, supported sloped track, rails, passive splitter, two bins, and containment. Critical frames should show release, guided travel and splitting, then a stable collected state without tunneling, unexplained teleportation, or escaped marbles.",
    visualCriteria: [
      { id: "sorter_parts", category: "object_presence", question: "Are the hopper, at least eight marbles, supported track, rails, splitter, frame, two bins, and containment visibly present?", critical: true },
      { id: "sorter_count", category: "count", question: "Are at least eight distinct marbles visible in the apparatus or collection bins?", critical: true },
      { id: "sorter_causality", category: "motion", question: "Do marbles visibly release from the hopper, follow the track, interact with the splitter, and reach the bins without teleporting?", critical: true },
      { id: "sorter_containment", category: "motion", question: "Do rails and bins contain the marbles without obvious tunneling, explosive motion, or escape by the settle frame?", critical: true },
      { id: "sorter_support", category: "spatial_relation", question: "Is the track and splitter visibly supported by a grounded frame rather than floating?", critical: false },
    ],
    animationFrames: [1, 48, 96],
    rubric: {
      requiredNameGroups: [
        ["hopper", "feeder"],
        ["marble", "ball"],
        ["track", "ramp"],
        ["rail", "guard"],
        ["splitter", "gate", "diverter"],
        ["frame", "support"],
        ["bin", "collector"],
        ["stop", "contain"],
      ],
      minimumMeshObjects: 18,
      minimumMaterials: 3,
      triangleRange: [3_000, 45_000],
      maximumExtent: 6,
      requireAnimation: true,
      minimumActionSpan: 95,
      finishProfile: "polished_smooth",
      minimumUvMeshRatio: 0.4,
      minimumSmoothFaceRatio: 0.25,
      requireRefinementEvidence: true,
      categorySignals: [
        { metric: "rigid_body_objects", minimum: 10, label: "rigid-body objects" },
      ],
    },
  },
  {
    id: "lunar_sample_cell_gauntlet",
    title: "Autonomous lunar sample-processing cell gauntlet",
    category: "integrated_gauntlet",
    difficultyProfile: "gauntlet",
    capabilities: [
      "geometry",
      "materials",
      "lighting",
      "placement",
      "animation",
      "spatial_relations",
      "instruction_following",
      "composition",
      "camera",
      "procedural_system",
      "rigging",
      "deformation",
      "simulation",
    ],
    suites: ["gauntlet"],
    prompt: `Create a polished, game-ready autonomous lunar sample-processing cell in Blender as one integrated environment, procedural system, rigged machine, and deterministic simulation.

The cell occupies a compact pressure-bay room with a sealed entrance, raised maintenance walkway, safety railings, a control station, overhead cable trays, and a central sample line. A hopper releases at least twelve color-coded sample capsules onto an editable Geometry Nodes conveyor with exposed controls for length, belt width, roller spacing, guard height, and seed. The conveyor must lead through a scanner arch to a three-way sorting station with three labeled collection bins.

Build a semantically rigged six-axis service robot beside the sorter. It needs a grounded pedestal, rotating base, shoulder, elbow, wrist, and two-finger gripper with visible joint housings and a cable or hose route that remains attached. Use an armature with meaningful bones, controls or constraints, and weighted or rigid-bound visible geometry.

Create a deterministic 120-frame operation:
- frame 1: capsules staged in the hopper, conveyor idle, robot in a safe home pose;
- frame 40: capsules travel on the conveyor through the scanner without escaping the rails;
- frame 80: the sorter directs capsules toward distinct bins while the robot reaches for one rejected capsule;
- frame 120: accepted capsules are contained in the bins, the rejected capsule is held or placed in a quarantine tray, and the robot is in a stable final pose.

Use authored rigid bodies or another genuine Blender simulation for capsule motion, then bake or convert the required result to exportable keyframed motion while preserving the authored simulation setup in asset.blend. The robot, conveyor, scanner, sorter, capsules, bins, and room must read as one causal production cell rather than unrelated objects. Use cool exterior/moon illumination plus warm industrial task lights and a deliberate hero camera, while keeping neutral multiview readability.

Requirements:
- Use Blender Python and the Blender CLI at {{BLENDER_EXECUTABLE}}.
- Work only in the current task directory.
- Deliver create_asset.py, asset.blend, and asset.glb with animation exported.
- Use semantic names for every major assembly, Geometry Nodes group and inputs, armature and bones, actions, simulation objects, lights, camera, and materials.
- Keep the complete authored scene between 15,000 and 120,000 evaluated triangles and under 18 meters on its largest aggregate world-bounds axis.
- Use at least eight visually distinct node-based materials, three authored lights, and one authored hero camera.
- Preserve the editable procedural conveyor, rig, constraints, and authored simulation in asset.blend; export realized geometry and animation to asset.glb.
- Render and inspect fixed multiview evidence plus frames 1, 40, 80, and 120 for both authored and fresh-imported artifacts.
- Retain before-repair evidence. Include final_report.md and iteration_review.json describing failed/unclear criteria, the targeted source repair, preserved invariants, and the identical-evidence regression check.

Do not ask follow-up questions. Produce a complete first candidate, run a separate evidence-backed critic pass, repair the highest-impact causal defect, and retain the repair only if the same gates and critical visible requirements do not regress.`,
    visualBrief:
      "A cohesive lunar sample-processing bay with sealed room, maintenance access, procedural guarded conveyor, scanner, three-way sorter and bins, twelve or more capsules, and a grounded six-axis service robot. Critical frames must show staged samples, contained travel, distinct sorting, robot rejection handling, and a stable final state. The rig, simulation, materials, lighting, contacts, and backsides must all remain production-finished and export-consistent.",
    visualCriteria: [
      { id: "gauntlet_room", category: "object_presence", question: "Are the sealed bay, entrance, raised maintenance walkway, railings, control station, and cable trays visibly present and coherent?", critical: true },
      { id: "gauntlet_line_parts", category: "object_presence", question: "Are the hopper, guarded conveyor, rollers, scanner arch, three-way sorter, three distinct bins, and quarantine tray visibly present?", critical: true },
      { id: "gauntlet_capsule_count", category: "count", question: "Are at least twelve distinct sample capsules visible across the hopper, line, bins, or robot interaction?", critical: true },
      { id: "gauntlet_robot_parts", category: "object_presence", question: "Does the robot visibly have a pedestal, rotating base, shoulder, elbow, wrist, two-finger gripper, joint housings, and attached cable or hose route?", critical: true },
      { id: "gauntlet_flow", category: "spatial_relation", question: "Does the hopper-to-conveyor-to-scanner-to-sorter-to-bins layout form one continuous, supported causal production flow?", critical: true },
      { id: "gauntlet_walkability", category: "spatial_relation", question: "Are maintenance access and the operator route believable without major blocked paths, floating platforms, or unsafe missing railings?", critical: false },
      { id: "gauntlet_materials", category: "material", question: "Do lunar structure, painted machine metal, belt rubber, capsule shells, emissive scanner, glass or display surfaces, and safety markings read as distinct materials?", critical: false },
      { id: "gauntlet_lighting", category: "lighting", question: "Do cool exterior light and warm task lights reveal the whole cell without hiding geometry, clipping highlights, or destroying material readability?", critical: false },
      { id: "gauntlet_capsule_motion", category: "motion", question: "Across critical frames, do capsules release, remain contained on the conveyor, pass through the scanner, sort toward distinct bins, and settle without teleporting or explosive motion?", critical: true },
      { id: "gauntlet_robot_motion", category: "motion", question: "Does the robot progress from safe home through a plausible reach to holding or placing a rejected capsule in quarantine?", critical: true },
      { id: "gauntlet_robot_deformation", category: "deformation", question: "Do robot joints, gripper, and attached cable or hose remain mechanically connected without collapse, clipping, or detachment in every critical pose?", critical: true },
      { id: "gauntlet_finish", category: "style", question: "Does the full environment remain consistently polished across every view and frame, without graybox backsides, generic primitive residue, or isolated showcase-only detail?", critical: false },
    ],
    animationFrames: [1, 40, 80, 120],
    rubric: {
      requiredNameGroups: [
        ["room", "bay", "shell"],
        ["entrance", "airlock", "door"],
        ["walkway", "catwalk", "platform"],
        ["rail", "guard"],
        ["control", "console", "station"],
        ["cable_tray", "conduit", "overhead_cable"],
        ["hopper", "feeder"],
        ["conveyor", "belt"],
        ["roller", "idler"],
        ["scanner", "sensor"],
        ["sorter", "diverter", "gate"],
        ["bin", "collector"],
        ["quarantine", "reject", "tray"],
        ["capsule", "sample"],
        ["robot", "armature", "rig"],
        ["pedestal", "robot_base"],
        ["shoulder", "upper_arm"],
        ["elbow", "forearm"],
        ["wrist", "gripper", "finger"],
        ["hose", "robot_cable", "umbilical"],
      ],
      minimumMeshObjects: 40,
      minimumMaterials: 8,
      triangleRange: [15_000, 120_000],
      maximumExtent: 18,
      requireAnimation: true,
      minimumActionSpan: 119,
      finishProfile: "polished_smooth",
      minimumUvMeshRatio: 0.6,
      minimumSmoothFaceRatio: 0.3,
      requireRefinementEvidence: true,
      categorySignals: [
        { metric: "lights", minimum: 3, label: "authored lights" },
        { metric: "cameras", minimum: 1, label: "authored cameras" },
        { metric: "node_materials", minimum: 8, label: "node-based materials" },
        { metric: "geometry_nodes_modifiers", minimum: 1, label: "Geometry Nodes modifiers" },
        { metric: "rigid_body_objects", minimum: 14, label: "rigid-body objects" },
        { metric: "armatures", minimum: 1, label: "armature objects" },
        { metric: "bones", minimum: 8, label: "armature bones" },
        { metric: "weighted_meshes", minimum: 1, label: "weighted meshes" },
        { metric: "constraints", minimum: 2, label: "object or pose constraints" },
      ],
    },
  },
];
