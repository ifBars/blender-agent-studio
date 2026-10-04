"""Bounded authored-camera evidence with a contact sheet for scene benchmarks."""
import json
import math
import sys
from pathlib import Path

import bpy
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parent))
from render_scene import main as render_scene


def main():
    render_scene()
    arguments = sys.argv[sys.argv.index('--') + 1:]
    directory = Path(arguments[arguments.index('--output-dir') + 1]).resolve()
    manifest = json.loads((directory / 'render-manifest.json').read_text(encoding='utf-8'))
    if manifest['status'] != 'complete' or not manifest['renders']:
        raise RuntimeError('Authored-camera evidence did not complete')
    width, height = manifest['effective']['resolution']
    columns = min(3, len(manifest['renders']))
    rows = math.ceil(len(manifest['renders']) / columns)
    pixels = np.zeros((height * rows, width * columns, 4), dtype=np.float32)
    for index, render in enumerate(manifest['renders']):
        image = bpy.data.images.load(render['path'], check_existing=False)
        buffer = np.empty(width * height * 4, dtype=np.float32)
        image.pixels.foreach_get(buffer)
        row, column = divmod(index, columns)
        pixels[row*height:(row+1)*height, column*width:(column+1)*width] = buffer.reshape(height, width, 4)
        bpy.data.images.remove(image)
    sheet = bpy.data.images.new('Authored camera evidence', width=width*columns, height=height*rows, alpha=True)
    sheet.pixels.foreach_set(pixels.ravel())
    sheet.filepath_raw = str(directory / 'contact_sheet.png')
    sheet.file_format = 'PNG'
    sheet.save()
    evidence = {'scope': 'authored_scene_cameras', 'contact_sheet': sheet.filepath_raw,
                'views': manifest['renders'], 'sourceSha256': manifest['sourceSha256'],
                'lighting': 'authored', 'missingDependencies': manifest['preflight']['missingDependencies']}
    (directory / 'evidence.json').write_text(json.dumps(evidence, indent=2), encoding='utf-8')


if __name__ == '__main__':
    main()
