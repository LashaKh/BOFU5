import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

interface ContentBrief {
  id: string;
  brief_content: string;
  version: string;
  status: 'draft' | 'edited' | 'approved' | 'rejected';
  updated_at: string;
  created_at: string;
  user_id: string;
}

export async function updateContentBrief(
  briefId: string,
  content: string,
  version: string
): Promise<ContentBrief> {
  const { data, error } = await supabase
    .from('content_briefs')
    .update({
      brief_content: content,
      version,
      status: 'edited',
      updated_at: new Date().toISOString()
    })
    .eq('id', briefId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update content brief: ${error.message}`);
  }

  return data;
}
