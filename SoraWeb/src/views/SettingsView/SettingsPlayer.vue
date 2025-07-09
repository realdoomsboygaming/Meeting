<template>
  <div class="settings-page">
    <!-- Navigation Header -->
    <div class="settings-navigation-header">
      <button @click="goBack" class="settings-back-button">
        <i class="icon-chevron-left"></i>
        <span>Settings</span>
      </button>
    </div>
    
    <!-- Page Header -->
    <div class="settings-page-header">
      <h2>Player Settings</h2>
      <p>Configure video player preferences and behavior</p>
    </div>

    <!-- Video Quality -->
    <div class="settings-category">
      <h3 class="category-title">VIDEO QUALITY</h3>
      <div class="settings-card">
        <div class="settings-form-row">
          <span class="settings-label">Default Quality</span>
          <select v-model="defaultQuality" @change="updateDefaultQuality" class="settings-select">
            <option value="auto">Auto</option>
            <option value="1080p">1080p</option>
            <option value="720p">720p</option>
            <option value="480p">480p</option>
          </select>
        </div>
        
        <div class="settings-divider"></div>
        
        <div class="settings-form-row">
          <label class="settings-toggle">
            <input type="checkbox" v-model="autoQuality" @change="updateAutoQuality" />
            <span>Automatically adjust quality based on connection</span>
          </label>
        </div>
      </div>
    </div>

    <!-- Playback -->
    <div class="settings-category">
      <h3 class="category-title">PLAYBACK</h3>
      <div class="settings-card">
        <div class="settings-form-row">
          <label class="settings-toggle">
            <input type="checkbox" v-model="autoPlay" @change="updateAutoPlay" />
            <span>Auto-play next episode</span>
          </label>
        </div>
        
        <div class="settings-divider"></div>
        
        <div class="settings-form-row">
          <label class="settings-toggle">
            <input type="checkbox" v-model="autoFullscreen" @change="updateAutoFullscreen" />
            <span>Enter fullscreen when starting video</span>
          </label>
        </div>
        
        <div class="settings-divider"></div>
        
        <div class="settings-form-row">
          <span class="settings-label">Skip Intro Duration</span>
          <select v-model="skipIntro" @change="updateSkipIntro" class="settings-select">
            <option value="0">Disabled</option>
            <option value="30">30 seconds</option>
            <option value="60">1 minute</option>
            <option value="90">1.5 minutes</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Subtitles -->
    <div class="settings-category">
      <h3 class="category-title">SUBTITLES</h3>
      <div class="settings-card">
        <div class="settings-form-row">
          <span class="settings-label">Default Language</span>
          <select v-model="subtitleLanguage" @change="updateSubtitleLanguage" class="settings-select">
            <option value="off">Off</option>
            <option value="en">English</option>
            <option value="ja">Japanese</option>
            <option value="es">Spanish</option>
          </select>
        </div>
        
        <div class="settings-divider"></div>
        
        <div class="settings-form-row">
          <span class="settings-label">Font Size</span>
          <select v-model="subtitleSize" @change="updateSubtitleSize" class="settings-select">
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Controls -->
    <div class="settings-category">
      <h3 class="category-title">CONTROLS</h3>
      <div class="settings-card">
        <div class="settings-form-row">
          <span class="settings-label">Skip Forward</span>
          <select v-model="skipForward" @change="updateSkipForward" class="settings-select">
            <option value="10">10 seconds</option>
            <option value="30">30 seconds</option>
            <option value="60">1 minute</option>
          </select>
        </div>
        
        <div class="settings-divider"></div>
        
        <div class="settings-form-row">
          <span class="settings-label">Skip Backward</span>
          <select v-model="skipBackward" @change="updateSkipBackward" class="settings-select">
            <option value="5">5 seconds</option>
            <option value="10">10 seconds</option>
            <option value="30">30 seconds</option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores/settings-store'

export default {
  name: 'SettingsPlayer',
  setup() {
    console.log('mounted', 'SettingsPlayer')
    const router = useRouter()
    const settingsStore = useSettingsStore()

    const defaultQuality = ref('auto')
    const autoQuality = ref(true)
    const autoPlay = ref(true)
    const autoFullscreen = ref(false)
    const skipIntro = ref('0')
    const subtitleLanguage = ref('off')
    const subtitleSize = ref('medium')
    const skipForward = ref('30')
    const skipBackward = ref('10')

    const updateDefaultQuality = () => {
      settingsStore.updatePlayerSettings({ defaultQuality: defaultQuality.value })
    }

    const updateAutoQuality = () => {
      settingsStore.updatePlayerSettings({ autoQuality: autoQuality.value })
    }

    const updateAutoPlay = () => {
      settingsStore.updatePlayerSettings({ autoPlay: autoPlay.value })
    }

    const updateAutoFullscreen = () => {
      settingsStore.updatePlayerSettings({ autoFullscreen: autoFullscreen.value })
    }

    const updateSkipIntro = () => {
      settingsStore.updatePlayerSettings({ skipIntro: parseInt(skipIntro.value) })
    }

    const updateSubtitleLanguage = () => {
      settingsStore.updatePlayerSettings({ subtitleLanguage: subtitleLanguage.value })
    }

    const updateSubtitleSize = () => {
      settingsStore.updatePlayerSettings({ subtitleSize: subtitleSize.value })
    }

    const updateSkipForward = () => {
      settingsStore.updatePlayerSettings({ skipForward: parseInt(skipForward.value) })
    }

    const updateSkipBackward = () => {
      settingsStore.updatePlayerSettings({ skipBackward: parseInt(skipBackward.value) })
    }

    const goBack = () => {
      router.replace('/settings');
    }

    const loadSettings = () => {
      const settings = settingsStore.playerSettings || {};
      defaultQuality.value = settings.defaultQuality || 'auto';
      autoQuality.value = settings.autoQuality !== false;
      autoPlay.value = settings.autoPlay !== false;
      autoFullscreen.value = settings.autoFullscreen === true;
      skipIntro.value = String(settings.skipIntro || 0);
      subtitleLanguage.value = settings.subtitleLanguage || 'off';
      subtitleSize.value = settings.subtitleSize || 'medium';
      skipForward.value = String(settings.skipForward || 30);
      skipBackward.value = String(settings.skipBackward || 10);
    }

    onMounted(() => {
      loadSettings()
    })

    return {
      defaultQuality,
      autoQuality,
      autoPlay,
      autoFullscreen,
      skipIntro,
      subtitleLanguage,
      subtitleSize,
      skipForward,
      skipBackward,
      goBack,
      updateDefaultQuality,
      updateAutoQuality,
      updateAutoPlay,
      updateAutoFullscreen,
      updateSkipIntro,
      updateSubtitleLanguage,
      updateSubtitleSize,
      updateSkipForward,
      updateSkipBackward
    }
  }
}
</script>

<style scoped>
/* All styles are now handled by the shared settings-shared.scss */
/* No component-specific styles needed for this component */
</style> 