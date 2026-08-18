import type { BenchmarkTask } from "./tasks.ts";

type AssetMetrics = {
  hard_gate_pass?: boolean;
  materials?: string[];
  meshes?: Array<{
    name?: string;
    uv_layers?: number;
    smooth_polygons?: number;
    flat_polygons?: number;
    refinement_modifiers?: Array<{ type?: string }>;
  }>;
  objects?: Array<{ name?: string; parent?: string | null; action?: string | null }>;
  actions?: Array<{ frame_start?: number; frame_end?: number; name?: string }>;
  scene?: { bounds?: { dimensions?: number[] }; frame_start?: number; frame_end?: number };
  totals?: {
    triangles?: number;
    mesh_objects?: number;
    materials?: number;
    invalid_vertices?: number;
    degenerate_faces?: number;
    zero_length_edges?: number;
    smooth_polygons?: number;
    flat_polygons?: number;
    uv_mapped_meshes?: number;
    refinement_modifiers?: number;
    lights?: number;
    cameras?: number;
    node_materials?: number;
    geometry_nodes_modifiers?: number;
    simulation_modifiers?: number;
    rigid_body_objects?: number;
    armatures?: number;
    bones?: number;
    weighted_meshes?: number;
    shape_keys?: number;
    constraints?: number;
  };
};

export type AutomatedScore = {
  hardGatePass: boolean;
  score: number;
  dimensions: {
    executionAndExport: number;
    specificationCoverage: number;
    geometryReadiness: number;
    materialsAndPresentation: number;
    finishQuality: number;
    animationOrAssembly: number;
    reproducibility: number;
  };
  checks: Array<{
    id: string;
    passed: boolean;
    earned: number;
    possible: number;
    detail: string;
  }>;
};

export type VideoEvidence = {
  exists: boolean;
  durationSeconds: number | null;
  frameRate: number | null;
  frameCount: number | null;
  probeError: string | null;
};

function containsAnyName(names: string[], alternatives: string[]): boolean {
  return names.some((name) =>
    alternatives.some((alternative) =>
      name.toLowerCase().includes(alternative.toLowerCase()),
    ),
  );
}

export function scoreSubmission(options: {
  task: BenchmarkTask;
  agentExitCode: number;
  sourceExists: boolean;
  reproductionPass: boolean;
  blendExists: boolean;
  glbExists: boolean;
  iterationReviewExists?: boolean;
  videoEvidence?: VideoEvidence | null;
  blendMetrics: AssetMetrics | null;
  glbMetrics: AssetMetrics | null;
}): AutomatedScore {
  const { task, blendMetrics, glbMetrics } = options;
  const checks: AutomatedScore["checks"] = [];
  const add = (
    id: string,
    passed: boolean,
    possible: number,
    detail: string,
    partial = passed ? possible : 0,
  ) => {
    checks.push({
      id,
      passed,
      earned: Math.max(0, Math.min(possible, partial)),
      possible,
      detail,
    });
  };

  add(
    "agent_completed",
    options.agentExitCode === 0,
    4,
    `Codex exit code ${options.agentExitCode}`,
  );
  add("source_exists", options.sourceExists, 3, "create_asset.py");
  add("blend_exists", options.blendExists, 4, "asset.blend");
  add("glb_exists", options.glbExists, 4, "asset.glb");
  add(
    "blend_inspects",
    Boolean(blendMetrics?.hard_gate_pass),
    2.5,
    "Native .blend inspection",
  );
  add(
    "glb_reimports",
    Boolean(glbMetrics?.hard_gate_pass),
    2.5,
    "Fresh GLB import inspection",
  );

  const semanticNames = (blendMetrics?.objects ?? [])
    .map((object) => object.name ?? "")
    .filter(Boolean);
  const matchedGroups = task.rubric.requiredNameGroups.filter((group) =>
    containsAnyName(semanticNames, group),
  );
  const coverage =
    task.rubric.requiredNameGroups.length === 0
      ? 1
      : matchedGroups.length / task.rubric.requiredNameGroups.length;
  const categorySignals = task.rubric.categorySignals ?? [];
  const semanticCoveragePoints = categorySignals.length ? 20 : 25;
  add(
    "semantic_part_coverage",
    coverage === 1,
    semanticCoveragePoints,
    `${matchedGroups.length}/${task.rubric.requiredNameGroups.length} required semantic part groups found`,
    coverage * semanticCoveragePoints,
  );

  if (categorySignals.length) {
    const signalRatios = categorySignals.map((signal) => {
      const actual = blendMetrics?.totals?.[signal.metric] ?? 0;
      return {
        ...signal,
        actual,
        ratio: signal.minimum > 0 ? Math.min(1, actual / signal.minimum) : 1,
      };
    });
    const categoryCoverage =
      signalRatios.reduce((sum, signal) => sum + signal.ratio, 0) /
      signalRatios.length;
    add(
      "category_signals",
      signalRatios.every((signal) => signal.actual >= signal.minimum),
      5,
      signalRatios
        .map(
          (signal) =>
            `${signal.actual}/${signal.minimum} ${signal.label}`,
        )
        .join("; "),
      categoryCoverage * 5,
    );
  }

  const triangles = blendMetrics?.totals?.triangles ?? 0;
  const [minimumTriangles, maximumTriangles] = task.rubric.triangleRange;
  add(
    "triangle_range",
    triangles >= minimumTriangles && triangles <= maximumTriangles,
    5,
    `${triangles} triangles; expected ${minimumTriangles}-${maximumTriangles}`,
  );
  const meshObjects = blendMetrics?.totals?.mesh_objects ?? 0;
  const objectRatio = Math.min(1, meshObjects / task.rubric.minimumMeshObjects);
  add(
    "mesh_object_count",
    objectRatio === 1,
    4,
    `${meshObjects} mesh objects; minimum ${task.rubric.minimumMeshObjects}`,
    objectRatio * 4,
  );
  const invalidCount =
    (blendMetrics?.totals?.invalid_vertices ?? 0) +
    (blendMetrics?.totals?.degenerate_faces ?? 0) +
    (blendMetrics?.totals?.zero_length_edges ?? 0);
  add(
    "invalid_geometry",
    invalidCount === 0,
    4,
    `${invalidCount} invalid vertices, degenerate faces, or zero-length edges`,
  );
  const extent = Math.max(...(blendMetrics?.scene?.bounds?.dimensions ?? [Infinity]));
  add(
    "maximum_extent",
    extent <= task.rubric.maximumExtent,
    2,
    `${Number.isFinite(extent) ? extent.toFixed(3) : "missing"}m maximum extent; limit ${task.rubric.maximumExtent}m`,
  );

  const materials = blendMetrics?.totals?.materials ?? 0;
  const materialRatio = Math.min(1, materials / task.rubric.minimumMaterials);
  add(
    "material_count",
    materialRatio === 1,
    5,
    `${materials} materials; minimum ${task.rubric.minimumMaterials}`,
    materialRatio * 5,
  );
  const glbMaterials = glbMetrics?.totals?.materials ?? 0;
  add(
    "glb_materials",
    glbMaterials >= Math.min(materials, task.rubric.minimumMaterials),
    3,
    `${glbMaterials} materials survived GLB import`,
  );

  const uvMappedMeshes = blendMetrics?.totals?.uv_mapped_meshes ?? 0;
  const uvRatio = meshObjects ? uvMappedMeshes / meshObjects : 0;
  const minimumUvRatio = task.rubric.minimumUvMeshRatio;
  add(
    "uv_coverage",
    uvRatio >= minimumUvRatio,
    4,
    `${uvMappedMeshes}/${meshObjects} meshes have UV layers; minimum ratio ${minimumUvRatio.toFixed(2)}`,
    minimumUvRatio > 0 ? Math.min(4, (uvRatio / minimumUvRatio) * 4) : 4,
  );

  const smoothPolygons = blendMetrics?.totals?.smooth_polygons ?? 0;
  const flatPolygons = blendMetrics?.totals?.flat_polygons ?? 0;
  const shadedPolygons = smoothPolygons + flatPolygons;
  const smoothRatio = shadedPolygons ? smoothPolygons / shadedPolygons : 0;
  const minimumSmoothRatio = task.rubric.minimumSmoothFaceRatio;
  const maximumSmoothRatio = task.rubric.maximumSmoothFaceRatio;
  const smoothPass =
    smoothRatio >= minimumSmoothRatio &&
    (maximumSmoothRatio === undefined || smoothRatio <= maximumSmoothRatio);
  let smoothPartial = 4;
  if (smoothRatio < minimumSmoothRatio) {
    smoothPartial =
      minimumSmoothRatio > 0
        ? Math.min(4, (smoothRatio / minimumSmoothRatio) * 4)
        : 4;
  } else if (
    maximumSmoothRatio !== undefined &&
    smoothRatio > maximumSmoothRatio
  ) {
    smoothPartial =
      smoothRatio > 0
        ? Math.min(4, (maximumSmoothRatio / smoothRatio) * 4)
        : 0;
  }
  add(
    "finish_shading_profile",
    smoothPass,
    4,
    `${(smoothRatio * 100).toFixed(1)}% smooth polygons for ${task.rubric.finishProfile}`,
    smoothPartial,
  );

  const refinementModifiers =
    blendMetrics?.totals?.refinement_modifiers ?? 0;
  const densityEvidence = triangles >= minimumTriangles * 2;
  const refinementPass =
    !task.rubric.requireRefinementEvidence ||
    refinementModifiers > 0 ||
    densityEvidence;
  add(
    "refinement_evidence",
    refinementPass,
    3,
    task.rubric.requireRefinementEvidence
      ? `${refinementModifiers} refinement modifiers; density evidence ${densityEvidence ? "present" : "absent"}`
      : "Refinement modifier evidence is not required for this finish profile",
  );

  if (task.rubric.requireAnimation) {
    const blendActions = blendMetrics?.actions ?? [];
    const glbActions = glbMetrics?.actions ?? [];
    const longestSpan = Math.max(
      0,
      ...blendActions.map(
        (action) => (action.frame_end ?? 0) - (action.frame_start ?? 0),
      ),
    );
    const blendAnimationPoints = task.requiredVideo ? 4 : 6;
    const glbAnimationPoints = task.requiredVideo ? 3 : 4;
    add(
      "blend_animation",
      blendActions.length > 0 &&
        longestSpan >= (task.rubric.minimumActionSpan ?? 1),
      blendAnimationPoints,
      `${blendActions.length} actions; longest span ${longestSpan} frames`,
    );
    add(
      "glb_animation",
      glbActions.length > 0,
      glbAnimationPoints,
      `${glbActions.length} actions survived GLB import`,
    );
    if (task.requiredVideo) {
      const video = options.videoEvidence;
      const expected = task.requiredVideo;
      const durationPass =
        video?.durationSeconds !== null &&
        video?.durationSeconds !== undefined &&
        Math.abs(video.durationSeconds - expected.durationSeconds) <=
          expected.toleranceSeconds;
      const frameRatePass =
        video?.frameRate !== null &&
        video?.frameRate !== undefined &&
        Math.abs(video.frameRate - expected.fps) <= 0.05;
      const minimumFrames = Math.floor(
        expected.durationSeconds * expected.fps - 1,
      );
      const frameCountPass =
        video?.frameCount !== null &&
        video?.frameCount !== undefined &&
        video.frameCount >= minimumFrames;
      add(
        "rendered_video",
        Boolean(video?.exists) && durationPass && frameRatePass && frameCountPass,
        3,
        video?.exists
          ? `${expected.filename}: ${video.durationSeconds?.toFixed(3) ?? "unknown"}s, ${video.frameRate?.toFixed(3) ?? "unknown"} fps, ${video.frameCount ?? "unknown"} frames${video.probeError ? `; ${video.probeError}` : ""}`
          : `${expected.filename} missing`,
      );
    }
  } else {
    const namedObjects = (blendMetrics?.objects ?? []).filter(
      (object) => (object.name ?? "").trim().length > 0,
    ).length;
    const nonGeneric = (blendMetrics?.objects ?? []).filter(
      (object) => !/^(cube|cylinder|sphere|plane|cone)(\.\d+)?$/i.test(object.name ?? ""),
    ).length;
    add(
      "semantic_object_names",
      namedObjects > 0 && nonGeneric / namedObjects >= 0.8,
      5,
      `${nonGeneric}/${namedObjects} objects have non-generic names`,
      namedObjects ? Math.min(5, (nonGeneric / namedObjects) * 5) : 0,
    );
    const parented = (blendMetrics?.objects ?? []).filter(
      (object) => object.parent,
    ).length;
    add(
      "assembly_structure",
      parented > 0 || meshObjects >= task.rubric.minimumMeshObjects,
      5,
      `${parented} parented objects across ${meshObjects} mesh objects`,
    );
  }

  if (task.requireIterationReview) {
    add(
      "iteration_review",
      Boolean(options.iterationReviewExists),
      2,
      options.iterationReviewExists
        ? "iteration_review.json retained"
        : "iteration_review.json missing",
    );
  }
  add(
    "deterministic_source",
    options.reproductionPass,
    task.requireIterationReview ? 9 : 11,
    options.reproductionPass
      ? "Source reproduced inspectable .blend and .glb outputs in a clean directory"
      : "Clean-directory source reproduction did not produce both inspectable outputs",
  );

  const executionAndExport = checks
    .filter((check) =>
      [
        "agent_completed",
        "source_exists",
        "blend_exists",
        "glb_exists",
        "blend_inspects",
        "glb_reimports",
      ].includes(check.id),
    )
    .reduce((sum, check) => sum + check.earned, 0);
  const specificationCoverage = checks
    .filter((check) =>
      ["semantic_part_coverage", "category_signals"].includes(check.id),
    )
    .reduce((sum, check) => sum + check.earned, 0);
  const geometryReadiness = checks
    .filter((check) =>
      [
        "triangle_range",
        "mesh_object_count",
        "invalid_geometry",
        "maximum_extent",
      ].includes(check.id),
    )
    .reduce((sum, check) => sum + check.earned, 0);
  const materialsAndPresentation = checks
    .filter((check) => ["material_count", "glb_materials"].includes(check.id))
    .reduce((sum, check) => sum + check.earned, 0);
  const finishQuality = checks
    .filter((check) =>
      [
        "uv_coverage",
        "finish_shading_profile",
        "refinement_evidence",
      ].includes(check.id),
    )
    .reduce((sum, check) => sum + check.earned, 0);
  const animationOrAssembly = checks
    .filter((check) =>
      [
        "blend_animation",
        "glb_animation",
        "rendered_video",
        "semantic_object_names",
        "assembly_structure",
      ].includes(check.id),
    )
    .reduce((sum, check) => sum + check.earned, 0);
  const reproducibility = checks
    .filter((check) =>
      ["deterministic_source", "iteration_review"].includes(check.id),
    )
    .reduce((sum, check) => sum + check.earned, 0);

  const hardGatePass =
    options.agentExitCode === 0 &&
    options.sourceExists &&
    options.blendExists &&
    options.glbExists &&
    Boolean(blendMetrics?.hard_gate_pass) &&
    Boolean(glbMetrics?.hard_gate_pass) &&
    checks
      .filter((check) =>
        [
          "semantic_part_coverage",
          "category_signals",
          "triangle_range",
          "invalid_geometry",
          "maximum_extent",
          "blend_animation",
          "glb_animation",
          "rendered_video",
          "iteration_review",
          "deterministic_source",
        ].includes(check.id),
      )
      .every((check) => check.passed);

  return {
    hardGatePass,
    score: Number(
      (
        executionAndExport +
        specificationCoverage +
        geometryReadiness +
        materialsAndPresentation +
        finishQuality +
        animationOrAssembly +
        reproducibility
      ).toFixed(2),
    ),
    dimensions: {
      executionAndExport,
      specificationCoverage,
      geometryReadiness,
      materialsAndPresentation,
      finishQuality,
      animationOrAssembly,
      reproducibility,
    },
    checks,
  };
}
