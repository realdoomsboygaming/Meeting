import { NetworkUtils } from '../core/network-utils.js';
import { URLUtils } from '../utils/url-utils.js';

/**
 * StreamsController - Handles stream URL extraction for video playback
 * Ported from Swift JSController-Streams.swift
 */
export class StreamsController {
    constructor(moduleExecutionManager) {
        this.moduleExecutionManager = moduleExecutionManager;
        this.networkUtils = new NetworkUtils();
        this.defaultTimeout = 15000; // 15 seconds timeout for stream extraction
    }

    /**
     * Stream result structure
     * @typedef {Object} StreamResult
     * @property {string[]|null} streams - Array of stream URLs
     * @property {string[]|null} subtitles - Array of subtitle URLs
     * @property {Object[]|null} sources - Array of stream objects with headers
     */

    /**
     * Fetch stream URL using URL-based extraction (HTML parsing)
     * @param {string} episodeUrl - Episode URL to extract streams from
     * @param {boolean} softsub - Whether to prefer soft subtitles
     * @param {Object} module - Module metadata
     * @returns {Promise<StreamResult>} Stream extraction result
     */
    async fetchStreamUrl(episodeUrl, softsub = false, module) {
        try {
            if (!URLUtils.isValidUrl(episodeUrl)) {
                console.error('StreamsController: Invalid episode URL:', episodeUrl);
                return { streams: null, subtitles: null, sources: null };
            }

            console.log('StreamsController: Fetching stream from:', episodeUrl);

            // Fetch HTML content using NetworkUtils
            const html = await this.networkUtils.fetchText(episodeUrl);
            
            if (!html) {
                console.error('StreamsController: No HTML content received');
                return { streams: null, subtitles: null, sources: null };
            }

            console.log('StreamsController: HTML content length:', html.length);

            // Execute the extractStreamUrl function
            const extractStreamUrlFunction = this.moduleExecutionManager.getFunction('extractStreamUrl');
            if (!extractStreamUrlFunction) {
                console.error('StreamsController: extractStreamUrl function not found');
                return { streams: null, subtitles: null, sources: null };
            }

            const result = await this.moduleExecutionManager.executeFunction('extractStreamUrl', [html]);
            
            if (!result) {
                console.error('StreamsController: No result from extractStreamUrl');
                return { streams: null, subtitles: null, sources: null };
            }

            return this.parseStreamResult(result);

        } catch (error) {
            console.error('StreamsController: Error in fetchStreamUrl:', error);
            return { streams: null, subtitles: null, sources: null };
        }
    }

    /**
     * Fetch stream URL using JavaScript-based extraction
     * @param {string} episodeUrl - Episode URL to extract streams from
     * @param {boolean} softsub - Whether to prefer soft subtitles
     * @param {Object} module - Module metadata
     * @returns {Promise<StreamResult>} Stream extraction result
     */
    async fetchStreamUrlJS(episodeUrl, softsub = false, module) {
        try {
            // Check for JavaScript exceptions in the execution context
            if (this.moduleExecutionManager.hasException()) {
                console.error('StreamsController: JavaScript exception in context');
                return { streams: null, subtitles: null, sources: null };
            }

            const extractStreamUrlFunction = this.moduleExecutionManager.getFunction('extractStreamUrl');
            if (!extractStreamUrlFunction) {
                console.error('StreamsController: extractStreamUrl function not found');
                return { streams: null, subtitles: null, sources: null };
            }

            console.log('StreamsController: Executing JS-based stream extraction for:', episodeUrl);

            // Execute with timeout handling
            const result = await this.executeWithTimeout(
                () => this.moduleExecutionManager.executeFunction('extractStreamUrl', [episodeUrl]),
                this.defaultTimeout,
                'extractStreamUrl'
            );

            if (!result) {
                console.error('StreamsController: No result from extractStreamUrl');
                return { streams: null, subtitles: null, sources: null };
            }

            // Check for Promise object detection
            if (typeof result === 'string' && result === '[object Promise]') {
                console.warn('StreamsController: Received Promise object instead of resolved value');
                return { streams: null, subtitles: null, sources: null };
            }

            return this.parseStreamResult(result);

        } catch (error) {
            console.error('StreamsController: Error in fetchStreamUrlJS:', error);
            return { streams: null, subtitles: null, sources: null };
        }
    }

    /**
     * Fetch stream URL using JavaScript with HTML pre-fetching
     * @param {string} episodeUrl - Episode URL to extract streams from
     * @param {boolean} softsub - Whether to prefer soft subtitles
     * @param {Object} module - Module metadata
     * @returns {Promise<StreamResult>} Stream extraction result
     */
    async fetchStreamUrlJSSecond(episodeUrl, softsub = false, module) {
        try {
            if (!URLUtils.isValidUrl(episodeUrl)) {
                console.error('StreamsController: Invalid episode URL in fetchStreamUrlJSSecond:', episodeUrl);
                return { streams: null, subtitles: null, sources: null };
            }

            console.log('StreamsController: Fetching HTML first for JS extraction from:', episodeUrl);

            // Fetch HTML content first
            const html = await this.networkUtils.fetchText(episodeUrl);
            
            if (!html) {
                console.error('StreamsController: Failed to fetch HTML data');
                return { streams: null, subtitles: null, sources: null };
            }

            // Check for JavaScript exceptions
            if (this.moduleExecutionManager.hasException()) {
                console.error('StreamsController: JavaScript exception in context');
                return { streams: null, subtitles: null, sources: null };
            }

            const extractStreamUrlFunction = this.moduleExecutionManager.getFunction('extractStreamUrl');
            if (!extractStreamUrlFunction) {
                console.error('StreamsController: extractStreamUrl function not found');
                return { streams: null, subtitles: null, sources: null };
            }

            console.log('StreamsController: Executing extractStreamUrl with HTML content');

            // Execute with the HTML content
            const result = await this.executeWithTimeout(
                () => this.moduleExecutionManager.executeFunction('extractStreamUrl', [html]),
                this.defaultTimeout,
                'extractStreamUrl'
            );

            if (!result) {
                console.error('StreamsController: No result from extractStreamUrl');
                return { streams: null, subtitles: null, sources: null };
            }

            // Check for Promise object detection
            if (typeof result === 'string' && result === '[object Promise]') {
                console.warn('StreamsController: Received Promise object instead of resolved value');
                return { streams: null, subtitles: null, sources: null };
            }

            return this.parseStreamResult(result);

        } catch (error) {
            console.error('StreamsController: Error in fetchStreamUrlJSSecond:', error);
            return { streams: null, subtitles: null, sources: null };
        }
    }

    /**
     * Parse stream extraction result
     * @param {any} result - Raw result from extractStreamUrl function
     * @returns {StreamResult} Parsed stream result
     */
    parseStreamResult(result) {
        try {
            let streams = null;
            let subtitles = null;
            let sources = null;

            // Handle JSON string result
            if (typeof result === 'string') {
                try {
                    const jsonData = JSON.parse(result);
                    return this.parseJsonStreamData(jsonData);
                } catch (parseError) {
                    // If not JSON, treat as single stream URL
                    console.log('StreamsController: Treating result as single stream URL');
                    return {
                        streams: [result],
                        subtitles: null,
                        sources: null
                    };
                }
            }

            // Handle direct object result
            if (typeof result === 'object' && result !== null) {
                if (Array.isArray(result)) {
                    // Array of strings (stream URLs)
                    console.log(`StreamsController: Found ${result.length} streams in array`);
                    return {
                        streams: result.filter(url => typeof url === 'string'),
                        subtitles: null,
                        sources: null
                    };
                } else {
                    // Object with streams/subtitles
                    return this.parseJsonStreamData(result);
                }
            }

            console.warn('StreamsController: Unrecognized result format:', typeof result);
            return { streams: null, subtitles: null, sources: null };

        } catch (error) {
            console.error('StreamsController: Error parsing stream result:', error);
            return { streams: null, subtitles: null, sources: null };
        }
    }

    /**
     * Parse JSON stream data object
     * @param {Object} jsonData - JSON data containing streams and subtitles
     * @returns {StreamResult} Parsed stream result
     */
    parseJsonStreamData(jsonData) {
        let streamUrls = null;
        let subtitleUrls = null;
        let streamUrlsAndHeaders = null;

        // Handle streams with headers (priority)
        if (jsonData.streams && Array.isArray(jsonData.streams) && 
            jsonData.streams.length > 0 && typeof jsonData.streams[0] === 'object') {
            streamUrlsAndHeaders = jsonData.streams;
            console.log(`StreamsController: Found ${streamUrlsAndHeaders.length} streams with headers`);
        } 
        // Handle single stream with headers
        else if (jsonData.stream && typeof jsonData.stream === 'object') {
            streamUrlsAndHeaders = [jsonData.stream];
            console.log('StreamsController: Found single stream with headers');
        }
        // Handle streams as string array
        else if (jsonData.streams && Array.isArray(jsonData.streams)) {
            streamUrls = jsonData.streams.filter(url => typeof url === 'string');
            console.log(`StreamsController: Found ${streamUrls.length} streams`);
        }
        // Handle single stream as string
        else if (jsonData.stream && typeof jsonData.stream === 'string') {
            streamUrls = [jsonData.stream];
            console.log('StreamsController: Found single stream');
        }

        // Handle subtitles
        if (jsonData.subtitles) {
            if (Array.isArray(jsonData.subtitles)) {
                subtitleUrls = jsonData.subtitles.filter(url => typeof url === 'string');
                console.log(`StreamsController: Found ${subtitleUrls.length} subtitle tracks`);
            } else if (typeof jsonData.subtitles === 'string') {
                subtitleUrls = [jsonData.subtitles];
                console.log('StreamsController: Found single subtitle track');
            }
        }

        console.log(`StreamsController: Parsed result - ${streamUrls?.length || 0} streams, ${subtitleUrls?.length || 0} subtitles, ${streamUrlsAndHeaders?.length || 0} sources with headers`);

        return {
            streams: streamUrls,
            subtitles: subtitleUrls,
            sources: streamUrlsAndHeaders
        };
    }

    /**
     * Execute a function with timeout
     * @param {Function} func - Function to execute
     * @param {number} timeout - Timeout in milliseconds
     * @param {string} name - Function name for logging
     * @returns {Promise} Promise that resolves with function result or rejects on timeout
     */
    async executeWithTimeout(func, timeout, name) {
        return new Promise(async (resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Timeout: ${name} exceeded ${timeout}ms`));
            }, timeout);

            try {
                const result = await func();
                clearTimeout(timeoutId);
                resolve(result);
            } catch (error) {
                clearTimeout(timeoutId);
                reject(error);
            }
        });
    }

    /**
     * Enhanced stream extraction that tries multiple methods
     * @param {string} episodeUrl - Episode URL to extract streams from
     * @param {boolean} softsub - Whether to prefer soft subtitles
     * @param {Object} module - Module metadata
     * @returns {Promise<StreamResult>} Stream extraction result
     */
    async extractStreamUrl(episodeUrl, softsub = false, module) {
        if (!episodeUrl || typeof episodeUrl !== 'string' || episodeUrl.trim().length === 0) {
            console.warn('StreamsController: Empty or invalid episode URL');
            return { streams: null, subtitles: null, sources: null };
        }

        console.log(`StreamsController: Starting stream extraction for: ${episodeUrl}`);

        // Try JS-based extraction first (most flexible)
        const jsResults = await this.fetchStreamUrlJS(episodeUrl, softsub, module);
        if (jsResults.streams || jsResults.sources) {
            return jsResults;
        }

        // Try alternative JS method with HTML pre-fetching
        console.log('StreamsController: Trying alternative JS method with HTML pre-fetching');
        const jsSecondResults = await this.fetchStreamUrlJSSecond(episodeUrl, softsub, module);
        if (jsSecondResults.streams || jsSecondResults.sources) {
            return jsSecondResults;
        }

        // Fall back to URL-based extraction
        console.log('StreamsController: Falling back to URL-based extraction');
        const urlResults = await this.fetchStreamUrl(episodeUrl, softsub, module);
        return urlResults;
    }

    /**
     * Validate stream URLs
     * @param {StreamResult} streamResult - Stream result to validate
     * @returns {StreamResult} Validated stream result
     */
    validateStreamUrls(streamResult) {
        const validated = {
            streams: null,
            subtitles: null,
            sources: null
        };

        // Validate streams
        if (streamResult.streams && Array.isArray(streamResult.streams)) {
            validated.streams = streamResult.streams.filter(url => 
                typeof url === 'string' && url.trim().length > 0 && URLUtils.isValidUrl(url)
            );
        }

        // Validate subtitles
        if (streamResult.subtitles && Array.isArray(streamResult.subtitles)) {
            validated.subtitles = streamResult.subtitles.filter(url => 
                typeof url === 'string' && url.trim().length > 0 && URLUtils.isValidUrl(url)
            );
        }

        // Validate sources
        if (streamResult.sources && Array.isArray(streamResult.sources)) {
            validated.sources = streamResult.sources.filter(source => 
                source && typeof source === 'object' && 
                source.url && typeof source.url === 'string' && URLUtils.isValidUrl(source.url)
            );
        }

        return validated;
    }

    /**
     * Get best quality stream from sources
     * @param {StreamResult} streamResult - Stream result
     * @returns {Object|null} Best quality stream source
     */
    getBestQualityStream(streamResult) {
        if (!streamResult.sources || !Array.isArray(streamResult.sources)) {
            return null;
        }

        // Sort by quality (assuming higher numbers = better quality)
        const sorted = streamResult.sources.sort((a, b) => {
            const qualityA = this.parseQuality(a.quality || a.label || '');
            const qualityB = this.parseQuality(b.quality || b.label || '');
            return qualityB - qualityA;
        });

        return sorted[0] || null;
    }

    /**
     * Parse quality string to numeric value
     * @param {string} qualityStr - Quality string (e.g., "1080p", "720p")
     * @returns {number} Numeric quality value
     */
    parseQuality(qualityStr) {
        if (!qualityStr || typeof qualityStr !== 'string') {
            return 0;
        }

        const match = qualityStr.match(/(\d+)p?/i);
        return match ? parseInt(match[1], 10) : 0;
    }

    /**
     * Set timeout for operations
     * @param {number} timeout - Timeout in milliseconds
     */
    setTimeout(timeout) {
        this.defaultTimeout = timeout;
        console.log(`StreamsController: Timeout set to ${timeout}ms`);
    }
} 