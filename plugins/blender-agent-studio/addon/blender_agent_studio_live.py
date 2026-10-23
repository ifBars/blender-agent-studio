"""Blender Agent Studio's bounded local viewport bridge.

Capture/picking approach inspired by MCP for Blender (MIT); see LICENSE.txt.
No script execution, file loading, saving, or geometry mutation commands.
"""
bl_info = {"name": "Blender Agent Studio Live", "author": "Bars",
           "version": (0, 1, 0), "blender": (4, 5, 0),
           "location": "3D View > Sidebar > Agent Studio", "category": "Interface"}

import base64
import hashlib
import json
import math
import os
from pathlib import Path
import secrets
import socket
import stat
import struct
import tempfile
import time
import zlib

import bpy
from bpy.app.handlers import persistent
from mathutils import Vector

PROTOCOL = 1
MAX_REQUEST = 16384
_bridge = None


def connection_path():
    return Path(os.environ.get("BAS_VIEWPORT_CONNECTION", "") or
                str(Path(tempfile.gettempdir()) / "blender-agent-studio" / "viewport.json"))


def png_bytes(width, height, pixels):
    """Encode bottom-up RGBA bytes without creating Blender image datablocks."""
    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))
    stride = width * 4
    rows = b"".join(b"\x00" + pixels[y * stride:(y + 1) * stride]
                    for y in range(height - 1, -1, -1))
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(rows, 3)) + chunk(b"IEND", b""))


def viewport():
    for window in bpy.context.window_manager.windows:
        for area in window.screen.areas:
            if area.type == "VIEW_3D":
                region = next((r for r in area.regions if r.type == "WINDOW"), None)
                if region and region.width > 1 and region.height > 1:
                    return window, area, region, area.spaces.active
    raise ValueError("Open a 3D Viewport in Blender, then refresh.")


def object_info(obj):
    return {"name": obj.name_full, "type": obj.type,
            "id": str(obj.session_uid),
            "location": list(obj.matrix_world.translation),
            "dimensions": list(obj.dimensions)}


class Bridge:
    def __init__(self):
        self.token = secrets.token_hex(32)
        self.session = secrets.token_hex(16)
        self.revision = 0
        self.sequence = 0
        self.capture = None
        self.signature = None
        self.view = None
        self.clients = []
        self.path = connection_path()
        self.server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.server.bind(("127.0.0.1", 0))
        self.server.listen(4)
        self.server.setblocking(False)
        descriptor = {"protocol": PROTOCOL, "port": self.server.getsockname()[1],
                      "token": self.token, "sessionId": self.session, "pid": os.getpid()}
        temporary = None
        try:
            default_path = not os.environ.get("BAS_VIEWPORT_CONNECTION")
            self.path.parent.mkdir(mode=0o700 if default_path else 0o777, parents=True, exist_ok=True)
            if default_path and hasattr(os, "getuid"):
                status = self.path.parent.lstat()
                if (not stat.S_ISDIR(status.st_mode) or status.st_uid != os.getuid()
                        or status.st_mode & 0o022):
                    raise PermissionError("The default connection directory must be owned by the current user "
                                          "and must not be writable by others or be a symlink. "
                                          "Set BAS_VIEWPORT_CONNECTION to use another path.")
            temporary = self.path.with_name(self.path.name + "." + self.session + ".tmp")
            with temporary.open("x", encoding="utf8") as stream:
                os.chmod(temporary, 0o600)
                json.dump(descriptor, stream)
            os.replace(temporary, self.path)
        except Exception:
            self.server.close()
            if temporary is not None:
                temporary.unlink(missing_ok=True)
            raise

    def close(self):
        self.server.close()
        for client in self.clients:
            client["socket"].close()
        self.clients.clear()
        try:
            if json.loads(self.path.read_text(encoding="utf8")).get("sessionId") == self.session:
                self.path.unlink()
        except (OSError, ValueError):
            pass

    def state_key(self, window, space, region):
        r3d = space.region_3d
        # Depsgraph events cover evaluated edits; matrices cover interactive navigation.
        value = [self.revision, bpy.data.filepath, window.scene.name_full,
                 window.view_layer.name, window.scene.frame_current,
                 region.width, region.height, space.shading.type, space.shading.color_type,
                 space.overlay.show_overlays, space.shading.show_xray,
                 [list(row) for row in r3d.view_matrix],
                 [list(row) for row in r3d.window_matrix],
                 sorted(str(o.session_uid) for o in window.view_layer.objects if o.select_get())]
        return hashlib.sha256(json.dumps(value).encode()).hexdigest()

    def snapshot(self, params):
        import gpu
        import numpy as np
        window, area, region, space = viewport()
        maximum = params.get("maxEdge", 1000)
        if type(maximum) is not int or not 256 <= maximum <= 1280:
            raise ValueError("maxEdge must be an integer from 256 to 1280.")
        key = self.state_key(window, space, region)
        if params.get("force") or self.capture is None or self.signature != key or self.capture["maxEdge"] != maximum:
            if space.shading.type == "RENDERED":
                raise ValueError("Switch Blender's viewport to Solid or Material Preview for live captures. Use the render tools for final images.")
            scale = min(1.0, maximum / max(region.width, region.height))
            width, height = max(1, int(region.width * scale)), max(1, int(region.height * scale))
            view_matrix = space.region_3d.view_matrix.copy()
            projection = space.region_3d.window_matrix.copy()
            offscreen = gpu.types.GPUOffScreen(width, height)
            try:
                with bpy.context.temp_override(window=window, area=area, region=region):
                    offscreen.draw_view3d(window.scene, window.view_layer, space, region,
                                         view_matrix, projection, do_color_management=True)
                    buf = offscreen.texture_color.read()
                    buf.dimensions = width * height * 4
                    pixels = np.asarray(buf, dtype=np.uint8).tobytes()
            finally:
                offscreen.free()
            self.sequence += 1
            objects = sorted((o for o in window.view_layer.objects if o.visible_get(view_layer=window.view_layer, viewport=space)), key=lambda o: o.name_full)
            self.capture = {"sessionId": self.session, "seq": self.sequence, "revision": self.revision,
                            "file": bpy.data.filepath, "scene": window.scene.name_full,
                            "frame": window.scene.frame_current, "capturedAt": time.time(),
                            "width": width, "height": height, "maxEdge": maximum,
                            "objectCount": len(objects), "objects": [object_info(o) for o in objects[:250]],
                            "png": base64.b64encode(png_bytes(width, height, pixels)).decode("ascii")}
            self.view = (view_matrix, projection, window.scene, window.view_layer, space)
            self.signature = self.state_key(window, space, region)
        result = dict(self.capture)
        if params.get("since") == self.sequence:
            result.pop("png")
        return result

    def require_capture(self, params):
        if not self.capture or params.get("seq") != self.sequence:
            raise ValueError("This capture has expired. Refresh before selecting an object.")
        window, area, region, space = viewport()
        if self.signature != self.state_key(window, space, region):
            raise ValueError("Blender changed since this capture. Refresh before selecting an object.")
        return window, area, region, space

    def pick(self, params):
        window, area, region, space = self.require_capture(params)
        with bpy.context.temp_override(window=window, area=area, region=region):
            if "objectId" in params:
                obj = next((o for o in window.view_layer.objects if str(o.session_uid) == params["objectId"]), None)
                if not obj or not obj.visible_get(view_layer=window.view_layer, viewport=space):
                    raise ValueError("That object is no longer visible. Refresh the viewport.")
            else:
                x, y = params.get("x"), params.get("y")
                if any(type(v) not in (int, float) or not math.isfinite(v) or not 0 <= v <= 1 for v in (x, y)):
                    raise ValueError("Pick coordinates must be between zero and one.")
                view, projection, scene, layer, _ = self.view
                inverse = (projection @ view).inverted()
                def unproject(depth):
                    point = inverse @ Vector((2 * x - 1, 1 - 2 * y, depth, 1))
                    return point.xyz / point.w
                start, end = unproject(-1), unproject(1)
                hit, _, _, _, obj, _ = scene.ray_cast(bpy.context.evaluated_depsgraph_get(), start, (end - start).normalized())
                obj = obj.original if hit and obj else None
                if obj and not obj.visible_get(view_layer=layer, viewport=space):
                    raise ValueError("The ray hit hidden geometry. Use the visible object list instead.")
            return {"sessionId": self.session, "seq": self.sequence,
                    "object": object_info(obj) if obj else None}

    def navigate(self, params):
        self.require_capture(params)
        window, area, region, space = viewport()
        action = params.get("action")
        def bounded(name):
            value = params.get(name)
            if type(value) not in (int, float) or not math.isfinite(value) or not -1 <= value <= 1:
                raise ValueError(name + " must be a finite number between -1 and 1.")
            return value
        # Validate the complete gesture before applying any viewport changes.
        dx, dy = (bounded("dx"), bounded("dy")) if action in ("ORBIT", "PAN") else (0, 0)
        amount = bounded("amount") if action == "ZOOM" else 0
        with bpy.context.temp_override(window=window, area=area, region=region):
            smooth = bpy.context.preferences.view.smooth_view
            try:
                # A capture must show the final view, not the first frame of
                # Blender's animated navigation. Restore the user preference.
                bpy.context.preferences.view.smooth_view = 0
                if action in ("FRONT", "BACK", "LEFT", "RIGHT", "TOP", "BOTTOM"):
                    bpy.ops.view3d.view_axis(type=action, align_active=False)
                elif action in ("ORBIT_LEFT", "ORBIT_RIGHT", "ORBIT_UP", "ORBIT_DOWN"):
                    bpy.ops.view3d.view_orbit(type=action.replace("_", ""), angle=math.radians(15))
                elif action in ("ZOOM_IN", "ZOOM_OUT"):
                    space.region_3d.view_distance = max(0.001, min(1e6, space.region_3d.view_distance * (0.8 if action == "ZOOM_IN" else 1.25)))
                elif action == "ORBIT":
                    if dx:
                        bpy.ops.view3d.view_orbit(type="ORBITRIGHT" if dx > 0 else "ORBITLEFT", angle=abs(dx) * math.pi)
                    if dy:
                        bpy.ops.view3d.view_orbit(type="ORBITUP" if dy > 0 else "ORBITDOWN", angle=abs(dy) * math.pi)
                elif action == "PAN":
                    r3d = space.region_3d
                    r3d.view_location += r3d.view_rotation @ Vector((-dx, dy, 0)) * r3d.view_distance
                elif action == "ZOOM":
                    space.region_3d.view_distance = max(0.001, min(1e6, space.region_3d.view_distance * math.exp(amount)))
                elif action == "FRAME_ALL":
                    bpy.ops.view3d.view_all(center=False)
                else:
                    raise ValueError("Unsupported view action.")
                space.region_3d.update()
            finally:
                bpy.context.preferences.view.smooth_view = smooth
            area.tag_redraw()
        return self.snapshot({"force": True})

    def dispatch(self, request):
        if not isinstance(request, dict) or request.get("protocol") != PROTOCOL or not secrets.compare_digest(str(request.get("token", "")), self.token):
            raise ValueError("Viewport bridge authentication failed.")
        params = request.get("params", {})
        if not isinstance(params, dict):
            raise ValueError("Expected an object of parameters.")
        if params.get("sessionId") not in (None, self.session):
            raise ValueError("A different Blender session is connected. Reopen the viewport.")
        command = request.get("command")
        if command == "snapshot":
            return self.snapshot(params)
        if command == "pick":
            return self.pick(params)
        if command == "navigate":
            return self.navigate(params)
        raise ValueError("Unsupported viewport command.")

    def tick(self):
        # Nonblocking socket IO and all bpy calls stay on Blender's main thread.
        try:
            connection, _ = self.server.accept()
            connection.setblocking(False)
            if len(self.clients) >= 4:
                connection.close()
            else:
                self.clients.append({"socket": connection, "input": b"", "output": None, "deadline": time.monotonic() + 15})
        except BlockingIOError:
            pass
        for client in list(self.clients):
            sock = client["socket"]
            try:
                if time.monotonic() > client["deadline"]:
                    raise ConnectionError("Timed out")
                if client["output"] is None:
                    data = sock.recv(16384)
                    if not data:
                        raise ConnectionError("Disconnected")
                    client["input"] += data
                    if len(client["input"]) > MAX_REQUEST:
                        raise ConnectionError("Request too large")
                    if b"\n" in client["input"]:
                        try:
                            request = json.loads(client["input"].split(b"\n", 1)[0])
                            payload = json.dumps({"ok": True, "result": self.dispatch(request)}, allow_nan=False)
                        except Exception as error:
                            payload = json.dumps({"ok": False, "error": str(error)})
                        client["output"] = (payload + "\n").encode()
                if client["output"] is not None:
                    sent = sock.send(client["output"])
                    client["output"] = client["output"][sent:]
                    if not client["output"]:
                        raise ConnectionError("Complete")
            except BlockingIOError:
                pass
            except (OSError, ValueError):
                sock.close()
                self.clients.remove(client)
        return 0.05


@persistent
def changed(*_):
    if _bridge:
        _bridge.revision += 1


def tick():
    if _bridge:
        return _bridge.tick()
    return None


def start():
    global _bridge
    if _bridge is None:
        _bridge = Bridge()
        bpy.app.timers.register(tick, first_interval=0.1, persistent=True)


def stop():
    global _bridge
    if bpy.app.timers.is_registered(tick):
        bpy.app.timers.unregister(tick)
    if _bridge:
        _bridge.close()
        _bridge = None


class BAS_OT_live_start(bpy.types.Operator):
    bl_idname = "bas.live_start"
    bl_label = "Connect Agent Studio"
    def execute(self, context):
        try:
            start()
        except Exception as error:
            self.report({"ERROR"}, str(error))
            return {"CANCELLED"}
        return {"FINISHED"}


class BAS_OT_live_stop(bpy.types.Operator):
    bl_idname = "bas.live_stop"
    bl_label = "Disconnect"
    def execute(self, context):
        stop()
        return {"FINISHED"}


class BAS_PT_live(bpy.types.Panel):
    bl_label = "Blender Agent Studio"
    bl_idname = "BAS_PT_live"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "Agent Studio"
    def draw(self, context):
        self.layout.label(text="Viewport connected" if _bridge else "Share your viewport with your agent")
        self.layout.operator("bas.live_stop" if _bridge else "bas.live_start")


_classes = (BAS_OT_live_start, BAS_OT_live_stop, BAS_PT_live)
_handlers = (bpy.app.handlers.depsgraph_update_post, bpy.app.handlers.load_post,
             bpy.app.handlers.undo_post, bpy.app.handlers.redo_post)


def register():
    for cls in _classes:
        bpy.utils.register_class(cls)
    for handlers in _handlers:
        handlers.append(changed)


def unregister():
    stop()
    for handlers in _handlers:
        if changed in handlers:
            handlers.remove(changed)
    for cls in reversed(_classes):
        bpy.utils.unregister_class(cls)


if __name__ == "__main__":
    register()
