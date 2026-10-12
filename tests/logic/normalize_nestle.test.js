const test = require('node:test');
const assert = require('node:assert/strict');
const { parseNestleFeed } = require('../../n8n/logic/normalize_nestle.js');
const { classifyListing } = require('../../n8n/logic/job_targeting.js');

function item(title, link, description = '<p>Join us</p>') {
  return `<item><title><![CDATA[${title}]]></title><description><![CDATA[${description}]]></description>`
    + `<pubDate>Thu, 08 Oct 2026 2:01:00 GMT</pubDate><link>${link}</link><guid>${link}</guid></item>`;
}

const feed = '<rss><channel><title>Nestlé</title>'
  + item('Junior Data Engineer (Orbe, CH)',
    'https://jobdetails.nestle.com/job/Orbe-Junior-Data-Engineer/1445507833/?feedId=null&amp;utm_source=J2WRSS',
    '<p style="x"><strong>Location:</strong> Orbe&nbsp;</p><p>Python &amp; SQL</p>')
  + item('Ingénieur-e Projet (Broc, CH, 1636)', 'https://jobdetails.nestle.com/job/Broc-Ing%C3%A9nieur-e-Projet-1636/1444763633/')
  + item('Coffee Specialist Nespresso Sweden (Stockholm, SE)', 'https://jobdetails.nestle.com/job/Stockholm-Coffee/1400000001/')
  + '</channel></rss>';

test('maps each RSS item to the shared job_listings shape', () => {
  const [job] = parseNestleFeed(feed);
  assert.equal(job.source, 'nestle.com');
  assert.equal(job.source_id, '1445507833');
  assert.equal(job.title, 'Junior Data Engineer');
  assert.equal(job.company, 'Nestlé');
  assert.equal(job.url, 'https://jobdetails.nestle.com/job/Orbe-Junior-Data-Engineer/1445507833/');
  assert.equal(job.posted_at, '2026-10-08');
  assert.equal(job.raw_extra.description, 'Location: Orbe Python & SQL');
});

test('adds the canton of a Romandie site so the profile filter keeps it', () => {
  const [orbe, broc, stockholm] = parseNestleFeed(feed);
  assert.equal(orbe.location, 'Orbe, VD');
  assert.equal(broc.location, 'Broc, FR');
  assert.equal(stockholm.location, 'Stockholm (étranger)');

  const profile = { keywords: ['junior data engineer'], locations: ['Lausanne', 'Genève'] };
  assert.equal(classifyListing(orbe, profile).matchCategory, 'primary');
  assert.equal(classifyListing({ ...stockholm, title: 'Junior Data Engineer' }, profile).matchCategory, 'excluded');
});

test('returns nothing for an empty or unexpected feed', () => {
  assert.deepEqual(parseNestleFeed('<rss><channel></channel></rss>'), []);
  assert.deepEqual(parseNestleFeed(undefined), []);
});

test('does not let a foreign country code pass for a Romandie canton', () => {
  const [job] = parseNestleFeed('<rss>' + item('Junior Data Engineer (Pontarlier, FR)', 'https://jobdetails.nestle.com/job/x/1400000002/') + '</rss>');
  const profile = { keywords: ['junior data engineer'], locations: ['Lausanne', 'Fribourg'] };
  assert.equal(job.location, 'Pontarlier (étranger)');
  assert.equal(classifyListing(job, profile).matchCategory, 'excluded');
});

test('keeps a Swiss location outside the known sites as published', () => {
  const [job] = parseNestleFeed('<rss>' + item('Operator (Konolfingen, CH)', 'https://jobdetails.nestle.com/job/x/1400000003/') + '</rss>');
  assert.equal(job.location, 'Konolfingen, CH');
});
