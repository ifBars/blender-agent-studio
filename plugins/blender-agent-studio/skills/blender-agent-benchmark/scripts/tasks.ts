export type BenchmarkTask = {
  id: string;
  title: string;
  category:
    | "prop_creation"
    | "assembly_creation"
    | "animation_creation"
    | "finish_quality_control";
  capabilities: Array<
    | "geometry"
    | "materials"
    | "lighting"
    | "placement"
    | "animation"
    | "spatial_relations"
    | "instruction_following"
  >;
  suites: Array<"smoke" | "quick" | "full">;
  prompt: string;
  visualBrief: string;
  animationFrames: number[];
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
];
