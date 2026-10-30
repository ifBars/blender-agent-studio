"""Fit a reference camera candidate from explicit correspondences; meshes and source stay fixed.

Modes: ``framing`` fits lens/ortho scale and shift with the pose fixed. ``pose`` fits bounded
rigid extrinsics with intrinsics fixed. Held-out landmarks are only evaluated, never solved.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import sys

import bpy
import numpy as np
from mathutils import Matrix, Quaternion, Vector
from bpy_extras.object_utils import world_to_camera_view

# Column-scaled Jacobian conditioning above this leaves rotation/translation trade-offs unresolved.
CONDITION_LIMIT = 1e4
MAX_LANDMARKS = 32


def real(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def strict_json(text, label):
    def reject(constant):
        raise ValueError(f'{label} contains non-finite {constant}; use finite numbers')
    return json.loads(text, parse_constant=reject)


def check_landmarks(raw, label):
    """Reject malformed entries and repeats; a repeated landmark adds weight, not constraint."""
    names, keys = set(), set()
    for item in raw:
        if (not isinstance(item, dict) or not isinstance(item.get('name'), str) or not item['name'].strip() or
                not isinstance(item.get('objectName'), str) or not item['objectName']):
            raise ValueError(f'Each {label} landmark needs a nonempty name and objectName')
        uv, local = item.get('referenceUv'), item.get('localPoint', [0, 0, 0])
        if (not isinstance(uv, list) or not isinstance(local, list) or len(uv) != 2 or len(local) != 3 or
                not all(real(v) for v in [*uv, *local]) or not all(0 <= v <= 1 for v in uv)):
            raise ValueError('Use finite numeric local XYZ and reference UV from top-left in [0,1]')
        key = landmark_key(item)
        if item['name'] in names or key in keys:
            raise ValueError(f'{label.capitalize()} landmark names and points must be unique; repeats add no constraint')
        names.add(item['name'])
        keys.add(key)
    return names, keys


def reject_coincident(world, label):
    world = np.asarray(world, dtype=float).reshape(-1, 3)
    tolerance = 1e-6 * max(1.0, float(np.max(np.abs(world))) if len(world) else 1.0)
    for i in range(len(world)):
        if np.any(np.linalg.norm(world[i + 1:] - world[i], axis=1) <= tolerance):
            raise ValueError(f'{label} landmarks resolve to the same world point; repeats add no constraint')


def load_landmarks(raw, scene, depsgraph):
    points, target = [], []
    for item in raw:
        uv, local = item['referenceUv'], item.get('localPoint', [0, 0, 0])
        obj = scene.objects.get(item['objectName'])
        if obj is None:
            raise ValueError(f"Unknown landmark object: {item['objectName']}")
        points.append(obj.evaluated_get(depsgraph).matrix_world @ Vector(local))
        target.append(uv)
    return points, np.array(target, dtype=float).reshape(-1, 2)


def landmark_key(item):
    return item['objectName'], tuple(round(float(v), 9) for v in item.get('localPoint', [0, 0, 0]))


def finite(value):
    """JSON has no Infinity/NaN; report unbounded values as null."""
    if isinstance(value, dict):
        return {k: finite(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [finite(v) for v in value]
    if isinstance(value, float) and not math.isfinite(value):
        return None
    return value


def rms(values):
    values = np.asarray(values).reshape(-1, 2)
    return float(np.sqrt(np.mean(np.sum(values ** 2, axis=1)))) if len(values) else None


def rodrigues(omega):
    angle = float(np.linalg.norm(omega))
    if angle < 1e-15:
        return np.eye(3)
    k = omega / angle
    skew = np.array([[0, -k[2], k[1]], [k[2], 0, -k[0]], [-k[1], k[0], 0]])
    return np.eye(3) + math.sin(angle) * skew + (1 - math.cos(angle)) * skew @ skew


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', required=True)
    parser.add_argument('--output-dir', required=True)
    parser.add_argument('--camera')
    parser.add_argument('--landmarks-json', required=True)
    parser.add_argument('--heldout-json', default='[]')
    parser.add_argument('--mode', choices=('framing', 'pose'), default='framing')
    parser.add_argument('--max-rotation-deg', type=float)
    parser.add_argument('--max-translation-ratio', type=float)
    parser.add_argument('--width', type=int, required=True)
    parser.add_argument('--height', type=int, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    source, output = Path(args.input).resolve(), Path(args.output_dir).resolve()
    if not source.is_file() or source.suffix.lower() != '.blend':
        raise ValueError('An existing .blend is required')
    if output.exists() and (not output.is_dir() or any(output.iterdir())):
        raise ValueError('Output directory must be new or empty')
    if not all(1 <= v <= 8192 for v in (args.width, args.height)):
        raise ValueError('Reference dimensions must be between 1 and 8192')
    landmarks, heldout = strict_json(args.landmarks_json, 'Landmarks'), strict_json(args.heldout_json, 'Held-out landmarks')
    if not isinstance(landmarks, list) or not 3 <= len(landmarks) <= MAX_LANDMARKS:
        raise ValueError('Supply 3 to 32 identified reference landmarks')
    if args.mode == 'pose' and len(landmarks) < 4:
        raise ValueError('Pose mode needs at least 4 training landmarks')
    if not isinstance(heldout, list) or len(heldout) > MAX_LANDMARKS:
        raise ValueError('Supply at most 32 held-out landmarks')
    if args.mode == 'framing' and (args.max_rotation_deg is not None or args.max_translation_ratio is not None):
        raise ValueError('Pose bounds apply only to pose mode')
    rotation_limit_deg = 15.0 if args.max_rotation_deg is None else args.max_rotation_deg
    translation_ratio = 0.25 if args.max_translation_ratio is None else args.max_translation_ratio
    if not (real(rotation_limit_deg) and real(translation_ratio) and
            0.1 <= rotation_limit_deg <= 45 and 0.001 <= translation_ratio <= 1):
        raise ValueError('Pose bounds: maxRotationDeg 0.1..45, maxTranslationRatio 0.001..1')
    train_names, train_keys = check_landmarks(landmarks, 'training')
    heldout_names, heldout_keys = check_landmarks(heldout, 'held-out')
    if train_names & heldout_names or train_keys & heldout_keys:
        raise ValueError('Held-out landmarks must not repeat a training landmark name or point')
    source_sha256 = hashlib.sha256(source.read_bytes()).hexdigest()
    bpy.ops.wm.open_mainfile(filepath=str(source), load_ui=False)
    scene = bpy.context.scene
    original = scene.objects.get(args.camera) if args.camera else scene.camera
    if original is None or original.type != 'CAMERA' or original.data.type not in ('ORTHO', 'PERSP'):
        raise ValueError('Select an orthographic or perspective camera')
    depsgraph = bpy.context.evaluated_depsgraph_get()
    points, target = load_landmarks(landmarks, scene, depsgraph)
    heldout_points, heldout_target = load_landmarks(heldout, scene, depsgraph)
    reject_coincident([tuple(v) for v in points], 'Training')
    reject_coincident([tuple(v) for v in heldout_points], 'Held-out')
    if heldout_points:
        reject_coincident([tuple(v) for v in points] + [tuple(v) for v in heldout_points], 'Held-out and training')
    # Work on a detached evaluated camera copy, never alter the original camera.
    evaluated = original.evaluated_get(depsgraph)
    camera = bpy.data.objects.new('BAS_ReferenceFit', evaluated.data.copy())
    camera.data.animation_data_clear()
    camera.matrix_world = evaluated.matrix_world.copy()
    scene.collection.objects.link(camera)
    scene.camera = camera
    scene.render.resolution_x, scene.render.resolution_y = args.width, args.height
    scene.render.resolution_percentage = 100
    scene.render.pixel_aspect_x = scene.render.pixel_aspect_y = 1
    scene.render.use_border = False
    weights = np.array([args.width, args.height])
    warnings = []

    def blender_project(world_points):
        values = [world_to_camera_view(scene, camera, point) for point in world_points]
        return np.array([[v.x, 1 - v.y] for v in values]).reshape(-1, 2), np.array([v.z > 0 for v in values], dtype=bool)

    def pixel_errors(world_points, uv_target):
        uv, front = blender_project(world_points)
        return (uv - uv_target) * weights, front

    heldout_before, heldout_front_before = pixel_errors(heldout_points, heldout_target)
    if args.mode == 'framing':
        solved = fit_framing(scene, camera, points, target, weights, blender_project)
    else:
        solved = fit_pose(camera, points, target, weights, rotation_limit_deg, translation_ratio, blender_project)
    before, after, iterations = solved['before'], solved['after'], solved['iterations']
    warnings.extend(solved['warnings'])
    heldout_after, heldout_front_after = pixel_errors(heldout_points, heldout_target)
    heldout_valid = bool(len(heldout)) and heldout_front_before.all() and heldout_front_after.all()
    heldout_rms_before = rms(heldout_before) if heldout_valid else None
    heldout_rms_after = rms(heldout_after) if heldout_valid else None
    if not heldout:
        warnings.append('heldout_missing: no independent landmarks evaluate this fit')
    elif not heldout_valid:
        warnings.append('heldout_behind_camera: a held-out landmark is behind the camera')
    elif heldout_rms_after > heldout_rms_before:
        warnings.append('heldout_regressed: held-out error increased; suspect correspondences, geometry or pose')
    dof = solved['dof']
    redundancy = 2 * len(landmarks) - dof
    if redundancy < 4:
        warnings.append(f'low_redundancy: {redundancy} spare constraints; residuals cannot reveal bad landmarks')
    output.mkdir(parents=True, exist_ok=True)
    candidate_path = output / 'camera-fit.blend'
    bpy.ops.wm.save_as_mainfile(filepath=str(candidate_path))
    data = camera.data
    parameters = {'ortho_scale' if data.type == 'ORTHO' else 'lens': data.ortho_scale if data.type == 'ORTHO' else data.lens,
                  'shift_x': data.shift_x, 'shift_y': data.shift_y}
    if args.mode == 'pose':
        parameters.update({'sensor_fit': data.sensor_fit, 'sensor_width': data.sensor_width, 'sensor_height': data.sensor_height})
    # Exact supplied correspondences plus the world point each resolved to, so annotations can be audited.
    provenance = lambda item, world: {'objectName': item['objectName'], 'localPoint': [float(v) for v in item.get('localPoint', [0, 0, 0])],
                                 'referenceUv': [float(v) for v in item['referenceUv']], 'world_point': [float(v) for v in world]}
    train_audit = [provenance(item, world) for item, world in zip(landmarks, points)]
    heldout_audit = [provenance(item, world) for item, world in zip(heldout, heldout_points)]
    report = {
        'scope': 'fixed_pose_reference_framing_fit' if args.mode == 'framing' else 'fixed_intrinsics_reference_pose_fit',
        'mode': args.mode, 'source': str(source), 'source_sha256': source_sha256,
        'candidate': str(candidate_path), 'source_camera': original.name, 'fitted_camera': camera.name,
        'projection': data.type, 'resolution': [args.width, args.height], 'iterations': iterations,
        'train_count': len(landmarks), 'heldout_count': len(heldout), 'degrees_of_freedom': dof, 'redundancy': redundancy,
        'rms_before_px': rms(before), 'rms_after_px': rms(after),
        'max_error_after_px': float(np.max(np.linalg.norm(after.reshape(-1, 2), axis=1))),
        'heldout_rms_before_px': heldout_rms_before, 'heldout_rms_after_px': heldout_rms_after,
        'heldout_max_error_after_px': float(np.max(np.linalg.norm(heldout_after, axis=1))) if heldout_valid else None,
        'geometry_changed': False, 'camera_pose_changed': solved['pose_changed'],
        'intrinsics_changed': solved['intrinsics_changed'],
        'parameters': parameters,
        'correspondence_sha256': hashlib.sha256(json.dumps(
            {'train': train_audit, 'heldout': heldout_audit}, sort_keys=True, separators=(',', ':')).encode()).hexdigest(),
        'landmarks': [{'name': item['name'], 'error_before_px': float(np.linalg.norm(a)),
                       'error_after_px': float(np.linalg.norm(b)), **audit,
                       'delta_before_px': [float(v) for v in a], 'delta_after_px': [float(v) for v in b]}
                      for item, audit, a, b in zip(landmarks, train_audit, before.reshape(-1, 2), after.reshape(-1, 2))],
        'heldout_landmarks': [{'name': item['name'], 'error_before_px': float(np.linalg.norm(a)) if fa else None,
                               'error_after_px': float(np.linalg.norm(b)) if fb else None, 'behind_camera_after': not bool(fb), **audit,
                               'delta_before_px': [float(v) for v in a] if fa else None,
                               'delta_after_px': [float(v) for v in b] if fb else None}
                              for item, audit, a, b, fa, fb in zip(heldout, heldout_audit, heldout_before, heldout_after,
                                                                   heldout_front_before, heldout_front_after)],
        'warnings': warnings,
        'limitations': ['Fits scale/focal length and lens shift only; orientation and camera position remain fixed.'
                        if args.mode == 'framing' else
                        'Fits bounded camera rotation and position only; lens, ortho scale, shift and sensor remain fixed.',
                        'Residual errors can mean wrong pose, geometry, correspondences or lens distortion.',
                        'Training residuals are optimized; judge the fit with held-out landmarks and held-out views.',
                        'Pose sigmas are local linearized estimates conditional on the supplied correspondences, not calibration truth.',
                        'No automatic landmark detection or occlusion inference; inspect the candidate overlay before retaining.',
                        'Copy accepted camera parameters into durable bpy source; the original source file is never saved.'],
    }
    if 'pose' in solved:
        report['pose'] = solved['pose']
    (output / 'camera-fit.json').write_text(json.dumps(finite(report), indent=2, allow_nan=False), encoding='utf-8')
    print(f'BLENDER_AGENT_STUDIO_CAMERA_FIT={output / "camera-fit.json"}')


def fit_framing(scene, camera, points, target, weights, blender_project):
    parameter = 'ortho_scale' if camera.data.type == 'ORTHO' else 'lens'
    initial = np.array([math.log(getattr(camera.data, parameter)), camera.data.shift_x, camera.data.shift_y])
    lower = np.array([math.log(1e-4 if parameter == 'ortho_scale' else 1), -2, -2])
    upper = np.array([math.log(1e6 if parameter == 'ortho_scale' else 300), 2, 2])

    def project(p):
        setattr(camera.data, parameter, math.exp(float(p[0])))
        camera.data.shift_x, camera.data.shift_y = float(p[1]), float(p[2])
        bpy.context.view_layer.update()
        uv, front = blender_project(points)
        if not front.all():
            raise ValueError('A landmark is behind the camera; fix orientation before fitting framing')
        return uv

    def residual(p):
        return ((project(p) - target) * weights).ravel()

    p = initial.copy()
    before = residual(p)
    iterations = 0
    for iterations in range(1, 13):
        current = residual(p)
        jacobian = np.column_stack([(residual(p + np.eye(3)[i] * .001) - current) / .001 for i in range(3)])
        # Relative test: Blender's float32 projection adds ~0.1px finite-difference noise to a null column.
        singular = np.linalg.svd(jacobian, compute_uv=False)
        if singular[-1] <= max(1e-4, 1e-3 * singular[0]):
            raise ValueError('Landmarks do not constrain framing; use spatially separated features')
        step = np.linalg.lstsq(jacobian, -current, rcond=None)[0]
        accepted = False
        for factor in (1, .5, .25, .125):
            candidate = np.clip(p + step * factor, lower, upper)
            if np.linalg.norm(residual(candidate)) < np.linalg.norm(current):
                p = candidate
                accepted = True
                break
        if not accepted or np.linalg.norm(step) < 1e-6:
            break
    after = residual(p)
    warnings, changed = [], True
    # Do not retain a numerical regression from a bounded or ill-conditioned solve.
    if rms(after) > rms(before):
        p = initial
        after = residual(p)
        warnings.append('reverted_to_initial: the bounded solve did not reduce training error')
        changed = False
    return {'before': before, 'after': after, 'iterations': iterations, 'dof': 3, 'pose_changed': False,
            'intrinsics_changed': changed, 'warnings': warnings}


def fit_pose(camera, points, target, weights, rotation_limit_deg, translation_ratio, blender_project):
    """Bounded Levenberg-Marquardt over camera-local rotation and translation with fixed intrinsics."""
    data = camera.data
    ortho = data.type == 'ORTHO'
    loc0, rot0, scale0 = camera.matrix_world.decompose()
    r0 = np.array(rot0.to_matrix(), dtype=float)
    t0 = np.array(loc0, dtype=float)
    world = np.array([tuple(p) for p in points], dtype=float)
    spread = np.linalg.svd(world - world.mean(axis=0), compute_uv=False)
    if spread[0] <= 1e-9 or spread[1] / spread[0] < 1e-3:
        raise ValueError('Training landmarks are coincident or collinear; pose is unconstrained')
    # Ortho depth along the view axis does not change the image, so it stays fixed.
    dof = 5 if ortho else 6
    length = float(data.ortho_scale) if ortho else float(np.linalg.norm(world.mean(axis=0) - t0))
    if length <= 1e-9:
        raise ValueError('Camera sits on the landmark centroid; move it to a plausible viewpoint first')
    rotation_limit = math.radians(rotation_limit_deg)
    # The camera-local view frame is fixed while intrinsics are fixed; projecting in float64 keeps the solve smooth.
    frame = [Vector(v) for v in data.view_frame(scene=bpy.context.scene)]
    min_x, max_x, min_y, max_y, depth = frame[2].x, frame[1].x, frame[1].y, frame[0].y, -frame[0].z

    def pose(p):
        rotation = r0 @ rodrigues(p[:3])
        delta = np.zeros(3)
        delta[:dof - 3] = p[3:] * length
        return rotation, t0 + r0 @ delta

    def residual(p):
        rotation, location = pose(p)
        local = (world - location) @ rotation
        z = -local[:, 2]
        if np.any(z <= 0):
            return None
        scale = np.ones_like(z) if ortho else z / depth
        u = (local[:, 0] - min_x * scale) / ((max_x - min_x) * scale)
        v = (local[:, 1] - min_y * scale) / ((max_y - min_y) * scale)
        return ((np.column_stack([u, 1 - v]) - target) * weights).ravel()

    def bounded(p):
        p = p.copy()
        angle, shift = np.linalg.norm(p[:3]), np.linalg.norm(p[3:])
        if angle > rotation_limit:
            p[:3] *= rotation_limit / angle
        if shift > translation_ratio:
            p[3:] *= translation_ratio / shift
        return p

    def jacobian(p, h=1e-6):
        columns = []
        for i in range(dof):
            e = np.eye(dof)[i] * h
            plus, minus = residual(p + e), residual(p - e)
            if plus is None or minus is None:
                raise ValueError('A training landmark is at the camera plane; move the camera before fitting pose')
            columns.append((plus - minus) / (2 * h))
        return np.column_stack(columns)

    def conditioning(j):
        s = np.linalg.svd(j, compute_uv=False)
        return float(s[0] / s[-1]) if s[-1] > s[0] * 1e-12 else math.inf

    p = np.zeros(dof)
    current = residual(p)
    if current is None:
        raise ValueError('A training landmark is behind the camera; fix orientation before fitting pose')
    initial_condition = conditioning(jacobian(p))
    if initial_condition > CONDITION_LIMIT:
        raise ValueError(f'Landmarks do not constrain camera pose (condition {initial_condition:.3g} > {CONDITION_LIMIT:g}); '
                         'add spatially separated, depth-varied features or keep the authored pose')
    cost = float(current @ current)
    damping, iterations, converged = 1e-3, 0, False
    for iterations in range(1, 101):
        j = jacobian(p)
        normal, gradient = j.T @ j, j.T @ current
        accepted = False
        for _ in range(12):
            step = np.linalg.solve(normal + damping * np.diag(np.diag(normal)) + 1e-12 * np.eye(dof), -gradient)
            candidate = bounded(p + step)
            values = residual(candidate)
            if values is not None and float(values @ values) < cost:
                moved = float(np.linalg.norm(candidate - p))
                gained = cost - float(values @ values)
                p, current, cost = candidate, values, float(values @ values)
                damping = max(damping / 3, 1e-9)
                accepted = True
                break
            damping *= 4
        if not accepted or moved < 1e-12 or gained <= 1e-14 * max(cost, 1e-30):
            converged = True
            break
    rotation, location = pose(p)
    camera.matrix_world = Matrix.LocRotScale(Vector(location), Matrix(rotation.tolist()).to_quaternion(), scale0)
    bpy.context.view_layer.update()
    # Report Blender's own projection, and reject a mismatch with the float64 solver model.
    camera_after = camera.matrix_world.copy()
    camera.matrix_world = Matrix.LocRotScale(loc0, rot0, scale0)
    uv_before, _ = blender_project(points)
    camera.matrix_world = camera_after
    uv_after, front = blender_project(points)
    before, after = ((uv_before - target) * weights).ravel(), ((uv_after - target) * weights).ravel()
    model_gap = float(np.max(np.abs(after - current)))
    if not front.all() or model_gap > 0.05:
        raise ValueError(f'Solved pose disagrees with Blender projection by {model_gap:.3g}px; refusing candidate')
    warnings = []
    # A near-exact start can only gain float noise; keep the start if Blender measures no improvement.
    if rms(after) > rms(before):
        p = np.zeros(dof)
        camera.matrix_world = Matrix.LocRotScale(loc0, rot0, scale0)
        bpy.context.view_layer.update()
        after, current = before, residual(p)
        cost = float(current @ current)
        warnings.append('reverted_to_initial: Blender-measured training error did not improve')
    m = len(points) * 2
    final_j = jacobian(p)
    final_condition = conditioning(final_j)
    sigma_rotation = sigma_translation = None
    if m > dof and math.isfinite(final_condition):
        try:
            covariance = (cost / (m - dof)) * np.linalg.inv(final_j.T @ final_j)
            sigma = np.sqrt(np.clip(np.diag(covariance), 0, None))
            if np.all(np.isfinite(sigma)):
                sigma_rotation = [math.degrees(v) for v in sigma[:3]]
                sigma_translation = [float(v * length) for v in sigma[3:]] + ([None] if ortho else [])
        except np.linalg.LinAlgError:
            pass
    angle, shift = float(np.linalg.norm(p[:3])), float(np.linalg.norm(p[3:]))
    at_rotation, at_translation = angle >= rotation_limit * 0.999, shift >= translation_ratio * 0.999
    if at_rotation or at_translation:
        warnings.append('bound_limited: the solve stopped at a pose bound; the authored camera may be far off or landmarks wrong')
    if final_condition > CONDITION_LIMIT:
        warnings.append(f'ill_conditioned: final condition {final_condition:.3g} exceeds {CONDITION_LIMIT:g}; sigmas may be unbounded')
    if not converged:
        warnings.append('not_converged: iteration limit reached')
    final_rotation = Quaternion(camera.matrix_world.to_quaternion())
    return {
        'before': before, 'after': after, 'iterations': iterations, 'dof': dof,
        'pose_changed': bool(angle > 0 or shift > 0), 'intrinsics_changed': False, 'warnings': warnings,
        'pose': {
            'location_before': list(loc0), 'location_after': list(camera.location),
            'rotation_quaternion_before': list(rot0), 'rotation_quaternion_after': list(final_rotation),
            'rotation_euler_xyz_deg_after': [math.degrees(v) for v in final_rotation.to_euler('XYZ')],
            'rotation_change_deg': math.degrees(angle), 'translation_change': shift * length,
            'rotation_limit_deg': rotation_limit_deg, 'translation_limit': translation_ratio * length,
            'translation_reference_length': length,
            'translation_reference': 'ortho_scale' if ortho else 'distance_to_training_centroid',
            'at_rotation_bound': at_rotation, 'at_translation_bound': at_translation,
            'depth_fixed': ortho, 'converged': converged,
            'condition_number_initial': initial_condition, 'condition_number': final_condition,
            'condition_limit': CONDITION_LIMIT,
            'local_linear_sigma_rotation_deg': sigma_rotation, 'local_linear_sigma_translation': sigma_translation,
            'local_linear_sigma_note': ('1-sigma from the training Jacobian and residual scale at the solution, assuming the '
                                        'supplied correspondences, geometry and intrinsics are correct; not calibration truth. '
                                        'Null when there are no spare constraints or the Jacobian is singular.'),
            'solver_model_gap_px': model_gap,
        },
    }


if __name__ == '__main__':
    main()
