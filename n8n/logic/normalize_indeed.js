function splitCreator(creator) {
  if (!creator) return { company: null, location: null };
  const parts = creator.split(' - ');
  if (parts.length < 2) return { company: creator, location: null };
  return { company: parts[0].trim(), location: parts.slice(1).join(' - ').trim() };
}

function normalizeIndeedItem(raw) {
  const { company, location } = splitCreator(raw.creator);
  return {
    source: 'indeed.ch',
    source_id: raw.guid,
    title: raw.title,
    company,
    url: raw.link,
    location,
    posted_at: new Date(raw.pubDate).toISOString().slice(0, 10),
    raw_extra: {
      description_snippet: raw.contentSnippet || null,
      description_full: raw.fullDescription || null,
    },
  };
}

module.exports = { normalizeIndeedItem };
