function normalizeIndeedItem(raw) {
  return {
    source: 'indeed.ch',
    source_id: raw.id,
    title: raw.positionName,
    company: raw.company || null,
    url: raw.url,
    location: raw.location || null,
    posted_at: (raw.postingDateParsed || raw.scrapedAt || '').slice(0, 10) || null,
    raw_extra: {
      description_snippet: raw.description || null,
      job_type: Array.isArray(raw.jobType) ? raw.jobType.join(', ') : (raw.jobType || null),
      salary: raw.salary || null,
    },
  };
}

// Trie les items de "Indeed Search" (onError: continueRegularOutput) :
// - { error: "FOUND_NO_RESULTS", ... } (error est une string) : Apify n'a
//   trouvé aucune offre pour ce mot-clé, ce n'est pas une panne ;
// - { error: { message, name, stack }, ... } (error est un objet) : la requête
//   a échoué (jeton Apify refusé en 401, timeout, 5xx...). Avant, ces items
//   étaient écartés comme une absence de résultat : Indeed est resté à 0 offre
//   avec une exécution « success » et sans alerte (401 du 13.11.2026).
function splitIndeedResponses(items) {
  const isFailure = item => !!item.json && !!item.json.error && typeof item.json.error === 'object';
  const failures = items.filter(isFailure);
  const rest = items.filter(item => !isFailure(item) && (!item.json || !item.json.error));
  return { failures, rest };
}

module.exports = { normalizeIndeedItem, splitIndeedResponses };
