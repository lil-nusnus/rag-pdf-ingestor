import fs from 'fs';
import path from 'path';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

// Support various document types
const supportedExtensions = ['.txt', '.pdf', '.docx', '.md', '.json'];

// Function to get all documents from the downloads folder
export async function getDocuments() {
  try {
    const downloadsPath = 'C:/Users/wenda/OneDrive/Documents/Hyperstacks/rag-pdf-ingestor/downloads';
    
    const files = fs.readdirSync(downloadsPath)
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return supportedExtensions.includes(ext);
      })
      .map(file => ({
        name: file,
        path: path.join(downloadsPath, file),
        type: path.extname(file).toLowerCase().slice(1),
        size: fs.statSync(path.join(downloadsPath, file)).size,
        lastModified: fs.statSync(path.join(downloadsPath, file)).mtime
      }));
    
    return { success: true, files };
  } catch (error) {
    console.error('Error reading downloads directory:', error);
    return { success: false, error: error.message };
  }
}

// Function to extract text from a document based on its type
export async function extractText(filePath) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    let content = '';
    
    if (ext === '.txt' || ext === '.md') {
      content = fs.readFileSync(filePath, 'utf8');
    } else if (ext === '.pdf') {
      // In a real implementation, use a PDF parsing library
      // This is a placeholder
      content = `Content from PDF file ${path.basename(filePath)}`;
    } else if (ext === '.docx') {
      // In a real implementation, use a DOCX parsing library
      // This is a placeholder
      content = `Content from DOCX file ${path.basename(filePath)}`;
    } else if (ext === '.json') {
      const jsonContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      content = JSON.stringify(jsonContent, null, 2);
    } else {
      throw new Error(`Unsupported file type: ${ext}`);
    }
    
    return { success: true, content };
  } catch (error) {
    console.error(`Error extracting text from ${filePath}:`, error);
    return { success: false, error: error.message };
  }
}

// Function to split text into chunks for processing
export async function splitTextIntoChunks(text, metadata = {}) {
  try {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200
    });
    
    const docs = await splitter.createDocuments([text], [metadata]);
    
    return { success: true, docs };
  } catch (error) {
    console.error('Error splitting text into chunks:', error);
    return { success: false, error: error.message };
  }
}