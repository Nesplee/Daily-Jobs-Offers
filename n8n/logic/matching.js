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

function locationMatches(listing, profile) {
  const location = (listing.location || '').toLowerCase();
  return profile.locations.some((loc) => location.includes(loc.toLowerCase()));
}

const GERMAN_MARKERS = /\b(und|für|mit|Kenntnisse|Erfahrung|Bewerbung|Mitarbeiter|Aufgaben|Anforderungen|gesucht|Unternehmen|suchen)\b/gi;
const ITALIAN_MARKERS = /\b(azienda|competenze|candidatura|cercasi|offriamo|esperienza|conoscenza|richiesta)\b/gi;

function isAllowedLanguage(listing) {
  const text = searchableText(listing);
  const germanHits = (text.match(GERMAN_MARKERS) || []).length;
  const italianHits = (text.match(ITALIAN_MARKERS) || []).length;
  return germanHits < 2 && italianHits < 2;
}

function matchesProfile(listing, profile) {
  return matchedKeywords(listing, profile).length > 0 && locationMatches(listing, profile) && isAllowedLanguage(listing);
}

module.exports = { matchesProfile, matchedKeywords, isAllowedLanguage };
