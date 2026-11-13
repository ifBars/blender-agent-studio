"""Exercise the in-Blender agent panel's CLI launcher without Blender or a real agent."""
import json
import os
from pathlib import Path
import sys
import tempfile
import time
import unittest

from test_live_viewport import load_addon

FAKE_CLI = '''
import json, pathlib, sys, time
prompt = sys.stdin.read()
mode = sys.argv[1]
def emit(event):
    print(json.dumps(event), flush=True)
emit({"type": "system", "subtype": "init", "session_id": "abc"})
print("not json", flush=True)
emit({"type": "assistant", "message": {"content": [
    {"type": "tool_use", "name": "Bash", "input": {"command": "blender --background --python build.py"}}]}})
if mode == "hang":
    time.sleep(60)
if mode == "crash":
    sys.stderr.write("login required\\n")
    sys.exit(3)
pathlib.Path("results/lamp.blend").write_bytes(b"BLENDER")
emit({"type": "assistant", "message": {"content": [{"type": "text", "text": "Echo: " + prompt.splitlines()[-1]}]}})
emit({"type": "result", "subtype": "success", "is_error": False, "session_id": "abc", "permission_denials": [{}]})
'''


class CommandTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.addon = load_addon()

    def test_claude_default_access_allows_only_plugin_tools_and_blender(self):
        command = self.addon.build_command('CLAUDE', 'claude', plugin='/p', blender='/opt/Blender 5/blender')
        self.assertEqual(command[:7], ['claude', '-p', '--output-format', 'stream-json', '--verbose', '--plugin-dir', '/p'])
        self.assertNotIn('--dangerously-skip-permissions', command)
        rules = command[command.index('--allowedTools') + 1:]
        self.assertEqual(rules, ['mcp__plugin_blender-agent-studio_blender-agent-studio', 'Bash(blender *)',
                                 'Bash(/opt/Blender 5/blender *)', 'Bash("/opt/Blender 5/blender" *)'])
        self.assertEqual(command[command.index('--permission-mode') + 1], 'acceptEdits')

    def test_claude_resume_model_and_full_access(self):
        command = self.addon.build_command('CLAUDE', 'claude', session_id='s1', access='FULL', model='opus')
        self.assertEqual(command[5:], ['--resume', 's1', '--model', 'opus', '--dangerously-skip-permissions'])

    def test_codex_uses_workspace_sandbox_and_reads_prompt_from_stdin(self):
        command = self.addon.build_command('CODEX', 'codex', plugin='C:\\plugin')
        self.assertEqual(command[:4], ['codex', 'exec', '--json', '--skip-git-repo-check'])
        self.assertIn('sandbox_mode="workspace-write"', command)
        self.assertIn('approval_policy="never"', command)
        server = json.dumps([str(Path('C:\\plugin') / 'mcp' / 'server.ts')])
        self.assertIn('mcp_servers.blender-agent-studio.args=' + server, command)
        self.assertEqual(command[-1], '-')

    def test_codex_resume_and_full_access(self):
        command = self.addon.build_command('CODEX', 'codex', session_id='t1', access='FULL')
        self.assertEqual(command, ['codex', 'exec', 'resume', 't1', '--json', '--skip-git-repo-check',
                                   '--dangerously-bypass-approvals-and-sandbox', '-'])

    def test_unknown_agent_is_rejected(self):
        with self.assertRaises(ValueError):
            self.addon.build_command('OTHER', 'x')

    def test_prompt_states_delivery_contract_and_ends_with_the_request(self):
        facts = {'version': '5.2', 'workspace': '/w', 'results': '/w/results', 'blender': '/b',
                 'snapshot': '/w/scene/current.blend', 'scene': 'Scene', 'frame': 1,
                 'selected': ['Cube'], 'active': 'Cube', 'viewport': False}
        prompt = self.addon.turn_prompt('make a lamp', facts)
        self.assertTrue(prompt.endswith('\n\nmake a lamp'))
        for expected in ('/w/scene/current.blend', 'Selected objects: Cube', 'never write to it',
                         'saving a .blend in /w/results', 'Live viewport: not connected'):
            self.assertIn(expected, prompt)
        unshared = self.addon.turn_prompt('x', {'workspace': '/w', 'results': '/w/results'})
        self.assertIn('Open scene: not shared', unshared)

    def test_find_cli_honors_override_and_reports_missing(self):
        with tempfile.TemporaryDirectory() as root:
            tool = Path(root) / 'claude'
            tool.write_text('')
            self.assertEqual(self.addon.find_cli('claude', str(tool)), str(tool))
            self.assertIsNone(self.addon.find_cli('claude', str(Path(root) / 'missing')))

    def test_plugin_is_found_from_the_checkout(self):
        root = Path(self.addon.find_plugin())
        self.assertTrue((root / 'mcp' / 'server.ts').is_file())
        self.assertIsNone(None if self.addon.find_plugin('/nonexistent') else 1)


class EventTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.addon = load_addon()

    def test_claude_events(self):
        parse = self.addon.parse_event
        self.assertEqual(parse('CLAUDE', {'type': 'system', 'subtype': 'init', 'session_id': 's'}), [('session', 's')])
        self.assertEqual(parse('CLAUDE', {'type': 'assistant', 'message': {'content': [
            {'type': 'text', 'text': ' Done. '},
            {'type': 'tool_use', 'name': 'mcp__plugin_x_y__blender_render_scene', 'input': {}},
            {'type': 'tool_use', 'name': 'Write', 'input': {'file_path': '/w/build.py'}}]}}),
            [('agent', 'Done.'), ('tool', 'blender_render_scene'), ('tool', 'Write: /w/build.py')])
        failed = parse('CLAUDE', {'type': 'result', 'is_error': True, 'subtype': 'error_max_turns',
                                  'permission_denials': [{}, {}]})
        self.assertEqual([kind for kind, _ in failed], ['error', 'error', 'done'])
        self.assertIn('2 commands were refused', failed[0][1])
        self.assertEqual(failed[1][1], 'error_max_turns')

    def test_codex_events(self):
        parse = self.addon.parse_event
        self.assertEqual(parse('CODEX', {'type': 'thread.started', 'thread_id': 't'}), [('session', 't')])
        self.assertEqual(parse('CODEX', {'type': 'item.started', 'item': {'type': 'command_execution', 'command': 'ls'}}),
                         [('tool', 'Shell: ls')])
        self.assertEqual(parse('CODEX', {'type': 'item.completed', 'item': {'type': 'agent_message', 'text': 'Hi'}}),
                         [('agent', 'Hi')])
        self.assertEqual(parse('CODEX', {'type': 'item.completed', 'item': {'type': 'reasoning', 'text': 'x'}}), [])
        self.assertEqual(parse('CODEX', {'type': 'turn.failed', 'error': {'message': 'quota'}}), [('error', 'quota')])
        self.assertEqual(parse('CODEX', {'type': 'turn.completed', 'usage': {}}), [('done', '')])

    def test_unknown_or_malformed_events_are_ignored(self):
        for event in (None, [], 'text', {}, {'type': 'future.event'}, {'type': 'assistant'}):
            for agent in ('CLAUDE', 'CODEX'):
                self.assertEqual(self.addon.parse_event(agent, event), [])


class SessionTests(unittest.TestCase):
    def setUp(self):
        self.addon = load_addon()
        self.temp = tempfile.TemporaryDirectory(prefix='bas-agent-')
        self.cli = Path(self.temp.name) / 'fake_cli.py'
        self.cli.write_text(FAKE_CLI)
        self.session = self.addon.AgentSession('CLAUDE', Path(self.temp.name) / 'workspace')

    def tearDown(self):
        self.session.stop()
        self.wait(lambda: not self.session.running)
        self.temp.cleanup()

    def wait(self, condition, seconds=20):
        deadline = time.monotonic() + seconds
        while time.monotonic() < deadline:
            self.session.poll()
            if condition():
                return
            time.sleep(0.01)
        self.fail('Timed out; messages: %r' % self.session.messages)

    def run_turn(self, mode, text='make a lamp'):
        self.session.send([sys.executable, str(self.cli), mode], 'context\n\n' + text, text)

    def test_turn_streams_messages_and_finds_the_result(self):
        self.run_turn('ok')
        with self.assertRaises(RuntimeError):
            self.run_turn('ok')
        self.wait(lambda: not self.session.running)
        self.assertEqual(self.session.session_id, 'abc')
        self.assertEqual([(m['role'], m['text']) for m in self.session.messages], [
            ('you', 'make a lamp'), ('tool', 'Bash: blender --background --python build.py'),
            ('agent', 'Echo: make a lamp'),
            ('error', '1 command refused by the access setting. Choose Full access in the addon preferences to allow them.')])
        self.assertEqual(self.session.results, [str(self.session.results_dir / 'lamp.blend')])
        self.assertIn('Echo: make a lamp', (self.session.workspace / 'transcript.md').read_text())

    def test_results_from_earlier_turns_are_not_offered_again(self):
        self.run_turn('ok')
        self.wait(lambda: not self.session.running)
        old = time.time() - 60
        os.utime(self.session.results[0], (old, old))
        self.run_turn('crash')
        self.wait(lambda: not self.session.running)
        self.assertEqual(self.session.results, [])

    def test_crash_reports_exit_code_and_stderr(self):
        self.run_turn('crash')
        self.wait(lambda: not self.session.running)
        self.assertEqual(self.session.messages[-1],
                         {'role': 'error', 'text': 'The agent stopped (exit code 3). login required'})

    def test_stop_ends_a_running_turn(self):
        self.run_turn('hang')
        self.wait(lambda: self.session.activity.startswith('Bash'))
        self.session.stop()
        self.wait(lambda: not self.session.running, seconds=10)
        self.assertEqual(self.session.messages[-1], {'role': 'info', 'text': 'Stopped.'})

    def test_missing_executable_raises_and_leaves_session_idle(self):
        with self.assertRaises(OSError):
            self.session.send([str(Path(self.temp.name) / 'missing')], 'x', 'x')
        self.assertFalse(self.session.running)
        self.assertEqual(self.session.messages, [])


if __name__ == '__main__':
    unittest.main()
