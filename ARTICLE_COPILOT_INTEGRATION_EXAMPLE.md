# Article AI Co-Pilot with Product Knowledge Base Selector

## What's New

The Article AI Co-Pilot now includes a **Product Knowledge Base Selector dropdown** allowing users to dynamically choose which product's knowledge base to use for enhanced AI assistance.

## Key Features

✅ **Dynamic Product Selection**: Users can switch between different product knowledge bases
✅ **Smart Filtering**: Only shows products that have OpenAI vector stores configured
✅ **Visual Indicators**: Clear indicators show when KB is connected and which product is selected
✅ **Conversation Persistence**: Thread management maintains context within product sessions
✅ **Fallback Support**: Graceful fallback to basic OpenAI when no product is selected

## Usage Example

```tsx
// With dropdown selector (recommended):
<ArticleAICoPilot
  isVisible={showCoPilot}
  onToggle={() => setShowCoPilot(!showCoPilot)}
  articleContent={articleContent}
  articleTitle={articleTitle}
  productId="optional-default-product-id" // Optional: Pre-select a product
  onSuggestion={(suggestion) => console.log(suggestion)}
/>

// Basic usage (still works):
<ArticleAICoPilot
  isVisible={showCoPilot}
  onToggle={() => setShowCoPilot(!showCoPilot)}
  articleContent={articleContent}
  articleTitle={articleTitle}
  // Users can select from dropdown
/>
```

## User Interface

### **Product Knowledge Base Selector**
- **Dropdown button** shows currently selected product or "Select Knowledge Base"
- **Green pulsing dot** indicates active knowledge base connection
- **Product list** shows all products with vector stores configured
- **Basic AI option** available for general content assistance

### **Visual States**
- **With Product Selected**: 
  - Green "KB" badge in header with pulsing dot
  - Product name displayed in selector
  - Header shows "Enhanced with Product Knowledge"
  - Console logs: "🧠 Using templated assistant with knowledge base"

- **No Product Selected**:
  - Gray dot in selector
  - "Select Knowledge Base" placeholder text
  - Header shows "Article Writing Assistant" 
  - Console logs: "🤖 Using fallback OpenAI API (no product context)"

### **Dropdown Options**
- **Basic AI Assistant**: No product knowledge base
- **Product Names**: Each product shows name and description
- **Smart Filtering**: Only products with `openai_vector_store_id` appear
- **Empty State**: Helpful message when no products have knowledge bases

## How It Works

### With Product ID:
1. User types question about article
2. System enhances message with article context
3. Calls your `/api/chat` endpoint
4. Uses your `VITE_UNIVERSAL_ASSISTANT_ID` 
5. Connects to product's vector store
6. Returns knowledge-enhanced response
7. Maintains conversation thread for context

### Without Product ID:
1. Falls back to direct OpenAI API calls
2. Uses simplified system prompt
3. No knowledge base access
4. Basic content writing assistance

## Thread Management

- Each Co-Pilot session maintains an `assistantThreadId`
- Thread persists for the entire component session
- Enables context-aware conversations
- Thread resets when component unmounts

## Error Handling

- Graceful fallback to basic OpenAI if `/api/chat` fails
- Intelligent fallback responses for common topics (SEO, engagement, etc.)
- Clear error logging for debugging

## Next Steps

To complete the integration:

1. **Update parent components** to pass `productId` when available
2. **Test with actual product IDs** that have vector stores
3. **Verify knowledge base responses** are more relevant than basic AI
4. **Consider caching thread IDs** for longer sessions if needed

This integration ensures your Article Co-Pilot now leverages the same powerful assistant and knowledge base that your product chatbots use, providing more relevant and context-aware content suggestions.