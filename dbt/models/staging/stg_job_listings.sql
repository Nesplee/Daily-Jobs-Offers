-- Une ligne par annonce collectée (source, source_id), dans son dernier état
-- connu, y compris celles que le nettoyage n8n a supprimées depuis.

with latest as (
    select distinct on (id) *
    from {{ ref('job_listings_snapshot') }}
    order by id, dbt_valid_from desc
)

select
    l.id as listing_id,
    l.source,
    l.title,
    l.company,
    l.location,
    c.canton,
    l.url,
    l.keywords_matched,
    l.match_category,
    l.posted_at,
    l.created_at as first_seen_at,
    l.last_checked_at,
    coalesce(l.dbt_is_deleted = 'True', false) as is_deleted,
    -- Description complète (workflow n8n enrich_descriptions) et sa
    -- provenance : detail_page, search (Indeed) ou duplicate:<source>.
    nullif(l.raw_extra ->> 'description_full', '') as description_full,
    l.raw_extra ->> 'description_source' as description_source,
    l.raw_extra ->> 'description_fetch_error' as description_fetch_error,
    -- Identité métier, mêmes fonctions que le dédoublonnage du digest
    -- (migration 006) : la même offre arrive par plusieurs sources, et
    -- Jooble lui donne un nouvel identifiant à chaque passage. Sans
    -- employeur connu, l'annonce reste seule.
    coalesce(
        public.dedup_company(l.company) || '|' || public.dedup_title(l.title),
        l.id::text
    ) as offer_key,
    -- Texte où chercher les compétences : intitulé et toutes les variantes
    -- de description que les sources exposent (souvent un simple extrait).
    regexp_replace(
        concat_ws(' ',
            l.title,
            l.raw_extra ->> 'title_original',
            l.raw_extra ->> 'description_full',
            l.raw_extra ->> 'description_fr',
            l.raw_extra ->> 'description_snippet',
            l.raw_extra ->> 'description'
        ),
        '&nbsp;|<[^>]+>', ' ', 'g'
    ) as search_text
from latest l
left join lateral (
    select a.canton
    from {{ ref('canton_aliases') }} a
    where l.location ~* a.pattern
    order by a.priority
    limit 1
) c on true
