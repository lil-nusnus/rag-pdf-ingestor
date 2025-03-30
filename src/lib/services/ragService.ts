import { generateEmbeddings, generateResponse } from './ollamaService';
import { queryVectorStore } from './vectorStore';

// Process a user query using RAG
export async function processQuery(query) {
  try {
    // Step 1: Generate embedding for the query
    const embeddingResult = await generateEmbeddings(query);
    if (!embeddingResult.success) {
      throw new Error(`Failed to generate embedding: ${embeddingResult.error}`);
    }
    
    // Step 2: Retrieve relevant documents from the vector store
    const retrievalResult = await queryVectorStore(embeddingResult.embeddings[0]);
    if (!retrievalResult.success) {
      throw new Error(`Failed to retrieve documents: ${retrievalResult.error}`);
    }
    
    // Step 3: Format the prompt with context
    const contextText = retrievalResult.sources.map(s => s.content).join('\n\n');
    const promptTemplate = `
    You are a helpful assistant that answers questions based on the provided context.
    
    Context:
    ${contextText}
    
    Question: ${query}
    
    Answer the question based on the context provided. If you don't know the answer from the context, say so.
    `;
    
    // Step 4: Generate response from LLM with context
    const responseResult = await generateResponse(promptTemplate);
    if (!responseResult.success) {
      throw new Error(`Failed to generate response: ${responseResult.error}`);
    }
    
    return {
      success: true,
      answer: responseResult.response,
      sources: retrievalResult.sources
    };
  } catch (error) {
    console.error('Error processing query:', error);
    return { success: false, error: error.message };
  }
}