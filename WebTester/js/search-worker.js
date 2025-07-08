function _0xB4F2() {
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
}

self._0xB4F2 = _0xB4F2;

// Sora fetchv2 implementation for Web Worker context
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

// Make fetchv2 globally available in worker context
self.fetchv2 = fetchv2;

// Sora console logging compatibility for Web Worker
const console = {
    log: function(message) {
        self.postMessage({
            type: 'CONSOLE_LOG',
            message: 'Module: ' + message
        });
    },
    error: function(message) {
        self.postMessage({
            type: 'CONSOLE_ERROR', 
            message: 'Module Error: ' + message
        });
    }
};
self.console = console;

// Base64 encoding functions (btoa/atob) with UTF-8 support for Web Worker
function btoa(data) {
    try {
        // Convert string to bytes array
        const bytes = new TextEncoder().encode(data);
        // Convert bytes to base64
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
}

function atob(base64) {
    try {
        // Base64 decode
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        let result = '';
        let i = 0;
        
        // Remove padding and whitespace
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
}

self.btoa = btoa;
self.atob = atob;

class SearchWorker {
    constructor() {
        this.searchCache = new Map();
        this.abortController = null;
    }

    async handleMessage(event) {
        const { type, data, requestId } = event.data;
        
        try {
            switch (type) {
                case 'SEARCH':
                    await this.performSearch(data, requestId);
                    break;
                case 'EXTRACT_DETAILS':
                    await this.extractDetails(data, requestId);
                    break;
                case 'EXTRACT_EPISODES':
                    await this.extractEpisodes(data, requestId);
                    break;
                case 'EXTRACT_STREAM':
                    await this.extractStream(data, requestId);
                    break;
                case 'CANCEL':
                    this.cancelOperations();
                    break;
                default:
                    throw new Error(`Unknown operation: ${type}`);
            }
        } catch (error) {
            this.postError(error.message, requestId);
        }
    }

    async performSearch({ query, moduleConfig, userFunctions }, requestId) {
        // Cancel previous operation if running
        if (this.abortController) {
            this.abortController.abort();
        }
        
        this.abortController = new AbortController();
        const signal = this.abortController.signal;

        try {
            // Check if module functions are available (they shouldn't be for module-based operations)
            if (!userFunctions || !userFunctions.searchResults) {
                this.postError('Module functions not available in Web Worker - should use main thread', requestId);
                return;
            }

            // Check cache first
            const cacheKey = `search_${query}`;
            if (this.searchCache.has(cacheKey)) {
                this.postMessage({
                    type: 'SEARCH_COMPLETE',
                    data: this.searchCache.get(cacheKey),
                    requestId
                });
                return;
            }

            this.postProgress('Starting search...', requestId);
            
            let results;
            
            if (moduleConfig.asyncJS) {
                // Async mode - call user function directly
                this.postProgress('Executing async search...', requestId);
                results = await this.executeWithTimeout(
                    () => userFunctions.searchResults(query),
                    30000,
                    signal
                );
            } else {
                // Normal mode - fetch HTML first
                this.postProgress('Fetching search page...', requestId);
                const searchUrl = moduleConfig.searchBaseUrl.replace('%s', encodeURIComponent(query));
                
                const html = await this.fetchWithTimeout(searchUrl, {
                    signal,
                    headers: { 
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' 
                    }
                }, 30000);
                
                this.postProgress('Processing search results...', requestId);
                // Ensure protection function and fetchv2 are available
                const originalGlobal_0xB4F2 = globalThis._0xB4F2;
                const originalGlobalFetchv2 = globalThis.fetchv2;
                globalThis._0xB4F2 = self._0xB4F2;
                globalThis.fetchv2 = self.fetchv2;
                try {
                    results = userFunctions.searchResults(html);
                } finally {
                    // Restore original global state
                    if (originalGlobal_0xB4F2) {
                        globalThis._0xB4F2 = originalGlobal_0xB4F2;
                    } else {
                        delete globalThis._0xB4F2;
                    }
                    if (originalGlobalFetchv2) {
                        globalThis.fetchv2 = originalGlobalFetchv2;
                    } else {
                        delete globalThis.fetchv2;
                    }
                }
            }

            // Process results in chunks to prevent blocking
            const parsedResults = await this.processInChunks(
                typeof results === 'string' ? JSON.parse(results) : results,
                signal
            );

            // Cache results
            this.searchCache.set(cacheKey, parsedResults);
            
            this.postMessage({
                type: 'SEARCH_COMPLETE',
                data: parsedResults,
                requestId
            });

        } catch (error) {
            if (error.name === 'AbortError') {
                this.postMessage({ type: 'SEARCH_CANCELLED', requestId });
            } else {
                this.postError(error.message, requestId);
            }
        }
    }

    async extractDetails({ url, moduleConfig, userFunctions }, requestId) {
        try {
            // Check if module functions are available (they shouldn't be for module-based operations)
            if (!userFunctions || !userFunctions.extractDetails) {
                this.postError('Module functions not available in Web Worker - should use main thread', requestId);
                return;
            }

            this.postProgress('Fetching details...', requestId);
            
            let details;
            if (moduleConfig.asyncJS) {
                details = await this.executeWithTimeout(
                    () => userFunctions.extractDetails(url),
                    30000
                );
            } else {
                const html = await this.fetchWithTimeout(url);
                // Ensure protection function and fetchv2 are available
                const originalGlobal_0xB4F2 = globalThis._0xB4F2;
                const originalGlobalFetchv2 = globalThis.fetchv2;
                globalThis._0xB4F2 = self._0xB4F2;
                globalThis.fetchv2 = self.fetchv2;
                try {
                    details = userFunctions.extractDetails(html);
                } finally {
                    // Restore original global state
                    if (originalGlobal_0xB4F2) {
                        globalThis._0xB4F2 = originalGlobal_0xB4F2;
                    } else {
                        delete globalThis._0xB4F2;
                    }
                    if (originalGlobalFetchv2) {
                        globalThis.fetchv2 = originalGlobalFetchv2;
                    } else {
                        delete globalThis.fetchv2;
                    }
                }
            }

            const parsedDetails = ((typeof details === 'string') ? JSON.parse(details) : details)[0];
            
            this.postMessage({
                type: 'DETAILS_COMPLETE',
                data: parsedDetails,
                requestId
            });
        } catch (error) {
            this.postError(error.message, requestId);
        }
    }

    async extractEpisodes({ url, moduleConfig, userFunctions }, requestId) {
        try {
            // Check if module functions are available (they shouldn't be for module-based operations)
            if (!userFunctions || !userFunctions.extractEpisodes) {
                this.postError('Module functions not available in Web Worker - should use main thread', requestId);
                return;
            }

            this.postProgress('Fetching episodes...', requestId);
            
            // Debug logging
            this.postMessage({
                type: 'CONSOLE_LOG',
                message: `DEBUG: Worker extractEpisodes URL: ${url}`
            });
            
            let episodes;
            if (moduleConfig.asyncJS) {
                episodes = await this.executeWithTimeout(
                    () => userFunctions.extractEpisodes(url),
                    30000
                );
            } else {
                const html = await this.fetchWithTimeout(url);
                // Ensure protection function and fetchv2 are available
                const originalGlobal_0xB4F2 = globalThis._0xB4F2;
                const originalGlobalFetchv2 = globalThis.fetchv2;
                globalThis._0xB4F2 = self._0xB4F2;
                globalThis.fetchv2 = self.fetchv2;
                try {
                    episodes = userFunctions.extractEpisodes(html);
                } finally {
                    // Restore original global state
                    if (originalGlobal_0xB4F2) {
                        globalThis._0xB4F2 = originalGlobal_0xB4F2;
                    } else {
                        delete globalThis._0xB4F2;
                    }
                    if (originalGlobalFetchv2) {
                        globalThis.fetchv2 = originalGlobalFetchv2;
                    } else {
                        delete globalThis.fetchv2;
                    }
                }
            }

            // Debug logging for raw episodes
            this.postMessage({
                type: 'CONSOLE_LOG',
                message: `DEBUG: Worker raw episodes type: ${typeof episodes}`
            });
            this.postMessage({
                type: 'CONSOLE_LOG',
                message: `DEBUG: Worker raw episodes: ${JSON.stringify(episodes).substring(0, 200)}...`
            });

            const parsedEpisodes = (typeof episodes === 'string') ? JSON.parse(episodes) : episodes;
            
            // Debug logging for parsed episodes
            this.postMessage({
                type: 'CONSOLE_LOG',
                message: `DEBUG: Worker parsed episodes type: ${typeof parsedEpisodes}`
            });
            this.postMessage({
                type: 'CONSOLE_LOG',
                message: `DEBUG: Worker parsed episodes is array: ${Array.isArray(parsedEpisodes)}`
            });
            this.postMessage({
                type: 'CONSOLE_LOG',
                message: `DEBUG: Worker parsed episodes length: ${parsedEpisodes ? parsedEpisodes.length : 'undefined/null'}`
            });
            
            this.postMessage({
                type: 'EPISODES_COMPLETE',
                data: parsedEpisodes,
                requestId
            });
        } catch (error) {
            this.postMessage({
                type: 'CONSOLE_ERROR',
                message: `DEBUG: Worker extractEpisodes error: ${error.message}`
            });
            this.postError(error.message, requestId);
        }
    }

    async extractStream({ url, moduleConfig, userFunctions }, requestId) {
        try {
            // Check if module functions are available (they shouldn't be for module-based operations)
            if (!userFunctions || !userFunctions.extractStreamUrl) {
                this.postError('Module functions not available in Web Worker - should use main thread', requestId);
                return;
            }

            this.postProgress('Fetching stream...', requestId);
            
            let streamData;
            if (moduleConfig.streamAsyncJS || moduleConfig.asyncJS) {
                if (moduleConfig.asyncJS) {
                    streamData = await this.executeWithTimeout(
                        () => userFunctions.extractStreamUrl(url),
                        45000
                    );
                } else {
                    const html = await this.fetchWithTimeout(url);
                    streamData = await this.executeWithTimeout(
                        () => userFunctions.extractStreamUrl(html),
                        30000
                    );
                }
                
                // Debug logging for async worker
                this.postMessage({
                    type: 'CONSOLE_LOG',
                    message: `DEBUG: Worker async streamData type: ${typeof streamData}`
                });
                this.postMessage({
                    type: 'CONSOLE_LOG',
                    message: `DEBUG: Worker async streamData: ${JSON.stringify(streamData).substring(0, 500)}...`
                });
            } else {
                const html = await this.fetchWithTimeout(url);
                // Ensure protection function and fetchv2 are available
                const originalGlobal_0xB4F2 = globalThis._0xB4F2;
                const originalGlobalFetchv2 = globalThis.fetchv2;
                globalThis._0xB4F2 = self._0xB4F2;
                globalThis.fetchv2 = self.fetchv2;
                try {
                    streamData = userFunctions.extractStreamUrl(html);
                    
                    // Debug logging for worker
                    this.postMessage({
                        type: 'CONSOLE_LOG',
                        message: `DEBUG: Worker raw streamData type: ${typeof streamData}`
                    });
                    this.postMessage({
                        type: 'CONSOLE_LOG',
                        message: `DEBUG: Worker raw streamData: ${JSON.stringify(streamData).substring(0, 500)}...`
                    });
                } finally {
                    // Restore original global state
                    if (originalGlobal_0xB4F2) {
                        globalThis._0xB4F2 = originalGlobal_0xB4F2;
                    } else {
                        delete globalThis._0xB4F2;
                    }
                    if (originalGlobalFetchv2) {
                        globalThis.fetchv2 = originalGlobalFetchv2;
                    } else {
                        delete globalThis.fetchv2;
                    }
                }
            }

            this.postMessage({
                type: 'STREAM_COMPLETE',
                data: streamData,
                requestId
            });
        } catch (error) {
            this.postError(error.message, requestId);
        }
    }

    async fetchWithTimeout(url, options = {}, timeout = 30000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.text();
        } finally {
            clearTimeout(timeoutId);
        }
    }

    async executeWithTimeout(fn, timeout, signal) {
        return Promise.race([
            (() => {
                // Ensure protection function and fetchv2 are available during execution
                const originalGlobal_0xB4F2 = globalThis._0xB4F2;
                const originalGlobalFetchv2 = globalThis.fetchv2;
                globalThis._0xB4F2 = self._0xB4F2;
                globalThis.fetchv2 = self.fetchv2;
                
                try {
                    const result = fn();
                    
                    // Restore original global state
                    if (originalGlobal_0xB4F2) {
                        globalThis._0xB4F2 = originalGlobal_0xB4F2;
                    } else {
                        delete globalThis._0xB4F2;
                    }
                    if (originalGlobalFetchv2) {
                        globalThis.fetchv2 = originalGlobalFetchv2;
                    } else {
                        delete globalThis.fetchv2;
                    }
                    
                    return result;
                } catch (error) {
                    // Restore original global state on error
                    if (originalGlobal_0xB4F2) {
                        globalThis._0xB4F2 = originalGlobal_0xB4F2;
                    } else {
                        delete globalThis._0xB4F2;
                    }
                    if (originalGlobalFetchv2) {
                        globalThis.fetchv2 = originalGlobalFetchv2;
                    } else {
                        delete globalThis.fetchv2;
                    }
                    throw error;
                }
            })(),
            new Promise((_, reject) => {
                const timeoutId = setTimeout(() => reject(new Error('Operation timeout')), timeout);
                if (signal) {
                    signal.addEventListener('abort', () => {
                        clearTimeout(timeoutId);
                        reject(new Error('Operation cancelled'));
                    });
                }
            })
        ]);
    }

    async processInChunks(data, signal, chunkSize = 100) {
        if (!Array.isArray(data)) return data;
        
        const result = [];
        for (let i = 0; i < data.length; i += chunkSize) {
            if (signal && signal.aborted) {
                throw new Error('Operation cancelled');
            }
            
            const chunk = data.slice(i, i + chunkSize);
            result.push(...chunk);
            
            // Yield control to prevent blocking
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        return result;
    }

    cancelOperations() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
    }

    postMessage(data) {
        self.postMessage(data);
    }

    postProgress(message, requestId) {
        self.postMessage({
            type: 'PROGRESS',
            message,
            requestId
        });
    }

    postError(error, requestId) {
        self.postMessage({
            type: 'ERROR',
            error,
            requestId
        });
    }
}

// Initialize worker
const searchWorker = new SearchWorker();

// Handle messages from main thread
self.onmessage = (event) => {
    searchWorker.handleMessage(event);
};

// Handle errors
self.onerror = (error) => {
    self.postMessage({
        type: 'ERROR',
        error: error.message || 'Unknown worker error'
    });
}; 