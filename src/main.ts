// The site's three faces, self-hosted: one origin, no render-blocking
// stylesheet from a third party. Variable files, so every weight the app uses
// is one download per subset; the CSS is unicode-ranged, so only latin loads
// for English text. The family names carry a "Variable" suffix — see base.css.
import '@fontsource-variable/fredoka'
import '@fontsource-variable/nunito'
import '@fontsource-variable/nunito/wght-italic.css'
import '@fontsource-variable/jetbrains-mono'
import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
