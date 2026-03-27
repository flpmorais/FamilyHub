import { Column, ColumnType, Schema, Table } from '@powersync/react-native';

// migration 001 — families table
// Note: 'id' column is implicit in PowerSync — do NOT include it here
const familiesTable = new Table({
  name: 'families',
  columns: [
    new Column({ name: 'name', type: ColumnType.TEXT }),
    new Column({ name: 'created_at', type: ColumnType.TEXT }),
    new Column({ name: 'updated_at', type: ColumnType.TEXT }),
  ],
});

// migration 001/002 — user_accounts table
const userAccountsTable = new Table({
  name: 'user_accounts',
  columns: [
    new Column({ name: 'google_id', type: ColumnType.TEXT }),
    new Column({ name: 'email', type: ColumnType.TEXT }),
    new Column({ name: 'family_id', type: ColumnType.TEXT }),
    new Column({ name: 'profile_id', type: ColumnType.TEXT }),
    new Column({ name: 'created_at', type: ColumnType.TEXT }),
    new Column({ name: 'updated_at', type: ColumnType.TEXT }),
  ],
});

// migration 001/009 — profiles table (status, email, role added in 009)
const profilesTable = new Table({
  name: 'profiles',
  columns: [
    new Column({ name: 'display_name', type: ColumnType.TEXT }),
    new Column({ name: 'avatar_url', type: ColumnType.TEXT }),
    new Column({ name: 'family_id', type: ColumnType.TEXT }),
    new Column({ name: 'status', type: ColumnType.TEXT }),
    new Column({ name: 'email', type: ColumnType.TEXT }),
    new Column({ name: 'role', type: ColumnType.TEXT }),
    new Column({ name: 'created_at', type: ColumnType.TEXT }),
    new Column({ name: 'updated_at', type: ColumnType.TEXT }),
  ],
});

// migration 015 — vacations table
const vacationsTable = new Table({
  name: 'vacations',
  columns: [
    new Column({ name: 'family_id', type: ColumnType.TEXT }),
    new Column({ name: 'title', type: ColumnType.TEXT }),
    new Column({ name: 'country_code', type: ColumnType.TEXT }),
    new Column({ name: 'destination', type: ColumnType.TEXT }),
    new Column({ name: 'cover_image_url', type: ColumnType.TEXT }),
    new Column({ name: 'departure_date', type: ColumnType.TEXT }),
    new Column({ name: 'return_date', type: ColumnType.TEXT }),
    new Column({ name: 'lifecycle', type: ColumnType.TEXT }),
    new Column({ name: 'is_pinned', type: ColumnType.INTEGER }),
    new Column({ name: 'created_at', type: ColumnType.TEXT }),
    new Column({ name: 'updated_at', type: ColumnType.TEXT }),
  ],
});

// migration 015 — vacation_participants join table
const vacationParticipantsTable = new Table({
  name: 'vacation_participants',
  columns: [
    new Column({ name: 'vacation_id', type: ColumnType.TEXT }),
    new Column({ name: 'profile_id', type: ColumnType.TEXT }),
    new Column({ name: 'created_at', type: ColumnType.TEXT }),
  ],
});

// migration 018 — booking_tasks table
const bookingTasksTable = new Table({
  name: 'booking_tasks',
  columns: [
    new Column({ name: 'vacation_id', type: ColumnType.TEXT }),
    new Column({ name: 'family_id', type: ColumnType.TEXT }),
    new Column({ name: 'title', type: ColumnType.TEXT }),
    new Column({ name: 'task_type', type: ColumnType.TEXT }),
    new Column({ name: 'deadline_days', type: ColumnType.INTEGER }),
    new Column({ name: 'due_date', type: ColumnType.TEXT }),
    new Column({ name: 'is_complete', type: ColumnType.INTEGER }),
    new Column({ name: 'profile_id', type: ColumnType.TEXT }),
    new Column({ name: 'created_at', type: ColumnType.TEXT }),
    new Column({ name: 'updated_at', type: ColumnType.TEXT }),
  ],
});

// migration 20260326230000 — packing_items table
const packingItemsTable = new Table({
  name: 'packing_items',
  columns: [
    new Column({ name: 'vacation_id', type: ColumnType.TEXT }),
    new Column({ name: 'family_id', type: ColumnType.TEXT }),
    new Column({ name: 'title', type: ColumnType.TEXT }),
    new Column({ name: 'status', type: ColumnType.TEXT }),
    new Column({ name: 'profile_id', type: ColumnType.TEXT }),
    new Column({ name: 'quantity', type: ColumnType.INTEGER }),
    new Column({ name: 'notes', type: ColumnType.TEXT }),
    new Column({ name: 'category_id', type: ColumnType.TEXT }),
    new Column({ name: 'created_at', type: ColumnType.TEXT }),
    new Column({ name: 'updated_at', type: ColumnType.TEXT }),
  ],
});

// migration 20260327000000 — categories table
const categoriesTable = new Table({
  name: 'categories',
  columns: [
    new Column({ name: 'family_id', type: ColumnType.TEXT }),
    new Column({ name: 'name', type: ColumnType.TEXT }),
    new Column({ name: 'icon', type: ColumnType.TEXT }),
    new Column({ name: 'active', type: ColumnType.INTEGER }),
    new Column({ name: 'created_at', type: ColumnType.TEXT }),
    new Column({ name: 'updated_at', type: ColumnType.TEXT }),
  ],
});

// migration 20260327000000 — tags table
const tagsTable = new Table({
  name: 'tags',
  columns: [
    new Column({ name: 'family_id', type: ColumnType.TEXT }),
    new Column({ name: 'name', type: ColumnType.TEXT }),
    new Column({ name: 'color', type: ColumnType.TEXT }),
    new Column({ name: 'active', type: ColumnType.INTEGER }),
    new Column({ name: 'created_at', type: ColumnType.TEXT }),
    new Column({ name: 'updated_at', type: ColumnType.TEXT }),
  ],
});

// migration 20260327000000 — packing_item_tags join table
const packingItemTagsTable = new Table({
  name: 'packing_item_tags',
  columns: [
    new Column({ name: 'packing_item_id', type: ColumnType.TEXT }),
    new Column({ name: 'tag_id', type: ColumnType.TEXT }),
  ],
});

export const POWERSYNC_SCHEMA = new Schema([
  familiesTable,
  userAccountsTable,
  profilesTable,
  vacationsTable,
  vacationParticipantsTable,
  bookingTasksTable,
  packingItemsTable,
  categoriesTable,
  tagsTable,
  packingItemTagsTable,
]);
