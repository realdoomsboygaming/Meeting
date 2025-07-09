<template>
  <div class="settings-page">
    <!-- Navigation Header -->
    <div class="settings-navigation-header">
      <button @click="$router.back()" class="settings-back-button">
        <i class="icon-chevron-left"></i>
        <span>Back</span>
      </button>
    </div>
    <!-- Page Header -->
    <div class="settings-page-header">
      <h2>Network Settings</h2>
      <p>Configure network and proxy options for Sora.</p>
    </div>
    <div class="settings-category">
      <h3 class="category-title">CORS PROXY</h3>
      <div class="settings-card">
        <div class="settings-form-row">
          <span class="settings-label">Proxy URL</span>
          <input
            id="cors-proxy-url"
            type="url"
            class="settings-select"
            v-model="corsProxyUrl"
            placeholder="https://your-proxy-url.com/"
            @input="onProxyUrlChange"
          />
        </div>
        <div class="settings-divider"></div>
        <div class="settings-form-row">
          <span class="settings-label">Info</span>
          <span class="settings-info">
            A CORS proxy is used to bypass cross-origin restrictions when fetching data from modules. The default proxy is recommended, but you can specify a custom one.
            <a href="https://github.com/realdoomsboygaming/cloudflare-cors-anywhere" target="_blank" rel="noopener noreferrer" class="settings-link">Learn more</a>.
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useSettingsStore } from '@/stores/settings-store';

const settingsStore = useSettingsStore();
const corsProxyUrl = ref('');
let debounceTimer = null;

onMounted(() => {
  corsProxyUrl.value = settingsStore.corsProxyUrl;
});

const onProxyUrlChange = (event) => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  const newUrl = event.target.value;
  debounceTimer = setTimeout(() => {
    settingsStore.updateCorsProxyUrl(newUrl);
  }, 500); // 500ms debounce
};
</script>

<style lang="scss" scoped>
@import '@/styles/settings-shared.scss';
.settings-info {
  font-size: 0.95rem;
  color: var(--text-secondary);
  line-height: 1.5;
  max-width: 340px;
}
.settings-link {
  color: var(--ios-blue, #007aff);
  text-decoration: underline;
  cursor: pointer;
  font-weight: 500;
  transition: color 0.2s;
}
.settings-link:hover {
  color: var(--ios-blue-dark, #0051a8);
}
</style> 