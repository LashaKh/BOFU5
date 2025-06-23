import { toast } from 'react-hot-toast';
import { CompetitorItem, CompetitorsData, ProductAnalysis, defaultProduct } from '../types/product/types';

const MAX_RETRIES = 3;
const INITIAL_TIMEOUT = 30000; // 30 seconds for initial request
const POLLING_INTERVAL = 20000; // 20 seconds between polling attempts
const MAX_POLLING_ATTEMPTS = 18; // 6 minutes total polling time (18 * 20s = 360s = 6min)
const RETRY_DELAY = 2000; // 2 seconds

// Status webhook URL
const STATUS_WEBHOOK_URL = 'https://hook.us2.make.com/rmzvmqog3kgfird29egtx9yyowrmtnqe';

interface WebhookOptions {
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  pollingInterval?: number;
  maxPollingAttempts?: number;
}

interface WebhookResponse {
  trackingId?: string;
  status?: 'pending' | 'completed' | 'failed';
  result?: any;
}

// Helper function to safely parse JSON strings
function safeJSONParse(str: string): any {
  try {
    return JSON.parse(str);
  } catch (e) {
    return str;
  }
}

// Helper function to detect completion status from various response formats
function isCompleted(response: any): boolean {
  try {
    // If response is a string, try to parse it
    const data = typeof response === 'string' ? safeJSONParse(response) : response;

    // Direct status check
    if (data?.status === 'completed') {
      console.log('Detected completion via direct status check');
      return true;
    }

    // If data has a result field that's a string (like JSON string), try to parse it
    if (typeof data?.result === 'string') {
      // Try to parse the result if it looks like JSON
      if (data.result.trim().startsWith('{') || data.result.trim().startsWith('[')) {
        try {
          const parsedResult = JSON.parse(data.result);
          // If parsing succeeded and we have data, consider it completed
          if (parsedResult && typeof parsedResult === 'object') {
            console.log('Detected completion via parsed result field');
            return true;
          }
        } catch (e) {
          // If parsing failed, check if the string itself indicates completion
          console.log('Failed to parse result JSON string, checking string content');
        }
      }
    }

    // If data is an object with a result field, consider it completed
    if (data?.result && typeof data.result === 'object') {
      console.log('Detected completion via result object');
      return true;
    }

    // Check for completion indicators in string format
    if (typeof data === 'string') {
      const lowerStr = data.toLowerCase();
      if (lowerStr.includes('status":"completed') || 
          lowerStr.includes('status": "completed') ||
          lowerStr.includes('"completed"')) {
        console.log('Detected completion via string content');
        return true;
      }
    }

    return false;
  } catch (error) {
    console.warn('Error in completion check:', error);
    return false;
  }
}

// Helper function to clean JSON string from markdown code blocks
function cleanJSONString(str: string): string {
  try {
    // Remove markdown code block markers and any whitespace before/after
    str = str.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    
    // If the string starts with a newline, remove it
    str = str.replace(/^\n+/, '');
    
    // If the string ends with a newline, remove it
    str = str.replace(/\n+$/, '');
    
    return str;
  } catch (error) {
    console.warn('Error cleaning JSON string:', error);
    return str;
  }
}

// Helper function to extract result data from various response formats
function extractResult(response: any): any {
  try {
    // If response is a string, try to parse it
    const data = typeof response === 'string' ? safeJSONParse(response) : response;

    // If data has a result field that's a string (like JSON string), try to parse it
    if (data?.result && typeof data.result === 'string') {
      // Clean the result string from markdown code block markers
      const cleanedResult = cleanJSONString(data.result);
      
      // Try to parse the cleaned result if it looks like JSON
      if (cleanedResult.trim().startsWith('{') || cleanedResult.trim().startsWith('[')) {
        try {
          const parsedResult = JSON.parse(cleanedResult);
          console.log('Successfully parsed cleaned JSON result');
          return parsedResult;
        } catch (e) {
          console.warn('Failed to parse cleaned JSON string:', e);
          // If parsing fails, try to clean it further and parse again
          try {
            const furtherCleaned = cleanedResult.replace(/\\n/g, '\n').replace(/\\/g, '');
            const parsedResult = JSON.parse(furtherCleaned);
            console.log('Successfully parsed further cleaned JSON result');
            return parsedResult;
          } catch (e2) {
            console.warn('Failed to parse further cleaned JSON string:', e2);
            return cleanedResult;
          }
        }
      }
      return data.result;
    }

    // If there's a result field, return it
    if (data?.result) {
      return data.result;
    }

    // If status is completed, remove status and trackingId fields and return the rest
    if (data?.status === 'completed') {
      const { status, trackingId, ...result } = data;
      return Object.keys(result).length > 0 ? result : data;
    }

    // Return the whole response as a fallback
    return data;
  } catch (error) {
    console.warn('Error extracting result:', error);
    return response;
  }
}

async function pollForResults(trackingId: string, options: WebhookOptions = {}): Promise<any> {
  const {
    pollingInterval = POLLING_INTERVAL,
    maxPollingAttempts = MAX_POLLING_ATTEMPTS
  } = options;

  let attempts = 0;
  let lastResponse = null;

  while (attempts < maxPollingAttempts) {
    try {
      console.log(`Polling attempt ${attempts + 1}/${maxPollingAttempts} for trackingId: ${trackingId}`);
      
      const response = await fetch(`${STATUS_WEBHOOK_URL}?trackingId=${trackingId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Polling failed with status: ${response.status}`);
      }

      // Get raw text first to handle both JSON and non-JSON responses
      const rawResponse = await response.text();
      let data: any;
      
      try {
        data = JSON.parse(rawResponse);
      } catch (e) {
        console.warn('Response is not valid JSON:', rawResponse);
        data = rawResponse;
      }

      console.log(`Polling response:`, data);

      // Store this response
      lastResponse = data;

      // Check for completion using robust detection
      if (isCompleted(data)) {
        console.log('Completion detected, stopping poll');
        return extractResult(data);
      }

      // Check for explicit failure status
      if (data?.status === 'failed') {
        throw new Error('Processing failed on the server');
      }

      // If not completed or failed, continue polling
      console.log(`Status still pending, waiting ${pollingInterval/1000} seconds before next attempt`);
      await new Promise(resolve => setTimeout(resolve, pollingInterval));
      attempts++;
    } catch (error) {
      console.error('Polling error:', error);
      // If we have a last successful response and it indicated completion, return it
      if (lastResponse && isCompleted(lastResponse)) {
        console.log('Returning last successful response after error');
        return extractResult(lastResponse);
      }
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      attempts++;
    }
  }

  // If we have a last response and it looks complete, return it even if we hit the timeout
  if (lastResponse && isCompleted(lastResponse)) {
    console.log('Returning last successful response after timeout');
    return extractResult(lastResponse);
  }

  throw new Error('Polling timeout exceeded');
}

export async function makeWebhookRequest(
  url: string,
  payload: any,
  options: WebhookOptions = {}
): Promise<any> {
  const {
    timeout = INITIAL_TIMEOUT,
    maxRetries = MAX_RETRIES,
    retryDelay = RETRY_DELAY
  } = options;

  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        console.log('Sending initial webhook request');
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // Special handling for CORS errors
          if (response.status === 0) {
            throw new Error('CORS error: The request was blocked. Please check if the webhook URL is correct and supports CORS.');
          }
          throw new Error(`Server responded with status: ${response.status}`);
        }

        // Get raw text first
        const rawResponse = await response.text();
        let initialData: any;
        
        try {
          initialData = JSON.parse(rawResponse);
        } catch (e) {
          console.warn('Initial response is not valid JSON:', rawResponse);
          initialData = rawResponse;
        }

        console.log('Initial webhook response:', initialData);

        // Check if we have a tracking ID
        const trackingId = typeof initialData === 'object' ? initialData?.trackingId : null;
        
        if (trackingId) {
          console.log('Received tracking ID, starting polling:', trackingId);
          const result = await pollForResults(trackingId, options);
          console.log('Final result:', result);
          return result;
        }

        // If no tracking ID but response indicates completion, return results
        if (isCompleted(initialData)) {
          const result = extractResult(initialData);
          console.log('Final result:', result);
          return result;
        }

        // Return raw response as fallback
        return initialData;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      attempt++;
      console.error(`Attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        throw error;
      }

      if (
        error instanceof Error && (
          error.name === 'AbortError' ||
          error.message.includes('network') ||
          error.message.includes('timeout')
        )
      ) {
        console.log(`Attempt ${attempt} failed, retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }

      throw error;
    }
  }

  throw new Error('Max retries exceeded');
}

export type { CompetitorItem, CompetitorsData, ProductAnalysis };
export { defaultProduct }; 