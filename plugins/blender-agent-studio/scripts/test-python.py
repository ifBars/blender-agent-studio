"""Discover standalone skill test directories without requiring package imports."""
from pathlib import Path
import sys
import unittest

root = Path(__file__).resolve().parents[1]
suite = unittest.TestSuite()
for skill in ('blender-asset-validation', 'blender-rendering-workflow'):
    directory = root / 'skills' / skill / 'scripts'
    suite.addTests(unittest.TestLoader().discover(str(directory), pattern='test_*.py'))
sys.exit(not unittest.TextTestRunner(verbosity=2).run(suite).wasSuccessful())
