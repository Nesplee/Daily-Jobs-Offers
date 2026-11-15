// Compte, par source, les offres brutes (sortie de "Merge"), les offres
// retenues ("Filter by profile") et les requêtes en échec (marqueurs
// __sourceError). Toute source connue absente de "Merge" est enregistrée à 0 :
// c'est ce zéro qui permet de repérer une source muette.
const KNOWN_SOURCES = [
  'jobs.ch', 'jobup.ch', 'job-room.ch', 'jooble.ch', 'adzuna.ch', 'linkedin.com',
  'indeed.ch', 'cern.ch', 'swissdevjobs.ch', 'srgssr.ch', 'nestle.com',
];

// Nom utilisé par les marqueurs d'erreur -> valeur de job_listings.source.
const MARKER_SOURCES = {
  'Adzuna': 'adzuna.ch', 'CERN': 'cern.ch', 'Indeed': 'indeed.ch', 'Job-Room': 'job-room.ch',
  'Jooble': 'jooble.ch', 'LinkedIn': 'linkedin.com', 'Nestlé': 'nestle.com',
  'SRG SSR': 'srgssr.ch', 'swissdevjobs': 'swissdevjobs.ch',
};

function computeSourceStats(merged, kept, runDate) {
  const rows = new Map(KNOWN_SOURCES.map(s => [s, { source: s, raw_count: 0, kept_count: 0, error_count: 0 }]));
  const row = source => {
    if (!rows.has(source)) rows.set(source, { source, raw_count: 0, kept_count: 0, error_count: 0 });
    return rows.get(source);
  };
  for (const item of merged) {
    const j = item.json || {};
    if (j.__sourceError) {
      row(MARKER_SOURCES[j.source] || j.source).error_count += j.failed || 1;
    } else if (j.source) {
      row(j.source).raw_count += 1;
    }
  }
  for (const item of kept) {
    const j = item.json || {};
    if (j.source) row(j.source).kept_count += 1;
  }
  return [...rows.values()].map(r => ({ run_date: runDate, ...r }));
}

module.exports = { KNOWN_SOURCES, MARKER_SOURCES, computeSourceStats };
