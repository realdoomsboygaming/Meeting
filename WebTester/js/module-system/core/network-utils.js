/**
 * Network Utilities for Sora Module System
 * Ported from Swift URLSession with user-agent rotation
 * Integrates with existing WebTester CORS proxy system
 */

/**
 * User agents for rotation (ported from Swift)
 */
const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.2903.86",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.2849.80",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 15_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.2 Safari/605.1.15",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 15_1_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.1 Safari/605.1.15",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 15.1; rv:132.0) Gecko/20100101 Firefox/132.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 15.0; rv:131.0) Gecko/20100101 Firefox/131.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0",
    "Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0",
    "Mozilla/5.0 (Linux; Android 15; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.135 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.135 Mobile Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.2 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (iPad; CPU OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.2 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Android 15; Mobile; rv:132.0) Gecko/132.0 Firefox/132.0",
    "Mozilla/5.0 (Android 14; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0"
];

/**
 * Text encoding mapping for different character sets
 */
const ENCODING_MAP = {
    'utf-8': 'utf-8',
    'utf8': 'utf-8',
    'windows-1251': 'windows-1251',
    'cp1251': 'windows-1251',
    'windows-1252': 'windows-1252',
    'cp1252': 'windows-1252',
    'iso-8859-1': 'iso-8859-1',
    'latin1': 'iso-8859-1',
    'ascii': 'ascii',
    'utf-16': 'utf-16',
    'utf16': 'utf-16'
};

/**
 * Network utilities class integrating with WebTester CORS proxy
 */
export class NetworkUtils {
    constructor() {
        this.currentUserAgent = this.getRandomUserAgent();
        this.corsProxy = null;
        this.retryCount = 3;
        this.timeoutMs = 30000; // 30 seconds default timeout
        
        // Initialize CORS proxy if available in global scope
        this.initializeCorsProxy();
    }

    /**
     * Initialize CORS proxy integration
     */
    initializeCorsProxy() {
        // Check if WebTester CORS proxy is available
        if (typeof window !== 'undefined' && window.app) {
            // Use WebTester's existing CORS proxy methods
            this.corsProxy = {
                enabled: window.app.proxyTested || false,
                url: window.app.corsProxy || 'https://cors-anywhere.herokuapp.com/',
                testAccess: () => window.app.testCorsProxyAccess ? window.app.testCorsProxyAccess() : Promise.resolve(false),
                soraFetch: (url, options) => window.app.soraFetch ? window.app.soraFetch(url, options) : this.fallbackFetch(url, options)
            };
        }
    }

    /**
     * Get random user agent from the pool
     */
    getRandomUserAgent() {
        return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    }

    /**
     * Rotate user agent
     */
    rotateUserAgent() {
        this.currentUserAgent = this.getRandomUserAgent();
    }

    /**
     * Enhanced fetch with CORS proxy support
     * Swift equivalent: setupFetchV2()
     */
    async fetchWithProxy(url, options = {}) {
        const {
            method = 'GET',
            headers = {},
            body = null,
            redirect = true,
            encoding = 'utf-8',
            timeout = this.timeoutMs,
            retries = this.retryCount
        } = options;

        // Prepare headers with user agent
        const enhancedHeaders = {
            'User-Agent': this.currentUserAgent,
            ...headers
        };

        // Prepare fetch options
        const fetchOptions = {
            method: method.toUpperCase(),
            headers: enhancedHeaders,
            redirect: redirect ? 'follow' : 'manual'
        };

        // Add body for non-GET requests
        if (method.toUpperCase() !== 'GET' && body) {
            if (typeof body === 'string') {
                fetchOptions.body = body;
            } else if (body instanceof FormData) {
                fetchOptions.body = body;
            } else {
                fetchOptions.body = JSON.stringify(body);
                if (!enhancedHeaders['Content-Type']) {
                    enhancedHeaders['Content-Type'] = 'application/json';
                }
            }
        }

        // Use WebTester's CORS proxy if available
        if (this.corsProxy && this.corsProxy.soraFetch) {
            try {
                return await this.corsProxy.soraFetch(url, fetchOptions);
            } catch (error) {
                console.warn('[NetworkUtils] CORS proxy failed, falling back to direct fetch:', error);
            }
        }

        // Fallback to direct fetch with timeout
        return await this.fetchWithTimeout(url, fetchOptions, timeout);
    }

    /**
     * Fetch with timeout support
     */
    async fetchWithTimeout(url, options, timeout) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error(`Request timeout after ${timeout}ms`);
            }
            throw error;
        }
    }

    /**
     * Fallback fetch for when CORS proxy is not available
     */
    async fallbackFetch(url, options) {
        try {
            return await fetch(url, options);
        } catch (error) {
            // Try one more time with rotated user agent
            this.rotateUserAgent();
            const newOptions = {
                ...options,
                headers: {
                    ...options.headers,
                    'User-Agent': this.currentUserAgent
                }
            };
            return await fetch(url, newOptions);
        }
    }

    /**
     * Download text content with encoding support
     * Swift equivalent: fetchV2 with text encoding
     */
    async fetchText(url, options = {}) {
        const response = await this.fetchWithProxy(url, options);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const encoding = options.encoding || 'utf-8';
        const normalizedEncoding = this.getEncoding(encoding);

        try {
            // For UTF-8 and most encodings, use standard text()
            if (normalizedEncoding === 'utf-8') {
                return await response.text();
            }

            // For other encodings, try to decode if supported
            const arrayBuffer = await response.arrayBuffer();
            return this.decodeText(arrayBuffer, normalizedEncoding);
        } catch (error) {
            console.warn(`[NetworkUtils] Encoding ${encoding} not supported, falling back to UTF-8`);
            return await response.text();
        }
    }

    /**
     * Download JSON content
     */
    async fetchJSON(url, options = {}) {
        const response = await this.fetchWithProxy(url, options);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * Download binary content
     */
    async fetchBinary(url, options = {}) {
        const response = await this.fetchWithProxy(url, options);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.arrayBuffer();
    }

    /**
     * Get normalized encoding name
     */
    getEncoding(encodingString) {
        if (!encodingString) return 'utf-8';
        
        const normalized = encodingString.toLowerCase();
        return ENCODING_MAP[normalized] || 'utf-8';
    }

    /**
     * Decode text with specific encoding
     */
    decodeText(arrayBuffer, encoding) {
        if (typeof TextDecoder !== 'undefined') {
            try {
                const decoder = new TextDecoder(encoding);
                return decoder.decode(arrayBuffer);
            } catch (error) {
                console.warn(`[NetworkUtils] TextDecoder failed for ${encoding}:`, error);
            }
        }

        // Fallback to UTF-8
        const decoder = new TextDecoder('utf-8');
        return decoder.decode(arrayBuffer);
    }

    /**
     * Test CORS proxy availability
     */
    async testProxy() {
        if (this.corsProxy && this.corsProxy.testAccess) {
            try {
                const result = await this.corsProxy.testAccess();
                this.corsProxy.enabled = result;
                return result;
            } catch (error) {
                console.error('[NetworkUtils] CORS proxy test failed:', error);
                this.corsProxy.enabled = false;
                return false;
            }
        }
        return false;
    }

    /**
     * Check if URL needs CORS proxy
     */
    needsCorsProxy(url) {
        try {
            const urlObj = new URL(url);
            const currentOrigin = window.location.origin;
            return urlObj.origin !== currentOrigin;
        } catch {
            return false; // Invalid URL, let fetch handle it
        }
    }

    /**
     * Get status message for HTTP status codes
     */
    getStatusMessage(status) {
        const statusMessages = {
            200: 'OK',
            201: 'Created',
            204: 'No Content',
            301: 'Moved Permanently',
            302: 'Found',
            304: 'Not Modified',
            400: 'Bad Request',
            401: 'Unauthorized',
            403: 'Forbidden',
            404: 'Not Found',
            429: 'Too Many Requests',
            500: 'Internal Server Error',
            502: 'Bad Gateway',
            503: 'Service Unavailable',
            504: 'Gateway Timeout'
        };
        
        return statusMessages[status] || 'Unknown Status';
    }

    /**
     * Log network activity (for debugging)
     */
    logRequest(url, options, response = null, error = null) {
        const method = options.method || 'GET';
        const timestamp = new Date().toISOString();
        
        if (error) {
            console.error(`[NetworkUtils] ${timestamp} ${method} ${url} - ERROR:`, error);
        } else if (response) {
            console.log(`[NetworkUtils] ${timestamp} ${method} ${url} - ${response.status} ${this.getStatusMessage(response.status)}`);
        } else {
            console.log(`[NetworkUtils] ${timestamp} ${method} ${url} - Request started`);
        }
    }
}

/**
 * Promise utilities for handling complex async operations
 * Swift equivalent: DispatchGroup and continuation patterns
 */
export class PromiseUtils {
    /**
     * Promise with timeout
     */
    static withTimeout(promise, timeoutMs, errorMessage = 'Operation timed out') {
        return Promise.race([
            promise,
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
            )
        ]);
    }

    /**
     * Retry promise with exponential backoff
     */
    static async retry(fn, retries = 3, delay = 1000) {
        for (let i = 0; i < retries; i++) {
            try {
                return await fn();
            } catch (error) {
                if (i === retries - 1) throw error;
                
                const backoffDelay = delay * Math.pow(2, i);
                console.warn(`[PromiseUtils] Retry ${i + 1}/${retries} failed, retrying in ${backoffDelay}ms:`, error);
                await new Promise(resolve => setTimeout(resolve, backoffDelay));
            }
        }
    }

    /**
     * All settled with timeout for each promise
     */
    static async allSettledWithTimeout(promises, timeoutMs) {
        const wrappedPromises = promises.map(promise => 
            this.withTimeout(promise, timeoutMs, 'Individual promise timeout')
                .catch(error => ({ error }))
        );
        
        return await Promise.allSettled(wrappedPromises);
    }

    /**
     * Sequential execution of promises
     */
    static async sequential(promiseFunctions) {
        const results = [];
        for (const fn of promiseFunctions) {
            results.push(await fn());
        }
        return results;
    }
}

// Create singleton instance
export const networkUtils = new NetworkUtils();

// Convenience function matching Swift URLSession pattern
export const URLSession = {
    fetch: (url, options) => networkUtils.fetchWithProxy(url, options),
    fetchText: (url, options) => networkUtils.fetchText(url, options),
    fetchJSON: (url, options) => networkUtils.fetchJSON(url, options),
    fetchBinary: (url, options) => networkUtils.fetchBinary(url, options),
    testProxy: () => networkUtils.testProxy(),
    
    // User agent utilities
    getRandomUserAgent: () => networkUtils.getRandomUserAgent(),
    rotateUserAgent: () => networkUtils.rotateUserAgent(),
    getCurrentUserAgent: () => networkUtils.currentUserAgent
};

// Default export
export default {
    NetworkUtils,
    networkUtils,
    URLSession,
    PromiseUtils,
    USER_AGENTS
}; 