import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        host: '0.0.0.0',
        proxy: {
            '/ws': {
                target: 'http://127.0.0.1:8000',
                ws: true,
                changeOrigin: true,
                secure: false,
            },
            '/analyze-session': { target: 'http://127.0.0.1:8000', changeOrigin: true },
            '/upload-recording': { target: 'http://127.0.0.1:8000', changeOrigin: true },
            '/evidence': { target: 'http://127.0.0.1:8000', changeOrigin: true },
            '/session': { target: 'http://127.0.0.1:8000', changeOrigin: true },
            '/auth': { target: 'http://127.0.0.1:8000', changeOrigin: true },
            '/tenant': { target: 'http://127.0.0.1:8000', changeOrigin: true },
            '/application': { target: 'http://127.0.0.1:8000', changeOrigin: true },
            '/support': { target: 'http://127.0.0.1:8000', changeOrigin: true },
            '/notifications': { target: 'http://127.0.0.1:8000', changeOrigin: true },
            '/uploads': { target: 'http://127.0.0.1:8000', changeOrigin: true },
        }
    }
})
