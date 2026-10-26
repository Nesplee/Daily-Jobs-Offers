-- Une ligne par offre réelle : les annonces d'une même offre venues de
-- plusieurs sources (ou recrawlées sous un autre identifiant) sont réunies.

select
    offer_key,
    min(title) as title,
    min(company) as company,
    mode() within group (order by canton) as canton,
    array_agg(distinct source order by source) as sources,
    count(*) as listings,
    bool_or(match_category = 'primary') as is_primary,
    min(first_seen_at) as first_seen_at,
    max(last_checked_at) as last_seen_at,
    bool_and(is_deleted) as is_gone,
    string_agg(search_text, ' ') as search_text
from {{ ref('stg_job_listings') }}
group by offer_key
