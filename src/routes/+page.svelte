<script>
  import { onMount } from 'svelte';
  import DocumentList from '$lib/components/DocumentList.svelte';
  import SearchBar from '$lib/components/SearchBar.svelte';
  import ChatInterface from '$lib/components/ChatInterface.svelte';
  import DocumentPreview from '$lib/components/DocumentPreview.svelte';
  
  let documents = [];
  let loading = true;
  let ingesting = false;
  let selectedDocument = null;
  let messages = [];
  
  // Fetch documents on load
  onMount(async () => {
    await fetchDocuments();
  });
  
  async function fetchDocuments() {
    loading = true;
    try {
      const response = await fetch('/api/documents');
      const data = await response.json();
      if (data.success) {
        documents = data.files;
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      loading = false;
    }
  }
  
  async function ingestDocuments() {
    ingesting = true;
    try {
      const response = await fetch('/api/ingest', {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        await fetchDocuments();
      }
    } catch (error) {
      console.error('Error ingesting documents:', error);
    } finally {
      ingesting = false;
    }
  }
  
  function selectDocument(doc) {
    selectedDocument = doc;
  }
  
  async function handleQuery(data) {
    const query = data.detail;
    // Add user message
    messages = [...messages, { role: 'user', content: query }];
    
    // Show loading state
    messages = [...messages, { role: 'assistant', content: '...', loading: true }];
    
    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });
      
      const data = await response.json();
      
      // Update the loading message with the actual response
      messages = messages.slice(0, -1);
      
      console.log('Response:', data);

      if (data.success) {
        messages = [...messages, { 
          role: 'assistant', 
          content: data.answer?.message?.content,
          sources: data.sources
        }];
      } else {
        messages = [...messages, { 
          role: 'assistant', 
          content: `Error: ${data.error}` 
        }];
      }
    } catch (error) {
      console.error('Error querying documents:', error);
      messages = messages.slice(0, -1);
      messages = [...messages, { 
        role: 'assistant', 
        content: `Error querying documents: ${error.message}` 
      }];
    }
  }
</script>

<div class="container mx-auto px-4 py-8">
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-3xl font-bold text-indigo-700">Document RAG Assistant</h1>
    <button 
      on:click={ingestDocuments}
      class="bg-indigo-600 text-white px-4 py-2 rounded-lg shadow hover:bg-indigo-700 transition-colors duration-200 flex items-center"
      disabled={ingesting}
    >
      {#if ingesting}
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Processing...
      {:else}
        Ingest Documents
      {/if}
    </button>
  </div>
  
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div class="lg:col-span-1 bg-white rounded-xl shadow-lg p-4 h-[calc(100vh-12rem)] flex flex-col">
      <h2 class="text-xl font-semibold mb-4 text-gray-800">Documents</h2>
      {#if loading}
        <div class="flex justify-center items-center h-full">
          <svg class="animate-spin h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      {:else}
        <DocumentList {documents} onSelect={selectDocument} selectedDocument={selectedDocument} />
      {/if}
    </div>
    
    <div class="lg:col-span-2 flex flex-col gap-6">
      <div class="bg-white rounded-xl shadow-lg p-4">
        {#if selectedDocument}
          <DocumentPreview document={selectedDocument} />
        {:else}
          <div class="text-center py-8 text-gray-500">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p class="mt-2 text-sm">Select a document to preview its content</p>
          </div>
        {/if}
      </div>
      
      <div class="bg-white rounded-xl shadow-lg p-4 flex-grow">
        <ChatInterface {messages} on:sendMessage={handleQuery} />
      </div>
    </div>
  </div>
</div>