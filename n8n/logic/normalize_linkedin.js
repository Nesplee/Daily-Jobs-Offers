function decodeEntities(s) {
  return String(s || '')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstMatch(html, pattern) {
  const m = html.match(pattern);
  return m ? decodeEntities(m[1]) : null;
}

// L'endpoint invité renvoie une liste de <li> contenant chacun une carte
// d'offre en HTML (pas de JSON). L'ID stable est dans data-entity-urn ; l'URL
// de la carte porte des paramètres de tracking (refId, trackingId) qui changent
// à chaque appel, donc on reconstruit une URL canonique à partir de l'ID.
function parseLinkedinCards(html) {
  return String(html || '')
    .split('<li>')
    .slice(1)
    .map((card) => {
      const id = firstMatch(card, /data-entity-urn="urn:li:jobPosting:(\d+)"/);
      if (!id) return null;
      return {
        source: 'linkedin.com',
        source_id: id,
        title: firstMatch(card, /<h3 class="base-search-card__title">([\s\S]*?)<\/h3>/),
        company: firstMatch(card, /<h4 class="base-search-card__subtitle">[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/),
        url: 'https://www.linkedin.com/jobs/view/' + id,
        location: firstMatch(card, /<span class="job-search-card__location">([\s\S]*?)<\/span>/),
        posted_at: firstMatch(card, /datetime="(\d{4}-\d{2}-\d{2})"/),
        raw_extra: {},
      };
    })
    .filter((job) => job && job.title);
}

module.exports = { parseLinkedinCards };
