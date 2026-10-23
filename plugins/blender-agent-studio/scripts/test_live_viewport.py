"""Exercise the addon's filesystem and wire protocol without a GPU or Blender."""
import importlib.util
import json
import os
from pathlib import Path
import socket
import stat
import sys
import tempfile
import time
from types import SimpleNamespace
import unittest
from unittest.mock import patch


def load_addon():
    handlers = SimpleNamespace(persistent=lambda fn: fn, depsgraph_update_post=[],
                               load_post=[], undo_post=[], redo_post=[])
    bpy = SimpleNamespace(types=SimpleNamespace(Operator=object, Panel=object),
                          app=SimpleNamespace(handlers=handlers))
    source = Path(__file__).resolve().parents[1] / 'addon' / 'blender_agent_studio_live.py'
    spec = importlib.util.spec_from_file_location('bas_protocol_test', source)
    addon = importlib.util.module_from_spec(spec)
    with patch.dict(sys.modules, {'bpy': bpy, 'bpy.app': bpy.app,
                                 'bpy.app.handlers': handlers,
                                 'mathutils': SimpleNamespace(Vector=object)}):
        spec.loader.exec_module(addon)
    return addon


class LiveViewportProtocolTests(unittest.TestCase):
    def setUp(self):
        self.addon = load_addon()
        self.temp = tempfile.TemporaryDirectory(prefix='bas-protocol-')
        self.root = Path(self.temp.name)
        self.env = patch.dict(os.environ, {'BAS_VIEWPORT_CONNECTION': ''})
        self.env.start()
        self.temp_root = patch.object(self.addon.tempfile, 'gettempdir', return_value=str(self.root))
        self.temp_root.start()

    def tearDown(self):
        self.temp_root.stop()
        self.env.stop()
        self.temp.cleanup()

    def test_default_directory_is_private_when_created(self):
        bridge = self.addon.Bridge()
        try:
            self.assertTrue(bridge.path.is_file())
            if os.name == 'posix':
                self.assertEqual(stat.S_IMODE(bridge.path.parent.stat().st_mode), 0o700)
        finally:
            bridge.close()

    def test_unsafe_default_directory_is_rejected_and_socket_closed(self):
        directory = self.root / 'blender-agent-studio'
        directory.mkdir()
        for uid, mode in [(43, stat.S_IFDIR | 0o700),
                          (42, stat.S_IFDIR | 0o770),
                          (42, stat.S_IFDIR | 0o707),
                          (42, stat.S_IFLNK | 0o777)]:
            with self.subTest(uid=uid, mode=mode):
                sock = socket.socket()
                with patch.object(self.addon.os, 'getuid', return_value=42, create=True), \
                     patch.object(Path, 'lstat', return_value=SimpleNamespace(st_uid=uid, st_mode=mode)), \
                     patch.object(self.addon.socket, 'socket', return_value=sock):
                    try:
                        with self.assertRaises(PermissionError):
                            self.addon.Bridge()
                        self.assertEqual(sock.fileno(), -1)
                        self.assertFalse((directory / 'viewport.json').exists())
                    finally:
                        sock.close()

    def test_custom_directory_keeps_existing_permission_policy(self):
        custom = self.root / 'custom' / 'viewport.json'
        with patch.dict(os.environ, {'BAS_VIEWPORT_CONNECTION': str(custom)}), \
             patch.object(self.addon.os, 'getuid', side_effect=AssertionError('Custom ownership checked'), create=True):
            bridge = self.addon.Bridge()
            try:
                self.assertEqual(bridge.path, custom)
                self.assertTrue(custom.is_file())
            finally:
                bridge.close()

    def exchange(self, bridge):
        with socket.create_connection(bridge.server.getsockname(), timeout=2) as client:
            client.sendall(json.dumps({'protocol': 1, 'token': bridge.token,
                                      'command': 'snapshot'}).encode() + b'\n')
            client.setblocking(False)
            data = b''
            deadline = time.monotonic() + 2
            while b'\n' not in data and time.monotonic() < deadline:
                bridge.tick()
                try:
                    chunk = client.recv(16384)
                    if not chunk:
                        break
                    data += chunk
                except BlockingIOError:
                    time.sleep(0.001)
            self.assertTrue(data.endswith(b'\n'), 'Request closed without a newline-delimited reply')
            return json.loads(data)

    def test_nonfinite_reply_returns_error_and_next_request_recovers(self):
        bridge = self.addon.Bridge()
        try:
            for value in (float('nan'), float('inf'), -float('inf')):
                with self.subTest(value=value), patch.object(bridge, 'dispatch', return_value={'location': [value]}):
                    reply = self.exchange(bridge)
                    self.assertFalse(reply['ok'])
                    self.assertIn('Out of range float', reply['error'])
            with patch.object(bridge, 'dispatch', return_value={'location': [0.0]}):
                self.assertEqual(self.exchange(bridge), {'ok': True, 'result': {'location': [0.0]}})
        finally:
            bridge.close()


if __name__ == '__main__':
    unittest.main()
