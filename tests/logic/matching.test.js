const test = require('node:test');
const assert = require('node:assert/strict');
const { matchesProfile, matchedKeywords, isAllowedLanguage } = require('../../n8n/logic/matching.js');

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

test('isAllowedLanguage rejects a listing with multiple German markers', () => {
  const listing = {
    title: 'Data Engineer gesucht',
    location: 'Zürich',
    rawExtra: { description_snippet: 'Wir suchen für unser Team eine motivierte Person mit Kenntnisse in Python und Erfahrung in der Softwareentwicklung.' },
  };
  assert.equal(isAllowedLanguage(listing), false);
});

test('isAllowedLanguage rejects a listing with multiple Italian markers', () => {
  const listing = {
    title: 'Data Engineer cercasi',
    location: 'Lugano',
    rawExtra: { description_snippet: 'La nostra azienda offre un ruolo con competenze richieste in Python, candidatura aperta a chi ha esperienza.' },
  };
  assert.equal(isAllowedLanguage(listing), false);
});

test('isAllowedLanguage accepts a French listing', () => {
  const listing = {
    title: 'Data Engineer',
    location: 'Genève',
    rawExtra: { description_snippet: 'Nous cherchons un data engineer maîtrisant Python et SQL pour rejoindre notre équipe.' },
  };
  assert.equal(isAllowedLanguage(listing), true);
});

test('isAllowedLanguage accepts an English listing', () => {
  const listing = {
    title: 'Data Engineer',
    location: 'Lausanne',
    rawExtra: { description_snippet: 'We are looking for a data engineer with strong Python and SQL skills to join our team.' },
  };
  assert.equal(isAllowedLanguage(listing), true);
});

test('matchesProfile rejects a German listing even when keywords and location match', () => {
  const listing = {
    title: 'Data Engineer gesucht',
    location: 'Genève',
    rawExtra: { description_snippet: 'Wir suchen für unser Team eine Person mit Kenntnisse in Python und Erfahrung in der Entwicklung.' },
  };
  const profile = { keywords: ['data engineer', 'python'], locations: ['Genève'] };
  assert.equal(matchesProfile(listing, profile), false);
});
