import { json } from '@sveltejs/kit';
import { ChromaClient, OllamaEmbeddingFunction } from 'chromadb';
import { generateEmbeddings } from '$lib/services/ollamaService.js';

async function queryModel(promptTemplate, model = 'gemma3', temperature = 0.1) {
    // clear chroma collection
    const client = new ChromaClient();
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
    const client = new ChromaClient({
        path: 'http://localhost:8000'
    });
    
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
        const client = new ChromaClient({
            path: 'http://localhost:8000'
        });
        client.database = 'local_documents';
        const collection = await client.getOrCreateCollection({
            name: "local_documents",
            embeddingFunction: new OllamaEmbeddingFunction({
                model: 'mxbai-embed-large',
                url: 'http://localhost:11434',
            }),
        });
        const embeddingResult = await generateEmbeddings('summarize CL-2024-031'.split(' '));
        if (!embeddingResult.embeddings) {
            throw new Error('Failed to generate embeddings');
        }
        const results = await collection.query({
            queryEmbeddings: [embeddingResult.embeddings[0]],
            n_results: 5,
        });

        return json({ success: true, results });
        if (!results || !results.metadatas || !results.documents) {
            throw new Error('No results found');
        }

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

        const aiQueryPrompt = `
        create a query for this question: ${query}
        - it must be accurate so that the chroma collection can find the relevant documents
        - it must contain the circular letter number, the date, and the title of the circular letter
        - it must be in the form of a list of words, separated by space
        - it must not contain any other text or punctuation
        - it must not contain any special characters or symbols
        - it must not contain any stop words or filler words
        - no other text or explanation is needed, just the query
        `;

        const aiQueryResponse = await queryModel(aiQueryPrompt, 'gemma3', 0.1);
        console.log('AI Query Response:', aiQueryResponse);
        const aiQuery = aiQueryResponse.message.content.split(' ').map(word => word.trim()).filter(word => word !== '');
        console.log('AI Query:', aiQuery);
        
        const embeddingResult = await generateEmbeddings(aiQuery);
        

        // return json(embeddingResult.embedding);
        
        if (!embeddingResult.embeddings) {
            throw new Error('Failed to generate embeddings');
        }

        /// As a mobile banking solutions provider, covering mobile apps, backend and intrastructure, what is my involvement in Consumer Redress Mechanism Standards for Account-to-Account Electronic Fund Transfers under the National Payment System Framework
        
        
        // // Uncomment the following lines if you want to use embeddings for querying
        const results = await collection.query({
            queryEmbeddings: embeddingResult.embeddings,
            n_results: 5,
            // when using embeddings, you may want to set the distance metric to cosine or euclidean
            distanceMetric: 'cosine'
        });


        // const results = await collection.query({
        //     // you may change this as split or not split
        //     //queryTexts: query.split(' '),
        //     queryTexts: [query],
        //     n_results: 5
        // });

        ///////////////////////////////////////////


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
    
    ------------------------
    Question: ${query}

    Answer the question based on the context provided. If you don't know the answer from the context, say so.
    Also please focus on the Banko Sentral ng Pilipinas (BSP) legal and regulatory framework, and the National Payment System Framework.

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
