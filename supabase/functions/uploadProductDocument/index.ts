import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import OpenAI from 'https://deno.land/x/openai@v4.33.0/mod.ts'; // Reverted to original working SDK import

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // IMPORTANT: For production, restrict this to your app's domain e.g., 'https://yourapp.com'
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', // Only POST and OPTIONS are needed for this function
};

console.log('Edge function `uploadProductDocument` initializing...');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request (CORS preflight)');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Received new request for file upload.');
    // Parse the multipart/form-data request
    const formData = await req.formData();
    const file = formData.get('file') as File | null; // The uploaded file
    const vectorStoreId = formData.get('vectorStoreId') as string | null; // The ID of the target Vector Store

    // Validate input
    if (!file) {
      console.error('File not provided in form data.');
      return new Response(JSON.stringify({ error: 'File not provided.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    if (!vectorStoreId) {
      console.error('Vector Store ID not provided in form data.');
      return new Response(JSON.stringify({ error: 'Vector Store ID not provided.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Retrieve the OpenAI API key from environment variables (set in Supabase dashboard)
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error('CRITICAL: OPENAI_API_KEY environment variable not set for the Edge Function.');
      return new Response(JSON.stringify({ error: 'Server configuration error.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500, // Internal Server Error
      });
    }

    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    console.log(`Processing file: ${file.name}, Size: ${file.size} bytes, Type: ${file.type}`);
    console.log(`Target Vector Store ID: ${vectorStoreId}`);

    // Step 1: Upload the file to OpenAI's general file storage
    console.log('Uploading file to OpenAI...');
    const uploadedFile = await openai.files.create({
      file: file, // Deno's File object is compatible
      purpose: 'assistants', // Using 'assistants' as a general purpose for files used by assistants/vector stores
    });
    console.log(`File successfully uploaded to OpenAI. File ID: ${uploadedFile.id}`);

    // Step 2: Add the uploaded file to the specified Vector Store via manual API call
    console.log(`Attempting to add File ID ${uploadedFile.id} to Vector Store ID ${vectorStoreId} via manual API call...`);

    const vectorStoreFileUrl = `https://api.openai.com/v1/vector_stores/${vectorStoreId}/files`;
    const body = JSON.stringify({ file_id: uploadedFile.id });

    try {
      const response = await fetch(vectorStoreFileUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2', // Crucial header for beta APIs
        },
        body: body,
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('Error response from OpenAI when adding file to vector store:', responseData);
        return new Response(JSON.stringify({
          message: 'File uploaded to OpenAI, but failed to add to Vector Store.',
          uploadedFileId: uploadedFile.id,
          errorDetails: responseData,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: response.status,
        });
      }

      console.log('File successfully associated with Vector Store via API. Details:', responseData);

      return new Response(JSON.stringify({ 
        message: 'File uploaded and added to Vector Store successfully via manual API call.',
        uploadedFileId: uploadedFile.id,
        vectorStoreFileAssociation: responseData, // Contains id of the association and status
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });

    } catch (fetchError) {
      console.error('Network or other error during manual fetch to OpenAI vector store API:', fetchError);
      return new Response(JSON.stringify({
        message: 'File uploaded to OpenAI, but a network/fetch error occurred when adding to Vector Store.',
        uploadedFileId: uploadedFile.id,
        error: fetchError.message,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

  } catch (error) {
    console.error('Error during file upload and processing:', error);
    let errorMessage = 'Failed to process file upload.';
    if (error.response && error.response.data && error.response.data.error && error.response.data.error.message) {
      errorMessage = error.response.data.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

console.log('Edge function `uploadProductDocument` is ready to serve requests.');
