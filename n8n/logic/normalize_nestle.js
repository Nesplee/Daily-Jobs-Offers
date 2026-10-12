// Sites Nestlé de Suisse romande, avec leur canton : le flux ne donne que
// "Orbe, CH", et sans canton "Filter by profile" écarterait les localités qui
// ne sont pas des villes du profil (Orbe, Henniez, Broc...).
const NESTLE_SITES = {
  Vevey: 'VD',
  Lausanne: 'VD',
  'La Tour-de-Peilz': 'VD',
  Orbe: 'VD',
  Henniez: 'VD',
  Avenches: 'VD',
  Romont: 'FR',
  Broc: 'FR',
};

const MAX_DESCRIPTION_LENGTH = 3000;

function cdata(xml, tag) {
  const m = xml.match(new RegExp('<' + tag + '>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</' + tag + '>'));
  return m ? m[1] : '';
}

function plainText(html) {
  return String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

// Flux RSS public du site carrières (SuccessFactors) : 20 offres au plus par
// requête et pas de pagination, d'où une requête par site ("Nestlé sites").
// Le titre porte le lieu entre parenthèses : "Data Analyst (Orbe, CH)",
// "Ingénieur-e Projet (Broc, CH, 1636)". L'identifiant stable est le dernier
// segment numérique du lien, dont on retire les paramètres de suivi.
function parseNestleFeed(xml) {
  return String(xml || '')
    .split('<item>')
    .slice(1)
    .map((item) => {
      const link = cdata(item, 'link').replace(/&amp;/g, '&').split('?')[0];
      const id = (link.match(/\/(\d+)\/?$/) || [])[1];
      if (!id) return null;
      const rawTitle = plainText(cdata(item, 'title'));
      const place = (rawTitle.match(/\(([^()]*)\)\s*$/) || [])[1] || null;
      const city = place ? place.split(',')[0].trim() : null;
      const canton = NESTLE_SITES[city];
      // Hors de Suisse, le code pays se confond avec un canton romand
      // ("Pontarlier, FR", "Tbilisi, GE") : on ne garde que la ville.
      const abroad = place && !place.split(',').some((part) => part.trim() === 'CH');
      const date = new Date(cdata(item, 'pubDate'));
      return {
        source: 'nestle.com',
        source_id: id,
        title: place ? rawTitle.slice(0, rawTitle.lastIndexOf('(')).trim() : rawTitle,
        company: 'Nestlé',
        url: link,
        location: canton ? city + ', ' + canton : (abroad ? city + ' (étranger)' : place),
        posted_at: Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10),
        raw_extra: {
          description: plainText(cdata(item, 'description')).slice(0, MAX_DESCRIPTION_LENGTH) || null,
        },
      };
    })
    .filter((job) => job && job.title);
}

module.exports = { parseNestleFeed, NESTLE_SITES };
