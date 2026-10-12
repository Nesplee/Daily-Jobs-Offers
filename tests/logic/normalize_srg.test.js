const test = require('node:test');
const assert = require('node:assert/strict');
const { parseSrgJobs } = require('../../n8n/logic/normalize_srg.js');

function block({ unit, url, title, small, teaser }) {
  return `<div class="section group jobContent countJobRecords">
    <img src="/x.svg" class="logoSection"
         alt="${unit}">
    <a href="${url}" title="${title}" target="_blank"><h1>${title}</h1></a>
    <small>${small}</small>
    <p>${teaser}</p>
    <a href="${url}" target="_blank" class="readMore">En savoir plus</a>
  </div>`;
}

const page = '<section id="jobResults">'
  + block({
    unit: 'rts',
    url: 'https://jobs.srgssr.ch/rts/emplois-vacantes/data-engineer/d486de8e-446e-4247-bdbb-7b10376a7750',
    title: 'Data Engineer &amp; BI',
    small: '80-100%, Ecublens',
    teaser: 'La RTS recherche un-e Data Engineer.',
  })
  + block({
    unit: 'rsi',
    url: 'https://jobs.srgssr.ch/rsi/emplois-vacantes/addetto/7adf1e40-9dd0-47e8-b108-2e7f7946bd54',
    title: 'Una/Un addetta/o alla sicurezza',
    small: '60-80%, Comano',
    teaser: 'Assolvere il mandato.',
  })
  + '</section>';

test('maps each career-center block to the shared job_listings shape', () => {
  const [rts, rsi] = parseSrgJobs(page);
  assert.equal(rts.source, 'srgssr.ch');
  assert.equal(rts.source_id, 'd486de8e-446e-4247-bdbb-7b10376a7750');
  assert.equal(rts.title, 'Data Engineer & BI');
  assert.equal(rts.company, 'RTS');
  assert.equal(rts.url, 'https://jobs.srgssr.ch/rts/emplois-vacantes/data-engineer/d486de8e-446e-4247-bdbb-7b10376a7750');
  assert.equal(rts.location, 'Ecublens');
  assert.equal(rts.posted_at, null);
  assert.equal(rts.raw_extra.workload, '80-100%');
  assert.equal(rts.raw_extra.description_snippet, 'La RTS recherche un-e Data Engineer.');
  assert.equal(rsi.company, 'RSI');
  assert.equal(rsi.location, 'Comano');
});

test('returns nothing for a page without job blocks', () => {
  assert.deepEqual(parseSrgJobs('<html><body>maintenance</body></html>'), []);
  assert.deepEqual(parseSrgJobs(undefined), []);
});

test('keeps the whole line as location when there is no workload', () => {
  const [job] = parseSrgJobs(block({
    unit: 'srg', url: 'https://jobs.srgssr.ch/srg/emplois-vacantes/x/abc', title: 'X', small: 'Lieu de travail à convenir', teaser: '',
  }));
  assert.equal(job.location, 'Lieu de travail à convenir');
  assert.equal(job.raw_extra.workload, null);
});

test('keeps one listing when the page renders the same job twice', () => {
  const job = { unit: 'rts', url: 'https://jobs.srgssr.ch/rts/emplois-vacantes/x/abc', title: 'X', small: '100%, Genève', teaser: '' };
  const jobs = parseSrgJobs(block(job) + block({ ...job, small: '100% à Genève' }));
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].location, 'Genève');
});
