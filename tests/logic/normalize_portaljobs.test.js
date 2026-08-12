const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizePortalJobsItem } = require('../../n8n/logic/normalize_portaljobs.js');

test('maps the common fields and buckets languages/salary into raw_extra', () => {
  const raw = {
    id: 'pj-42',
    jobTitle: 'Data Analyst',
    employerName: 'Exemple SA',
    jobUrl: 'https://portal.jobs/vacancy/pj-42',
    city: 'Neuchâtel',
    publishedAt: '2026-08-09T10:00:00Z',
    languages: ['FR', 'EN'],
    salaryRange: '80000-95000',
  };
  const result = normalizePortalJobsItem(raw);
  assert.deepEqual(result, {
    source: 'portal.jobs',
    source_id: 'pj-42',
    title: 'Data Analyst',
    company: 'Exemple SA',
    url: 'https://portal.jobs/vacancy/pj-42',
    location: 'Neuchâtel',
    posted_at: '2026-08-09',
    raw_extra: {
      languages: ['FR', 'EN'],
      salary_range: '80000-95000',
    },
  });
});

test('handles missing optional fields as null', () => {
  const raw = {
    id: 'pj-1', jobTitle: 'T', employerName: null, jobUrl: 'https://x',
    city: null, publishedAt: '2026-08-09T10:00:00Z', languages: null, salaryRange: null,
  };
  const result = normalizePortalJobsItem(raw);
  assert.equal(result.company, null);
  assert.deepEqual(result.raw_extra, { languages: null, salary_range: null });
});
