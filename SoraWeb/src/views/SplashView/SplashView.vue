<template>
  <div class="splash-view" :class="{ 'fade-out': isExiting }">
    <!-- Background Gradient -->
    <div class="background-gradient"></div>
    
    <!-- Main Content Container -->
    <div class="splash-content" :class="{ 'content-loaded': contentLoaded }">
      <!-- App Logo/Icon -->
      <div class="logo-container" :class="{ 'logo-animate': logoAnimated }">
        <div class="logo-circle">
          <div class="logo-inner">
            <!-- Replace S with logo image -->
            <img :src="logoSrc" alt="Sora Logo" class="logo-img" />
          </div>
        </div>
        <h1 class="app-title" :class="{ 'title-visible': titleVisible }">Sora</h1>
        <p class="app-subtitle" :class="{ 'subtitle-visible': subtitleVisible }">Modular Media Streaming</p>
      </div>

      <!-- Loading Progress -->
      <div class="loading-container" :class="{ 'loading-visible': loadingVisible }">
        <!-- Progress Steps -->
        <div class="loading-steps">
          <div 
            v-for="(step, index) in loadingSteps" 
            :key="step.id"
            class="loading-step"
            :class="{ 
              'step-active': currentStep >= index,
              'step-completed': currentStep > index 
            }"
          >
            <div class="step-indicator">
              <div class="step-dot"></div>
              <div 
                v-if="index < loadingSteps.length - 1"
                class="step-progress"
                :style="{ width: getStepProgress(index) + '%'}"
              ></div>
            </div>
          </div>
        </div>
        <div class="step-label-area">
          <transition name="slide-up-fade" mode="out-in">
            <span :key="currentStepLabel" class="step-label-main">{{ currentStepLabel }}</span>
          </transition>
        </div>

        <!-- Current Loading Message -->
        <div class="loading-message" :class="{ 'message-visible': messageVisible }">
          <p>{{ currentLoadingMessage }}</p>
        </div>

        <!-- Progress Bar -->
        <div class="progress-bar-container">
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ 
                width: totalProgress + '%',
                background: progressGradient 
              }"
            ></div>
          </div>
          <span class="progress-text">{{ Math.round(totalProgress) }}%</span>
        </div>
      </div>

      <!-- Error State -->
      <div v-if="hasError" class="error-container">
        <div class="error-icon">⚠️</div>
        <h3>Something went wrong</h3>
        <p>{{ errorMessage }}</p>
        <button @click="retryLoading" class="retry-button ios-button">
          Try Again
        </button>
      </div>
    </div>

    <!-- Loading Particles (Optional Enhancement) -->
    <div class="particles-container" v-if="showParticles">
      <div 
        v-for="particle in particles" 
        :key="particle.id"
        class="particle"
        :style="particle.style"
      ></div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed, nextTick } from 'vue'
import eLipseDark from '@/assets/e-lipse-dark.png'
import eLipseLight from '@/assets/e-lipse-light.png'

export default {
  name: 'SplashView',
  emits: ['loading-complete'],
  setup(props, { emit }) {
    // Reactive state
    const isExiting = ref(false)
    const contentLoaded = ref(false)
    const logoAnimated = ref(false)
    const titleVisible = ref(false)
    const subtitleVisible = ref(false)
    const loadingVisible = ref(false)
    const messageVisible = ref(false)
    const currentStep = ref(-1)
    const totalProgress = ref(0)
    const hasError = ref(false)
    const errorMessage = ref('')
    const showParticles = ref(true)

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const logoSrc = ref(prefersDark ? eLipseDark : eLipseLight)

    // Loading steps configuration
    const loadingSteps = ref([
      { id: 'init', label: 'Initializing', duration: 300 },
      { id: 'stores', label: 'Loading Data', duration: 500 },
      { id: 'modules', label: 'Checking Modules', duration: 400 },
      { id: 'theme', label: 'Applying Theme', duration: 200 },
      { id: 'ready', label: 'Almost Ready', duration: 300 }
    ])

    // Current loading message
    const currentLoadingMessage = computed(() => {
      if (currentStep.value >= 0 && currentStep.value < loadingSteps.value.length) {
        const step = loadingSteps.value[currentStep.value]
        const messages = {
          init: 'Setting up the application...',
          stores: 'Loading your library and preferences...',
          modules: 'Checking for available streaming sources...',
          theme: 'Applying your preferred theme...',
          ready: 'Finalizing setup...'
        }
        return messages[step.id] || 'Loading...'
      }
      return 'Starting up...'
    })

    // Dynamic progress gradient
    const progressGradient = computed(() => {
      const progress = totalProgress.value
      if (progress < 25) {
        return 'linear-gradient(90deg, var(--ios-blue) 0%, var(--ios-blue) 100%)'
      } else if (progress < 50) {
        return 'linear-gradient(90deg, var(--ios-blue) 0%, var(--ios-green) 100%)'
      } else if (progress < 75) {
        return 'linear-gradient(90deg, var(--ios-green) 0%, var(--ios-orange) 100%)'
      } else {
        return 'linear-gradient(90deg, var(--ios-orange) 0%, var(--success-color) 100%)'
      }
    })

    // Particles for visual enhancement
    const particles = ref([])

    const generateParticles = () => {
      particles.value = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        style: {
          left: Math.random() * 100 + '%',
          top: Math.random() * 100 + '%',
          animationDelay: Math.random() * 3 + 's',
          animationDuration: (Math.random() * 3 + 2) + 's'
        }
      }))
    }

    const getStepProgress = (stepIndex) => {
      if (currentStep.value > stepIndex) return 100
      if (currentStep.value === stepIndex) {
        const stepProgress = (totalProgress.value % (100 / loadingSteps.value.length)) * (loadingSteps.value.length)
        return Math.min(100, stepProgress)
      }
      return 0
    }

    const animateEntrance = async () => {
      // Stagger the entrance animations for smooth iOS-like feel
      await nextTick()
      
      setTimeout(() => {
        contentLoaded.value = true
      }, 100)
      
      setTimeout(() => {
        logoAnimated.value = true
      }, 200)
      
      setTimeout(() => {
        titleVisible.value = true
      }, 500)
      
      setTimeout(() => {
        subtitleVisible.value = true
      }, 700)
      
      setTimeout(() => {
        loadingVisible.value = true
      }, 900)
      
      setTimeout(() => {
        messageVisible.value = true
        startLoading()
      }, 1100)
    }

    const startLoading = async () => {
      try {
        for (let i = 0; i < loadingSteps.value.length; i++) {
          currentStep.value = i
          const step = loadingSteps.value[i]
          
          // Simulate step-by-step loading with realistic timing
          await simulateStepLoading(step, i)
          
          // Update total progress
          totalProgress.value = ((i + 1) / loadingSteps.value.length) * 100
        }
        
        // Complete loading
        setTimeout(() => {
          completeLoading()
        }, 500)
        
      } catch (error) {
        handleLoadingError(error)
      }
    }

    const simulateStepLoading = (step, stepIndex) => {
      return new Promise((resolve) => {
        const duration = step.duration
        let elapsed = 0
        const interval = 50
        
        const progressTimer = setInterval(() => {
          elapsed += interval
          const stepProgress = (elapsed / duration) * 100
          const globalProgress = (stepIndex / loadingSteps.value.length) * 100 + 
                               (stepProgress / loadingSteps.value.length)
          totalProgress.value = Math.min(100, globalProgress)
          
          if (elapsed >= duration) {
            clearInterval(progressTimer)
            resolve()
          }
        }, interval)
      })
    }

    const completeLoading = () => {
      totalProgress.value = 100
      
      setTimeout(() => {
        isExiting.value = true
        
        setTimeout(() => {
          emit('loading-complete')
        }, 600) // Wait for exit animation
      }, 200)
    }

    const handleLoadingError = (error) => {
      console.error('Loading error:', error)
      hasError.value = true
      errorMessage.value = error.message || 'Failed to initialize application'
    }

    const retryLoading = () => {
      // Reset all states
      hasError.value = false
      errorMessage.value = ''
      currentStep.value = -1
      totalProgress.value = 0
      
      // Restart loading process
      setTimeout(() => {
        startLoading()
      }, 500)
    }

    onMounted(() => {
      generateParticles()
      animateEntrance()
    })

    const currentStepLabel = computed(() => {
      if (currentStep.value >= 0 && currentStep.value < loadingSteps.value.length) {
        return loadingSteps.value[currentStep.value].label
      }
      return ''
    })

    return {
      // State
      isExiting,
      contentLoaded,
      logoAnimated,
      titleVisible,
      subtitleVisible,
      loadingVisible,
      messageVisible,
      currentStep,
      totalProgress,
      hasError,
      errorMessage,
      showParticles,
      logoSrc,
      
      // Data
      loadingSteps,
      particles,
      
      // Computed
      currentLoadingMessage,
      progressGradient,
      currentStepLabel,
      
      // Methods
      getStepProgress,
      retryLoading
    }
  }
}
</script>

<style scoped>
.splash-view {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--background-primary);
  color: var(--text-primary);
  overflow: hidden;
  z-index: 9999;
  transition: opacity var(--transition-slow) var(--ease-out-ios);
}

.splash-view.fade-out {
  opacity: 0;
}

.background-gradient {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(
    circle at center,
    var(--accent-color-tertiary) 0%,
    transparent 70%
  );
  opacity: 0.3;
  animation: gradientPulse 4s ease-in-out infinite;
}

@keyframes gradientPulse {
  0%, 100% { transform: scale(1); opacity: 0.3; }
  50% { transform: scale(1.1); opacity: 0.1; }
}

.splash-content {
  text-align: center;
  max-width: 400px;
  padding: var(--spacing-xl);
  opacity: 0;
  transform: translateY(20px);
  transition: all var(--transition-slow) var(--ease-out-ios);
}

.splash-content.content-loaded {
  opacity: 1;
  transform: translateY(0);
}

/* Logo Section */
.logo-container {
  margin-bottom: var(--spacing-2xl);
}

.logo-circle {
  width: 120px;
  height: 120px;
  margin: 0 auto var(--spacing-lg);
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent-color), var(--accent-color-secondary));
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--ios-shadow-elevated);
  transform: scale(0.8);
  opacity: 0;
  transition: all var(--transition-spring);
}

.logo-container.logo-animate .logo-circle {
  transform: scale(1);
  opacity: 1;
}

.logo-inner {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: var(--background-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: logoRotate 3s ease-in-out infinite;
}

@keyframes logoRotate {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(180deg); }
}

.logo-text {
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  color: var(--accent-color);
  font-family: var(--font-family-primary);
}

.app-title {
  font-size: var(--font-size-large-title);
  font-weight: var(--font-weight-bold);
  color: var(--accent-color);
  margin-bottom: var(--spacing-sm);
  opacity: 0;
  transform: translateY(10px);
  transition: all var(--transition-normal) var(--ease-out-ios);
}

.app-title.title-visible {
  opacity: 1;
  transform: translateY(0);
}

.app-subtitle {
  font-size: var(--font-size-callout);
  font-weight: var(--font-weight-medium);
  color: var(--text-secondary);
  opacity: 0;
  transform: translateY(10px);
  transition: all var(--transition-normal) var(--ease-out-ios);
  transition-delay: 0.1s;
}

.app-subtitle.subtitle-visible {
  opacity: 1;
  transform: translateY(0);
}

/* Loading Section */
.loading-container {
  opacity: 0;
  transform: translateY(20px);
  transition: all var(--transition-normal) var(--ease-out-ios);
}

.loading-container.loading-visible {
  opacity: 1;
  transform: translateY(0);
}

.loading-steps {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--spacing-lg);
  padding: 0 var(--spacing-md);
}

.loading-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  margin: 0 var(--spacing-xs);
}

.step-indicator {
  position: relative;
  width: 100%;
  min-width: 32px; /* Ensures enough space for the bar */
  height: 12px;
  margin-bottom: var(--spacing-xs);
  display: flex;
  align-items: center;
  justify-content: center;
}

.step-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--background-tertiary);
  transition: all var(--transition-fast);
  z-index: 1;
}

.loading-step.step-active .step-dot {
  background: var(--accent-color);
  animation: stepPulse 1s ease-in-out infinite;
}

.loading-step.step-completed .step-dot {
  background: var(--success-color);
}

@keyframes stepPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

.step-progress {
  position: absolute;
  left: 50%;
  top: 50%;
  height: 2px;
  background: var(--accent-color);
  transform: translateY(-50%);
  transition: width var(--transition-normal);
  width: calc(100% - 6px); /* 100% minus the radius of the dot, so it reaches the next dot's center */
  z-index: 0;
}

.step-label {
  font-size: var(--font-size-caption);
  color: var(--text-tertiary);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 80px;
}

.loading-step.step-active .step-label {
  color: var(--text-secondary);
  font-weight: var(--font-weight-medium);
}

.loading-message {
  margin-bottom: var(--spacing-lg);
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.loading-message.message-visible {
  opacity: 1;
}

.loading-message p {
  font-size: var(--font-size-callout);
  color: var(--text-secondary);
  font-weight: var(--font-weight-medium);
}

/* Progress Bar */
.progress-bar-container {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: var(--background-tertiary);
  border-radius: var(--border-radius-lg);
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  border-radius: var(--border-radius-lg);
  transition: width var(--transition-normal) var(--ease-out-ios);
  position: relative;
  overflow: hidden;
}

.progress-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
  animation: progressShimmer 2s infinite;
}

@keyframes progressShimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}

.progress-text {
  font-size: var(--font-size-callout);
  font-weight: var(--font-weight-semibold);
  color: var(--accent-color);
  min-width: 40px;
  text-align: right;
}

/* Error State */
.error-container {
  text-align: center;
  padding: var(--spacing-xl);
  background: var(--background-card);
  border-radius: var(--ios-radius-card);
  border: 1px solid var(--error-color-secondary);
}

.error-icon {
  font-size: var(--font-size-3xl);
  margin-bottom: var(--spacing-md);
}

.error-container h3 {
  font-size: var(--font-size-title3);
  font-weight: var(--font-weight-semibold);
  color: var(--error-color);
  margin-bottom: var(--spacing-sm);
}

.error-container p {
  font-size: var(--font-size-callout);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-lg);
}

.retry-button {
  background: var(--error-color);
  color: var(--background-primary);
}

.retry-button:hover {
  background: var(--error-color-secondary);
}

/* Particles */
.particles-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden;
}

.particle {
  position: absolute;
  width: 4px;
  height: 4px;
  background: var(--accent-color-tertiary);
  border-radius: 50%;
  animation: particleFloat 4s linear infinite;
}

@keyframes particleFloat {
  0% {
    transform: translateY(100vh) translateX(0);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    transform: translateY(-100vh) translateX(20px);
    opacity: 0;
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .splash-content {
    padding: var(--spacing-lg);
    max-width: 320px;
  }
  
  .logo-circle {
    width: 100px;
    height: 100px;
  }
  
  .logo-inner {
    width: 80px;
    height: 80px;
  }
  
  .logo-text {
    font-size: var(--font-size-2xl);
  }
  
  .app-title {
    font-size: var(--font-size-title1);
  }
  
  .loading-steps {
    padding: 0;
  }
  
  .step-label {
    font-size: var(--font-size-footnote);
    max-width: 60px;
  }
}

@media (max-width: 480px) {
  .loading-steps {
    flex-direction: column;
    gap: var(--spacing-sm);
  }
  
  .loading-step {
    flex-direction: row;
    justify-content: flex-start;
    text-align: left;
  }
  
  .step-indicator {
    margin-right: var(--spacing-sm);
    margin-bottom: 0;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .logo-inner {
    animation: none;
  }
  
  .background-gradient {
    animation: none;
  }
  
  .particle {
    animation: none;
  }
  
  .step-dot {
    animation: none;
  }
  
  .progress-fill::after {
    animation: none;
  }
}

.logo-img {
  width: 96px;
  height: 96px;
  display: block;
  margin: 0 auto;
}

.step-label-area {
  min-height: 2.5em;
  margin-bottom: var(--spacing-lg);
  display: flex;
  align-items: center;
  justify-content: center;
}
.step-label-main {
  font-size: var(--font-size-callout);
  color: var(--text-secondary);
  font-weight: var(--font-weight-medium);
  text-align: center;
  display: inline-block;
}
.slide-up-fade-enter-active, .slide-up-fade-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-up-fade-enter-from {
  opacity: 0;
  transform: translateY(20px);
}
.slide-up-fade-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style> 