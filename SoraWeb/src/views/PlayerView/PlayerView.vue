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
          :type="q.type || 'application/x-mpegURL'"
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
    <div class="controls-overlay">
      <div v-if="availableQualities.length > 1" class="quality-selector">
        <label>Stream:</label>
        <select v-model="selectedQualityUrl" @change="onQualityChange">
          <option v-for="q in availableQualities" :key="q.url" :value="q.url">
            {{ q.label || (q.type ? `${q.type} Stream` : 'Default') }}
          </option>
        </select>
      </div>
      <div v-if="availableSubtitles.length > 0" class="subtitle-selector">
        <label>Subtitles:</label>
        <select v-model="selectedSubtitleUrl" @change="onSubtitleChange">
          <option value="">Off</option>
          <option v-for="s in availableSubtitles" :key="s.url" :value="s.url">{{ s.label }}</option>
        </select>
      </div>
    </div>
    <div v-if="hasError" class="error-overlay">
      <div class="error-message">{{ errorMessage }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import { useModuleStore } from '@/stores/module-store'
import '@skjnldsv/vue-plyr/dist/vue-plyr.css'
import VuePlyr from '@skjnldsv/vue-plyr'
import { useRoute } from 'vue-router'
import { extractStreams } from '@/utils/m3u8Parser'

const props = defineProps({
  mediaId: { type: String, required: true },
  episodeId: { type: String, required: true }
})

const route = useRoute()
const moduleStore = useModuleStore()
const plyr = ref(null)
const posterUrl = ref('')
const availableQualities = ref([])
const selectedQualityUrl = ref('')
const availableSubtitles = ref([])
const selectedSubtitleUrl = ref('')
const hasError = ref(false)
const errorMessage = ref('')

// Get stream from query params
let streamUrl = route.query.stream
const streamType = route.query.type || 'application/x-mpegURL'
let subtitleUrl = route.query.subtitle
let streamHeaders = {}
if (route.query.headers) {
  try {
    streamHeaders = JSON.parse(decodeURIComponent(route.query.headers))
  } catch {}
}

function onQualityChange() {
  // Store the current time
  const currentTime = plyr.value?.player?.currentTime || 0
  const wasPlaying = !plyr.value?.player?.paused

  // Plyr will auto-switch to the selected source if the <source> order changes
  // We re-sort so the selected quality is first
  if (selectedQualityUrl.value) {
    const idx = availableQualities.value.findIndex(q => q.url === selectedQualityUrl.value)
    if (idx > 0) {
      const q = availableQualities.value.splice(idx, 1)[0]
      availableQualities.value.unshift(q)
    }
  }

  // After source change, restore playback state
  setTimeout(() => {
    if (plyr.value?.player) {
      plyr.value.player.currentTime = currentTime
      if (wasPlaying) {
        plyr.value.player.play()
      }
    }
  }, 100)
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

  try {
    // Fetch media details for poster
    const details = await moduleStore.getDetails({ href: mediaObj.href })
    posterUrl.value = details?.imageUrl || ''

    // If we have a stream URL from the query params, process it
    if (streamUrl) {
      let masterUrl = streamUrl
      // If the streamUrl is encoded, decode it
      try {
        masterUrl = decodeURIComponent(streamUrl)
      } catch {}

      // If a CORS proxy is needed, prepend it
      const corsProxy = import.meta.env.VITE_CORS_PROXY || ''
      let proxiedUrl = masterUrl
      if (corsProxy && !masterUrl.startsWith(corsProxy)) {
        proxiedUrl = corsProxy + encodeURIComponent(masterUrl)
      }

      // If the URL looks like a master playlist, parse it
      if (proxiedUrl.endsWith('.m3u8')) {
        try {
          const qualities = await extractStreams(proxiedUrl, corsProxy, streamHeaders)
          if (qualities.length > 0) {
            availableQualities.value = qualities
            selectedQualityUrl.value = qualities[0].url
          }
        } catch (e) {
          console.warn('Failed to parse master playlist:', e)
        }
      } else {
        // Not a playlist, just use the direct stream
        availableQualities.value = [{
          url: proxiedUrl,
          type: streamType,
          label: 'Default Stream'
        }]
        selectedQualityUrl.value = proxiedUrl
      }

      // Handle subtitles if present
      if (subtitleUrl) {
        try {
          subtitleUrl = decodeURIComponent(subtitleUrl)
        } catch {}
        if (corsProxy && !subtitleUrl.startsWith(corsProxy)) {
          subtitleUrl = corsProxy + encodeURIComponent(subtitleUrl)
        }
        availableSubtitles.value = [{
          url: subtitleUrl,
          label: 'English',
          srclang: 'en'
        }]
        selectedSubtitleUrl.value = subtitleUrl
      }
    } else {
      hasError.value = true
      errorMessage.value = 'No stream URL provided.'
    }
  } catch (err) {
    hasError.value = true
    errorMessage.value = 'Failed to load media details.'
  }
})

// Watch for quality list updates and reload the player source
watch(availableQualities, async (newVal) => {
  if (plyr.value && newVal.length > 0) {
    await nextTick()
    const sources = newVal.map(q => ({
      src: q.url,
      type: q.type || 'application/x-mpegURL',
      size: q.height || undefined
    }))
    try {
      plyr.value.player.source = {
        type: 'video',
        sources
      }
      // Auto play after source load
      plyr.value.player.play()
    } catch (e) {
      console.warn('Failed to reload player source:', e)
    }
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

.controls-overlay {
  position: absolute;
  bottom: 60px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 1rem;
  z-index: 2;
}

.quality-selector, .subtitle-selector {
  color: #fff;
  background: rgba(0,0,0,0.7);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

select {
  background: rgba(255,255,255,0.1);
  color: #fff;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
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