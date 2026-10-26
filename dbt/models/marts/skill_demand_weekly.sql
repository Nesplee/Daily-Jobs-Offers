-- Évolution hebdomadaire : sur les offres apparues chaque semaine, part de
-- celles qui citent chaque compétence.

with weekly_offers as (
    select date_trunc('week', first_seen_at)::date as week, count(*) as offers
    from {{ ref('int_offers') }}
    group by 1
),

weekly_skills as (
    select date_trunc('week', first_seen_at)::date as week, skill, category, count(*) as offers
    from {{ ref('int_offer_skills') }}
    group by 1, 2, 3
)

select
    ws.week,
    ws.skill,
    ws.category,
    ws.offers,
    wo.offers as total_offers,
    round(100.0 * ws.offers / wo.offers, 1) as share_pct
from weekly_skills ws
join weekly_offers wo using (week)
