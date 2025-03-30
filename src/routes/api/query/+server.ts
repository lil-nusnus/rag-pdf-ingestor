import { json } from '@sveltejs/kit';
import { ChromaClient } from 'chromadb';
import { generateEmbeddings } from '$lib/services/ollamaService.js';

async function queryModel(promptTemplate, model = 'gemma3', temperature = 0.1) {
    const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: promptTemplate }],
            options: { temperature },
            stream: false
        })
    });
    
    if (!response.ok) {
        throw new Error('Failed to get response from the model');
    }
    
    return await response.json();
}

async function getChromaCollection() {
    const client = new ChromaClient();
    return await client.getCollection({ name: "local_documents" });
}

function formatResults(results) {
    return results.metadatas[0].map((metadata, index) => ({
        source: metadata.source,
        content: results.documents[0][index],
        score: results.distances[0][index],
        chunk: metadata.chunk
    })).sort((a, b) => a.chunk - b.chunk);
}

export async function GET() {
    try {
        const collection = await getChromaCollection();
        
        const results = await collection.query({
            queryTexts: ["summarize", "CL-2024-031"],
            n_results: 5
        });

        const sortedResults = formatResults(results);
        const contextText = sortedResults.map(s => s.content).join('\n\n');
        
        const promptTemplate = `
    You are a helpful assistant that answers questions based on the provided context.
    Context:
    ${contextText}
    Question: summarize CL-2024-031
    Answer the question based on the context provided. If you don't know the answer from the context, say so.
    `;
        
        const data = await queryModel(promptTemplate, 'deepseek-r1');
        return json({ success: true, sources: sortedResults, answer: data });
    } catch (error) {
        console.error('Error processing query:', error);
        return json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST({ request }) {
    try {
        const { query } = await request.json();

        if (!query || query.trim() === '') {
            return json({ success: false, error: 'Query is required' }, { status: 400 });
        }

        const collection = await getChromaCollection();
        const embeddingResult = await generateEmbeddings(query.split(' '));
        
        if (!embeddingResult.embeddings) {
            throw new Error('Failed to generate embeddings');
        }
        
        const results = await collection.query({
            queryEmbeddings: [embeddingResult.embeddings[0]],
            n_results: 5,
        });

        const sortedResults = formatResults(results);

        const contextText = sortedResults.map(s => `
    ------ START DOCUMENT ----
    Source: ${s.source}\n
    Context: ${s.content}\n
    ------ END DOCUMENT ----
        `).join('\n\n');
        
        const promptTemplate = `
    You are a helpful Banko Sentral ng Pilipinas (BSP) assistant that answers questions based on the provided context.
    
    Contexts:
    ${contextText}
    
    Question: ${query}

    On the context this is all of the documents that are related to the query:
    - the document starts with     ------ START DOCUMENT ---- and ends with ------ END DOCUMENT ----
    - only go through the documents that are related to the query
    - if there is documents that are not related to the query, ignore them
    - if there is documents that are related to the query, answer the question based on the context provided.
    - if you don't know the answer from the context, say so.
    `;

        const responseData = await queryModel(promptTemplate, 'gemma3');

        return json({
            success: true,
            answer: responseData,
            sources: sortedResults
        });
    } catch (error) {
        console.error('Error processing query:', error);
        return json({ success: false, error: error.message }, { status: 500 });
    }
}
