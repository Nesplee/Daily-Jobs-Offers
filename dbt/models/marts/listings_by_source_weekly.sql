-- Apport de chaque source par semaine. exclusive_offers compte les offres
-- que seule cette source a trouvées : une source sans offre exclusive
-- n'apporte rien que les autres n'aient déjà.

with offer_sources as (
    select offer_key, cardinality(sources) = 1 as is_exclusive
    from {{ ref('int_offers') }}
)

select
    date_trunc('week', l.first_seen_at)::date as week,
    l.source,
    count(*) as listings,
    count(distinct l.offer_key) as offers,
    count(distinct l.offer_key) filter (where os.is_exclusive) as exclusive_offers
from {{ ref('stg_job_listings') }} l
join offer_sources os using (offer_key)
group by 1, 2
