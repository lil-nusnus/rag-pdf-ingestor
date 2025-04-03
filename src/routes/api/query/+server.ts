import { json } from '@sveltejs/kit';
import { ChromaClient } from 'chromadb';
import { generateEmbeddings } from '$lib/services/ollamaService.js';
import { compile } from 'mdsvex'
import * as cheerio from 'cheerio';

type ChatMessage = {
    role: 'user' | 'assistant';
    content: string;
};

let chatBuffer: ChatMessage[] = [];

async function queryModel (prompt, template, model = 'gemma3') {
    const response = await fetch(`http://localhost:11434/api/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model,
            messages:[
                ...chatBuffer,
                { role: 'assistant', content: template },
                { role: 'user', content: `Based on the context please answer this query "${prompt}"` },
            ],
            options: {
                temperature: 0.7
            },
            stream: false
        })
    });

    if (!response.ok) {
        throw new Error(`Model API error: ${response.statusText}`);
    }

    return await response.json();
}

let chromaClient: ChromaClient | null = null;

async function getChromaCollection() {
    if (!chromaClient) {
        chromaClient = new ChromaClient({
            path: process.env.CHROMA_URL || 'http://localhost:8000'
        });
    }
    
    return await chromaClient.getCollection({ name: 'local_documents' });
}

function formatResults(results) {
    const { ids, documents, metadatas, distances } = results;
    
    if (!ids || !ids.length) return [];
    
    return ids[0].map((id, i) => {
        return {
            id,
            content: documents[0][i],
            metadata: metadatas[0][i],
            score: distances[0][i],
            source: metadatas[0][i]?.source || 'Unknown source'
        };
    });
}

// if get delete the collection
export async function GET() {
    const db = new ChromaClient();
    await db.deleteCollection({ name: 'local_documents' });
    return json({ success: true, message: 'Collection deleted' });

}

export async function POST({ request }) {
    try {
        let { query } = await request.json();

        if (!query || query.trim() === '') {
            return json({ success: false, error: 'Query is required' }, { status: 400 });
        }

        // cheerio web search
        // const $ = cheerio.load(await fetch(`https://www.google.com/search?q=${query}`).then(res => res.text()));
        // // get all the links from the search result
        // const links = $('a').map((i, el) => $(el).attr('href')).get();
        // // filter the links to get only the relevant ones
        // console.log(links);


        //query = preprocessQuery(query);
        //const expandedQueries = await generateQueryExpansions(query);
        
        const collection = await getChromaCollection();
        
        // const embeddingResult = await generateEmbeddings([...query.split(' '), ...expandedQueries]);
        const embeddingResult = await generateEmbeddings([query, ...query.split(' ')]);
        
        if (!embeddingResult.embeddings) {
            throw new Error('Failed to generate embeddings');
        }

        const results = await collection.query({
            queryEmbeddings: embeddingResult.embeddings,
            queryTexts: query,
            n_results: 5,
        });

        const {documents, metadatas, distances} = results;

        const context = [];

        for (let i = 0; i < documents[0].length; i++) {
            context.push({
                content: documents[0][i],
                metadata: metadatas[0][i],
                score: distances[0][i]
            });
        }
        context.sort((a, b) => a.score - b.score);

        const contextText = context.map(result => {
            const safeSource = String(result.metadata.source).replace(/[\u0000-\u001F\u007F-\u009F"\\]/g, '');
            const safeContent = String(result.content).replace(/[\u0000-\u001F\u007F-\u009F"\\]/g, '');
            return `Source: ${safeSource}\nContent: ${safeContent}\n`;
        })
        .join('\n\n---\n\n');

        // let formattedResults = formatResults(results);
        
        // const rerankedResults = applyMMR(
        //     formattedResults, 
        //     embeddingResult.embeddings, 
        //     {
        //         lambda: 0.1,
        //         k: 50
        //     }
        // );



        // const contextText = rerankedResults.map(result => {
        //     const safeSource = String(result.source).replace(/[\u0000-\u001F\u007F-\u009F"\\]/g, '');
        //     const safeContent = String(result.content).replace(/[\u0000-\u001F\u007F-\u009F"\\]/g, '');
        //     return `Source: ${safeSource}\nContent: ${safeContent}\n`;
        // })
        // .join('\n\n---\n\n');


        
        const promptTemplate = `
    You are a helpful Banko Sentral ng Pilipinas (BSP) assistant that answers questions based on the provided context.
    
    Contexts:
    ${contextText}

    Answer the question based on the context provided. If you don't know the answer from the context, say so.
    If the context is not relevant to the question use your knowledge to answer the question.
    - Must be concise and to the point
    - With explanation if necessary
    Instructions:
      1. For regulatory questions:
         - Base your answer ONLY on the provided context information
         - Cite specific circular numbers or regulations when relevant
         - Remove Disclaimer and other irrelevant information
         - Focus on Banko Sentral ng Pilipinas (BSP) regulations and policies
         - for example: "BSP Circular No. 1234" or "BSP Regulation 5678"
         
      
      3. General guidelines:
         - Be concise but thorough
         - If multiple documents are relevant, synthesize the information
         - When suggesting technical solutions, ensure they align with BSP security and compliance requirements
    `;

        let responseData = await queryModel(query, promptTemplate, 'gemma3');

        const { code } = await compile(responseData.message.content);
        
        if (code) {
            responseData.message.content = code;
        } else {
            responseData.message.content = 'No code generated.';
        }

        chatBuffer.push({
            role: 'user',
            content: query
        });
        chatBuffer.push({
            role: 'assistant',
            content: responseData.message.content
        });



        return json({
            success: true,
            answer: responseData,
            sources: results
        });
    } catch (error) {
        console.error('Error processing query:', error);
        return json({ success: false, error: error.message }, { status: 500 });
    }
}

function preprocessQuery(query: string): string {
    return query.toLowerCase().trim().replace(/\s+/g, ' ');
}

async function generateQueryExpansions(query: string): string[] {
    const expansions = [];
    
    interface DatamuseWord {
        word: string;
        score?: number;
    }
    
    const queryWords = query.split(' ');
    for (const word of queryWords) {
        const synonyms = await fetch(`https://api.datamuse.com/words?rel_syn=${word}`)
            .then(response => response.json())
            .catch(() => []);
        expansions.push(...synonyms.map((syn: DatamuseWord) => syn.word));
    }
    
    if (query.startsWith('what')) {
        expansions.push(query.replace('what', 'which'));
        expansions.push(query.replace(/^what\s+is/, 'define'));
    } else if (query.startsWith('how')) {
        expansions.push(query.replace('how', 'what is the way to'));
        expansions.push(query.replace(/^how\s+to/, 'procedure for'));
    }
    
    if (!query.includes('bsp') && !query.includes('banko sentral')) {
        expansions.push(`${query} bsp policy`);
        expansions.push(`${query} banko sentral regulation`);
    }
    console.log(expansions);
    return expansions;
}

function applyMMR(docs, queryEmbedding, { lambda = 0.5, k = 3 }) {
    if (docs.length === 0) return [];
    
    docs.forEach(doc => {
        doc.similarity = 1 - doc.score;
    });
    
    const selected = [];
    const remaining = [...docs];
    
    remaining.sort((a, b) => b.similarity - a.similarity);
    selected.push(remaining.shift());
    
    while (selected.length < k && remaining.length > 0) {
        let nextBestScore = -Infinity;
        let nextBestDoc = null;
        let nextBestIndex = -1;
        
        for (let i = 0; i < remaining.length; i++) {
            const doc = remaining[i];
            
            let maxSimilarityToSelected = -Infinity;
            for (const selectedDoc of selected) {
                const similarity = calculateDocSimilarity(doc, selectedDoc);
                maxSimilarityToSelected = Math.max(maxSimilarityToSelected, similarity);
            }
            
            const mmrScore = lambda * doc.similarity - (1 - lambda) * maxSimilarityToSelected;
            
            if (mmrScore > nextBestScore) {
                nextBestScore = mmrScore;
                nextBestDoc = doc;
                nextBestIndex = i;
            }
        }
        
        selected.push(nextBestDoc);
        remaining.splice(nextBestIndex, 1);
    }
    
    return selected;
}

function calculateDocSimilarity(doc1, doc2) {
    const words1 = new Set(doc1.content.toLowerCase().split(/\s+/));
    const words2 = new Set(doc2.content.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
}
