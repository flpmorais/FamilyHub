-- Remove category_id from task templates (tasks no longer filtered by category)
ALTER TABLE task_templates DROP COLUMN IF EXISTS category_id;
