"""Review frozen before/after reference reports; never infer overall likeness.

Standard-library CLI. Inputs are blender_compare_reference comparison.json files.
Camera fitting is a separate stage: changing framing invalidates this comparison.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path


def number(value, label, minimum=0, maximum=math.inf):
    if (isinstance(value, bool) or not isinstance(value, (int, float)) or
            not math.isfinite(value) or not minimum <= value <= maximum):
        raise ValueError(f'{label} must be finite in [{minimum}, {maximum}]')
    return value


def read_json(path):
    if path.stat().st_size > 2_097_152:
        raise ValueError(f'Report exceeds 2 MiB: {path}')
    return json.loads(path.read_text(encoding='utf-8-sig'))


def equivalent(a, b):
    if isinstance(a, bool) or isinstance(b, bool):
        return type(a) is type(b) and a == b
    if isinstance(a, (float, int)) and isinstance(b, (float, int)):
        return math.isfinite(a) and math.isfinite(b) and math.isclose(a, b, rel_tol=0, abs_tol=1e-7)
    if isinstance(a, dict) and isinstance(b, dict):
        return a.keys() == b.keys() and all(equivalent(a[k], b[k]) for k in a)
    if isinstance(a, list) and isinstance(b, list):
        return len(a) == len(b) and all(equivalent(x, y) for x, y in zip(a, b))
    return type(a) is type(b) and a == b


def points(report):
    result = {}
    for point in report.get('landmarks', []):
        name = point.get('name')
        if not isinstance(name, str) or not name or name in result:
            raise ValueError('Landmark names must be nonempty and unique')
        uv = point.get('reference_uv')
        if not isinstance(uv, list) or len(uv) != 2:
            raise ValueError(f'Invalid reference point: {name}')
        for value in uv:
            number(value, name, 0, 1)
        result[name] = point
    return result


def validate_pair(before, after):
    for report in (before, after):
        if report.get('scope') != 'projected_geometry_reference_comparison':
            raise ValueError('Expected blender_compare_reference report')
        for key in ('source_sha256', 'reference_sha256', 'camera', 'resolution', 'frame'):
            if key not in report or report[key] is None:
                raise ValueError(f'Missing evidence field: {key}')
        for key in ('source_sha256', 'reference_sha256', 'mask_sha256'):
            value = report.get(key)
            if value is None and key == 'mask_sha256':
                continue
            if not isinstance(value, str) or len(value) != 64 or any(c not in '0123456789abcdef' for c in value):
                raise ValueError(f'Invalid evidence hash: {key}')
        size = report['resolution']
        if not isinstance(size, list) or len(size) != 2:
            raise ValueError('Resolution must contain width and height')
        for value in size:
            number(value, 'resolution', 1, 8192)
            if not isinstance(value, int):
                raise ValueError('Resolution must contain integer dimensions')
        if not isinstance(report['camera'], dict) or 'matrix_world' not in report['camera']:
            raise ValueError('Camera matrix is required')
        matrix = report['camera']['matrix_world']
        if not isinstance(matrix, list) or len(matrix) != 4 or any(not isinstance(row, list) or len(row) != 4 for row in matrix):
            raise ValueError('Camera matrix must be 4 by 4')
        for row in matrix:
            for value in row:
                number(value, 'camera matrix', -math.inf)
    for key in ('reference_sha256', 'mask_sha256', 'camera', 'resolution', 'frame'):
        if not equivalent(before.get(key), after.get(key)):
            raise ValueError(f'Changed {key}; establish a new baseline before comparing geometry')
    old, new = points(before), points(after)
    if old.keys() != new.keys():
        raise ValueError('Changed landmark set; establish a new baseline')
    for name in old:
        if not equivalent(old[name]['reference_uv'], new[name]['reference_uv']):
            raise ValueError(f'Changed reference landmark {name}; establish a new baseline')
        if not old[name].get('object') or old[name].get('object') != new[name].get('object'):
            raise ValueError(f'Changed or missing landmark object {name}; establish a new baseline')
    return old, new


def point_error(point, size):
    # Recompute from coordinates rather than trusting a separately rounded scalar.
    uv = point.get('model_uv')
    if (point.get('in_front_of_camera') is not True or point.get('in_frame') is not True or
            not isinstance(uv, list) or len(uv) != 2):
        return None
    for value in uv:
        number(value, 'model_uv', 0, 1)
    return math.hypot(*[(a-b)*s for a, b, s in zip(uv, point['reference_uv'], size)])


def measure(report, normalizer, proportions):
    landmarks = points(report)
    errors = {name: point_error(p, report['resolution']) for name, p in landmarks.items()}
    valid = [v / normalizer for v in errors.values() if v is not None]
    complete = bool(errors) and len(valid) == len(errors)
    iou = None
    if report.get('metrics') is not None:
        if not report.get('mask_sha256'):
            raise ValueError('Silhouette score requires a recorded reference mask hash')
        iou = number(report['metrics']['iou'], 'IoU', 0, 1)

    def segment(pair, field):
        if not isinstance(pair, list) or len(pair) != 2 or pair[0] == pair[1]:
            raise ValueError('A proportion segment needs two distinct landmark names')
        if any(name not in landmarks for name in pair):
            raise ValueError('Unknown proportion landmark')
        if field == 'model_uv' and any(errors[name] is None for name in pair):
            return None
        a, b = (landmarks[name][field] for name in pair)
        return math.hypot(*[(x-y)*s for x, y, s in zip(a, b, report['resolution'])])

    ratios = []
    seen = set()
    for spec in proportions:
        name = spec['name']
        if not isinstance(name, str) or not name or name in seen:
            raise ValueError('Proportion names must be nonempty and unique')
        seen.add(name)
        rn, rd = (segment(spec[k], 'reference_uv') for k in ('numerator', 'denominator'))
        mn, md = (segment(spec[k], 'model_uv') for k in ('numerator', 'denominator'))
        if min(rn, rd) <= 1e-6:
            raise ValueError('Reference proportion has a zero-length segment')
        reference = rn / rd
        model = None if mn is None or md is None or md <= 1e-6 else mn / md
        ratios.append({'name': name, 'reference': reference, 'model': model,
                       'relative_error': None if model is None else abs(model/reference - 1)})
    return {'iou': iou, 'landmarks_complete': complete,
            'landmark_errors_pixels': errors,
            'landmark_rms_normalized': math.sqrt(sum(v*v for v in valid)/len(valid)) if complete else None,
            'landmark_max_normalized': max(valid) if complete else None,
            'landmark_errors_normalized': {k: None if v is None else v/normalizer for k, v in errors.items()},
            'projected_proportions': ratios,
            'touches_border': report.get('model_touches_image_border') is not False}


def evaluate(contract, base):
    if contract.get('schema') != 'bas-likeness-review/0.1':
        raise ValueError('Expected schema bas-likeness-review/0.1')
    targets = contract.get('targets', {})
    limits = {'min_iou': number(targets.get('min_iou', .95), 'min_iou', 0, 1),
              'max_landmark_error': number(targets.get('max_landmark_error', .02), 'max_landmark_error', 0, 1),
              'max_proportion_error': number(targets.get('max_proportion_error', .03), 'max_proportion_error', 0, 1)}
    views = contract.get('views')
    if not isinstance(views, list) or not 1 <= len(views) <= 32:
        raise ValueError('Supply 1 to 32 named views')
    results, names, evidence_sets = [], set(), set()
    for view in views:
        name = view.get('name')
        if not isinstance(name, str) or not name or name in names:
            raise ValueError('View names must be nonempty and unique')
        names.add(name)
        if view.get('role') not in ('fit', 'validation'):
            raise ValueError('View role must be fit or validation')
        norm = view['normalization']
        if not isinstance(norm.get('label'), str) or not norm['label'].strip():
            raise ValueError('Name the reference normalization length, such as head height')
        paths = [(base / view[key]).resolve() for key in ('baseline', 'candidate')]
        before, after = [read_json(p) for p in paths]
        old_points, _ = validate_pair(before, after)
        for manifest_key, report_key in (('referenceSha256', 'reference_sha256'), ('maskSha256', 'mask_sha256')):
            if manifest_key not in view or view[manifest_key] != before.get(report_key):
                raise ValueError(f'{manifest_key} must pin the intake evidence hash (null only for no mask)')
        pair = norm.get('referenceLandmarks')
        if not isinstance(pair, list) or len(pair) != 2 or pair[0] == pair[1] or any(k not in old_points for k in pair):
            raise ValueError('Normalization requires two distinct referenceLandmarks in the reports')
        a, b = (old_points[k]['reference_uv'] for k in pair)
        length = math.hypot(*[(x-y)*s for x, y, s in zip(a, b, before['resolution'])])
        number(length, 'reference normalization length', 1e-6)
        if 'pixels' in norm and not math.isclose(number(norm['pixels'], 'normalization pixels'), length, rel_tol=0, abs_tol=.5):
            raise ValueError('Normalization pixels disagree with the reference landmarks')
        norm = {**norm, 'pixels': length}
        signature = before['reference_sha256']
        if signature in evidence_sets:
            raise ValueError('Duplicate reference view cannot count as independent validation')
        evidence_sets.add(signature)
        old, new = [measure(r, length, view.get('proportions', [])) for r in (before, after)]
        reasons = []
        if view.get('alignmentReviewed') is not True or not view.get('alignmentEvidence'):
            reasons.append('camera/pose alignment not reviewed')
        if view.get('landmarksReviewed') is not True:
            reasons.append('landmark correspondence/visibility not reviewed')
        if not new['landmarks_complete'] or not old['landmarks_complete']:
            reasons.append('missing or out-of-frame landmark evidence')
        if len({tuple(p['reference_uv']) for p in old_points.values()}) < 3:
            reasons.append('fewer than three distinct landmark correspondences')
        if new['iou'] is None or old['iou'] is None:
            reasons.append('no reviewed silhouette mask')
        if old['touches_border'] or new['touches_border']:
            reasons.append('silhouette is cropped or border status is unknown')
        if any(p['relative_error'] is None for p in new['projected_proportions']):
            reasons.append('unmeasurable projected proportion')
        met = (not reasons and new['iou'] >= limits['min_iou'] and
               new['landmark_max_normalized'] <= limits['max_landmark_error'] and
               all(p['relative_error'] <= limits['max_proportion_error'] for p in new['projected_proportions']))
        delta = {key: None if old[key] is None or new[key] is None else new[key]-old[key]
                 for key in ('iou', 'landmark_rms_normalized', 'landmark_max_normalized')}
        regressions = [key for key, value in delta.items() if value is not None and
                       (value < -1e-7 if key == 'iou' else value > 1e-7)]
        regressions.extend('proportion: ' + p['name'] for previous, p in zip(old['projected_proportions'], new['projected_proportions'])
                           if previous['relative_error'] is not None and p['relative_error'] is not None and
                           p['relative_error'] > previous['relative_error'] + 1e-7)
        results.append({'name': name, 'role': view['role'], 'region': view.get('region', 'unspecified'),
                        'normalization': norm, 'alignmentEvidence': view.get('alignmentEvidence'),
                        'reports': [{'path': str(p), 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in paths],
                        'baseline': old, 'candidate': new, 'delta_candidate_minus_baseline': delta,
                        'regressions': regressions,
                        'status': 'unverified' if reasons else ('targets_met' if met else 'targets_not_met'),
                        'reasons': reasons})
    has_validation = any(v['role'] == 'validation' for v in results)
    status = ('unverified' if not has_validation or any(v['status'] == 'unverified' for v in results)
              else 'targets_met' if all(v['status'] == 'targets_met' for v in results) else 'targets_not_met')
    return {'schema': 'bas-likeness-review-result/0.1', 'scope': 'declared_projected_views_only',
            'status': status, 'targets': limits, 'has_validation_view': has_validation, 'views': results,
            'has_regressions': any(v['regressions'] for v in results),
            'targets_looser_than_example': (limits['min_iou'] < .95 or limits['max_landmark_error'] > .02 or limits['max_proportion_error'] > .03),
            'overall_likeness': 'not_measured', 'visual_review': 'required', 'retention_decision': 'not_automated',
            'limitations': ['Targets are user-defined projected measurements, not a percentage of identity or 3D accuracy.',
                           'Alignment, mask, landmark visibility and validation independence are declared by the reviewer, not inferred.',
                           'Landmark anchors must follow the same semantic mesh features; this report cannot certify anchor attachment.',
                           'Validation views reused to choose edits are no longer unseen test evidence.',
                           'Proportion ratios are projected lengths, not anatomical 3D measurements.',
                           'Review all face details, shading, hidden views and technical/export invariants before retaining a repair.']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    result = evaluate(read_json(args.manifest), args.manifest.resolve().parent)
    with args.output.open('x', encoding='utf-8') as stream:
        json.dump(result, stream, indent=2, allow_nan=False)
    print(f"{result['status']}: {args.output}")


if __name__ == '__main__':
    main()
