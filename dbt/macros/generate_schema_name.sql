-- Un schéma explicite (config schema=...) est utilisé tel quel au lieu d'être
-- préfixé par celui de la cible ("dbt_dev_snapshots"). Le snapshot doit
-- toujours écrire dans le même schéma "snapshots", quelle que soit la cible :
-- c'est un historique unique, pas un artefact à recalculer.
{% macro generate_schema_name(custom_schema_name, node) -%}
    {%- if custom_schema_name is none -%}
        {{ target.schema }}
    {%- else -%}
        {{ custom_schema_name | trim }}
    {%- endif -%}
{%- endmacro %}
