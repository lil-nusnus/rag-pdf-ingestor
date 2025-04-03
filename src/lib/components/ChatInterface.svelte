<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  interface Source {
    source: string;
  }
  
  interface Message {
    role: 'user' | 'assistant';
    content: string;
    loading?: boolean;
    sources?: Source[];
  }
  
  export let messages: Message[] = [];
  
  const dispatch = createEventDispatcher();
  let query = '';
  let chatContainer: HTMLElement;
  
  function handleSubmit() {
    console.log(query)
    dispatch('sendMessage', query);
    query = '';
  }
  
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  }

  // scroll to the bottom of the chat container when a new message is added
  $: if (messages.length > 0 && chatContainer) {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
  
</script>



<div class="h-full flex flex-col">
  <div bind:this={chatContainer} class="flex-grow overflow-y-auto mb-4 space-y-4 max-h-[400px] p-2">
    {#if messages.length === 0}
      <div class="text-center py-8 text-gray-500">
        <p>Ask a question about your documents to get started</p>
      </div>
    {:else}
      {#each messages as message}
        <div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
          <div class="max-w-3/4 rounded-lg px-4 py-2 {message.role === 'user' ? 'bg-indigo-100 text-indigo-900' : 'bg-gray-100 text-gray-800'}">
            {#if message.loading}
              <div class="flex items-center space-x-2">
                <div class="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
                <div class="w-2 h-2 bg-gray-500 rounded-full animate-pulse" style="animation-delay: 0.2s"></div>
                <div class="w-2 h-2 bg-gray-500 rounded-full animate-pulse" style="animation-delay: 0.4s"></div>
              </div>
            {:else}
              <p class="whitespace-pre-wrap break-words">{@html message.content}</p>
              
              {#if message.sources && message.sources.length > 0}
                <div class="mt-2 pt-2 border-t border-gray-200">
                  <p class="text-xs text-gray-500 font-medium">Sources:</p>
                  <ul class="text-xs text-gray-500 mt-1">
                    {#each message.sources as source}
                      <li class="truncate">{source.source}</li>
                    {/each}
                  </ul>
                </div>
              {/if}
            {/if}
          </div>
        </div>
      {/each}
    {/if}
  </div>
  
  <div class="border-t pt-4">
    <form on:submit|preventDefault={handleSubmit} class="flex items-end">
      <textarea
        bind:value={query}
        on:keydown={handleKeydown}
        class="flex-grow resize-none border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none min-h-[60px]"
        placeholder="Ask a question about your documents..."
        rows="2"
      ></textarea>
      <button
        type="submit"
        class="ml-2 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow hover:bg-indigo-700 transition-colors duration-200 h-[60px]"
      >
        Send
      </button>
    </form>
  </div>
</div>