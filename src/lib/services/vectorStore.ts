import { ChromaClient, OllamaEmbeddingFunction } from 'chromadb';
import { json } from 'stream/consumers';

// Initialize ChromaDB client
let chromaClient;
let collection;
// Function to initialize the ChromaDB collection
export async function initializeVectorStore() {
  try {
    chromaClient = new ChromaClient({
        path: 'http://localhost:8000',
    });

    collection = await chromaClient.getOrCreateCollection({
      name: "local_documents",
      embeddingFunction: new OllamaEmbeddingFunction({
        model: 'mxbai-embed-large',
        url: 'http://localhost:11434',
      }),
    });
    return collection;
  } catch (error) {
    console.error('Error initializing vector store:', error);
    return { success: false, error: error.message };
  }
}

// Function to add document chunks to the vector store
export async function addToVectorStore(docs, embeddings) {
  try {
    if (!collection) {
      await initializeVectorStore();
    }
    
    const ids = [];
    const metadatas = [];
    const documents = [];
    
    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i];
      ids.push(`${doc.metadata.source}-${i}`);
      metadatas.push({ ...doc.metadata, chunk: i });
      documents.push(doc.pageContent);
    }
    
    await collection.add({
      ids,
      metadatas,
      documents,
      embeddings
    });
    
    return { success: true, count: docs.length };
  } catch (error) {
    console.error('Error adding to vector store:', error);
    return { success: false, error: error.message };
  }
}

export async function queryVectorStore(queryEmbedding, limit = 5) {
  try {
    await initializeVectorStore();
    
    // Ensure queryEmbedding is properly formatted (should be a 2D array)
    const formattedQueryEmbedding = Array.isArray(queryEmbedding) 
      ? queryEmbedding 
      : [queryEmbedding];
    const results = await collection.query({
      queryEmbeddings: [formattedQueryEmbedding],
      nResults: limit
    });
    
    // Format results
    const sources = results.metadatas[0].map((metadata, index) => ({
      source: metadata.source,
      content: results.documents[0][index],
      score: results.distances[0][index]
    }));
    
    return { success: true, sources };
  } catch (error) {
    console.error('Error querying vector store:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return { success: false, error: error.message };
  }
}