<script>
  import { onMount } from 'svelte';
  
  // Stats for the sidebar
  let stats = {
    totalDocuments: 0,
    processedDocuments: 0,
    lastIngestion: null
  };
  
  // Ollama status
  let ollamaStatus = {
    connected: false,
    statusText: 'Checking...'
  };
  
  // Fetch document stats from API
  async function fetchDocumentStats() {
    try {
    const response = await fetch('/api/documents');
    if (response.ok) {
      const data = await response.json();
      return {
      totalDocuments: data.files.length || 0,
      processedDocuments: data.files.length || 0,
      lastIngestion: data.files[0].lastModified ? new Date(data.files[0].lastModified).toLocaleString() : null
      };
    }
    } catch (error) {
    console.error('Error fetching document stats:', error);
    }
    return stats; // Return current stats if fetch fails
  }
  
  // Check Ollama connection
  async function checkOllamaStatus() {
    try {
    const response = await fetch('http://localhost:11434/api/tags', {
      method: 'GET',
      headers: {
      'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      return { connected: true, statusText: 'Connected' };
    } else {
      return { connected: false, statusText: 'Disconnected' };
    }
    } catch (error) {
    console.error('Error checking Ollama status:', error);
    return { connected: false, statusText: 'Disconnected' };
    }
  }
  
  onMount(async () => {
    // Fetch real data
    stats = await fetchDocumentStats();
    ollamaStatus = await checkOllamaStatus();
    
    // Set up periodic refresh (every 30 seconds)
    const refreshInterval = setInterval(async () => {
    stats = await fetchDocumentStats();
    ollamaStatus = await checkOllamaStatus();
    }, 30000);
    
    return () => {
    clearInterval(refreshInterval);
    };
  });
  </script>
  
  <aside class="w-64 bg-indigo-800 text-white p-6 hidden lg:block">
  <div class="mb-8">
    <h1 class="text-2xl font-bold">RAG Assistant</h1>
    <p class="text-indigo-200 text-sm mt-1">Powered by Ollama & LangChain</p>
  </div>
  
  <nav class="space-y-2 mb-8">
    <a href="/" class="flex items-center py-2 px-4 rounded-lg bg-indigo-700 hover:bg-indigo-600 transition-colors duration-200">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
    Dashboard
    </a>
    <!-- <a href="/" class="flex items-center py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-200">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
    Documents
    </a>
    <a href="/" class="flex items-center py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-200">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
    Chat History
    </a>
    <a href="/" class="flex items-center py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-200">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
    Settings
    </a> -->
  </nav>
  
  <div class="pt-6 border-t border-indigo-700">
    <h2 class="text-sm font-semibold uppercase tracking-wider text-indigo-300 mb-3">System Status</h2>
    <div class="space-y-3">
    <div>
      <div class="flex justify-between text-sm">
      <span class="text-indigo-200">Documents</span>
      <span class="font-medium">{stats.processedDocuments}/{stats.totalDocuments}</span>
      </div>
      <div class="w-full bg-indigo-900 rounded-full h-1.5 mt-1">
      <div class="bg-indigo-300 h-1.5 rounded-full" style="width: {(stats.processedDocuments / stats.totalDocuments) * 100 || 0}%"></div>
      </div>
    </div>
    
    <div class="text-sm">
      <span class="text-indigo-200">Last ingestion</span>
      <p class="font-medium">{stats.lastIngestion || 'Never'}</p>
    </div>
    
    <div class="text-sm">
      <span class="text-indigo-200">Ollama status</span>
      <p class="font-medium flex items-center">
      <span class="inline-block w-2 h-2 rounded-full {ollamaStatus.connected ? 'bg-green-400' : 'bg-red-400'} mr-2"></span>
      {ollamaStatus.statusText}
      </p>
    </div>
    </div>
  </div>
  </aside>