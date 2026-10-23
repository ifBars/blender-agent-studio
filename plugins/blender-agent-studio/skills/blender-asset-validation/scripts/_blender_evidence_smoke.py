"""Runs inside Blender; generated fixtures stay in the caller's temp directory."""
from pathlib import Path
import sys
import bpy
import numpy as np
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import render_evidence as renderer

output = Path(sys.argv[sys.argv.index('--') + 1])
pixels = []
for extent, contaminated in ((0.05, False), (5.0, True)):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=extent / 2, location=(0, 0, extent / 2))
    subject = bpy.context.object
    material = renderer.diagnostic_material('Subject', (0.15, 0.2, 0.25, 1))
    subject.data.materials.append(material)
    for face in subject.data.polygons:
        face.use_smooth = True
    scene = bpy.context.scene
    if contaminated:
        bpy.ops.object.light_add(type='SUN')
        bpy.context.object.data.energy = 1000
        scene.view_settings.exposure = 5
        scene.view_settings.gamma = 2
        scene.render.use_border = True
        scene.render.pixel_aspect_x = 2
    hint = renderer.subject_luminance()
    assert hint is not None and 0.15 < hint < 0.25, hint
    # glTF imports can create rig helpers in a render-hidden collection.
    # A hidden ancestor must exclude its meshes from framing and auto contrast.
    hidden = bpy.data.collections.new("glTF_not_exported")
    scene.collection.children.link(hidden)
    nested = bpy.data.collections.new("NestedHelpers")
    hidden.children.link(nested)
    helper = bpy.data.objects.new("RigHelper", subject.data.copy())
    nested.objects.link(helper)
    helper.data.materials.clear()
    helper.data.materials.append(renderer.diagnostic_material("HelperWhite", (1, 1, 1, 1)))
    helper.location = (100, 100, -100)
    hidden.hide_render = True
    bpy.context.view_layer.update()
    low, high = renderer.scene_bounds()
    assert abs(low.z) < extent * .01 and abs(high.z - extent) < extent * .01, (low, high)
    assert abs(renderer.subject_luminance() - hint) < 1e-6
    # Multiple collection links must retain a genuinely renderable instance.
    scene.collection.objects.link(helper)
    assert helper in list(renderer.renderable_mesh_objects())
    scene.collection.objects.unlink(helper)
    hidden.hide_render = False
    bpy.context.view_layer.layer_collection.children[hidden.name].exclude = True
    assert helper not in list(renderer.renderable_mesh_objects())
    bpy.context.view_layer.layer_collection.children[hidden.name].exclude = False
    hidden.hide_render = True
    center = Vector((0, 0, extent / 2))
    renderer.configure_scene(center, extent, 0, False)
    assert len([obj for obj in scene.objects if obj.type == 'LIGHT']) == 3
    assert scene.view_settings.exposure == 0 and scene.view_settings.gamma == 1
    assert not scene.render.use_compositing and not scene.render.use_border
    assert scene.render.pixel_aspect_x == scene.render.pixel_aspect_y == 1
    camera = renderer.create_camera()
    path = renderer.render_view(camera, f'scale-{extent}', Vector((1.4, -1.7, 1.2)), center, extent, output, 128, False)
    image = bpy.data.images.load(str(path), check_existing=False)
    data = np.empty(len(image.pixels), dtype=np.float32)
    image.pixels.foreach_get(data)
    pixels.append(data.reshape((-1, 4))[:, :3])
    bpy.data.images.remove(image)
error = float(np.mean(np.abs(pixels[0] - pixels[1])))
assert error < 0.015, f'Scale/scene state changed illumination or framing: {error}'
print('EVIDENCE_SMOKE_PASS', error)
