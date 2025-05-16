// This file can be used to store shared TypeScript types and interfaces

// Define the Product type based on the Supabase schema
export interface Product {
  id: string; // uuid
  user_id: string; // uuid
  name: string;
  description?: string | null;
  openai_vector_store_id?: string | null;
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

// You can add other shared types here as your project grows
