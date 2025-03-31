import { json } from '@sveltejs/kit';
import fs from 'fs';
import mammoth from 'mammoth';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import path from 'path';

export async function GET() {
  try {
    const downloadsPath = 'C:/Users/wenda/OneDrive/Documents/Hyperstacks/rag-pdf-ingestor/downloads';
    const supportedExtensions = ['.txt', '.pdf', '.docx', '.md', '.json'];
    
    // Get all files from the downloads directory
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
    
    return json({ success: true, files });
  } catch (error) {
    console.error('Error reading documents:', error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST({ request }) {
  // create a preview of the document
  try {
    const { path: filePath, type } = await request.json();
    const ext = path.extname(filePath).toLowerCase();
    let preview = '';

    switch (type) {
      case 'txt':
      case 'md':
        preview = fs.readFileSync(filePath, 'utf8');
        break;
      case 'pdf':
        const pdfLoader = new PDFLoader(filePath);
        const pdfDocs = await pdfLoader.load();
        preview = pdfDocs.map(doc => doc.pageContent).join('\n');
        break;
      case 'docx':
        const buffer = fs.readFileSync(filePath);
        const result = await mammoth.extractRawText({ buffer });
        preview = result.value;
        break;
      case 'json':
        const jsonContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        preview = JSON.stringify(jsonContent, null, 2);
        break;
      default:
        throw new Error(`Unsupported file type: ${ext}`);
    }
    return json({ success: true, preview });
  }
  catch (error) {
    console.error('Error creating preview:', error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
}
