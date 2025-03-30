<script>
	import '../app.css';
	import Sidebar from '$lib/components/Sidebar.svelte';
  </script>
  
  <div class="min-h-screen bg-gray-100 flex">
	<Sidebar />
	<main class="flex-1 overflow-y-auto">
	  <slot />
	</main>
  </div>