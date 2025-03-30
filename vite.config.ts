import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
	tailwindcss(),
	sveltekit()
],
  server: {
    fs: {
      allow: ['/downloads'] // Allow access to the downloads directory
    }
  },
  resolve: {
	alias: {
		process: "process/browser",
		buffer: "buffer",
	},
},
});


