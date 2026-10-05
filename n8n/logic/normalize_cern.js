function normalizeCernPosting(raw) {
  const location = raw.location || {};
  return {
    source: 'cern.ch',
    source_id: raw.id,
    title: raw.name,
    company: raw.company ? raw.company.name : 'CERN',
    url: 'https://jobs.smartrecruiters.com/CERN/' + raw.id,
    location: [location.city, location.region].filter(Boolean).join(', ') || null,
    posted_at: raw.releasedDate ? raw.releasedDate.slice(0, 10) : null,
    raw_extra: {
      ref_number: raw.refNumber || null,
      department: raw.department ? raw.department.label : null,
      function: raw.function ? raw.function.label : null,
      contract_time: raw.typeOfEmployment ? raw.typeOfEmployment.label : null,
      experience_level: raw.experienceLevel ? raw.experienceLevel.label : null,
    },
  };
}

module.exports = { normalizeCernPosting };
