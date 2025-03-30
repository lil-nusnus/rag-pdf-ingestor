<script>
  import { onMount } from 'svelte';
  import fs from 'fs';
  
  export let document;
  let content = '';
  let loading = true;
  
  $: if (document) {
    loadDocumentContent();
  }
  
  async function loadDocumentContent() {
    loading = true;
    
    try {
      // In a real implementation, you would make an API call to get document content
      // This is a placeholder that simulates reading content
      const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
      await delay(500);
      
      // Simulate content based on file type
      const ext = document.name.split('.').pop().toLowerCase();
      if (ext === 'txt' || ext === 'md') {
        content = fs.readFileSync(document.path, 'utf-8');

      } else if (ext === 'pdf') {
        content = `[PDF Content Preview] This is a preview of ${document.name}. In a real implementation, this would show extracted text or a PDF preview.`;
      } else if (ext === 'docx') {
        content = `[DOCX Content Preview] This is a preview of ${document.name}. In a real implementation, this would show extracted text from the document.`;
      } else if (ext === 'json') {
        content = `{\n  "title": "Sample JSON from ${document.name}",\n  "description": "This is simulated JSON content"\n}`;
      } else {
        content = `Content preview not available for ${document.name}`;
      }
    } catch (error) {
      console.error('Error loading document content:', error);
      content = `Error loading content: ${error.message}`;
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
    {:else}
      <pre class="text-sm text-gray-700 whitespace-pre-wrap">{content}</pre>
    {/if}
  </div>
</div>