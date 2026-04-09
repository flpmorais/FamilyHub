-- Allow 'text' as a recipe import method (matches RecipeImportMethod TS type
-- in src/types/recipe.types.ts and the text-extraction flow in recipe-add-modal.tsx).
alter table public.recipes
  drop constraint if exists recipes_import_method_check;

alter table public.recipes
  add constraint recipes_import_method_check
  check (import_method in ('manual', 'url', 'youtube', 'ocr', 'text'));
