function normalizeJobchListing(raw) {
  return {
    source: 'jobs.ch',
    source_id: raw.id,
    title: raw.title,
    company: raw.company,
    url: raw.url,
    location: raw.location,
    posted_at: raw.postedDate || null,
    raw_extra: {
      contract_type: raw.contractType || null,
      remote: raw.remote || null,
      description: raw.description || null,
      description_full: raw.fullDescription || null,
    },
  };
}

module.exports = { normalizeJobchListing };
