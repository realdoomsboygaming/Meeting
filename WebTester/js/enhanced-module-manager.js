// enhanced-module-manager.js - Enhanced module management using new module system
// Replaces the basic module-manager.js with integrated new architecture

import { SettingsManager } from './module-system/core/settings-manager.js';
import { NetworkUtils } from './module-system/core/network-utils.js';
import { ModuleExecutionManager } from './module-system/core/module-execution-manager.js';

class EnhancedModuleManager {
    constructor() {
        this.modules = new Map();
        this.selectedModuleId = null;
        this.settingsManager = new SettingsManager();
        this.networkUtils = new NetworkUtils();
        this.moduleExecutionManager = new ModuleExecutionManager();
        
        // Module validation and security
        this.moduleValidator = new ModuleValidator();
        
        // Cache and performance
        this.moduleCache = new Map();
        this.executionCache = new Map();
        this.lastCleanup = Date.now();
        
        // Storage monitoring
        this.storageQuota = 10 * 1024 * 1024; // 10MB default
        this.storageUsed = 0;
        
        // Event handling
        this.eventListeners = new Map();
        
        this.initialize();
    }

    async initialize() {
        try {
            await this.loadStoredModules();
            await this.updateStorageInfo();
            this.setupPeriodicMaintenance();
            console.log('[EnhancedModuleManager] Initialization complete');
        } catch (error) {
            console.error('[EnhancedModuleManager] Initialization failed:', error);
        }
    }

    // Enhanced module loading with validation and caching
    async loadStoredModules() {
        try {
            if (!this.isStorageAvailable()) {
                console.warn('[EnhancedModuleManager] localStorage not available, using memory-only storage');
                return;
            }

            const storedModules = this.settingsManager.get('modules', {});
            const selectedModule = this.settingsManager.get('selected_module', null);
            
            let loadedCount = 0;
            let validatedCount = 0;
            
            for (const [id, moduleData] of Object.entries(storedModules)) {
                try {
                    // Validate module integrity
                    if (await this.moduleValidator.validateModule(moduleData)) {
                        this.modules.set(id, moduleData);
                        validatedCount++;
                    } else {
                        console.warn(`[EnhancedModuleManager] Invalid module skipped: ${id}`);
                    }
                    loadedCount++;
                } catch (error) {
                    console.error(`[EnhancedModuleManager] Error validating module ${id}:`, error);
                }
            }
            
            if (selectedModule && this.modules.has(selectedModule)) {
                this.selectedModuleId = selectedModule;
            }
            
            console.log(`[EnhancedModuleManager] Loaded ${validatedCount}/${loadedCount} modules`);
            this.emit('modulesLoaded', { count: validatedCount });
            
        } catch (error) {
            console.error('[EnhancedModuleManager] Error loading stored modules:', error);
            await this.handleStorageError('load', error);
        }
    }

    // Enhanced module saving with compression and validation
    async saveModules() {
        try {
            if (!this.isStorageAvailable()) {
                console.warn('[EnhancedModuleManager] localStorage not available, modules will not persist');
                return false;
            }

            // Check storage quota before saving
            await this.updateStorageInfo();
            if (this.storageUsed > this.storageQuota * 0.9) {
                console.warn('[EnhancedModuleManager] Storage quota nearly exceeded, performing cleanup');
                await this.performIntelligentCleanup();
            }

            const modulesData = Object.fromEntries(this.modules);
            
            // Compress module data for storage efficiency
            const compressedData = await this.compressModuleData(modulesData);
            
            this.settingsManager.set('modules', compressedData);
            if (this.selectedModuleId) {
                this.settingsManager.set('selected_module', this.selectedModuleId);
            }
            
            const dataSize = JSON.stringify(compressedData).length;
            console.log(`[EnhancedModuleManager] Saved ${this.modules.size} modules (${Math.round(dataSize / 1024)}KB)`);
            
            this.emit('modulesSaved', { count: this.modules.size, size: dataSize });
            return true;
            
        } catch (error) {
            console.error('[EnhancedModuleManager] Error saving modules:', error);
            return await this.handleStorageError('save', error);
        }
    }

    // Enhanced module addition with security and validation
    async addModule(moduleUrl) {
        try {
            console.log(`[EnhancedModuleManager] Adding module from: ${moduleUrl}`);
            
            // Fetch and validate module metadata
            const moduleMetadata = await this.fetchModuleMetadata(moduleUrl);
            
            // Security validation
            await this.moduleValidator.validateModuleSource(moduleMetadata, moduleUrl);
            
            // Check for duplicates
            const existingId = this.findExistingModule(moduleMetadata);
            if (existingId) {
                console.log(`[EnhancedModuleManager] Module already exists: ${moduleMetadata.sourceName}`);
                return this.updateExistingModule(existingId, moduleMetadata);
            }

            // Fetch module script with timeout and validation
            const moduleScript = await this.fetchModuleScript(moduleMetadata.scriptUrl);
            
            // Validate script security
            await this.moduleValidator.validateModuleScript(moduleScript);
            
            // Create module data structure
            const moduleData = {
                metadata: {
                    ...moduleMetadata,
                    id: this.generateModuleId(moduleMetadata.sourceName, moduleMetadata.version),
                    importDate: new Date().toISOString(),
                    lastAccess: new Date().toISOString(),
                    importUrl: moduleUrl,
                    validated: true,
                    securityHash: await this.moduleValidator.generateSecurityHash(moduleScript)
                },
                script: moduleScript,
                performance: {
                    size: moduleScript.length,
                    loadTime: 0,
                    successRate: 0,
                    errorCount: 0
                }
            };

            // Test module execution before storing
            await this.testModuleExecution(moduleData);
            
            // Store module
            this.modules.set(moduleData.metadata.id, moduleData);
            await this.saveModules();
            
            console.log(`[EnhancedModuleManager] Module added successfully: ${moduleMetadata.sourceName}`);
            this.emit('moduleAdded', moduleData);
            
            return moduleData;
            
        } catch (error) {
            console.error(`[EnhancedModuleManager] Failed to add module: ${error.message}`);
            this.emit('moduleError', { url: moduleUrl, error: error.message });
            throw error;
        }
    }

    // Enhanced metadata fetching with retries and validation
    async fetchModuleMetadata(moduleUrl) {
        const maxRetries = 3;
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`[EnhancedModuleManager] Fetching metadata (attempt ${attempt}/${maxRetries})`);
                
                const response = await this.networkUtils.fetchWithTimeout(moduleUrl, {
                    timeout: 15000,
                    headers: {
                        'Accept': 'application/json',
                        'Cache-Control': 'no-cache'
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const metadata = await response.json();
                
                // Validate required fields
                this.validateMetadataStructure(metadata);
                
                return metadata;
                
            } catch (error) {
                lastError = error;
                console.warn(`[EnhancedModuleManager] Metadata fetch attempt ${attempt} failed:`, error.message);
                
                if (attempt < maxRetries) {
                    await this.delay(1000 * attempt); // Progressive backoff
                }
            }
        }
        
        throw new Error(`Failed to fetch module metadata after ${maxRetries} attempts: ${lastError.message}`);
    }

    // Enhanced script fetching with validation and caching
    async fetchModuleScript(scriptUrl) {
        try {
            // Check cache first
            if (this.moduleCache.has(scriptUrl)) {
                const cached = this.moduleCache.get(scriptUrl);
                if (Date.now() - cached.timestamp < 3600000) { // 1 hour cache
                    console.log('[EnhancedModuleManager] Using cached script');
                    return cached.script;
                }
            }

            console.log('[EnhancedModuleManager] Fetching module script...');
            
            const response = await this.networkUtils.fetchWithTimeout(scriptUrl, {
                timeout: 30000,
                headers: {
                    'Accept': 'application/javascript, text/javascript',
                    'Cache-Control': 'no-cache'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const script = await response.text();
            
            // Validate script content
            if (script.length < 100) {
                throw new Error('Script appears to be too small or empty');
            }
            
            if (script.includes('eval(') || script.includes('Function(')) {
                console.warn('[EnhancedModuleManager] Script contains potentially dangerous code');
            }

            // Cache the script
            this.moduleCache.set(scriptUrl, {
                script,
                timestamp: Date.now()
            });

            return script;
            
        } catch (error) {
            console.error('[EnhancedModuleManager] Script fetch failed:', error);
            throw new Error(`Failed to fetch module script: ${error.message}`);
        }
    }

    // Test module execution before storing
    async testModuleExecution(moduleData) {
        try {
            console.log('[EnhancedModuleManager] Testing module execution...');
            
            const startTime = Date.now();
            
            // Test basic module loading
            await this.moduleExecutionManager.validateModule(moduleData.metadata, moduleData.script);
            
            // Test search function if available
            if (moduleData.metadata.searchFunction) {
                await this.moduleExecutionManager.testFunction(
                    moduleData.metadata,
                    moduleData.script,
                    'search',
                    'test query'
                );
            }
            
            const loadTime = Date.now() - startTime;
            moduleData.performance.loadTime = loadTime;
            
            console.log(`[EnhancedModuleManager] Module test successful (${loadTime}ms)`);
            
        } catch (error) {
            console.error('[EnhancedModuleManager] Module test failed:', error);
            throw new Error(`Module execution test failed: ${error.message}`);
        }
    }

    // Enhanced module selection with performance tracking
    async selectModule(moduleId) {
        try {
            if (!this.modules.has(moduleId)) {
                throw new Error(`Module not found: ${moduleId}`);
            }

            const module = this.modules.get(moduleId);
            
            // Update access tracking
            module.metadata.lastAccess = new Date().toISOString();
            module.metadata.accessCount = (module.metadata.accessCount || 0) + 1;
            
            this.selectedModuleId = moduleId;
            
            // Preload module for better performance
            await this.preloadModule(module);
            
            await this.saveModules();
            
            console.log(`[EnhancedModuleManager] Module selected: ${module.metadata.sourceName}`);
            this.emit('moduleSelected', module);
            
            return module;
            
        } catch (error) {
            console.error('[EnhancedModuleManager] Module selection failed:', error);
            throw error;
        }
    }

    // Preload module for faster execution
    async preloadModule(module) {
        try {
            if (this.executionCache.has(module.metadata.id)) {
                return; // Already preloaded
            }

            const execution = await this.moduleExecutionManager.prepareModule(
                module.metadata,
                module.script
            );
            
            this.executionCache.set(module.metadata.id, {
                execution,
                timestamp: Date.now()
            });
            
            console.log(`[EnhancedModuleManager] Module preloaded: ${module.metadata.sourceName}`);
            
        } catch (error) {
            console.warn(`[EnhancedModuleManager] Module preload failed: ${error.message}`);
        }
    }

    // Enhanced module removal with cleanup
    async removeModule(moduleId) {
        try {
            if (!this.modules.has(moduleId)) {
                throw new Error(`Module not found: ${moduleId}`);
            }

            const module = this.modules.get(moduleId);
            const moduleName = module.metadata.sourceName;
            
            // Clear caches
            this.executionCache.delete(moduleId);
            if (module.metadata.scriptUrl) {
                this.moduleCache.delete(module.metadata.scriptUrl);
            }
            
            // Remove from storage
            this.modules.delete(moduleId);
            
            // Clear selection if this was the selected module
            if (this.selectedModuleId === moduleId) {
                this.selectedModuleId = null;
            }
            
            await this.saveModules();
            
            console.log(`[EnhancedModuleManager] Module removed: ${moduleName}`);
            this.emit('moduleRemoved', { id: moduleId, name: moduleName });
            
            return true;
            
        } catch (error) {
            console.error('[EnhancedModuleManager] Module removal failed:', error);
            throw error;
        }
    }

    // Intelligent cleanup based on usage patterns
    async performIntelligentCleanup() {
        try {
            console.log('[EnhancedModuleManager] Performing intelligent cleanup...');
            
            const modules = Array.from(this.modules.entries());
            if (modules.length <= 1) {
                console.log('[EnhancedModuleManager] Cannot cleanup - only one module or none');
                return false;
            }

            // Sort by usage score (combines last access, access count, and performance)
            modules.sort((a, b) => {
                const scoreA = this.calculateModuleScore(a[1]);
                const scoreB = this.calculateModuleScore(b[1]);
                return scoreA - scoreB; // Lower score = more likely to be removed
            });

            // Remove least used module (but not the selected one)
            const candidates = modules.filter(([id]) => id !== this.selectedModuleId);
            if (candidates.length === 0) {
                return false;
            }

            const [moduleId, module] = candidates[0];
            await this.removeModule(moduleId);
            
            console.log(`[EnhancedModuleManager] Cleaned up module: ${module.metadata.sourceName}`);
            this.emit('cleanupPerformed', { removedModule: module.metadata.sourceName });
            
            return true;
            
        } catch (error) {
            console.error('[EnhancedModuleManager] Cleanup failed:', error);
            return false;
        }
    }

    // Calculate module usage score for cleanup decisions
    calculateModuleScore(module) {
        const now = Date.now();
        const lastAccess = new Date(module.metadata.lastAccess || module.metadata.importDate).getTime();
        const daysSinceAccess = (now - lastAccess) / (1000 * 60 * 60 * 24);
        const accessCount = module.metadata.accessCount || 0;
        const successRate = module.performance?.successRate || 0;
        
        // Lower score = more likely to be removed
        return daysSinceAccess - (accessCount * 0.1) - (successRate * 10);
    }

    // Storage management
    async updateStorageInfo() {
        try {
            if (!this.isStorageAvailable()) return;
            
            let totalSize = 0;
            for (const key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    totalSize += localStorage[key].length;
                }
            }
            
            this.storageUsed = totalSize;
            
            // Estimate quota (browsers typically allow 5-10MB)
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                this.storageQuota = estimate.quota || this.storageQuota;
            }
            
        } catch (error) {
            console.warn('[EnhancedModuleManager] Could not update storage info:', error);
        }
    }

    // Data compression for storage efficiency
    async compressModuleData(data) {
        // Simple compression - remove unnecessary whitespace from scripts
        const compressed = { ...data };
        
        for (const [id, module] of Object.entries(compressed)) {
            if (module.script) {
                // Remove comments and unnecessary whitespace
                module.script = this.minifyScript(module.script);
            }
        }
        
        return compressed;
    }

    // Simple script minification
    minifyScript(script) {
        return script
            .replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* */ comments
            .replace(/\/\/.*$/gm, '') // Remove // comments
            .replace(/\s+/g, ' ') // Collapse whitespace
            .trim();
    }

    // Utility methods
    validateMetadataStructure(metadata) {
        const required = ['sourceName', 'scriptUrl', 'version'];
        const missing = required.filter(field => !metadata[field]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required metadata fields: ${missing.join(', ')}`);
        }
        
        if (!metadata.scriptUrl.startsWith('http')) {
            throw new Error('Script URL must be a valid HTTP(S) URL');
        }
    }

    findExistingModule(metadata) {
        for (const [id, module] of this.modules) {
            if (module.metadata.sourceName === metadata.sourceName) {
                return id;
            }
        }
        return null;
    }

    async updateExistingModule(moduleId, newMetadata) {
        const existingModule = this.modules.get(moduleId);
        
        // Check if update is needed
        if (existingModule.metadata.version === newMetadata.version) {
            console.log('[EnhancedModuleManager] Module is already up to date');
            return existingModule;
        }
        
        console.log('[EnhancedModuleManager] Updating existing module...');
        
        // Fetch new script
        const newScript = await this.fetchModuleScript(newMetadata.scriptUrl);
        
        // Update module data
        existingModule.metadata = {
            ...existingModule.metadata,
            ...newMetadata,
            lastUpdate: new Date().toISOString()
        };
        existingModule.script = newScript;
        
        // Clear cache
        this.executionCache.delete(moduleId);
        
        await this.saveModules();
        this.emit('moduleUpdated', existingModule);
        
        return existingModule;
    }

    generateModuleId(sourceName, version) {
        const base = `${sourceName}-${version}`.toLowerCase().replace(/[^a-z0-9]/g, '-');
        return `${base}-${Date.now()}`;
    }

    isStorageAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            return false;
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Setup periodic maintenance
    setupPeriodicMaintenance() {
        setInterval(async () => {
            try {
                await this.updateStorageInfo();
                
                // Clean cache every hour
                if (Date.now() - this.lastCleanup > 3600000) {
                    this.cleanupCache();
                    this.lastCleanup = Date.now();
                }
                
            } catch (error) {
                console.error('[EnhancedModuleManager] Maintenance error:', error);
            }
        }, 300000); // Every 5 minutes
    }

    cleanupCache() {
        const now = Date.now();
        const maxAge = 3600000; // 1 hour
        
        // Clean module cache
        for (const [url, cached] of this.moduleCache) {
            if (now - cached.timestamp > maxAge) {
                this.moduleCache.delete(url);
            }
        }
        
        // Clean execution cache
        for (const [id, cached] of this.executionCache) {
            if (now - cached.timestamp > maxAge) {
                this.executionCache.delete(id);
            }
        }
        
        console.log('[EnhancedModuleManager] Cache cleanup completed');
    }

    // Event handling
    on(event, listener) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(listener);
    }

    off(event, listener) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(listener);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(listener => {
                try {
                    listener(data);
                } catch (error) {
                    console.error(`[EnhancedModuleManager] Event listener error:`, error);
                }
            });
        }
    }

    // Handle storage errors with recovery strategies
    async handleStorageError(operation, error) {
        if (error.name === 'QuotaExceededError' || error.code === 22) {
            console.error('[EnhancedModuleManager] Storage quota exceeded');
            
            if (operation === 'save') {
                const cleaned = await this.performIntelligentCleanup();
                if (cleaned) {
                    try {
                        return await this.saveModules();
                    } catch (retryError) {
                        console.error('[EnhancedModuleManager] Save failed even after cleanup:', retryError);
                    }
                }
            }
            
            this.emit('storageError', { type: 'quota', operation });
            return false;
        }

        if (error.name === 'SecurityError') {
            console.error('[EnhancedModuleManager] Storage access denied');
            this.emit('storageError', { type: 'security', operation });
            return false;
        }

        if (operation === 'load' && error instanceof SyntaxError) {
            console.warn('[EnhancedModuleManager] Storage corrupted, clearing and starting fresh');
            try {
                this.settingsManager.remove('modules');
                this.settingsManager.remove('selected_module');
                return true;
            } catch (clearError) {
                console.error('[EnhancedModuleManager] Could not clear corrupted storage:', clearError);
            }
        }

        return false;
    }

    // Public API
    getAllModules() {
        return this.modules;
    }

    getSelectedModule() {
        return this.selectedModuleId ? this.modules.get(this.selectedModuleId) : null;
    }

    getModuleById(moduleId) {
        return this.modules.get(moduleId);
    }

    getStorageInfo() {
        return {
            used: this.storageUsed,
            quota: this.storageQuota,
            percentage: Math.round((this.storageUsed / this.storageQuota) * 100),
            moduleCount: this.modules.size
        };
    }
}

// Module validation class
class ModuleValidator {
    async validateModule(moduleData) {
        try {
            // Check required fields
            if (!moduleData.metadata || !moduleData.script) {
                return false;
            }
            
            // Check metadata structure
            const required = ['sourceName', 'version'];
            for (const field of required) {
                if (!moduleData.metadata[field]) {
                    return false;
                }
            }
            
            // Basic script validation
            if (typeof moduleData.script !== 'string' || moduleData.script.length < 50) {
                return false;
            }
            
            return true;
            
        } catch (error) {
            console.error('[ModuleValidator] Validation error:', error);
            return false;
        }
    }

    async validateModuleSource(metadata, sourceUrl) {
        // Basic URL validation
        try {
            new URL(sourceUrl);
        } catch (error) {
            throw new Error('Invalid source URL');
        }
        
        // Check for suspicious metadata
        if (metadata.sourceName && metadata.sourceName.length > 100) {
            throw new Error('Source name too long');
        }
        
        return true;
    }

    async validateModuleScript(script) {
        // Check for obviously malicious patterns
        const dangerousPatterns = [
            'document.cookie',
            'localStorage.clear',
            'sessionStorage.clear',
            'window.location',
            'eval(',
            'Function(',
            'XMLHttpRequest'
        ];
        
        for (const pattern of dangerousPatterns) {
            if (script.includes(pattern)) {
                console.warn(`[ModuleValidator] Potentially dangerous pattern found: ${pattern}`);
            }
        }
        
        return true;
    }

    async generateSecurityHash(script) {
        // Simple hash for integrity checking
        let hash = 0;
        for (let i = 0; i < script.length; i++) {
            const char = script.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(16);
    }
}

// Export for use in other modules
export { EnhancedModuleManager };

// Global instance for backwards compatibility
window.EnhancedModuleManager = EnhancedModuleManager; 