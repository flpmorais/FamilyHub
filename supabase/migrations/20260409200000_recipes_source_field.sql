-- Add `source` (free-text attribution) alongside existing `source_url` (link).
-- On URL import we extract og:site_name into `source`; both fields are user-editable.

ALTER TABLE recipes ADD COLUMN source text;
