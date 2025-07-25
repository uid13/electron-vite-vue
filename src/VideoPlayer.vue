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
import {ref, onMounted, onUnmounted} from 'vue';
import Player from 'xgplayer';
import FlvPlugin from 'xgplayer-flv';
import HlsPlugin from 'xgplayer-hls'
import $ from 'jquery';
import {ElMessage} from "element-plus";
import 'xgplayer/dist/index.min.css';
import {useEventListener} from '@vueuse/core'

// 定义视频槽位的数据类型（新增objectUrl存储临时URL）
interface VideoSlot {
  id: number;
  player: any | null;
  file: File | null;
  title: string;
  format: string;
  objectUrl: string | null; // 存储createObjectURL的返回值，用于后续释放
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
      format: '',
      objectUrl: null
    };
    videoSlots.value.push(slotData);
  }
};

// 打开文件选择器
const accept = ['.mp4', '.mkv', '.flv', '.ogg', '.webm', '.mov']
const openFilePicker = (slot: VideoSlot) => {
  resetVideoSlot(slot);

  const $input = $('<input>').attr({type: 'file', accept: accept.join(', ')});
  $input.on('change', (e) => {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length) {
      handleFileSelect(slot, target.files[0]);
    }
  });
  $input.click();
};

// 处理选择的文件
const handleFileSelect = (slot: VideoSlot, file: File) => {
  const extName = file.name.toLowerCase().split(".").pop() || '';
  // xgplayer 自动判断是否支持
  if (!accept.includes(`.${extName}`)) {
    ElMessage.error(`Unsupported ${extName} video file.`);
    return;
  }

  const videoContainer = $(`[data-id="${slot.id}"] .video-container`);
  const title = $(`[data-id="${slot.id}"] .video-title`);
  videoContainer.html("");

  // 创建播放器容器
  const containerId = `video-container-${slot.id}-${Date.now()}`;
  const container = document.createElement('div');
  container.id = containerId;
  container.style.width = '100%';
  container.style.height = '100%';
  container.style.objectFit = 'cover';
  videoContainer.append(container);

  // 生成临时URL并存储（用于后续释放）
  const objectUrl = URL.createObjectURL(file);

  // 播放器配置
  const playerConfig: any = {
    id: containerId,
    url: objectUrl,
    width: '100%',
    height: '100%',
    autoplay: false,
    volume: globalVolume.value,
    controls: true,
    fluid: true,
    controlBar: {
      show: true,
      items: ['play', 'volume', 'time', 'progress', 'playbackRate', 'fullscreen']
    },
    isLive: false,
    lang: 'en'
  };

  if (FlvPlugin.isSupported() && extName === 'flv') {
    console.log("Using FlvPlugin for FLV files");
    playerConfig.plugins = [FlvPlugin];
  }
  if (HlsPlugin.isSupported() && extName === 'ts') {
    console.log("Using HlsPlugin for TS files");
    playerConfig.plugins = [HlsPlugin];
  }

  // 初始化播放器
  const player = new Player(playerConfig);

  // 存储错误监听函数（用于后续移除）
  const errorHandler = (err: any) => {
    console.error('Player error:', err);
    // ElMessage.error(`Play error: ${err.message || 'Unknown error'}`);
  };
  player.on('error', errorHandler);

  // 更新槽位数据（存储objectUrl和errorHandler）
  const fileName = file.name.length > 45 ? `${file.name.substring(0, 45)}...` : file.name;
  slot.player = player;
  slot.file = file;
  slot.title = ` ${fileName}`;
  slot.format = extName;
  slot.objectUrl = objectUrl;
  // 存储errorHandler到player实例上，方便后续移除
  (player as any)._errorHandler = errorHandler;

  title.text(slot.title);
};

// 改变布局
const changeLayout = (layout: string) => {
  initializeVideoSlots(Number(layout));
};

// 重置视频槽位
const resetVideoSlot = (slot: VideoSlot) => {
  const videoContainer = $(`[data-id="${slot.id}"] .video-container`);
  const title = $(`[data-id="${slot.id}"] .video-title`);

  if (slot.player) {
    // 1. 移除事件监听
    const errorHandler = (slot.player as any)._errorHandler;
    if (errorHandler) {
      slot.player.off('error', errorHandler);
    }
    // 2. 销毁播放器实例
    slot.player.destroy();
    slot.player = null;
  }

  // 3. 释放objectUrl
  if (slot.objectUrl) {
    URL.revokeObjectURL(slot.objectUrl);
    slot.objectUrl = null;
  }

  // 4. 清空DOM和数据
  videoContainer.html('<i class="i-mdi:movie-open w-27 h-27"/>');
  slot.file = null;
  slot.title = ``;
  slot.format = '';
  title.text(slot.title);
};

// 组件卸载时彻底清理所有资源
onUnmounted(() => {
  videoSlots.value.forEach(slot => resetVideoSlot(slot));
  videoSlots.value = [];
});

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

const allMuted = ref<boolean>(false);
const muteAll = () => {
  allMuted.value = !allMuted.value;
  videoSlots.value.forEach(slot => {
    if (slot.player) {
      slot.player.muted = allMuted.value;
    }
  });
  ElMessage.success(allMuted.value ? 'All videos have been muted' : 'All videos have been unmuted');
};

const removeAll = () => {
  initializeVideoSlots(Number(selectedLayout.value));
};

const setGlobalVolume = () => {
  videoSlots.value.forEach(slot => {
    if (slot.player) {
      slot.player.volume = globalVolume.value;
    }
  });
};

useEventListener(window, 'keydown', (event) => {
  if (event.key === ' ' || event.code === 'Space') {
    event.preventDefault();
    playAll();
    event.stopPropagation();
  }
});

onMounted(() => {
  initializeVideoSlots(Number(selectedLayout.value));
});
</script>
