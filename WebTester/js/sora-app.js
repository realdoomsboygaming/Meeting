// sora-app.js - Main application module with Web Worker integration
// Modern modular architecture for high-performance search operations

class SoraApp {
    constructor() {
        this.worker = null;
        this.moduleConfig = {};
        this.userFunctions = {};
        this.requestId = 0;
        this.pendingRequests = new Map();
        this.currentResults = [];
        this.currentPage = 0;
        this.RESULTS_PER_PAGE = 20;
        
        this.initializeElements();
        this.initializeWorker();
        this.bindEvents();
        this.log('Sora Streaming Hub Initialized with Netflix-style Interface.', 'success');
        this.log('Features: Background processing, zero UI blocking, smart caching', 'info');
        this.log('Module storage and management enabled.', 'info');
        
        // Initialize module management
        this.initializeModuleManagement();
        
        // Initialize CORS detection for better user guidance
        this.corsExtensionDetected = false;
        this.detectCorsExtension();
        
        // Initialize Netflix-style navigation
        setTimeout(() => {
            this.initializeNavigationHandlers();
        }, 100);
    }

    initializeElements() {
        // Core UI elements
        this.elements = {
            logOutput: document.getElementById('log-output'),
            jsonInput: document.getElementById('json-input'),
            jsInput: document.getElementById('js-input'),
            loadModuleBtn: document.getElementById('load-module-btn'),
            testingPanel: document.getElementById('testing-panel'),
            searchBtn: document.getElementById('search-btn'),
            searchQuery: document.getElementById('search-query'),
            searchResultsDiv: document.querySelector('.search-results'),
            detailsDiv: document.getElementById('details-container'),
            episodesDiv: document.querySelector('.episodes-list'),
            streamDiv: document.getElementById('stream-container'),
            videoPlayer: document.getElementById('player'),
            // Plyr-specific elements
            plyrWrapper: document.getElementById('plyr-wrapper'),
            playerPlaceholder: document.getElementById('player-placeholder'),
            playerInfo: document.getElementById('player-info'),
            streamTitle: document.getElementById('stream-title'),
            streamUrlDisplay: document.getElementById('stream-url-display'),
            qualitySelector: document.getElementById('quality-selector'),
            qualitySelect: document.getElementById('quality-select'),
            // Module management elements
            moduleUrlInput: document.getElementById('module-url-input'),
            importModuleBtn: document.getElementById('import-module-btn'),
            modulesList: document.getElementById('modules-list'),
            selectedModuleInfo: document.getElementById('selected-module-info')
        };
        
        // Initialize Plyr
        this.initializePlyr();
    }

    initializePlyr() {
        try {
            // Check if Plyr is available
            if (typeof Plyr === 'undefined') {
                this.log('Plyr not loaded yet, waiting...', 'warning');
                setTimeout(() => this.initializePlyr(), 500);
                return;
            }

            // Configure Plyr with Netflix-style options
            const plyrOptions = {
                controls: [
                    'play-large',
                    'play', 
                    'progress', 
                    'current-time',
                    'mute', 
                    'volume', 
                    'captions',
                    'settings', 
                    'pip',
                    'fullscreen'
                ],
                settings: ['captions', 'quality', 'speed'],
                captions: { active: false, language: 'auto', update: false },
                fullscreen: { enabled: true, fallback: true, iosNative: false },
                seekTime: 10,
                volume: 1,
                muted: false,
                clickToPlay: true,
                hideControls: true,
                resetOnEnd: false,
                keyboard: { focused: true, global: false },
                tooltips: { controls: false, seek: true },
                speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] },
                quality: { default: 720, options: [4320, 2160, 1440, 1080, 720, 480, 360, 240] },
                i18n: {
                    restart: 'Restart',
                    rewind: 'Rewind {seektime}s',
                    play: 'Play',
                    pause: 'Pause',
                    fastForward: 'Forward {seektime}s',
                    seek: 'Seek',
                    seekLabel: '{currentTime} of {duration}',
                    played: 'Played',
                    buffered: 'Buffered',
                    currentTime: 'Current time',
                    duration: 'Duration',
                    volume: 'Volume',
                    mute: 'Mute',
                    unmute: 'Unmute',
                    enableCaptions: 'Enable captions',
                    disableCaptions: 'Disable captions',
                    settings: 'Settings',
                    menuBack: 'Go back to previous menu',
                    speed: 'Speed',
                    normal: 'Normal',
                    quality: 'Quality',
                    pip: 'PIP',
                    fullscreen: 'Fullscreen',
                    exitFullscreen: 'Exit fullscreen'
                }
            };

            // Initialize Plyr (official pattern)
            this.player = new Plyr('#player', plyrOptions);
            
            // Setup Plyr event listeners
            this.setupPlyrEvents();
            
            this.log('Plyr video player initialized successfully', 'success');
            
        } catch (error) {
            this.log(`Failed to initialize Plyr: ${error.message}`, 'error');
            // Fallback to basic video player
            this.player = null;
        }
    }

    setupPlyrEvents() {
        if (!this.player) return;

        // Track player events for better UX
        this.player.on('ready', () => {
            this.log('Plyr player ready', 'success');
            this.log(`Current source: ${this.player.source}`, 'info');
        });

        // SOURCE CHANGE DEBUGGING
        this.player.on('sourcechange', () => {
            this.log('=== PLYR SOURCE CHANGED ===', 'info');
            this.log(`New source: ${JSON.stringify(this.player.source)}`, 'info');
            this.log(`Current src: ${this.player.media?.currentSrc || 'none'}`, 'info');
        });

        this.player.on('play', () => {
            this.log('Video playback started', 'info');
            this.log(`Playing: ${this.player.media?.currentSrc || 'unknown'}`, 'info');
        });

        this.player.on('pause', () => {
            this.log('Video playback paused', 'info');
        });

        this.player.on('ended', () => {
            this.log('Video playback ended', 'info');
        });

        this.player.on('error', (event) => {
            this.log('=== PLYR ERROR EVENT ===', 'error');
            const error = event.detail?.plyr?.media?.error;
            if (error) {
                this.log(`Video player error: ${error.message || 'Unknown error'}`, 'error');
                this.log(`Error code: ${error.code}`, 'error');
            }
            this.log(`Media source: ${this.player.media?.currentSrc || 'none'}`, 'error');
        });

        this.player.on('loadstart', () => {
            this.log('Video loading started', 'info');
            this.log(`Loading: ${this.player.media?.currentSrc || 'unknown'}`, 'info');
        });

        this.player.on('canplay', () => {
            this.log('Video can start playing', 'success');
            this.log(`Ready to play: ${this.player.media?.currentSrc || 'unknown'}`, 'success');
        });

        this.player.on('loadedmetadata', () => {
            this.log('Video metadata loaded', 'success');
            this.log(`Duration: ${this.player.duration || 'unknown'}s`, 'info');
        });

        this.player.on('waiting', () => {
            this.log('Video buffering...', 'info');
        });

        this.player.on('timeupdate', () => {
            // Optional: Track progress for analytics
        });

        this.player.on('volumechange', () => {
            // Optional: Save volume preference
        });

        this.player.on('enterfullscreen', () => {
            this.log('Entered fullscreen mode', 'info');
        });

        this.player.on('exitfullscreen', () => {
            this.log('Exited fullscreen mode', 'info');
        });
    }

    initializeWorker() {
        if (!window.Worker) {
            this.log('Web Workers not supported in this browser. Falling back to main thread processing.', 'warning');
            this.worker = null;
            return;
        }

        try {
            this.worker = new Worker('./js/search-worker.js');
            this.worker.onmessage = (event) => this.handleWorkerMessage(event);
            this.worker.onerror = (error) => this.handleWorkerError(error);
            this.log('Web Worker initialized successfully. Background processing enabled.', 'success');
        } catch (error) {
            // Common case: CORS error when running from file:// protocol
            this.worker = null;
            if (error.message.includes('cannot be accessed from origin') || 
                error.message.includes('origin \'null\'')) {
                this.log('Web Worker blocked due to file:// protocol restrictions. Using main thread fallback.', 'warning');
                this.log('For best performance, serve this app via HTTP(S) server instead of opening locally.', 'info');
            } else {
                this.log(`Failed to initialize Web Worker: ${error.message}. Using main thread fallback.`, 'warning');
            }
        }
    }

    bindEvents() {
        // Module management with enhanced UI
        this.elements.importModuleBtn.addEventListener('click', () => this.importModuleEnhanced());
        this.elements.moduleUrlInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.importModuleEnhanced();
            }
        });
        
        // Manual module loading (fallback)
        this.elements.loadModuleBtn.addEventListener('click', () => this.loadModuleManually());
        
        // Search functionality with enhanced UI and debouncing
        let searchTimeout;
        this.elements.searchBtn.addEventListener('click', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => this.performSearchEnhanced(), 100);
        });
        
        // Enter key support with debouncing
        this.elements.searchQuery.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => this.performSearchEnhanced(), 300);
            }
        });

        // Live search (optional - currently disabled for performance)
        this.elements.searchQuery.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            // Uncomment for live search: searchTimeout = setTimeout(() => this.performSearchEnhanced(), 1000);
        });
    }

    // Initialize module management system
    initializeModuleManagement() {
        this.updateModulesList();
        this.updateSelectedModuleInfo();
        this.checkForSelectedModule();
        
        // Add mobile storage monitoring
        this.updateStorageStatus();
        
        // Monitor storage changes for mobile feedback
        this.setupStorageMonitoring();
        
        this.log('Module management system ready.', 'success');
    }

    // Import module from URL
    async importModule() {
        const moduleUrl = this.elements.moduleUrlInput.value.trim();
        
        if (!moduleUrl) {
            this.log('Please enter a module URL.', 'warning');
            return;
        }

        try {
            this.elements.importModuleBtn.disabled = true;
            this.elements.importModuleBtn.textContent = 'Importing...';
            
            this.log(`Importing module from: ${moduleUrl}`, 'info');
            
            const moduleData = await moduleManager.addModule(moduleUrl);
            
            this.log(`Module imported successfully: ${moduleData.metadata.sourceName} v${moduleData.metadata.version}`, 'success');
            
            // Clear input
            this.elements.moduleUrlInput.value = '';
            
            // Update UI
            this.updateModulesList();
            this.selectModuleEnhanced(moduleData.id);

        } catch (error) {
            this.log(`Module import failed: ${error.message}`, 'error');
        } finally {
            this.elements.importModuleBtn.disabled = false;
            this.elements.importModuleBtn.textContent = 'Import Module';
        }
    }

    // Load module from stored data
    loadStoredModule(moduleId) {
        try {
            const module = moduleManager.selectModule(moduleId);
            if (!module) {
                throw new Error('Module not found');
            }

            this.log(`Loading stored module: ${module.metadata.sourceName}`, 'info');
            this.log('Module protection active - anti-fallback enabled', 'info');
            this.log('Sora compatibility functions available: fetchv2, console, btoa, atob', 'info');
            
            // Set module config
            this.moduleConfig = module.metadata;
            
            // Load JavaScript functions with protection
            const fullScript = `
                // Sora Module Protection - JavaScript equivalent of Swift _0xB4F2()
                function _0xB4F2() {
                    // Base character arrays (equivalent to Swift implementation)
                    const cranci = [99, 114, 97, 110, 99, 105].map(code => String.fromCharCode(code)); // "cranci"
                    const alphanumeric = [
                        ...Array.from({length: 26}, (_, i) => String.fromCharCode(97 + i)), // a-z
                        ...Array.from({length: 10}, (_, i) => String.fromCharCode(48 + i))  // 0-9
                    ];
                    
                    // Initialize 16-position array
                    const result = new Array(16).fill('');
                    const usedPositions = new Set();
                    
                    // Place cranci characters randomly
                    cranci.forEach(char => {
                        let position;
                        do {
                            position = Math.floor(Math.random() * 16);
                        } while (usedPositions.has(position));
                        usedPositions.add(position);
                        result[position] = char;
                    });
                    
                    // Fill remaining positions with random alphanumeric
                    for (let i = 0; i < 16; i++) {
                        if (result[i] === '') {
                            result[i] = alphanumeric[Math.floor(Math.random() * alphanumeric.length)];
                        }
                    }
                    
                    return result.join('');
                }
                
                // Make protection function globally available to module
                window._0xB4F2 = _0xB4F2;
                
                // Sora fetchv2 implementation (JavaScript equivalent of Swift version)
                function fetchv2(url, headers = {}, method = "GET", body = null, redirect = true, encoding = "utf-8") {
                    // Process body for non-GET requests
                    var processedBody = null;
                    if (method !== "GET") {
                        processedBody = (body && (typeof body === 'object')) ? JSON.stringify(body) : (body || null);
                    }
                    
                    // Ensure headers is an object
                    var processedHeaders = {};
                    if (headers && typeof headers === 'object' && !Array.isArray(headers)) {
                        processedHeaders = headers;
                    }
                    
                    return new Promise(function(resolve, reject) {
                        // Create fetch options
                        const fetchOptions = {
                            method: method,
                            headers: processedHeaders,
                            redirect: redirect ? 'follow' : 'manual'
                        };
                        
                        // Add body for non-GET requests
                        if (method !== "GET" && processedBody !== null) {
                            fetchOptions.body = processedBody;
                        }
                        
                        fetch(url, fetchOptions)
                            .then(function(response) {
                                // Convert headers to plain object
                                const responseHeaders = {};
                                if (response.headers) {
                                    response.headers.forEach(function(value, key) {
                                        responseHeaders[key] = value;
                                    });
                                }
                                
                                // Get response text
                                return response.text().then(function(text) {
                                    // Create Sora-compatible response object
                                    const responseObj = {
                                        headers: responseHeaders,
                                        status: response.status,
                                        _data: text,
                                        text: function() {
                                            return Promise.resolve(this._data);
                                        },
                                        json: function() {
                                            try {
                                                return Promise.resolve(JSON.parse(this._data));
                                            } catch (e) {
                                                return Promise.reject("JSON parse error: " + e.message);
                                            }
                                        }
                                    };
                                    resolve(responseObj);
                                });
                            })
                            .catch(function(error) {
                                reject(error.message || error.toString());
                            });
                    });
                }
                
                // Make fetchv2 globally available to module
                window.fetchv2 = fetchv2;
                
                // Sora console logging compatibility
                const console = {
                    log: function(message) {
                        if (window.app && window.app.log) {
                            window.app.log('Module: ' + message, 'info');
                        }
                    },
                    error: function(message) {
                        if (window.app && window.app.log) {
                            window.app.log('Module Error: ' + message, 'error');
                        }
                    }
                };
                window.console = console;
                
                // Base64 encoding functions (btoa/atob) with UTF-8 support
                function btoa(data) {
                    try {
                        return window.btoa(data);
                    } catch (e) {
                        // Fallback for non-ASCII characters
                        return window.btoa(unescape(encodeURIComponent(data)));
                    }
                }
                
                function atob(base64) {
                    try {
                        return window.atob(base64);
                    } catch (e) {
                        // Fallback with proper UTF-8 handling
                        return decodeURIComponent(escape(window.atob(base64)));
                    }
                }
                
                window.btoa = btoa;
                window.atob = atob;
                
                // Module script in protected scope
                ${module.script}
                
                // Return function references
                return {
                    searchResults: typeof searchResults !== 'undefined' ? searchResults : null,
                    extractDetails: typeof extractDetails !== 'undefined' ? extractDetails : null,
                    extractEpisodes: typeof extractEpisodes !== 'undefined' ? extractEpisodes : null,
                    extractStreamUrl: typeof extractStreamUrl !== 'undefined' ? extractStreamUrl : null
                };
            `;
            
            this.userFunctions = new Function(fullScript)();
            
            let loadedFuncs = Object.keys(this.userFunctions)
                .filter(k => this.userFunctions[k] !== null)
                .join(', ');
            
            this.log(`Module loaded successfully. Functions: ${loadedFuncs}`, 'success');
            
            // Update UI
            this.updateSelectedModuleInfo(module);
            this.elements.testingPanel.style.display = 'block';
            this.resetUI();

        } catch (error) {
            this.log(`Error loading stored module: ${error.message}`, 'error');
        }
    }

    // Manual module loading (original functionality)
    loadModuleManually() {
        this.log('Loading module manually...', 'info');
        this.log('Module protection active - anti-fallback enabled', 'info');
        this.log('Sora compatibility functions available: fetchv2, console, btoa, atob', 'info');
        this.userFunctions = {}; // Reset
        
        // 1. Parse JSON
        try {
            this.moduleConfig = JSON.parse(this.elements.jsonInput.value);
            this.log('JSON parsed successfully.', 'success');
            this.log(`Module: ${this.moduleConfig.sourceName}, Version: ${this.moduleConfig.version}`);
        } catch (e) {
            this.log(`Error parsing JSON: ${e.message}`, 'error');
            return;
        }

        // 2. Load JavaScript safely with protection
        try {
            const fullScript = `
                // Sora Module Protection - JavaScript equivalent of Swift _0xB4F2()
                function _0xB4F2() {
                    // Base character arrays (equivalent to Swift implementation)
                    const cranci = [99, 114, 97, 110, 99, 105].map(code => String.fromCharCode(code)); // "cranci"
                    const alphanumeric = [
                        ...Array.from({length: 26}, (_, i) => String.fromCharCode(97 + i)), // a-z
                        ...Array.from({length: 10}, (_, i) => String.fromCharCode(48 + i))  // 0-9
                    ];
                    
                    // Initialize 16-position array
                    const result = new Array(16).fill('');
                    const usedPositions = new Set();
                    
                    // Place cranci characters randomly
                    cranci.forEach(char => {
                        let position;
                        do {
                            position = Math.floor(Math.random() * 16);
                        } while (usedPositions.has(position));
                        usedPositions.add(position);
                        result[position] = char;
                    });
                    
                    // Fill remaining positions with random alphanumeric
                    for (let i = 0; i < 16; i++) {
                        if (result[i] === '') {
                            result[i] = alphanumeric[Math.floor(Math.random() * alphanumeric.length)];
                        }
                    }
                    
                    return result.join('');
                }
                
                // Make protection function globally available to module
                window._0xB4F2 = _0xB4F2;
                
                // Sora fetchv2 implementation (JavaScript equivalent of Swift version)
                function fetchv2(url, headers = {}, method = "GET", body = null, redirect = true, encoding = "utf-8") {
                    // Process body for non-GET requests
                    var processedBody = null;
                    if (method !== "GET") {
                        processedBody = (body && (typeof body === 'object')) ? JSON.stringify(body) : (body || null);
                    }
                    
                    // Ensure headers is an object
                    var processedHeaders = {};
                    if (headers && typeof headers === 'object' && !Array.isArray(headers)) {
                        processedHeaders = headers;
                    }
                    
                    return new Promise(function(resolve, reject) {
                        // Create fetch options
                        const fetchOptions = {
                            method: method,
                            headers: processedHeaders,
                            redirect: redirect ? 'follow' : 'manual'
                        };
                        
                        // Add body for non-GET requests
                        if (method !== "GET" && processedBody !== null) {
                            fetchOptions.body = processedBody;
                        }
                        
                        fetch(url, fetchOptions)
                            .then(function(response) {
                                // Convert headers to plain object
                                const responseHeaders = {};
                                if (response.headers) {
                                    response.headers.forEach(function(value, key) {
                                        responseHeaders[key] = value;
                                    });
                                }
                                
                                // Get response text
                                return response.text().then(function(text) {
                                    // Create Sora-compatible response object
                                    const responseObj = {
                                        headers: responseHeaders,
                                        status: response.status,
                                        _data: text,
                                        text: function() {
                                            return Promise.resolve(this._data);
                                        },
                                        json: function() {
                                            try {
                                                return Promise.resolve(JSON.parse(this._data));
                                            } catch (e) {
                                                return Promise.reject("JSON parse error: " + e.message);
                                            }
                                        }
                                    };
                                    resolve(responseObj);
                                });
                            })
                            .catch(function(error) {
                                reject(error.message || error.toString());
                            });
                    });
                }
                
                // Make fetchv2 globally available to module
                window.fetchv2 = fetchv2;
                
                // Sora console logging compatibility
                const console = {
                    log: function(message) {
                        if (window.app && window.app.log) {
                            window.app.log('Module: ' + message, 'info');
                        }
                    },
                    error: function(message) {
                        if (window.app && window.app.log) {
                            window.app.log('Module Error: ' + message, 'error');
                        }
                    }
                };
                window.console = console;
                
                // Base64 encoding functions (btoa/atob) with UTF-8 support
                function btoa(data) {
                    try {
                        return window.btoa(data);
                    } catch (e) {
                        // Fallback for non-ASCII characters
                        return window.btoa(unescape(encodeURIComponent(data)));
                    }
                }
                
                function atob(base64) {
                    try {
                        return window.atob(base64);
                    } catch (e) {
                        // Fallback with proper UTF-8 handling
                        return decodeURIComponent(escape(window.atob(base64)));
                    }
                }
                
                window.btoa = btoa;
                window.atob = atob;
                
                // User's code in protected scope
                ${this.elements.jsInput.value}
                
                // Return function references
                return {
                    searchResults: typeof searchResults !== 'undefined' ? searchResults : null,
                    extractDetails: typeof extractDetails !== 'undefined' ? extractDetails : null,
                    extractEpisodes: typeof extractEpisodes !== 'undefined' ? extractEpisodes : null,
                    extractStreamUrl: typeof extractStreamUrl !== 'undefined' ? extractStreamUrl : null
                };
            `;
            
            this.userFunctions = new Function(fullScript)();
            
            let loadedFuncs = Object.keys(this.userFunctions)
                .filter(k => this.userFunctions[k] !== null)
                .join(', ');
            
            this.log(`JavaScript loaded successfully. Found functions: ${loadedFuncs}`, 'success');
            
            this.elements.testingPanel.style.display = 'block';
            this.resetUI();

        } catch (e) {
            this.log(`Error loading JavaScript: ${e.message}`, 'error');
        }
    }

    // Select module
    selectModule(moduleId) {
        try {
            this.loadStoredModule(moduleId);
            this.updateModulesList(); // Refresh to show selection
        } catch (error) {
            this.log(`Error selecting module: ${error.message}`, 'error');
        }
    }

    // Remove module
    async removeModule(moduleId) {
        try {
            const module = moduleManager.modules.get(moduleId);
            if (!module) {
                throw new Error('Module not found');
            }

            const moduleName = module.metadata.sourceName;
            
            if (confirm(`Remove module "${moduleName}"? This action cannot be undone.`)) {
                moduleManager.removeModule(moduleId);
                this.log(`Module removed: ${moduleName}`, 'info');
                
                // Update UI
                this.updateModulesList();
                
                // Clear selected module info if this was the selected module
                if (moduleManager.getSelectedModule() === null) {
                    this.elements.selectedModuleInfo.style.display = 'none';
                    this.elements.testingPanel.style.display = 'none';
                }
            }
        } catch (error) {
            this.log(`Error removing module: ${error.message}`, 'error');
        }
    }

    // Update modules list UI
    updateModulesList() {
        const modules = moduleManager.getAllModules();
        const selectedModule = moduleManager.getSelectedModule();
        
        if (modules.length === 0) {
            this.elements.modulesList.innerHTML = '<p style="color: #888; font-style: italic;">No modules imported yet. Use the import section above to add modules.</p>';
            return;
        }

        let html = '<div style="display: grid; gap: 10px;">';
        
        modules.forEach(module => {
            const isSelected = selectedModule && selectedModule.id === module.id;
            const metadata = module.metadata;
            
            html += `
                <div class="module-item" style="
                    padding: 12px; 
                    border: 2px solid ${isSelected ? '#61dafb' : '#ddd'}; 
                    border-radius: 8px; 
                    background: ${isSelected ? '#f0f9ff' : '#fff'};
                    cursor: pointer;
                    transition: all 0.2s;
                " data-module-id="${module.id}">
                    <div style="display: flex; justify-content: between; align-items: center;">
                        <div style="flex: 1;">
                            <h3 style="margin: 0 0 5px 0; color: ${isSelected ? '#0369a1' : '#333'};">
                                ${metadata.sourceName} <span style="font-size: 0.8em; color: #666;">v${metadata.version}</span>
                            </h3>
                            <p style="margin: 0; font-size: 0.9em; color: #666;">
                                ${metadata.author?.name || metadata.author || 'Unknown Author'} • ${metadata.language} • ${metadata.type || 'N/A'}
                            </p>
                            <p style="margin: 5px 0 0 0; font-size: 0.8em; color: #888;">
                                Quality: ${metadata.quality || 'N/A'} • ${metadata.asyncJS ? 'Async JS' : 'Standard JS'}
                            </p>
                        </div>
                        <div style="display: flex; gap: 5px; margin-left: 10px;">
                            <button onclick="app.selectModuleEnhanced('${module.id}')" style="
                                padding: 5px 10px; 
                                border: 1px solid #61dafb; 
                                background: ${isSelected ? '#61dafb' : 'white'}; 
                                color: ${isSelected ? 'white' : '#61dafb'}; 
                                border-radius: 4px; 
                                cursor: pointer;
                                font-size: 0.8em;
                            ">
                                ${isSelected ? 'Selected' : 'Select'}
                            </button>
                            <button onclick="app.removeModule('${module.id}')" style="
                                padding: 5px 8px; 
                                border: 1px solid #dc3545; 
                                background: white; 
                                color: #dc3545; 
                                border-radius: 4px; 
                                cursor: pointer;
                                font-size: 0.8em;
                            ">
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        this.elements.modulesList.innerHTML = html;
    }

    // Update selected module info
    updateSelectedModuleInfo(module) {
        if (!module) {
            this.elements.selectedModuleInfo.style.display = 'none';
            return;
        }

        const metadata = module.metadata;
        
        this.elements.selectedModuleInfo.innerHTML = `
            <h3 style="margin: 0 0 10px 0; color: #0369a1;">📦 ${metadata.sourceName} v${metadata.version}</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-bottom: 10px;">
                <div><strong>Author:</strong> ${metadata.author?.name || metadata.author || 'Unknown'}</div>
                <div><strong>Language:</strong> ${metadata.language}</div>
                <div><strong>Type:</strong> ${metadata.type || 'N/A'}</div>
                <div><strong>Quality:</strong> ${metadata.quality || 'N/A'}</div>
                <div><strong>Stream Type:</strong> ${metadata.streamType || 'N/A'}</div>
                <div><strong>Async JS:</strong> ${metadata.asyncJS ? 'Yes' : 'No'}</div>
            </div>
            <div style="font-size: 0.9em; color: #666;">
                <div><strong>Base URL:</strong> ${metadata.baseUrl}</div>
                ${metadata.searchBaseUrl ? `<div><strong>Search URL:</strong> ${metadata.searchBaseUrl}</div>` : ''}
                <div><strong>Imported:</strong> ${new Date(metadata.importDate).toLocaleString()}</div>
            </div>
        `;
        
        this.elements.selectedModuleInfo.style.display = 'block';
    }

    // Check for selected module on initialization
    checkForSelectedModule() {
        const selectedModule = moduleManager.getSelectedModule();
        if (selectedModule) {
            this.log(`Auto-loading selected module: ${selectedModule.metadata.sourceName}`, 'info');
            this.loadStoredModule(selectedModule.id);
        } else {
            this.log(`No module currently selected`, 'warning');
        }
        
        // Debug: Show current module status
        setTimeout(() => {
            this.log(`=== MODULE STATUS DEBUG ===`, 'info');
            this.log(`User functions loaded: ${!!this.userFunctions}`, 'info');
            this.log(`Module config loaded: ${!!this.moduleConfig}`, 'info');
            if (this.userFunctions) {
                this.log(`Available functions: ${Object.keys(this.userFunctions)}`, 'info');
            }
            if (this.moduleConfig) {
                this.log(`Module name: ${this.moduleConfig.name}`, 'info');
            }
            this.log(`Plyr player initialized: ${!!this.player}`, 'info');
            this.log(`Video element found: ${!!this.elements.videoPlayer}`, 'info');
            this.log(`To test player without module, use: app.testPlayer()`, 'info');
            this.log(`=== END MODULE STATUS ===`, 'info');
        }, 1000);
    }
    
    // Test player functionality without requiring a module
    testPlayer() {
        this.log('=== TESTING PLAYER FUNCTIONALITY ===', 'info');
        
        if (!this.player) {
            this.log('Plyr player not initialized. Retrying in 1 second...', 'warning');
            setTimeout(() => this.testPlayer(), 1000);
            return;
        }
        
        // Use a test MP4 video
        const testSource = {
            type: 'video',
            title: 'Test Video - Big Buck Bunny',
            sources: [{
                src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                type: 'video/mp4',
                size: 720
            }]
        };
        
        try {
            // Set source using official Plyr API
            this.player.source = testSource;
            
            // Show player content
            this.showPlayerContent('Test Video - Big Buck Bunny', testSource.sources[0].src);
            
            this.log('Test video loaded successfully! Player should now be visible.', 'success');
            this.log('Click the play button to test video playback.', 'info');
            
        } catch (error) {
            this.log(`Test player failed: ${error.message}`, 'error');
        }
    }
    
    // Debug player element visibility
    debugPlayerVisibility() {
        this.log('=== PLAYER VISIBILITY DEBUG ===', 'info');
        
        // Check if we're on the player section
        const sections = ['search', 'details', 'episodes', 'player'];
        sections.forEach(section => {
            const sectionEl = document.getElementById(`${section}-section`);
            if (sectionEl) {
                const isVisible = sectionEl.style.display !== 'none';
                this.log(`${section} section visible: ${isVisible}`, isVisible ? 'success' : 'info');
            }
        });
        
        // Check all player elements
        const elements = {
            'plyr-wrapper': this.elements.plyrWrapper,
            'player (video)': this.elements.videoPlayer,
            'player-placeholder': this.elements.playerPlaceholder,
            'player-info': this.elements.playerInfo
        };
        
        Object.entries(elements).forEach(([name, element]) => {
            if (element) {
                const styles = window.getComputedStyle(element);
                this.log(`${name}:`, 'info');
                this.log(`  - display: ${styles.display}`, 'info');
                this.log(`  - visibility: ${styles.visibility}`, 'info');
                this.log(`  - opacity: ${styles.opacity}`, 'info');
                this.log(`  - height: ${styles.height}`, 'info');
                this.log(`  - width: ${styles.width}`, 'info');
            } else {
                this.log(`${name}: NOT FOUND`, 'error');
            }
        });
        
        // Check Plyr instance
        this.log(`Plyr instance exists: ${!!this.player}`, 'info');
        if (this.player) {
            this.log(`Plyr media element: ${!!this.player.media}`, 'info');
            this.log(`Plyr current source: ${this.player.media?.currentSrc || 'none'}`, 'info');
        }
        
        this.log('=== END VISIBILITY DEBUG ===', 'info');
    }
    
    // Force player to be visible (aggressive CSS override)
    forcePlayerVisible() {
        this.log('=== FORCING PLAYER VISIBLE ===', 'info');
        
        // Navigate to player section
        this.showSection('player');
        
        // Check DOM attachment status
        this.log('=== DOM ATTACHMENT DEBUG ===', 'info');
        if (this.elements.plyrWrapper) {
            this.log(`Plyr wrapper in DOM: ${document.contains(this.elements.plyrWrapper)}`, 'info');
            this.log(`Plyr wrapper parent: ${this.elements.plyrWrapper.parentNode?.tagName || 'none'}`, 'info');
            this.log(`Plyr wrapper ID: ${this.elements.plyrWrapper.id}`, 'info');
        }
        
        // Re-find elements if they've been detached
        const freshWrapper = document.getElementById('plyr-wrapper');
        const freshVideo = document.getElementById('player');
        const freshPlaceholder = document.getElementById('player-placeholder');
        const freshInfo = document.getElementById('player-info');
        
        this.log(`Fresh wrapper found: ${!!freshWrapper}`, 'info');
        this.log(`Fresh video found: ${!!freshVideo}`, 'info');
        
        // Update references if different
        if (freshWrapper && freshWrapper !== this.elements.plyrWrapper) {
            this.log('🔧 Updating plyr-wrapper reference to fresh element', 'info');
            this.elements.plyrWrapper = freshWrapper;
        }
        if (freshVideo && freshVideo !== this.elements.videoPlayer) {
            this.log('🔧 Updating video player reference to fresh element', 'info');
            this.elements.videoPlayer = freshVideo;
        }
        if (freshPlaceholder && freshPlaceholder !== this.elements.playerPlaceholder) {
            this.log('🔧 Updating placeholder reference to fresh element', 'info');
            this.elements.playerPlaceholder = freshPlaceholder;
        }
        if (freshInfo && freshInfo !== this.elements.playerInfo) {
            this.log('🔧 Updating player info reference to fresh element', 'info');
            this.elements.playerInfo = freshInfo;
        }
        
        // Force plyr wrapper visible
        if (this.elements.plyrWrapper) {
            const wrapper = this.elements.plyrWrapper;
            wrapper.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important; height: auto !important; width: 100% !important; position: relative !important;';
            
            // Verify CSS took effect
            const afterStyles = window.getComputedStyle(wrapper);
            this.log(`Wrapper display after force: ${afterStyles.display}`, 'info');
            this.log(`Wrapper visibility after force: ${afterStyles.visibility}`, 'info');
            this.log('Plyr wrapper forced visible with cssText', 'success');
        } else {
            this.log('❌ No plyr wrapper found to force visible', 'error');
        }
        
        // Force video element visible  
        if (this.elements.videoPlayer) {
            const video = this.elements.videoPlayer;
            video.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important; height: auto !important; width: 100% !important;';
            
            // Verify CSS took effect
            const afterStyles = window.getComputedStyle(video);
            this.log(`Video display after force: ${afterStyles.display}`, 'info');
            this.log('Video element forced visible with cssText', 'success');
        } else {
            this.log('❌ No video element found to force visible', 'error');
        }
        
        // Hide placeholder
        if (this.elements.playerPlaceholder) {
            this.elements.playerPlaceholder.style.cssText = 'display: none !important;';
            this.log('Player placeholder forced hidden', 'info');
        }
        
        // Show player info
        if (this.elements.playerInfo) {
            this.elements.playerInfo.style.cssText = 'display: block !important; visibility: visible !important;';
            this.log('Player info forced visible', 'info');
        }
        
        this.log('=== FORCE COMPLETE - PLAYER SHOULD NOW BE VISIBLE ===', 'success');
    }

    async performSearch() {
        const query = this.elements.searchQuery.value.trim();
        
        if (!query) {
            this.log('Search query is empty.', 'warning');
            return;
        }
        
        if (!this.userFunctions.searchResults) {
            this.log('searchResults function not found in the module.', 'error');
            return;
        }

        // Cancel any pending searches
        this.cancelPendingRequests();

        this.log(`Executing background search for: "${query}"`);
        
        // Show loading state
        this.elements.searchBtn.disabled = true;
        this.elements.searchBtn.textContent = 'Searching...';
        this.elements.searchResultsDiv.innerHTML = this.createLoadingHTML('Searching in background...');
        
        this.resetUI(false); // Don't clear search results

        // Check if we have user functions (from modules)
        if (this.userFunctions && Object.keys(this.userFunctions).length > 0) {
            // Modules must run in main thread since functions can't be sent to workers
            this.log('Using main thread for module-based search (functions cannot be serialized)', 'info');
            await this.performSearchMainThread(query);
        } else if (this.worker) {
            // Use Web Worker for non-module based processing
            this.log('Using Web Worker for background processing', 'info');
            const requestId = await this.sendWorkerMessage('SEARCH', {
                query,
                moduleConfig: this.moduleConfig
            });
            
            this.pendingRequests.set(requestId, 'search');
        } else {
            // Fallback to main thread
            this.log('Falling back to main thread processing (no Web Worker)', 'warning');
            await this.performSearchMainThread(query);
        }
    }

    async performSearchMainThread(query) {
        try {
            let results;
            if (this.moduleConfig.asyncJS) {
                this.log('Async mode: Passing keyword directly to searchResults.');
                results = await Promise.race([
                    this.userFunctions.searchResults(query),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Search timeout after 30s')), 30000)
                    )
                ]);
            } else {
                this.log('Normal mode: Fetching HTML to pass to searchResults.');
                const searchUrl = this.moduleConfig.searchBaseUrl.replace('%s', encodeURIComponent(query));
                this.log(`Fetching search URL: ${searchUrl}`);
                
                const html = await fetch(searchUrl).then(res => res.text());
                this.log(`HTML received (${html.length} chars). Passing to searchResults.`);
                results = this.userFunctions.searchResults(html);
            }
            
            const parsedResults = (typeof results === 'string') ? JSON.parse(results) : results;
            this.log(`searchResults returned ${parsedResults.length} items.`, 'success');
            
            requestAnimationFrame(() => {
                this.displaySearchResults(parsedResults);
            });

        } catch (e) {
            this.log(`Error during search: ${e.message}`, 'error');
            this.elements.searchResultsDiv.innerHTML = this.createErrorHTML('Search failed. Check logs for details.');
        } finally {
            this.elements.searchBtn.disabled = false;
            this.elements.searchBtn.textContent = 'Search';
        }
    }

    async sendWorkerMessage(type, data) {
        const requestId = ++this.requestId;
        
        if (this.worker) {
            this.worker.postMessage({
                type,
                data,
                requestId
            });
        }
        
        return requestId;
    }

    handleWorkerMessage(event) {
        const { type, data, message, error, requestId } = event.data;
        
        if (!this.pendingRequests.has(requestId)) {
            return; // Ignore orphaned responses
        }

        switch (type) {
            case 'SEARCH_COMPLETE':
                this.handleSearchComplete(data, requestId);
                break;
            case 'DETAILS_COMPLETE':
                this.handleDetailsComplete(data, requestId);
                break;
            case 'EPISODES_COMPLETE':
                this.handleEpisodesComplete(data, requestId);
                break;
            case 'STREAM_COMPLETE':
                this.handleStreamComplete(data, requestId);
                break;
            case 'PROGRESS':
                this.handleProgress(message, requestId);
                break;
            case 'ERROR':
                this.handleWorkerError(error, requestId);
                break;
            case 'SEARCH_CANCELLED':
                this.log('Search cancelled', 'info');
                this.resetSearchUI();
                break;
            case 'CONSOLE_LOG':
                this.log(message, 'info');
                break;
            case 'CONSOLE_ERROR':
                this.log(message, 'error');
                break;
        }
    }

    handleSearchComplete(results, requestId) {
        this.pendingRequests.delete(requestId);
        this.log(`Background search completed: ${results.length} items found.`, 'success');
        
        requestAnimationFrame(() => {
            this.displaySearchResults(results);
            this.resetSearchUI();
        });
    }

    handleDetailsComplete(details, requestId) {
        this.pendingRequests.delete(requestId);
        this.log('Details extracted successfully.', 'success');
        
        requestAnimationFrame(() => {
            this.displayDetails(details);
        });
    }

    handleEpisodesComplete(episodes, requestId) {
        this.pendingRequests.delete(requestId);
        this.log(`Extracted ${episodes.length} episodes.`, 'success');
        
        requestAnimationFrame(() => {
            this.displayEpisodes(episodes);
        });
    }

    handleStreamComplete(streamData, requestId) {
        this.pendingRequests.delete(requestId);
        
        // Parse stream data using enhanced Sora-compatible logic with softsub support
        const parsedStreams = this.parseEnhancedStreamData(streamData);
        
        if (parsedStreams.streams && parsedStreams.streams.length > 0) {
            this.log(`Found ${parsedStreams.streams.length} stream(s)`, 'success');
            if (parsedStreams.subtitles && parsedStreams.subtitles.length > 0) {
                this.log(`Found ${parsedStreams.subtitles.length} subtitle track(s)`, 'success');
            }
            
            requestAnimationFrame(async () => {
                await this.displayStreamWithMetadata(parsedStreams);
            });
        } else {
            this.log('No valid streams found', 'error');
            this.elements.streamDiv.innerHTML = `
                <h3>Stream Player</h3>
                ${this.createErrorHTML('No valid streams found in response.')}
            `;
        }
    }

    handleProgress(message, requestId) {
        this.log(`[Background] ${message}`, 'info');
    }

    handleWorkerError(error, requestId) {
        this.pendingRequests.delete(requestId);
        this.log(`Background error: ${error}`, 'error');
        this.resetSearchUI();
    }

    displaySearchResults(results) {
        this.currentResults = results;
        this.currentPage = 0;
        
        if (results.length === 0) {
            this.elements.searchResultsDiv.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🎬</div>
                    <div class="empty-title">No results found</div>
                    <div class="empty-desc">Try a different search term</div>
                </div>
            `;
            return;
        }
        
        // Create Netflix-style content row
        this.elements.searchResultsDiv.innerHTML = `
            <div class="content-row-header">
                <div>
                    <h3 class="content-row-title">Search Results</h3>
                    <p class="content-row-subtitle">${results.length} results found</p>
                </div>
            </div>
            <div class="content-slider">
                <div class="content-slider-wrapper" id="search-results-wrapper">
                    <!-- Results will be inserted here -->
                </div>
            </div>
        `;
        
        // Display all results in horizontal scroll
        this.displayAllSearchResults(results);
    }

    displayAllSearchResults(results) {
        const wrapper = document.getElementById('search-results-wrapper');
        if (!wrapper) return;
        
        // Clear current results
        wrapper.innerHTML = '';
        
        // Use DocumentFragment for better performance
        const fragment = document.createDocumentFragment();
        
        results.forEach((item, index) => {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'content-card';
            cardDiv.style.opacity = '0';
            cardDiv.style.transform = 'scale(0.9)';
            
            cardDiv.innerHTML = `
                <img src="${item.image}" alt="${item.title}" 
                     class="content-card-image"
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI4MCIgdmlld0JveD0iMCAwIDIwMCAyODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjgwIiBmaWxsPSIjMUYxRjFGIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTQwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNzc3IiBmb250LXNpemU9IjE0Ij5ObyBJbWFnZTwvdGV4dD4KPC9zdmc+'" 
                     loading="lazy">
                <button class="content-card-play" aria-label="Play ${item.title}">▶</button>
                <div class="content-card-overlay">
                    <h4 class="content-card-title">${item.title}</h4>
                    <p class="content-card-info">Click to view details</p>
                </div>
            `;
            
            cardDiv.dataset.href = item.href;
            cardDiv.addEventListener('click', () => this.handleResultClick(item.href));
            fragment.appendChild(cardDiv);
            
            // Animate in with staggered delay
            setTimeout(() => {
                cardDiv.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                cardDiv.style.opacity = '1';
                cardDiv.style.transform = 'scale(1)';
            }, index * 30);
        });
        
        wrapper.appendChild(fragment);
        
        // Scroll to results section
        this.elements.searchResultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }



    async handleResultClick(url) {
        this.log(`Result clicked. Processing details for: ${url}`);
        
        // Enhanced loading states
        this.elements.detailsDiv.innerHTML = '<h3>Details</h3>' + this.createLoadingHTML('Loading details...');
        this.elements.episodesDiv.innerHTML = this.createLoadingHTML('Loading episodes...');

        // Check if we have user functions (from modules)
        if (this.userFunctions && Object.keys(this.userFunctions).length > 0) {
            // Modules must run in main thread since functions can't be sent to workers
            this.log('Using main thread for module-based details/episodes extraction', 'info');
            await this.handleResultClickMainThread(url);
        } else if (this.worker) {
            // Use Web Worker for non-module based processing
            this.log('Using Web Worker for background details/episodes extraction', 'info');
            const detailsRequestId = await this.sendWorkerMessage('EXTRACT_DETAILS', {
                url,
                moduleConfig: this.moduleConfig
            });
            
            const episodesRequestId = await this.sendWorkerMessage('EXTRACT_EPISODES', {
                url,
                moduleConfig: this.moduleConfig
            });
            
            this.pendingRequests.set(detailsRequestId, 'details');
            this.pendingRequests.set(episodesRequestId, 'episodes');
        } else {
            // Fallback to main thread
            this.log('Falling back to main thread for details/episodes extraction', 'warning');
            await this.handleResultClickMainThread(url);
        }
    }

    async handleResultClickMainThread(url) {
        try {
            let details, episodes;
            if (this.moduleConfig.asyncJS) {
                this.log('Async mode: Calling extractDetails and extractEpisodes with URL.');
                this.log(`DEBUG: URL being passed to extractEpisodes: ${url}`);
                
                const detailsPromise = Promise.race([
                    this.userFunctions.extractDetails(url),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Details timeout')), 30000))
                ]);
                
                const episodesPromise = Promise.race([
                    this.userFunctions.extractEpisodes(url).catch(error => {
                        this.log(`DEBUG: extractEpisodes error: ${error.message}`, 'warning');
                        return []; // Return empty array on error
                    }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Episodes timeout')), 30000))
                ]);
                
                [details, episodes] = await Promise.all([detailsPromise, episodesPromise]);
                this.log(`DEBUG: Raw episodes result type: ${typeof episodes}`, 'info');
                this.log(`DEBUG: Raw episodes result: ${JSON.stringify(episodes).substring(0, 200)}...`, 'info');
            } else {
                this.log('Normal mode: Fetching HTML for details and episodes.');
                const html = await fetch(url).then(res => res.text());
                this.log(`HTML received (${html.length} chars). Passing to functions.`);
                this.log(`DEBUG: URL being passed to extractEpisodes: ${url}`);
                
                details = this.userFunctions.extractDetails(html);
                try {
                    episodes = this.userFunctions.extractEpisodes(html);
                    this.log(`DEBUG: Raw episodes result type: ${typeof episodes}`, 'info');
                    this.log(`DEBUG: Raw episodes result: ${JSON.stringify(episodes).substring(0, 200)}...`, 'info');
                } catch (error) {
                    this.log(`DEBUG: extractEpisodes error: ${error.message}`, 'warning');
                    episodes = [];
                }
            }
            
            const parsedDetails = ((typeof details === 'string') ? JSON.parse(details) : details)[0];
            const parsedEpisodes = (typeof episodes === 'string') ? JSON.parse(episodes) : episodes;

            this.log('Details extracted successfully.', 'success');
            this.log(`DEBUG: Parsed episodes type: ${typeof parsedEpisodes}`, 'info');
            this.log(`DEBUG: Parsed episodes is array: ${Array.isArray(parsedEpisodes)}`, 'info');
            this.log(`DEBUG: Parsed episodes length: ${parsedEpisodes ? parsedEpisodes.length : 'undefined/null'}`, 'info');
            
            requestAnimationFrame(() => {
                this.displayDetails(parsedDetails);
                this.log(`Extracted ${parsedEpisodes.length} episodes.`, 'success');
                this.displayEpisodes(parsedEpisodes);
            });

        } catch(e) {
            this.log(`Error fetching details/episodes: ${e.message}`, 'error');
            this.elements.detailsDiv.innerHTML = '<h3>Details</h3>' + this.createErrorHTML('Error loading details.');
            this.elements.episodesDiv.innerHTML = this.createErrorHTML('Error loading episodes.');
        }
    }

    async handleEpisodeClick(url) {
        this.log(`Episode clicked. Processing stream for: ${url}`);
        
        // ⚠️ CRITICAL FIX: DO NOT clear innerHTML as it destroys player elements!
        // Instead, just show loading in placeholder while preserving player elements
        this.log('🔧 PRESERVING PLAYER ELEMENTS - not clearing innerHTML', 'info');
        
        // Hide player elements and show loading in placeholder
        if (this.elements.plyrWrapper) {
            this.elements.plyrWrapper.style.display = 'none';
        }
        if (this.elements.playerInfo) {
            this.elements.playerInfo.style.display = 'none';
        }
        if (this.elements.playerPlaceholder) {
            this.elements.playerPlaceholder.style.display = 'block';
            this.elements.playerPlaceholder.innerHTML = `
                <div class="placeholder-icon">⏳</div>
                <div class="placeholder-title">Loading Stream</div>
                <div class="placeholder-desc">Fetching stream URL...</div>
            `;
        }
        
        this.elements.videoPlayer.style.display = 'none';
        this.elements.videoPlayer.src = '';

        // Check if we have user functions (from modules)
        if (this.userFunctions && Object.keys(this.userFunctions).length > 0) {
            // Modules must run in main thread since functions can't be sent to workers
            this.log('Using main thread for module-based stream extraction', 'info');
            await this.handleEpisodeClickMainThread(url);
        } else if (this.worker) {
            // Use Web Worker for non-module based processing
            this.log('Using Web Worker for background stream extraction', 'info');
            const requestId = await this.sendWorkerMessage('EXTRACT_STREAM', {
                url,
                moduleConfig: this.moduleConfig
            });
            
            this.pendingRequests.set(requestId, 'stream');
        } else {
            // Fallback to main thread
            this.log('Falling back to main thread for stream extraction', 'warning');
            await this.handleEpisodeClickMainThread(url);
        }
    }

    async handleEpisodeClickMainThread(url) {
        try {
            let streamData;
            if (this.moduleConfig.streamAsyncJS || this.moduleConfig.asyncJS) {
                this.log('Async stream mode: Calling extractStreamUrl.');
                if (this.moduleConfig.asyncJS) {
                    streamData = await Promise.race([
                        this.userFunctions.extractStreamUrl(url).then(data => {
                            this.log(`DEBUG: Async raw streamData type: ${typeof data}`, 'info');
                            this.log(`DEBUG: Async raw streamData: ${JSON.stringify(data).substring(0, 500)}...`, 'info');
                            return data;
                        }).catch(error => {
                            this.log(`DEBUG: Async extractStreamUrl error: ${error.message}`, 'warning');
                            throw error;
                        }),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Stream extraction timeout')), 45000))
                    ]);
                } else {
                    const html = await fetch(url).then(res => res.text());
                    this.log(`HTML received (${html.length} chars). Passing to extractStreamUrl.`);
                    streamData = await Promise.race([
                        this.userFunctions.extractStreamUrl(html).then(data => {
                            this.log(`DEBUG: StreamAsync raw streamData type: ${typeof data}`, 'info');
                            this.log(`DEBUG: StreamAsync raw streamData: ${JSON.stringify(data).substring(0, 500)}...`, 'info');
                            return data;
                        }).catch(error => {
                            this.log(`DEBUG: StreamAsync extractStreamUrl error: ${error.message}`, 'warning');
                            throw error;
                        }),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Stream extraction timeout')), 30000))
                    ]);
                }
            } else {
                this.log('Normal stream mode: Calling extractStreamUrl.');
                const html = await fetch(url).then(res => res.text());
                this.log(`HTML received (${html.length} chars). Passing to extractStreamUrl.`);
                try {
                    streamData = this.userFunctions.extractStreamUrl(html);
                    this.log(`DEBUG: Raw streamData type: ${typeof streamData}`, 'info');
                    this.log(`DEBUG: Raw streamData: ${JSON.stringify(streamData).substring(0, 500)}...`, 'info');
                } catch (error) {
                    this.log(`DEBUG: extractStreamUrl error: ${error.message}`, 'warning');
                    throw error;
                }
            }
            
            // Parse stream data using enhanced Sora-compatible logic with softsub support
            const parsedStreams = this.parseEnhancedStreamData(streamData);
            
            if (parsedStreams.streams && parsedStreams.streams.length > 0) {
                this.log(`Found ${parsedStreams.streams.length} stream(s)`, 'success');
                if (parsedStreams.subtitles && parsedStreams.subtitles.length > 0) {
                    this.log(`Found ${parsedStreams.subtitles.length} subtitle track(s)`, 'success');
                }
                
                requestAnimationFrame(async () => {
                    await this.displayStreamWithMetadata(parsedStreams);
                });
            } else {
                this.log('No valid streams found', 'error');
                this.elements.streamDiv.innerHTML = `
                    <h3>Stream Player</h3>
                    ${this.createErrorHTML('No valid streams found in response.')}
                `;
            }
            
        } catch(e) {
            this.log(`Error fetching stream: ${e.message}`, 'error');
            this.elements.streamDiv.innerHTML = `
                <h3>Stream Player</h3>
                ${this.createErrorHTML('Error fetching stream. Check logs for details.')}
            `;
        }
    }

    displayDetails(details) {
        this.elements.detailsDiv.innerHTML = `
            <h3>Details</h3>
            <p><strong>Description:</strong> ${details.description || 'N/A'}</p>
            <p><strong>Aliases:</strong> ${details.aliases || 'N/A'}</p>
            <p><strong>Air Date:</strong> ${details.airdate || 'N/A'}</p>
        `;
    }

    displayEpisodes(episodes) {
        // Make episodes section visible
        const episodesSection = document.querySelector('.episodes-section');
        if (episodesSection) {
            episodesSection.style.display = 'block';
        }
        
        if (episodes.length === 0) {
            this.elements.episodesDiv.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📺</div>
                    <div class="empty-title">No episodes found</div>
                    <div class="empty-desc">Episodes will appear here when available</div>
                </div>
            `;
            return;
        }
        
        // Update the parent episodes section with new structure
        const parentSection = this.elements.episodesDiv.closest('.episodes-section');
        if (parentSection) {
            parentSection.innerHTML = `
                <div class="episodes-header">
                    <h3 class="episodes-title">Episodes</h3>
                    <p class="episodes-count">${episodes.length} episode${episodes.length > 1 ? 's' : ''}</p>
                </div>
                <div class="episodes-list" id="episodes-list">
                    <!-- Episodes will be inserted here -->
                </div>
            `;
        }
        
        // Display all episodes
        this.displayAllEpisodesEnhanced(episodes);
    }

    displayAllEpisodesEnhanced(episodes) {
        const episodesList = document.getElementById('episodes-list');
        if (!episodesList) return;
        
        // Clear existing episodes
        episodesList.innerHTML = '';
        
        // Use DocumentFragment for better performance
        const fragment = document.createDocumentFragment();
        
        episodes.forEach((ep, index) => {
            const epDiv = document.createElement('div');
            epDiv.className = 'episode-card';
            epDiv.style.opacity = '0';
            epDiv.style.transform = 'translateY(20px)';
            
            // Create Netflix-style episode card
            const episodeTitle = ep.title || `Episode ${ep.number}`;
            const episodeDesc = ep.description || `Stream Episode ${ep.number} now`;
            const duration = ep.duration || '45 min';
            
            epDiv.innerHTML = `
                <div class="episode-thumbnail">
                    <div class="episode-number">${ep.number}</div>
                    <button class="episode-play-button" aria-label="Play Episode ${ep.number}">▶</button>
                </div>
                <div class="episode-details">
                    <div class="episode-header">
                        <h4 class="episode-title">${episodeTitle}</h4>
                        <p class="episode-duration">${duration}</p>
                    </div>
                    <p class="episode-description">${episodeDesc}</p>
                </div>
            `;
            
            epDiv.dataset.href = ep.href;
            epDiv.addEventListener('click', (e) => {
                e.preventDefault();
                this.log(`Episode card clicked: ${ep.href}`, 'info');
                this.log(`Episode data: ${JSON.stringify(ep)}`, 'info');
                this.log(`User functions available: ${!!this.userFunctions}`, 'info');
                if (this.userFunctions) {
                    this.log(`Extract stream function available: ${!!this.userFunctions.extractStreamUrl}`, 'info');
                }
                this.handleEpisodeClickEnhanced(ep.href);
            });
            fragment.appendChild(epDiv);
            
            // Animate in with staggered timing
            setTimeout(() => {
                epDiv.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                epDiv.style.opacity = '1';
                epDiv.style.transform = 'translateY(0)';
            }, index * 50);
        });
        
        episodesList.appendChild(fragment);
    }

    async displayStream(streamUrl, subsUrl, title = 'Unknown Content', customHeaders = {}) {
        if (!streamUrl) {
            this.showPlayerError('Failed to extract a valid stream URL.');
            return;
        }
        
        this.log(`Starting stream playback: ${streamUrl}`, 'info');
        if (Object.keys(customHeaders).length > 0) {
            this.log(`Using custom headers: ${Object.keys(customHeaders).join(', ')}`, 'info');
        }
        
        // Show loading state
        this.showPlayerLoading('Loading video...');
        
        try {
            // Detect stream type
            const isHLS = streamUrl.includes('.m3u8');
            const isDASH = streamUrl.includes('.mpd');
            const isDirectVideo = streamUrl.match(/\.(mp4|webm|mkv|avi)(\?|$)/i);

            if (isHLS) {
                this.log('Detected HLS stream (.m3u8) - using HLS.js with Plyr', 'info');
                await this.loadPlyrHLSStream(streamUrl, subsUrl, title, customHeaders);
                return;
            } else if (isDASH) {
                this.log('Detected DASH stream (.mpd) - using Plyr directly', 'info');
                await this.loadPlyrDirectStream(streamUrl, subsUrl, title, customHeaders);
                return;
            }
            
            // For direct video files, try fetch with proper headers first
            const videoHeaders = { ...this.getStreamHeaders(streamUrl), ...customHeaders };
            this.log(`Loading direct video with headers: ${Object.keys(videoHeaders).join(', ')}`, 'info');
            
            try {
                const videoResponse = await fetch(streamUrl, {
                    method: 'HEAD', // Just check if accessible
                    headers: videoHeaders,
                    mode: 'cors'
                });

                if (videoResponse.ok) {
                    this.log('Stream accessible with headers, loading via Plyr', 'success');
                    await this.loadPlyrDirectStream(streamUrl, subsUrl, title, customHeaders);
                } else {
                    throw new Error(`HTTP ${videoResponse.status}: ${videoResponse.statusText}`);
                }
            } catch (fetchError) {
                this.log(`Headers fetch failed: ${fetchError.message}, trying blob method`, 'warning');
                await this.loadPlyrBlobStream(streamUrl, subsUrl, title, customHeaders);
            }

        } catch (error) {
            this.log(`Stream loading error: ${error.message}`, 'error');
            this.showPlayerError(`Failed to load stream: ${error.message}`, streamUrl);
        }
    }

    async loadPlyrHLSStream(streamUrl, subsUrl, title, customHeaders = {}) {
        try {
            // Get the required headers for this stream
            const streamHeaders = { ...this.getStreamHeaders(streamUrl), ...customHeaders };
            this.log(`HLS stream headers: ${Object.keys(streamHeaders).join(', ')}`, 'info');
            
            // Check if HLS.js is available and needed
            if (this.player && this.player.media.canPlayType('application/vnd.apple.mpegurl')) {
                // Native HLS support - set headers on video element
                this.log('Using native HLS support with headers', 'info');
                
                // For native HLS, we can only set some attributes, not custom headers
                this.player.media.setAttribute('crossorigin', 'anonymous');
                this.player.media.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
                
                await this.loadPlyrDirectStream(streamUrl, subsUrl, title);
                
            } else if (typeof Hls !== 'undefined' && Hls.isSupported()) {
                // Use HLS.js with custom headers
                this.log('Using HLS.js for stream processing with custom headers', 'info');
                
                if (this.hls) {
                    this.hls.destroy();
                }
                
                // Configure HLS.js with enhanced CORS proxy support (Sora WebUI pattern)
                this.hls = new Hls({
                    debug: false,
                    enableWorker: true,
                    lowLatencyMode: false,
                    backBufferLength: 90,
                    maxBufferLength: 30,
                    maxMaxBufferLength: 600,
                    xhrSetup: (xhr, requestUrl) => {
                        // Apply CORS proxy configuration like working Sora implementation
                        let corsProxy = localStorage.getItem("corsProxy") || "";
                        
                        // Clean up cloudflare proxy URLs if present
                        if (requestUrl.startsWith("https://cloudflare-cors-anywhere.jmcrafter26.workers.dev/?")) {
                            requestUrl = requestUrl.replace("https://cloudflare-cors-anywhere.jmcrafter26.workers.dev/?", "");
                        }
                        
                        // Log the HLS segment request for debugging
                        this.log(`HLS Segment Request: ${corsProxy ? 'via proxy' : 'direct'} ${requestUrl}`, 'info');
                        
                        // Apply headers with enhanced error handling
                        const allowedHeaders = {};
                        const rejectedHeaders = {};
                        
                        Object.keys(streamHeaders).forEach(headerName => {
                            try {
                                xhr.setRequestHeader(headerName, streamHeaders[headerName]);
                                allowedHeaders[headerName] = streamHeaders[headerName];
                            } catch (error) {
                                this.log(`HLS header rejected: ${headerName} - ${error.message}`, 'warning');
                                rejectedHeaders[headerName] = streamHeaders[headerName];
                            }
                        });
                        
                        // Log what was applied vs rejected
                        if (Object.keys(allowedHeaders).length > 0) {
                            this.log(`Applied headers to HLS request: ${Object.keys(allowedHeaders).join(', ')}`, 'info');
                        }
                        if (Object.keys(rejectedHeaders).length > 0) {
                            this.log(`Filtered headers (browser restriction): ${Object.keys(rejectedHeaders).join(', ')}`, 'info');
                        }
                    }
                });
                
                this.hls.loadSource(streamUrl);
                this.hls.attachMedia(this.player.media);
                
                this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    this.log('HLS manifest parsed successfully with custom headers', 'success');
                    this.showPlayerContent(title, streamUrl);
                    if (subsUrl) {
                        this.addSubtitles(subsUrl);
                    }
                });
                
                this.hls.on(Hls.Events.ERROR, (event, data) => {
                    this.log(`HLS error: ${data.type} - ${data.details}`, 'error');
                    if (data.fatal) {
                        switch (data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                this.log('HLS network error - checking if CORS/auth related', 'error');
                                // Check if this might be a CORS or authentication issue
                                if (data.response && (data.response.code === 403 || data.response.code === 401)) {
                                    this.log('Authentication failure detected - trying alternative loading method', 'warning');
                                    this.fallbackToDirectVideoElement(streamUrl, subsUrl, title);
                                } else if (data.details && data.details.includes('cors')) {
                                    this.log('CORS error detected - trying direct video element', 'warning');
                                    this.fallbackToDirectVideoElement(streamUrl, subsUrl, title);
                                } else {
                                    this.showPlayerError('Network error loading stream - check authentication', streamUrl);
                                }
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                this.log('HLS media error - trying to recover', 'warning');
                                try {
                                    this.hls.recoverMediaError();
                                } catch (recoveryError) {
                                    this.showPlayerError('Media error in HLS stream', streamUrl);
                                }
                                break;
                            default:
                                this.showPlayerError('HLS stream failed to load', streamUrl);
                                break;
                        }
                    }
                });
                
                this.hls.on(Hls.Events.FRAG_LOAD_ERROR, (event, data) => {
                    this.log(`HLS fragment load error: ${data.response?.code} - ${data.frag?.url}`, 'error');
                });
                
            } else {
                // Fallback to direct loading
                this.log('HLS.js not available, falling back to direct loading', 'warning');
                await this.loadPlyrDirectStream(streamUrl, subsUrl, title);
            }
        } catch (error) {
            this.log(`HLS loading failed: ${error.message}`, 'error');
            throw error;
        }
    }

    fallbackToDirectVideoElement(streamUrl, subsUrl, title) {
        this.log('Attempting fallback to direct video element loading', 'warning');
        
        try {
            // Destroy existing HLS instance
            if (this.hls) {
                this.hls.destroy();
                this.hls = null;
            }
            
            // Try loading directly into video element
            // This bypasses XMLHttpRequest and uses browser's native loading
            // which includes proper headers automatically
            if (this.player && this.player.media) {
                this.player.media.crossOrigin = "anonymous";
                this.player.media.src = streamUrl;
                
                // Add event listeners for this fallback attempt
                const onLoadStart = () => {
                    this.log('Direct video element loading started', 'info');
                    this.showPlayerContent(title, streamUrl);
                };
                
                const onCanPlay = () => {
                    this.log('Direct video element can play - fallback successful!', 'success');
                    if (subsUrl) {
                        this.addSubtitles(subsUrl);
                    }
                };
                
                const onError = (e) => {
                    this.log(`Direct video element failed: ${e.target.error?.message || 'Unknown error'}`, 'error');
                    this.showPlayerError('All loading methods failed - stream may require server-side proxy', streamUrl);
                };
                
                this.player.media.addEventListener('loadstart', onLoadStart, { once: true });
                this.player.media.addEventListener('canplay', onCanPlay, { once: true });
                this.player.media.addEventListener('error', onError, { once: true });
                
                this.log('Fallback method initiated - video element will load with browser defaults', 'info');
            } else {
                throw new Error('No video player available for fallback');
            }
            
        } catch (fallbackError) {
            this.log(`Fallback method failed: ${fallbackError.message}`, 'error');
            this.showPlayerError('All loading methods failed - stream authentication not supported', streamUrl);
        }
    }

    async loadPlyrDirectStream(streamUrl, subsUrl, title, customHeaders = {}) {
        try {
            this.log('Loading stream directly into Plyr', 'info');
            
            // Log custom headers if present
            if (Object.keys(customHeaders).length > 0) {
                this.log(`Direct stream using custom headers: ${Object.keys(customHeaders).join(', ')}`, 'info');
            }
            
            // Set video source using Plyr API
            if (this.player) {
                this.player.source = {
                    type: 'video',
                    title: title,
                    sources: [{
                        src: streamUrl,
                        type: this.getVideoMimeType(streamUrl)
                    }],
                    tracks: subsUrl ? [{
                        kind: 'captions',
                        label: 'English',
                        srclang: 'en',
                        src: subsUrl,
                        default: true
                    }] : []
                };
            } else {
                // Fallback to basic video if Plyr not available
                this.elements.videoPlayer.src = streamUrl;
                if (subsUrl) {
                    this.addSubtitles(subsUrl);
                }
            }
            
            this.showPlayerContent(title, streamUrl);
            this.log('Stream loaded successfully into Plyr', 'success');
            
        } catch (error) {
            this.log(`Direct stream loading failed: ${error.message}`, 'error');
            throw error;
        }
    }

    async loadPlyrBlobStream(streamUrl, subsUrl, title, customHeaders = {}) {
        try {
            this.log('Loading stream via blob method', 'info');
            
            const videoHeaders = { ...this.getStreamHeaders(streamUrl), ...customHeaders };
            this.log(`Blob method using headers: ${Object.keys(videoHeaders).join(', ')}`, 'info');
            
            // Check if CORS proxy is configured and use soraFetch instead
            const corsProxy = localStorage.getItem("corsProxy");
            let videoResponse;
            
            if (corsProxy) {
                this.log('Using CORS proxy for stream fetch with module headers', 'info');
                // Use soraFetch to properly handle CORS proxy with headers
                const responseData = await this.soraFetch(streamUrl, {
                    method: 'GET',
                    headers: videoHeaders,
                    responseType: 'arraybuffer'
                });
                
                // Convert arraybuffer to blob for video player
                const blob = new Blob([responseData], { type: this.getVideoMimeType(streamUrl) });
                videoResponse = {
                    ok: true,
                    status: 200,
                    blob: () => Promise.resolve(blob)
                };
            } else {
                // Use regular fetch when no CORS proxy
                videoResponse = await fetch(streamUrl, {
                    method: 'GET',
                    headers: videoHeaders,
                    mode: 'cors'
                });

                if (!videoResponse.ok) {
                    throw new Error(`HTTP ${videoResponse.status}: ${videoResponse.statusText}`);
                }
            }

            const videoBlob = await videoResponse.blob();
            const blobUrl = URL.createObjectURL(videoBlob);
            
            this.log('Blob created successfully, loading into Plyr', 'success');

            // Handle subtitles if available
            let subsBlob = null;
            if (subsUrl) {
                try {
                    const subsHeaders = { ...this.getStreamHeaders(subsUrl), ...customHeaders };
                    
                    if (corsProxy) {
                        this.log('Using CORS proxy for subtitle fetch with module headers', 'info');
                        const subsText = await this.soraFetch(subsUrl, {
                            method: 'GET',
                            headers: subsHeaders
                        });
                        
                        const subsBlobData = new Blob([subsText], { type: 'text/vtt' });
                        subsBlob = URL.createObjectURL(subsBlobData);
                        this.log('Subtitles blob created successfully via CORS proxy', 'success');
                    } else {
                        const subsResponse = await fetch(subsUrl, {
                            method: 'GET',
                            headers: subsHeaders,
                            mode: 'cors'
                        });

                        if (subsResponse.ok) {
                            const subsBlobData = await subsResponse.blob();
                            subsBlob = URL.createObjectURL(subsBlobData);
                            this.log('Subtitles blob created successfully', 'success');
                        }
                    }
                } catch (subsError) {
                    this.log(`Subtitles loading failed: ${subsError.message}`, 'warning');
                }
            }

            // Set video source using Plyr API with blob URL
            if (this.player) {
                this.player.source = {
                    type: 'video',
                    title: title,
                    sources: [{
                        src: blobUrl,
                        type: this.getVideoMimeType(streamUrl)
                    }],
                    tracks: subsBlob ? [{
                        kind: 'captions',
                        label: 'English',
                        srclang: 'en',
                        src: subsBlob,
                        default: true
                    }] : []
                };
            } else {
                // Fallback to basic video if Plyr not available
                this.elements.videoPlayer.src = blobUrl;
                if (subsBlob) {
                    const track = document.createElement('track');
                    track.kind = 'subtitles';
                    track.label = 'English';
                    track.srclang = 'en';
                    track.src = subsBlob;
                    track.default = true;
                    this.elements.videoPlayer.appendChild(track);
                }
            }

            this.showPlayerContent(title, streamUrl);
            
            // Clean up blob URLs when video ends or errors
            const cleanup = () => {
                URL.revokeObjectURL(blobUrl);
                if (subsBlob) {
                    URL.revokeObjectURL(subsBlob);
                }
            };

            if (this.player) {
                this.player.on('ended', cleanup, { once: true });
                this.player.on('error', cleanup, { once: true });
            } else {
                this.elements.videoPlayer.addEventListener('ended', cleanup, { once: true });
                this.elements.videoPlayer.addEventListener('error', cleanup, { once: true });
            }

        } catch (error) {
            this.log(`Blob stream loading failed: ${error.message}`, 'error');
            throw error;
        }
    }

    getVideoMimeType(url) {
        if (url.includes('.m3u8')) return 'application/x-mpegURL';
        if (url.includes('.mpd')) return 'application/dash+xml';
        if (url.includes('.mp4')) return 'video/mp4';
        if (url.includes('.webm')) return 'video/webm';
        if (url.includes('.ogg')) return 'video/ogg';
        return 'video/mp4'; // default
    }

    addSubtitles(subsUrl) {
        if (!subsUrl) return;
        
        try {
            const track = document.createElement('track');
            track.kind = 'subtitles';
            track.label = 'English';
            track.srclang = 'en';
            track.src = subsUrl;
            track.default = true;
            
            this.elements.videoPlayer.appendChild(track);
            this.log('Subtitles added to player', 'success');
        } catch (error) {
            this.log(`Failed to add subtitles: ${error.message}`, 'warning');
        }
    }

    showPlayerLoading(message = 'Loading...') {
        // Hide placeholder
        if (this.elements.playerPlaceholder) {
            this.elements.playerPlaceholder.style.display = 'none';
        }
        
        // Show info panel with loading message
        if (this.elements.playerInfo) {
            this.elements.playerInfo.style.display = 'block';
            this.elements.streamTitle.textContent = message;
            this.elements.streamUrlDisplay.textContent = '';
        }
        
        // Hide quality selector
        if (this.elements.qualitySelector) {
            this.elements.qualitySelector.style.display = 'none';
        }
        
        // Hide video player while loading
        if (this.elements.plyrWrapper) {
            this.elements.plyrWrapper.style.display = 'none';
        }
    }

    showPlayerContent(title, streamUrl) {
        this.log(`=== SHOWING PLAYER CONTENT ===`, 'info');
        this.log(`Title: ${title}`, 'info');
        this.log(`Stream URL: ${streamUrl}`, 'info');
        
        // Navigate to player section FIRST
        this.log('Navigating to player section...', 'info');
        this.showSection('player');
        
        // Debug all player-related elements
        this.log('=== ELEMENT EXISTENCE DEBUG ===', 'info');
        this.log(`Player placeholder exists: ${!!this.elements.playerPlaceholder}`, 'info');
        this.log(`Player info exists: ${!!this.elements.playerInfo}`, 'info');
        this.log(`Plyr wrapper exists: ${!!this.elements.plyrWrapper}`, 'info');
        this.log(`Video player exists: ${!!this.elements.videoPlayer}`, 'info');
        
        if (this.elements.plyrWrapper) {
            this.log(`Plyr wrapper current display: ${this.elements.plyrWrapper.style.display}`, 'info');
        }
        
        // Hide placeholder
        if (this.elements.playerPlaceholder) {
            this.elements.playerPlaceholder.style.display = 'none';
            this.log('Player placeholder hidden', 'info');
        } else {
            this.log('WARNING: Player placeholder not found', 'warning');
        }
        
        // Show and update info panel
        if (this.elements.playerInfo) {
            this.elements.playerInfo.style.display = 'block';
            this.log('Player info panel shown', 'info');
            
            if (this.elements.streamTitle) {
                this.elements.streamTitle.textContent = title;
                this.log(`Stream title set: ${title}`, 'info');
            }
            if (this.elements.streamUrlDisplay) {
                this.elements.streamUrlDisplay.textContent = streamUrl;
                this.log('Stream URL display set', 'info');
            }
        } else {
            this.log('WARNING: Player info panel not found', 'warning');
        }
        
        // Ensure video player wrapper is visible with extra debugging
        if (this.elements.plyrWrapper) {
            this.log('Setting plyr wrapper visible...', 'info');
            this.elements.plyrWrapper.style.display = 'block';
            this.elements.plyrWrapper.style.visibility = 'visible';
            this.elements.plyrWrapper.style.opacity = '1';
            
            // Force override any CSS hiding it
            this.elements.plyrWrapper.style.setProperty('display', 'block', 'important');
            
            // Get computed styles
            const computedStyles = window.getComputedStyle(this.elements.plyrWrapper);
            this.log(`Plyr wrapper computed display: ${computedStyles.display}`, 'info');
            this.log(`Plyr wrapper computed visibility: ${computedStyles.visibility}`, 'info');
            this.log(`Plyr wrapper computed opacity: ${computedStyles.opacity}`, 'info');
            this.log(`Plyr wrapper computed height: ${computedStyles.height}`, 'info');
            this.log(`Plyr wrapper computed width: ${computedStyles.width}`, 'info');
            
            this.log('✅ Player wrapper made visible', 'success');
        } else {
            this.log('❌ CRITICAL: plyrWrapper element not found', 'error');
            
            // Try to find it manually
            const manualSearch = document.getElementById('plyr-wrapper');
            this.log(`Manual search for plyr-wrapper: ${!!manualSearch}`, 'info');
            if (manualSearch) {
                this.elements.plyrWrapper = manualSearch;
                manualSearch.style.display = 'block';
                this.log('Fixed plyrWrapper reference and made visible', 'success');
            }
        }
        
        // Ensure video element is visible
        if (this.elements.videoPlayer) {
            this.elements.videoPlayer.style.display = 'block';
            this.elements.videoPlayer.style.visibility = 'visible';
            this.log('Video element made visible', 'info');
        } else {
            this.log('WARNING: Video element not found', 'warning');
        }
        
        // Hide quality selector for now (can be enhanced later)
        if (this.elements.qualitySelector) {
            this.elements.qualitySelector.style.display = 'none';
        }
        
        // Force scroll to player section
        setTimeout(() => {
            const playerSection = document.getElementById('player-section');
            if (playerSection) {
                playerSection.scrollIntoView({ behavior: 'smooth' });
                this.log('Scrolled to player section', 'info');
            }
        }, 100);
        
        this.log('=== PLAYER CONTENT DISPLAY COMPLETED ===', 'success');
    }

    showPlayerError(message, streamUrl = '') {
        // Hide video player
        if (this.elements.plyrWrapper) {
            this.elements.plyrWrapper.style.display = 'none';
        }
        
        // Add additional context for authentication errors
        let additionalInfo = '';
        if (message.includes('authentication') || message.includes('403') || message.includes('CORS') || message.includes('network')) {
            additionalInfo = `
                <div style="margin-top: 1rem; padding: 1rem; background: rgba(229, 9, 20, 0.1); border-radius: 8px; border-left: 4px solid var(--netflix-red); text-align: left;">
                    <h4 style="margin: 0 0 0.5rem 0; color: var(--netflix-red);">🔐 Authentication Issue Detected</h4>
                    <p style="margin: 0 0 0.5rem 0; font-size: 0.9rem;">This stream requires special headers that browsers block for security:</p>
                    <ul style="margin: 0.5rem 0; font-size: 0.85rem; padding-left: 1.5rem;">
                        <li><strong>Referer:</strong> Blocked by browser security</li>
                        <li><strong>User-Agent:</strong> Controlled by browser</li>
                        <li><strong>Origin:</strong> Set automatically by browser</li>
                        <li><strong>Sec-*:</strong> Security headers managed by browser</li>
                    </ul>
                    <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem; color: var(--netflix-red);"><strong>💡 Solutions:</strong></p>
                    <ul style="margin: 0.5rem 0; font-size: 0.85rem; padding-left: 1.5rem;">
                        <li>Direct video fallback (automatically attempted)</li>
                        <li><strong>Recommended:</strong> Install a CORS browser extension to bypass restrictions</li>
                        <li>Use a server-side proxy to add required headers</li>
                        <li>Check if the source has CORS-enabled endpoints</li>
                    </ul>
                    <div style="margin-top: 1rem; padding: 0.75rem; background: rgba(0, 255, 0, 0.1); border-radius: 6px; border-left: 3px solid #00ff00; cursor: pointer;" onclick="window.soraApp?.showCorsInstallationGuide()">
                        <p style="margin: 0; font-size: 0.85rem; color: #00ff00;"><strong>🚀 Quick Fix:</strong> Install a CORS Extension (Click Here)</p>
                        <p style="margin: 0.25rem 0 0 0; font-size: 0.8rem;">Chrome, Firefox, Edge - enables authentication headers for streaming</p>
                    </div>
                    ${this.corsExtensionDetected ? 
                        '<div style="margin-top: 0.5rem; padding: 0.5rem; background: rgba(255, 165, 0, 0.1); border-radius: 6px; color: #ffa500; font-size: 0.8rem;">⚠️ CORS extension detected but stream still failed - may need additional configuration</div>' : ''
                    }
                </div>
            `;
        }
        
        // Show error in placeholder
        if (this.elements.playerPlaceholder) {
            this.elements.playerPlaceholder.style.display = 'block';
            this.elements.playerPlaceholder.innerHTML = `
                <div class="placeholder-icon">❌</div>
                <div class="placeholder-title">Playback Error</div>
                <div class="placeholder-desc">${message}</div>
                ${additionalInfo}
                ${streamUrl ? `<a href="${streamUrl}" target="_blank" style="color: var(--netflix-red); margin-top: 1rem; display: inline-block;">Try Direct Link</a>` : ''}
            `;
        }
        
        // Hide info panel
        if (this.elements.playerInfo) {
            this.elements.playerInfo.style.display = 'none';
        }
    }

    getStreamHeaders(url) {
        // Determine base domain for referer from module config
        let referer = 'https://oppai.stream/'; // Default fallback
        
        // Extract base domain from module config if available
        if (this.moduleConfig) {
            const baseUrlSource = this.moduleConfig.baseUrl || this.moduleConfig.searchBaseUrl;
            if (baseUrlSource) {
                try {
                    const baseUrl = new URL(baseUrlSource);
                    referer = `${baseUrl.protocol}//${baseUrl.hostname}/`;
                    this.log(`Using module baseUrl for referer: ${referer}`, 'info');
                } catch (e) {
                    this.log(`Failed to parse module baseUrl: ${baseUrlSource}`, 'warning');
                }
            } else {
                this.log('No baseUrl found in module config, using default referer', 'warning');
            }
        } else {
            this.log('No module config available, using default referer', 'warning');
        }

        // Standard headers for stream validation
        const headers = {
            'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Referer': referer,
            'Sec-Fetch-Dest': 'video',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'cross-site',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        };

        // Add origin if URL is from external domain
        try {
            const streamUrl = new URL(url);
            const refererUrl = new URL(referer);
            if (streamUrl.hostname !== refererUrl.hostname) {
                headers['Origin'] = referer.slice(0, -1); // Remove trailing slash
            }
        } catch (e) {
            // If URL parsing fails, add origin anyway
            headers['Origin'] = referer.slice(0, -1);
        }

        return headers;
    }

    async loadHLSStream(streamUrl, subsUrl) {
        try {
            this.log('Loading HLS stream directly - browser will handle playlist', 'info');
            
            // Set referrer policy for the video element
            this.elements.videoPlayer.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
            this.elements.videoPlayer.setAttribute('crossorigin', 'anonymous');
            
                            // Load subtitles with proper headers if available
                if (subsUrl) {
                    try {
                        const subsHeaders = this.getStreamHeaders(subsUrl);
                        const subsResponse = await this.soraFetch(subsUrl, {
                            method: 'GET',
                            headers: subsHeaders
                        });

                        // Create blob from text response
                        const subsBlob = new Blob([subsResponse], { type: 'text/vtt' });
                        const subsBlobUrl = URL.createObjectURL(subsBlob);
                        
                        const track = document.createElement('track');
                        track.kind = 'subtitles';
                        track.label = 'English';
                        track.srclang = 'en';
                        track.src = subsBlobUrl;
                        track.default = true;
                        this.elements.videoPlayer.appendChild(track);
                        
                        this.log('Subtitles loaded with CORS proxy support', 'success');
                    } catch (subsError) {
                        this.log(`Subtitles loading failed: ${subsError.message}`, 'warning');
                    }
                }

            // Set HLS stream directly
            this.elements.videoPlayer.src = streamUrl;
            this.elements.videoPlayer.style.display = 'block';
            this.elements.streamDiv.appendChild(this.elements.videoPlayer);
            
            this.log('HLS stream loaded - video player will fetch segments with browser headers', 'success');

            // Remove loading message
            const loadingDiv = this.elements.streamDiv.querySelector('.stream-loading');
            if (loadingDiv) loadingDiv.remove();

        } catch (error) {
            this.log(`HLS stream loading error: ${error.message}`, 'error');
            throw error; // Re-throw to trigger fallback
        }
    }

    loadDirectStream(streamUrl, subsUrl) {
        this.log('Loading stream directly (DASH/other format)', 'info');
        
        // Set attributes for better compatibility
        this.elements.videoPlayer.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
        this.elements.videoPlayer.setAttribute('crossorigin', 'anonymous');
        
        // Load subtitles via direct URL if available
        if (subsUrl) {
            const track = document.createElement('track');
            track.kind = 'subtitles';
            track.label = 'English';
            track.srclang = 'en';
            track.src = subsUrl;
            track.default = true;
            this.elements.videoPlayer.appendChild(track);
            this.log('Subtitles added via direct URL', 'info');
        }

        // Set stream directly
        this.elements.videoPlayer.src = streamUrl;
        this.elements.videoPlayer.style.display = 'block';
        this.elements.streamDiv.appendChild(this.elements.videoPlayer);
        
        this.log('Stream set directly on video element', 'success');

        // Remove loading message
        const loadingDiv = this.elements.streamDiv.querySelector('.stream-loading');
        if (loadingDiv) loadingDiv.remove();
    }

    parseStreamData(streamData) {
        try {
            this.log(`DEBUG: parseStreamData input type: ${typeof streamData}`, 'info');
            this.log(`DEBUG: parseStreamData input: ${JSON.stringify(streamData).substring(0, 300)}...`, 'info');
            
            // Convert to string if needed, then parse as JSON
            const jsonString = (typeof streamData === 'string') ? streamData : JSON.stringify(streamData);
            let json;

            try {
                json = JSON.parse(jsonString);
                this.log(`DEBUG: Parsed JSON successfully, type: ${typeof json}`, 'info');
                this.log(`DEBUG: Parsed JSON keys: ${Object.keys(json || {}).join(', ')}`, 'info');
            } catch (parseError) {
                // If not JSON, treat as direct stream URL
                this.log(`DEBUG: JSON parse failed: ${parseError.message}`, 'warning');
                this.log('Stream data is not JSON, treating as direct URL', 'info');
                return {
                    streams: [{ url: streamData, headers: {} }],
                    subtitles: []
                };
            }

            let streamSources = [];
            let subtitleSources = [];

            // Parse streams with Sora-compatible logic (priority order)
            if (json.streams && Array.isArray(json.streams) && json.streams.length > 0) {
                // Check if streams are objects with headers
                if (typeof json.streams[0] === 'object' && json.streams[0].url) {
                    this.log(`Found ${json.streams.length} streams with headers/metadata`, 'info');
                    streamSources = json.streams.map(stream => ({
                        url: stream.url || stream.stream,
                        headers: stream.headers || {},
                        quality: stream.quality || 'auto',
                        type: stream.type || 'auto'
                    }));
                } else if (typeof json.streams[0] === 'string') {
                    this.log(`Found ${json.streams.length} stream URLs`, 'info');
                    streamSources = json.streams.map(url => ({
                        url: url,
                        headers: {},
                        quality: 'auto',
                        type: 'auto'
                    }));
                }
            } else if (json.stream) {
                // Single stream
                if (typeof json.stream === 'object' && json.stream.url) {
                    this.log('Found single stream with headers/metadata', 'info');
                    streamSources = [{
                        url: json.stream.url || json.stream.stream,
                        headers: json.stream.headers || {},
                        quality: json.stream.quality || 'auto',
                        type: json.stream.type || 'auto'
                    }];
                } else if (typeof json.stream === 'string') {
                    this.log('Found single stream URL', 'info');
                    streamSources = [{
                        url: json.stream,
                        headers: {},
                        quality: 'auto',
                        type: 'auto'
                    }];
                }
            }

            // Parse subtitles
            if (json.subtitles && Array.isArray(json.subtitles) && json.subtitles.length > 0) {
                if (typeof json.subtitles[0] === 'object' && json.subtitles[0].url) {
                    this.log(`Found ${json.subtitles.length} subtitle tracks with metadata`, 'info');
                    subtitleSources = json.subtitles.map(sub => ({
                        url: sub.url,
                        language: sub.language || sub.lang || 'en',
                        label: sub.label || 'Unknown',
                        headers: sub.headers || {}
                    }));
                } else if (typeof json.subtitles[0] === 'string') {
                    this.log(`Found ${json.subtitles.length} subtitle URLs`, 'info');
                    subtitleSources = json.subtitles.map((url, index) => ({
                        url: url,
                        language: 'en',
                        label: `Subtitle ${index + 1}`,
                        headers: {}
                    }));
                }
            } else if (json.subtitles && typeof json.subtitles === 'string') {
                this.log('Found single subtitle URL', 'info');
                subtitleSources = [{
                    url: json.subtitles,
                    language: 'en',
                    label: 'English',
                    headers: {}
                }];
            }

            this.log(`DEBUG: Final parsing result - streams: ${streamSources.length}, subtitles: ${subtitleSources.length}`, 'info');
            if (streamSources.length > 0) {
                this.log(`DEBUG: First stream: ${JSON.stringify(streamSources[0]).substring(0, 200)}...`, 'info');
            }
            
            return {
                streams: streamSources,
                subtitles: subtitleSources
            };

        } catch (error) {
            this.log(`DEBUG: parseStreamData error: ${error.message}`, 'error');
            this.log(`Error parsing stream data: ${error.message}`, 'error');
            return {
                streams: [],
                subtitles: []
            };
        }
    }

    async displayStreamWithMetadata(parsedStreams) {
        this.log(`DEBUG: displayStreamWithMetadata called with: ${JSON.stringify(parsedStreams).substring(0, 200)}...`, 'info');
        this.log(`DEBUG: parsedStreams.streams exists: ${!!parsedStreams.streams}`, 'info');
        this.log(`DEBUG: parsedStreams.streams length: ${parsedStreams.streams ? parsedStreams.streams.length : 'undefined'}`, 'info');
        
        if (!parsedStreams.streams || parsedStreams.streams.length === 0) {
            this.log(`DEBUG: No streams found - parsedStreams: ${JSON.stringify(parsedStreams)}`, 'warning');
            this.elements.streamDiv.innerHTML = `
                <h3>Stream Player</h3>
                ${this.createErrorHTML('No valid streams found.')}
            `;
            return;
        }

        // Check for multiple quality options
        const hasMultipleQualities = parsedStreams.streams.length > 1;
        const selectedSubtitle = parsedStreams.subtitles.length > 0 ? parsedStreams.subtitles[0] : null;

        if (hasMultipleQualities) {
            this.log(`Found ${parsedStreams.streams.length} quality options`, 'info');
            parsedStreams.streams.forEach((stream, index) => {
                this.log(`Quality ${index + 1}: ${stream.quality || 'auto'} - ${stream.url}`, 'info');
            });
            
            // Show quality selection interface
            this.displayQualitySelection(parsedStreams, selectedSubtitle);
            return;
        }

        // Single quality - proceed directly
        const selectedStream = this.selectBestQuality(parsedStreams.streams);
        await this.loadSelectedStream(selectedStream, selectedSubtitle);
    }

    displayQualitySelection(parsedStreams, selectedSubtitle) {
        // Sort streams by quality (best first)
        const sortedStreams = this.sortStreamsByQuality(parsedStreams.streams);
        
        // Create quality selection UI
        let qualityOptionsHTML = '';
        sortedStreams.forEach((stream, index) => {
            const qualityLabel = this.getQualityLabel(stream.quality);
            const isRecommended = index === 0; // First (highest) quality is recommended
            
            qualityOptionsHTML += `
                <div class="quality-option" data-stream-index="${parsedStreams.streams.indexOf(stream)}">
                    <div class="quality-info">
                        <strong>${qualityLabel}</strong>
                        ${isRecommended ? '<span class="recommended-badge">Recommended</span>' : ''}
                        <div class="quality-details">
                            <small>${stream.type || 'auto'} • ${this.formatStreamSize(stream)}</small>
                        </div>
                    </div>
                    <button class="select-quality-btn">Select</button>
                </div>
            `;
        });

        this.elements.streamDiv.innerHTML = `
            <h3>Stream Player</h3>
            <div class="quality-selection-container">
                <h4>📺 Select Video Quality</h4>
                <p>Multiple quality options are available. Choose your preferred quality:</p>
                <div class="quality-options">
                    ${qualityOptionsHTML}
                </div>
                <div class="quality-auto-section">
                    <button id="auto-select-quality" class="auto-quality-btn">
                        🚀 Auto-Select Best Quality
                    </button>
                </div>
            </div>
            ${selectedSubtitle ? `<p><strong>Subtitles:</strong> ${selectedSubtitle.label} (${selectedSubtitle.language})</p>` : ''}
        `;

        // Add event listeners for quality selection
        const qualityOptions = this.elements.streamDiv.querySelectorAll('.quality-option');
        qualityOptions.forEach((option) => {
            const selectBtn = option.querySelector('.select-quality-btn');
            const streamIndex = parseInt(option.dataset.streamIndex);
            
            selectBtn.addEventListener('click', async () => {
                this.log(`User selected quality: ${this.getQualityLabel(parsedStreams.streams[streamIndex].quality)}`, 'info');
                await this.loadSelectedStream(parsedStreams.streams[streamIndex], selectedSubtitle);
            });
            
            // Also make the whole option clickable
            option.addEventListener('click', (e) => {
                if (e.target === selectBtn) return; // Don't double-trigger
                selectBtn.click();
            });
        });

        // Auto-select button
        const autoSelectBtn = this.elements.streamDiv.querySelector('#auto-select-quality');
        autoSelectBtn.addEventListener('click', async () => {
            const bestStream = this.selectBestQuality(parsedStreams.streams);
            this.log(`Auto-selected best quality: ${this.getQualityLabel(bestStream.quality)}`, 'info');
            await this.loadSelectedStream(bestStream, selectedSubtitle);
        });
    }

    sortStreamsByQuality(streams) {
        // Quality priority order (higher numbers = better quality)
        const qualityPriority = {
            '4k': 1000, '2160p': 1000, '2160': 1000,
            '1440p': 800, '1440': 800, 'qhd': 800,
            '1080p': 600, '1080': 600, 'fhd': 600, 'fullhd': 600,
            '720p': 400, '720': 400, 'hd': 400,
            '480p': 200, '480': 200, 'sd': 200,
            '360p': 100, '360': 100,
            '240p': 50, '240': 50,
            'auto': 999, // Auto is usually the best available
            'high': 700, 'medium': 300, 'low': 150
        };

        return [...streams].sort((a, b) => {
            const aQuality = (a.quality || 'auto').toLowerCase();
            const bQuality = (b.quality || 'auto').toLowerCase();
            
            const aPriority = qualityPriority[aQuality] || 0;
            const bPriority = qualityPriority[bQuality] || 0;
            
            return bPriority - aPriority; // Descending order (best first)
        });
    }

    selectBestQuality(streams) {
        // Return the highest quality stream
        const sortedStreams = this.sortStreamsByQuality(streams);
        return sortedStreams[0];
    }

    getQualityLabel(quality) {
        if (!quality || quality === 'auto') return 'Auto Quality';
        
        const qualityStr = quality.toString().toLowerCase();
        
        // Common quality mappings
        const qualityLabels = {
            '4k': '4K Ultra HD (2160p)',
            '2160p': '4K Ultra HD (2160p)',
            '2160': '4K Ultra HD (2160p)',
            '1440p': 'QHD (1440p)',
            '1440': 'QHD (1440p)',
            'qhd': 'QHD (1440p)',
            '1080p': 'Full HD (1080p)',
            '1080': 'Full HD (1080p)',
            'fhd': 'Full HD (1080p)',
            'fullhd': 'Full HD (1080p)',
            '720p': 'HD (720p)',
            '720': 'HD (720p)',
            'hd': 'HD (720p)',
            '480p': 'SD (480p)',
            '480': 'SD (480p)',
            'sd': 'SD (480p)',
            '360p': 'Low (360p)',
            '360': 'Low (360p)',
            '240p': 'Very Low (240p)',
            '240': 'Very Low (240p)',
            'high': 'High Quality',
            'medium': 'Medium Quality',
            'low': 'Low Quality'
        };

        return qualityLabels[qualityStr] || `${quality} Quality`;
    }

    formatStreamSize(stream) {
        // Estimate stream info if available
        if (stream.size) return `~${stream.size}`;
        if (stream.bitrate) return `${stream.bitrate} kbps`;
        return 'Size unknown';
    }

    async loadSelectedStream(selectedStream, selectedSubtitle) {
        this.log(`Loading selected stream: ${selectedStream.url}`, 'info');
        
        // Create a meaningful title from quality info
        const qualityLabel = this.getQualityLabel(selectedStream.quality);
        const title = qualityLabel !== 'Auto Quality' ? `Video (${qualityLabel})` : 'Video Content';
        
        if (selectedStream.quality !== 'auto') {
            this.log(`Selected quality: ${qualityLabel}`, 'info');
        }
        if (Object.keys(selectedStream.headers).length > 0) {
            this.log(`Stream has custom headers: ${Object.keys(selectedStream.headers).join(', ')}`, 'info');
        }
        if (selectedSubtitle) {
            this.log(`Using subtitle: ${selectedSubtitle.url} (${selectedSubtitle.language})`, 'info');
        }

        try {
            // Use the new Plyr-based displayStream method
            await this.displayStream(
                selectedStream.url,
                selectedSubtitle?.url,
                title,
                selectedStream.headers || {}
            );

        } catch (error) {
            this.log(`Enhanced stream loading error: ${error.message}`, 'error');
            this.showPlayerError(`Failed to load ${qualityLabel}: ${error.message}`, selectedStream.url);
        }
    }

    async loadHLSStreamWithHeaders(streamData, subtitleData) {
        try {
            this.log('Loading HLS stream with enhanced headers', 'info');
            
            // Merge custom headers with default headers
            const enhancedHeaders = { ...this.getStreamHeaders(streamData.url), ...streamData.headers };
            
            // Set video attributes for better compatibility
            this.elements.videoPlayer.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
            this.elements.videoPlayer.setAttribute('crossorigin', 'anonymous');
            
            // Log custom headers if present
            if (Object.keys(streamData.headers).length > 0) {
                this.log(`Applying custom stream headers: ${Object.keys(streamData.headers).join(', ')}`, 'info');
            }

            // Load subtitles with enhanced headers if available
            if (subtitleData) {
                try {
                    const subsHeaders = { ...this.getStreamHeaders(subtitleData.url), ...subtitleData.headers };
                    const subsResponse = await fetch(subtitleData.url, {
                        method: 'GET',
                        headers: subsHeaders,
                        mode: 'cors'
                    });

                    if (subsResponse.ok) {
                        const subsBlob = await subsResponse.blob();
                        const subsBlobUrl = URL.createObjectURL(subsBlob);
                        
                        const track = document.createElement('track');
                        track.kind = 'subtitles';
                        track.label = subtitleData.label;
                        track.srclang = subtitleData.language;
                        track.src = subsBlobUrl;
                        track.default = true;
                        this.elements.videoPlayer.appendChild(track);
                        
                        this.log(`Subtitles loaded: ${subtitleData.label} (${subtitleData.language})`, 'success');
                    }
                } catch (subsError) {
                    this.log(`Enhanced subtitles loading failed: ${subsError.message}`, 'warning');
                }
            }

            // Set HLS stream directly (browser handles segments automatically)
            this.elements.videoPlayer.src = streamData.url;
            this.elements.videoPlayer.style.display = 'block';
            this.elements.streamDiv.appendChild(this.elements.videoPlayer);
            
            this.log('Enhanced HLS stream loaded - browser will use custom headers for segments', 'success');

            // Remove loading message
            const loadingDiv = this.elements.streamDiv.querySelector('.stream-loading');
            if (loadingDiv) loadingDiv.remove();

        } catch (error) {
            this.log(`Enhanced HLS stream loading error: ${error.message}`, 'error');
            throw error;
        }
    }

    loadDirectStreamWithHeaders(streamData, subtitleData) {
        this.log('Loading stream directly with enhanced headers', 'info');
        
        // Set attributes for better compatibility
        this.elements.videoPlayer.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
        this.elements.videoPlayer.setAttribute('crossorigin', 'anonymous');
        
        // Log custom headers if present
        if (Object.keys(streamData.headers).length > 0) {
            this.log(`Stream has custom headers: ${Object.keys(streamData.headers).join(', ')}`, 'info');
        }
        
        // Load subtitles via direct URL with enhanced info
        if (subtitleData) {
            const track = document.createElement('track');
            track.kind = 'subtitles';
            track.label = subtitleData.label;
            track.srclang = subtitleData.language;
            track.src = subtitleData.url;
            track.default = true;
            this.elements.videoPlayer.appendChild(track);
            this.log(`Subtitles added: ${subtitleData.label} (${subtitleData.language})`, 'info');
        }

        // Set stream directly
        this.elements.videoPlayer.src = streamData.url;
        this.elements.videoPlayer.style.display = 'block';
        this.elements.streamDiv.appendChild(this.elements.videoPlayer);
        
        this.log('Enhanced stream set on video element', 'success');

        // Remove loading message
        const loadingDiv = this.elements.streamDiv.querySelector('.stream-loading');
        if (loadingDiv) loadingDiv.remove();
    }

    async loadDirectVideoWithHeaders(streamData, subtitleData) {
        try {
            // Merge custom headers with default headers
            const enhancedHeaders = { ...this.getStreamHeaders(streamData.url), ...streamData.headers };
            this.log(`Loading direct video with enhanced headers: ${Object.keys(enhancedHeaders).join(', ')}`, 'info');
            
            const videoResponse = await fetch(streamData.url, {
                method: 'GET',
                headers: enhancedHeaders,
                mode: 'cors'
            });

            if (!videoResponse.ok) {
                throw new Error(`HTTP ${videoResponse.status}: ${videoResponse.statusText}`);
            }

            // Create blob URL for the video
            const videoBlob = await videoResponse.blob();
            const blobUrl = URL.createObjectURL(videoBlob);
            
            this.log('Direct video loaded with enhanced headers', 'success');

            // Handle subtitles with enhanced headers
            if (subtitleData) {
                try {
                    const subsHeaders = { ...this.getStreamHeaders(subtitleData.url), ...subtitleData.headers };
                    const subsResponse = await fetch(subtitleData.url, {
                        method: 'GET',
                        headers: subsHeaders,
                        mode: 'cors'
                    });

                    if (subsResponse.ok) {
                        const subsBlob = await subsResponse.blob();
                        const subsBlobUrl = URL.createObjectURL(subsBlob);
                        
                        const track = document.createElement('track');
                        track.kind = 'subtitles';
                        track.label = subtitleData.label;
                        track.srclang = subtitleData.language;
                        track.src = subsBlobUrl;
                        track.default = true;
                        this.elements.videoPlayer.appendChild(track);
                        
                        this.log(`Enhanced subtitles loaded: ${subtitleData.label}`, 'success');
                    }
                } catch (subsError) {
                    this.log(`Enhanced subtitles loading failed: ${subsError.message}`, 'warning');
                }
            }

            // Set video source to blob URL
            this.elements.videoPlayer.src = blobUrl;
            this.elements.videoPlayer.style.display = 'block';
            this.elements.streamDiv.appendChild(this.elements.videoPlayer);

            // Clean up blob URL when video ends or errors
            const cleanup = () => {
                URL.revokeObjectURL(blobUrl);
                if (subtitleData) {
                    const tracks = this.elements.videoPlayer.querySelectorAll('track');
                    tracks.forEach(track => {
                        if (track.src.startsWith('blob:')) {
                            URL.revokeObjectURL(track.src);
                        }
                    });
                }
            };
            
            this.elements.videoPlayer.addEventListener('ended', cleanup, { once: true });
            this.elements.videoPlayer.addEventListener('error', cleanup, { once: true });

            // Remove loading message
            const loadingDiv = this.elements.streamDiv.querySelector('.stream-loading');
            if (loadingDiv) loadingDiv.remove();

        } catch (error) {
            this.log(`Enhanced direct video loading error: ${error.message}`, 'error');
            throw error;
        }
    }

    async displayStreamWithHeaderAttributes(streamUrl, subsUrl) {
        try {
            this.log('Final fallback: Attempting video with header validation', 'warning');
            
            // First, try to validate the stream with proper headers
            const headers = this.getStreamHeaders(streamUrl);
            this.log(`Validating stream access with headers: ${Object.keys(headers).join(', ')}`, 'info');
            
            // Test the stream URL with headers first
            const testResponse = await fetch(streamUrl, {
                method: 'HEAD', // Just check headers, don't download
                headers: headers,
                mode: 'cors'
            });

            if (!testResponse.ok) {
                throw new Error(`Stream validation failed: HTTP ${testResponse.status}`);
            }

            this.log('Stream validation successful - applying best-effort headers', 'success');

            // Create a new video element with enhanced attributes
            const videoElement = document.createElement('video');
            videoElement.controls = true;
            videoElement.style.width = '100%';
            videoElement.style.maxWidth = '800px';
            
            // Apply all possible header-related attributes
            videoElement.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
            videoElement.setAttribute('crossorigin', 'anonymous');
            
            // Set custom headers via a meta tag approach (limited effectiveness but worth trying)
            const refererUrl = headers['Referer'] || 'https://oppai.stream/';
            const metaReferer = document.createElement('meta');
            metaReferer.name = 'referrer';
            metaReferer.content = 'strict-origin-when-cross-origin';
            document.head.appendChild(metaReferer);

            // Clear old video
            this.elements.videoPlayer.style.display = 'none';
            this.elements.videoPlayer.src = '';

            // Add subtitles if available
            if (subsUrl) {
                const track = document.createElement('track');
                track.kind = 'subtitles';
                track.label = 'English';
                track.srclang = 'en';
                track.src = subsUrl;
                track.default = true;
                videoElement.appendChild(track);
                this.log('Subtitles added to fallback video', 'info');
            }

            // Set the source
            videoElement.src = streamUrl;
            
            // Update the stream container
            this.elements.streamDiv.innerHTML = `
                <h3>Stream Player</h3>
                <p><strong>Note:</strong> Using fallback loading method with header validation</p>
                <p>Stream URL: <a href="${streamUrl}" target="_blank">${streamUrl}</a></p>
                <p>Validated with Referer: ${refererUrl}</p>
            `;
            
            this.elements.streamDiv.appendChild(videoElement);
            
            // Monitor for errors
            videoElement.addEventListener('error', (e) => {
                this.log(`Fallback video error: ${e.message || 'Unknown error'}`, 'error');
                this.elements.streamDiv.innerHTML += `
                    <div class="error-container">
                        <p><strong>Video Load Error:</strong> The stream may require specific headers that cannot be applied in fallback mode.</p>
                        <p><strong>Try:</strong> <a href="${streamUrl}" target="_blank">Open stream directly</a> in a new tab</p>
                    </div>
                `;
            });

            videoElement.addEventListener('loadstart', () => {
                this.log('Fallback video loading started', 'info');
            });

            this.log('Fallback video setup complete', 'success');

            // Remove loading message
            const loadingDiv = this.elements.streamDiv.querySelector('.stream-loading');
            if (loadingDiv) loadingDiv.remove();

        } catch (error) {
            this.log(`Final fallback error: ${error.message}`, 'error');
            
            // Absolute last resort - direct link
            this.elements.streamDiv.innerHTML = `
                <h3>Stream Player</h3>
                <div class="error-container">
                    <p><strong>All loading methods failed.</strong></p>
                    <p>The stream requires specific headers that cannot be applied.</p>
                    <p><strong>Direct link:</strong> <a href="${streamUrl}" target="_blank">Open in new tab</a></p>
                    <p><strong>Error:</strong> ${error.message}</p>
                </div>
            `;
        }
    }

    cancelPendingRequests() {
        if (this.worker) {
            this.worker.postMessage({ type: 'CANCEL' });
        }
        this.pendingRequests.clear();
    }

    resetSearchUI() {
        this.elements.searchBtn.disabled = false;
        this.elements.searchBtn.textContent = 'Search';
    }

    resetUI(clearSearchResults = true) {
        if (clearSearchResults) {
            this.elements.searchResultsDiv.innerHTML = '';
            this.currentResults = [];
            this.currentPage = 0;
        }
        this.elements.detailsDiv.innerHTML = '<h3>Details</h3><p><i>Click a search result to see details.</i></p>';
        this.elements.episodesDiv.innerHTML = '<i>...</i>';
        
        // ⚠️ CRITICAL FIX: DO NOT clear streamDiv innerHTML as it destroys player elements!
        // Instead, reset player state while preserving elements
        this.log('🔧 RESET UI - preserving player elements', 'info');
        if (this.elements.plyrWrapper) {
            this.elements.plyrWrapper.style.display = 'none';
        }
        if (this.elements.playerInfo) {
            this.elements.playerInfo.style.display = 'none';
        }
        if (this.elements.playerPlaceholder) {
            this.elements.playerPlaceholder.style.display = 'block';
            this.elements.playerPlaceholder.innerHTML = `
                <div class="placeholder-icon">🎥</div>
                <div class="placeholder-title">Ready to Stream</div>
                <div class="placeholder-desc">Select an episode from the browse section to start streaming</div>
            `;
        }
        
        this.elements.videoPlayer.style.display = 'none';
        this.elements.videoPlayer.src = '';
        
        // Clear any existing loading states
        const loadingElements = document.querySelectorAll('[data-loading]');
        loadingElements.forEach(el => el.remove());
    }

    createLoadingHTML(message, withProgress = false) {
        let progressHTML = '';
        if (withProgress) {
            progressHTML = `
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
            `;
        }
        
        return `
            <div data-loading class="loading-container">
                <div class="loading-message">${message}</div>
                ${progressHTML}
            </div>
        `;
    }

    createErrorHTML(message) {
        return `
            <div class="error-container">
                <i>${message}</i>
            </div>
        `;
    }

    log(message, type = 'info') {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        this.elements.logOutput.appendChild(entry);
        this.elements.logOutput.scrollTop = this.elements.logOutput.scrollHeight;
        
        // Update performance stats
        this.updateStats();
    }

    // Netflix-style interface management
    showSection(sectionName) {
        this.log(`Attempting to show section: ${sectionName}`, 'info');
        
        // Hide all sections
        const sections = document.querySelectorAll('.content-section');
        this.log(`Found ${sections.length} content sections`, 'info');
        sections.forEach(section => {
            section.classList.remove('active');
            this.log(`Removed active from: ${section.id}`, 'info');
        });
        
        // Show target section
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
            this.log(`Added active to: ${targetSection.id}`, 'success');
        } else {
            this.log(`ERROR: Could not find section with ID: ${sectionName}-section`, 'error');
        }
        
        // Update navigation
        this.updateNavigation(sectionName);
        
        // Hide hero if not home
        const heroSection = document.getElementById('hero-section');
        if (heroSection) {
            heroSection.style.display = sectionName === 'home' ? 'flex' : 'none';
        }
        
        // Show episodes section when in search mode
        const episodesSection = document.querySelector('.episodes-section');
        if (episodesSection) {
            episodesSection.style.display = sectionName === 'search' ? 'block' : 'none';
        }
        
        this.log(`Navigation to ${sectionName} completed`, 'success');
    }

    updateNavigation(activeSection) {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.section === activeSection) {
                item.classList.add('active');
            }
        });
    }

    togglePerformancePanel() {
        const sidebar = document.getElementById('performance-sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        
        if (sidebar && overlay) {
            const isActive = sidebar.classList.contains('active');
            
            if (isActive) {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
                this.log('Performance panel closed', 'info');
            } else {
                sidebar.classList.add('active');
                overlay.classList.add('active');
                this.log('Performance panel opened', 'info');
            }
        }
    }

    updateStats() {
        // Update modules count
        const modulesCount = document.getElementById('modules-count');
        if (modulesCount && typeof moduleManager !== 'undefined') {
            const modules = moduleManager.getAllModules();
            modulesCount.textContent = modules.length;
        }
        
        // Update search count (estimate from log entries)
        const searchCount = document.getElementById('search-count');
        if (searchCount) {
            const searchLogs = document.querySelectorAll('.log-entry:not(.error):not(.warning)');
            const searches = Array.from(searchLogs).filter(log => 
                log.textContent.includes('Search') || log.textContent.includes('results')
            );
            searchCount.textContent = Math.floor(searches.length / 2); // Rough estimate
        }
        
        // Update performance score (based on error rate)
        const performanceScore = document.getElementById('performance-score');
        if (performanceScore) {
            const totalLogs = document.querySelectorAll('.log-entry').length;
            const errorLogs = document.querySelectorAll('.log-entry.error').length;
            const score = totalLogs > 0 ? Math.max(0, 100 - Math.round((errorLogs / totalLogs) * 100)) : 100;
            performanceScore.textContent = score;
        }
    }

    initializeNavigationHandlers() {
        // Navigation items (header menu)
        const navItems = document.querySelectorAll('.nav-item');
        this.log(`Found ${navItems.length} navigation items in header`, 'info');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const section = item.dataset.section;
                this.log(`Header nav clicked: ${section}`, 'info');
                if (section) {
                    this.showSection(section);
                }
            });
        });
        
        // Event delegation for navigation buttons and action cards
        document.addEventListener('click', (e) => {
            // Handle navigation buttons (hero buttons, action cards)
            const navigateTarget = e.target.closest('[data-navigate]');
            if (navigateTarget) {
                e.preventDefault();
                e.stopPropagation();
                const section = navigateTarget.dataset.navigate;
                if (section) {
                    this.log(`Click detected on element with data-navigate="${section}"`, 'info');
                    this.showSection(section);
                }
                return;
            }
            
            // Handle special actions
            const actionTarget = e.target.closest('[data-action]');
            if (actionTarget) {
                e.preventDefault();
                e.stopPropagation();
                const action = actionTarget.dataset.action;
                if (action === 'performance') {
                    this.togglePerformancePanel();
                    this.log('Performance panel toggled via action card', 'info');
                }
                return;
            }
        });
        
        // Test that all sections exist
        const expectedSections = ['home', 'modules', 'search', 'player'];
        expectedSections.forEach(sectionName => {
            const section = document.getElementById(`${sectionName}-section`);
            if (section) {
                this.log(`✓ Found section: ${sectionName}-section`, 'success');
            } else {
                this.log(`✗ Missing section: ${sectionName}-section`, 'error');
            }
        });
        
        // Initial navigation setup
        this.showSection('home');
        
        // Connection status
        this.updateConnectionStatus();
        
        this.log('Netflix-style navigation initialized with event delegation', 'success');
    }

    updateConnectionStatus() {
        const statusDot = document.getElementById('connection-status');
        const statusText = document.querySelector('.status-text');
        
        if (statusDot && statusText) {
            if (this.moduleConfig && Object.keys(this.moduleConfig).length > 0) {
                statusDot.style.background = 'var(--accent-green)';
                statusText.textContent = 'Connected';
            } else {
                statusDot.style.background = 'var(--accent-yellow)';
                statusText.textContent = 'No Module';
            }
        }
    }

    // Enhanced module management with UI updates
    async importModuleEnhanced() {
        try {
            await this.importModule();
            this.updateConnectionStatus();
            this.updateStats();
        } catch (error) {
            this.log(`Enhanced import failed: ${error.message}`, 'error');
        }
    }

    // Override existing selectModule to add UI updates
    selectModuleEnhanced(moduleId) {
        try {
            this.selectModule(moduleId);
            this.updateConnectionStatus();
            this.updateStats();
            
            // Show search section if module is loaded successfully
            if (this.moduleConfig && Object.keys(this.moduleConfig).length > 0) {
                setTimeout(() => {
                    this.showSection('search');
                }, 1000);
            }
        } catch (error) {
            this.log(`Enhanced module selection failed: ${error.message}`, 'error');
        }
    }

    // Enhanced search with UI updates
    async performSearchEnhanced() {
        try {
            // Show player section after successful search
            await this.performSearch();
            
            // If we have results, briefly show them then go to search section
            if (this.currentResults && this.currentResults.length > 0) {
                this.log(`Found ${this.currentResults.length} results`, 'success');
            }
        } catch (error) {
            this.log(`Enhanced search failed: ${error.message}`, 'error');
        }
    }

    // Enhanced episode handling with navigation
    async handleEpisodeClickEnhanced(url) {
        try {
            this.log(`=== ENHANCED EPISODE CLICK START ===`, 'info');
            this.log(`Enhanced episode click: ${url}`, 'info');
            this.log(`User functions status: ${!!this.userFunctions}`, 'info');
            
            // DEBUG: Check element state BEFORE episode processing
            this.log('=== ELEMENTS STATE BEFORE EPISODE LOADING ===', 'info');
            this.log(`Plyr wrapper exists: ${!!this.elements.plyrWrapper}`, 'info');
            this.log(`Video player exists: ${!!this.elements.videoPlayer}`, 'info');
            this.log(`Plyr instance exists: ${!!this.player}`, 'info');
            if (this.elements.plyrWrapper) {
                const wrapperStyle = window.getComputedStyle(this.elements.plyrWrapper);
                this.log(`Plyr wrapper display BEFORE: ${wrapperStyle.display}`, 'info');
                this.log(`Plyr wrapper visibility BEFORE: ${wrapperStyle.visibility}`, 'info');
            }
            
            // Always navigate to player section first
            this.showSection('player');
            
            // Use enhanced playback method directly if user functions are loaded
            if (this.userFunctions && this.userFunctions.extractStreamUrl) {
                this.log(`Using enhanced playback method with loaded modules`, 'info');
                await this.playEpisodeEnhanced(url);
            } else {
                this.log(`No modules loaded - using fallback method`, 'warning');
                this.log(`Available user functions: ${this.userFunctions ? Object.keys(this.userFunctions) : 'none'}`, 'info');
                await this.handleEpisodeClick(url);
            }
            
            // DEBUG: Check element state AFTER episode processing
            this.log('=== ELEMENTS STATE AFTER EPISODE LOADING ===', 'info');
            this.log(`Plyr wrapper exists: ${!!this.elements.plyrWrapper}`, 'info');
            this.log(`Video player exists: ${!!this.elements.videoPlayer}`, 'info');
            this.log(`Plyr instance exists: ${!!this.player}`, 'info');
            if (this.elements.plyrWrapper) {
                const wrapperStyle = window.getComputedStyle(this.elements.plyrWrapper);
                this.log(`Plyr wrapper display AFTER: ${wrapperStyle.display}`, 'info');
                this.log(`Plyr wrapper visibility AFTER: ${wrapperStyle.visibility}`, 'info');
            } else {
                this.log('❌ PLYR WRAPPER LOST DURING EPISODE LOADING!', 'error');
                // Try to recover the wrapper
                const foundWrapper = document.getElementById('plyr-wrapper');
                if (foundWrapper) {
                    this.log('🔧 Recovering plyr-wrapper reference', 'info');
                    this.elements.plyrWrapper = foundWrapper;
                    // Force it visible immediately
                    foundWrapper.style.cssText = 'display: block !important; visibility: visible !important;';
                } else {
                    this.log('❌ plyr-wrapper element completely missing from DOM!', 'error');
                }
            }
            
            // Auto-force visible after episode loading
            this.log('🚀 Auto-forcing player visible after episode load...', 'info');
            setTimeout(() => {
                this.forcePlayerVisible();
            }, 100);
            
            this.log(`=== ENHANCED EPISODE CLICK END ===`, 'info');
        } catch (error) {
            this.log(`Enhanced episode handling failed: ${error.message}`, 'error');
            console.error('Full error:', error);
            // Show error in player section
            this.showPlayerError(`Episode loading failed: ${error.message}`);
        }
    }

    async detectCorsExtension() {
        try {
            this.log('Checking CORS configuration...', 'info');
            
            // Check if user has configured a CORS proxy
            const corsProxy = localStorage.getItem("corsProxy");
            if (corsProxy) {
                this.log(`Using CORS proxy: ${corsProxy}`, 'success');
                this.corsExtensionDetected = true;
                this.showCorsStatus(true);
                return;
            }
            
            // Test 1: Try direct request to detect CORS extension
            let corsDetected = false;
            
            try {
                const testUrl = 'https://httpbin.org/headers';
                const testHeaders = {
                    'X-CORS-Test': 'extension-detection',
                    'X-Custom-Referer': 'test-domain.com'
                };
                
                const testResponse = await this.soraFetch(testUrl, {
                    method: 'GET',
                    headers: testHeaders
                });
                
                const responseData = JSON.parse(testResponse);
                if (responseData.headers && (
                    responseData.headers['X-CORS-Test'] ||
                    responseData.headers['x-cors-test'] ||
                    responseData.headers['X-Custom-Referer'] ||
                    responseData.headers['x-custom-referer']
                )) {
                    corsDetected = true;
                    this.log('Custom headers found in response - CORS extension active', 'success');
                }
            } catch (corsError) {
                this.log(`CORS test failed: ${corsError.message}`, 'info');
                // Check if it's a CORS-specific error
                if (corsError.message.includes('CORS') || corsError.message.includes('blocked')) {
                    this.log('CORS blocking detected - extension needed or proxy required', 'warning');
                }
            }
            
            // Update status based on detection results
            this.corsExtensionDetected = corsDetected;
            if (corsDetected) {
                this.log('✅ CORS extension detected and working!', 'success');
                this.showCorsStatus(true);
            } else {
                this.log('⚠️ CORS extension not detected - proxy may be needed', 'warning');
                this.showCorsStatus(false);
            }
            
        } catch (error) {
            this.log(`CORS detection failed: ${error.message}`, 'warning');
            this.corsExtensionDetected = false;
            this.showCorsStatus(false);
        }
    }

    // Sora-compatible fetch function with CORS proxy support
    soraFetch(url, options = {}) {
        return new Promise((resolve, reject) => {
            // Get CORS proxy configuration from localStorage (Sora WebUI pattern)
            let corsProxy = localStorage.getItem("corsProxy") || "";
            
            const xhr = new XMLHttpRequest();
            const method = options.method || "GET";
            
            // Set response type for binary data (video/audio files)
            if (options.responseType) {
                xhr.responseType = options.responseType;
            } else if (url.match(/\.(mp4|webm|m4v|mov|avi|mkv|mp3|m4a|ogg)$/i)) {
                xhr.responseType = 'arraybuffer';
            }
            
            // Clean up proxy URL patterns like in working Sora implementation
            if (url.startsWith("https://cloudflare-cors-anywhere.jmcrafter26.workers.dev/?")) {
                url = url.replace("https://cloudflare-cors-anywhere.jmcrafter26.workers.dev/?", "");
            }
            
            // Apply CORS proxy if configured
            const finalUrl = corsProxy + url;
            xhr.open(method, finalUrl, true);
            
            this.log(`CORS Fetch: ${method} ${finalUrl}`, 'info');
            this.log(`Headers to apply: ${options.headers ? Object.keys(options.headers).join(', ') : 'none'}`, 'info');
            
            // Apply headers if provided - these are the module's headers including baseUrl referer
            if (options.headers && typeof options.headers === 'object') {
                Object.keys(options.headers).forEach(key => {
                    try {
                        // Special handling for critical headers
                        if (key.toLowerCase() === 'referer') {
                            this.log(`Setting Referer header to: ${options.headers[key]}`, 'info');
                        }
                        xhr.setRequestHeader(key, options.headers[key]);
                    } catch (error) {
                        this.log(`Failed to set header ${key}: ${error.message}`, 'warning');
                    }
                });
            }
            
            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    this.log(`CORS Response Status: ${xhr.status}`, 'info');
                    // Return appropriate response based on response type
                    if (xhr.responseType === 'arraybuffer') {
                        this.log('Returning binary response (arraybuffer)', 'info');
                        resolve(xhr.response);
                    } else {
                        resolve(xhr.responseText);
                    }
                } else {
                    this.log(`CORS Error: ${xhr.status} ${xhr.statusText}`, 'error');
                    if (xhr.status === 0) {
                        this.showCorsDialog();
                        reject("CORS Error: The request was blocked");
                    } else {
                        reject(`HTTP ${xhr.status}: ${this.getStatusMessage(xhr.status)}`);
                    }
                }
            };
            
            xhr.onerror = () => {
                this.log(`CORS Network Error: ${xhr.status} ${xhr.statusText}`, 'error');
                if (xhr.status === 0) {
                    this.showCorsDialog();
                    reject("CORS Error: The request was blocked");
                } else {
                    reject(xhr.statusText || "Network error");
                }
            };
            
            // Send request with body for POST/PUT
            if (method === "POST" && options.body) {
                this.log("POST requests are currently limited in CORS mode", 'warning');
                xhr.send(options.body);
            } else {
                xhr.send();
            }
        });
    }

    getStatusMessage(status) {
        const statusCodes = {
            0: "The request was blocked",
            400: "Bad Request",
            401: "Unauthorized", 
            403: "Forbidden",
            404: "Not Found",
            405: "Method Not Allowed",
            408: "Request Timeout",
            429: "Too Many Requests",
            500: "Internal Server Error",
            502: "Bad Gateway", 
            503: "Service Unavailable",
            504: "Gateway Timeout"
        };
        return statusCodes[status] || "Unknown Error";
    }

    showMessage(title, type = "info", message = "") {
        // Create or update message display
        let messageDiv = document.getElementById('cors-message');
        if (!messageDiv) {
            messageDiv = document.createElement('div');
            messageDiv.id = 'cors-message';
            messageDiv.style.cssText = `
                position: fixed;
                top: 120px;
                right: 10px;
                max-width: 300px;
                padding: 12px;
                border-radius: 8px;
                font-size: 0.9rem;
                z-index: 10000;
                transition: all 0.3s ease;
                backdrop-filter: blur(10px);
                cursor: pointer;
                word-wrap: break-word;
            `;
            document.body.appendChild(messageDiv);
        }

        // Set background color based on type
        let backgroundColor;
        switch(type) {
            case 'success': backgroundColor = 'rgba(0, 255, 0, 0.15)'; break;
            case 'error': backgroundColor = 'rgba(255, 0, 0, 0.15)'; break;
            case 'warning': backgroundColor = 'rgba(255, 165, 0, 0.15)'; break;
            default: backgroundColor = 'rgba(0, 123, 255, 0.15)'; break;
        }

        messageDiv.style.backgroundColor = backgroundColor;
        messageDiv.innerHTML = `<strong>${title}</strong><br>${message}`;
        
        // Auto-hide after delay
        const timeout = Math.max(5000, message.length * 50);
        setTimeout(() => {
            if (messageDiv && messageDiv.parentNode) {
                messageDiv.style.opacity = '0';
                setTimeout(() => {
                    if (messageDiv && messageDiv.parentNode) {
                        messageDiv.parentNode.removeChild(messageDiv);
                    }
                }, 300);
            }
        }, timeout);

        // Click to dismiss
        messageDiv.onclick = () => {
            if (messageDiv && messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        };
    }

    showCorsDialog() {
        // Show a more user-friendly CORS configuration dialog
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 20000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
            background: linear-gradient(135deg, #1a1a1a, #2d2d2d);
            padding: 2rem;
            border-radius: 12px;
            max-width: 600px;
            margin: 2rem;
            color: #ffffff;
            border: 1px solid var(--netflix-red);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        `;

        modal.innerHTML = `
            <h3 style="margin: 0 0 1rem 0; color: var(--netflix-red);">🚫 CORS Configuration Required</h3>
            <p style="margin: 0 0 1rem 0; line-height: 1.5;">To access streaming content, you need to configure CORS handling. Choose one option:</p>
            
            <div style="margin: 1rem 0; padding: 1rem; background: rgba(0, 123, 255, 0.1); border-radius: 8px; border-left: 3px solid #007bff;">
                <h4 style="margin: 0 0 0.5rem 0; color: #007bff;">🔗 Option 1: Use CORS Proxy (Recommended)</h4>
                <p style="margin: 0.5rem 0; font-size: 0.9rem;">Use a proxy server to bypass CORS restrictions:</p>
                <button id="setup-proxy" style="margin: 0.5rem 0; padding: 0.5rem 1rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Setup Proxy</button>
            </div>
            
            <div style="margin: 1rem 0; padding: 1rem; background: rgba(229, 9, 20, 0.1); border-radius: 8px; border-left: 3px solid var(--netflix-red);">
                <h4 style="margin: 0 0 0.5rem 0; color: var(--netflix-red);">🔧 Option 2: Browser Extension</h4>
                <p style="margin: 0.5rem 0; font-size: 0.9rem;">Install a CORS extension:</p>
                <ul style="margin: 0.5rem 0; padding-left: 1.5rem; font-size: 0.9rem;">
                    <li><strong>Chrome:</strong> "Cross Domain - CORS" or "CORS Unblock"</li>
                    <li><strong>Firefox:</strong> "CORS Everywhere"</li>
                </ul>
                <button id="retest-cors" style="margin: 0.5rem 0; padding: 0.5rem 1rem; background: var(--netflix-red); color: white; border: none; border-radius: 4px; cursor: pointer;">I Installed Extension</button>
            </div>
            
            <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                <button id="close-cors-dialog" style="flex: 1; padding: 0.75rem; background: #666; color: white; border: none; border-radius: 6px; cursor: pointer;">Skip For Now</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Event handlers
        document.getElementById('setup-proxy').onclick = () => {
            this.setupProxy();
            document.body.removeChild(overlay);
        };

        document.getElementById('retest-cors').onclick = () => {
            document.body.removeChild(overlay);
            this.detectCorsExtension();
        };

        document.getElementById('close-cors-dialog').onclick = () => {
            document.body.removeChild(overlay);
        };

        overlay.onclick = (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
            }
        };
    }

    showCorsStatus(enabled) {
        // Add a status indicator to the UI
        let statusElement = document.getElementById('cors-status');
        if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.id = 'cors-status';
            statusElement.style.cssText = `
                position: fixed;
                top: 70px;
                right: 10px;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 0.8rem;
                font-weight: bold;
                z-index: 10000;
                transition: all 0.3s ease;
                backdrop-filter: blur(10px);
                cursor: pointer;
            `;
            document.body.appendChild(statusElement);
        }

        // Use enhanced CORS status information
        const corsStatus = this.getEnhancedCorsStatus();
        
        if (corsStatus.enabled) {
            statusElement.innerHTML = `${corsStatus.status} <span style="font-size: 0.7em; opacity: 0.8;">⚙️</span>`;
            
            if (corsStatus.type === 'proxy') {
                statusElement.style.cssText += `
                    background: rgba(0, 191, 255, 0.15);
                    color: #00bfff;
                    border: 1px solid rgba(0, 191, 255, 0.4);
                `;
                statusElement.title = `Enhanced Proxy: ${corsStatus.proxy.substring(0, 30)}... - Click for options`;
            } else {
                statusElement.style.cssText += `
                    background: rgba(0, 255, 0, 0.15);
                    color: #00ff00;
                    border: 1px solid rgba(0, 255, 0, 0.4);
                `;
                statusElement.title = 'CORS extension active - Enhanced streaming enabled';
            }
            
            statusElement.onclick = () => this.showCorsOptions();
        } else {
            statusElement.innerHTML = '🔒 Setup CORS <span style="font-size: 0.7em; opacity: 0.8;">⚠️</span>';
            statusElement.style.cssText += `
                background: rgba(255, 165, 0, 0.15);
                color: #ffa500;
                border: 1px solid rgba(255, 165, 0, 0.4);
            `;
            statusElement.title = 'Click to configure enhanced CORS handling';
            statusElement.onclick = () => this.showCorsDialog();
        }
    }

    showCorsOptions() {
        const corsProxy = localStorage.getItem("corsProxy");
        
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 20000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
            background: linear-gradient(135deg, #1a1a1a, #2d2d2d);
            padding: 2rem;
            border-radius: 12px;
            max-width: 500px;
            margin: 2rem;
            color: #ffffff;
            border: 1px solid var(--netflix-red);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        `;

        modal.innerHTML = `
            <h3 style="margin: 0 0 1rem 0; color: var(--netflix-red);">⚙️ CORS Configuration</h3>
            ${corsProxy ? `
                <div style="margin: 1rem 0; padding: 1rem; background: rgba(0, 255, 0, 0.1); border-radius: 8px;">
                    <h4 style="margin: 0 0 0.5rem 0; color: #00ff00;">Current Proxy:</h4>
                    <p style="font-family: monospace; font-size: 0.8rem; word-break: break-all;">${corsProxy}</p>
                </div>
            ` : `
                <p style="margin: 0 0 1rem 0;">CORS extension detected and active.</p>
            `}
            
            <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1.5rem;">
                <button id="retest-cors-config" style="padding: 0.75rem; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer;">🔄 Retest Configuration</button>
                ${corsProxy ? `
                    <button id="change-proxy" style="padding: 0.75rem; background: #ffa500; color: white; border: none; border-radius: 6px; cursor: pointer;">🔗 Change Proxy</button>
                    <button id="disable-proxy" style="padding: 0.75rem; background: #dc3545; color: white; border: none; border-radius: 6px; cursor: pointer;">❌ Disable Proxy</button>
                ` : `
                    <button id="setup-proxy-option" style="padding: 0.75rem; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer;">🔗 Setup Proxy Instead</button>
                `}
                <button id="close-cors-options" style="padding: 0.75rem; background: #666; color: white; border: none; border-radius: 6px; cursor: pointer;">Close</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Event handlers
        document.getElementById('retest-cors-config').onclick = () => {
            document.body.removeChild(overlay);
            this.detectCorsExtension();
        };

        if (corsProxy) {
            document.getElementById('change-proxy').onclick = () => {
                document.body.removeChild(overlay);
                this.setupProxy();
            };

            document.getElementById('disable-proxy').onclick = () => {
                if (confirm('Disable CORS proxy? You may need a browser extension for streaming to work.')) {
                    document.body.removeChild(overlay);
                    this.disableProxy();
                }
            };
        } else {
            const setupProxyBtn = document.getElementById('setup-proxy-option');
            if (setupProxyBtn) {
                setupProxyBtn.onclick = () => {
                    document.body.removeChild(overlay);
                    this.setupProxy();
                };
            }
        }

        document.getElementById('close-cors-options').onclick = () => {
            document.body.removeChild(overlay);
        };

        overlay.onclick = (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
            }
        };
    }

    setupProxy() {
        const proxy = prompt(
            "Enter a CORS proxy URL:\n\n" +
            "Recommended: https://cloudflare-cors-anywhere.jmcrafter26.workers.dev/?\n" +
            "Or use your own proxy service:",
            "https://cloudflare-cors-anywhere.jmcrafter26.workers.dev/?"
        );
        
        if (proxy) {
            if (proxy === "https://cloudflare-cors-anywhere.jmcrafter26.workers.dev/?" && 
                !confirm("This is a public proxy that may be slow or unreliable. Only use if you don't have another option. Continue?")) {
                return;
            }
            
            localStorage.setItem("corsProxy", proxy);
            this.log(`CORS proxy configured: ${proxy}`, 'success');
            this.showMessage("Proxy Configured", "success", "CORS proxy has been set up successfully!");
            this.detectCorsExtension(); // Re-test with proxy
        }
    }

    disableProxy() {
        localStorage.removeItem("corsProxy");
        this.log("CORS proxy disabled", 'info');
        this.showMessage("Proxy Disabled", "info", "CORS proxy has been removed.");
        this.detectCorsExtension(); // Re-test without proxy
    }

    // Cleanup method
    destroy() {
        this.cancelPendingRequests();
        
        // Clean up Plyr
        if (this.player) {
            try {
                this.player.destroy();
                this.log('Plyr player destroyed', 'info');
            } catch (error) {
                this.log(`Error destroying Plyr: ${error.message}`, 'warning');
            }
            this.player = null;
        }
        
        // Clean up HLS.js
        if (this.hls) {
            try {
                this.hls.destroy();
                this.log('HLS.js instance destroyed', 'info');
            } catch (error) {
                this.log(`Error destroying HLS.js: ${error.message}`, 'warning');
            }
            this.hls = null;
        }
        
        if (this.worker) {
            this.worker.terminate();
        }
        
        // Clean up CORS status
        const corsStatus = document.getElementById('cors-status');
        if (corsStatus) {
            corsStatus.remove();
        }
    }

    // Enhanced stream parsing with softsub support (Sora WebUI pattern)
    parseEnhancedStreamData(streamData) {
        try {
            this.log(`Parsing enhanced stream data: ${typeof streamData}`, 'info');
            
            // Parse the JSON string if needed
            let parsedData = (typeof streamData === 'string') ? JSON.parse(streamData) : streamData;
            
            // Handle softsub format like working Sora WebUI
            if (parsedData && typeof parsedData === 'object' && parsedData.stream && parsedData.subtitles) {
                this.log('Detected softsub format - separating stream and subtitles', 'info');
                return {
                    streams: [{
                        url: parsedData.stream,
                        quality: 'auto',
                        headers: parsedData.headers || {}
                    }],
                    subtitles: [{
                        url: parsedData.subtitles,
                        language: 'en',
                        label: 'English'
                    }]
                };
            }
            
            // Fallback to existing parsing method
            return this.parseStreamData(streamData);
            
        } catch (error) {
            this.log(`Enhanced stream parsing failed: ${error.message}`, 'error');
            return this.parseStreamData(streamData);
        }
    }
    
    // Enhanced episode playing with Plyr integration (Sora WebUI pattern)
    async playEpisodeEnhanced(episodeUrl) {
        try {
            this.log(`=== EPISODE PLAYBACK DEBUG ===`, 'info');
            this.log(`Playing episode with enhanced method: ${episodeUrl}`, 'info');
            
            // Extract stream data
            this.log('Extracting stream data...', 'info');
            const streamData = await this.userFunctions.extractStreamUrl(episodeUrl);
            this.log(`Raw stream data: ${JSON.stringify(streamData)}`, 'info');
            
            if (!streamData) {
                throw new Error('No stream URL found');
            }
            
            // Parse with enhanced softsub support
            this.log('Parsing stream data...', 'info');
            const parsedStreams = this.parseEnhancedStreamData(streamData);
            this.log(`Parsed streams: ${JSON.stringify(parsedStreams)}`, 'info');
            
            // Get first stream and subtitles
            const stream = parsedStreams.streams[0];
            const subtitles = parsedStreams.subtitles?.[0];
            
            this.log(`Selected stream URL: ${stream.url}`, 'info');
            this.log(`Selected stream type: ${this.getVideoMimeType(stream.url)}`, 'info');
            if (subtitles) {
                this.log(`Selected subtitles: ${subtitles.url}`, 'info');
            }
            
            // Use official Plyr .source setter (following documentation)
            const plyrSource = {
                type: 'video',
                title: stream.title || 'Video Stream',
                sources: [{
                    src: stream.url,
                    type: this.getVideoMimeType(stream.url),
                    size: stream.quality || 720
                }]
            };
            
            // Add subtitles if available
            if (subtitles) {
                plyrSource.tracks = [{
                    kind: 'captions',
                    label: subtitles.label || 'English',
                    srclang: subtitles.language || 'en',
                    src: subtitles.url,
                    default: true
                }];
            }
            
            this.log(`Plyr source object: ${JSON.stringify(plyrSource)}`, 'info');
            
            // Set source using official Plyr API
            this.log('Setting Plyr source...', 'info');
            this.player.source = plyrSource;
            this.log('Plyr source set successfully', 'success');
            
            // Show player content
            this.showPlayerContent(stream.title || 'Video Stream', stream.url);
            
            // Remove loading indicator
            const loadingDiv = this.elements.streamDiv.querySelector('.stream-loading');
            if (loadingDiv) loadingDiv.remove();
            
            this.log('=== EPISODE PLAYBACK COMPLETE ===', 'success');
            
        } catch (error) {
            this.log(`=== EPISODE PLAYBACK ERROR ===`, 'error');
            this.log(`Error: ${error.message}`, 'error');
            this.log(`Stack: ${error.stack}`, 'error');
            this.showPlayerError(`Stream Error: ${error.message}`);
        }
    }
    
    // Enhanced CORS proxy management (Sora WebUI pattern)
    getEnhancedCorsStatus() {
        const corsProxy = localStorage.getItem("corsProxy");
        if (corsProxy) {
            return {
                enabled: true,
                type: 'proxy',
                proxy: corsProxy,
                status: '🔗 Proxy Active'
            };
        } else if (this.corsExtensionDetected) {
            return {
                enabled: true,
                type: 'extension',
                status: '🔓 CORS Active'
            };
        } else {
            return {
                enabled: false,
                type: 'none',
                status: '🔒 Setup CORS'
            };
        }
    }

    // Update storage status display for mobile users
    updateStorageStatus() {
        try {
            const storageInfo = moduleManager.getStorageInfo();
            
            // Update stats display
            const modulesCount = document.getElementById('modules-count');
            if (modulesCount) {
                modulesCount.textContent = moduleManager.getAllModules().length;
            }
            
            // Add storage usage info to the modules section
            let storageStatusDiv = document.getElementById('storage-status');
            if (!storageStatusDiv) {
                // Create storage status element
                const modulesList = document.getElementById('modules-list');
                if (modulesList && modulesList.parentNode) {
                    storageStatusDiv = document.createElement('div');
                    storageStatusDiv.id = 'storage-status';
                    storageStatusDiv.className = 'storage-status';
                    modulesList.parentNode.insertBefore(storageStatusDiv, modulesList.nextSibling);
                }
            }
            
            if (storageStatusDiv) {
                if (!storageInfo.available) {
                    storageStatusDiv.innerHTML = `
                        <div class="storage-warning">
                            <span class="warning-icon">⚠️</span>
                            <strong>Storage Unavailable</strong>
                            <p>Modules will not persist (private browsing mode?)</p>
                        </div>
                    `;
                } else if (storageInfo.quotaExceeded) {
                    storageStatusDiv.innerHTML = `
                        <div class="storage-error">
                            <span class="error-icon">🚫</span>
                            <strong>Storage Almost Full (${storageInfo.usagePercentage}%)</strong>
                            <p>Consider removing old modules to free space</p>
                            <button onclick="moduleManager.performStorageCleanup(); app.updateStorageStatus();" class="cleanup-btn">
                                Clean Up Old Modules
                            </button>
                        </div>
                    `;
                } else {
                    const usageColor = storageInfo.usagePercentage > 70 ? '#ff6b6b' : 
                                     storageInfo.usagePercentage > 50 ? '#ffa500' : '#4ecdc4';
                    
                    storageStatusDiv.innerHTML = `
                        <div class="storage-info">
                            <span class="storage-icon">💾</span>
                            <div class="storage-details">
                                <div class="storage-text">
                                    Storage: ${Math.round(storageInfo.usedSpace / 1024)}KB used (${storageInfo.usagePercentage}%)
                                </div>
                                <div class="storage-bar">
                                    <div class="storage-progress" style="width: ${storageInfo.usagePercentage}%; background-color: ${usageColor};"></div>
                                </div>
                            </div>
                        </div>
                    `;
                }
            }
            
        } catch (error) {
            console.error('[SoraApp] Error updating storage status:', error);
        }
    }

    // Setup storage monitoring for mobile feedback
    setupStorageMonitoring() {
        // Monitor localStorage changes (for other tabs/windows)
        window.addEventListener('storage', (event) => {
            if (event.key === 'sora_modules' || event.key === 'sora_selected_module') {
                this.log('Module storage updated from another tab', 'info');
                this.updateModulesList();
                this.updateSelectedModuleInfo();
                this.updateStorageStatus();
            }
        });
        
        // Monitor app visibility changes (mobile browsers suspend tabs)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                // App became visible again - refresh storage status
                setTimeout(() => {
                    this.updateStorageStatus();
                }, 100);
            }
        });
    }
}

// Global app instance
let app;

// Make navigation functions globally available immediately
window.showSection = (sectionName) => {
    if (app && app.showSection) {
        app.showSection(sectionName);
    } else {
        console.error('App not initialized yet. Try again in a moment.');
    }
};

window.togglePerformance = () => {
    if (app && app.togglePerformancePanel) {
        app.togglePerformancePanel();
    } else {
        console.error('App not initialized yet. Try again in a moment.');
    }
};

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    app = new SoraApp();
    console.log('✅ App initialized! Navigation functions available: showSection(name), togglePerformance()');
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (app) {
        app.destroy();
    }
}); 