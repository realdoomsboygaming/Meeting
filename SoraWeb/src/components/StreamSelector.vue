<template>
  <div class="stream-selector-overlay" v-if="show">
    <div class="stream-selector-modal">
      <h2>Select Stream</h2>
      <div class="stream-options">
        <button 
          v-for="stream in streams" 
          :key="stream.url"
          class="stream-option"
          :class="{ selected: selectedStream?.url === stream.url }"
          @click="selectStream(stream)"
        >
          {{ stream.label || (stream.type ? `${stream.type} Stream` : 'Default') }}
        </button>
      </div>
      <div class="stream-actions">
        <button 
          class="play-button" 
          :disabled="!selectedStream"
          @click="onPlay"
        >
          Play
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    required: true
  },
  streams: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['play', 'close'])

const selectedStream = ref(null)

function selectStream(stream) {
  selectedStream.value = stream
}

function onPlay() {
  if (selectedStream.value) {
    emit('play', selectedStream.value)
  }
}
</script>

<style scoped>
.stream-selector-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.stream-selector-modal {
  background: #1a1a1a;
  border-radius: 12px;
  padding: 2rem;
  width: 90%;
  max-width: 500px;
}

h2 {
  color: #fff;
  margin: 0 0 1.5rem;
  text-align: center;
  font-size: 1.5rem;
}

.stream-options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stream-option {
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid transparent;
  border-radius: 8px;
  padding: 1rem;
  color: #fff;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.stream-option:hover {
  background: rgba(255, 255, 255, 0.15);
}

.stream-option.selected {
  border-color: #3498db;
  background: rgba(52, 152, 219, 0.2);
}

.stream-actions {
  display: flex;
  justify-content: center;
}

.play-button {
  background: #3498db;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.8rem 2rem;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.play-button:hover {
  background: #2980b9;
}

.play-button:disabled {
  background: #666;
  cursor: not-allowed;
}
</style> 