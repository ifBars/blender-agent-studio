import unittest
from evidence_settings import resolve_presentation, studio_settings


class EvidenceSettingsTests(unittest.TestCase):
    def test_scale_preserves_illumination_and_framing(self):
        for diagnostic in (False, True):
            reference = studio_settings(1.0, diagnostic)
            for scale in (0.01, 0.5, 10.0, 100.0):
                scaled = studio_settings(scale, diagnostic)
                for actual, expected in zip(scaled['light_powers'], reference['light_powers']):
                    self.assertAlmostEqual(actual / scale ** 2, expected)
                for key in ('camera_distance', 'ortho_scale', 'floor_size', 'floor_offset', 'clip_start', 'clip_end'):
                    self.assertAlmostEqual(scaled[key] / scale, reference[key])

    def test_invalid_extents_fail(self):
        for extent in (0, -1, float('nan'), float('inf')):
            with self.assertRaises(ValueError):
                studio_settings(extent)

    def test_auto_adapts_background_contrast(self):
        self.assertEqual(resolve_presentation('auto', 0.8), 'dark')
        self.assertEqual(resolve_presentation('auto', 0.01), 'light')
        self.assertEqual(resolve_presentation('auto', 0.2), 'neutral')
        self.assertEqual(resolve_presentation('auto', None), 'neutral')
        self.assertEqual(resolve_presentation('auto', float('nan')), 'neutral')

    def test_explicit_presentation_wins(self):
        for choice in ('dark', 'light', 'neutral'):
            self.assertEqual(resolve_presentation(choice, 0.01), choice)
            self.assertEqual(resolve_presentation(choice, 0.9), choice)
        with self.assertRaises(ValueError):
            resolve_presentation('unknown')
        with self.assertRaises(ValueError):
            studio_settings(1, presentation='auto')


if __name__ == '__main__':
    unittest.main()
