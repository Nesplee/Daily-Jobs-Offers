const test = require('node:test');
const assert = require('node:assert/strict');
const { htmlToText, detailUrl, extractDescription } = require('../../n8n/logic/extract_description.js');

const long = (prefix) => `${prefix} ${'Vous développez des pipelines de données en Python et SQL. '.repeat(5)}`;

test('htmlToText keeps paragraphs and bullets, drops tags and entities', () => {
  const out = htmlToText('<p>Missions&nbsp;:</p><ul><li>Python</li><li>dbt &amp; Airflow</li></ul><br>Fin');
  assert.equal(out, 'Missions :\n\n- Python\n- dbt & Airflow\n\nFin');
});

test('detailUrl builds the detail endpoint per source, null when none is reachable', () => {
  assert.equal(detailUrl({ source: 'linkedin.com', source_id: '4480998507' }),
    'https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/4480998507');
  assert.equal(detailUrl({ source: 'cern.ch', source_id: '744' }),
    'https://api.smartrecruiters.com/v1/companies/CERN/postings/744');
  assert.equal(detailUrl({ source: 'jobs.ch', url: 'https://www.jobs.ch/en/vacancies/detail/x/' }),
    'https://www.jobs.ch/en/vacancies/detail/x/');
  assert.equal(detailUrl({ source: 'jooble.ch', source_id: '1', url: 'https://ch.jooble.org/jdp/1' }), null);
});

test('LinkedIn: reads the description markup up to the "show more" button', () => {
  const html = `<section class="show-more-less-html"><div class="show-more-less-html__markup show-more-less-html__markup--clamp-after-5
      relative overflow-hidden"><p>${long('Java Developer')}</p><div>imbriqué</div><p>Fin.</p>
    </div><button class="show-more-less-html__button show-more-less-button">Show more</button>`;
  const { text } = extractDescription('linkedin.com', html);
  assert.match(text, /^Java Developer/);
  assert.match(text, /imbriqué\n+Fin\.$/);
  assert.doesNotMatch(text, /Show more/);
});

test('Job-Room: all published languages, French first', () => {
  const body = JSON.stringify({ jobContent: { jobDescriptions: [
    { languageIsoCode: 'en', description: long('English') },
    { languageIsoCode: 'fr', description: long('Français') },
  ] } });
  const { text } = extractDescription('job-room.ch', body);
  assert.match(text, /^Français/);
  assert.match(text, /\n\nEnglish/);
});

test('CERN: SmartRecruiters sections with their titles', () => {
  const body = { jobAd: { sections: {
    companyDescription: { title: 'Company', text: '<p>CERN</p>' },
    jobDescription: { title: 'Job Description', text: `<p>${long('Tasks')}</p>` },
    qualifications: { title: 'Qualifications', text: '<ul><li>Java</li></ul>' },
  } } };
  const { text } = extractDescription('cern.ch', body);
  assert.match(text, /^Job Description\nTasks/);
  assert.match(text, /Qualifications\n- Java/);
  assert.match(text, /Company\nCERN$/);
});

test('JSON-LD: JobPosting among other blocks, separate fields appended once', () => {
  const html = `
    <script type="application/ld+json">{"@type":"BreadcrumbList"}</script>
    <script type="application/ld+json">{"@type":"JobPosting","description":"<p>${long('Votre mission')}</p>",
      "qualifications":"<ul><li>Dipl&#244;me HES<\\/li></ul>","responsibilities":"<p>${long('Votre mission')}</p>"}</script>`;
  const { text } = extractDescription('srgssr.ch', html);
  assert.match(text, /^Votre mission/);
  assert.match(text, /- Diplôme HES$/);
  assert.equal(text.match(/Votre mission/g).length, 1);
});

test('swissdevjobs: job embedded in window.__detailedJob, sections in order', () => {
  const job = {
    isDisabledOrOutdated: false,
    description: long('A career at Lombard Odier'),
    responsibilitiesTextArea: '- Working on data projects  \n- Supporting users',
    requirementsMustTextArea: '- SQL  \n- Python',
    requirementsNiceTextArea: '',
    technologies: ['SQL', 'Python'],
  };
  const html = `<script>window.__detailedJob = ${JSON.stringify(job)}</script>`;
  const { text } = extractDescription('swissdevjobs.ch', html);
  assert.match(text, /^A career at Lombard Odier/);
  assert.match(text, /Responsibilities\n- Working on data projects\n- Supporting users/);
  assert.match(text, /Requirements\n- SQL\n- Python\n\nTechnologies\nSQL, Python$/);
  assert.doesNotMatch(text, /Nice to have/);
  const gone = `<script>window.__detailedJob = ${JSON.stringify({ ...job, isDisabledOrOutdated: true })}</script>`;
  assert.deepEqual(extractDescription('swissdevjobs.ch', gone), { error: 'offre retirée' });
  const placeholder = '<script>window.__detailedJob = "JOB_PLACEHOLDER"</script>';
  assert.deepEqual(extractDescription('swissdevjobs.ch', placeholder), { error: 'offre retirée' });
});

test('errors are explicit: page changed, teaser only, broken JSON, unsupported source', () => {
  assert.deepEqual(extractDescription('jobs.ch', '<html>rien</html>'), { error: 'description introuvable dans la page' });
  assert.deepEqual(
    extractDescription('jobup.ch', '<script type="application/ld+json">{"@type":"ItemList","itemListElement":[]}</script>'),
    { error: 'offre retirée (redirigée vers une liste)' },
  );
  assert.deepEqual(
    extractDescription('jobs.ch', '<script type="application/ld+json">{"@type":"JobPosting","description":"Court."}</script>'),
    { error: 'description trop courte' },
  );
  assert.match(extractDescription('cern.ch', '{oops').error, /^réponse illisible/);
  assert.deepEqual(extractDescription('adzuna.ch', 'x'), { error: 'source sans page de détail' });
});
