const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeIndeedItem, splitIndeedResponses } = require('../../n8n/logic/normalize_indeed.js');
const { summarizeSourceErrors } = require('../../n8n/logic/source_errors.js');

// Corps réel reçu d'Apify le 13.11.2026 (exécution 163), jeton refusé.
const AUTH_401 = { json: { error: {
  message: '401 - "{\n  "error": {\n    "type": "user-or-token-not-found",\n    "message": "User was not found or authentication token is not valid"\n  }\n}"',
  name: 'AxiosError',
} } };
const NO_RESULTS = { json: { error: 'FOUND_NO_RESULTS', errorDescription: 'no jobs' } };
const OFFER = { json: { id: 'abc', positionName: 'Data Analyst', url: 'https://ch.indeed.com/x' } };

test('a 401 from Apify is a failure, not an empty result', () => {
  const { failures, rest } = splitIndeedResponses([AUTH_401, AUTH_401, AUTH_401]);
  assert.equal(failures.length, 3);
  assert.equal(rest.length, 0);
});

test('FOUND_NO_RESULTS stays a plain empty result', () => {
  const { failures, rest } = splitIndeedResponses([NO_RESULTS]);
  assert.equal(failures.length, 0);
  assert.equal(rest.length, 0);
});

test('offers pass through next to failures', () => {
  const { failures, rest } = splitIndeedResponses([OFFER, AUTH_401, NO_RESULTS]);
  assert.equal(failures.length, 1);
  assert.deepEqual(rest, [OFFER]);
  assert.equal(normalizeIndeedItem(rest[0].json).source, 'indeed.ch');
});

test('the alert email names Indeed with its HTTP status', () => {
  const alert = summarizeSourceErrors([{ source: 'Indeed', message: AUTH_401.json.error.message, failed: 3, total: 3 }]);
  assert.ok(alert.html.includes('<li><b>Indeed</b> — 3/3 requête(s) en échec (HTTP 401)</li>'));
});
