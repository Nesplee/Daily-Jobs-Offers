const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeCernPosting } = require('../../n8n/logic/normalize_cern.js');

const sample = {
  id: '744000153502680',
  name: 'Data Engineer (IT-DA-2026-101-LD)',
  refNumber: 'IT-DA-2026-101-LD',
  company: { identifier: 'CERN', name: 'CERN' },
  releasedDate: '2026-10-05T13:15:39.007Z',
  location: { city: 'Geneva', region: 'GENEVA', country: 'ch' },
  department: { label: 'IT' },
  typeOfEmployment: { label: 'Full-time' },
  experienceLevel: { label: 'Entry Level' },
};

test('maps a SmartRecruiters posting to the shared job_listings shape', () => {
  const out = normalizeCernPosting(sample);
  assert.equal(out.source, 'cern.ch');
  assert.equal(out.source_id, '744000153502680');
  assert.equal(out.title, 'Data Engineer (IT-DA-2026-101-LD)');
  assert.equal(out.company, 'CERN');
  assert.equal(out.url, 'https://jobs.smartrecruiters.com/CERN/744000153502680');
  assert.equal(out.location, 'Geneva, GENEVA');
  assert.equal(out.posted_at, '2026-10-05');
  assert.equal(out.raw_extra.experience_level, 'Entry Level');
});

test('tolerates a posting with no location, date or labels', () => {
  const out = normalizeCernPosting({ id: '1', name: 'Fellow' });
  assert.equal(out.location, null);
  assert.equal(out.posted_at, null);
  assert.equal(out.company, 'CERN');
  assert.equal(out.raw_extra.department, null);
});
