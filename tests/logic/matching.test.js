const test = require('node:test');
const assert = require('node:assert/strict');
const { matchesProfile, matchedKeywords, detectForeignLanguage } = require('../../n8n/logic/matching.js');

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

test('detectForeignLanguage identifies German from multiple markers', () => {
  const listing = {
    title: 'Data Engineer gesucht',
    location: 'Zürich',
    rawExtra: { description_snippet: 'Wir suchen für unser Team eine motivierte Person mit Kenntnisse in Python und Erfahrung in der Softwareentwicklung.' },
  };
  assert.equal(detectForeignLanguage(listing), 'de');
});

test('detectForeignLanguage identifies Italian from multiple markers', () => {
  const listing = {
    title: 'Data Engineer cercasi',
    location: 'Lugano',
    rawExtra: { description_snippet: 'La nostra azienda offre un ruolo con competenze richieste in Python, candidatura aperta a chi ha esperienza.' },
  };
  assert.equal(detectForeignLanguage(listing), 'it');
});

test('detectForeignLanguage returns null for French/English text', () => {
  const listing = {
    title: 'Data Engineer',
    location: 'Genève',
    rawExtra: { description_snippet: 'Nous cherchons un data engineer maîtrisant Python et SQL pour rejoindre notre équipe.' },
  };
  assert.equal(detectForeignLanguage(listing), null);
});

test('matchesProfile matches a German listing when keywords and location fit (no longer rejected)', () => {
  const listing = {
    title: 'Data Engineer gesucht',
    location: 'Genf GE',
    rawExtra: { description_snippet: 'Wir suchen für unser Team eine Person mit Kenntnisse in Python.' },
  };
  const profile = { keywords: ['data engineer'], locations: ['Genève'] };
  assert.equal(matchesProfile(listing, profile), true);
});

test('locationMatches accepts a German Swiss place name via canton-code fallback', () => {
  const listing = { title: 'Data Engineer', location: 'Genf GE', rawExtra: {} };
  const profile = { keywords: ['data engineer'], locations: ['Genève'] };
  assert.equal(matchesProfile(listing, profile), true);
});

test('locationMatches still works via plain substring for non-aliased locations', () => {
  const listing = { title: 'Data Engineer', location: 'Lausanne, VD', rawExtra: {} };
  const profile = { keywords: ['data engineer'], locations: ['Lausanne'] };
  assert.equal(matchesProfile(listing, profile), true);
});
