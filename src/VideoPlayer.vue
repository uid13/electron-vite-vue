<template>
  <div class="w-full h-full">
    <div
        class="bg-black/30 rounded-xl p-4 mb-5 shadow-xl backdrop-blur-md flex flex-wrap gap-4 items-center relative">
      <!-- 布局设置 -->
      <div class="bg-black/20 p-3 rounded-lg flex-1 min-w-[200px] h-[80px] relative">
        <h2 class="mb-2 text-sm text-primary flex items-center gap-2">
          <i class="i-mdi:view-grid"/>Layout Settings
        </h2>
        <el-select v-model="selectedLayout" @change="changeLayout">
          <el-option label="1x1" value="1"></el-option>
          <el-option label="2x2" value="4"></el-option>
          <el-option label="2x3" value="6"></el-option>
        </el-select>
      </div>

      <!-- 全局控制 -->
      <div class="bg-black/20 p-3 rounded-lg flex-1 min-w-[200px] h-[80px] relative">
        <h2 class="mb-2 text-sm text-primary flex items-center gap-2">
          <i class="i-mdi:controller"/>
          Global Control
        </h2>
        <div class="flex gap-2 flex-wrap">
          <el-tooltip content="Play/Pause" placement="left">
            <el-button class="i-mdi:movie-play" @click="playAll"/>
          </el-tooltip>
          <el-tooltip content="Volume-mute/cancel" placement="right">
            <el-button :class="allMuted ? 'i-mdi:volume-mute' : 'i-mdi:volume'" @click="muteAll"/>
          </el-tooltip>
          <el-tooltip content="Remove all videos" placement="right">
            <el-button class="i-mdi:delete" @click="removeAll"/>
          </el-tooltip>
        </div>
      </div>

      <!-- 全局音量 -->
      <div class="bg-black/20 p-3 rounded-lg flex-1 min-w-[200px] h-[80px] relative">
        <h2 class="mb-2 text-sm text-primary flex items-center gap-2">
          <i class="i-mdi:volume"/>Global Volume
        </h2>
        <div class="flex items-center gap-2">
          <el-slider v-model="globalVolume" :max="1" :min="0" :step="0.01" @change="setGlobalVolume"></el-slider>
          <span>{{ globalVolume * 100 }}%</span>
        </div>
      </div>
    </div>

    <!-- 视频槽位 -->
    <div id="video-grid" :class="`grid gap-4 min-h-[600px] transition-all-300 layout${selectedLayout}`">
      <div v-for="slot in videoSlots" :key="slot.id" :data-id="slot.id"
           class="bg-black/25 rounded-lg overflow-hidden relative min-h-300px flex flex-col shadow-md transition-all ease-in-out duration-300 video-slot">
        <div class="bg-black/40 p-1 flex justify-between items-center video-header">
          <div class="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[65%]">
            <i class="i-mdi:movie-roll w-8 h-8"/><span class="video-title">{{ slot.title }}</span>
          </div>
          <div class="flex gap-1">
            <el-tooltip content="Choose a video to watch" placement="top">
              <i class="i-mdi:movie-search w-8 h-8 cursor-pointer" @click="openFilePicker(slot)"/>
            </el-tooltip>
            <el-tooltip content="Remove the current video" placement="top">
              <i class="i-mdi:delete w-8 h-8 cursor-pointer" @click="resetVideoSlot(slot)"/>
            </el-tooltip>
          </div>
        </div>
        <div class="flex-1 flex items-center justify-center min-h-0 video-container">
          <i class="i-mdi:movie-open w-27 h-27"/>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {ref, onMounted} from 'vue';
import videojs from 'video.js';
import $ from 'jquery';
import {ElMessage} from "element-plus";

// 定义视频槽位的数据类型
interface VideoSlot {
  id: number;
  player: videojs.Player | null;
  file: File | null;
  title: string;
}

const videoSlots = ref<VideoSlot[]>([]);
const selectedLayout = ref<string>('6');
const globalVolume = ref<number>(0.08);

// 初始化视频槽位
const initializeVideoSlots = (layout: number) => {
  videoSlots.value.forEach(slot => resetVideoSlot(slot));
  videoSlots.value = [];
  for (let i = 0; i < layout; i++) {
    const slotData: VideoSlot = {
      id: i,
      player: null,
      file: null,
      title: ``,
    };
    videoSlots.value.push(slotData);
  }
};

// 改变布局
const changeLayout = (layout: string) => {
  initializeVideoSlots(Number(layout));
};

// 打开文件选择器
const openFilePicker = (slot: VideoSlot) => {
  resetVideoSlot(slot);
  const input = document.createElement('input');
  input.type = 'file';
  // input.accept = 'video/*';
  input.addEventListener('change', (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length) {
      handleFileSelect(slot, target.files[0]);
    }
  });
  input.click();
};

// 处理选择的文件
const handleFileSelect = (slot: VideoSlot, file: File) => {
  // if (!file.type.startsWith('video/')) {
  //   ElMessage.error('Please select a valid video file！');
  //   return;
  // }

  const videoContainer = $(`[data-id="${slot.id}"] .video-container`);
  const title = $(`[data-id="${slot.id}"] .video-title`);
  videoContainer.html("");

  // 创建视频元素
  const videoId = `video-${slot.id}-${Date.now()}`;
  const video = document.createElement('video');
  video.id = videoId;
  video.className = 'video-js vjs-default-skin vjs-big-play-centered';
  video.controls = true;
  video.preload = 'auto';
  // 添加样式属性，让视频自适应容器
  video.style.width = '100%';
  video.style.height = '100%';
  video.style.objectFit = 'cover';

  const source = document.createElement('source');
  source.src = URL.createObjectURL(file);
  source.type = file.type;
  video.appendChild(source);
  videoContainer.append(video);

  // 使用Video.js初始化播放器
  const player = videojs(videoId, {
    controls: true,
    autoplay: false,
    preload: 'auto',
    fluid: true,
    playbackRates: [0.5, 1, 1.5, 2],
    controlBar: {
      children: [
        'playToggle',
        'volumePanel',
        'currentTimeDisplay',
        'timeDivider',
        'durationDisplay',
        'progressControl',
        'remainingTimeDisplay',
        'playbackRateMenuButton',
        'fullscreenToggle'
      ]
    }
  });

  // 设置视频源
  player.src({
    src: URL.createObjectURL(file),
    type: file.type
  });

  // 设置音量 (8%)
  player.volume(0.08);

  // 更新标题
  const fileName = file.name.length > 20 ? file.name.substring(0, 20) + "..." : file.name;

  // 存储播放器引用和文件信息
  slot.player = player;
  slot.file = file;
  slot.title = ` ${fileName}`;
  title.text(slot.title);

  player.playbackRate(1);
};

// 重置视频槽
const resetVideoSlot = (slot: VideoSlot) => {
  const videoContainer = $(`[data-id="${slot.id}"] .video-container`);
  const title = $(`[data-id="${slot.id}"] .video-title`);
  if (slot.player) {
    slot.player.dispose();
    slot.player = null;
    slot.file = null;
  }
  videoContainer.html('<i class="i-mdi:movie-open w-27 h-27"/>');

  slot.title = ``;
  title.text(slot.title);
};

// 全部播放/暂停
const allPlay = ref<boolean>(true);
const playAll = () => {
  allPlay.value = !allPlay.value;
  videoSlots.value.forEach(slot => {
    if (slot.player) {
      allPlay.value ? slot.player.pause() : slot.player.play();
    }
  });
  ElMessage.success(allPlay.value ? 'All videos have been paused' : 'All videos have been played');
};

// 全部静音
const allMuted = ref<boolean>(false);
const muteAll = () => {
  allMuted.value = !allMuted.value;
  videoSlots.value.forEach(slot => {
    if (slot.player) {
      slot.player.muted(allMuted.value);
    }
  });
  ElMessage.success(allMuted.value ? 'All videos have been muted' : 'All videos have been unmuted');
};

// 移除所有视频
const removeAll = () => {
  initializeVideoSlots(Number(selectedLayout.value));
};

// 设置全局音量
const setGlobalVolume = () => {
  videoSlots.value.forEach(slot => {
    if (slot.player) {
      slot.player.volume(globalVolume.value);
    }
  });
};

// 处理键盘事件
import {useEventListener} from '@vueuse/core'

useEventListener(window, 'keydown', (event) => {
  if (event.key === ' ' || event.code === 'Space') {
    event.preventDefault();
    playAll();
    event.stopPropagation();
  }
})

onMounted(() => {
  initializeVideoSlots(Number(selectedLayout.value));
});
</script>