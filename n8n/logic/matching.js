function searchableText(listing) {
  const extraText = Object.values(listing.rawExtra || {})
    .filter((v) => typeof v === 'string')
    .join(' ');
  return `${listing.title} ${extraText}`.toLowerCase();
}

function matchedKeywords(listing, profile) {
  const text = searchableText(listing);
  return profile.keywords.filter((kw) => text.includes(kw.toLowerCase()));
}

const CANTON_CODE_BY_LOCATION = {
  'genève': 'ge',
  'lausanne': 'vd',
  'neuchâtel': 'ne',
};

function locationMatches(listing, profile) {
  const location = (listing.location || '').toLowerCase();
  return profile.locations.some((loc) => {
    const locLower = loc.toLowerCase();
    if (location.includes(locLower)) return true;
    const cantonCode = CANTON_CODE_BY_LOCATION[locLower];
    return cantonCode ? new RegExp(`\\b${cantonCode}\\b`, 'i').test(location) : false;
  });
}

const GERMAN_MARKERS = /\b(und|für|mit|Kenntnisse|Erfahrung|Bewerbung|Mitarbeiter|Aufgaben|Anforderungen|gesucht|Unternehmen|suchen)\b/gi;
const ITALIAN_MARKERS = /\b(azienda|competenze|candidatura|cercasi|offriamo|esperienza|conoscenza|richiesta)\b/gi;

function detectForeignLanguage(listing) {
  const text = searchableText(listing);
  const germanHits = (text.match(GERMAN_MARKERS) || []).length;
  const italianHits = (text.match(ITALIAN_MARKERS) || []).length;
  if (germanHits >= 2) return 'de';
  if (italianHits >= 2) return 'it';
  return null;
}

function matchesProfile(listing, profile) {
  return matchedKeywords(listing, profile).length > 0 && locationMatches(listing, profile);
}

module.exports = { matchesProfile, matchedKeywords, detectForeignLanguage };
