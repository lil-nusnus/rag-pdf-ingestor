<script>
    export let documents = [];
    export let onSelect = () => {};
    export let selectedDocument = null;
    
    function getDocumentIcon(type) {
      switch (type) {
        case 'pdf':
          return '📄';
        case 'docx':
          return '📝';
        case 'txt':
          return '📃';
        case 'md':
          return '📑';
        case 'json':
          return '📋';
        default:
          return '📄';
      }
    }
    
    function formatDate(date) {
      return new Date(date).toLocaleDateString();
    }
  </script>
  
  <div class="overflow-y-auto flex-grow">
    {#if documents.length === 0}
      <div class="text-center py-8 text-gray-500">
        <p>No documents found in /downloads folder</p>
      </div>
    {:else}
      <ul class="divide-y divide-gray-200">
        {#each documents as doc}
          <li 
            class="p-3 hover:bg-gray-50 cursor-pointer rounded transition-colors duration-150 {selectedDocument && selectedDocument.name === doc.name ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''}"
            on:click={() => onSelect(doc)}
          >
            <div class="flex items-center space-x-3">
              <div class="text-2xl">{getDocumentIcon(doc.type)}</div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 truncate">
                  {doc.name}
                </p>
                <p class="text-xs text-gray-500">
                  {formatDate(doc.lastModified)} · {(doc.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </div>