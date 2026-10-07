const test = require('node:test');
const assert = require('node:assert/strict');
const {
  classifyListing, matchedRoles, seniority, requiredYears, isRomandieLocation, profileRole,
} = require('../../n8n/logic/job_targeting.js');

const profile = {
  keywords: ['junior data engineer', 'junior software engineer', 'junior devops engineer'],
  locations: ['Genève', 'Lausanne', 'Vevey', 'Aigle', 'Martigny', 'Fribourg', 'Neuchâtel', 'Sion'],
};

const listing = (title, location = 'Genf GE', description = '') => ({
  title, location, raw_extra: { description_snippet: description },
});

test('profileRole strips the junior prefix used in the profile keywords', () => {
  assert.equal(profileRole('Junior Data Engineer'), 'data engineer');
  assert.equal(profileRole('devops'), 'devops');
});

test('recognizes the three target roles in English, French and German titles', () => {
  assert.deepEqual(matchedRoles('Data Engineer Junior (F/H) 100%', profile), ['junior data engineer']);
  assert.deepEqual(matchedRoles('Ingénieur de données junior (H/F)', profile), ['junior data engineer']);
  assert.deepEqual(matchedRoles('Développeur·euse Python', profile), ['junior software engineer']);
  assert.deepEqual(matchedRoles('Junior Softwareentwickler (m/w/d)', profile), ['junior software engineer']);
  assert.deepEqual(matchedRoles('Ingénieur DevOps/Ingénieure DevOps', profile), ['junior devops engineer']);
  assert.deepEqual(matchedRoles('Ingénieur·e développement Fullstack', profile), ['junior software engineer']);
  assert.deepEqual(
    matchedRoles('Software Engineer - (Core DevOps)', profile),
    ['junior software engineer', 'junior devops engineer'],
  );
});

test('rejects roles outside the three targets, including sales "developer" titles', () => {
  for (const title of ['Data Analyst', 'Data Scientist', 'Chef de projet IT', 'Business Developer', 'Développeur commercial', 'Ingénieur Développement Moteur / Automobile']) {
    assert.deepEqual(matchedRoles(title, profile), [], title);
  }
});

test('seniority: senior titles are excluded, junior and internship titles are explicit', () => {
  assert.equal(seniority('Staff Data Engineer', ''), 'senior');
  assert.equal(seniority('Lead DevOps Engineer', ''), 'senior');
  assert.equal(seniority('Architecte DevOps', ''), 'senior');
  assert.equal(seniority('Ingénieur DevOps Senior (H/F/X)', ''), 'senior');
  assert.equal(seniority('Data Engineer Junior (F/H) 100%', ''), 'junior');
  assert.equal(seniority('Internship - Data Engineer - Optimization of Data Delivery', ''), 'junior');
  assert.equal(seniority('Stage – Ingénieur de données', ''), 'junior');
  assert.equal(seniority('DevOps Engineer (AWS)', ''), 'unspecified');
});

test('seniority: more than three required years in the description means senior', () => {
  assert.equal(requiredYears('Vous avez au moins 5 ans d\'expérience en Python.'), 5);
  assert.equal(requiredYears('3-5 years of experience with Kubernetes'), 3);
  assert.equal(seniority('DevOps Engineer', 'Minimum 5+ years of professional experience'), 'senior');
  assert.equal(seniority('DevOps Engineer', '2 ans d\'expérience souhaités'), 'unspecified');
  assert.equal(seniority('Junior Data Engineer', '5 years of experience is a plus'), 'junior');
  assert.equal(seniority('Data Engineer', 'Ce poste convient à un profil junior.'), 'junior');
});

test('location whitelist keeps all of Suisse romande and drops the rest', () => {
  for (const loc of ['Genf GE', 'Kanton Genf, Schweiz', 'Nyon, VD', 'Martigny', 'Sitten, Wallis', 'Freiburg, FR', 'Aigle', 'Switzerland', '']) {
    assert.equal(isRomandieLocation(loc, profile), true, loc);
  }
  for (const loc of ['Schlieren', 'Sursee', 'Zürich', 'Bern, BE', 'Brig, VS']) {
    assert.equal(isRomandieLocation(loc, profile), false, loc);
  }
});

test('classifyListing: junior target role in Romandie is primary', () => {
  const out = classifyListing(listing('Data Engineer Junior (F/H) 100%', 'Lausanne, VD'), profile);
  assert.equal(out.matchCategory, 'primary');
  assert.deepEqual(out.keywordsMatched, ['junior data engineer']);
  assert.equal(out.matchScore, 6);
});

test('classifyListing: target role without seniority is secondary', () => {
  assert.equal(classifyListing(listing('DevOps Engineer (AWS)'), profile).matchCategory, 'secondary');
});

test('classifyListing: senior, off-target or out-of-Romandie listings are excluded', () => {
  assert.equal(classifyListing(listing('Senior DevOps Engineer'), profile).matchCategory, 'excluded');
  assert.equal(classifyListing(listing('Data Analyst Junior'), profile).matchCategory, 'excluded');
  assert.equal(classifyListing(listing('Junior Data Engineer', 'Zürich'), profile).matchCategory, 'excluded');
});
