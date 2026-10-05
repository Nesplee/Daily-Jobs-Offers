const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeSwissDevJobsItem } = require('../../n8n/logic/normalize_swissdevjobs.js');

// Champs relevés sur https://swissdevjobs.ch/api/jobsLight le 05.10.2026.
const sample = {
  _id: '6ac01f3656e6472ebe2d6377',
  name: 'Data Engineer Intern – Data Delivery Optimization',
  company: 'Lombard Odier',
  actualCity: 'Geneva',
  cityCategory: 'Geneva',
  jobUrl: 'Lombard-Odier-Data-Engineer-Intern',
  activeFrom: '2026-10-02T00:00:00.000+02:00',
  workplace: 'hybrid',
  jobType: 'Internship',
  expLevel: 'Junior',
  annualSalaryFrom: 100000,
  annualSalaryTo: 130000,
  language: 'English',
  filterTags: ['Python', 'SQL', 'Cloud'],
};

test('maps the shared columns', () => {
  const out = normalizeSwissDevJobsItem(sample);
  assert.equal(out.source, 'swissdevjobs.ch');
  assert.equal(out.source_id, '6ac01f3656e6472ebe2d6377');
  assert.equal(out.title, 'Data Engineer Intern – Data Delivery Optimization');
  assert.equal(out.company, 'Lombard Odier');
  assert.equal(out.url, 'https://swissdevjobs.ch/jobs/Lombard-Odier-Data-Engineer-Intern');
  assert.equal(out.location, 'Geneva');
  assert.equal(out.posted_at, '2026-10-02');
});

test('keeps source-specific fields in raw_extra', () => {
  const out = normalizeSwissDevJobsItem(sample);
  assert.equal(out.raw_extra.salary_min, 100000);
  assert.equal(out.raw_extra.salary_max, 130000);
  assert.equal(out.raw_extra.workplace, 'hybrid');
  assert.deepEqual(out.raw_extra.tags, ['Python', 'SQL', 'Cloud']);
});

test('tolerates missing optional fields', () => {
  const out = normalizeSwissDevJobsItem({ _id: 'x', name: 'DevOps Engineer', jobUrl: 'x' });
  assert.equal(out.company, null);
  assert.equal(out.location, null);
  assert.equal(out.posted_at, null);
  assert.equal(out.raw_extra.salary_min, null);
});
