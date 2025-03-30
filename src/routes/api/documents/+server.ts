import { json } from '@sveltejs/kit';
import fs from 'fs';
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