const test = require('node:test');
const assert = require('node:assert/strict');
const { parseLinkedinCards } = require('../../n8n/logic/normalize_linkedin.js');

// Carte réduite à la structure réellement renvoyée par
// /jobs-guest/jobs/api/seeMoreJobPostings/search (relevée le 05.10.2026).
const card = (id, title, company, location, date) => `<li>
  <div class="base-card job-search-card" data-entity-urn="urn:li:jobPosting:${id}">
    <a class="base-card__full-link" href="https://ch.linkedin.com/jobs/view/x-${id}?refId=abc&amp;trackingId=def"></a>
    <div class="base-search-card__info">
      <h3 class="base-search-card__title">
        ${title}
      </h3>
      <h4 class="base-search-card__subtitle">
        <a class="hidden-nested-link" href="https://ch.linkedin.com/company/x">
          ${company}
        </a>
      </h4>
      <div class="base-search-card__metadata">
        <span class="job-search-card__location">
          ${location}
        </span>
        <time class="job-search-card__listdate" datetime="${date}">1 day ago</time>
      </div>
    </div>
  </div>
</li>`;

test('parses every card into the shared job_listings shape', () => {
  const html = card('4458234057', 'Senior Data Engineer (Databricks)', 'Visium', 'Lausanne, Vaud, Switzerland', '2026-10-04')
    + card('4458234058', 'DevOps Engineer', 'Proton', 'Geneva, Geneva, Switzerland', '2026-10-05');
  const out = parseLinkedinCards(html);
  assert.equal(out.length, 2);
  assert.deepEqual(out[0], {
    source: 'linkedin.com',
    source_id: '4458234057',
    title: 'Senior Data Engineer (Databricks)',
    company: 'Visium',
    url: 'https://www.linkedin.com/jobs/view/4458234057',
    location: 'Lausanne, Vaud, Switzerland',
    posted_at: '2026-10-04',
    raw_extra: {},
  });
});

test('decodes HTML entities in titles and company names', () => {
  const out = parseLinkedinCards(card('1', 'Data &amp; Analytics Engineer', 'Lombard Odier &amp; Co', 'Geneva', '2026-10-05'));
  assert.equal(out[0].title, 'Data & Analytics Engineer');
  assert.equal(out[0].company, 'Lombard Odier & Co');
});

test('returns an empty list for an empty or card-less page', () => {
  assert.deepEqual(parseLinkedinCards(''), []);
  assert.deepEqual(parseLinkedinCards('<html><body>No jobs</body></html>'), []);
});
