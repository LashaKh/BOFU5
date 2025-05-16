// supabase/functions/removeDocumentFromVectorStore/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req: Request) => {
  // Handle OPTIONS preflight request for CORS
  if (req.method === 'OPTIONS') {
    console.log('Received OPTIONS request');
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('removeDocumentFromVectorStore function invoked.');

  try {
    const requestBody = await req.json();
    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    const { vector_store_id, openai_vsf_id } = requestBody;

    console.log(`Received vector_store_id: ${vector_store_id}, openai_vsf_id: ${openai_vsf_id}`);

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OPENAI_API_KEY is not set.');
      throw new Error('OPENAI_API_KEY is not set in environment variables.');
    }
    console.log('OPENAI_API_KEY is present.');

    if (!vector_store_id) {
      console.error('vector_store_id is missing from request.');
      return new Response(JSON.stringify({ error: 'vector_store_id is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    if (!openai_vsf_id) {
      console.error('openai_vsf_id is missing from request.');
      return new Response(JSON.stringify({ error: 'openai_vsf_id is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const deleteUrl = `https://api.openai.com/v1/vector_stores/${vector_store_id}/files/${openai_vsf_id}`;
    console.log(`Constructed OpenAI delete URL: ${deleteUrl}`);

    console.log('Attempting to delete file from OpenAI...');
    const response = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'OpenAI-Beta': 'assistants=v2',
        'Content-Type': 'application/json',
      },
    });

    console.log(`OpenAI API response status: ${response.status}, statusText: ${response.statusText}`);

    if (!response.ok) {
      const errorDataText = await response.text(); // Read as text first for better error visibility
      console.error(`OpenAI API error response text: ${errorDataText}`);
      let errorDataJson;
      try {
        errorDataJson = JSON.parse(errorDataText);
      } catch (e) {
        errorDataJson = { message: response.statusText, details: errorDataText };
      }
      throw new Error(`OpenAI API error (${response.status}): ${errorDataJson.error?.message || JSON.stringify(errorDataJson)}`);
    }

    const responseData = await response.json();
    console.log('OpenAI API response data:', JSON.stringify(responseData, null, 2));

    if (responseData.deleted) {
      console.log('File successfully removed from OpenAI Vector Store.');
      return new Response(JSON.stringify({ message: 'File successfully removed from OpenAI Vector Store.', deletionDetails: responseData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    } else {
      console.warn('OpenAI did not confirm deletion or file might have been already deleted.');
      return new Response(JSON.stringify({ message: 'OpenAI did not confirm deletion or file might have been already deleted.', openai_response: responseData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }
  } catch (error) {
    console.error('Error in removeDocumentFromVectorStore catch block:', error.message, error.stack);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
