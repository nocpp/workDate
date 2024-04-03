import { createApp } from 'vue'
import { createPinia } from 'pinia'
import VueHashCalendar from 'vue3-hash-calendar'
import 'vue3-hash-calendar/es/index.css'

import 'normalize.css'
import 'flex.css'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(VueHashCalendar)

app.mount('#app')