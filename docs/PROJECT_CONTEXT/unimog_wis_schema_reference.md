# 🛠️ Supabase WIS System --- Developer Reference

## 📑 Tables

### `wis_parts`

-   **Keys**: `id (uuid, pk)`, `part_number (unique)`
-   **Columns**:
    -   `part_name text not null`\
    -   `category text`\
    -   `subcategory text`\
    -   `description text`\
    -   `notes text`\
    -   `media jsonb` ← array of
        `{type, bucket, file_name, description}`\
    -   `updated_at timestamptz`

### `wis_procedures`

-   **Keys**: `id (uuid, pk)`, `procedure_code (unique)`
-   **Columns**:
    -   `title text not null`\
    -   `category text`\
    -   `subcategory text`\
    -   `description text`\
    -   `content text`\
    -   `steps jsonb`\
    -   `tools_required text[]`\
    -   `safety_warnings text[]`\
    -   `media jsonb`\
    -   `updated_at timestamptz`

### `wis_bulletins`

-   **Keys**: `id (uuid, pk)`, `bulletin_number (unique)`
-   **Columns**:
    -   `title text not null`\
    -   `category text`\
    -   `severity text`\
    -   `description text`\
    -   `content text`\
    -   `issue_date date`\
    -   `status text`\
    -   `media jsonb`\
    -   `updated_at timestamptz`

### `wis_documents_unified` (view)

-   **Purpose**: unified search index across all three tables
-   **Columns**: `doc_id`, `doc_type`, `ref`, `title`, `content`,
    `media`, `updated_at`

### `wis_chunks`

-   **Purpose**: retrieval-augmented search for long documents
-   **Columns**:
    -   `doc_id`, `doc_type`, `ref`, `title`\
    -   `chunk_index int`\
    -   `content text`\
    -   `media jsonb`\
    -   `updated_at`

------------------------------------------------------------------------

## ⚙️ RPC Functions

-   `wis_import_parts(payload jsonb[])`\
-   `wis_import_procedures(payload jsonb[])`\
-   `wis_import_bulletins(payload jsonb[])`

→ Bulk load JSON into the respective tables.

-   `wis_search(q text, limit_rows int default 10)`\
    → Returns ranked chunks from `wis_chunks`.

-   `wis_media_url(bucket text, file_name text, expires_in int)`\
    → Returns signed URL for a file in storage.

------------------------------------------------------------------------

## 🪣 Buckets

-   `wis-photos` → JPEG\
-   `wis-diagrams` → PDF\
-   `wis-schematics` → PNG/PDF\
-   `wis-tables` → PDF\
-   `wis-charts` → PDF

Media JSON structure example:

``` json
[
  {
    "type": "diagram",
    "bucket": "wis-diagrams",
    "file_name": "U435-OM352-001_exploded_view.pdf",
    "description": "Exploded view of OM352 engine"
  }
]
```

------------------------------------------------------------------------

## 🔍 Integration Workflow

1.  **Search**:

    ``` sql
    select * from wis_search('oil filter change');
    ```

    Returns doc snippets + media references.

2.  **Resolve media**:

    ``` sql
    select wis_media_url('wis-diagrams', 'U435-OM352-001_exploded_view.pdf', 3600);
    ```

    Returns signed URL (valid 1h).

3.  **Frontend**:

    -   Show title, excerpt, difficulty, etc.\
    -   Render inline images (photos, schematics).\
    -   Link to PDFs (tables, diagrams).\
    -   "Open full doc" → fetch all chunks for the `doc_id`.

------------------------------------------------------------------------

## ✅ Developer Notes

-   **Unique keys** enforce no duplicate imports.\
-   **`wis_chunks`** must be rebuilt after each full import.\
-   **Barry**:
    -   Calls `wis_search` for query.\
    -   Fetches signed URLs via `wis_media_url`.\
    -   Streams response with inline diagrams/photos.
