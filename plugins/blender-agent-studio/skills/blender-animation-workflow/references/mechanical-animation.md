# Mechanical animation review contract

Record:

- action and frame range;
- frames per second;
- named critical frames;
- moving assemblies;
- fixed supports;
- required contact pairs;
- required non-intersection pairs;
- visibility or material-transfer states;
- expected end state.

For each critical frame, inspect:

- world transform of each moving assembly;
- bounds overlap for required contacts;
- clearance for parts that must not intersect;
- whether the silhouette communicates the current phase;
- whether material exists in exactly one understandable stage of transfer.

Use motion metrics as diagnostics, not a universal aesthetic formula. Sudden changes in displacement, rotation, velocity, or acceleration are strong signals to inspect, but intentional impacts and mechanical stops can create real discontinuities.

Always view the final video at normal speed. A contact sheet cannot reveal whether a half-second ejection feels unnaturally fast.

## Dynamic connector invariant

Cables, hoses, pistons, straps, and link rods must remain attached to explicit
anchors through the full action. Use local anchors and evaluated transforms:

```python
from mathutils import Vector

def world_anchor(owner, local_anchor):
    bpy.context.view_layer.update()
    return owner.matrix_world @ Vector(local_anchor)

def set_unit_segment(segment, endpoint_a, endpoint_b, frame):
    a = Vector(endpoint_a)
    b = Vector(endpoint_b)
    direction = b - a
    if direction.length < 1e-6:
        raise ValueError(f"{segment.name} has coincident endpoints")

    segment.location = (a + b) * 0.5
    segment.rotation_mode = "QUATERNION"
    segment.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(
        direction.normalized()
    )
    # The segment mesh must be authored one unit long on local Z.
    segment.scale = (1.0, 1.0, direction.length)
    segment.keyframe_insert("location", frame=frame)
    segment.keyframe_insert("rotation_quaternion", frame=frame)
    segment.keyframe_insert("scale", frame=frame)
```

Create the segment mesh with local endpoints at `Z=-0.5` and `Z=+0.5`.
Do not reuse a mesh whose depth was already baked to the initial endpoint
distance unless the scale calculation divides by that baked depth.

For a hinged moving anchor, transform the local point around the hinge by using
the assembly object:

```python
moving_endpoint = world_anchor(deck_assembly, local_deck_anchor)
```

Do not calculate it by rotating a vector that already contains the hinge's
world position. The correct expanded form is:

```python
moving_endpoint = hinge_world + hinge_rotation @ local_offset_from_hinge
```

After setting every critical frame, evaluate and verify the connector:

```python
def endpoint_residual(segment, expected_a, expected_b):
    bpy.context.view_layer.update()
    actual_a = segment.matrix_world @ Vector((0, 0, -0.5))
    actual_b = segment.matrix_world @ Vector((0, 0, 0.5))
    direct = max((actual_a - expected_a).length, (actual_b - expected_b).length)
    swapped = max((actual_a - expected_b).length, (actual_b - expected_a).length)
    return min(direct, swapped)
```

Assert a task-scaled tolerance, such as one percent of the asset's largest
extent. Rendered critical frames must also show both endpoints. Numeric
attachment cannot replace visual review when the connector intersects other
parts or follows an implausible route.
