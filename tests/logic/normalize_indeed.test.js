const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeIndeedItem } = require('../../n8n/logic/normalize_indeed.js');

test('splits creator into company/location and maps common fields', () => {
  const raw = {
    guid: 'https://ch.indeed.com/rc/clk?jk=abc123',
    title: 'DevOps Engineer',
    link: 'https://ch.indeed.com/rc/clk?jk=abc123',
    contentSnippet: 'We are looking for a DevOps engineer with AWS experience.',
    pubDate: 'Mon, 10 Aug 2026 08:00:00 GMT',
    creator: 'Exemple SA - Genève',
  };
  const result = normalizeIndeedItem(raw);
  assert.deepEqual(result, {
    source: 'indeed.ch',
    source_id: 'https://ch.indeed.com/rc/clk?jk=abc123',
    title: 'DevOps Engineer',
    company: 'Exemple SA',
    url: 'https://ch.indeed.com/rc/clk?jk=abc123',
    location: 'Genève',
    posted_at: '2026-08-10',
    raw_extra: {
      description_snippet: 'We are looking for a DevOps engineer with AWS experience.',
    },
  });
});

test('falls back to null company/location when creator has no separator', () => {
  const raw = {
    guid: 'g1', title: 'T', link: 'https://x', contentSnippet: null,
    pubDate: 'Mon, 10 Aug 2026 08:00:00 GMT', creator: 'JustACompanyName',
  };
  const result = normalizeIndeedItem(raw);
  assert.equal(result.company, 'JustACompanyName');
  assert.equal(result.location, null);
});
