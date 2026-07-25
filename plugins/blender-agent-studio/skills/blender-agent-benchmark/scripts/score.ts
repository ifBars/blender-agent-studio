import type { BenchmarkTask } from "./tasks.ts";

type AssetMetrics = {
  hard_gate_pass?: boolean;
  materials?: string[];
  meshes?: Array<{ name?: string }>;
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
  add(
    "semantic_part_coverage",
    coverage === 1,
    30,
    `${matchedGroups.length}/${task.rubric.requiredNameGroups.length} required semantic part groups found`,
    coverage * 30,
  );

  const triangles = blendMetrics?.totals?.triangles ?? 0;
  const [minimumTriangles, maximumTriangles] = task.rubric.triangleRange;
  add(
    "triangle_range",
    triangles >= minimumTriangles && triangles <= maximumTriangles,
    6,
    `${triangles} triangles; expected ${minimumTriangles}-${maximumTriangles}`,
  );
  const meshObjects = blendMetrics?.totals?.mesh_objects ?? 0;
  const objectRatio = Math.min(1, meshObjects / task.rubric.minimumMeshObjects);
  add(
    "mesh_object_count",
    objectRatio === 1,
    5,
    `${meshObjects} mesh objects; minimum ${task.rubric.minimumMeshObjects}`,
    objectRatio * 5,
  );
  const invalidCount =
    (blendMetrics?.totals?.invalid_vertices ?? 0) +
    (blendMetrics?.totals?.degenerate_faces ?? 0) +
    (blendMetrics?.totals?.zero_length_edges ?? 0);
  add(
    "invalid_geometry",
    invalidCount === 0,
    5,
    `${invalidCount} invalid vertices, degenerate faces, or zero-length edges`,
  );
  const extent = Math.max(...(blendMetrics?.scene?.bounds?.dimensions ?? [Infinity]));
  add(
    "maximum_extent",
    extent <= task.rubric.maximumExtent,
    4,
    `${Number.isFinite(extent) ? extent.toFixed(3) : "missing"}m maximum extent; limit ${task.rubric.maximumExtent}m`,
  );

  const materials = blendMetrics?.totals?.materials ?? 0;
  const materialRatio = Math.min(1, materials / task.rubric.minimumMaterials);
  add(
    "material_count",
    materialRatio === 1,
    7,
    `${materials} materials; minimum ${task.rubric.minimumMaterials}`,
    materialRatio * 7,
  );
  const glbMaterials = glbMetrics?.totals?.materials ?? 0;
  add(
    "glb_materials",
    glbMaterials >= Math.min(materials, task.rubric.minimumMaterials),
    3,
    `${glbMaterials} materials survived GLB import`,
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
    add(
      "blend_animation",
      blendActions.length > 0 &&
        longestSpan >= (task.rubric.minimumActionSpan ?? 1),
      6,
      `${blendActions.length} actions; longest span ${longestSpan} frames`,
    );
    add(
      "glb_animation",
      glbActions.length > 0,
      4,
      `${glbActions.length} actions survived GLB import`,
    );
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

  add(
    "deterministic_source",
    options.reproductionPass,
    10,
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
  const specificationCoverage =
    checks.find((check) => check.id === "semantic_part_coverage")?.earned ?? 0;
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
  const animationOrAssembly = checks
    .filter((check) =>
      [
        "blend_animation",
        "glb_animation",
        "semantic_object_names",
        "assembly_structure",
      ].includes(check.id),
    )
    .reduce((sum, check) => sum + check.earned, 0);
  const reproducibility =
    checks.find((check) => check.id === "deterministic_source")?.earned ?? 0;

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
          "triangle_range",
          "invalid_geometry",
          "maximum_extent",
          "blend_animation",
          "glb_animation",
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
        animationOrAssembly +
        reproducibility
      ).toFixed(2),
    ),
    dimensions: {
      executionAndExport,
      specificationCoverage,
      geometryReadiness,
      materialsAndPresentation,
      animationOrAssembly,
      reproducibility,
    },
    checks,
  };
}
