# Live viewport

Blender Agent Studio can show an open Blender session inside an MCP Apps host.
It shares unsaved scene state, refreshes changed views, and lets you attach an
object and viewport reference to your next message. The ordinary batch tools
continue to work without the addon or a Blender window.

## Connect

1. In Blender 4.5 or newer, open **Edit → Preferences → Add-ons → Install from
   Disk** and select `plugins/blender-agent-studio/addon/blender_agent_studio_live.py`
   from the checkout (or `addon/blender_agent_studio_live.py` in the installed plugin).
2. Enable **Blender Agent Studio Live**. Open a 3D Viewport, press **N**, choose
   **Agent Studio**, then **Connect Agent Studio**. Connection starts only when
   you press this button; enabling the addon does not start a server.
3. Start a fresh agent chat after updating the plugin, then ask **Open the
   Blender live viewport** (`blender_open_viewport`). Hosts supporting thread
   app entrypoints can also open the panel directly.

The panel works in hosts supporting MCP Apps. Other hosts receive the tool's
current PNG and scene details, without interactive controls. The Codex and
Claude Code packages use the same MCP server; inline rendering depends on the
host, not on which package was installed.

## Use the panel

- Drag on the canvas to orbit; middle-drag also works. Hold **Shift** while
  dragging to pan. Scroll to zoom. Small clicks identify objects; dragging
  never attaches an object reference.
- Focus the canvas for keyboard navigation: **arrow keys** orbit, **+ / −**
  zoom, **F / Home** fit the scene, and **1 / 3 / 7** show front/right/top
  (hold **Ctrl** for the opposite view). **Esc** removes an attached reference.
- The panel stays connected and checks for updates automatically. When Blender
  is temporarily unavailable, the last image dims and the panel retries with
  a bounded backoff; it resumes as soon as the same session responds.
- **Fit scene** frames the scene. **Attach view** captures a reference for your
  next message. Attached context stays fixed while the live viewport continues
  updating; navigation does not remove the reference.
- Click a surface or choose an entry in **Scene objects** to attach its exact
  name, session-local ID, file, scene, frame and capture revision. Image context
  is included when the host advertises support. This does not send a message
  or change Blender's object selection.
- **Remove reference** or **Esc** clears the attached context. The marker is
  hidden when the live capture changes so it cannot point at the wrong surface.
- **Copy name** is available when a host cannot accept context. **Expand** is
  shown only when the host supports fullscreen apps.

Old captures cannot pick against a changed scene. Automatic updates observe editing,
loading a file, switching frames and undoing. If another Blender instance takes
over the connection, reopen the panel explicitly. Object IDs are session-local;
they are not persistent SceneIR IDs and must not be reused across restarts.

## Scope and limits

Captures are capped at a 1280-pixel maximum edge (1000 by default), and the
object list contains the first 250 visible objects alphabetically. Picking
uses the nearest evaluated mesh surface. For lights, cameras, empties, or
ambiguous transparent/wireframe views, use the object list. Picking does not
identify editable vertex/face indices or individual Geometry Nodes instances.
The first available 3D Viewport is used. Rendered viewport shading is refused;
use Solid or Material Preview. A GPU context and an interactive Blender session
are required. A capture is not a beauty render or final quality validation.

The addon accepts only snapshot, identification and bounded view-navigation
commands. It listens on an ephemeral **127.0.0.1** port, authenticates requests
with a random per-session token, and performs all Blender work on the main
thread through a nonblocking timer. No arbitrary Python execution, asset
downloads, telemetry or remote-host access are added. Disconnect from Blender
to stop the bridge and remove its connection descriptor.

By default the connection descriptor is `blender-agent-studio/viewport.json`
under the operating system's temporary directory. For multiple Blender
instances, set `BAS_VIEWPORT_CONNECTION` to a distinct absolute JSON path in
both the Blender process and the MCP host before starting them. The most recent
explicitly connected instance owns the default descriptor; existing panels
reject switching sessions. Do not commit or share this descriptor: it contains
the local session token. Transport timeouts bound waiting, not GPU execution;
an expensive Material Preview can still block Blender until the draw finishes.

The capture/picking implementation is inspired by
[MCP for Blender](https://github.com/ahujasid/mcp-for-blender). Its MIT notice is
included in `addon/LICENSE.txt`. The Studio MCP, panel and bounded transport
are maintained here; the upstream MCP is not a runtime dependency.
