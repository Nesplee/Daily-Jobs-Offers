function normalizeJoobleItem(raw) {
  return {
    source: 'jooble.ch',
    source_id: raw.id,
    title: raw.title,
    company: raw.company || null,
    url: raw.link,
    location: raw.location || null,
    posted_at: raw.updated ? raw.updated.slice(0, 10) : null,
    raw_extra: {
      description_snippet: raw.snippet || null,
      salary: raw.salary || null,
      type: raw.type || null,
      source_name: raw.source || null,
      description_full: raw.fullDescription || null,
    },
  };
}

module.exports = { normalizeJoobleItem };
