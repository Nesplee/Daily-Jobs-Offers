const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeAdzunaItem } = require('../../n8n/logic/normalize_adzuna.js');

test('maps the common fields and buckets description/salary/contract into raw_extra', () => {
  const raw = {
    id: '4753201982',
    title: 'Data Analyst',
    company: { display_name: 'Exemple SA' },
    location: { display_name: 'Neuchâtel, Suisse' },
    redirect_url: 'https://www.adzuna.ch/details/4753201982',
    created: '2026-08-09T10:00:00Z',
    description: 'Nous cherchons un·e data analyst...',
    salary_min: 80000,
    salary_max: 95000,
    contract_type: 'permanent',
    contract_time: 'full_time',
    category: { label: 'IT Jobs' },
    fullDescription: 'Full text of the Adzuna ad, unabridged.',
  };
  const result = normalizeAdzunaItem(raw);
  assert.deepEqual(result, {
    source: 'adzuna.ch',
    source_id: '4753201982',
    title: 'Data Analyst',
    company: 'Exemple SA',
    url: 'https://www.adzuna.ch/details/4753201982',
    location: 'Neuchâtel, Suisse',
    posted_at: '2026-08-09',
    raw_extra: {
      description_snippet: 'Nous cherchons un·e data analyst...',
      salary_min: 80000,
      salary_max: 95000,
      contract_type: 'permanent',
      contract_time: 'full_time',
      category: 'IT Jobs',
      description_full: 'Full text of the Adzuna ad, unabridged.',
    },
  });
});

test('handles missing optional fields as null', () => {
  const raw = {
    id: '1', title: 'T', company: null, location: null,
    redirect_url: 'https://x', created: '2026-08-09T10:00:00Z',
    description: null, salary_min: null, salary_max: null,
    contract_type: null, contract_time: null, category: null, fullDescription: null,
  };
  const result = normalizeAdzunaItem(raw);
  assert.equal(result.company, null);
  assert.deepEqual(result.raw_extra, {
    description_snippet: null,
    salary_min: null,
    salary_max: null,
    contract_type: null,
    contract_time: null,
    category: null,
    description_full: null,
  });
});
