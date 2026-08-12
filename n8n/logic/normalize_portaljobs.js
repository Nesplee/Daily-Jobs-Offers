function normalizePortalJobsItem(raw) {
  return {
    source: 'portal.jobs',
    source_id: raw.id,
    title: raw.jobTitle,
    company: raw.employerName || null,
    url: raw.jobUrl,
    location: raw.city || null,
    posted_at: raw.publishedAt ? raw.publishedAt.slice(0, 10) : null,
    raw_extra: {
      languages: raw.languages || null,
      salary_range: raw.salaryRange || null,
    },
  };
}

module.exports = { normalizePortalJobsItem };
