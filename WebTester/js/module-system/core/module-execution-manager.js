/**
 * Module Execution Manager for Sora Module System
 * Ported from Swift JSController functionality
 * Handles JavaScript execution environment and module loading
 * Note: Different from existing module-manager.js which handles import/storage
 */

import { SearchItem, MediaItem, EpisodeLink, DataModelUtils } from './data-models.js';
import { networkUtils, PromiseUtils } from './network-utils.js';
import { settingsManager } from './settings-manager.js';

/**
 * Module execution context for isolating module JavaScript
 */
class ModuleContext {
    constructor(moduleId, moduleName) {
        this.moduleId = moduleId;
        this.moduleName = moduleName;
        this.functions = new Map();
        this.variables = new Map();
        this.consoleMessages = [];
        this.lastActivity = Date.now();
        this.isActive = true;
        
        this.setupConsole();
        this.setupFetch();
    }

    /**
     * Setup console logging (ported from Swift setupConsoleLogging)
     */
    setupConsole() {
        this.console = {
            log: (message) => {
                const logEntry = {
                    type: 'log',
                    message: String(message),
                    timestamp: new Date().toISOString(),
                    moduleId: this.moduleId
                };
                this.consoleMessages.push(logEntry);
                console.log(`[Module:${this.moduleName}]`, message);
                this.updateActivity();
            },
            error: (message) => {
                const logEntry = {
                    type: 'error',
                    message: String(message),
                    timestamp: new Date().toISOString(),
                    moduleId: this.moduleId
                };
                this.consoleMessages.push(logEntry);
                console.error(`[Module:${this.moduleName}]`, message);
                this.updateActivity();
            },
            warn: (message) => {
                const logEntry = {
                    type: 'warn',
                    message: String(message),
                    timestamp: new Date().toISOString(),
                    moduleId: this.moduleId
                };
                this.consoleMessages.push(logEntry);
                console.warn(`[Module:${this.moduleName}]`, message);
                this.updateActivity();
            }
        };
    }

    /**
     * Setup fetch functionality (ported from Swift setupNativeFetch)
     */
    setupFetch() {
        this.fetch = async (url, headers = null) => {
            this.updateActivity();
            
            try {
                const options = {
                    headers: headers || {}
                };
                
                const response = await networkUtils.fetchText(url, options);
                return response;
            } catch (error) {
                this.console.error(`Fetch error: ${error.message}`);
                throw error;
            }
        };

        // Enhanced fetch with more options (ported from Swift setupFetchV2)
        this.fetchV2 = async (url, headers = null, method = 'GET', body = null, redirect = true, encoding = 'utf-8') => {
            this.updateActivity();
            
            try {
                const options = {
                    method: method,
                    headers: headers || {},
                    body: body,
                    redirect: redirect,
                    encoding: encoding
                };
                
                const response = await networkUtils.fetchText(url, options);
                return response;
            } catch (error) {
                this.console.error(`FetchV2 error: ${error.message}`);
                throw error;
            }
        };
    }

    /**
     * Update last activity timestamp
     */
    updateActivity() {
        this.lastActivity = Date.now();
    }

    /**
     * Register a function from module execution
     */
    registerFunction(name, func) {
        this.functions.set(name, func);
        this.updateActivity();
    }

    /**
     * Get a registered function
     */
    getFunction(name) {
        return this.functions.get(name);
    }

    /**
     * Check if function exists
     */
    hasFunction(name) {
        return this.functions.has(name);
    }

    /**
     * Set a variable in module context
     */
    setVariable(name, value) {
        this.variables.set(name, value);
        this.updateActivity();
    }

    /**
     * Get a variable from module context
     */
    getVariable(name) {
        return this.variables.get(name);
    }

    /**
     * Clear console messages (keep only recent ones)
     */
    clearOldMessages(maxAge = 300000) { // 5 minutes
        const cutoff = Date.now() - maxAge;
        this.consoleMessages = this.consoleMessages.filter(
            msg => new Date(msg.timestamp).getTime() > cutoff
        );
    }

    /**
     * Destroy context and cleanup
     */
    destroy() {
        this.isActive = false;
        this.functions.clear();
        this.variables.clear();
        this.consoleMessages = [];
    }
}

/**
 * Module Execution Manager class
 * Swift equivalent: JSController
 */
export class ModuleExecutionManager {
    constructor() {
        this.contexts = new Map();
        this.activeContextId = null;
        this.exceptionHandler = this.defaultExceptionHandler;
        this.timeoutMs = 30000; // 30 seconds default timeout
        this.maxContexts = 10; // Limit number of active contexts
        
        this.initializeManager();
    }

    /**
     * Initialize the execution manager
     */
    initializeManager() {
        // Setup periodic cleanup
        setInterval(() => {
            this.cleanupInactiveContexts();
        }, 60000); // Every minute
    }

    /**
     * Load and execute a module script
     * Swift equivalent: loadScript()
     */
    async loadScript(moduleId, moduleContent, moduleName = 'Unknown') {
        try {
            // Remove existing context if present
            if (this.contexts.has(moduleId)) {
                this.contexts.get(moduleId).destroy();
            }

            // Check context limit
            if (this.contexts.size >= this.maxContexts) {
                this.cleanupOldestContext();
            }

            // Create new context
            const context = new ModuleContext(moduleId, moduleName);
            this.contexts.set(moduleId, context);
            this.activeContextId = moduleId;

            // Execute the module script in a controlled environment
            await this.executeModuleScript(context, moduleContent);
            
            console.log(`[ModuleExecutionManager] Successfully loaded module: ${moduleName}`);
            return true;
        } catch (error) {
            console.error(`[ModuleExecutionManager] Error loading module ${moduleName}:`, error);
            this.exceptionHandler(error, moduleId);
            return false;
        }
    }

    /**
     * Execute module script in a controlled environment
     */
    async executeModuleScript(context, moduleContent) {
        return new Promise((resolve, reject) => {
            try {
                // Create a function that will execute the module in a controlled scope
                const moduleExecutor = new Function(
                    'console',
                    'fetch',
                    'fetchV2',
                    'registerFunction',
                    'setVariable',
                    moduleContent + '\n\n' +
                    '// Auto-register common functions\n' +
                    'if (typeof searchResults === "function") registerFunction("searchResults", searchResults);\n' +
                    'if (typeof extractDetails === "function") registerFunction("extractDetails", extractDetails);\n' +
                    'if (typeof extractEpisodes === "function") registerFunction("extractEpisodes", extractEpisodes);\n' +
                    'if (typeof extractStreamUrl === "function") registerFunction("extractStreamUrl", extractStreamUrl);\n' +
                    'if (typeof extractChapters === "function") registerFunction("extractChapters", extractChapters);\n' +
                    'if (typeof extractText === "function") registerFunction("extractText", extractText);\n'
                );

                // Execute with controlled scope
                moduleExecutor.call(null,
                    context.console,
                    context.fetch,
                    context.fetchV2,
                    (name, func) => context.registerFunction(name, func),
                    (name, value) => context.setVariable(name, value)
                );

                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Call a function in a specific module context
     */
    async callModuleFunction(moduleId, functionName, ...args) {
        const context = this.contexts.get(moduleId);
        if (!context || !context.isActive) {
            throw new Error(`Module context ${moduleId} not found or inactive`);
        }

        const func = context.getFunction(functionName);
        if (!func) {
            throw new Error(`Function ${functionName} not found in module ${moduleId}`);
        }

        try {
            context.updateActivity();
            
            // Execute function with timeout
            const result = await PromiseUtils.withTimeout(
                Promise.resolve(func.apply(null, args)),
                this.timeoutMs,
                `Function ${functionName} timed out after ${this.timeoutMs}ms`
            );

            return result;
        } catch (error) {
            context.console.error(`Error executing ${functionName}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get active module context
     */
    getActiveContext() {
        if (!this.activeContextId) return null;
        return this.contexts.get(this.activeContextId);
    }

    /**
     * Get specific module context
     */
    getContext(moduleId) {
        return this.contexts.get(moduleId);
    }

    /**
     * Set active module context
     */
    setActiveContext(moduleId) {
        if (this.contexts.has(moduleId)) {
            this.activeContextId = moduleId;
            return true;
        }
        return false;
    }

    /**
     * Check if module has specific function
     */
    hasFunction(moduleId, functionName) {
        const context = this.contexts.get(moduleId);
        return context ? context.hasFunction(functionName) : false;
    }

    /**
     * Get all available functions for a module
     */
    getAvailableFunctions(moduleId) {
        const context = this.contexts.get(moduleId);
        if (!context) return [];
        
        return Array.from(context.functions.keys());
    }

    /**
     * Get console messages for a module
     */
    getConsoleMessages(moduleId, maxMessages = 100) {
        const context = this.contexts.get(moduleId);
        if (!context) return [];
        
        return context.consoleMessages.slice(-maxMessages);
    }

    /**
     * Clear console messages for a module
     */
    clearConsoleMessages(moduleId) {
        const context = this.contexts.get(moduleId);
        if (context) {
            context.consoleMessages = [];
        }
    }

    /**
     * Remove a module context
     */
    removeContext(moduleId) {
        const context = this.contexts.get(moduleId);
        if (context) {
            context.destroy();
            this.contexts.delete(moduleId);
            
            if (this.activeContextId === moduleId) {
                this.activeContextId = null;
            }
            
            return true;
        }
        return false;
    }

    /**
     * Cleanup inactive contexts
     */
    cleanupInactiveContexts() {
        const now = Date.now();
        const maxAge = 10 * 60 * 1000; // 10 minutes
        
        for (const [moduleId, context] of this.contexts.entries()) {
            if (now - context.lastActivity > maxAge) {
                console.log(`[ModuleExecutionManager] Cleaning up inactive context: ${context.moduleName}`);
                this.removeContext(moduleId);
            } else {
                // Clean old console messages
                context.clearOldMessages();
            }
        }
    }

    /**
     * Cleanup oldest context when limit is reached
     */
    cleanupOldestContext() {
        let oldestId = null;
        let oldestTime = Date.now();
        
        for (const [moduleId, context] of this.contexts.entries()) {
            if (context.lastActivity < oldestTime) {
                oldestTime = context.lastActivity;
                oldestId = moduleId;
            }
        }
        
        if (oldestId) {
            console.log(`[ModuleExecutionManager] Removing oldest context due to limit: ${oldestId}`);
            this.removeContext(oldestId);
        }
    }

    /**
     * Default exception handler
     */
    defaultExceptionHandler(error, moduleId = null) {
        const errorInfo = {
            message: error.message,
            stack: error.stack,
            moduleId: moduleId,
            timestamp: new Date().toISOString()
        };
        
        console.error('[ModuleExecutionManager] Exception:', errorInfo);
        
        // Store error in context if available
        if (moduleId) {
            const context = this.contexts.get(moduleId);
            if (context) {
                context.console.error(`Exception: ${error.message}`);
            }
        }
    }

    /**
     * Set custom exception handler
     */
    setExceptionHandler(handler) {
        this.exceptionHandler = handler;
    }

    /**
     * Get execution statistics
     */
    getStats() {
        const activeContexts = Array.from(this.contexts.values()).filter(ctx => ctx.isActive);
        
        return {
            totalContexts: this.contexts.size,
            activeContexts: activeContexts.length,
            activeContextId: this.activeContextId,
            memoryUsage: this.estimateMemoryUsage(),
            oldestActivity: activeContexts.length > 0 ? 
                Math.min(...activeContexts.map(ctx => ctx.lastActivity)) : null
        };
    }

    /**
     * Estimate memory usage (rough calculation)
     */
    estimateMemoryUsage() {
        let totalSize = 0;
        
        for (const context of this.contexts.values()) {
            totalSize += context.functions.size * 1000; // Rough estimate per function
            totalSize += context.variables.size * 100; // Rough estimate per variable
            totalSize += context.consoleMessages.length * 200; // Rough estimate per message
        }
        
        return totalSize;
    }

    /**
     * Destroy all contexts and cleanup
     */
    destroy() {
        for (const context of this.contexts.values()) {
            context.destroy();
        }
        this.contexts.clear();
        this.activeContextId = null;
    }
}

// Create singleton instance
export const moduleExecutionManager = new ModuleExecutionManager();

/**
 * Convenience functions for module execution
 */
export const ModuleExecution = {
    // Load module
    loadModule: (moduleId, content, name) => moduleExecutionManager.loadScript(moduleId, content, name),
    
    // Call functions
    callFunction: (moduleId, funcName, ...args) => moduleExecutionManager.callModuleFunction(moduleId, funcName, ...args),
    
    // Context management
    setActive: (moduleId) => moduleExecutionManager.setActiveContext(moduleId),
    getActive: () => moduleExecutionManager.getActiveContext(),
    hasFunction: (moduleId, funcName) => moduleExecutionManager.hasFunction(moduleId, funcName),
    
    // Debugging
    getConsole: (moduleId) => moduleExecutionManager.getConsoleMessages(moduleId),
    clearConsole: (moduleId) => moduleExecutionManager.clearConsoleMessages(moduleId),
    getStats: () => moduleExecutionManager.getStats(),
    
    // Cleanup
    removeModule: (moduleId) => moduleExecutionManager.removeContext(moduleId),
    cleanup: () => moduleExecutionManager.cleanupInactiveContexts()
};

// Default export
export default {
    ModuleExecutionManager,
    moduleExecutionManager,
    ModuleExecution,
    ModuleContext
}; 