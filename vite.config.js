import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    base: '/HandCraft/', // Specific base path for GitHub Pages sub-directory
    plugins: [react()],
})
