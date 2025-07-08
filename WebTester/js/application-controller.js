// application-controller.js - Main application controller using new module system
// Replaces the monolithic sora-app.js with clean modular architecture

// Import all our new module system components
import { ModuleExecutionManager } from './module-system/core/module-execution-manager.js';
import { SettingsManager } from './module-system/core/settings-manager.js';
import { NetworkUtils } from './module-system/core/network-utils.js';
import { SearchController } from './module-system/controllers/search-controller.js';
import { DetailsController } from './module-system/controllers/details-controller.js';
import { StreamsController } from './module-system/controllers/streams-controller.js';
import { EnhancedPlayer } from './module-system/player/enhanced-player.js';
import { QualityManager } from './module-system/player/quality-manager.js';
import { SubtitleManager } from './module-system/player/subtitle-manager.js';

class ApplicationController {
    constructor() {
        // Core system components
        this.moduleManager = null; // Will be injected from enhanced module manager
        this.settingsManager = new SettingsManager();
        this.networkUtils = new NetworkUtils();
        this.moduleExecutionManager = new ModuleExecutionManager();
        
        // Controllers
        this.searchController = new SearchController();
        this.detailsController = new DetailsController();
        this.streamsController = new StreamsController();
        
        // Player components
        this.enhancedPlayer = null;
        this.qualityManager = null;
        this.subtitleManager = null;
        
        // UI state
        this.currentSection = 'home';
        this.searchResults = [];
        this.selectedModule = null;
        this.isInitialized = false;
        
        // Web Worker for background operations
        this.worker = null;
        this.workerPromises = new Map();
        
        // Performance tracking
        this.performanceMetrics = {
            searchCount: 0,
            loadTime: Date.now(),
            memoryUsage: 0
        };
        
        this.initializeApplication();
    }

    async initializeApplication() {
        try {
            // Initialize UI elements first (needed for logging)
            this.initializeElements();
            
            this.log('Initializing Application Controller...', 'info');
            
            // Initialize worker
            this.initializeWorker();
            
            // Initialize player components
            await this.initializePlayerComponents();
            
            // Bind event handlers
            this.bindEventHandlers();
            
            // Initialize navigation
            this.initializeNavigation();
            
            // Load settings and apply theme
            await this.loadApplicationSettings();
            
            // Setup performance monitoring
            this.setupPerformanceMonitoring();
            
            this.isInitialized = true;
            this.log('Application Controller initialized successfully', 'success');
            
            // Hide loading screen
            this.hideLoadingScreen();
            
        } catch (error) {
            this.log(`Failed to initialize application: ${error.message}`, 'error');
            console.error('Application initialization error:', error);
        }
    }

    initializeElements() {
        // Cache all important DOM elements
        this.elements = {
            // Navigation
            navItems: document.querySelectorAll('.nav-item'),
            sections: document.querySelectorAll('.content-section'),
            
            // Module management
            moduleUrlInput: document.getElementById('module-url-input'),
            importModuleBtn: document.getElementById('import-module-btn'),
            modulesList: document.getElementById('modules-list'),
            selectedModuleInfo: document.getElementById('selected-module-info'),
            jsonInput: document.getElementById('json-input'),
            jsInput: document.getElementById('js-input'),
            loadModuleBtn: document.getElementById('load-module-btn'),
            
            // Search interface
            searchQuery: document.getElementById('search-query'),
            searchBtn: document.getElementById('search-btn'),
            searchResults: document.querySelector('.search-results'),
            detailsContainer: document.getElementById('details-container'),
            episodesSection: document.querySelector('.episodes-section'),
            episodesList: document.querySelector('.episodes-list'),
            
            // Player interface
            playerSection: document.getElementById('player-section'),
            streamContainer: document.getElementById('stream-container'),
            playerPlaceholder: document.getElementById('player-placeholder'),
            plyrWrapper: document.getElementById('plyr-wrapper'),
            playerInfo: document.getElementById('player-info'),
            streamTitle: document.getElementById('stream-title'),
            streamUrlDisplay: document.getElementById('stream-url-display'),
            qualitySelector: document.getElementById('quality-selector'),
            qualitySelect: document.getElementById('quality-select'),
            
            // Performance monitoring
            logOutput: document.getElementById('log-output'),
            performanceSidebar: document.getElementById('performance-sidebar'),
            sidebarOverlay: document.getElementById('sidebar-overlay'),
            
            // Status indicators
            connectionStatus: document.getElementById('connection-status'),
            modulesCount: document.getElementById('modules-count'),
            searchCount: document.getElementById('search-count'),
            performanceScore: document.getElementById('performance-score'),
            
            // Proxy controls
            proxyTestBtn: document.getElementById('proxy-test-btn'),
            proxySettingsBtn: document.getElementById('proxy-settings-btn')
        };
        
        this.log('UI elements initialized', 'info');
    }

    initializeWorker() {
        if (!window.Worker) {
            this.log('Web Workers not supported, using main thread', 'warning');
            return;
        }

        // TODO: Fix ES6 module imports in worker - temporarily disabled
        this.log('Worker temporarily disabled due to ES6 module import issues', 'warning');
        this.worker = null;
        return;

        try {
            this.worker = new Worker('./js/modernized-search-worker.js');
            this.worker.addEventListener('message', (event) => this.handleWorkerMessage(event));
            this.worker.addEventListener('error', (error) => this.handleWorkerError(error));
            this.log('Modernized search worker initialized', 'info');
        } catch (error) {
            this.log(`Worker initialization failed: ${error.message}`, 'error');
            this.worker = null;
        }
    }

    async initializePlayerComponents() {
        try {
            // Get the actual DOM element for the player container
            const playerContainer = document.getElementById('player');
            if (!playerContainer) {
                throw new Error('Player container element not found');
            }

            // Initialize enhanced player with Plyr
            this.enhancedPlayer = new EnhancedPlayer(playerContainer, {
                wrapper: '#plyr-wrapper',
                onReady: () => this.log('Enhanced Player ready', 'info'),
                onError: (error) => this.log(`Player error: ${error}`, 'error')
            });

            // Initialize quality manager
            this.qualityManager = new QualityManager({
                player: this.enhancedPlayer,
                networkUtils: this.networkUtils,
                onQualityChange: (quality) => this.updateQualityDisplay(quality)
            });

            // Initialize subtitle manager
            this.subtitleManager = new SubtitleManager(this.enhancedPlayer);
            
            // Set up subtitle event handlers
            this.subtitleManager.on('tracksloaded', (data) => {
                this.log(`Subtitle tracks loaded: ${data.tracks.length}`, 'info');
            });
            
            this.subtitleManager.on('error', (error) => {
                this.log(`Subtitle error: ${error}`, 'error');
            });

            await this.enhancedPlayer.initialize();
            this.log('Player components initialized successfully', 'success');
            
        } catch (error) {
            this.log(`Player initialization failed: ${error.message}`, 'error');
            throw error;
        }
    }

    bindEventHandlers() {
        // Module management events
        if (this.elements.importModuleBtn) {
            this.elements.importModuleBtn.addEventListener('click', () => this.importModule());
        }
        
        if (this.elements.loadModuleBtn) {
            this.elements.loadModuleBtn.addEventListener('click', () => this.loadModuleManually());
        }

        // Search events
        if (this.elements.searchBtn) {
            this.elements.searchBtn.addEventListener('click', () => this.performSearch());
        }
        
        if (this.elements.searchQuery) {
            this.elements.searchQuery.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.performSearch();
            });
        }

        // Navigation events
        this.elements.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                this.navigateToSection(section);
            });
        });

        // Quick action events
        document.addEventListener('click', (e) => {
            if (e.target.dataset.navigate) {
                this.navigateToSection(e.target.dataset.navigate);
            }
            if (e.target.dataset.action === 'performance') {
                this.togglePerformancePanel();
            }
        });

        // Proxy control events - handled by app-initializer.js
        // Note: Proxy controls are set up in AppInitializer to avoid circular dependencies

        // Quality selector events
        if (this.elements.qualitySelect) {
            this.elements.qualitySelect.addEventListener('change', (e) => {
                this.qualityManager?.setQuality(e.target.value);
            });
        }

        this.log('Event handlers bound', 'info');
    }

    initializeNavigation() {
        // Set initial navigation state
        this.navigateToSection('home');
        this.updateStats();
    }

    async loadApplicationSettings() {
        try {
            const settings = this.settingsManager.getAllSettings();
            
            // Apply theme
            if (settings.theme) {
                document.documentElement.setAttribute('data-theme', settings.theme);
            }
            
            // Apply network preferences
            if (settings.corsProxy) {
                this.networkUtils.setCorsProxy(settings.corsProxy);
            }
            
            // Apply player preferences
            if (settings.playerVolume !== undefined) {
                this.enhancedPlayer?.setVolume(settings.playerVolume);
            }
            
            if (settings.playerQuality) {
                this.qualityManager?.setPreferredQuality(settings.playerQuality);
            }
            
            this.log('Application settings loaded', 'info');
        } catch (error) {
            this.log(`Failed to load settings: ${error.message}`, 'warning');
        }
    }

    setupPerformanceMonitoring() {
        // Monitor memory usage
        if ('memory' in performance) {
            setInterval(() => {
                this.performanceMetrics.memoryUsage = performance.memory.usedJSHeapSize;
                this.updateStats();
            }, 5000);
        }

        // Monitor connection status (TODO: Add event system to NetworkUtils)
        // this.networkUtils.on('connectionChange', (status) => {
        //     this.updateConnectionStatus(status);
        // });

        this.log('Performance monitoring active', 'info');
    }

    // Module Management Methods
    async importModule() {
        const url = this.elements.moduleUrlInput?.value?.trim();
        if (!url) {
            this.log('Please enter a module URL', 'warning');
            return;
        }

        try {
            this.log('Importing module...', 'info');
            const moduleData = await this.moduleManager.addModule(url);
            this.log(`Module imported: ${moduleData.metadata.sourceName}`, 'success');
            this.updateModulesList();
            this.elements.moduleUrlInput.value = '';
        } catch (error) {
            this.log(`Module import failed: ${error.message}`, 'error');
        }
    }

    async loadModuleManually() {
        try {
            const jsonText = this.elements.jsonInput?.value?.trim();
            const jsText = this.elements.jsInput?.value?.trim();
            
            if (!jsonText || !jsText) {
                this.log('Please provide both JSON and JavaScript code', 'warning');
                return;
            }

            const moduleConfig = JSON.parse(jsonText);
            const result = await this.moduleExecutionManager.executeModule(moduleConfig, jsText);
            
            this.log('Manual module execution successful', 'success');
            console.log('Module result:', result);
            
        } catch (error) {
            this.log(`Manual module execution failed: ${error.message}`, 'error');
        }
    }

    // Search Methods
    async performSearch() {
        const query = this.elements.searchQuery?.value?.trim();
        if (!query) {
            this.log('Please enter a search query', 'warning');
            return;
        }

        if (!this.selectedModule) {
            this.log('Please select a module first', 'warning');
            return;
        }

        try {
            this.showSearchLoading();
            this.performanceMetrics.searchCount++;
            this.updateStats();

            const results = await this.searchController.performSearch(
                query,
                this.selectedModule,
                { timeout: 30000 }
            );

            this.displaySearchResults(results);
            this.log(`Search completed: ${results.length} results found`, 'success');
            
        } catch (error) {
            this.log(`Search failed: ${error.message}`, 'error');
            this.showSearchError(error.message);
        }
    }

    // UI Update Methods
    displaySearchResults(results) {
        if (!this.elements.searchResults) return;

        this.searchResults = results;
        
        if (results.length === 0) {
            this.elements.searchResults.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">😔</div>
                    <div class="empty-title">No results found</div>
                    <div class="empty-desc">Try a different search term</div>
                </div>
            `;
            return;
        }

        const resultsHTML = results.map((result, index) => `
            <div class="search-result-card" data-url="${result.url}" onclick="app.handleResultClick('${result.url}')">
                <div class="result-image">
                    <img src="${result.image || '/api/placeholder/300/400'}" alt="${result.title}" loading="lazy">
                    <div class="result-overlay">
                        <div class="play-icon">▶</div>
                    </div>
                </div>
                <div class="result-info">
                    <h4 class="result-title">${result.title}</h4>
                    <p class="result-year">${result.year || 'Unknown'}</p>
                    ${result.rating ? `<div class="result-rating">⭐ ${result.rating}</div>` : ''}
                </div>
            </div>
        `).join('');

        this.elements.searchResults.innerHTML = resultsHTML;
    }

    async handleResultClick(url) {
        try {
            this.log('Loading content details...', 'info');
            
            const details = await this.detailsController.extractDetails(
                url,
                this.selectedModule,
                { timeout: 30000 }
            );

            this.displayContentDetails(details.details);
            
            if (details.episodes && details.episodes.length > 0) {
                this.displayEpisodes(details.episodes);
            }
            
        } catch (error) {
            this.log(`Failed to load details: ${error.message}`, 'error');
        }
    }

    async handleEpisodeClick(url) {
        try {
            this.log('Loading stream...', 'info');
            
            const streamData = await this.streamsController.extractStreams(
                url,
                this.selectedModule,
                { timeout: 30000 }
            );

            await this.playStream(streamData);
            
        } catch (error) {
            this.log(`Failed to load stream: ${error.message}`, 'error');
        }
    }

    async playStream(streamData) {
        try {
            // Navigate to player section
            this.navigateToSection('player');
            
            // Use quality manager to select best stream
            const selectedStream = this.qualityManager.selectBestQuality(streamData.streams);
            
            // Load stream in enhanced player
            await this.enhancedPlayer.loadStream({
                url: selectedStream.url,
                title: streamData.title || 'Unknown Content',
                headers: selectedStream.headers,
                subtitles: streamData.subtitles || []
            });

            // Load subtitles if available
            if (streamData.subtitles && streamData.subtitles.length > 0) {
                await this.subtitleManager.loadSubtitles(streamData.subtitles);
            }

            this.updatePlayerInfo(streamData);
            this.log('Stream loaded successfully', 'success');
            
        } catch (error) {
            this.log(`Failed to play stream: ${error.message}`, 'error');
            this.showPlayerError(error.message);
        }
    }

    // Navigation Methods
    navigateToSection(sectionName) {
        // Update navigation UI
        this.elements.navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.section === sectionName);
        });

        // Show/hide sections
        this.elements.sections.forEach(section => {
            section.classList.toggle('active', section.id === `${sectionName}-section`);
        });

        this.currentSection = sectionName;
        this.log(`Navigated to ${sectionName}`, 'info');
    }

    togglePerformancePanel() {
        const sidebar = this.elements.performanceSidebar;
        const overlay = this.elements.sidebarOverlay;
        
        if (sidebar && overlay) {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        }
    }

    // Utility Methods
    updateStats() {
        if (this.elements.modulesCount) {
            this.elements.modulesCount.textContent = this.moduleManager?.getAllModules().size || 0;
        }
        
        if (this.elements.searchCount) {
            this.elements.searchCount.textContent = this.performanceMetrics.searchCount;
        }
        
        if (this.elements.performanceScore) {
            const score = Math.max(50, 100 - Math.floor(this.performanceMetrics.memoryUsage / 1000000));
            this.elements.performanceScore.textContent = score;
        }
    }

    updateConnectionStatus(status) {
        if (this.elements.connectionStatus) {
            this.elements.connectionStatus.className = `status-dot ${status}`;
        }
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ${message}`;
        
        console.log(logEntry);
        
        // Only try to log to UI if elements are initialized
        if (this.elements && this.elements.logOutput) {
            const logElement = document.createElement('div');
            logElement.className = `log-entry log-${type}`;
            logElement.textContent = logEntry;
            this.elements.logOutput.appendChild(logElement);
            this.elements.logOutput.scrollTop = this.elements.logOutput.scrollHeight;
        }
    }

    hideLoadingScreen() {
        const loader = document.getElementById('app-loading');
        if (loader) {
            loader.style.opacity = '0';
            loader.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                loader.style.display = 'none';
                document.getElementById('app-container')?.classList.add('loaded');
            }, 500);
        }
    }

    showSearchLoading() {
        if (this.elements.searchResults) {
            this.elements.searchResults.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">Searching...</div>
                </div>
            `;
        }
    }

    showSearchError(message) {
        if (this.elements.searchResults) {
            this.elements.searchResults.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">⚠️</div>
                    <div class="error-title">Search Failed</div>
                    <div class="error-desc">${message}</div>
                </div>
            `;
        }
    }

    // Worker message handling
    handleWorkerMessage(event) {
        const { type, data, requestId } = event.data;
        
        const promise = this.workerPromises.get(requestId);
        if (!promise) return;

        switch (type) {
            case 'SEARCH_COMPLETE':
                promise.resolve(data);
                break;
            case 'DETAILS_COMPLETE':
                promise.resolve(data);
                break;
            case 'EPISODES_COMPLETE':
                promise.resolve(data);
                break;
            case 'STREAM_COMPLETE':
                promise.resolve(data);
                break;
            case 'ERROR':
                promise.reject(new Error(data.message));
                break;
            case 'CONSOLE_LOG':
                this.log(data.message, 'info');
                break;
            case 'CONSOLE_ERROR':
                this.log(data.message, 'error');
                break;
        }

        this.workerPromises.delete(requestId);
    }

    handleWorkerError(error) {
        this.log(`Worker error: ${error.message}`, 'error');
    }

    // Cleanup
    destroy() {
        if (this.worker) {
            this.worker.terminate();
        }
        
        if (this.enhancedPlayer) {
            this.enhancedPlayer.destroy();
        }
        
        this.log('Application Controller destroyed', 'info');
    }

    // Public API for module manager injection
    setModuleManager(moduleManager) {
        this.moduleManager = moduleManager;
        this.updateStats();
    }

    setSelectedModule(module) {
        this.selectedModule = module;
        this.log(`Selected module: ${module?.metadata?.sourceName || 'None'}`, 'info');
    }

    updateModulesList() {
        if (!this.elements.modulesList || !this.moduleManager) return;

        const modules = Array.from(this.moduleManager.getAllModules().values());
        
        if (modules.length === 0) {
            this.elements.modulesList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📦</div>
                    <div class="empty-title">No modules imported yet</div>
                    <div class="empty-desc">Use the import section above to add modules</div>
                </div>
            `;
            return;
        }

        const modulesHTML = modules.map(module => `
            <div class="module-card ${this.selectedModule?.metadata?.id === module.metadata.id ? 'selected' : ''}" 
                 data-module-id="${module.metadata.id}"
                 onclick="app.selectModuleFromList('${module.metadata.id}')">
                <div class="module-header">
                    <h4 class="module-name">${module.metadata.sourceName}</h4>
                    <span class="module-version">v${module.metadata.version}</span>
                </div>
                <div class="module-info">
                    <p class="module-desc">${module.metadata.description || 'No description'}</p>
                    <div class="module-meta">
                        <span class="module-date">Added: ${new Date(module.metadata.importDate).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
        `).join('');

        this.elements.modulesList.innerHTML = modulesHTML;
    }

    async selectModuleFromList(moduleId) {
        try {
            const module = this.moduleManager.getModuleById(moduleId);
            if (module) {
                await this.moduleManager.selectModule(moduleId);
                this.setSelectedModule(module);
                this.updateModulesList(); // Refresh to show selection
                this.log(`Module selected: ${module.metadata.sourceName}`, 'info');
            }
        } catch (error) {
            this.log(`Failed to select module: ${error.message}`, 'error');
        }
    }
}

// Export for use in other modules
export { ApplicationController };

// Global instance for backwards compatibility
window.ApplicationController = ApplicationController; 