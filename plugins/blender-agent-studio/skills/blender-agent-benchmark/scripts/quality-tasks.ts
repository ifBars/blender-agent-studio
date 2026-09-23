import type { BenchmarkTask, VisualCriterion } from "./tasks.ts";

const criterion = (id: string, category: VisualCriterion["category"], question: string, critical = true): VisualCriterion => ({id, category, question, critical});
const delivery = `
Use Blender Python and the Blender CLI at {{BLENDER_EXECUTABLE}}. Work only in this task directory.
Deliver create_asset.py, asset.blend, asset.glb and final_report.md. Use semantic names.
Keep the asset under 120,000 evaluated triangles and 5 meters on its largest axis.
Reproduce from source without external downloads or files outside this directory; put generated caches beside the output blend using relative paths.
Inspect front, back, side and three-quarter views. Report failed or untested requirements honestly.
This is a fully specified noninteractive benchmark: do not ask follow-up questions.`;

const rubric: BenchmarkTask["rubric"] = {
  requiredNameGroups: [], minimumMeshObjects: 1, minimumMaterials: 2,
  triangleRange: [100, 120_000], maximumExtent: 5, requireAnimation: false,
  finishProfile: "polished_smooth", minimumUvMeshRatio: 0, minimumSmoothFaceRatio: 0.2,
  requireRefinementEvidence: false,
};

export const QUALITY_TASKS: BenchmarkTask[] = [
  {
    id:"reference_reconstruction_quality",title:"Two-view image-to-3D reconstruction",
    category:"prop_creation",suites:["reference"],
    capabilities:["geometry","materials","camera","spatial_relations","instruction_following"],
    referenceFiles:["reference-front.png","reference-side.png"],
    prompt:`Reconstruct the single smooth manufactured prop shown in reference-front.png and reference-side.png as a complete 3D asset. The images show the same subject in the same pose. Preserve its identity, major proportions, component count, openings, thickness, attachments and material regions. Use one meter for overall height because absolute scale is not provided. Match front and side reference cameras in source; compare both views before detailing. Keep depth and plausible unseen surfaces, rather than making a flat cutout that matches only one view. Save reference_notes.md distinguishing observations, camera assumptions and inferred hidden structure. Deliver reference-overlay-front.png and reference-overlay-side.png showing your comparisons. Do not synthesize extra reference views and treat them as measured evidence.
${delivery}`,
    visualBrief:"Faithful reconstruction of the two supplied views of one manufactured prop: identity, proportions, openings, thickness, connections and material regions in a complete inspectable 3D model. Judge against the supplied images, not a generic plausible object.",
    visualCriteria:[
      criterion("reference_identity","attribute","Do the major forms and proportions match the supplied front and side references?"),
      criterion("reference_structure","spatial_relation","Are openings, thickness, component count and attachments consistent with both supplied images?"),
      criterion("reference_depth","spatial_relation","Does the result retain plausible depth and coherent hidden surfaces across independent views, rather than a one-view cutout?"),
      criterion("reference_materials","material","Do material regions and their boundaries match the references without using shading to hide incorrect geometry?",false),
    ],animationFrames:[],rubric:{...rubric},
  },
  {
    id: "character_form_quality", title: "Static otter courier form and clothing",
    category: "character_creation", suites: ["quality"],
    capabilities: ["geometry", "materials", "spatial_relations", "instruction_following"],
    prompt: `Create a polished stylized otter courier, a static full-body collectible in a relaxed standing pose. No rig or animation is requested.
Make the species readable from front, side and back: compact ears, broad muzzle with whisker pads, tapering thick tail, short limbs and webbed feet. Give it a fitted raincoat, small satchel on an attached shoulder strap, and distinct fur, fabric and leather materials. Preserve coherent torso-to-pelvis and limb transitions; avoid box-shaped anatomy, detached joints, oversized footwear and accessories embedded in the body. The tail must emerge anatomically from the pelvis, not the coat hem. This is smooth stylization, not faceted low-poly.
${delivery}`,
    visualBrief: "A static smooth stylized otter courier with species-specific muzzle, ears, tapering tail, short limbs and webbed feet, fitted raincoat and connected satchel strap. Judge form and fit across all views; no rig is needed.",
    visualCriteria: [
      criterion("otter_identity", "attribute", "Do the muzzle, ears, body, tail and feet collectively read as an otter from complementary views?"),
      criterion("otter_anatomy", "spatial_relation", "Are torso, pelvis, limbs and tail coherent without detached joints, box-like anatomy or oversized feet?"),
      criterion("otter_fit", "spatial_relation", "Do the coat and satchel fit the body with a visibly attached strap and no major clipping?"),
      criterion("otter_materials", "material", "Are fur, raincoat and leather distinct and consistently finished across front and back?", false),
    ], animationFrames: [],
    rubric: {...rubric, requiredNameGroups: [["tail"], ["coat"], ["satchel"]], minimumMaterials: 3},
  },
  {
    id: "walk_cycle_quality", title: "Character walk cycle contacts and deformation",
    category: "character_creation", suites: ["quality"],
    capabilities: ["geometry", "animation", "rigging", "deformation", "instruction_following"],
    prompt: `Build a smooth stylized humanoid with a continuous skinned body mesh named WalkerBody, a meaningful armature and separate readable shoes. Animate an in-place walk on a visible floor at 24 fps, frames 1-49, with frame 49 duplicating frame 1 for looping. Include opposing arm swing, alternating stance and swing legs, heel-to-toe contact and weight transfer. Keep the planted foot steady relative to the floor during each stance; avoid knee inversion, joint collapse and floating foot contact. Root stays centered. Export the actual skin deformation and action to GLB. Retain the exact WalkerBody mesh name in the fresh import. Render walk.mp4 with 48 frames at 24 fps (frames 1-48).
${delivery}`,
    visualBrief: "A rigged humanoid walking in place with weight transfer, alternating foot contacts, opposing arm swing and intact deforming joints. The two-second loop must join smoothly. Still samples establish poses only; continuous timing needs video review.",
    visualCriteria: [
      criterion("walk_contact", "motion", "At sampled stance phases do feet meet the floor, with credible alternating contact and clearance in swing?"),
      criterion("walk_deformation", "deformation", "Do hips, knees, shoulders and elbows bend without visible collapse, inversion, detachment or severe clipping?"),
      criterion("walk_weight", "motion", "Do the sampled poses communicate weight transfer and opposing arm swing?"),
      criterion("walk_loop", "motion", "Does continuous playback show no loop pop, foot sliding or timing discontinuity? Use unclear if only still frames are available."),
    ], animationFrames: [1, 7, 13, 19, 25, 31, 37, 43, 49],
    requiredVideo: {filename:"walk.mp4", durationSeconds:2, fps:24, toleranceSeconds:0.05},
    motionRequirement: {frames:[1, 7, 13, 25, 37, 49], targets:[{object:"WalkerBody", change:"deformation", modifier:"ARMATURE"}], inspectExport:true},
    rubric: {...rubric, requireAnimation:true, minimumActionSpan:48, categorySignals:[{metric:"weighted_meshes",minimum:1,label:"skinned body"},{metric:"bones",minimum:12,label:"bones"}]},
  },
  {
    id: "facial_expression_quality", title: "Facial shapes and combined expressions",
    category: "character_creation", suites: ["quality"],
    capabilities: ["geometry", "animation", "deformation", "instruction_following"],
    prompt: `Create a polished stylized character bust with a deforming mesh named Face, readable eyes, eyelids, lips and a mouth cavity. Use semantic shape keys for blink, smile and jaw opening, preserving volume and avoiding eyeball/lip intersections. Animate neutral at frame 1, closed blink at 13, smile at 25, jaw open at 37, smile plus jaw open at 49 and neutral at 61, at 24 fps. Keep the head still so the expressions come from deformation. Export shape keys and animation to GLB, preserving the exact Face mesh name. Inspect both individual and combined expressions in front and profile views. Render expressions.mp4 using frames 1-60 at 24 fps.
${delivery}`,
    visualBrief: "A static-position bust whose eyelids, lips and jaw visibly deform through neutral, blink, smile, open jaw, combined smile/open jaw and neutral. Judge expression readability, volume and collisions in front/profile.",
    visualCriteria: [
      criterion("face_blink", "deformation", "Do eyelids visibly close over the eyes without cutting through the eyeballs?"),
      criterion("face_mouth", "deformation", "Are smile and jaw opening distinct, with lips and a mouth cavity rather than a surface slit?"),
      criterion("face_combination", "deformation", "Does the combined expression preserve mouth/cheek volume without obvious tearing or intersections?"),
      criterion("face_finish", "style", "Are facial forms coherent from front and side without primitive-looking transitions?", false),
    ], animationFrames:[1,13,25,37,49,61],
    requiredVideo:{filename:"expressions.mp4",durationSeconds:2.5,fps:24,toleranceSeconds:0.05},
    motionRequirement:{frames:[1,13,25,37,49,61],targets:[{object:"Face",change:"deformation"}],inspectExport:true},
    rubric:{...rubric,requireAnimation:true,minimumActionSpan:60,categorySignals:[{metric:"shape_keys",minimum:4,label:"basis and expression keys"}]},
  },
  {
    id: "liquid_pour_quality", title: "Baked liquid pour, impact and containment",
    category:"simulation_creation",suites:["quality"],
    capabilities:["geometry","materials","animation","simulation","instruction_following"],
    prompt:`Build a small liquid simulation: a short downward water inflow pours into an open supported basin, impacts, spreads and settles without leaking. Use an actual liquid fluid domain named LiquidDomain with mesh generation and genuine flow and effector objects. At 24 fps use frames 1-72; start liquid emission immediately, stop inflow by frame 24, show impact/spreading by 36 and containment/settling by 72. Bake data and mesh with Modular or Final cache covering 1-72. Save asset.blend at frame 36 with the cache reusable in a fresh process. Use a modest preview resolution of 32-48. Water and basin must be visually distinguishable; keep the domain border out of the visible flow. Deliver pour.mp4 using frames 1-72 at 24 fps. GLB is only a static mesh snapshot at frame 36; fluid simulation is validated in the authored scene and cache, not claimed to survive GLB. Do not replace the simulation with keyed blobs.
${delivery}`,
    visualBrief:"A genuine cached liquid pour into an open basin: emission, impact, spreading, then contained settling. Water must have readable volume and surface; no clipping at domain bounds, leaking through basin, or static proxy water. The GLB is an explicitly static snapshot.",
    visualCriteria:[
      criterion("liquid_sequence","motion","Do samples show a connected pour, impact/spreading and a later contained pool rather than an unchanged blob?"),
      criterion("liquid_containment","spatial_relation","Does the basin visibly contain the water without leaks through its walls or base?"),
      criterion("liquid_surface","material","Is water visually readable as a continuous liquid surface rather than coarse detached blobs or an opaque solid?"),
      criterion("liquid_stability","motion","Does continuous playback show stable flow without flicker, explosive motion or domain clipping? Use unclear for still-only evidence."),
    ],animationFrames:[6,12,24,36,54,72],
    requiredVideo:{filename:"pour.mp4",durationSeconds:3,fps:24,toleranceSeconds:0.05},
    motionRequirement:{frames:[6,12,24,36,54,72],targets:[{object:"LiquidDomain",change:"deformation",modifier:"LIQUID"}]},
    rubric:{...rubric,requiredNameGroups:[["basin"]],categorySignals:[{metric:"simulation_modifiers",minimum:3,label:"domain, flow and effector modifiers"}]},
  },
  {
    id:"cloth_drape_quality",title:"Cloth drape, collision and settle",
    category:"simulation_creation",suites:["quality"],
    capabilities:["geometry","materials","animation","simulation","instruction_following"],
    prompt:`Create a rectangular cloth named Cloth falling onto a rounded pedestal under gravity. Use a real cloth simulation, collision and self-collision with applied or accounted-for scale. At 24 fps use frames 1-72: initially suspended cloth, first collision, developing folds and final drape with corners hanging below the pedestal top. Bake the entire interval and save asset.blend at frame 72 with a reusable cache. Use distinct fabric and pedestal materials. Inspect front/back and side for penetration, explosive stretching and floating fabric. Deliver drape.mp4 using frames 1-72 at 24 fps. Export asset.glb as the static evaluated drape at frame 72; no simulation export is claimed.
${delivery}`,
    visualBrief:"A rectangular cloth drops onto a rounded pedestal, collides, folds and settles. Fabric corners hang down, the pedestal supports the drape, and the surface remains intact without tunneling or implausible stretching. GLB is a static final snapshot.",
    visualCriteria:[
      criterion("cloth_phases","motion","Do samples show suspension, collision, folding and a supported final drape?"),
      criterion("cloth_collision","spatial_relation","Does the cloth stay outside the pedestal with no major penetration or floating gap?"),
      criterion("cloth_integrity","deformation","Does the cloth retain a coherent sheet with believable folds rather than tears, explosions or extreme stretching?"),
      criterion("cloth_settle","motion","Does continuous playback settle without sustained jitter or tunneling? Use unclear if only stills are provided."),
    ],animationFrames:[1,12,24,36,54,72],
    requiredVideo:{filename:"drape.mp4",durationSeconds:3,fps:24,toleranceSeconds:0.05},
    motionRequirement:{frames:[1,12,24,36,54,72],targets:[{object:"Cloth",change:"deformation",modifier:"CLOTH"}]},
    rubric:{...rubric,requiredNameGroups:[["pedestal"]],categorySignals:[{metric:"simulation_modifiers",minimum:1,label:"cloth modifier"}]},
  },
];
