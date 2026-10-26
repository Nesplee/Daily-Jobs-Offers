// Description complète d'une annonce, lue sur sa page de détail : les
// recherches de toutes les sources ne renvoient qu'un extrait (ou rien pour
// LinkedIn, CERN et swissdevjobs). Utilisé par le workflow enrich_descriptions.
// Le texte est gardé dans sa langue d'origine : le quota gratuit DeepL ne
// tiendrait pas 3 jours avec des descriptions complètes.

const MAX_LENGTH = 20000;
// En dessous, ce n'est pas une description mais une accroche ("Nous
// recherchons un(e) Développeur/euse 1 pour rejoindre notre équipe.").
const MIN_LENGTH = 200;

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decodeEntities(s) {
  return String(s || '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isNaN(n) ? m : String.fromCodePoint(n);
    }
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}

// HTML -> texte lisible : les blocs et les <br> deviennent des retours à la
// ligne, les puces des "- ", le reste des balises disparaît.
function htmlToText(html) {
  const text = decodeEntities(
    String(html || '')
      .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<li[^>]*>/gi, '\n- ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|ul|ol|h[1-6]|tr|section)>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  );
  return text
    .split('\n')
    .map((line) => line.replace(/[ \t ]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function finish(text) {
  const clean = (text || '').trim();
  if (clean.length < MIN_LENGTH) return null;
  return clean.length > MAX_LENGTH ? clean.slice(0, MAX_LENGTH).trim() : clean;
}

// URL de la page (ou de l'API) de détail, null si la source n'en a pas
// d'accessible : Jooble et Adzuna répondent 403 à toute requête hors
// navigateur, Indeed donne déjà la description complète.
function detailUrl(listing) {
  const id = encodeURIComponent(String(listing.source_id || ''));
  switch (listing.source) {
    case 'linkedin.com':
      return `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${id}`;
    case 'job-room.ch':
      return `https://www.job-room.ch/jobadservice/api/jobAdvertisements/${id}`;
    case 'cern.ch':
      return `https://api.smartrecruiters.com/v1/companies/CERN/postings/${id}`;
    case 'jobs.ch':
    case 'jobup.ch':
    case 'srgssr.ch':
    case 'nestle.com':
    case 'swissdevjobs.ch':
      return listing.url || null;
    default:
      return null;
  }
}

function fromLinkedin(html) {
  const start = html.search(/<div class="show-more-less-html__markup/);
  if (start === -1) return null;
  const end = html.indexOf('<button class="show-more-less-html__button', start);
  const block = html.slice(start, end === -1 ? undefined : end);
  return htmlToText(block.slice(block.indexOf('>') + 1));
}

function fromJobRoom(body) {
  const ad = typeof body === 'string' ? JSON.parse(body) : body;
  const descriptions = ((ad && ad.jobContent) || {}).jobDescriptions || [];
  // Toutes les langues publiées, français d'abord : une annonce bilingue
  // garde ainsi ses deux versions plutôt qu'une seule au hasard.
  const ordered = [...descriptions].sort((a, b) => (b.languageIsoCode === 'fr') - (a.languageIsoCode === 'fr'));
  return ordered.map((d) => htmlToText(d.description)).filter(Boolean).join('\n\n');
}

function fromSmartRecruiters(body) {
  const posting = typeof body === 'string' ? JSON.parse(body) : body;
  const sections = ((posting && posting.jobAd) || {}).sections || {};
  return ['jobDescription', 'qualifications', 'additionalInformation', 'companyDescription']
    .map((key) => sections[key])
    .filter((s) => s && s.text)
    .map((s) => [s.title, htmlToText(s.text)].filter(Boolean).join('\n'))
    .join('\n\n');
}

function jobPostingFromJsonLd(html) {
  const blocks = html.match(/<script[^>]*application\/ld\+json[^>]*>[\s\S]*?<\/script>/gi) || [];
  for (const block of blocks) {
    let data;
    try {
      data = JSON.parse(block.replace(/^<script[^>]*>/i, '').replace(/<\/script>$/i, ''));
    } catch (e) {
      continue;
    }
    const nodes = Array.isArray(data) ? data : data['@graph'] || [data];
    const posting = nodes.find((n) => n && n['@type'] === 'JobPosting');
    if (posting) return posting;
  }
  return null;
}

// swissdevjobs.ch est une application JavaScript, mais la page d'une offre
// embarque l'offre complète dans window.__detailedJob : description, tâches
// et exigences en texte brut (listes en "- "), technologies à part.
function fromSwissDevJobs(html) {
  const start = html.indexOf('window.__detailedJob =');
  if (start === -1) return null;
  const end = html.indexOf('</script>', start);
  const job = JSON.parse(html.slice(start + 'window.__detailedJob ='.length, end).trim().replace(/;$/, ''));
  // Offre retirée : la page garde l'URL mais l'objet devient la chaîne
  // "JOB_PLACEHOLDER" (ou l'URL redirige vers une liste qui en a autant).
  if (!job || typeof job !== 'object' || job.isDisabledOrOutdated) return { expired: true };
  const sections = [
    [null, job.description],
    ['Responsibilities', job.responsibilitiesTextArea],
    ['Requirements', job.requirementsMustTextArea],
    ['Nice to have', job.requirementsNiceTextArea],
    ['Technologies', (job.technologies || []).join(', ')],
  ];
  return sections
    .filter(([, text]) => text && String(text).trim())
    .map(([title, text]) => [title, String(text).replace(/[ \t]+\n/g, '\n').trim()].filter(Boolean).join('\n'))
    .join('\n\n');
}

// jobs.ch, jobup.ch, SRG SSR, Nestlé : le JobPosting schema.org que ces
// sites publient pour le référencement. SRG met tâches et profil dans des
// champs à part, ajoutés s'ils ne sont pas déjà dans la description.
function fromJsonLd(html) {
  const posting = jobPostingFromJsonLd(html);
  // Offre expirée : jobs.ch et jobup.ch redirigent vers la liste de sa
  // catégorie (HTTP 200), qui ne publie qu'un ItemList d'autres offres.
  if (!posting) return /"@type"\s*:\s*"ItemList"/.test(html) ? { expired: true } : null;
  const description = htmlToText(posting.description);
  const extras = ['responsibilities', 'qualifications', 'skills', 'jobBenefits']
    .map((key) => (typeof posting[key] === 'string' ? htmlToText(posting[key]) : ''))
    .filter((text) => text && !description.includes(text.slice(0, 80)));
  return [description, ...extras].filter(Boolean).join('\n\n');
}

// Renvoie { text } ou { error } : une page qui a changé de structure doit se
// voir dans les compteurs d'erreurs, pas passer pour une offre sans texte.
function extractDescription(source, body) {
  let text;
  try {
    switch (source) {
      case 'linkedin.com':
        text = fromLinkedin(String(body || ''));
        break;
      case 'job-room.ch':
        text = fromJobRoom(body);
        break;
      case 'cern.ch':
        text = fromSmartRecruiters(body);
        break;
      case 'jobs.ch':
      case 'jobup.ch':
      case 'srgssr.ch':
      case 'nestle.com':
        text = fromJsonLd(String(body || ''));
        break;
      case 'swissdevjobs.ch':
        text = fromSwissDevJobs(String(body || ''));
        break;
      default:
        return { error: 'source sans page de détail' };
    }
  } catch (e) {
    return { error: `réponse illisible : ${e.message}`.slice(0, 200) };
  }
  if (text && text.expired) return { error: source === 'swissdevjobs.ch' ? 'offre retirée' : 'offre retirée (redirigée vers une liste)' };
  const result = finish(text);
  return result ? { text: result } : { error: text ? 'description trop courte' : 'description introuvable dans la page' };
}

module.exports = { htmlToText, detailUrl, extractDescription, MIN_LENGTH, MAX_LENGTH };
