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

// Le "SRG Career Center" (prospective.ch) sert en une page HTML toutes les
// offres du groupe SSR, toutes unités confondues (RTS, SRF, RSI, RTR, SWI,
// SWISS TXT). Chaque offre est un bloc "jobContent" : le logo donne l'unité,
// le lien son identifiant stable (UUID en fin d'URL), et la ligne <small>
// "80-100%, Ecublens" le taux puis le lieu. Aucune date de publication.
function parseSrgJobs(html) {
  // Chaque offre est rendue deux fois (bureau et mobile) : on garde la première.
  const seen = new Set();
  return String(html || '')
    .split('jobContent countJobRecords')
    .slice(1)
    .map((block) => {
      const url = firstMatch(block, /href="(https:\/\/jobs\.srgssr\.ch\/[^"]+)"/);
      const id = url ? url.split('/').pop() : null;
      if (!id) return null;
      const unit = firstMatch(block, /class="logoSection"\s+alt="([^"]*)"/);
      const small = firstMatch(block, /<small>([\s\S]*?)<\/small>/) || '';
      const comma = small.indexOf(',');
      return {
        source: 'srgssr.ch',
        source_id: id,
        title: firstMatch(block, /<h1>([\s\S]*?)<\/h1>/),
        company: unit ? unit.toUpperCase() : 'SRG SSR',
        url,
        location: (comma === -1 ? small : small.slice(comma + 1)).trim() || null,
        posted_at: null,
        raw_extra: {
          workload: comma === -1 ? null : small.slice(0, comma).trim(),
          description_snippet: firstMatch(block, /<p>([\s\S]*?)<\/p>/),
        },
      };
    })
    .filter((job) => job && job.title && !seen.has(job.source_id) && seen.add(job.source_id));
}

module.exports = { parseSrgJobs };
