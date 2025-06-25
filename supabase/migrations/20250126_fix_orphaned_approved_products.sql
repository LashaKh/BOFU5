-- Fix orphaned approved_products records before modifying the table structure

-- First, let's identify orphaned records
DO $$
DECLARE
    orphaned_count INTEGER;
BEGIN
    -- Count orphaned records
    SELECT COUNT(*) INTO orphaned_count
    FROM public.approved_products ap
    LEFT JOIN public.research_results rr ON ap.research_result_id = rr.id
    WHERE rr.id IS NULL;
    
    RAISE NOTICE 'Found % orphaned approved_products records', orphaned_count;
    
    -- Delete orphaned records (approved products that reference non-existent research_results)
    DELETE FROM public.approved_products
    WHERE research_result_id NOT IN (
        SELECT id FROM public.research_results
    );
    
    RAISE NOTICE 'Cleaned up orphaned records';
END $$;

-- Now proceed with the original migration

-- Drop the existing foreign key constraint on research_result_id
ALTER TABLE public.approved_products 
DROP CONSTRAINT IF EXISTS approved_products_research_result_id_fkey;

-- Make research_result_id nullable since we might use product_id instead
ALTER TABLE public.approved_products 
ALTER COLUMN research_result_id DROP NOT NULL;

-- Add product_id column that references the products table
ALTER TABLE public.approved_products 
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE CASCADE;

-- Re-add the foreign key constraint for research_result_id but make it optional
ALTER TABLE public.approved_products 
ADD CONSTRAINT approved_products_research_result_id_fkey 
FOREIGN KEY (research_result_id) REFERENCES public.research_results(id) ON DELETE CASCADE;

-- Add a check constraint to ensure either research_result_id OR product_id is present (but not both)
ALTER TABLE public.approved_products 
ADD CONSTRAINT check_has_source_id 
CHECK (
  (research_result_id IS NOT NULL AND product_id IS NULL) OR 
  (research_result_id IS NULL AND product_id IS NOT NULL)
);

-- Create indexes for the new column
CREATE INDEX IF NOT EXISTS idx_approved_products_product_id ON public.approved_products(product_id);

-- Show final status
DO $$
DECLARE
    total_count INTEGER;
    with_research_count INTEGER;
    with_product_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_count FROM public.approved_products;
    SELECT COUNT(*) INTO with_research_count FROM public.approved_products WHERE research_result_id IS NOT NULL;
    SELECT COUNT(*) INTO with_product_count FROM public.approved_products WHERE product_id IS NOT NULL;
    
    RAISE NOTICE 'Migration complete. Total approved products: %, With research_result_id: %, With product_id: %', 
                 total_count, with_research_count, with_product_count;
END $$;