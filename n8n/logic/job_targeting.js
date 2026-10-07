// Ciblage du profil : uniquement les trois métiers visés (data, software,
// devops), uniquement en Suisse romande, et sans les postes seniors.
// Les sources sont interrogées par métier SANS "junior" (jobs.ch, Genève :
// 66 offres "data engineer" contre 2 pour "junior data engineer" — la
// plupart des postes accessibles à un junior ne portent pas la mention), la
// séniorité est donc tranchée ici, localement.

const ROLE_PATTERNS = {
  'data engineer': [
    /\b(big )?data engineer/i,
    /\bdata engineering\b/i,
    /\banalytics engineer/i,
    /\bing[ée]nieur(e|\(e\)|·e)?s? (de |en |des )?donn[ée]es\b/i,
    /\bing[ée]nieur(e|\(e\)|·e)? (big )?data\b/i,
    /\bd[ée]veloppeur(se|\(se\)|·se)? (data|etl|big data)\b/i,
    /\bdata ?ingenieur/i,
    /\bdateningenieur/i,
    /\betl developer/i,
  ],
  'software engineer': [
    /\bsoftware (engineer|developer|entwickler)/i,
    /\bing[ée]nieur(e|\(e\)|·e)? (en |de )?(logiciel|software|d[ée]veloppement)/i,
    /\bd[ée]veloppeur(se|\(se\)|·se)?\b/i,
    /\b(full.?stack|back.?end|front.?end|web|python|java|\.net|c\+\+) (engineer|developer)\b/i,
    /\bdeveloper\b/i,
    /\bsoftwareentwickler/i,
    /\bprogrammeur/i,
  ],
  'devops engineer': [
    /\bdev ?ops\b/i,
    /\bdev ?sec ?ops\b/i,
    /\bsite reliability\b/i,
    /\bsre\b/i,
    /\bplatform engineer/i,
    /\bcloud engineer/i,
    /\bing[ée]nieur(e|\(e\)|·e)? (cloud|plateforme)\b/i,
  ],
};

// "Business Developer" et "Développeur commercial" contiennent "developer"
// mais sont des postes de vente.
const NOT_A_TECH_ROLE = /\b(business develop|d[ée]veloppeu(r|se) (commercial|d'affaires|business)|d[ée]veloppement (commercial|des affaires)|sales)/i;

const SENIOR_TITLE = /\b(senior|sr\.?|lead|principal|staff|head|chief|manager|director|directeur|directrice|architect|architecte|expert|experte|confirm[ée]e?|exp[ée]riment[ée]e?|chef|cheffe|responsable|vp|leiter|leiterin)\b/i;

const JUNIOR_TITLE = /\b(junior|jr\.?|graduate|entry.level|d[ée]butant(e)?|stage|stagiaire|intern|internship|trainee|apprenti(e)?|apprentissage|alternance|alternant(e)?|working student|werkstudent(in)?|praktikum|praktikant(in)?|jeune dipl[ôo]m[ée](e)?|new grad)\b/i;
const JUNIOR_TEXT = /\b(junior|graduate|entry.level|d[ée]butant(e)?|jeune dipl[ôo]m[ée](e)?|new grad|premi[èe]re exp[ée]rience)\b/i;

// "5+ years of experience", "au moins 4 ans d'expérience", "5 Jahre Erfahrung".
const YEARS_OF_EXPERIENCE = /(\d{1,2})\s*\+?\s*(?:-\s*\d{1,2}\s*)?(?:ans|ann[ée]es|years?|yrs|jahre)\b[^.\n]{0,40}?(exp[ée]rience|experience|erfahrung)/gi;
const MAX_JUNIOR_YEARS = 3;

function profileRole(keyword) {
  return String(keyword || '').toLowerCase().replace(/^\s*junior\s+/, '').trim();
}

function matchedRoles(title, profile) {
  const text = String(title || '');
  if (NOT_A_TECH_ROLE.test(text)) return [];
  return profile.keywords.filter((kw) => {
    const role = profileRole(kw);
    const patterns = ROLE_PATTERNS[role];
    return patterns ? patterns.some((re) => re.test(text)) : text.toLowerCase().includes(role);
  });
}

function requiredYears(text) {
  let max = 0;
  for (const m of String(text || '').matchAll(YEARS_OF_EXPERIENCE)) {
    max = Math.max(max, Number(m[1]));
  }
  return max;
}

// 'junior' : la mention est explicite. 'unspecified' : aucune indication.
// 'senior' : titre senior/lead/architecte..., ou plus de MAX_JUNIOR_YEARS ans
// d'expérience demandés sans mention junior dans le titre.
function seniority(title, description) {
  const juniorTitle = JUNIOR_TITLE.test(title || '');
  if (!juniorTitle && SENIOR_TITLE.test(title || '')) return 'senior';
  if (juniorTitle) return 'junior';
  if (requiredYears(description) > MAX_JUNIOR_YEARS) return 'senior';
  if (JUNIOR_TEXT.test(description || '')) return 'junior';
  return 'unspecified';
}

// Liste blanche plutôt que liste noire : une liste des localités hors
// Romandie n'est jamais complète (Schlieren, Sursee passaient). Une offre
// est gardée si sa localisation cite un canton romand ou une ville du
// profil, ou si elle ne précise rien de plus que le pays (bénéfice du doute).
const ROMAND_CANTONS = /\b(ge|vd|ne|fr|vs|ju|gen[èe]ve|geneva|genf|vaud|waadt|neuch[âa]tel|neuenburg|fribourg|freiburg|valais|wallis|jura)\b/i;
// Le Haut-Valais est germanophone, même s'il est en "VS"/"Wallis".
const UPPER_VALAIS = /\b(brig|brigue|visp|vi[èe]ge|zermatt|naters|leuk|loèche)\b/i;
const COUNTRY_ONLY = /\b(switzerland|suisse|schweiz|svizzera|ch|remote|t[ée]l[ée]travail|hybrid|hybride|kanton|canton)\b/gi;

const LOCATION_ALIASES = {
  'genève': ['genève', 'geneve', 'geneva', 'genf', 'ginevra'],
  'lausanne': ['lausanne', 'losanna'],
  'neuchâtel': ['neuchâtel', 'neuchatel', 'neuenburg'],
  'fribourg': ['fribourg', 'freiburg'],
  'sion': ['sion', 'sitten'],
  'delémont': ['delémont', 'delemont', 'delsberg'],
};

function locationMatches(location, profile) {
  const text = String(location || '').toLowerCase();
  if (!text) return false;
  return profile.locations.some((loc) => {
    const locLower = loc.toLowerCase();
    return (LOCATION_ALIASES[locLower] || [locLower]).some((alias) => text.includes(alias));
  });
}

function isRomandieLocation(location, profile) {
  const text = String(location || '');
  if (!text.trim()) return true;
  if (UPPER_VALAIS.test(text)) return false;
  if (ROMAND_CANTONS.test(text) || locationMatches(text, profile)) return true;
  return text.replace(COUNTRY_ONLY, '').replace(/[^\p{L}]/gu, '') === '';
}

// matchCategory : 'primary' (métier visé + mention junior/stage),
// 'secondary' (métier visé, séniorité non précisée), 'excluded' sinon.
function classifyListing(listing, profile) {
  const title = listing.title || '';
  const extra = listing.raw_extra || {};
  const description = [extra.description, extra.description_snippet, extra.description_full]
    .filter((v) => typeof v === 'string').join(' ');

  const roles = matchedRoles(title, profile);
  const level = seniority(title, description);
  const inRomandie = isRomandieLocation(listing.location, profile);

  let matchCategory = 'excluded';
  if (roles.length > 0 && level !== 'senior' && inRomandie) {
    matchCategory = level === 'junior' ? 'primary' : 'secondary';
  }

  const matchScore = roles.length * 3
    + (level === 'junior' ? 2 : 0)
    + (locationMatches(listing.location, profile) ? 1 : 0);

  return { matchCategory, matchScore, keywordsMatched: roles, seniority: level };
}

module.exports = {
  classifyListing, matchedRoles, seniority, requiredYears, isRomandieLocation, profileRole,
};
