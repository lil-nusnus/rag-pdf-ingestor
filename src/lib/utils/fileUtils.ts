import fs from 'fs';
import path from 'path';
import { extractText, splitTextIntoChunks } from '../services/documentService';
import { generateEmbeddings } from '../services/ollamaService';
import { addToVectorStore } from '../services/vectorStore';

// Function to check if a file has been modified since last processing
export function isFileModified(filePath, lastProcessed) {
  try {
    const stats = fs.statSync(filePath);
    return !lastProcessed || stats.mtime > new Date(lastProcessed);
  } catch (error) {
    console.error(`Error checking if file is modified: ${filePath}`, error);
    return true; // Process the file anyway if there's an error
  }
}

// Function to get the file size in a human-readable format
export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  
  const units = ['KB', 'MB', 'GB', 'TB'];
  let size = bytes / 1024;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return size.toFixed(1) + ' ' + units[unitIndex];
}

// Function to process a file for RAG
export async function processFile(filePath) {
  try {
    // Step 1: Extract text from the file
    const textResult = await extractText(filePath);
    if (!textResult.success) {
      throw new Error(`Failed to extract text: ${textResult.error}`);
    }
    
    // Step 2: Split the text into chunks
    const fileName = path.basename(filePath);
    const splitResult = await splitTextIntoChunks(textResult.content, { source: fileName });
    if (!splitResult.success) {
      throw new Error(`Failed to split text: ${splitResult.error}`);
    }
    
    // Step 3: Generate embeddings for the chunks
    const docs = splitResult.docs;
    const texts = docs.map(doc => doc.pageContent);
    const embeddingResult = await generateEmbeddings(texts);
    if (!embeddingResult.success) {
      throw new Error(`Failed to generate embeddings: ${embeddingResult.error}`);
    }
    
    // Step 4: Store chunks and embeddings in the vector store
    const storeResult = await addToVectorStore(docs, embeddingResult.embeddings);
    if (!storeResult.success) {
      throw new Error(`Failed to store in vector database: ${storeResult.error}`);
    }
    
    return { success: true, chunks: docs.length };
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    return { success: false, error: error.message };
  }
}