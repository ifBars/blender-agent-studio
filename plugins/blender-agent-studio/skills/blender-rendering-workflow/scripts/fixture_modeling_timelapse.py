"""Small actual staged build used to test capture/render/encoding, not a benchmark submission."""
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector
sys.path.insert(0, str(Path(__file__).resolve().parent))
from modeling_timelapse import ModelingTimelapse

root = Path(sys.argv[-1]).resolve()
root.mkdir(parents=True, exist_ok=True)
record = ModelingTimelapse(root / 'progress', enabled=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)


def material(name, color, metallic=0, roughness=0.4):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Metallic'].default_value = metallic
    shader.inputs['Roughness'].default_value = roughness
    return mat


def cube(name, location, size, mat=None, bevel=0.025):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        modifier = obj.modifiers.new('Soft construction edges', 'BEVEL')
        modifier.width = bevel
        modifier.segments = 3
    if mat: obj.data.materials.append(mat)
    return obj


def cylinder(name, location, radius, depth, mat=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=radius, depth=depth, location=location)
    obj = bpy.context.object
    obj.name = name
    if mat: obj.data.materials.append(mat)
    bevel = obj.modifiers.new('Rim edges', 'BEVEL')
    bevel.width = 0.015
    bevel.segments = 3
    for polygon in obj.data.polygons: polygon.use_smooth = True
    return obj


# Real construction stages, recorded before the next operation.
cube('Table top', (0, 0, 1.2), (3.2, 1.6, 0.14))
for x in (-1.35, 1.35):
    for y in (-0.6, 0.6):
        cube('Table leg', (x, y, 0.565), (0.13, 0.13, 1.13))
record.capture('Table layout and primary forms')
cylinder('Lamp weighted base', (-0.9, 0.15, 1.32), 0.22, 0.1)
cylinder('Lamp stem', (-0.9, 0.15, 1.72), 0.035, 0.72)
bpy.ops.mesh.primitive_cone_add(vertices=64, radius1=0.36, radius2=0.14, depth=0.36, location=(-0.9, 0.15, 2.15))
shade = bpy.context.object
shade.name = 'Lamp brass shade'
for polygon in shade.data.polygons: polygon.use_smooth = True
record.capture('Lamp construction')
for index in range(3):
    book = cube('Book', (0.55, -0.15, 1.32 + index*0.12), (0.7, 0.46, 0.1))
    book.rotation_euler.z = index * 0.13
cylinder('Plant pot', (1.15, 0.35, 1.43), 0.17, 0.32)
for index in range(5):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8,
        location=(1.15 + math.cos(index*1.25)*0.14, 0.35 + math.sin(index*1.25)*0.12, 1.65 + index*0.04))
    leaf = bpy.context.object
    leaf.name = 'Plant leaf'
    leaf.scale = (0.1, 0.16, 0.21)
    for polygon in leaf.data.polygons: polygon.use_smooth = True
record.capture('Books and plant dressing')
wood = material('Warm walnut', (0.18, 0.075, 0.026))
brass = material('Brushed brass', (0.48, 0.27, 0.09), metallic=0.8)
cloth = material('Blue book cloth', (0.07, 0.19, 0.26))
ceramic = material('Cream ceramic', (0.7, 0.59, 0.42))
green = material('Leaf green', (0.08, 0.24, 0.11))
for obj in bpy.context.scene.objects:
    if obj.type != 'MESH': continue
    mat = wood if obj.name.startswith('Table') else brass if obj.name.startswith('Lamp') else cloth if obj.name.startswith('Book') else green if obj.name.startswith('Plant leaf') else ceramic
    obj.data.materials.append(mat)
ground = material('Warm neutral ground', (0.13, 0.12, 0.1), roughness=0.8)
cube('Ground', (0,0,-0.08), (12,12,0.16), ground)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 8
scene.cycles.use_denoising = True
scene.render.resolution_x, scene.render.resolution_y = 640, 360
scene.render.resolution_percentage = 100
scene.world = bpy.data.worlds.new('Soft studio world')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.18,0.22,0.28,1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.3
for name, location, energy, size in [('Key',(-3,-4,6),700,4),('Fill',(4,1,5),500,3)]:
    data = bpy.data.lights.new(name,'AREA')
    data.energy, data.shape, data.size = energy,'DISK',size
    light = bpy.data.objects.new(name,data)
    scene.collection.objects.link(light)
    light.location = location
    light.rotation_euler = (Vector((0,0,1))-light.location).to_track_quat('-Z','Y').to_euler()
for name, location, target in [('SceneHero',(5,-6,4),(0,0,1)),('SceneReverse',(-5,6,4),(0,0,1)),('SceneDetail',(3,-3,3),(0.5,0,1.5))]:
    data = bpy.data.cameras.new(name)
    camera = bpy.data.objects.new(name,data)
    scene.collection.objects.link(camera)
    camera.location = location
    camera.rotation_euler = (Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
    data.lens = 48
scene.camera = scene.objects['SceneHero']
bpy.ops.wm.save_as_mainfile(filepath=str(root/'asset.blend'))
record.capture('Materials, lighting and completed scene', final=True)
