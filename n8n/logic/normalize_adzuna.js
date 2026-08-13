function normalizeAdzunaItem(raw) {
  return {
    source: 'adzuna.ch',
    source_id: raw.id,
    title: raw.title,
    company: raw.company ? raw.company.display_name : null,
    url: raw.redirect_url,
    location: raw.location ? raw.location.display_name : null,
    posted_at: raw.created ? raw.created.slice(0, 10) : null,
    raw_extra: {
      description_snippet: raw.description || null,
      salary_min: raw.salary_min || null,
      salary_max: raw.salary_max || null,
      contract_type: raw.contract_type || null,
      contract_time: raw.contract_time || null,
      category: raw.category ? raw.category.label : null,
      description_full: raw.fullDescription || null,
    },
  };
}

module.exports = { normalizeAdzunaItem };
