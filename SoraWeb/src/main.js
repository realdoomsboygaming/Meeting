import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import App from './App.vue'
import router from './router'
import VuePlyr from '@skjnldsv/vue-plyr'
import '@skjnldsv/vue-plyr/dist/vue-plyr.css'

// Windi CSS (handled by Vite plugin)
import 'virtual:windi.css'
// Global styles
import './styles/globals.scss'

// Create app instance
const app = createApp(App)

// Create and use Pinia with persistence
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
app.use(pinia)

// Use router
app.use(router)

app.use(VuePlyr)

// Mount app
app.mount('#app')

// Service Worker registration for PWA (disabled in development)
// if ('serviceWorker' in navigator) {
//   window.addEventListener('load', () => {
//     navigator.serviceWorker.register('/service-worker.js')
//       .then((registration) => {
//         console.log('SW registered: ', registration)
//       })
//       .catch((registrationError) => {
//         console.log('SW registration failed: ', registrationError)
//       })
//   })
// } 