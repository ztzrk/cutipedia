import { createApp } from 'vue'
import naive from 'naive-ui'
import VCalendar from 'v-calendar'
import { autoAnimatePlugin } from '@formkit/auto-animate/vue'
import dayjs from 'dayjs'
import 'dayjs/locale/id'
import 'v-calendar/style.css'
import './style.css'
import App from './App.vue'

dayjs.locale('id')

const app = createApp(App)

app.use(naive)
app.use(VCalendar, {})
app.use(autoAnimatePlugin)

app.mount('#app')
