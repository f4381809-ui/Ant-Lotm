import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'pc' ? [viteSingleFile()] : [],
  build: mode === 'pc' ? { outDir: 'docs' } : {},
}));
