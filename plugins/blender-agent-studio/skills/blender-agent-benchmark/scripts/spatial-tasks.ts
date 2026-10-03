import type { BenchmarkTask } from "./tasks.ts";

const requirements = `
Use Blender Python and the Blender CLI at {{BLENDER_EXECUTABLE}}. Work only in the current task directory. Deliver a self-contained create_asset.py that reproduces asset.blend and asset.glb from a clean directory, plus final_report.md with known limitations. Use semantic object and material names, real meter-scale dimensions, smooth manufactured surfaces, bevels and purposeful details. Keep below 40,000 evaluated triangles and 3 meters maximum extent. No downloaded models. Build, inspect and refine before finishing. Do not ask follow-up questions.`;

const rubric: BenchmarkTask["rubric"] = {
  requiredNameGroups: [], minimumMeshObjects: 8, minimumMaterials: 3,
  triangleRange: [800, 40000], maximumExtent: 3, requireAnimation: false,
  finishProfile: "polished_smooth", minimumUvMeshRatio: 0.8,
  minimumSmoothFaceRatio: 0.6, requireRefinementEvidence: true,
};

export const SPATIAL_TASKS: BenchmarkTask[] = [
  {
    id: "joinery_stool", title: "Splayed-leg joinery stool", category: "assembly_creation",
    capabilities: ["geometry", "materials", "placement", "spatial_relations", "instruction_following"],
    suites: ["spatial"], animationFrames: [],
    prompt: `Create a finished compact wooden workshop stool, approximately 0.55 m tall. A rounded rectangular seat is supported by four outward-splayed legs. Four stretchers form a rectangular ring between the legs below the seat. Every leg must meet the seat underside, each stretcher must terminate into its two legs, and all four feet must rest on the same ground plane. Make credible joinery with restrained inset hardware. Preserve open space under the seat and inside the stretcher ring. Avoid protruding stretcher ends, floating trim and accidental gaps at joints. Use warm wood and contrasting metal hardware. The complete asset must withstand inspection from front, rear, side and underneath.` + requirements,
    visualBrief: "A finished 0.55 m wooden stool with rounded rectangular seat, four splayed legs, a connected four-stretcher ring, coplanar feet and restrained inset hardware. Inspect underside joints and preserve intended negative space.",
    visualCriteria: [
      { id: "seat_support", category: "spatial_relation", question: "Do all four leg tops meet the seat underside without open seams or piercing its upper surface?", critical: true },
      { id: "stretcher_joints", category: "spatial_relation", question: "Do all eight stretcher ends meet their legs without floating gaps or exposed protruding ends?", critical: true },
      { id: "ground_support", category: "spatial_relation", question: "Do all four feet terminate on the same plane without visibly hovering or being buried?", critical: true },
      { id: "negative_space", category: "spatial_relation", question: "Are the spaces under the seat and inside the stretcher ring intentionally open and free of accidental crossing geometry?", critical: true },
      { id: "assembly_count", category: "count", question: "Are exactly four legs and four stretchers visible across the views?", critical: true },
      { id: "finish", category: "style", question: "Are curved edges, wood finish and inset hardware coherent on reverse sides and underside as well as the hero view?", critical: false },
    ],
    rubric: { ...rubric, requiredNameGroups: [["seat"], ["leg"], ["stretcher"], ["hardware", "pin", "bolt", "screw", "rivet", "fastener"]] },
  },
  {
    id: "task_lamp_clearance_holdout", title: "Articulated task-lamp clearance holdout", category: "assembly_creation",
    capabilities: ["geometry", "materials", "placement", "spatial_relations", "instruction_following"],
    suites: ["spatial"], animationFrames: [],
    prompt: `Create a finished desktop articulated task lamp, approximately 0.65 m tall. It has a weighted round base, a two-segment angled arm connected through an elbow hinge, a pivoting bell-shaped hollow shade, and a distinct recessed bulb. Each mechanical joint needs credible contacting hinge hardware. Leave readable clearances around rotating parts; the two arm segments must not pass through one another. The shade rim must remain open, the bulb must sit inside without intersecting the shade, and the shade must connect to its support. Include a power cable visibly seated in its base socket and resting on the desk plane. Use enamel, brushed metal and dark rubber. The entire lamp, including the rear of the shade, must be finished.` + requirements,
    visualBrief: "A finished articulated desktop lamp with weighted round base, two angled arm segments, credible elbow and shade hinges, hollow open bell shade, recessed nonintersecting bulb, and seated cable resting on the desk plane.",
    visualCriteria: [
      { id: "joint_continuity", category: "spatial_relation", question: "Are base-to-arm, elbow, and arm-to-shade connections physically continuous through credible hinge hardware?", critical: true },
      { id: "hinge_clearance", category: "spatial_relation", question: "Do adjacent arms and hinge cheeks retain readable mechanical clearance without unintended intersections?", critical: true },
      { id: "shade_cavity", category: "spatial_relation", question: "Is the shade mouth open with a distinct recessed bulb that does not pierce the shell?", critical: true },
      { id: "cable_contact", category: "spatial_relation", question: "Does the cable meet its socket and rest on the desk plane without floating or being buried?", critical: true },
      { id: "base_contact", category: "spatial_relation", question: "Does the weighted base sit flat on the supporting plane?", critical: true },
      { id: "finish", category: "style", question: "Do enamel, brushed metal, rubber and reverse-side construction details read as a finished product?", critical: false },
    ],
    rubric: { ...rubric, requiredNameGroups: [["base"], ["arm"], ["hinge", "pivot"], ["shade"], ["bulb"], ["cable"]] },
  },
];
