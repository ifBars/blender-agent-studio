"""Run in a clean background Blender to check bridge lifecycle and protocol."""
import importlib.util
import json
import os
from pathlib import Path
import struct
import sys
import zlib

out = Path(sys.argv[sys.argv.index('--') + 1])
os.environ['BAS_VIEWPORT_CONNECTION'] = str(out / 'connection.json')
source = Path(__file__).resolve().parents[1] / 'addon' / 'blender_agent_studio_live.py'
spec = importlib.util.spec_from_file_location('bas_contract', source)
addon = importlib.util.module_from_spec(spec)
spec.loader.exec_module(addon)

addon.register()
assert not addon.connection_path().exists(), 'Enabling the addon must not start the server'
addon.start()
first = addon._bridge
descriptor = json.loads(addon.connection_path().read_text())
assert descriptor['sessionId'] == first.session
assert first.server.getsockname()[0] == '127.0.0.1'
for request, expected in [
    ({'protocol': 1, 'token': 'wrong', 'command': 'snapshot'}, 'authentication'),
    ({'protocol': 1, 'token': first.token, 'command': 'execute_code'}, 'Unsupported'),
    ({'protocol': 1, 'token': first.token, 'command': 'pick', 'params': {'sessionId': 'other'}}, 'different Blender session'),
    ({'protocol': 1, 'token': first.token, 'command': 'pick', 'params': {'seq': 1}}, 'expired'),
]:
    try:
        first.dispatch(request)
        raise AssertionError('Invalid request accepted')
    except ValueError as error:
        assert expected in str(error), str(error)

# Validate real PNG scanline ordering; a screenshot must not be vertically flipped.
bottom = bytes([255, 0, 0, 255] * 2)
top = bytes([0, 255, 0, 255] * 2)
png = addon.png_bytes(2, 2, bottom + top)
assert png[:8] == b'\x89PNG\r\n\x1a\n'
offset = 8
while offset < len(png):
    length = struct.unpack('>I', png[offset:offset + 4])[0]
    kind = png[offset + 4:offset + 8]
    data = png[offset + 8:offset + 8 + length]
    if kind == b'IDAT':
        assert zlib.decompress(data) == b'\0' + top + b'\0' + bottom
    offset += length + 12

# Disconnecting an older instance must not remove a newer connection descriptor.
second = addon.Bridge()
first.close()
assert json.loads(addon.connection_path().read_text())['sessionId'] == second.session
second.close()
addon.unregister()
assert not addon.connection_path().exists()
(out / 'contract.json').write_text(json.dumps({'protocol': True, 'png': True, 'lifecycle': True}))
