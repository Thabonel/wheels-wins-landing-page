# 🚚 Unimog WIS Import & Integration Guide

**Mercedes-Benz Workshop Information System → Supabase + Barry AI**

This guide explains exactly how to take a raw Mercedes-Benz WIS
extraction for any Unimog model (e.g., U417, U437, U1300L) and import it
into Supabase so it's usable in the **Workshop Database** and **Barry
(AI Mechanic)**.

------------------------------------------------------------------------

## 📦 1. Required Inputs

For each Unimog model extraction you must have:

-   `parts.json` --- flat array of all parts (with media references)\
-   `procedures.json` --- flat array of all procedures (with steps,
    tools, warnings, media)\
-   `bulletins.json` --- flat array of service bulletins (with severity,
    descriptions, media)\
-   `media/` directory with subfolders:
    -   `photos/` (JPEG)\
    -   `diagrams/` (PDF)\
    -   `schematics/` (PNG/PDF)\
    -   `tables/` (PDF)\
    -   `charts/` (PDF)

Each record in JSON **must reference filenames that exist in these
folders**.

------------------------------------------------------------------------

## 🗂 2. Supabase Tables

You already have these tables:

-   `wis_parts`\
-   `wis_procedures`\
-   `wis_bulletins`\
-   `wis_documents_unified` (view)\
-   `wis_chunks` (for RAG search)

All include a `media jsonb` column for linking to files.

------------------------------------------------------------------------

## 🪣 3. Supabase Buckets

Media is uploaded into 5 fixed buckets:

-   `wis-photos`\
-   `wis-diagrams`\
-   `wis-schematics`\
-   `wis-tables`\
-   `wis-charts`

✅ These are already created and populated for U435. Reuse them for
other models.

------------------------------------------------------------------------

## ⚙️ 4. Import Pipeline

### Step 1. Copy files into project

``` bash
cp /Volumes/UnimogManuals/UXXX-COMPLETE-EXTRACT/parts.json ./uxxx_parts.json
cp /Volumes/UnimogManuals/UXXX-COMPLETE-EXTRACT/procedures.json ./uxxx_procedures.json
cp /Volumes/UnimogManuals/UXXX-COMPLETE-EXTRACT/bulletins.json ./uxxx_bulletins.json
```

### Step 2. Upload media

``` bash
node upload-media.js
```

This will push all images/diagrams/etc into the correct buckets.

### Step 3. Import JSON

``` bash
node import.js
```

This calls the RPC functions (`wis_import_parts`,
`wis_import_procedures`, `wis_import_bulletins`) and loads data into
Supabase.

------------------------------------------------------------------------

## 🔍 5. Verify Counts

Run this SQL:

``` sql
select 'wis_parts' as table, count(*) from public.wis_parts
union all
select 'wis_procedures', count(*) from public.wis_procedures
union all
select 'wis_bulletins', count(*) from public.wis_bulletins;
```

Expected ballpark counts per model:\
- Parts: 2,000--5,000\
- Procedures: 600--900\
- Bulletins: 100--150

------------------------------------------------------------------------

## ✂️ 6. Rebuild Chunks

After import, regenerate `wis_chunks`:

``` sql
truncate table public.wis_chunks;

with params as (
  select 300::int as tgt_tokens, 60::int as ov_tokens
),
docs as (
  select
    d.doc_id, d.doc_type, d.ref, d.title, d.content, d.media, d.updated_at,
    length(d.content) as L
  from public.wis_documents_unified d
),
cfg as (
  select
    (tgt_tokens * 4) as chunk_chars,
    ((tgt_tokens - ov_tokens) * 4) as step_chars
  from params
),
series as (
  select
    doc_id, doc_type, ref, title, media, updated_at, L,
    (select chunk_chars from cfg) as chunk_chars,
    (select step_chars  from cfg) as step_chars,
    generate_series(0, greatest(0, (L - 1) / (select step_chars from cfg))) as chunk_index
  from docs
),
chunks as (
  select
    s.doc_id, s.doc_type, s.ref, s.title, s.media, s.updated_at, s.chunk_index,
    substring(d.content from (s.chunk_index * s.step_chars + 1) for s.chunk_chars) as content
  from series s
  join docs d using (doc_id, doc_type, ref, title, media, updated_at, L)
)
insert into public.wis_chunks (doc_id, doc_type, ref, title, chunk_index, content, media, updated_at)
select doc_id, doc_type, ref, title, chunk_index, content, media, updated_at
from chunks
where content is not null and length(content) > 0;
```

------------------------------------------------------------------------

## 🤖 7. How Barry Uses This

-   Queries `wis_search(q)` for relevant docs.\
-   Loads full chunks for the selected `doc_id`.\
-   For each `media` entry, calls `wis_media_url(bucket, file_name)` to
    get signed URLs.\
-   Renders inline images and links for PDFs.\
-   UI shows excerpts + media + "Open full doc" option.

------------------------------------------------------------------------

## 🔁 8. Repeat for Each Model

For each new Unimog model: 1. Place JSON + media export in a new
folder.\
2. Copy into project (`uxxx_parts.json` etc.).\
3. Run `node upload-media.js`.\
4. Run `node import.js`.\
5. Verify counts in Supabase.\
6. Rebuild `wis_chunks`.\
7. Confirm Barry can search and display docs.

------------------------------------------------------------------------

## ✅ Summary

This pipeline is now standardized.\
- **Inputs:** JSON + media per model\
- **Storage:** Supabase tables + buckets\
- **Processing:** RPC import + chunk rebuild\
- **Output:** Searchable, illustrated workshop database for Barry & the
web app

Each new model can be fully integrated in **\~1 day**.
