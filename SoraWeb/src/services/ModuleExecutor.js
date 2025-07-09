import { useModuleStore } from '../stores/module-store'
import { useSettingsStore } from '../stores/settings-store'
import Logger from '../utils/Logger'

class ModuleExecutor {
  constructor() {
    // Initialize stores when needed instead of in constructor
    this.moduleStore = null
    this.settingsStore = null
    this.workerPool = new Map()
    this.maxWorkers = 4 // Limit concurrent workers
    this.timeout = 30000 // 30 second timeout
  }

  /**
   * Initialize the module store
   * This should be called after Pinia is ready
   */
  initializeStore() {
    if (!this.moduleStore) {
      try {
        this.moduleStore = useModuleStore()
        this.settingsStore = useSettingsStore()
      } catch (error) {
        Logger.error('Failed to initialize module store:', error)
        throw new Error('Failed to initialize module store. Make sure Pinia is properly set up.')
      }
    }
  }

  /**
   * Execute a module operation
   * @param {string} moduleId - ID of the module to execute
   * @param {string} operation - Operation to execute (search, fetch, etc)
   * @param {Object} params - Parameters for the operation
   * @returns {Promise<any>} Operation result
   */
  async executeOperation(moduleId, operation, params = {}) {
    this.initializeStore() // Ensure store is initialized

    try {
      // Get module script
      const script = this.moduleStore.getModuleScript(moduleId)
      if (!script) {
        throw new Error(`No script found for module ${moduleId}`)
      }

      // Create or get worker
      const worker = await this.getWorker(moduleId)

      // Track performance
      const startTime = performance.now()

      try {
        // Execute operation with timeout
        const result = await Promise.race([
          this.executeInWorker(worker, operation, params),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Operation timed out')), this.timeout)
          )
        ])

        // Record successful performance
        const duration = performance.now() - startTime
        this.moduleStore.recordModulePerformance(moduleId, operation, duration, true)

        return result

      } catch (error) {
        // Record failed performance
        const duration = performance.now() - startTime
        this.moduleStore.recordModulePerformance(moduleId, operation, duration, false)

        // Clean up failed worker
        this.terminateWorker(moduleId)
        throw error
      }
    } catch (error) {
      Logger.error(`Failed to execute ${operation} for module ${moduleId}:`, error)
      throw error
    }
  }

  /**
   * Get or create a worker for a module
   * @param {string} moduleId - ID of the module
   * @returns {Promise<Worker>} Worker instance
   */
  async getWorker(moduleId) {
    // Check if worker exists and is healthy
    if (this.workerPool.has(moduleId)) {
      return this.workerPool.get(moduleId)
    }

    // Check worker pool size
    if (this.workerPool.size >= this.maxWorkers) {
      // Terminate oldest worker
      const oldestModuleId = this.workerPool.keys().next().value
      this.terminateWorker(oldestModuleId)
    }

    // Create new worker
    const worker = new Worker(new URL('../workers/module-worker.js', import.meta.url))

    // Initialize worker with module script and settings
    const script = this.moduleStore.getModuleScript(moduleId)
    const corsProxyUrl = this.settingsStore.corsProxyUrl
    await this.executeInWorker(worker, 'initialize', { script, corsProxyUrl })

    // Add to pool
    this.workerPool.set(moduleId, worker)
    return worker
  }

  /**
   * Execute search operation using a module
   * @param {Object} module - Module to execute search with
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Search results
   */
  async executeSearch(module, query, options = {}) {
    this.initializeStore(); // Ensure store is initialized for proxy access
    try {
      Logger.info(`Executing search for query: "${query}" with module: ${module.metadata.sourceName}`)
      
      let results;
      // Handle "Async" modules, which perform their own fetching.
      if (module.metadata.asyncJS) {
        results = await this.executeOperation(module.id, 'search', {
          query,
          options
        });
      } 
      // Handle "Normal" modules, which require us to fetch HTML for them.
      else {
        let searchUrl = module.metadata.searchBaseUrl.replace('%s', encodeURIComponent(query));
        
        // Apply CORS proxy to the fetch call made outside the worker
        const proxyUrl = this.settingsStore.corsProxyUrl;
        if (proxyUrl) {
          searchUrl = `${proxyUrl}${searchUrl}`;
        }

        const response = await fetch(searchUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch search page: ${response.statusText}`);
        }
        const html = await response.text();
        results = await this.executeOperation(module.id, 'search_html', {
          html,
          options
        });
      }
      
      Logger.info(`Search completed. Found ${results.length} results`);
      return results;
      
    } catch (error) {
      Logger.error(`Search execution failed for module ${module.metadata.sourceName}:`, error)
      throw error
    }
  }

  /**
   * Execute content details fetching using a module
   * @param {Object} module - Module to execute with
   * @param {Object} request - Request object containing 'href'
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} Content details
   */
  async executeDetails(module, request, options = {}) {
    const { href } = request;
    if (!href) {
      throw new Error('executeDetails requires a `href` property in the request object.');
    }
    
    try {
      Logger.info(`Fetching details for URL: ${href} with module: ${module.metadata.sourceName}`)
      
      let details;
      if (module.metadata.asyncJS) {
        details = await this.executeOperation(module.id, 'details', {
          href,
          options
        });
      } else {
        // Handle "Normal" modules, which require us to fetch HTML for them.
        let detailsUrl = href;
        
        // Apply CORS proxy to the fetch call made outside the worker
        const proxyUrl = this.settingsStore.corsProxyUrl;
        if (proxyUrl) {
          detailsUrl = `${proxyUrl}${detailsUrl}`;
        }

        const response = await fetch(detailsUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch details page: ${response.statusText}`);
        }
        const html = await response.text();
        details = await this.executeOperation(module.id, 'details_html', {
          html,
          options
        });
      }
      
      Logger.info(`Details fetched successfully`)
      return details
      
    } catch (error) {
      Logger.error(`Details execution failed for module ${module.metadata.sourceName}:`, error)
      throw error
    }
  }

  /**
   * Execute content fetching using a module
   * @param {Object} module - Module to execute with
   * @param {string} url - Content URL
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} Content data
   */
  async executeFetch(module, url, options = {}) {
    try {
      Logger.info(`Fetching content for URL: ${url} with module: ${module.metadata.sourceName}`)
      
      const content = await this.executeOperation(module.id, 'fetch', {
        url,
        options
      })
      
      Logger.info(`Content fetched successfully`)
      return content
      
    } catch (error) {
      Logger.error(`Fetch execution failed for module ${module.metadata.sourceName}:`, error)
      throw error
    }
  }

  /**
   * Extract a playable stream URL from an episode/page URL using the module worker.
   * @param {Object} module - Module to execute with
   * @param {string} url - The episode/page URL
   * @param {Object} options - Extraction options
   * @returns {Promise<Object>} Stream info (URL, qualities, subtitles, etc)
   */
  async extractStreamUrl(module, url, options = {}) {
    this.initializeStore();
    try {
      Logger.info(`Extracting stream URL for: ${url} with module: ${module.metadata.sourceName}`)
      
      const streamInfo = await this.executeOperation(module.id, 'stream_url', {
        url,
        options,
        corsProxyUrl: this.settingsStore.corsProxyUrl // Pass CORS proxy URL to worker
      })
      
      Logger.info(`Stream URL extracted successfully`)
      return streamInfo
      
    } catch (error) {
      Logger.error(`Stream URL extraction failed for module ${module.metadata.sourceName}:`, error)
      throw error
    }
  }

  /**
   * Execute an operation in a worker
   * @param {Worker} worker - Worker to execute in
   * @param {string} operation - Operation to execute
   * @param {Object} params - Operation parameters
   * @returns {Promise<any>} Operation result
   */
  executeInWorker(worker, operation, params) {
    return new Promise((resolve, reject) => {
      const messageHandler = (event) => {
        // Handle log messages from the worker
        if (event.data.type === 'log') {
          Logger.info(`[Worker - ${event.data.level || 'info'}]`, ...event.data.args);
          return; // Keep listening for the final result
        }
        
        // Handle final result or error
        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          resolve(event.data.result);
        }

        // Clean up listeners
        worker.removeEventListener('message', messageHandler);
        worker.removeEventListener('error', errorHandler);
      };

      const errorHandler = (error) => {
        reject(error);
        // Clean up listeners
        worker.removeEventListener('message', messageHandler);
        worker.removeEventListener('error', errorHandler);
      };

      worker.addEventListener('message', messageHandler);
      worker.addEventListener('error', errorHandler);

      worker.postMessage({
        operation,
        params
      });
    });
  }

  /**
   * Terminate and remove a worker from the pool
   * @param {string} moduleId - ID of the module to terminate
   */
  terminateWorker(moduleId) {
    const worker = this.workerPool.get(moduleId)
    if (worker) {
      worker.terminate()
      this.workerPool.delete(moduleId)
      Logger.info(`Terminated worker for module: ${moduleId}`)
    }
  }

  /**
   * Terminate all workers
   */
  terminateAllWorkers() {
    for (const moduleId of this.workerPool.keys()) {
      this.terminateWorker(moduleId)
    }
    Logger.info('All workers terminated.')
  }
}

export default new ModuleExecutor() 