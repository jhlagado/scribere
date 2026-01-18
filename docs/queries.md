# Query Specification

Queries are the **only** selection mechanism in Scribere. Templates never decide what exists; queries select records, and templates stamp them into HTML.

This document defines the query schema, how queries are stored, and the required built‑ins.

---

## 1. Storage and ownership

Queries live in the instance folder at:

```
content/queries.json
```

Queries are instance‑owned. The build reads only from `content/queries.json` and fails if it is missing.

---

## 2. Query object schema

Each query is a JSON object keyed by name:

```json
{
  "latest-posts": {
    "source": "blog",
    "status": "published",
    "sort": "date-desc",
    "limit": 25
  }
}
```

Allowed fields:

- `source` (required): `blog`
- `status`: one of `draft`, `review`, `published`, `archived`
- `tag`: a single tag value
- `series`: a single series value
- `year`, `month`, `day`: exact match values
- `ordinal`: exact match value
- `sort`: `date-asc`, `date-desc`, `ordinal-asc`, `ordinal-desc`
- `limit`: integer limit

### Equality rules

All filters are exact match with AND semantics. Month and day may be zero‑padded strings or integers as long as they resolve to the same numeric value.

### Range rules

Ranges are allowed only for numeric/date fields and are expressed as objects:

```json
"day": { "from": 1, "to": 7 }
```

---

## 3. Required built‑in queries

The system must define these names, even if templates don’t use them yet.

### `latest-posts`
Most recent published articles.

```json
{ "source": "blog", "status": "published", "sort": "date-desc", "limit": 25 }
```

### `all-published-posts`
All published articles in chronological order.

```json
{ "source": "blog", "status": "published", "sort": "date-asc" }
```

### `posts-by-day`
All published posts for a specific day.

```json
{ "source": "blog", "status": "published", "year": "<YYYY>", "month": "<MM>", "day": "<DD>", "sort": "ordinal-asc" }
```

### `posts-by-tag`
All published posts for a tag (newest first).

```json
{ "source": "blog", "status": "published", "tag": "<tag>", "sort": "date-desc" }
```

### `posts-by-series`
All published posts in a series (oldest first).

```json
{ "source": "blog", "status": "published", "series": "<series>", "sort": "date-asc" }
```

---

## 4. Recommended built‑ins

These are optional but strongly encouraged for navigation and archives:

- `posts-by-month`
- `posts-by-year`
- `all-tags`
- `all-series`

Keep the names stable. If you want a new view, add a new query and a template rather than overloading an existing name.
