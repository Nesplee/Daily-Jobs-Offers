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

function matchesProfile(listing, profile) {
  return matchedKeywords(listing, profile).length > 0 && locationMatches(listing, profile);
}

module.exports = { matchesProfile, matchedKeywords };
