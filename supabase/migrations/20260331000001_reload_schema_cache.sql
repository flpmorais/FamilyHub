-- Force PostgREST schema cache reload after icons table creation
NOTIFY pgrst, 'reload schema';
