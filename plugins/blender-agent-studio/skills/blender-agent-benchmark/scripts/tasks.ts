export type BenchmarkTask = {
  id: string;
  title: string;
  suites: Array<"smoke" | "quick" | "full">;
  prompt: string;
  animationFrames: number[];
  rubric: {
    requiredNameGroups: string[][];
    minimumMeshObjects: number;
    minimumMaterials: number;
    triangleRange: [number, number];
    maximumExtent: number;
    requireAnimation: boolean;
    minimumActionSpan?: number;
  };
};

export const BENCHMARK_TASKS: BenchmarkTask[] = [
  {
    id: "signal_lantern",
    title: "Stylized signal lantern",
    suites: ["smoke", "quick", "full"],
    prompt: `Create a polished, game-ready stylized railway signal lantern in Blender.

The lantern must have a stable base, a visibly separate body, a warm glass chamber with a readable light or flame inside, a protective top cap, and an arched carry handle that is visibly attached at both sides. Add enough purposeful construction detail that it reads as a manufactured prop from every side, while keeping a clean low-poly/stylized silhouette.

Requirements:
- Use Blender Python and the Blender CLI at {{BLENDER_EXECUTABLE}}.
- Work only in the current task directory.
- Deliver create_asset.py, asset.blend, and asset.glb.
- Use semantic object and material names.
- Keep the asset under 18,000 evaluated triangles and under 3 meters on its largest axis.
- The GLB must preserve the intended orientation and materials.
- Include a short final_report.md describing the result and any known limitations.

Do not ask follow-up questions. Build, inspect, and refine the asset before finishing.`,
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
      triangleRange: [250, 18_000],
      maximumExtent: 3,
      requireAnimation: false,
    },
  },
  {
    id: "tabletop_press",
    title: "Tabletop lever press",
    suites: ["quick", "full"],
    prompt: `Create a polished, game-ready stylized tabletop manual press in Blender.

It must visibly explain how it works: a stable base supports an upright frame; a hand lever rotates around a real pivot; a connected linkage or rack drives a vertical ram; the ram aligns over a die; and a supported collection tray sits below or beside the die. Include a readable return spring or equivalent return mechanism. No major functional part should appear to float or connect only by visual coincidence.

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
      triangleRange: [400, 24_000],
      maximumExtent: 3,
      requireAnimation: false,
    },
  },
  {
    id: "winch_drawbridge",
    title: "Animated miniature winch drawbridge",
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
      triangleRange: [500, 28_000],
      maximumExtent: 4,
      requireAnimation: true,
      minimumActionSpan: 47,
    },
  },
  {
    id: "foot_pump_holdout",
    title: "Animated foot-operated air pump",
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
      triangleRange: [400, 24_000],
      maximumExtent: 3,
      requireAnimation: true,
      minimumActionSpan: 35,
    },
  },
];
