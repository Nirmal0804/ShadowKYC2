import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            '/ws': {
                target: 'ws://127.0.0.1:8000',
                ws: true,
            },
            '/analyze-session': 'http://127.0.0.1:8000',
            '/upload-recording': 'http://127.0.0.1:8000',
            '/evidence': 'http://127.0.0.1:8000',
            '/session': 'http://127.0.0.1:8000',
            '/auth': 'http://127.0.0.1:8000',
            '/tenant': 'http://127.0.0.1:8000',
            '/application': 'http://127.0.0.1:8000',
            '/support': 'http://127.0.0.1:8000',
            '/notifications': 'http://127.0.0.1:8000',
        }
    }
})
