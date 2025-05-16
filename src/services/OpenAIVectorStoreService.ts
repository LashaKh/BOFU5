import OpenAI from 'openai';

// Define an interface for the service, though for a single method it might be overkill for now.
// interface IOpenAIVectorStoreService {
//   createEmptyVectorStore(name: string, metadata?: Record<string, any>): Promise<OpenAI.VectorStore>;
// }

export class OpenAIVectorStoreService /* implements IOpenAIVectorStoreService */ {
  private client: OpenAI;

  constructor() {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      console.error("OpenAI API key is not set in environment variables (VITE_OPENAI_API_KEY).");
      // In a real application, you might want to prevent the service from being instantiated
      // or make the methods throw a more specific error if the key is missing.
      throw new Error("OpenAI API key is not configured. Ensure VITE_OPENAI_API_KEY is set in your .env file.");
    }
    this.client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
  }

  /**
   * Creates an empty vector store with the given name and optional metadata.
   * @param name The name of the vector store.
   * @param metadata Optional metadata to associate with the vector store. Max 16 key-value pairs, 512 bytes per key, 64KB per value.
   * @returns A promise that resolves to the created VectorStore object.
   * @throws Will throw an error if the API call fails or the API key is not configured.
   */
  async createEmptyVectorStore(
    name: string,
    metadata?: Record<string, any>
  ): Promise<OpenAI.VectorStore> {
    console.log(`Attempting to create OpenAI vector store with name: ${name}`);
    try {
      const vectorStore = await this.client.vectorStores.create({
        name,
        // Example of setting expiration policy if needed:
        // expires_after: {
        //   anchor: "last_active_at",
        //   days: 7, // Vector store will be automatically deleted if not active for 7 days.
        // },
        metadata, // OpenAI API supports metadata for vector stores
      });
      console.log(`Successfully created vector store with ID: ${vectorStore.id}. Name: ${vectorStore.name}`);
      return vectorStore;
    } catch (error) {
      console.error("Failed to create OpenAI vector store:", error);
      // Enhance error handling as needed, e.g., custom error types, logging to a monitoring service.
      if (error instanceof OpenAI.APIError) {
        console.error('OpenAI API Error Details:', {
          status: error.status,
          message: error.message,
          code: error.code,
          type: error.type,
        });
      }
      throw error; 
    }
  }

  // Placeholder for future methods related to vector stores:

  /**
   * Retrieves a specific vector store by its ID.
   * @param vectorStoreId The ID of the vector store to retrieve.
   * @returns A promise that resolves to the VectorStore object.
   */
  // async getVectorStore(vectorStoreId: string): Promise<OpenAI.VectorStore> { ... }

  /**
   * Lists all vector stores.
   * @param params Optional parameters for listing, like limit and order.
   * @returns A promise that resolves to a list of VectorStore objects.
   */
  // async listVectorStores(params?: OpenAI.VectorStoreListParams): Promise<OpenAI.VectorStore[]> { ... }

  /**
   * Deletes a specific vector store by its ID.
   * @param vectorStoreId The ID of the vector store to delete.
   * @returns A promise that resolves to the deletion status.
   */
  // async deleteVectorStore(vectorStoreId: string): Promise<OpenAI.VectorStoreDeleted> { ... }

  // Add methods for managing files within vector stores if needed later
  // e.g., client.vectorStores.fileBatches.create(vectorStoreId, { file_ids: [...] })
  // e.g., client.vectorStores.files.uploadAndPoll(vectorStoreId, file)
}

// Example of how to use the service (can be removed or kept for local testing):
// This self-invoking async function is for demonstration and testing purposes.
// Ensure to set OPENAI_API_KEY in your .env file when testing locally.
/*
(async () => {
  // This check ensures the example usage only runs in a Node.js development environment
  // and not, for example, in a browser bundle if this file were to be included there directly.
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') { // This block is for Node.js local testing, so process.env is fine here.
    try {
      console.log('Running OpenAIVectorStoreService example usage...');
      // Ensure OPENAI_API_KEY is set in your .env file for this test to run.
      // You might need a .env loading mechanism like `dotenv` package if running this script directly.
      // require('dotenv').config(); // Example if using dotenv

      // THIS EXAMPLE BLOCK STILL USES process.env.OPENAI_API_KEY as it's intended for Node.js execution, not browser.
      // If you were to run this example *from the browser context directly through this file*, it would fail.
      // The main class constructor uses import.meta.env for browser compatibility.
      if (!process.env.OPENAI_API_KEY) { 
        console.warn('OPENAI_API_KEY (for Node.js example) or VITE_OPENAI_API_KEY (for browser app) is not set. Skipping example usage if Node.js key missing.');
        return;
      }

      const service = new OpenAIVectorStoreService(); // This will use VITE_OPENAI_API_KEY if called from browser context
      const uniqueStoreName = `Test Product Store - ${new Date().toISOString()}`;
      const productMetadata = { 
        productId: `prod_${Date.now()}`,
        environment: 'development_test' 
      };

      console.log(`Example: Creating vector store with name: ${uniqueStoreName}`);
      const newStore = await service.createEmptyVectorStore(uniqueStoreName, productMetadata);
      console.log("Example: Test store created successfully:", {
        id: newStore.id,
        name: newStore.name,
        status: newStore.status,
        created_at: new Date(newStore.created_at * 1000).toISOString(), // Convert UNIX timestamp to ISO string
        metadata: newStore.metadata,
      });
    } catch (e) {
      console.error("Error in OpenAIVectorStoreService example usage:", e);
    }
  }
})();
*/
