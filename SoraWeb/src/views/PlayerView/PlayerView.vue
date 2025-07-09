<template>
  <div class="player-view">
    <vue-plyr ref="plyr">
      <video
        controls
        crossorigin
        playsinline
        :poster="posterUrl"
      >
        <source
          v-for="q in availableQualities"
          :key="q.url"
          :src="q.url"
          :type="q.type || 'video/mp4'"
          :size="q.size || undefined"
        />
        <track
          v-for="s in availableSubtitles"
          :key="s.url"
          kind="subtitles"
          :label="s.label"
          :src="s.url"
          :srclang="s.srclang || 'en'"
          :default="s.url === selectedSubtitleUrl"
        />
      </video>
    </vue-plyr>
    <div v-if="availableQualities.length > 1" class="quality-selector">
      <label>Quality:</label>
      <select v-model="selectedQualityUrl" @change="onQualityChange">
        <option v-for="q in availableQualities" :key="q.url" :value="q.url">{{ q.label }}</option>
      </select>
              </div>
    <div v-if="availableSubtitles.length > 0" class="subtitle-selector">
      <label>Subtitles:</label>
      <select v-model="selectedSubtitleUrl" @change="onSubtitleChange">
        <option v-for="s in availableSubtitles" :key="s.url" :value="s.url">{{ s.label }}</option>
      </select>
            </div>
    <div v-if="hasError" class="error-overlay">
      <div class="error-message">{{ errorMessage }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useModuleStore } from '@/stores/module-store'
import '@skjnldsv/vue-plyr/dist/vue-plyr.css'
import VuePlyr from '@skjnldsv/vue-plyr'

const props = defineProps({
  mediaId: { type: String, required: true },
  episodeId: { type: String, required: true }
})

const moduleStore = useModuleStore()
const plyr = ref(null)
const posterUrl = ref('')
const availableQualities = ref([])
const selectedQualityUrl = ref('')
const availableSubtitles = ref([])
const selectedSubtitleUrl = ref('')
    const hasError = ref(false)
    const errorMessage = ref('')
    
function onQualityChange() {
  // Plyr will auto-switch to the selected source if the <source> order changes
  // We re-sort so the selected quality is first
  if (selectedQualityUrl.value) {
    const idx = availableQualities.value.findIndex(q => q.url === selectedQualityUrl.value)
    if (idx > 0) {
      const q = availableQualities.value.splice(idx, 1)[0]
      availableQualities.value.unshift(q)
    }
  }
}

function onSubtitleChange() {
  // Plyr will auto-select the <track> with default attribute
  // We re-render so the selected subtitle is marked default
}

onMounted(async () => {
  // Look up the full media object by slug
  const slug = props.mediaId
  const mediaObj = moduleStore.getMediaBySlug(slug)
  if (!mediaObj) {
    hasError.value = true
    errorMessage.value = 'Media not found.'
    return
  }
  // Fetch media details using the original href
  try {
    const details = await moduleStore.getDetails({ href: mediaObj.href })
    posterUrl.value = details?.imageUrl || ''
    if (details && details.episodes && details.episodes.length > 0) {
      let ep = details.episodes.find(e => String(e.id) === String(props.episodeId))
      if (!ep) ep = details.episodes[0]
      if (ep) {
        // Extract playable stream info (qualities, subtitles) using the original href
        try {
          const streamInfo = await moduleStore.extractStreamUrl(ep.href)
          if (streamInfo) {
            // Handle qualities
            if (Array.isArray(streamInfo.qualities) && streamInfo.qualities.length > 0) {
              availableQualities.value = streamInfo.qualities
              selectedQualityUrl.value = streamInfo.default || streamInfo.qualities[0].url
            } else if (streamInfo.url) {
              // Fallback: single URL
              availableQualities.value = [{ label: 'Default', url: streamInfo.url }]
              selectedQualityUrl.value = streamInfo.url
      } else {
              hasError.value = true
              errorMessage.value = 'No playable video source found for this episode.'
            }
            // Handle subtitles
            if (Array.isArray(streamInfo.subtitles) && streamInfo.subtitles.length > 0) {
              availableSubtitles.value = streamInfo.subtitles
              selectedSubtitleUrl.value = streamInfo.subtitles[0].url
      } else {
              availableSubtitles.value = []
              selectedSubtitleUrl.value = ''
            }
      } else {
            hasError.value = true
            errorMessage.value = 'No playable video source found for this episode.'
          }
        } catch (streamErr) {
          hasError.value = true
          errorMessage.value = 'Failed to extract video source: ' + streamErr.message
        }
      }
        } else {
      hasError.value = true
      errorMessage.value = 'No episode found.'
    }
  } catch (err) {
      hasError.value = true
    errorMessage.value = 'Failed to load media details.'
  }
})
</script>

<style scoped>
.player-view {
  position: relative;
  width: 100vw;
  height: 100vh;
  background: #000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.quality-selector, .subtitle-selector {
  margin-top: 1rem;
  color: #fff;
  background: rgba(0,0,0,0.7);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.error-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.8);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  z-index: 10;
}
</style> 