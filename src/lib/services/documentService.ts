import fs from 'fs';
import path from 'path';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import mammoth from 'mammoth';

const supportedExtensions = ['.txt', '.pdf', '.docx', '.md', '.json'];

export async function getDocuments() {
  
}

export async function extractText(filePath) {
  try {
  const ext = path.extname(filePath).toLowerCase();
  let content = '';
  
  if (ext === '.txt' || ext === '.md') {
    content = fs.readFileSync(filePath, 'utf8');
  } else if (ext === '.pdf') {
    const loader = new PDFLoader(filePath);
    const docs = await loader.load();
    content = docs.map(doc => doc.pageContent).join('\n');
  } else if (ext === '.docx') {
    const buffer = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer });
    content = result.value;
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

export async function splitTextIntoChunks(text, metadata = {}) {
  
}
