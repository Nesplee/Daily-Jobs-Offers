-- Part des offres qui citent chaque compétence, sur tout l'historique et
-- sur les 30 derniers jours. Attention : beaucoup de sources n'exposent qu'un
-- extrait de description, ces parts sont donc des minimums.

with totals as (
    select
        count(*) as offers,
        count(*) filter (where first_seen_at >= current_date - 30) as offers_30d
    from {{ ref('int_offers') }}
)

select
    s.skill,
    s.category,
    count(os.offer_key) as offers,
    round(100.0 * count(os.offer_key) / nullif(t.offers, 0), 1) as share_pct,
    count(os.offer_key) filter (where os.first_seen_at >= current_date - 30) as offers_30d,
    round(
        100.0 * count(os.offer_key) filter (where os.first_seen_at >= current_date - 30)
        / nullif(t.offers_30d, 0),
        1
    ) as share_30d_pct,
    min(os.first_seen_at)::date as first_seen,
    max(os.first_seen_at)::date as last_seen
from {{ ref('skills') }} s
left join {{ ref('int_offer_skills') }} os on os.skill = s.skill
cross join totals t
group by s.skill, s.category, t.offers, t.offers_30d
