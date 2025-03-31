import { json } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';
import { Document } from 'langchain/document';
import { ChromaClient, Collection } from 'chromadb';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import mammoth from 'mammoth';

// Configure ChromaDB
const chromaClient = new ChromaClient({
  path: 'http://localhost:8000'
});
let collection: Collection;

// Configure Ollama API
const OLLAMA_API = 'http://localhost:11434/api/embeddings';
const EMBED_MODEL = 'nomic-embed-text';

async function getEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch(OLLAMA_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: EMBED_MODEL,
        prompt: text
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

async function setupChroma() {
  try {
    collection = await chromaClient.getOrCreateCollection({
      name: "local_documents",
      metadata: { "hnsw:space": "cosine" },
    });
  } catch (err) {
    console.error("Error setting up ChromaDB:", err);
  }
}

setupChroma();

const supportedExtensions = ['.txt', '.pdf', '.docx', '.md', '.json'];
const downloadsPath = 'C:/Users/wenda/OneDrive/Documents/Hyperstacks/rag-pdf-ingestor/downloads';

export async function GET() {
  try {
    const files = fs.readdirSync(downloadsPath)
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return supportedExtensions.includes(ext);
      })
      .map(file => ({
        name: file,
        path: path.join(downloadsPath, file),
        type: path.extname(file).toLowerCase().slice(1),
        lastModified: fs.statSync(path.join(downloadsPath, file)).mtime
      }));
    
    return json({ success: true, files });
  } catch (error) {
    console.error('Error reading downloads directory:', error);
    return json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST() {
  try {
    await setupChroma();
    const processedFiles = [];
    const failedFiles = [];
    
    const files = fs.readdirSync(downloadsPath)
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return supportedExtensions.includes(ext);
      });
    
    for (const file of files) {
      try {
        const filePath = path.join(downloadsPath, file);
        let content = '';
        
        const ext = path.extname(file).toLowerCase();
        
        if (ext === '.txt' || ext === '.md') {
          content = fs.readFileSync(filePath, 'utf8');
        } else if (ext === '.pdf') {
          const pdfLoader = new PDFLoader(filePath);
          const pdfDocs = await pdfLoader.load();
          content = pdfDocs.map(doc => doc.pageContent).join('\n');
        } else if (ext === '.docx') {
          const result = await mammoth.extractRawText({ path: filePath });
          content = result.value;
        } else if (ext === '.json') {
          const jsonContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          content = JSON.stringify(jsonContent, null, 2);
        }
        
        const splitter = new RecursiveCharacterTextSplitter({
          chunkSize: 1000,
          chunkOverlap: 200
        });
        
        const docs = await splitter.createDocuments([content], [{ source: file }]);
        
        // Process all chunks with real embeddings
        const batchSize = 10; // Process in batches to avoid overloading
        for (let i = 0; i < docs.length; i += batchSize) {
          const batch = docs.slice(i, i + batchSize);
          const embedPromises = batch.map(doc => getEmbedding(doc.pageContent));
          const embeddings = await Promise.all(embedPromises);
          
          await collection.add({
            ids: batch.map((_, idx) => `${file}-${i + idx}`),
            metadatas: batch.map((_, idx) => ({ source: file, chunk: i + idx })),
            documents: batch.map(doc => doc.pageContent),
            embeddings: embeddings
          });
        }
        
        processedFiles.push(file);
      } catch (err) {
        console.error(`Error processing file ${file}:`, err);
        failedFiles.push({ file, error: err instanceof Error ? err.message : String(err) });
      }
    }
    
    return json({ 
      success: true, 
      processed: processedFiles, 
      failed: failedFiles 
    });
  } catch (error) {
    console.error('Error ingesting documents:', error);
    return json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}