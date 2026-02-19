import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    base: './', // Use relative base path for flexible deployment
    plugins: [react()],
    base: './',
})
