-- Employeurs qui publient le plus d'offres correspondant aux profils.

select
    public.dedup_company(company) as company_key,
    min(company) as company,
    count(*) as offers,
    count(*) filter (where is_primary) as primary_offers,
    count(*) filter (where not is_gone) as open_offers,
    array_agg(distinct canton) filter (where canton is not null) as cantons,
    min(first_seen_at)::date as first_seen,
    max(last_seen_at)::date as last_seen
from {{ ref('int_offers') }}
where public.dedup_company(company) is not null
group by 1
