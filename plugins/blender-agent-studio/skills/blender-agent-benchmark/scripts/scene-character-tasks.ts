import type { BenchmarkTask, VisualCriterion } from "./tasks.ts";

const criterion = (id: string, category: VisualCriterion['category'], question: string, critical = true): VisualCriterion => ({id, category, question, critical});
const source = `Use Blender Python and the Blender CLI at {{BLENDER_EXECUTABLE}}. Work only in this task directory.
Deliver create_asset.py, asset.blend and final_report.md. The source must reproduce the result in a clean directory, including all required dependencies. Use semantic names. Do not ask follow-up questions. Build, inspect and refine before finishing.`;
const sceneCameras = ['SceneHero', 'SceneReverse', 'SceneDetail'];
const cameras = `Author cameras named SceneHero (complete composition), SceneReverse (opposite side showing secondary zones) and SceneDetail (close view of a furnished secondary area), with usable lighting in all three. Keep architecture from occluding these views. Pack required images or generate them reproducibly. Set render.use_sequencer=False and disable render borders. Camera renders use the scene's own lighting.`;
const sceneRubric: BenchmarkTask['rubric'] = {
  requiredNameGroups: [], minimumMeshObjects: 16, minimumMaterials: 5,
  triangleRange: [5000, 500000], maximumExtent: 18, requireAnimation: false,
  finishProfile: 'polished_smooth', minimumUvMeshRatio: 0, minimumSmoothFaceRatio: 0.2,
  requireRefinementEvidence: true,
  categorySignals: [{metric:'cameras',minimum:3,label:'authored evidence cameras'}, {metric:'lights',minimum:2,label:'authored lighting'}],
};
const characterRubric: BenchmarkTask['rubric'] = {
  requiredNameGroups: [['body'], ['head'], ['hand'], ['boot'], ['belt']],
  minimumMeshObjects: 6, minimumMaterials: 4, maximumMaterials: 8, triangleRange: [4000, 60000], maximumExtent: 2.5,
  requireAnimation: false, finishProfile: 'polished_smooth', minimumUvMeshRatio: 0.7,
  minimumSmoothFaceRatio: 0.35, requireRefinementEvidence: true,
};
const game = `${source}\nAlso deliver asset.glb, with meters, Z-up in Blender and correct glTF axis conversion. Export only the character and its rig when requested; exclude staging floors, cameras and lights. Preserve materials and UVs through fresh import. This is a portable game asset, with no engine-specific compatibility claim.`;

export const SCENE_AND_CHARACTER_TASKS: BenchmarkTask[] = [
  {
    id:'decorated_reading_room', title:'Complete decorated reading room', category:'environment_creation', suites:['scenes'],
    capabilities:['geometry','materials','lighting','placement','composition','camera','spatial_relations','instruction_following'],
    renderOnly:true, authoredCameras:sceneCameras,
    prompt:`Create a complete, believable 6 x 5 meter reading-room interior for a portfolio render. Warm oak, linen, aged brass and plaster; late-afternoon window light balanced with a practical lamp. Furnish a reading nook with a fitted armchair and cushion, side table, lamp, books, rug and plant; a separate desk area with chair, stationery and shelving; finish walls, window frames, curtains and architectural trim. Arrange decoration as purposeful clusters with negative space and a readable focal area, not evenly scattered props. Give shelves and the reverse side of the room the same finish intent. Furniture and small objects must meet their supporting surfaces; cloth should have credible thickness and folds. Show distinct realistic material responses without excessive noise or blown-out surfaces. The room should feel usable, with a clear route between the door and both work areas.
${cameras}\n${source}\nThis is a render-only scene: no GLB is required. Deliver the complete interior; unseen exterior architecture is outside the brief.`,
    visualBrief:'A complete warm reading-room interior with a finished reading nook and desk area, architectural trim, curtains and purposeful decoration. Review the authored hero, reverse and secondary-zone close-up for consistent craft, composition, material realism and actual supports.',
    visualCriteria:[
      criterion('room_zones','object_presence','Are both reading nook and desk area complete, furnished and usable?'),
      criterion('room_composition','spatial_relation','Do decoration clusters, focal hierarchy and negative space create a deliberate composition with a clear walking route?'),
      criterion('room_secondary_finish','style','Are shelving, reverse walls and secondary furniture finished rather than blank or primitive residue?'),
      criterion('room_support','spatial_relation','Do furniture, books, lamp and plant visibly meet their actual supports without gaps or major intersections?'),
      criterion('room_materials','material','Do oak, linen, brass and plaster read distinctly, with sensible scale and restrained surface variation?'),
      criterion('room_lighting','lighting','Does warm window and practical light preserve material detail, contact shadows and readable secondary zones?',false),
    ], animationFrames:[], rubric:{...sceneRubric,requiredNameGroups:[['chair'],['desk'],['shelf'],['curtain'],['lamp'],['rug'],['plant']]},
  },
  {
    id:'night_market_courtyard', title:'Complete low-poly night-market courtyard', category:'environment_creation', suites:['scenes'],
    capabilities:['geometry','materials','lighting','placement','composition','camera','spatial_relations','instruction_following'],
    authoredCameras:sceneCameras,
    prompt:`Create a complete stylized low-poly game scene: a 12 x 10 meter night-market courtyard with three distinct vendor stalls (food, ceramics and flowers), a surrounding facade with doors and windows, paving, a communal seating area, signs, supported lantern strings and crates. Give every stall its own counter, inventory and visible construction; distinguish their identities through silhouette, purposeful props and material palette. Finish the back-facing stalls and seating area too. Keep a connected two-meter-wide player route through the courtyard. Set everything on actual supports with sensible orientation; no floating stock, unexplained lantern attachments or major overlaps. Use deliberately faceted geometry, readable shape hierarchy and coherent warm/cool night lighting. Deliver asset.glb below 150,000 evaluated triangles and 16 materials, containing the complete environment with no oversized studio staging. Preserve low-poly form and portable material colors in a fresh GLB import; authored night lighting is reviewed in the .blend and is not claimed to transfer unchanged.
${cameras}\n${source}`,
    visualBrief:'An integrated low-poly night market with distinct food, pottery and flower stalls, completed facade, paving, seating, readable signs and attached lantern strings. Review every stall and the reverse courtyard, path usability and actual surface support; night lighting must not hide incomplete props.',
    visualCriteria:[
      criterion('market_stalls','count','Are three distinct, fully dressed vendor stalls visibly present?'),
      criterion('market_construction','style','Do all stalls and reverse surfaces have coherent finished construction and intentional low-poly forms?'),
      criterion('market_route','spatial_relation','Is a connected usable route visible through the scene, with correctly scaled seating and stalls?'),
      criterion('market_support','spatial_relation','Do inventory, crates, lantern strings and furniture have credible supports without obvious floating or intersections?'),
      criterion('market_palette','material','Do material and silhouette choices distinguish vendors while preserving a coherent scene palette?'),
      criterion('market_light','lighting','Are all functional zones legible in warm/cool night lighting rather than lost to darkness?',false),
    ], animationFrames:[], rubric:{...sceneRubric,requiredNameGroups:[['food'],['ceramic','pottery'],['flower'],['facade'],['bench','seat'],['lantern']],
      triangleRange:[8000,150000], minimumMaterials:4, maximumMaterials:16, maximumExtent:16, finishProfile:'intentional_low_poly', minimumSmoothFaceRatio:0, maximumSmoothFaceRatio:0.25, requireRefinementEvidence:false},
  },
  {
    id:'coastal_cafe_holdout', title:'Decorated coastal cafe holdout', category:'environment_creation', suites:['scenes'],
    capabilities:['geometry','materials','lighting','placement','composition','camera','spatial_relations','instruction_following'],
    renderOnly:true, authoredCameras:sceneCameras,
    prompt:`Create a finished 7 x 6 meter coastal cafe interior with a service counter, espresso machine, pastry display, two seating groups, dishes, menu signs, pendant lights and seaside-facing windows. White plaster, warm wood, blue ceramic and brushed metal; soft morning light. Give the service area and seating equal craft, while retaining a strong focal hierarchy and uncluttered access from the entrance to the counter. Decorate with believable clusters tied to cafe use; avoid repeating the same props everywhere. Model visible construction detail, furniture contact and fitted textiles. The pastry display must be readable through glass, and secondary areas must remain finished in the reverse camera.
${cameras}\n${source}\nThis is a render-only interior; no GLB is required.`,
    visualBrief:'A complete coastal cafe with finished service and seating areas, transparent pastry display, purposeful decoration, readable morning light and clear access. This different layout tests transfer beyond the reading room.',
    visualCriteria:[
      criterion('cafe_service','object_presence','Are counter, espresso machine, readable pastry display and menu signs complete?'),
      criterion('cafe_seating','count','Are both seating groups fully furnished and usable?'),
      criterion('cafe_integration','spatial_relation','Do dishes, furnishings and pendant lights have credible supports and clear access without major overlaps?'),
      criterion('cafe_glass','material','Is the pastry display visibly transparent with readable contents rather than an opaque or overexposed enclosure?'),
      criterion('cafe_reverse','style','Do reverse and secondary zones preserve the same finish as the hero area?'),
      criterion('cafe_composition','lighting','Does composition and morning lighting keep the service and seating zones distinct and readable?',false),
    ], animationFrames:[], rubric:{...sceneRubric,requiredNameGroups:[['counter'],['espresso'],['pastry'],['chair','seat'],['window'],['pendant']]},
  },
  {
    id:'game_ranger_character', title:'Static game ranger character', category:'character_creation', suites:['game_characters'],
    capabilities:['geometry','materials','spatial_relations','instruction_following'],
    prompt:`Create an original polished stylized human forest ranger game character, 1.75 meters tall, in a neutral relaxed A-pose. Model a readable expressive face, fitted jacket and trousers, proportionate hands and boots, belt equipment and a supported backpack with fitted shoulder straps. Use coherent body-to-pelvis and limb transitions, purposeful garment thickness and seams, and no generic beveled-box torso or oversized footwear. Keep skin, cloth, leather and metal distinct with portable materials. Give the back, profile, hands and face the same finish as the front. Stay below 60,000 evaluated triangles and 8 materials. Static character only; no rig or animation required.
${game}`,
    visualBrief:'A finished original stylized human ranger in a relaxed A-pose, coherent face/body anatomy, fitted clothing, proportionate hands and boots, belt equipment and a supported backpack. Assess front/profile/back fit and game-export finish, not rigging.',
    visualCriteria:[
      criterion('ranger_identity','attribute','Does the face, silhouette and equipment read as a deliberately designed ranger rather than a generic mannequin?'),
      criterion('ranger_anatomy','spatial_relation','Are head, torso, pelvis, hands and boots proportionate and connected from complementary views?'),
      criterion('ranger_fit','spatial_relation','Do jacket, belt and backpack straps fit with thickness and credible attachment, without major clipping?'),
      criterion('ranger_finish','style','Are profile, back, hands and face as finished as the front, without box-like anatomy?'),
      criterion('ranger_materials','material','Are skin, cloth, leather and metal visibly distinct and coherent?',false),
    ], animationFrames:[],rubric:characterRubric,
  },
  {
    id:'game_scout_deformation', title:'Rigged game scout with acceptance poses', category:'character_creation', suites:['game_characters'],
    capabilities:['geometry','materials','rigging','deformation','animation','spatial_relations','instruction_following'],
    prompt:`Create an original polished stylized human exploration scout game character, 1.7 meters tall, below 60,000 evaluated triangles and 8 materials. Give it fitted utility clothing, boots, gloves and a small belt pouch. Author a continuous skinned mesh named ScoutBody (including visible torso and limbs) and a meaningful deform rig; small separate accessories are allowed. Use plausible joint placement and coherent form, not disconnected primitive limbs. Animate acceptance poses at 24 fps: neutral A-pose frame 1, deep knee/elbow bend frame 13, overhead reach frame 25, torso twist frame 37 and neutral frame 49. Keep the character at the origin. These are deformation tests, not a walk cycle. Show volume-preserving knees, hips, elbows and shoulders with fitted clothing and stable accessory attachments. Preserve the actual skin deformation and action in GLB, including exact ScoutBody mesh name. Save the .blend at frame 1.
${game}`,
    visualBrief:'A complete rigged stylized game scout with a continuous skinned body and neutral, deep-bend, reach and twist acceptance poses. Inspect actual deformation, joints and garment/accessory fit in authored and fresh-export samples; an armature alone is insufficient.',
    visualCriteria:[
      criterion('scout_form','style','Does the neutral pose show finished anatomy and fitted clothing from all sides?'),
      criterion('scout_bend','deformation','Do deep-bend knees, hips and elbows retain readable volume without collapse, tearing or disconnected joints?'),
      criterion('scout_reach','deformation','Does overhead reach preserve shoulders, armpits and clothing without severe clipping?'),
      criterion('scout_twist','deformation','Does torso twist preserve volume and fitted pouch placement without candy-wrapper twisting?'),
      criterion('scout_attachments','spatial_relation','Do clothing and small accessories remain supported throughout the acceptance poses?'),
    ], animationFrames:[1,13,25,37,49],
    motionRequirement:{frames:[1,13,25,37,49],targets:[{object:'ScoutBody',change:'deformation',modifier:'ARMATURE'}],inspectExport:true},
    rubric:{...characterRubric,requiredNameGroups:[['ScoutBody'],['head'],['boot'],['pouch']],requireAnimation:true,minimumActionSpan:48,
      categorySignals:[{metric:'weighted_meshes',minimum:1,label:'skinned character'}, {metric:'bones',minimum:16,label:'deform skeleton'}]},
  },
  {
    id:'game_badger_merchant_holdout', title:'Anthropomorphic game character holdout', category:'character_creation', suites:['game_characters'],
    capabilities:['geometry','materials','spatial_relations','instruction_following'],
    prompt:`Create an original polished stylized anthropomorphic badger merchant game character, 1.3 meters tall, below 45,000 evaluated triangles and 8 materials. It stands in a relaxed neutral pose with a recognizable badger muzzle, small ears, facial stripe pattern, short sturdy limbs and a short tail emerging from the pelvis. Give it a fitted waistcoat, belt, proportionate boots and an attached coin pouch. Retain species-specific silhouette and smooth stylization without box anatomy, disconnected joints, oversized feet or clothing embedded in the body. Finish the back, profile, face and hands. Static character only; no rig required.
${game}`,
    visualBrief:'A finished anthropomorphic badger merchant whose muzzle, ears, stripes, short limbs and tail establish species identity, with fitted waistcoat, belt and coin pouch. This tests transfer to nonhuman anatomy and different proportions.',
    visualCriteria:[
      criterion('badger_identity','attribute','Do muzzle, ears, stripes, limbs and tail collectively read as a badger from front and profile?'),
      criterion('badger_body','spatial_relation','Are body, pelvis, limbs, hands and tail coherent without detached joints or oversized boots?'),
      criterion('badger_fit','spatial_relation','Do waistcoat, belt and coin pouch fit and visibly attach without major clipping?'),
      criterion('badger_back','style','Do back, side and face retain the intended finish and species identity?'),
      criterion('badger_materials','material','Are fur, cloth, leather and metal distinct without inconsistent skin/fur patches?',false),
    ],animationFrames:[],rubric:{...characterRubric,requiredNameGroups:[['body'],['head'],['tail'],['waistcoat'],['pouch']],triangleRange:[4000,45000]},
  },
];
