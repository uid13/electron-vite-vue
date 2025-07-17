import { createApp } from 'vue';
import 'virtual:uno.css';
import '@/assets/styles/main.css';
import 'video.js/dist/video-js.css';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import VideoPlayer from '@/VideoPlayer.vue';

const app = createApp(VideoPlayer);
app.use(ElementPlus);
app.mount('#app');