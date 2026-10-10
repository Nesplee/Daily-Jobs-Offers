// Alerte email quand une source échoue. Une source interrogée par mot-clé et
// par ville (15 requêtes) qui tombe en panne ne doit donner qu'UNE ligne :
// l'ancienne version listait chaque requête échouée avec 500 caractères de
// page d'erreur HTML et annonçait "14 source(s) en échec" pour Adzuna seule.

const MAX_REASON_LENGTH = 160;

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// n8n formate une erreur HTTP en '503 - "<corps>"' ou, via Axios, en
// "Request failed with status code 429" : le code suffit, pas le corps.
function failureReason(message) {
  const text = String(message || '');
  const status = text.match(/\b([45]\d{2}) - /) || text.match(/status code ([45]\d{2})/);
  if (status) return 'HTTP ' + status[1];
  const clean = text.replace(/<[^>]*>/g, ' ').replace(/(\\+n|\s)+/g, ' ').trim();
  return clean.length > MAX_REASON_LENGTH ? clean.slice(0, MAX_REASON_LENGTH).trim() + '…' : clean;
}

// markers : [{ source, message, failed?, total? }]. Un marqueur sans compteur
// vaut une requête échouée. Renvoie null s'il n'y a rien à signaler.
function summarizeSourceErrors(markers) {
  const bySource = new Map();
  for (const marker of markers) {
    const entry = bySource.get(marker.source)
      || { source: marker.source, failed: 0, total: 0, reason: failureReason(marker.message) };
    entry.failed += marker.failed || 1;
    entry.total += marker.total || marker.failed || 1;
    bySource.set(marker.source, entry);
  }
  if (bySource.size === 0) return null;

  const lines = [...bySource.values()].map((e) =>
    `<li><b>${escapeHtml(e.source)}</b> — ${e.failed}/${e.total} requête(s) en échec (${escapeHtml(e.reason)})</li>`);
  return {
    subject: `Annonces: ${bySource.size} source(s) en échec aujourd'hui`,
    html: `<p>Le digest quotidien a continué sans ces sources :</p><ul>${lines.join('')}</ul>`,
  };
}

module.exports = { failureReason, summarizeSourceErrors };
