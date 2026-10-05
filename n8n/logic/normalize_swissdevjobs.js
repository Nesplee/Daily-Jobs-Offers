// swissdevjobs.ch expose toutes ses offres (toute la Suisse, toutes technos)
// en un seul appel JSON non authentifié : GET https://swissdevjobs.ch/api/jobsLight.
// Pas de recherche par mot-clé ni par lieu côté source : c'est "Filter by
// profile" qui fait tout le tri, comme pour les autres sources.
//
// Un enregistrement brut ressemble à :
//   { _id, name, company, actualCity, cityCategory, jobUrl, activeFrom,
//     workplace, jobType, expLevel, annualSalaryFrom, annualSalaryTo,
//     language, filterTags: [...] }
// L'URL publique d'une offre est https://swissdevjobs.ch/jobs/<jobUrl>.
function normalizeSwissDevJobsItem(raw) {
  return {
    source: 'swissdevjobs.ch',
    source_id: raw._id,
    title: raw.name,
    company: raw.company || null,
    url: 'https://swissdevjobs.ch/jobs/' + raw.jobUrl,
    // actualCity est la ville réelle ; cityCategory est un regroupement
    // (ex: "Lausanne" pour Renens), moins précis pour l'exclusion par lieu.
    location: raw.actualCity || null,
    // activeFrom est en heure locale suisse ("2026-10-02T00:00:00.000+02:00") :
    // on garde la date telle quelle plutôt que de la convertir en UTC, ce qui
    // la décalerait au jour précédent.
    posted_at: raw.activeFrom ? raw.activeFrom.slice(0, 10) : null,
    raw_extra: {
      salary_min: raw.annualSalaryFrom || null,
      salary_max: raw.annualSalaryTo || null,
      workplace: raw.workplace || null,
      job_type: raw.jobType || null,
      exp_level: raw.expLevel || null,
      language: raw.language || null,
      tags: raw.filterTags || [],
    },
  };
}

module.exports = { normalizeSwissDevJobsItem };
