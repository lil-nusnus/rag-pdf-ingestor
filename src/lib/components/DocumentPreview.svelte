<script>
  import { onMount } from 'svelte';
  
  export let document;
  let content = '';
  let loading = true;
  let error = null;
  
  $: if (document) {
    loadDocumentContent();
  }
  
  async function loadDocumentContent() {
    loading = true;
    error = null;
    
    try {
      const ext = document.name.split('.').pop().toLowerCase();
      
      // Make API call to get document content
      const response = await fetch(`/api/documents/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          path: document.path,
          type: ext
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load document: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (ext === 'json') {
        // Format JSON nicely
        content = JSON.stringify(data.content, null, 2);
      } else {
        content = data.content;
      }
    } catch (err) {
      console.error('Error loading document content:', err);
      error = err;
    } finally {
      loading = false;
    }
  }
</script>

<div>
  <div class="flex justify-between items-center mb-4">
    <h3 class="text-lg font-semibold text-gray-800">{document.name}</h3>
    <span class="text-sm px-2 py-1 bg-gray-100 rounded text-gray-600 uppercase">{document.type}</span>
  </div>
  
  <div class="border rounded-lg p-4 bg-gray-50 h-64 overflow-y-auto">
    {#if loading}
      <div class="flex justify-center items-center h-full">
        <svg class="animate-spin h-6 w-6 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    {:else if error}
      <div class="text-red-600 p-2">
        <p>Error loading content:</p>
        <p>{error.message}</p>
      </div>
    {:else}
      <pre class="text-sm text-gray-700 whitespace-pre-wrap">{content}</pre>
    {/if}
  </div>
</div>