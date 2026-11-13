"""Blender Agent Studio's viewport bridge and in-Blender agent panel.

The bridge is a local, authenticated protocol for viewport capture, picking
and navigation. Capture/picking approach inspired by MCP for Blender (MIT);
see LICENSE.txt. One command, run_python, executes a script in the open
session. It is refused unless the user ticks Allow Live Edits in the panel.

The agent panel runs the user's own Claude Code or Codex CLI as a child
process. By default the agent reads a saved copy of the scene and delivers
.blend files, whose objects the panel appends. With live edits allowed, it
edits the open scene through run_python instead.
"""
bl_info = {"name": "Blender Agent Studio Live", "author": "Bars",
           "version": (0, 2, 0), "blender": (4, 5, 0),
           "location": "3D View > Sidebar > Agent Studio", "category": "Interface"}

import atexit
import base64
import contextlib
import hashlib
import io
import json
import math
import os
from pathlib import Path
import queue
import secrets
import shutil
import signal
import socket
import stat
import struct
import subprocess
import tempfile
import textwrap
import threading
import time
import traceback
import zlib

import bpy
from bpy.app.handlers import persistent
from mathutils import Vector

PROTOCOL = 1
MAX_REQUEST = 16384
MAX_SCRIPT = 1_000_000
_bridge = None


def live_edits_allowed():
    """Read at every request, so unticking the box takes effect at once."""
    return bool(getattr(bpy.context.window_manager, "bas_live_edits", False))


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

    def run_python(self, params):
        """Run a script file in the open session. The only command that can
        change the scene; everything else in this protocol is read or view only."""
        if not live_edits_allowed():
            raise ValueError("Live edits are off. In Blender's Agent Studio sidebar, tick Allow Live Edits.")
        path = params.get("scriptPath")
        if not isinstance(path, str) or not os.path.isabs(path) or not path.endswith(".py"):
            raise ValueError("scriptPath must be an absolute path to a .py file.")
        if os.path.getsize(path) > MAX_SCRIPT:
            raise ValueError("The script is larger than 1 MB.")
        source = Path(path).read_text(encoding="utf8")
        try:
            window, area, region, _ = viewport()
            override = {"window": window, "area": area, "region": region}
        except ValueError:
            windows = bpy.context.window_manager.windows
            override = {"window": windows[0]} if windows else {}
        output, error = io.StringIO(), None
        with bpy.context.temp_override(**override), contextlib.redirect_stdout(output):
            try:
                exec(compile(source, path, "exec"), {"__name__": "__main__", "__file__": path})
            except (Exception, SystemExit):
                error = traceback.format_exc()
            try:
                # One undo step per run, including a failed run's partial changes.
                bpy.ops.ed.undo_push(message="Agent edit: " + Path(path).name)
            except RuntimeError:
                pass
            mode = bpy.context.mode
        self.revision += 1
        return {"sessionId": self.session, "ok": error is None, "output": output.getvalue()[-8000:],
                "error": error[-4000:] if error else None, "mode": mode}

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
        if command == "run_python":
            return self.run_python(params)
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
                        # A long script must not expire its own reply.
                        client["deadline"] = time.monotonic() + 15
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


# --- Agent panel -----------------------------------------------------------

PLUGIN = "blender-agent-studio"
AGENTS = {"CLAUDE": ("Claude Code", "claude"), "CODEX": ("Codex", "codex")}
MAX_MESSAGES = 200
_session = None


def cli_directories():
    """Where agent CLIs and Bun usually live; Blender started from a desktop
    launcher often inherits a PATH without them."""
    home = Path.home()
    found = [home / ".local" / "bin", home / ".claude" / "local", home / ".bun" / "bin",
             home / ".npm-global" / "bin", home / ".volta" / "bin", home / ".cargo" / "bin",
             Path("/opt/homebrew/bin"), Path("/usr/local/bin")]
    if os.environ.get("APPDATA"):
        found.append(Path(os.environ["APPDATA"]) / "npm")
    try:
        found += sorted((home / ".nvm" / "versions" / "node").glob("*/bin"), reverse=True)
    except OSError:
        pass
    return [str(path) for path in found if path.is_dir()]


def search_path():
    current = [entry for entry in os.environ.get("PATH", "").split(os.pathsep) if entry]
    return os.pathsep.join(current + [entry for entry in cli_directories() if entry not in current])


def find_cli(name, override=""):
    if override:
        path = Path(override).expanduser()
        return str(path) if path.is_file() else None
    return shutil.which(name, path=search_path())


def find_plugin(override=""):
    """The plugin folder to load for the agent, when the addon can see one.
    Otherwise the agent uses whatever plugin the user installed in the CLI."""
    candidates = [Path(override).expanduser()] if override else []
    candidates.append(Path(os.path.realpath(__file__)).parent.parent)
    for candidate in candidates:
        if (candidate / ".claude-plugin" / "plugin.json").is_file() and (candidate / "mcp" / "server.ts").is_file():
            return str(candidate)
    return None


def build_command(agent, executable, session_id=None, access="WORKSPACE", model="", plugin=None, blender=""):
    """Arguments for one headless turn. The prompt is always sent on stdin."""
    if agent == "CLAUDE":
        command = [executable, "-p", "--output-format", "stream-json", "--verbose"]
        if plugin:
            command += ["--plugin-dir", plugin]
        if session_id:
            command += ["--resume", session_id]
        if model:
            command += ["--model", model]
        if access == "FULL":
            return command + ["--dangerously-skip-permissions"]
        # Not a sandbox: this limits which commands start, and a Blender
        # script can still do anything Python can.
        rules = ["mcp__plugin_%s_%s" % (PLUGIN, PLUGIN), "Bash(blender *)"]
        if blender:
            rules += ["Bash(%s *)" % blender, 'Bash("%s" *)' % blender]
        return command + ["--permission-mode", "acceptEdits", "--allowedTools"] + rules
    if agent == "CODEX":
        command = [executable, "exec"] + (["resume", session_id] if session_id else [])
        command += ["--json", "--skip-git-repo-check"]
        if model:
            command += ["--model", model]
        if access == "FULL":
            command.append("--dangerously-bypass-approvals-and-sandbox")
        else:
            command += ["-c", 'sandbox_mode="workspace-write"', "-c", 'approval_policy="never"']
        if plugin:
            server = str(Path(plugin) / "mcp" / "server.ts")
            command += ["-c", 'mcp_servers.%s.command="bun"' % PLUGIN,
                        "-c", "mcp_servers.%s.args=%s" % (PLUGIN, json.dumps([server]))]
        return command + ["-"]
    raise ValueError("Unsupported agent.")


def turn_prompt(text, facts):
    """Wrap the user's words with what the agent needs to know about this
    Blender window. Sent every turn because the scene copy is refreshed."""
    lines = ["<blender_agent_studio_panel>",
             "You are running inside the Agent Studio panel of the user's open Blender %s window. "
             "Replies appear in a narrow sidebar: keep them short and plain. Nobody can answer a question "
             "mid-task, so make a reasonable choice and say what you chose." % facts.get("version", ""),
             "- Working folder: %s. Keep sources, renders and scratch files here." % facts["workspace"]]
    if facts.get("blender"):
        lines.append("- Blender executable: %s. Use it for every Blender command; BLENDER_EXECUTABLE is set to it."
                     % facts["blender"])
    selection = "Selected objects: %s. Active object: %s." % (
        ", ".join(facts.get("selected") or []) or "none", facts.get("active") or "none")
    if facts.get("live"):
        lines.append("- Live edits are allowed. Edit the user's open scene (\"%s\", frame %s) directly: write a "
                     "Python script in the working folder and run it with blender_live_run_python, which returns "
                     "what the script printed and a viewport image. Print what you need to learn about the scene. "
                     "%s Work in small steps and look at the image after each. Every run is one undo step, and a "
                     "failed run keeps its partial changes. The script blocks Blender while it runs: keep runs "
                     "short, and never save, open or revert files, quit, change preferences, or delete objects the "
                     "user did not ask you to change. Do not also save a .blend in %s unless asked."
                     % (facts.get("scene", ""), facts.get("frame", ""), selection, facts["results"]))
        return "\n".join(lines + ["</blender_agent_studio_panel>", "", text])
    if facts.get("snapshot"):
        lines.append("- Open scene: a copy of the user's current file was just saved to %s (scene \"%s\", frame %s). "
                     "Read it for context and never write to it. %s"
                     % (facts["snapshot"], facts.get("scene", ""), facts.get("frame", ""), selection))
    else:
        lines.append("- Open scene: not shared for this message.")
    lines.append("- Deliver by saving a .blend in %s. The panel appends that file's objects to the user's open "
                 "scene, so include only new or replacement objects, never a copy of objects they already have. "
                 "You cannot edit the open scene in place: to change an existing object, deliver a replacement "
                 "and name the original the user should hide or delete. When revising something you already "
                 "delivered, overwrite the same file so the panel swaps out the earlier version." % facts["results"])
    lines.append("- Live viewport: %s." % ("connected; blender_open_viewport returns the current viewport image"
                                          if facts.get("viewport") else "not connected"))
    return "\n".join(lines + ["</blender_agent_studio_panel>", "", text])


def short(value, limit=90):
    text = " ".join(str(value).split())
    return text if len(text) <= limit else text[:limit - 1] + "…"


def describe_tool(name, arguments):
    arguments = arguments if isinstance(arguments, dict) else {}
    if name.startswith("mcp__"):
        return name.rsplit("__", 1)[-1]
    detail = (arguments.get("description") or arguments.get("command") or arguments.get("file_path")
              or arguments.get("path") or arguments.get("pattern") or arguments.get("skill") or "")
    return short("%s: %s" % (name, detail) if detail else name)


def parse_event(agent, event):
    """Translate one line of CLI output into (kind, text) updates. Kinds:
    session, agent, tool, error and done. Unknown events are ignored so newer
    CLI versions degrade to a quieter transcript, not a crash."""
    if not isinstance(event, dict):
        return []
    kind, updates = event.get("type"), []
    if agent == "CLAUDE":
        if kind == "system" and event.get("subtype") == "init" and event.get("session_id"):
            updates.append(("session", event["session_id"]))
        elif kind == "assistant":
            for block in (event.get("message") or {}).get("content") or []:
                if block.get("type") == "text" and block.get("text", "").strip():
                    updates.append(("agent", block["text"].strip()))
                elif block.get("type") == "tool_use":
                    updates.append(("tool", describe_tool(block.get("name", "tool"), block.get("input"))))
        elif kind == "result":
            if event.get("session_id"):
                updates.append(("session", event["session_id"]))
            denied = len(event.get("permission_denials") or [])
            if denied:
                updates.append(("error", "%d command%s refused by the access setting. Choose Full access in the "
                                "addon preferences to allow them." % (denied, "" if denied == 1 else "s were")))
            if event.get("is_error"):
                updates.append(("error", short(event.get("result") or event.get("subtype") or "The agent failed.", 400)))
            updates.append(("done", ""))
    elif agent == "CODEX":
        item = event.get("item") or {}
        if kind == "thread.started" and event.get("thread_id"):
            updates.append(("session", event["thread_id"]))
        elif kind == "item.started" and item.get("type") == "command_execution":
            updates.append(("tool", short("Shell: %s" % item.get("command", ""))))
        elif kind == "item.started" and item.get("type") == "mcp_tool_call":
            updates.append(("tool", item.get("tool") or "MCP tool"))
        elif kind == "item.completed" and item.get("type") == "agent_message" and item.get("text", "").strip():
            updates.append(("agent", item["text"].strip()))
        elif kind == "item.completed" and item.get("type") == "file_change":
            paths = [Path(change.get("path", "")).name for change in item.get("changes") or []]
            updates.append(("tool", short("Edit: %s" % ", ".join(paths))))
        elif kind == "item.completed" and item.get("type") == "error":
            updates.append(("error", short(item.get("message", "Error"), 400)))
        elif kind in ("turn.failed", "error"):
            message = (event.get("error") or {}).get("message") if kind == "turn.failed" else event.get("message")
            updates.append(("error", short(message or "The agent failed.", 400)))
        elif kind == "turn.completed":
            updates.append(("done", ""))
    return updates


class AgentSession:
    """One conversation. Threads only move bytes; state changes in poll(),
    which the caller runs on Blender's main thread."""

    def __init__(self, agent, workspace):
        self.agent = agent
        self.workspace = Path(workspace)
        self.results_dir = self.workspace / "results"
        self.results_dir.mkdir(parents=True, exist_ok=True)
        self.messages = []
        self.session_id = None
        self.process = None
        self.events = queue.Queue()
        self.activity = ""
        self.started = 0.0
        self.results = []
        self.stderr = []
        self.stopped = False

    @property
    def running(self):
        return self.process is not None

    def add(self, role, text):
        self.messages.append({"role": role, "text": text})
        del self.messages[:-MAX_MESSAGES]
        try:
            with (self.workspace / "transcript.md").open("a", encoding="utf8") as stream:
                stream.write("**%s**\n\n%s\n\n" % (role, text))
        except OSError:
            pass

    def send(self, command, prompt, shown, environment=None):
        if self.running:
            raise RuntimeError("The agent is still working.")
        options = {"start_new_session": True} if os.name == "posix" else {"creationflags": 0x08000000}
        process = subprocess.Popen(command, cwd=str(self.workspace), env=environment, stdin=subprocess.PIPE,
                                   stdout=subprocess.PIPE, stderr=subprocess.PIPE, **options)
        self.process, self.started, self.activity, self.stderr = process, time.time(), "Starting", []
        self.stopped = False
        self.add("you", shown)

        def read_output():
            try:
                process.stdin.write(prompt.encode("utf8"))
                process.stdin.close()
            except OSError:
                pass
            for line in process.stdout:
                self.events.put(("line", line))
            self.events.put(("exit", process.wait()))

        def read_errors():
            for line in process.stderr:
                self.stderr = (self.stderr + [line.decode("utf8", "replace").strip()])[-5:]

        for target in (read_output, read_errors):
            threading.Thread(target=target, daemon=True).start()

    def poll(self):
        """Apply queued output. Returns True when a turn has just finished."""
        while True:
            try:
                kind, value = self.events.get_nowait()
            except queue.Empty:
                return False
            if kind == "exit":
                if self.stopped:
                    self.add("info", "Stopped.")
                elif value != 0 and not any(m["role"] == "error" for m in self.messages[-3:]):
                    detail = " ".join(line for line in self.stderr if line)
                    self.add("error", short("The agent stopped (exit code %s). %s" % (value, detail), 400))
                self.process, self.activity = None, ""
                self.results = self.find_results()
                return True
            try:
                event = json.loads(value)
            except ValueError:
                continue
            for update, text in parse_event(self.agent, event):
                if update == "session":
                    self.session_id = text
                elif update == "tool":
                    self.activity = text
                    self.add("tool", text)
                elif update in ("agent", "error"):
                    self.activity = "Writing" if update == "agent" else self.activity
                    self.add(update, text)

    def find_results(self):
        """Deliverables written during the turn that just ended, newest first."""
        found = []
        for path in self.results_dir.rglob("*.blend"):
            try:
                modified = path.stat().st_mtime
            except OSError:
                continue
            if modified >= self.started - 1:
                found.append((modified, str(path)))
        return [path for _, path in sorted(found, reverse=True)[:5]]

    def stop(self):
        process = self.process
        if process is None or process.poll() is not None:
            return
        self.stopped = True
        try:
            # End the whole tree: the CLI may have a Blender job running.
            if os.name == "posix":
                os.killpg(process.pid, signal.SIGTERM)
            else:
                subprocess.run(["taskkill", "/PID", str(process.pid), "/T", "/F"],
                               capture_output=True, creationflags=0x08000000)
        except OSError:
            process.terminate()


def preference(name, default=""):
    addon = bpy.context.preferences.addons.get(BAS_Preferences.bl_idname)
    return getattr(addon.preferences, name, default) if addon else default


def first_window():
    """The window whose scene the panel works on; None in background Blender."""
    windows = bpy.context.window_manager.windows
    return windows[0] if windows else None


def save_scene_copy(path):
    """Write the open session to path without changing the user's file,
    filepath or unsaved-changes state."""
    window = first_window()
    with bpy.context.temp_override(**({"window": window} if window else {})):
        bpy.ops.wm.save_as_mainfile(filepath=str(path), copy=True, check_existing=False)


def import_result(path, scene):
    """Append every object in an agent deliverable into a new collection.
    Earlier imports of the same file are hidden, not deleted, so a revision
    never destroys the user's edits to a previous version."""
    path = str(path)
    with bpy.data.libraries.load(path, link=False) as (source, target):
        target.objects = list(source.objects)
    objects = [obj for obj in target.objects if obj is not None]
    if not objects:
        raise ValueError("That file contains no objects.")
    for earlier in bpy.data.collections:
        if earlier.get("bas_agent_source") == path:
            earlier.hide_viewport = earlier.hide_render = True
    collection = bpy.data.collections.new("Agent: " + Path(path).stem)
    collection["bas_agent_source"] = path
    scene.collection.children.link(collection)
    for obj in objects:
        collection.objects.link(obj)
    return collection, len(objects)


def redraw():
    for window in bpy.context.window_manager.windows:
        for area in window.screen.areas:
            if area.type == "VIEW_3D":
                area.tag_redraw()


def new_workspace():
    root = Path(preference("workspace_root") or Path.home() / "blender-agent-studio").expanduser()
    workspace = root / time.strftime("session-%Y%m%d-%H%M%S")
    workspace.mkdir(parents=True, exist_ok=True)
    return workspace


def send_prompt(text, agent, share_scene, live=False):
    """Start one agent turn from the panel. Raises with a user-facing message."""
    global _session
    label, name = AGENTS[agent]
    executable = find_cli(name, preference(name + "_path"))
    if not executable:
        raise RuntimeError("%s was not found. Install the %s CLI, or set its path in the addon preferences."
                           % (label, name))
    if _session is None or _session.agent != agent:
        _session = AgentSession(agent, new_workspace())
    session = _session
    window = first_window() or bpy.context
    if live:
        start()  # Ticking Allow Live Edits is the consent to connect.
    facts = {"version": bpy.app.version_string, "workspace": str(session.workspace), "live": live,
             "results": str(session.results_dir), "blender": bpy.app.binary_path, "viewport": _bridge is not None}
    if live or share_scene:
        layer = window.view_layer
        facts.update(scene=window.scene.name_full, frame=window.scene.frame_current,
                     selected=[obj.name_full for obj in layer.objects if obj.select_get(view_layer=layer)][:50],
                     active=layer.objects.active.name_full if layer.objects.active else None)
    if share_scene and not live:
        snapshot = session.workspace / "scene" / "current.blend"
        snapshot.parent.mkdir(exist_ok=True)
        save_scene_copy(snapshot)
        facts["snapshot"] = str(snapshot)
    environment = dict(os.environ, PATH=search_path())
    if bpy.app.binary_path:
        environment["BLENDER_EXECUTABLE"] = bpy.app.binary_path
    command = build_command(agent, executable, session.session_id, preference("access", "WORKSPACE"),
                            preference(name + "_model"), find_plugin(preference("plugin_root")), bpy.app.binary_path)
    session.send(command, turn_prompt(text, facts), text, environment)
    if not bpy.app.timers.is_registered(agent_tick):
        bpy.app.timers.register(agent_tick, first_interval=0.1, persistent=True)


def agent_tick():
    session = _session
    if session is None:
        return None
    finished = session.poll()
    if finished and session.results and bpy.context.window_manager.bas_auto_import:
        try:
            window = first_window()
            _, count = import_result(session.results[0], (window or bpy.context).scene)
            session.add("info", "Added %d object%s from %s to the scene."
                        % (count, "" if count == 1 else "s", Path(session.results[0]).name))
            if window:
                with bpy.context.temp_override(window=window):
                    bpy.ops.ed.undo_push(message="Add agent result")
        except Exception as error:
            session.add("error", "Could not add the result: %s" % error)
    redraw()
    return 0.2 if session.running else None


class BAS_Preferences(bpy.types.AddonPreferences):
    bl_idname = __package__ or __name__
    access: bpy.props.EnumProperty(name="Agent access", default="WORKSPACE", items=[
        ("WORKSPACE", "Session folder", "The agent edits files in its session folder and runs Blender and the "
         "plugin's tools. Claude Code refuses other shell commands; Codex uses its workspace sandbox"),
        ("FULL", "Full access", "The agent runs any command without asking and without a sandbox. "
         "Use only for prompts and files you trust")])
    claude_path: bpy.props.StringProperty(name="Claude Code CLI", subtype="FILE_PATH",
                                          description="Leave empty to find claude automatically")
    claude_model: bpy.props.StringProperty(name="Claude model", description="Leave empty for the CLI's default")
    codex_path: bpy.props.StringProperty(name="Codex CLI", subtype="FILE_PATH",
                                         description="Leave empty to find codex automatically")
    codex_model: bpy.props.StringProperty(name="Codex model", description="Leave empty for the CLI's default")
    plugin_root: bpy.props.StringProperty(
        name="Plugin folder", subtype="DIR_PATH",
        description="plugins/blender-agent-studio in a checkout. Leave empty to use the plugin installed in the CLI")
    workspace_root: bpy.props.StringProperty(
        name="Sessions folder", subtype="DIR_PATH",
        description="Where each chat keeps its sources, renders and results. Empty uses ~/blender-agent-studio")

    def draw(self, context):
        column = self.layout.column()
        column.use_property_split = True
        for name in ("access", "claude_path", "claude_model", "codex_path", "codex_model",
                     "plugin_root", "workspace_root"):
            column.prop(self, name)


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


class BAS_OT_agent_send(bpy.types.Operator):
    bl_idname = "bas.agent_send"
    bl_label = "Send"
    bl_description = "Send the prompt to the agent"
    def execute(self, context):
        manager = context.window_manager
        text = manager.bas_prompt.strip()
        if not text:
            self.report({"WARNING"}, "Type a request first.")
            return {"CANCELLED"}
        try:
            send_prompt(text, manager.bas_agent, manager.bas_share_scene, manager.bas_live_edits)
        except Exception as error:
            self.report({"ERROR"}, str(error))
            return {"CANCELLED"}
        manager.bas_prompt = ""
        return {"FINISHED"}


class BAS_OT_agent_stop(bpy.types.Operator):
    bl_idname = "bas.agent_stop"
    bl_label = "Stop"
    bl_description = "Stop the agent and any Blender job it started"
    def execute(self, context):
        if _session:
            _session.stop()
        return {"FINISHED"}


class BAS_OT_agent_reset(bpy.types.Operator):
    bl_idname = "bas.agent_reset"
    bl_label = "New Chat"
    bl_description = "Start a new conversation in a new session folder. Earlier folders are kept"
    def execute(self, context):
        global _session
        if _session:
            _session.stop()
        _session = None
        return {"FINISHED"}


class BAS_OT_agent_import(bpy.types.Operator):
    bl_idname = "bas.agent_import"
    bl_label = "Add to Scene"
    bl_description = "Append this result's objects to the scene in a new collection"
    bl_options = {"UNDO"}
    filepath: bpy.props.StringProperty(options={"HIDDEN", "SKIP_SAVE"})
    def execute(self, context):
        try:
            _, count = import_result(self.filepath, context.scene)
        except Exception as error:
            self.report({"ERROR"}, str(error))
            return {"CANCELLED"}
        self.report({"INFO"}, "Added %d object%s." % (count, "" if count == 1 else "s"))
        return {"FINISHED"}


class BAS_OT_agent_folder(bpy.types.Operator):
    bl_idname = "bas.agent_folder"
    bl_label = "Open Session Folder"
    bl_description = "Show this chat's sources, renders, results and transcript"
    def execute(self, context):
        if _session:
            bpy.ops.wm.path_open(filepath=str(_session.workspace))
        return {"FINISHED"}


class BAS_PT_agent(bpy.types.Panel):
    bl_label = "Agent"
    bl_idname = "BAS_PT_agent"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "Agent Studio"

    def draw(self, context):
        layout, manager, session = self.layout, context.window_manager, _session
        running = bool(session and session.running)
        row = layout.row()
        row.enabled = not running
        row.prop(manager, "bas_agent", text="")
        if session and session.messages:
            width = max(24, int(context.region.width / (6.5 * context.preferences.system.ui_scale)) - 4)
            prefixes = {"you": "You: ", "tool": "• ", "error": "Error: ", "info": ""}
            lines = []
            for message in session.messages[-30:]:
                text = prefixes.get(message["role"], "") + message["text"]
                for paragraph in text.splitlines():
                    lines += textwrap.wrap(paragraph, width) or [""]
                lines.append("")
            column = layout.box().column(align=True)
            column.scale_y = 0.75
            for line in lines[-45:-1]:
                column.label(text=line)
        if running:
            row = layout.row()
            row.label(text="%s (%ds)" % (short(session.activity or "Working", 40), time.time() - session.started))
            row.operator("bas.agent_stop", text="", icon="CANCEL")
        else:
            layout.prop(manager, "bas_prompt", text="")
            row = layout.row(align=True)
            row.operator("bas.agent_send", icon="PLAY")
            if session:
                row.operator("bas.agent_reset", text="", icon="FILE_NEW")
        column = layout.column(align=True)
        column.prop(manager, "bas_live_edits")
        row = column.row()
        row.enabled = not manager.bas_live_edits
        row.prop(manager, "bas_share_scene")
        column.prop(manager, "bas_auto_import")
        if session and not running:
            for path in session.results:
                layout.operator("bas.agent_import", text="Add %s" % Path(path).name, icon="APPEND_BLEND").filepath = path
        if session:
            layout.operator("bas.agent_folder", icon="FILE_FOLDER")


class BAS_PT_live(bpy.types.Panel):
    bl_label = "Viewport Sharing"
    bl_idname = "BAS_PT_live"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "Agent Studio"
    def draw(self, context):
        self.layout.label(text="Viewport connected" if _bridge else "Share your viewport with your agent")
        self.layout.operator("bas.live_stop" if _bridge else "bas.live_start")


_classes = (BAS_Preferences, BAS_OT_live_start, BAS_OT_live_stop, BAS_OT_agent_send, BAS_OT_agent_stop,
            BAS_OT_agent_reset, BAS_OT_agent_import, BAS_OT_agent_folder, BAS_PT_agent, BAS_PT_live)
_handlers = (bpy.app.handlers.depsgraph_update_post, bpy.app.handlers.load_post,
             bpy.app.handlers.undo_post, bpy.app.handlers.redo_post)
_properties = {
    "bas_agent": lambda: bpy.props.EnumProperty(
        name="Agent", description="Which installed agent CLI answers. Switching starts a new chat",
        items=[(key, label, "Use the %s CLI" % name) for key, (label, name) in AGENTS.items()]),
    "bas_prompt": lambda: bpy.props.StringProperty(
        name="Request", description="What to build or change", options={"SKIP_SAVE"}),
    "bas_live_edits": lambda: bpy.props.BoolProperty(
        name="Allow Live Edits", default=False, options={"SKIP_SAVE"},
        description="Let the agent run its Python scripts in this open scene instead of working on a copy. "
                    "Each run is one undo step and blocks Blender until it ends. Off again when Blender restarts. "
                    "Save first: a script can change or delete anything"),
    "bas_share_scene": lambda: bpy.props.BoolProperty(
        name="Share Open Scene", default=True,
        description="Save a copy of the open file to the session folder with each message, so the agent can "
                    "read your scene and selection. Your file is not modified"),
    "bas_auto_import": lambda: bpy.props.BoolProperty(
        name="Add Results to Scene", default=True,
        description="When the agent finishes, append its result to the scene in a new collection. An earlier "
                    "version of the same result is hidden, not deleted"),
}


def stop_agent():
    # Also runs at exit: a quitting Blender must not leave an agent building.
    if _session:
        _session.stop()


def register():
    atexit.register(stop_agent)
    for cls in _classes:
        bpy.utils.register_class(cls)
    for name, make in _properties.items():
        setattr(bpy.types.WindowManager, name, make())
    for handlers in _handlers:
        handlers.append(changed)


def unregister():
    global _session
    stop()
    stop_agent()
    atexit.unregister(stop_agent)
    _session = None
    if bpy.app.timers.is_registered(agent_tick):
        bpy.app.timers.unregister(agent_tick)
    for handlers in _handlers:
        if changed in handlers:
            handlers.remove(changed)
    for name in _properties:
        if hasattr(bpy.types.WindowManager, name):
            delattr(bpy.types.WindowManager, name)
    for cls in reversed(_classes):
        bpy.utils.unregister_class(cls)


if __name__ == "__main__":
    register()
