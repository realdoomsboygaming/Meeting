// modernized-search-worker.js - Enhanced search worker using new controller architecture
// Replaces the basic search-worker.js with integrated new module system

// Import worker-compatible versions of our controllers
importScripts('./module-system/core/network-utils.js');
importScripts('./module-system/core/module-execution-manager.js');
importScripts('./module-system/controllers/search-controller.js');
importScripts('./module-system/controllers/details-controller.js');
importScripts('./module-system/controllers/streams-controller.js');

// Worker environment setup
class ModernizedSearchWorker {
    constructor() {
        // Initialize controllers
        this.networkUtils = new NetworkUtils();
        this.moduleExecutionManager = new ModuleExecutionManager();
        this.searchController = new SearchController();
        this.detailsController = new DetailsController();
        this.streamsController = new StreamsController();
        
        // Worker state
        this.activeRequests = new Map();
        this.abortControllers = new Map();
        this.requestIdCounter = 0;
        
        // Performance tracking
        this.performanceMetrics = {
            totalRequests: 0,
            successfulRequests: 0,
            averageResponseTime: 0,
            errorCount: 0
        };
        
        // Cache for better performance
        this.resultCache = new Map();
        this.maxCacheSize = 100;
        this.cacheExpiryTime = 300000; // 5 minutes
        
        this.initializeWorker();
    }

    initializeWorker() {
        // Set up message handling
        self.addEventListener('message', (event) => this.handleMessage(event));
        
        // Set up error handling
        self.addEventListener('error', (error) => this.handleError(error));
        
        // Setup periodic cache cleanup
        setInterval(() => this.cleanupCache(), 60000); // Every minute
        
        console.log('[ModernizedSearchWorker] Initialized successfully');
    }

    async handleMessage(event) {
        const { type, data, requestId } = event.data;
        
        try {
            // Track active request
            this.activeRequests.set(requestId, {
                type,
                startTime: Date.now(),
                data
            });
            
            // Create abort controller for this request
            const abortController = new AbortController();
            this.abortControllers.set(requestId, abortController);
            
            this.performanceMetrics.totalRequests++;
            
            switch (type) {
                case 'SEARCH':
                    await this.performSearch(data, requestId, abortController.signal);
                    break;
                case 'EXTRACT_DETAILS':
                    await this.extractDetails(data, requestId, abortController.signal);
                    break;
                case 'EXTRACT_EPISODES':
                    await this.extractEpisodes(data, requestId, abortController.signal);
                    break;
                case 'EXTRACT_STREAM':
                    await this.extractStream(data, requestId, abortController.signal);
                    break;
                case 'CANCEL':
                    this.cancelRequest(data.requestId);
                    break;
                case 'CANCEL_ALL':
                    this.cancelAllRequests();
                    break;
                case 'GET_METRICS':
                    this.sendMetrics(requestId);
                    break;
                case 'CLEAR_CACHE':
                    this.clearCache();
                    break;
                default:
                    throw new Error(`Unknown message type: ${type}`);
            }
            
        } catch (error) {
            this.handleRequestError(error, requestId);
        }
    }

    async performSearch(data, requestId, signal) {
        try {
            this.postProgress('Initializing search...', requestId);
            
            const { query, moduleConfig, options = {} } = data;
            
            // Check cache first
            const cacheKey = this.generateCacheKey('search', query, moduleConfig);
            if (this.resultCache.has(cacheKey)) {
                const cached = this.resultCache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheExpiryTime) {
                    this.postMessage({
                        type: 'SEARCH_COMPLETE',
                        data: cached.results,
                        requestId
                    });
                    this.recordSuccessfulRequest(requestId);
                    return;
                }
            }
            
            this.postProgress('Executing search module...', requestId);
            
            // Use SearchController for enhanced search
            const results = await this.searchController.performSearch(
                query,
                moduleConfig,
                {
                    ...options,
                    signal,
                    timeout: options.timeout || 30000,
                    onProgress: (message) => this.postProgress(message, requestId)
                }
            );
            
            // Cache results
            this.cacheResults(cacheKey, results);
            
            this.postMessage({
                type: 'SEARCH_COMPLETE',
                data: results,
                requestId
            });
            
            this.recordSuccessfulRequest(requestId);
            
        } catch (error) {
            if (error.name === 'AbortError') {
                this.postMessage({
                    type: 'SEARCH_CANCELLED',
                    requestId
                });
            } else {
                throw error;
            }
        }
    }

    async extractDetails(data, requestId, signal) {
        try {
            this.postProgress('Extracting content details...', requestId);
            
            const { url, moduleConfig, options = {} } = data;
            
            // Check cache
            const cacheKey = this.generateCacheKey('details', url, moduleConfig);
            if (this.resultCache.has(cacheKey)) {
                const cached = this.resultCache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheExpiryTime) {
                    this.postMessage({
                        type: 'DETAILS_COMPLETE',
                        data: cached.results,
                        requestId
                    });
                    this.recordSuccessfulRequest(requestId);
                    return;
                }
            }
            
            // Use DetailsController for enhanced extraction
            const result = await this.detailsController.extractDetails(
                url,
                moduleConfig,
                {
                    ...options,
                    signal,
                    timeout: options.timeout || 30000,
                    onProgress: (message) => this.postProgress(message, requestId)
                }
            );
            
            // Cache results
            this.cacheResults(cacheKey, result);
            
            this.postMessage({
                type: 'DETAILS_COMPLETE',
                data: result,
                requestId
            });
            
            this.recordSuccessfulRequest(requestId);
            
        } catch (error) {
            if (error.name === 'AbortError') {
                this.postMessage({
                    type: 'DETAILS_CANCELLED',
                    requestId
                });
            } else {
                throw error;
            }
        }
    }

    async extractEpisodes(data, requestId, signal) {
        try {
            this.postProgress('Extracting episodes list...', requestId);
            
            const { url, moduleConfig, options = {} } = data;
            
            // Check cache
            const cacheKey = this.generateCacheKey('episodes', url, moduleConfig);
            if (this.resultCache.has(cacheKey)) {
                const cached = this.resultCache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheExpiryTime) {
                    this.postMessage({
                        type: 'EPISODES_COMPLETE',
                        data: cached.results,
                        requestId
                    });
                    this.recordSuccessfulRequest(requestId);
                    return;
                }
            }
            
            // Use DetailsController to extract episodes (episodes are part of details)
            const result = await this.detailsController.extractDetails(
                url,
                moduleConfig,
                {
                    ...options,
                    signal,
                    timeout: options.timeout || 30000,
                    extractEpisodesOnly: true,
                    onProgress: (message) => this.postProgress(message, requestId)
                }
            );
            
            // Cache results
            this.cacheResults(cacheKey, result.episodes || []);
            
            this.postMessage({
                type: 'EPISODES_COMPLETE',
                data: result.episodes || [],
                requestId
            });
            
            this.recordSuccessfulRequest(requestId);
            
        } catch (error) {
            if (error.name === 'AbortError') {
                this.postMessage({
                    type: 'EPISODES_CANCELLED',
                    requestId
                });
            } else {
                throw error;
            }
        }
    }

    async extractStream(data, requestId, signal) {
        try {
            this.postProgress('Extracting stream data...', requestId);
            
            const { url, moduleConfig, options = {} } = data;
            
            // Check cache
            const cacheKey = this.generateCacheKey('stream', url, moduleConfig);
            if (this.resultCache.has(cacheKey)) {
                const cached = this.resultCache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheExpiryTime / 2) { // Shorter cache for streams
                    this.postMessage({
                        type: 'STREAM_COMPLETE',
                        data: cached.results,
                        requestId
                    });
                    this.recordSuccessfulRequest(requestId);
                    return;
                }
            }
            
            // Use StreamsController for enhanced stream extraction
            const result = await this.streamsController.extractStreams(
                url,
                moduleConfig,
                {
                    ...options,
                    signal,
                    timeout: options.timeout || 30000,
                    onProgress: (message) => this.postProgress(message, requestId)
                }
            );
            
            // Cache results (shorter time for streams)
            this.cacheResults(cacheKey, result, this.cacheExpiryTime / 2);
            
            this.postMessage({
                type: 'STREAM_COMPLETE',
                data: result,
                requestId
            });
            
            this.recordSuccessfulRequest(requestId);
            
        } catch (error) {
            if (error.name === 'AbortError') {
                this.postMessage({
                    type: 'STREAM_CANCELLED',
                    requestId
                });
            } else {
                throw error;
            }
        }
    }

    // Request management
    cancelRequest(requestId) {
        const abortController = this.abortControllers.get(requestId);
        if (abortController) {
            abortController.abort();
            this.abortControllers.delete(requestId);
        }
        
        this.activeRequests.delete(requestId);
        
        this.postMessage({
            type: 'REQUEST_CANCELLED',
            requestId
        });
    }

    cancelAllRequests() {
        // Abort all active requests
        for (const [requestId, abortController] of this.abortControllers) {
            abortController.abort();
        }
        
        this.abortControllers.clear();
        this.activeRequests.clear();
        
        this.postMessage({
            type: 'ALL_REQUESTS_CANCELLED'
        });
    }

    // Cache management
    generateCacheKey(type, identifier, moduleConfig) {
        const moduleKey = moduleConfig.metadata?.sourceName || 'unknown';
        const moduleVersion = moduleConfig.metadata?.version || '1.0';
        return `${type}:${moduleKey}:${moduleVersion}:${this.hashString(identifier)}`;
    }

    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }

    cacheResults(key, results, expiry = this.cacheExpiryTime) {
        // Manage cache size
        if (this.resultCache.size >= this.maxCacheSize) {
            const oldestKey = this.resultCache.keys().next().value;
            this.resultCache.delete(oldestKey);
        }
        
        this.resultCache.set(key, {
            results,
            timestamp: Date.now(),
            expiry
        });
    }

    cleanupCache() {
        const now = Date.now();
        const keysToDelete = [];
        
        for (const [key, cached] of this.resultCache) {
            if (now - cached.timestamp > cached.expiry) {
                keysToDelete.push(key);
            }
        }
        
        keysToDelete.forEach(key => this.resultCache.delete(key));
        
        if (keysToDelete.length > 0) {
            console.log(`[ModernizedSearchWorker] Cleaned up ${keysToDelete.length} expired cache entries`);
        }
    }

    clearCache() {
        this.resultCache.clear();
        this.postMessage({
            type: 'CACHE_CLEARED'
        });
    }

    // Performance tracking
    recordSuccessfulRequest(requestId) {
        const request = this.activeRequests.get(requestId);
        if (request) {
            const duration = Date.now() - request.startTime;
            
            // Update metrics
            this.performanceMetrics.successfulRequests++;
            
            // Update average response time
            const totalRequests = this.performanceMetrics.successfulRequests;
            const currentAverage = this.performanceMetrics.averageResponseTime;
            this.performanceMetrics.averageResponseTime = 
                ((currentAverage * (totalRequests - 1)) + duration) / totalRequests;
            
            this.activeRequests.delete(requestId);
            this.abortControllers.delete(requestId);
        }
    }

    sendMetrics(requestId) {
        const metrics = {
            ...this.performanceMetrics,
            activeRequests: this.activeRequests.size,
            cacheSize: this.resultCache.size,
            cacheHitRate: this.calculateCacheHitRate()
        };
        
        this.postMessage({
            type: 'METRICS',
            data: metrics,
            requestId
        });
    }

    calculateCacheHitRate() {
        // This would need to be tracked over time for accurate calculation
        // For now, return a placeholder
        return 0;
    }

    // Error handling
    handleRequestError(error, requestId) {
        this.performanceMetrics.errorCount++;
        
        // Clean up request tracking
        this.activeRequests.delete(requestId);
        this.abortControllers.delete(requestId);
        
        this.postMessage({
            type: 'ERROR',
            data: {
                message: error.message,
                stack: error.stack,
                name: error.name
            },
            requestId
        });
    }

    handleError(error) {
        console.error('[ModernizedSearchWorker] Worker error:', error);
        
        this.postMessage({
            type: 'WORKER_ERROR',
            data: {
                message: error.message,
                filename: error.filename,
                lineno: error.lineno
            }
        });
    }

    // Messaging utilities
    postMessage(data) {
        try {
            self.postMessage(data);
        } catch (error) {
            console.error('[ModernizedSearchWorker] Failed to post message:', error);
        }
    }

    postProgress(message, requestId) {
        this.postMessage({
            type: 'PROGRESS',
            data: { message },
            requestId
        });
    }
}

// Enhanced compatibility layer for Sora modules
class WorkerCompatibilityLayer {
    constructor() {
        this.setupGlobalAPIs();
    }

    setupGlobalAPIs() {
        // Enhanced fetchv2 implementation
        self.fetchv2 = this.createFetchv2();
        
        // Console implementation
        self.console = this.createConsole();
        
        // Base64 functions
        self.btoa = this.createBtoa();
        self.atob = this.createAtob();
        
        // Random string generator for modules
        self._0xB4F2 = this.createRandomStringGenerator();
    }

    createFetchv2() {
        return async (url, headers = {}, method = "GET", body = null, redirect = true, encoding = "utf-8") => {
            try {
                const processedHeaders = {};
                if (headers && typeof headers === 'object' && !Array.isArray(headers)) {
                    Object.assign(processedHeaders, headers);
                }
                
                const fetchOptions = {
                    method: method,
                    headers: processedHeaders,
                    redirect: redirect ? 'follow' : 'manual'
                };
                
                if (method !== "GET" && body !== null) {
                    fetchOptions.body = (body && typeof body === 'object') ? JSON.stringify(body) : body;
                }
                
                const response = await fetch(url, fetchOptions);
                
                const responseHeaders = {};
                if (response.headers) {
                    response.headers.forEach((value, key) => {
                        responseHeaders[key] = value;
                    });
                }
                
                const text = await response.text();
                
                return {
                    headers: responseHeaders,
                    status: response.status,
                    _data: text,
                    text: () => Promise.resolve(text),
                    json: () => {
                        try {
                            return Promise.resolve(JSON.parse(text));
                        } catch (e) {
                            return Promise.reject(new Error(`JSON parse error: ${e.message}`));
                        }
                    }
                };
                
            } catch (error) {
                throw new Error(error.message || error.toString());
            }
        };
    }

    createConsole() {
        return {
            log: (message) => {
                self.postMessage({
                    type: 'CONSOLE_LOG',
                    message: `Module: ${message}`
                });
            },
            error: (message) => {
                self.postMessage({
                    type: 'CONSOLE_ERROR',
                    message: `Module Error: ${message}`
                });
            },
            warn: (message) => {
                self.postMessage({
                    type: 'CONSOLE_WARN',
                    message: `Module Warning: ${message}`
                });
            }
        };
    }

    createBtoa() {
        return (data) => {
            try {
                const bytes = new TextEncoder().encode(data);
                let result = '';
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
                let i = 0;
                
                while (i < bytes.length) {
                    const byte1 = bytes[i++];
                    const byte2 = i < bytes.length ? bytes[i++] : 0;
                    const byte3 = i < bytes.length ? bytes[i++] : 0;
                    
                    const bitmap = (byte1 << 16) | (byte2 << 8) | byte3;
                    
                    result += chars.charAt((bitmap >> 18) & 63);
                    result += chars.charAt((bitmap >> 12) & 63);
                    result += i - 2 < bytes.length ? chars.charAt((bitmap >> 6) & 63) : '=';
                    result += i - 1 < bytes.length ? chars.charAt(bitmap & 63) : '=';
                }
                
                return result;
            } catch (e) {
                throw new Error('btoa: Invalid input');
            }
        };
    }

    createAtob() {
        return (base64) => {
            try {
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
                let result = '';
                let i = 0;
                
                base64 = base64.replace(/[=\s]/g, '');
                
                while (i < base64.length) {
                    const encoded1 = chars.indexOf(base64.charAt(i++));
                    const encoded2 = chars.indexOf(base64.charAt(i++));
                    const encoded3 = chars.indexOf(base64.charAt(i++));
                    const encoded4 = chars.indexOf(base64.charAt(i++));
                    
                    const bitmap = (encoded1 << 18) | (encoded2 << 12) | (encoded3 << 6) | encoded4;
                    
                    result += String.fromCharCode((bitmap >> 16) & 255);
                    if (encoded3 !== 64) result += String.fromCharCode((bitmap >> 8) & 255);
                    if (encoded4 !== 64) result += String.fromCharCode(bitmap & 255);
                }
                
                return result;
            } catch (e) {
                throw new Error('atob: Invalid base64 input');
            }
        };
    }

    createRandomStringGenerator() {
        return () => {
            const cranci = [99, 114, 97, 110, 99, 105].map(code => String.fromCharCode(code));
            const alphanumeric = [
                ...Array.from({length: 26}, (_, i) => String.fromCharCode(97 + i)), 
                ...Array.from({length: 10}, (_, i) => String.fromCharCode(48 + i))
            ];
            
            const result = new Array(16).fill('');
            const usedPositions = new Set();
            
            cranci.forEach(char => {
                let position;
                do {
                    position = Math.floor(Math.random() * 16);
                } while (usedPositions.has(position));
                usedPositions.add(position);
                result[position] = char;
            });
            
            for (let i = 0; i < 16; i++) {
                if (result[i] === '') {
                    result[i] = alphanumeric[Math.floor(Math.random() * alphanumeric.length)];
                }
            }
            
            return result.join('');
        };
    }
}

// Initialize worker
const compatibilityLayer = new WorkerCompatibilityLayer();
const modernizedWorker = new ModernizedSearchWorker();

console.log('[ModernizedSearchWorker] Worker fully initialized and ready'); 