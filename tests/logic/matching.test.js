const test = require('node:test');
const assert = require('node:assert/strict');
const { matchesProfile, matchedKeywords } = require('../../n8n/logic/matching.js');

test('matches when title contains a keyword and location contains a target location', () => {
  const listing = { title: 'Data Engineer (m/f/d)', location: 'Lausanne, VD', rawExtra: {} };
  const profile = { keywords: ['data engineer', 'python'], locations: ['Lausanne', 'Genève'] };
  assert.equal(matchesProfile(listing, profile), true);
});

test('does not match when no keyword is found anywhere', () => {
  const listing = { title: 'Sales Manager', location: 'Lausanne', rawExtra: { description: 'no relevant tech here' } };
  const profile = { keywords: ['data engineer', 'python'], locations: ['Lausanne'] };
  assert.equal(matchesProfile(listing, profile), false);
});

test('does not match when location is outside the profile locations', () => {
  const listing = { title: 'Python Developer', location: 'Zurich', rawExtra: {} };
  const profile = { keywords: ['python'], locations: ['Lausanne', 'Genève'] };
  assert.equal(matchesProfile(listing, profile), false);
});

test('matching is case-insensitive and also searches rawExtra description', () => {
  const listing = { title: 'Ingénieur logiciel', location: 'Genève', rawExtra: { description: 'Tu maîtrises PYTHON et AWS.' } };
  const profile = { keywords: ['python'], locations: ['Genève'] };
  assert.equal(matchesProfile(listing, profile), true);
});

test('matchedKeywords returns only the keywords actually found', () => {
  const listing = { title: 'Data Engineer', location: 'Lausanne', rawExtra: { description: 'Python and SQL required.' } };
  const profile = { keywords: ['data engineer', 'python', 'java'], locations: ['Lausanne'] };
  assert.deepEqual(matchedKeywords(listing, profile), ['data engineer', 'python']);
});
