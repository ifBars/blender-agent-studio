import copy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

import review_likeness as review


def fixture():
    points = []
    for name, uv in [('left', [.25, .5]), ('right', [.75, .5]), ('top', [.5, .1]), ('chin', [.5, .9])]:
        points.append({'name': name, 'object': 'Head', 'reference_uv': uv, 'model_uv': uv[:],
                       'in_front_of_camera': True, 'in_frame': True})
    return {'scope': 'projected_geometry_reference_comparison', 'source_sha256': 'a'*64,
            'reference_sha256': 'b'*64, 'mask_sha256': 'c'*64, 'resolution': [1000, 1000],
            'frame': 0, 'camera': {'name': 'front', 'lens': 50,
            'matrix_world': [[1, 0, 0, 0], [0, 1, 0, -3], [0, 0, 1, 0], [0, 0, 0, 1]]},
            'landmarks': points, 'metrics': {'iou': .97}, 'model_touches_image_border': False}


class ReviewLikenessTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.before, self.after = fixture(), fixture()
        self.after['source_sha256'] = 'd'*64
        self.contract = {'schema': 'bas-likeness-review/0.1', 'views': [{
            'name': 'head-front', 'region': 'face', 'role': 'validation',
            'baseline': 'before.json', 'candidate': 'after.json',
            'referenceSha256': 'b'*64, 'maskSha256': 'c'*64,
            'alignmentReviewed': True, 'alignmentEvidence': 'Reviewed camera and matched expression; frozen source cameras.',
            'landmarksReviewed': True, 'normalization': {'label': 'reference head height', 'pixels': 800, 'referenceLandmarks': ['top', 'chin']},
            'proportions': [{'name': 'width / height', 'numerator': ['left', 'right'], 'denominator': ['top', 'chin']}]}]}

    def run_review(self):
        for name, value in [('before', self.before), ('after', self.after)]:
            (self.root / f'{name}.json').write_text(json.dumps(value), encoding='utf-8')
        return review.evaluate(self.contract, self.root)

    def test_matching_geometry_meets_declared_targets_but_never_claims_identity(self):
        result = self.run_review()
        self.assertEqual(result['status'], 'targets_met')
        self.assertEqual(result['overall_likeness'], 'not_measured')
        self.assertEqual(result['visual_review'], 'required')
        self.assertEqual(result['views'][0]['candidate']['projected_proportions'][0]['relative_error'], 0)

    def test_correct_outline_cannot_hide_inaccurate_face_point(self):
        self.after['landmarks'][0]['model_uv'][0] += .08
        result = self.run_review()
        self.assertEqual(result['status'], 'targets_not_met')
        self.assertAlmostEqual(result['views'][0]['candidate']['landmark_max_normalized'], .1)
        self.assertGreater(result['views'][0]['candidate']['projected_proportions'][0]['relative_error'], .03)

    def test_point_errors_recomputed_instead_of_trusting_scalar(self):
        self.after['landmarks'][0]['model_uv'][0] += .04
        self.after['landmarks'][0]['error_pixels'] = 0
        result = self.run_review()
        self.assertEqual(result['status'], 'targets_not_met')

    def test_camera_reference_mask_and_resolution_changes_rejected(self):
        original = copy.deepcopy(self.after)
        for field, value in [('reference_sha256', 'e'*64), ('mask_sha256', 'e'*64),
                             ('resolution', [800, 1000]), ('frame', 1)]:
            with self.subTest(field=field):
                self.after = copy.deepcopy(original)
                self.after[field] = value
                with self.assertRaisesRegex(ValueError, 'Changed'):
                    self.run_review()
        self.after = copy.deepcopy(original)
        self.after['camera']['matrix_world'][0][3] += .1
        with self.assertRaisesRegex(ValueError, 'Changed camera'):
            self.run_review()

    def test_changed_reference_annotation_rejected(self):
        self.after['landmarks'][0]['reference_uv'][0] += .01
        with self.assertRaisesRegex(ValueError, 'Changed reference landmark'):
            self.run_review()

    def test_missing_landmarks_mask_and_validation_do_not_pass(self):
        for report in (self.before, self.after):
            report['metrics'] = None
            report['mask_sha256'] = None
        self.contract['views'][0]['maskSha256'] = None
        self.contract['views'][0]['proportions'] = []
        self.contract['views'][0]['role'] = 'fit'
        result = self.run_review()
        self.assertEqual(result['status'], 'unverified')
        self.assertFalse(result['has_validation_view'])

    def test_occluded_unreviewed_or_cropped_evidence_is_unverified(self):
        self.contract['views'][0]['landmarksReviewed'] = False
        self.assertEqual(self.run_review()['status'], 'unverified')
        self.contract['views'][0]['landmarksReviewed'] = True
        self.after['model_touches_image_border'] = True
        self.assertEqual(self.run_review()['status'], 'unverified')
        self.after['model_touches_image_border'] = False
        self.after['landmarks'][0]['in_frame'] = False
        self.assertEqual(self.run_review()['status'], 'unverified')

    def test_duplicate_names_and_invalid_normalizer_rejected(self):
        self.contract['views'].append(copy.deepcopy(self.contract['views'][0]))
        with self.assertRaisesRegex(ValueError, 'unique'):
            self.run_review()
        self.contract['views'].pop()
        self.contract['views'][0]['normalization']['pixels'] = 10000
        with self.assertRaisesRegex(ValueError, 'disagree'):
            self.run_review()

    def test_fake_validation_duplicate_and_changed_object_rejected(self):
        self.contract['views'].append({**self.contract['views'][0], 'name': 'duplicate', 'role': 'fit'})
        with self.assertRaisesRegex(ValueError, 'Duplicate reference view'):
            self.run_review()
        self.contract['views'].pop()
        self.after['landmarks'][0]['object'] = 'UnrelatedAnchor'
        with self.assertRaisesRegex(ValueError, 'landmark object'):
            self.run_review()

    def test_regression_reported_even_when_targets_still_met(self):
        self.after['metrics']['iou'] = .951
        result = self.run_review()
        self.assertEqual(result['status'], 'targets_met')
        self.assertIn('iou', result['views'][0]['regressions'])
        self.assertEqual(result['retention_decision'], 'not_automated')
        self.assertTrue(result['has_regressions'])

    def test_intake_hash_and_loosened_targets_are_explicit(self):
        self.contract['views'][0]['referenceSha256'] = 'f'*64
        with self.assertRaisesRegex(ValueError, 'intake'):
            self.run_review()
        self.contract['views'][0]['referenceSha256'] = 'b'*64
        self.contract['targets'] = {'min_iou': .4}
        self.assertTrue(self.run_review()['targets_looser_than_example'])

    def test_two_points_do_not_establish_landmark_coverage(self):
        for report in (self.before, self.after):
            report['landmarks'] = report['landmarks'][2:]
        self.contract['views'][0]['proportions'] = []
        self.assertEqual(self.run_review()['status'], 'unverified')

    def test_nonfinite_numeric_input_rejected(self):
        self.after['metrics']['iou'] = float('nan')
        with self.assertRaisesRegex(ValueError, 'finite'):
            self.run_review()
        self.after['metrics']['iou'] = .97
        self.contract['targets'] = {'min_iou': True}
        with self.assertRaisesRegex(ValueError, 'finite'):
            self.run_review()

    def test_zero_length_ratio_rejected(self):
        for report in (self.before, self.after):
            report['landmarks'][1]['reference_uv'] = report['landmarks'][0]['reference_uv'][:]
        with self.assertRaisesRegex(ValueError, 'zero-length'):
            self.run_review()

    def test_cli_writes_new_report_and_refuses_overwrite(self):
        self.run_review()
        manifest = self.root / 'manifest.json'
        manifest.write_text(json.dumps(self.contract), encoding='utf-8')
        output = self.root / 'review.json'
        args = [sys.executable, str(Path(review.__file__)), '--manifest', str(manifest), '--output', str(output)]
        first = subprocess.run(args, capture_output=True, text=True, timeout=10)
        self.assertEqual(first.returncode, 0, first.stderr)
        data = output.read_bytes()
        second = subprocess.run(args, capture_output=True, text=True, timeout=10)
        self.assertNotEqual(second.returncode, 0)
        self.assertEqual(output.read_bytes(), data)


if __name__ == '__main__':
    unittest.main()
