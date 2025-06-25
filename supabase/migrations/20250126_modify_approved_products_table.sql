-- Modify approved_products table to accept either research_result_id OR product_id

-- First, drop the existing foreign key constraint on research_result_id
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

-- Update RLS policies if needed (example - adjust based on your actual policies)
-- This ensures users can insert/update/delete approved products for both types