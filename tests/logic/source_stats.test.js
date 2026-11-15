const test = require('node:test');
const assert = require('node:assert/strict');
const { KNOWN_SOURCES, computeSourceStats } = require('../../n8n/logic/source_stats.js');

const offer = source => ({ json: { source, title: 't' } });

test('counts raw and kept offers per source', () => {
  const merged = [offer('jobup.ch'), offer('jobup.ch'), offer('jobs.ch')];
  const kept = [offer('jobup.ch')];
  const rows = Object.fromEntries(computeSourceStats(merged, kept, '2026-11-13').map(r => [r.source, r]));
  assert.deepEqual(rows['jobup.ch'], { run_date: '2026-11-13', source: 'jobup.ch', raw_count: 2, kept_count: 1, error_count: 0 });
  assert.equal(rows['jobs.ch'].raw_count, 1);
});

test('a known source absent from the merge is recorded at 0', () => {
  const rows = computeSourceStats([offer('jobs.ch')], [], '2026-11-13');
  assert.equal(rows.length, KNOWN_SOURCES.length);
  assert.equal(rows.find(r => r.source === 'indeed.ch').raw_count, 0);
});

test('error markers count as failed requests on the right source, not as offers', () => {
  const merged = [{ json: { __sourceError: true, source: 'Indeed', failed: 3, total: 3, message: 'x' } },
                  { json: { __sourceError: true, source: 'CERN', message: 'x' } }];
  const rows = Object.fromEntries(computeSourceStats(merged, [], '2026-11-13').map(r => [r.source, r]));
  assert.equal(rows['indeed.ch'].error_count, 3);
  assert.equal(rows['indeed.ch'].raw_count, 0);
  assert.equal(rows['cern.ch'].error_count, 1);
});
