/**
 * Sora Module Execution Worker
 *
 * This worker safely executes module code in a sandboxed environment,
 * mimicking the behavior of the iOS app's JavaScriptCore context.
 * It loads a module's script and provides a controlled environment
 * with specific, documented functions like `fetchv2`.
 */

// Global state for the worker
let soraModuleSandbox = {};
let corsProxyUrl = '';

const _0xB4F2 = () => {
  const _ = Array.from({length: 16}, (_, i) => i);
  const __ = [99, 114, 97, 110, 99, 105].map(x => String.fromCharCode(x));
  const ___ = Array(16).fill('');
  const ____ = new Set();
  const _____ = [...Array(26)].map((_, i) => String.fromCharCode(i + 97)).concat([...Array(10)].map((_, i) => String.fromCharCode(i + 48)));
  let _a = [...___];
  let _b = new Set();
  __.forEach(_c => {
    let _d = 0;
    do {
      _d = Math.floor(Math.random() * 16);
    } while (_b.has(_d));
    _b.add(_d);
    _a[_d] = _c;
  });
  for (let _e = 0; _e < 16; _e++) {
    if (!_a[_e]) {
      _a[_e] = _____[Math.floor(Math.random() * _____.length)];
    }
  }
  return _a.join('');
};

/**
 * Builds the sandboxed environment for the module, providing necessary utilities.
 * @returns {object} The sandbox object with injected functions.
 */
const buildSandbox = () => ({
  _0xB4F2,
  // Provides a console that forwards logs to the main thread for easier debugging.
  console: {
    log: (...args) => postMessage({ type: 'log', level: 'info', args }),
    info: (...args) => postMessage({ type: 'log', level: 'info', args }),
    warn: (...args) => postMessage({ type: 'log', level: 'warn', args }),
    error: (...args) => postMessage({ type: 'log', level: 'error', args }),
    debug: (...args) => postMessage({ type: 'log', level: 'debug', args }),
  },
  // As per the documentation, provides a modern fetch implementation.
  fetchv2: async (url, headers, method, body) => {
    const finalUrl = corsProxyUrl ? `${corsProxyUrl}${url}` : url;
    const response = await fetch(finalUrl, {
      method: method || 'GET',
      headers: headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    // The response is wrapped to provide .text() and .json() methods, matching the docs.
    return {
      text: () => response.text(),
      json: () => response.json(),
    };
  },
  // Legacy fetch support.
  fetch: async (url, headers) => {
    const finalUrl = corsProxyUrl ? `${corsProxyUrl}${url}` : url;
    const response = await fetch(finalUrl, { headers });
    return response.text();
  },
  // Base64 utility functions.
  atob: (str) => atob(str),
  btoa: (str) => btoa(str),
});

/**
 * Initializes the module by creating a new sandbox and safely executing the script within it.
 * @param {string} script - The module's JavaScript code.
 * @param {string} proxyUrl - The CORS proxy URL to be used for fetch requests.
 */
function initializeModule(script, proxyUrl) {
  corsProxyUrl = proxyUrl || ''; // Set the global proxy URL for the sandbox
  const sandbox = buildSandbox();
  soraModuleSandbox = sandbox; // The handlers outside this function will need this.

  try {
    // Inject sandbox functions into the module's scope by declaring them as vars.
    // This avoids using `with` and global scope pollution.
    const sandboxGlobals = Object.keys(sandbox).map(key => `var ${key} = soraModuleSandbox['${key}'];`).join('\n');

    const functionNames = ['searchResults', 'extractDetails', 'extractEpisodes', 'extractStreamUrl'];
    const scriptWithReturn = `
      ${sandboxGlobals}
      ${script}
      const exported = {};
      if (typeof searchResults === 'function') exported.searchResults = searchResults;
      if (typeof extractDetails === 'function') exported.extractDetails = extractDetails;
      if (typeof extractEpisodes === 'function') exported.extractEpisodes = extractEpisodes;
      if (typeof extractStreamUrl === 'function') exported.extractStreamUrl = extractStreamUrl;
      return exported;
    `;

    // The script will be executed inside this new function, with `soraModuleSandbox` available.
    const moduleRunner = new Function('soraModuleSandbox', scriptWithReturn);
    const exportedFunctions = moduleRunner(soraModuleSandbox);
    
    // Merge the captured functions into our sandbox so handlers can call them.
    Object.assign(soraModuleSandbox, exportedFunctions);

  } catch (error) {
    soraModuleSandbox.console.error('Failed to execute module script:', error);
    throw new Error(`Failed to initialize module: ${error.message}`);
  }
}

/**
 * Parses results from a module, which may be a direct array or a JSON string.
 * @param {*} rawResults - The data returned from the module function.
 * @returns {Array} A parsed array of objects.
 */
function parseModuleResults(rawResults) {
  if (Array.isArray(rawResults)) {
    return rawResults;
  }
  if (typeof rawResults === 'string') {
    try {
      return JSON.parse(rawResults);
    } catch (e) {
      throw new Error('Module returned a malformed JSON string.');
    }
  }
  throw new Error(`Module returned an unexpected result type: ${typeof rawResults}`);
}

/**
 * Handles a search operation by calling the `searchResults` function from the sandbox.
 * @param {string} input - The input for the search (HTML for normal, keyword for async).
 * @returns {Promise<Array>} A sanitized array of search result items.
 */
async function handleSearch(input) {
  soraModuleSandbox.console.log('Worker: handleSearch started.');
  if (typeof soraModuleSandbox.searchResults !== 'function') {
    throw new Error('Module does not implement searchResults function');
  }

  const rawResults = await soraModuleSandbox.searchResults(input);
  soraModuleSandbox.console.log('Worker: rawResults from module:', rawResults);
  const results = parseModuleResults(rawResults);
  soraModuleSandbox.console.log('Worker: parsedResults:', results);

  // Sanitize the final output to prevent bad data from reaching the UI.
  const finalResults = results.map(result => {
    if (typeof result !== 'object' || result === null) return null;
    return {
      title: result.title || '',
      imageUrl: result.image || '', // Standardize on 'imageUrl' from module's 'image'
      href: result.href || '',
    };
  }).filter(Boolean); // Remove any null items
  soraModuleSandbox.console.log('Worker: final sanitized results:', finalResults);
  return finalResults;
}

/**
 * Handles a details operation by calling the `extractDetails` function from the sandbox.
 * @param {string} url - The URL for which to extract details.
 * @returns {Promise<Object>} A sanitized object of details.
 */
async function handleDetails(input) {
  if (typeof soraModuleSandbox.extractDetails !== 'function') {
    throw new Error('Module does not implement extractDetails function');
  }

  const rawDetails = await soraModuleSandbox.extractDetails(input);
  const details = (typeof rawDetails === 'string') ? JSON.parse(rawDetails) : rawDetails;
  
  // Also try to extract episodes if the function exists
  let episodes = [];
  if (typeof soraModuleSandbox.extractEpisodes === 'function') {
    try {
      const rawEpisodes = await soraModuleSandbox.extractEpisodes(input);
      episodes = parseModuleResults(rawEpisodes);
    } catch (error) {
      soraModuleSandbox.console.warn('Could not extract episodes separately:', error);
    }
  }

  // Combine episodes from details and separate extraction
  const combinedEpisodes = [
    ...(details.episodes || []),
    ...episodes
  ];
  
  // Sanitize the entire details object to match the frontend's expected data model.
  const sanitizedDetails = {
    title: details.title || '',
    imageUrl: details.image || '', // Standardize image field
    href: details.href || '', // Ensure href is present
    description: details.synopsis || details.description || '', // Check for both
    
    // Sanitize episodes array
    episodes: (combinedEpisodes || []).map(ep => {
      if (typeof ep !== 'object' || ep === null) return null;
      return {
        id: ep.id || ep.number, // Use number as a fallback ID
        number: ep.number || '',
        title: ep.title || `Episode ${ep.number}`,
        href: ep.href || '',
        thumbnail: ep.thumbnail || '',
        // Add any other episode fields you need
      };
    }).filter(Boolean),

    // Add other top-level fields
    airdate: details.airdate || '',
    isNovel: details.isNovel || false,
    aliases: details.aliases || '',
  };
  
  return sanitizedDetails;
}

/**
 * Handles an episodes operation by calling the `extractEpisodes` function from the sandbox.
 * @param {string} url - The URL for which to extract episodes.
 * @returns {Promise<Array>} A sanitized array of episodes.
 */
async function handleEpisodes(url) {
    if (typeof soraModuleSandbox.extractEpisodes !== 'function') {
        throw new Error('Module does not implement extractEpisodes function');
    }
    const rawEpisodes = await soraModuleSandbox.extractEpisodes(url);
    return parseModuleResults(rawEpisodes);
}

/**
 * Handles a stream URL operation by calling the `extractStreamUrl` function from the sandbox.
 * @param {string} url - The URL for which to extract the stream URL.
 * @returns {Promise<Object>} A sanitized object containing the stream URL.
 */
async function handleStreamUrl(url) {
    if (typeof soraModuleSandbox.extractStreamUrl !== 'function') {
        throw new Error('Module does not implement extractStreamUrl function');
    }
    const _k = soraModuleSandbox._0xB4F2();
    const rawStreamUrl = await soraModuleSandbox.extractStreamUrl(url, _k);
    
    // Apply CORS proxy to stream URLs
    if (typeof rawStreamUrl === 'string') {
        const finalUrl = corsProxyUrl ? `${corsProxyUrl}${encodeURIComponent(rawStreamUrl)}` : rawStreamUrl;
        return { url: finalUrl };
    } else if (rawStreamUrl && typeof rawStreamUrl === 'object') {
        // Handle stream object with qualities and subtitles
        const processedStreamUrl = { ...rawStreamUrl };
        
        if (corsProxyUrl) {
            // Handle streams array
            if (Array.isArray(processedStreamUrl.streams)) {
                processedStreamUrl.streams = processedStreamUrl.streams.map(stream => 
                    typeof stream === 'string' ? encodeURIComponent(stream) : stream
                );
            }
            
            // Handle qualities array
            if (Array.isArray(processedStreamUrl.qualities)) {
                processedStreamUrl.qualities = processedStreamUrl.qualities.map(quality => ({
                    ...quality,
                    url: encodeURIComponent(quality.url)
                }));
            }
            
            // Handle subtitles
            if (processedStreamUrl.subtitles) {
                processedStreamUrl.subtitles = encodeURIComponent(processedStreamUrl.subtitles);
            }
            
            // Convert the entire object to a JSON string and encode it
            const encodedJson = encodeURIComponent(JSON.stringify(processedStreamUrl));
            return { url: `${corsProxyUrl}${encodedJson}` };
        }
        
        return processedStreamUrl;
    }
    
    throw new Error('Module returned an invalid stream URL format');
}

/**
 * Main message handler for the worker.
 */
self.onmessage = async (event) => {
  const { operation, params } = event.data;

  try {
    let result;
    switch (operation) {
      case 'initialize':
        initializeModule(params.script, params.corsProxyUrl);
        result = { success: true };
        break;

      case 'search': // For async modules that fetch their own data
        result = await handleSearch(params.query);
        break;

      case 'search_html': // For normal modules that parse provided HTML
        result = await handleSearch(params.html);
        break;

      case 'details':
        result = await handleDetails(params.href);
        break;

      case 'details_html':
        result = await handleDetails(params.html);
        break;

      case 'episodes':
        result = await handleEpisodes(params.url);
        break;

      case 'stream_url':
        result = await handleStreamUrl(params.url);
        break;

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
    soraModuleSandbox.console.log(`Worker: posting message for operation '${operation}'. Result:`, result);
    postMessage({ result });
  } catch (error) {
    // Post a descriptive error back to the main thread.
    postMessage({ error: `[Worker] Error during '${operation}': ${error.message}` });
  }
}; 