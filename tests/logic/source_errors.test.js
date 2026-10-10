const test = require('node:test');
const assert = require('node:assert/strict');
const { failureReason, summarizeSourceErrors } = require('../../n8n/logic/source_errors.js');

// Message réel reçu d'Adzuna le 09.10.2026 (tronqué à 500 caractères en amont).
const ADZUNA_503 = 'réponse inattendue — {"error":{"message":"503 - \\"<!DOCTYPE html>\\\\n<html>\\\\n'
  + '<!-- This file is managed by Chef -->\\\\n    <head>\\\\n        <meta charset=\\\\\\"UTF-8\\\\\\">'
  + '\\\\n        <title>Uh oh, something isn\'t right</title>';
const LINKEDIN_429 = '1/15 requête(s) en échec — {"message":"Try spacing your requests out","name":"AxiosError",'
  + '"stack":"AxiosError: Request failed with status code 429\\n    at settle (/usr/local/lib/node_modules/n8n';

test('reduces an HTTP error body to its status code', () => {
  assert.equal(failureReason(ADZUNA_503), 'HTTP 503');
  assert.equal(failureReason(LINKEDIN_429), 'HTTP 429');
});

test('strips markup and truncates a message without status code', () => {
  const reason = failureReason('réponse inattendue — <html><body>' + 'x'.repeat(400) + '</body></html>');
  assert.ok(!reason.includes('<'));
  assert.ok(reason.length <= 161);
});

test('one line per source, however many requests failed', () => {
  const markers = Array.from({ length: 14 }, () => ({ source: 'Adzuna', message: ADZUNA_503 }));
  const alert = summarizeSourceErrors(markers);
  assert.equal(alert.subject, "Annonces: 1 source(s) en échec aujourd'hui");
  assert.equal(alert.html.match(/<li>/g).length, 1);
  assert.ok(!alert.html.includes('DOCTYPE'));
});

test('reports failed requests out of the total when the marker carries them', () => {
  const alert = summarizeSourceErrors([
    { source: 'Adzuna', message: ADZUNA_503, failed: 14, total: 15 },
    { source: 'LinkedIn', message: LINKEDIN_429, failed: 1, total: 15 },
  ]);
  assert.equal(alert.subject, "Annonces: 2 source(s) en échec aujourd'hui");
  assert.ok(alert.html.includes('<li><b>Adzuna</b> — 14/15 requête(s) en échec (HTTP 503)</li>'));
  assert.ok(alert.html.includes('<li><b>LinkedIn</b> — 1/15 requête(s) en échec (HTTP 429)</li>'));
});

test('adds up the same source across several profiles', () => {
  const alert = summarizeSourceErrors([
    { source: 'Adzuna', message: ADZUNA_503, failed: 2, total: 15 },
    { source: 'Adzuna', message: ADZUNA_503, failed: 3, total: 15 },
  ]);
  assert.ok(alert.html.includes('5/30 requête(s) en échec'));
});

test('no failure, no alert', () => {
  assert.equal(summarizeSourceErrors([]), null);
});
