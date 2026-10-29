import test from 'node:test';
import assert from 'node:assert/strict';
import { createSseParser, toolProgressLabel } from '../src/lib/agentStream.ts';

const collect = () => {
  const events: Array<[string, unknown]> = [];
  const parser = createSseParser((e, d) => events.push([e, d]));
  return { events, parser };
};

test('parses CRLF events as emitted by sse-starlette', () => {
  const { events, parser } = collect();
  parser.push('event: text_delta\r\ndata: {"text":"Hi","iteration":0}\r\n\r\n');
  parser.push('event: final\r\ndata: {"reply":"Hi"}\r\n\r\n');
  assert.deepEqual(events, [
    ['text_delta', { text: 'Hi', iteration: 0 }],
    ['final', { reply: 'Hi' }],
  ]);
});

test('handles events split across chunk boundaries', () => {
  const { events, parser } = collect();
  parser.push('event: tool_st');
  parser.push('art\r\ndata: {"name":"run_');
  parser.push('scenario","iteration":1}\r');
  parser.push('\n\r\n');
  assert.deepEqual(events, [['tool_start', { name: 'run_scenario', iteration: 1 }]]);
});

test('ignores keep-alive ping comments', () => {
  const { events, parser } = collect();
  parser.push(': ping - 2026-10-23 10:00:00\r\n\r\n');
  parser.push('event: final\r\ndata: {"reply":"ok"}\r\n\r\n');
  assert.deepEqual(events, [['final', { reply: 'ok' }]]);
});

test('joins multi-line data fields', () => {
  const { events, parser } = collect();
  parser.push('event: note\ndata: line1\ndata: line2\n\n');
  assert.deepEqual(events, [['note', 'line1\nline2']]);
});

test('flush dispatches a final event without trailing blank line', () => {
  const { events, parser } = collect();
  parser.push('event: final\ndata: {"reply":"done"}');
  assert.equal(events.length, 0);
  parser.flush();
  assert.deepEqual(events, [['final', { reply: 'done' }]]);
});

test('event without event: line defaults to message', () => {
  const { events, parser } = collect();
  parser.push('data: {"a":1}\n\n');
  assert.deepEqual(events, [['message', { a: 1 }]]);
});

test('toolProgressLabel never exposes raw tool names', () => {
  assert.equal(toolProgressLabel('run_full_pipeline'), 'Building the world model…');
  assert.equal(toolProgressLabel('some_new_tool'), 'Working on it…');
});
