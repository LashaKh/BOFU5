-- Check the current structure of approved_products table

-- 1. Check column nullability and constraints
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'approved_products'
    AND column_name IN ('research_result_id', 'product_id')
ORDER BY ordinal_position;

-- 2. Check all constraints on the table
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.approved_products'::regclass;

-- 3. Check if product_id column exists
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
        AND table_name = 'approved_products' 
        AND column_name = 'product_id'
) AS product_id_column_exists;

-- 4. Check foreign key constraints specifically
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
    AND tc.table_name = 'approved_products'
    AND tc.constraint_type = 'FOREIGN KEY';