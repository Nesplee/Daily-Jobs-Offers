-- Une ligne par (offre, compétence citée). Une offre qui ne cite aucune
-- compétence connue n'apparaît pas ici.

select
    o.offer_key,
    o.first_seen_at,
    s.skill,
    s.category
from {{ ref('int_offers') }} o
join {{ ref('skills') }} s on o.search_text ~* s.pattern
