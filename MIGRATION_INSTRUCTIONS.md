# Migration Instructions for Approved Products Table

## Important: Database Migration Required

Before testing the new approval functionality, you need to run the database migration to update the `approved_products` table structure.

### Steps to Apply Migration:

1. **Using Supabase Dashboard:**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Open and run the migration file: `supabase/migrations/20250126_modify_approved_products_table.sql`

2. **Using Supabase CLI:**
   ```bash
   supabase db push
   ```

### What This Migration Does:

- Makes `research_result_id` nullable (no longer required)
- Adds a new `product_id` column that references the `products` table
- Adds a check constraint ensuring either `research_result_id` OR `product_id` is present (but not both)
- Creates necessary indexes for performance

### After Migration:

- Products approved from the **Research Results page** will use `research_result_id`
- Products approved from the **Product Page** will use `product_id`
- Both types will appear in the admin dashboard's approved products section

### Rollback (if needed):

```sql
-- Remove the new column and constraints
ALTER TABLE public.approved_products DROP COLUMN IF EXISTS product_id;
ALTER TABLE public.approved_products DROP CONSTRAINT IF EXISTS check_has_source_id;
ALTER TABLE public.approved_products ALTER COLUMN research_result_id SET NOT NULL;
```