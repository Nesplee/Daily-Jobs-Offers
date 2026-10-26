-- Part des annonces de chaque source qui ont une description complète, et
-- d'où elle vient. Une source dont la couverture chute signale une page de
-- détail qui a changé de structure (voir aussi fetch_errors).

select
    source,
    count(*) as listings,
    count(description_full) as with_full_description,
    round(100.0 * count(description_full) / count(*), 1) as coverage_pct,
    count(*) filter (where description_source = 'detail_page') as from_detail_page,
    count(*) filter (where description_source = 'search') as from_search,
    count(*) filter (where description_source like 'duplicate:%') as from_duplicate,
    percentile_cont(0.5) within group (order by length(description_full))::int as median_length,
    count(description_fetch_error) filter (where description_full is null) as fetch_errors
from {{ ref('stg_job_listings') }}
where not is_deleted
group by source
