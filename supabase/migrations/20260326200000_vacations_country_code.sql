-- Migration 016: Add country_code to vacations

ALTER TABLE vacations
  ADD COLUMN country_code text NOT NULL DEFAULT 'PT';
