<div align="center">
  <img src=".assets/banner.png" width="100%" alt="Daily Jobs Offers banner" />

  <p>
    <b>A production job-watch pipeline that scrapes and queries six Swiss job boards every morning, deduplicates and scores the results, and delivers a same-day digest with zero manual intervention.</b>
  </p>

  <p>
    <img src="https://img.shields.io/badge/status-production-2ea44f?style=for-the-badge" alt="Status: production" />
    <img src="https://img.shields.io/badge/n8n-EA4B71?style=for-the-badge&logo=n8n&logoColor=white" alt="n8n" />
    <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  </p>

  <p>
    <img src="https://img.shields.io/badge/-Overview-2b3137?style=flat-square" alt="Overview" />
    <img src="https://img.shields.io/badge/-Highlights-2b3137?style=flat-square" alt="Highlights" />
    <img src="https://img.shields.io/badge/-Architecture-2b3137?style=flat-square" alt="Architecture" />
    <img src="https://img.shields.io/badge/-Job%20Sources-2b3137?style=flat-square" alt="Job Sources" />
    <img src="https://img.shields.io/badge/-Data%20Model-2b3137?style=flat-square" alt="Data Model" />
    <img src="https://img.shields.io/badge/-Build%20%26%20Run-2b3137?style=flat-square" alt="Build & Run" />
    <img src="https://img.shields.io/badge/-Production%20Hardening-2b3137?style=flat-square" alt="Production Hardening" />
    <img src="https://img.shields.io/badge/-Deployment-2b3137?style=flat-square" alt="Deployment" />
    <img src="https://img.shields.io/badge/-Skills%20Demonstrated-2b3137?style=flat-square" alt="Skills Demonstrated" />
  </p>
</div>

<img src=".assets/divider.png" width="100%" alt="" />

<a name="overview"></a>
<h2 align="center">Overview</h2>

<div align="center">

Every morning at 8am, an n8n cron trigger walks through each active search profile, fans out one query per keyword, and hits six job boards in parallel: two scraped from raw HTML, two called through REST APIs, one reverse-engineered from an undocumented JSON endpoint, and one reached through a managed scraping actor. Results are filtered locally against the profile's keywords and Suisse romande locations, translated to French when needed, scored, and upserted into PostgreSQL. Anything new gets bundled into an HTML email digest; anything unread and unfavorited for more than 20 days is cleaned up automatically.

The interesting part isn't wiring six HTTP calls together. It's that every source lies about search relevance in a different way, so the pipeline can't trust any of them and re-filters everything itself in one shared node. It's discovering an undocumented search endpoint by reading a public site's network traffic. It's a translation bug that silently swapped job titles and descriptions for weeks before a user report led back to raw execution data in n8n's own SQLite store. None of this shows up in a demo, only in what breaks in production and how it gets diagnosed.

</div>

<img src=".assets/divider.png" width="100%" alt="" />

<a name="highlights"></a>
<h2 align="center">Highlights</h2>

This isn't a scraper that just fetches and stores. A handful of decisions separate a script that runs once from a pipeline that runs unattended, every day, without anyone checking the output first:

- **Every source is filtered twice, and only the pipeline's own filter is trusted.** Job boards claim keyword and location relevance but deliver noise: a "devops" search on Job-Room returns "Business Analyst," an Indeed "Suisse romande" search returns Zurich. A single shared `Filter by profile` node re-checks every result against the title (not just the description) and hard-excludes non-Romandie locations, applied uniformly across all six sources regardless of what each one claims to have already filtered.
- **A silent `console.log` swallowed a bug for weeks.** Adzuna and Jooble's normalization nodes logged unexpected API shapes and returned an empty array instead of failing loudly, which is exactly what hid a set of expired API keys until a routine credentials migration surfaced it. Both now `throw`, trading a single failed run for a bug that stays invisible.
- **Every allocation of state (a run, a translation call, an email send) fails without losing data.** A failed translation call falls back to the untranslated field instead of dropping the job. A failed email send leaves rows with `notified_at IS NULL` so they retry on the next run instead of vanishing. Deduplication survives a source reassigning IDs to republished listings, via an application-level `(title, company)` filter over the trailing 14 days that the database's `UNIQUE` constraint alone can't catch.
- **Secrets and deployment followed the same discipline as the code.** All third-party keys moved out of exported n8n workflow JSON into container environment variables read via `{{ $env.VAR }}` expressions, and the production host went from a hand-maintained file copy to a real `git clone` behind a deploy key scoped to read-only access on this one repository.

<img src=".assets/divider.png" width="100%" alt="" />

<a name="architecture"></a>
<h2 align="center">Architecture</h2>

```text
[n8n cron, 8:00]
    -> for each active search_profile
    -> for each keyword in the profile
        -> query the 6 sources in parallel
    -> raw extraction (shared fields + source-specific raw_extra)
    -> local filtering (keyword in title, Suisse romande location)
    -> language detection + DeepL translation to French if needed
    -> scoring (primary / secondary) and upsert into job_listings
    -> TTL cleanup (unread, non-favorited listings older than 20 days)
    -> HTML email digest of listings never notified before
```

- **n8n** is the only orchestration engine; there is no Airflow or external scheduler. Workflows are exported and versioned as deployable source, not just as a trace, in [`n8n/workflows/`](n8n/workflows/README.md).
- **PostgreSQL** is the single source of truth (`search_profiles`, `job_listings`), running as its own dedicated instance defined in [`docker-compose.yml`](docker-compose.yml), isolated from every other project on the host.
- **Metabase** is an existing, shared instance, not a per-project service: a scoped database connection lets it read and mark listings (favorite/read) without a custom front end.
- **Proton Mail Bridge**, running on the host outside this repo, is the only way to send the digest through a free Proton account, which has no direct SMTP access.

<img src=".assets/divider.png" width="100%" alt="" />

<a name="job-sources"></a>
<h2 align="center">Job Sources</h2>

<div align="center">

| Category | Sources | Example |
| --- | :---: | --- |
| HTML scraping | 2 | jobs.ch |
| REST API | 2 | Adzuna |
| Reverse-engineered endpoint | 1 | Job-Room |
| Managed actor | 1 | Indeed.ch |

</div>

<table width="100%">
<tr><th width="22%">Source</th><th>Integration notes<img src=".assets/spacer.png" width="900" height="1" alt="" /></th></tr>
<tr><td colspan="2" align="right"><img src=".assets/badges/html-scraping.png" height="22" alt="HTML Scraping" /></td></tr>
<tr><td align="center"><code>jobs.ch</code></td><td>Parsed from the page's <code>&lt;script type="application/ld+json"&gt;</code> block instead of CSS classes, since the structured JSON-LD is kept for SEO and survives layout changes that would break a CSS-based scraper.</td></tr>
<tr><td align="center"><code>jobup.ch</code></td><td>Same publisher and template as jobs.ch (JobCloud), same JSON-LD extraction logic. Canton filtering via a repeated <code>region</code> query parameter, with region codes found by brute-forcing IDs and reading each page's confirmation title.</td></tr>

<tr><td colspan="2" align="right"><img src=".assets/badges/rest-api.png" height="22" alt="REST API" /></td></tr>
<tr><td align="center">Jooble (<code>ch</code>)</td><td>Free self-service REST API, key embedded in the URL path.</td></tr>
<tr><td align="center">Adzuna (<code>ch</code>)</td><td>Free self-service REST API, authenticated with an <code>app_id</code>/<code>app_key</code> pair.</td></tr>

<tr><td colspan="2" align="right"><img src=".assets/badges/reverse-engineered.png" height="22" alt="Reverse-Engineered Endpoint" /></td></tr>
<tr><td align="center">Job-Room</td><td>The documented SECO API only lets an employer manage its own listings; the public search runs on an undocumented, unauthenticated endpoint (<code>POST jobadservice/api/jobAdvertisements/_search</code>) found by inspecting the search page's network traffic. Canton filtering parameters were recovered by triggering 400 errors that leaked the server-side DTO field names.</td></tr>

<tr><td colspan="2" align="right"><img src=".assets/badges/managed-actor.png" height="22" alt="Managed Actor" /></td></tr>
<tr><td align="center">Indeed.ch</td><td>Indeed's Publisher API was retired in 2023 and the site blocks non-browser requests directly. Integrated through Apify's <code>misceres/indeed-scraper</code> actor instead, which handles rendering and anti-bot on Apify's side and returns plain JSON, at roughly $0.006 per result, capped per keyword to stay inside the free monthly credit.</td></tr>
</table>

> [!WARNING]
> **No source's own filtering can be trusted.** Search relevance and location filters vary from strict-enough to nearly absent across all six sources, so `Filter by profile` re-applies keyword-in-title and Suisse romande matching locally to every result, regardless of what each source claims to have already filtered.

<img src=".assets/divider.png" width="100%" alt="" />

<a name="data-model"></a>
<h2 align="center">Data Model</h2>

Two tables carry the whole pipeline (see [`migrations/`](migrations) for the full history):

- **`search_profiles`** holds the search configuration (name, keywords, locations, minimum salary, active flag), edited manually in the database. Migrations create the schema, never the data.
- **`job_listings`** holds the collected listings, deduplicated by `UNIQUE(source, source_id)` through an `ON CONFLICT` upsert. Key columns: `match_score`/`match_category` (the primary/secondary scoring tier), `is_read`/`is_favorite` (manual marking, both exempt from cleanup), `notified_at` (tracked separately from `created_at` so a listing re-upserted on a later day is not silently skipped by the digest), and `raw_extra` (a JSONB field holding whatever each source exposes beyond the shared columns, with no fixed schema between sources).

> [!NOTE]
> **`notified_at` is not `created_at`.** A listing already in the database gets its `created_at` preserved across every re-upsert, so filtering the digest by "created today" quietly drops any listing whose first send attempt failed. `notified_at` is set only after a confirmed send, which is what actually decides whether a listing is still eligible for the next digest.

<img src=".assets/divider.png" width="100%" alt="" />

<a name="build--run"></a>
<h2 align="center">Build & Run</h2>

Requires Docker and Docker Compose.

```bash
cp .env.example .env
# fill in .env: Postgres passwords, API keys (Adzuna, Jooble, DeepL, Apify)

docker compose up -d
./scripts/apply_migrations.sh   # creates the schema and syncs application role passwords
```

n8n is reachable at `http://127.0.0.1:5678` by default (`N8N_LISTEN_ADDRESS`). Workflow JSON files under `n8n/workflows/` are not auto-imported on startup, see [Deployment](#deployment).

> [!IMPORTANT]
> **`search_profiles` must be populated by hand after the migrations run.** The migrations only create the schema; with no active search profile, the workflow runs every morning and does nothing, silently.

<img src=".assets/divider.png" width="100%" alt="" />

<a name="production-hardening"></a>
<h2 align="center">Production Hardening</h2>

A few of the constraints and trade-offs that only became visible once the pipeline was actually running unattended, not while reviewing the workflow logic in isolation.

> [!CAUTION]
> **A parameter collision silently swapped every translated title and description.** The DeepL translation node sent the title and the description as two body parameters both named `"text"`; n8n builds a form-urlencoded body from a key/value object, so the second entry overwrote the first and only the description ever reached DeepL. The stored `title` ended up as a translated description, something previously misdiagnosed as bad data from one specific source. Found by comparing raw source payloads against what n8n's own SQLite execution store had actually saved. Fixed by splitting the call into two sequential requests, each with a single unambiguous `text` parameter, and every affected row in `job_listings` was purged and repopulated rather than patched in place.

> [!WARNING]
> **One failed source fails the entire day's digest.** `Merge` combines all six source branches before anything downstream runs, so an unhandled error on any single source (a transient Adzuna 503, observed in production) fails the whole execution with no digest at all that day, rather than a partial one. A per-source `Continue On Fail` degrade-and-notify option was evaluated and explicitly not adopted, on the reasoning that a missing day beats a silently incomplete one.

> [!NOTE]
> **Least-privilege database roles exist but do nothing yet.** Dedicated `n8n_app`/`metabase_app` roles were created, but the `postgres:16` image's default `pg_hba.conf` trusts every local connection unconditionally, so giving those roles passwords would have no real effect until that file is hardened too. The actual protection in production is that the Postgres port is never exposed beyond `127.0.0.1`, not the role boundary; treated as an accepted trade-off given the data (public job listings) carries no real sensitivity.

> [!TIP]
> **`network_mode: host` exists for one reason: reaching localhost-only mail.** n8n runs with host networking, not a port mapping, because the email node has to reach Proton Mail Bridge's SMTP proxy, which only listens on the host's `127.0.0.1` and is unreachable from an isolated Docker network. `N8N_LISTEN_ADDRESS` is then pinned to the Tailscale interface, so host networking does not also mean n8n is reachable from the public internet.

<img src=".assets/divider.png" width="100%" alt="" />

<a name="repository-structure"></a>
<h2 align="center">Repository Structure</h2>

```text
docker-compose.yml         # db (Postgres) + n8n services
docker/n8n/                  n8n Dockerfile
migrations/                  Sequential SQL schema, applied once via schema_migrations
n8n/
  workflows/                  daily_jobs_offers.json, weekly_recap.json, deployable source of truth
  logic/                       Shared JS extracted from n8n Code nodes (per-source normalization, scoring)
  sql/                         Upsert / TTL queries used by the Postgres nodes
scripts/
  apply_migrations.sh          Applies migrations/*.sql and syncs application role passwords
  deploy_workflows.sh          Re-imports workflows into n8n after a git pull on the VPS
  renew_tailscale_cert.sh      VPS cron job, renews the Tailscale certificate
tests/
  db/                          Bash tests against a real Postgres instance (schema, dedup, TTL, roles)
  logic/                       Node.js unit tests for n8n/logic/*.js
```

<img src=".assets/divider.png" width="100%" alt="" />

<a name="deployment"></a>
<h2 align="center">Deployment</h2>

Git-based flow: edit locally, `git commit`/`push`, then on the target VPS, `git pull && ./scripts/deploy_workflows.sh`.

- n8n workflows are versioned as deployable source, not just a backup: [`n8n/workflows/README.md`](n8n/workflows/README.md) documents exactly what each exported JSON file contains and does not contain.
- No API key is ever written in clear text into an exported workflow; every third-party credential is read through `{{ $env.VAR }}` expressions, declared in `docker-compose.yml`, and set in a `.env` file that is never committed.
- `scripts/deploy_workflows.sh` reactivates each workflow according to its own JSON `active` field, since `n8n import:workflow` always deactivates whatever it imports, and then restarts n8n so the change takes effect.
- The deploy key used on the VPS is scoped to read-only access on this one repository, separate from full shell access to the server, so a leaked key exposes source code, not the machine.

<img src=".assets/divider.png" width="100%" alt="" />

<a name="tests"></a>
<h2 align="center">Tests</h2>

n8n's own workflow logic (Code nodes, graphical configuration) has no dedicated test framework, so the shared business logic is extracted into [`n8n/logic/`](n8n/logic) and unit tested there.

```bash
# Unit tests: per-source normalization, scoring, language detection
node --test tests/logic/

# Integration tests against a real database (requires: docker compose up -d db)
./tests/db/test_schema.sh
./tests/db/test_dedupe_constraint.sh
./tests/db/test_ttl_query.sh
./tests/db/test_upsert_query.sh
./tests/db/test_role_privileges.sh
```

<img src=".assets/divider.png" width="100%" alt="" />

<a name="skills-demonstrated"></a>
<h2 align="center">Skills Demonstrated</h2>

<table width="100%">
<tr><th>Area</th><th width="46%">What it looked like in practice<img src=".assets/spacer.png" width="900" height="1" alt="" /></th></tr>
<tr><td>Data engineering</td><td>Upsert-based deduplication, TTL-driven cleanup, and a scoring model that classifies rather than binary-rejects ambiguous results</td></tr>
<tr><td>API integration</td><td>Six heterogeneous integrations (HTML/JSON-LD scraping, REST APIs, an undocumented endpoint, a managed scraping actor), each normalized into one shared schema</td></tr>
<tr><td>Reverse engineering</td><td>Recovering an undocumented search endpoint and its filter parameters from network traffic and server error messages</td></tr>
<tr><td>Production debugging</td><td>Tracing a silent translation bug back to a raw execution store, past two layers of previously plausible but wrong explanations</td></tr>
<tr><td>Secure deployment</td><td>Moving secrets out of exported workflow files, scoping a dedicated read-only deploy key, migrating a hand-maintained VPS copy to a real git-based flow</td></tr>
<tr><td>Trade-off judgment</td><td>Documenting and accepting deliberate compromises (fail-fast over partial digests, precision over recall on keyword matching) instead of silently working around them</td></tr>
</table>

<img src=".assets/divider.png" width="100%" alt="" />

<div align="center">

<sub>Personal project · In production since August 2026</sub>

</div>
