const OLLAMA_BASE_URL = 'http://localhost:11434'; // Default Ollama API URL
const EMBEDDING_MODEL = 'nomic-embed-text';
const LLM_MODEL = 'deepseek-r1';

// Generate embeddings for text using Ollama
export async function generateEmbeddings(texts) {
// Convert single text to array if needed
if (!Array.isArray(texts)) {
    texts = [texts];
}

// Validate input
if (texts.length === 0) {
    return { success: false, error: 'No text provided for embedding' };
}

try {
    const embeddings = [];
    
    for (const text of texts) {
      // Skip empty strings
      if (!text || text.trim() === '') {
        continue;
      }
      
      const response = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          prompt: text
        })
      });
      
      if (!response.ok) {
        const errorData = await response.text().catch(() => null);
        throw new Error(`Ollama API returned ${response.status}${errorData ? `: ${errorData}` : ''}`);
      }
      
      const data = await response.json();
      embeddings.push(data.embedding);
    }

    // console.log(embeddings)
    // Check if embeddings are valid
    if (embeddings.some(embedding => !Array.isArray(embedding))) {
        throw new Error('Invalid embedding format received from Ollama API');
    }


    
    return { success: true, embeddings }; // embeddings is already a 2D array for ChromaDB
} catch (error) {
    console.error('Error generating embeddings:', error);
    return { success: false, error: error.message };
}
}



// Generate a response from the LLM based on a prompt
export async function generateResponse(prompt) {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        prompt: prompt,
        stream: false
      })
    });
    
    if (!response.ok) {
      throw new Error(`Ollama API returned ${response.status}`);
    }
    
    const data = await response.json();
    return { success: true, response: data.response };
  } catch (error) {
    console.error('Error generating LLM response:', error);
    return { success: false, error: error.message };
  }
}

// Check if Ollama is available and running
export async function checkOllamaStatus() {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    
    if (!response.ok) {
      throw new Error(`Ollama API returned ${response.status}`);
    }
    
    return { success: true, status: 'connected' };
  } catch (error) {
    console.error('Error checking Ollama status:', error);
    return { success: false, status: 'disconnected', error: error.message };
  }
}