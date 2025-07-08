// module-manager.js - Sora Module Management System
// Handles importing, storing, and managing Sora source modules

class ModuleManager {
    constructor() {
        this.modules = new Map();
        this.selectedModuleId = null;
        this.loadStoredModules();
    }

    // Load modules from localStorage
    loadStoredModules() {
        try {
            // Check localStorage availability first (mobile browsers can disable it)
            if (!this.isStorageAvailable()) {
                console.warn('[ModuleManager] localStorage not available, using memory-only storage');
                return;
            }

            const storedModules = localStorage.getItem('sora_modules');
            const selectedModule = localStorage.getItem('sora_selected_module');
            
            if (storedModules) {
                const modulesData = JSON.parse(storedModules);
                for (const [id, moduleData] of Object.entries(modulesData)) {
                    this.modules.set(id, moduleData);
                }
                console.log(`[ModuleManager] Loaded ${this.modules.size} stored modules`);
            }
            
            if (selectedModule) {
                this.selectedModuleId = selectedModule;
                console.log(`[ModuleManager] Selected module: ${selectedModule}`);
            }
        } catch (error) {
            console.error('[ModuleManager] Error loading stored modules:', error);
            // On mobile, storage might be corrupted - try to clear and restart
            this.handleStorageError('load', error);
        }
    }

    // Save modules to localStorage with mobile-specific error handling
    saveModules() {
        try {
            if (!this.isStorageAvailable()) {
                console.warn('[ModuleManager] localStorage not available, modules will not persist');
                return false;
            }

            // Check storage quota before saving (important for mobile)
            const storageInfo = this.getStorageInfo();
            if (storageInfo.quotaExceeded) {
                console.warn('[ModuleManager] Storage quota exceeded, attempting cleanup');
                this.performStorageCleanup();
            }

            const modulesData = Object.fromEntries(this.modules);
            const moduleJson = JSON.stringify(modulesData);
            
            // Check if the data size is reasonable for mobile (under 5MB total)
            if (moduleJson.length > 5 * 1024 * 1024) {
                console.warn('[ModuleManager] Module data very large, consider removing unused modules');
            }

            localStorage.setItem('sora_modules', moduleJson);
            if (this.selectedModuleId) {
                localStorage.setItem('sora_selected_module', this.selectedModuleId);
            }
            
            console.log(`[ModuleManager] Saved ${this.modules.size} modules to storage (${Math.round(moduleJson.length / 1024)}KB)`);
            return true;
        } catch (error) {
            console.error('[ModuleManager] Error saving modules:', error);
            return this.handleStorageError('save', error);
        }
    }

    // Check if localStorage is available (mobile browsers may disable it)
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

    // Get storage usage information (important for mobile quota management)
    getStorageInfo() {
        const info = {
            available: this.isStorageAvailable(),
            quotaExceeded: false,
            usedSpace: 0,
            totalSpace: 0,
            usagePercentage: 0
        };

        if (!info.available) {
            return info;
        }

        try {
            // Calculate current usage
            let used = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    used += localStorage[key].length;
                }
            }
            info.usedSpace = used;

            // Mobile browsers typically have 5-10MB localStorage limit
            // We'll use 5MB as conservative estimate
            info.totalSpace = 5 * 1024 * 1024; // 5MB in bytes
            info.usagePercentage = Math.round((used / info.totalSpace) * 100);
            info.quotaExceeded = info.usagePercentage > 90; // Warning at 90%

        } catch (error) {
            console.warn('[ModuleManager] Could not calculate storage usage:', error);
        }

        return info;
    }

    // Handle storage errors with mobile-specific recovery
    handleStorageError(operation, error) {
        if (error.name === 'QuotaExceededError' || error.code === 22) {
            console.error('[ModuleManager] Storage quota exceeded - common on mobile browsers');
            
            // Try automatic cleanup
            if (operation === 'save') {
                const cleaned = this.performStorageCleanup();
                if (cleaned) {
                    try {
                        return this.saveModules(); // Retry save after cleanup
                    } catch (retryError) {
                        console.error('[ModuleManager] Save failed even after cleanup:', retryError);
                    }
                }
            }
            
            // Show user-friendly error for mobile
            if (window.app && window.app.log) {
                window.app.log('Storage full! Please remove some modules or clear browser data.', 'error');
            }
            return false;
        }

        if (error.name === 'SecurityError') {
            console.error('[ModuleManager] Storage access denied - possibly private browsing mode');
            if (window.app && window.app.log) {
                window.app.log('Storage disabled. Modules will not persist in private browsing mode.', 'warning');
            }
            return false;
        }

        // For corrupt storage, try to clear and recover
        if (operation === 'load' && error instanceof SyntaxError) {
            console.warn('[ModuleManager] Storage appears corrupted, clearing and starting fresh');
            try {
                localStorage.removeItem('sora_modules');
                localStorage.removeItem('sora_selected_module');
                return true;
            } catch (clearError) {
                console.error('[ModuleManager] Could not clear corrupted storage:', clearError);
            }
        }

        return false;
    }

    // Perform storage cleanup to free space (mobile-optimized)
    performStorageCleanup() {
        try {
            console.log('[ModuleManager] Performing storage cleanup for mobile device...');
            
            // Remove oldest modules first (LRU cleanup)
            const modules = Array.from(this.modules.entries());
            if (modules.length <= 1) {
                console.log('[ModuleManager] Cannot cleanup - only one module or none');
                return false;
            }

            // Sort by last access time (or import date if no access time)
            modules.sort((a, b) => {
                const aTime = a[1].metadata.lastAccess || a[1].metadata.importDate || '2000-01-01';
                const bTime = b[1].metadata.lastAccess || b[1].metadata.importDate || '2000-01-01';
                return new Date(aTime) - new Date(bTime);
            });

            // Remove oldest module (keep at least the selected one)
            const oldestId = modules[0][0];
            if (oldestId !== this.selectedModuleId) {
                this.modules.delete(oldestId);
                console.log(`[ModuleManager] Removed oldest module: ${modules[0][1].metadata.sourceName}`);
                
                if (window.app && window.app.log) {
                    window.app.log(`Cleaned up old module: ${modules[0][1].metadata.sourceName}`, 'info');
                }
                return true;
            }

            console.log('[ModuleManager] Could not cleanup - oldest module is currently selected');
            return false;
        } catch (error) {
            console.error('[ModuleManager] Cleanup failed:', error);
            return false;
        }
    }

    // Update module access time for LRU tracking
    updateModuleAccess(moduleId) {
        try {
            const module = this.modules.get(moduleId);
            if (module) {
                module.metadata.lastAccess = new Date().toISOString();
                this.saveModules(); // Save updated access time
            }
        } catch (error) {
            console.warn('[ModuleManager] Could not update module access time:', error);
        }
    }

    // Fetch module metadata from URL (similar to Sora's fetchModuleMetadata)
    async fetchModuleMetadata(moduleUrl) {
        try {
            console.log(`[ModuleManager] Fetching module metadata from: ${moduleUrl}`);
            
            const response = await fetch(moduleUrl, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'SoraWebTester/1.0'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const metadata = await response.json();
            
            // Validate required fields (similar to Sora's ModuleMetadata structure)
            const requiredFields = ['sourceName', 'version', 'language', 'author', 'baseUrl', 'scriptUrl'];
            for (const field of requiredFields) {
                if (!metadata[field]) {
                    throw new Error(`Missing required field: ${field}`);
                }
            }

            // Generate unique module ID
            const moduleId = this.generateModuleId(metadata.sourceName, metadata.version);
            
            return {
                id: moduleId,
                metadata: {
                    ...metadata,
                    importDate: new Date().toISOString(),
                    metadataUrl: moduleUrl
                }
            };

        } catch (error) {
            console.error('[ModuleManager] Error fetching module metadata:', error);
            throw new Error(`Failed to fetch module: ${error.message}`);
        }
    }

    // Fetch module script from scriptUrl
    async fetchModuleScript(scriptUrl) {
        try {
            console.log(`[ModuleManager] Fetching module script from: ${scriptUrl}`);
            
            const response = await fetch(scriptUrl, {
                headers: {
                    'Accept': 'application/javascript, text/javascript',
                    'User-Agent': 'SoraWebTester/1.0'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const script = await response.text();
            
            if (script.length === 0) {
                throw new Error('Empty script file');
            }

            return script;

        } catch (error) {
            console.error('[ModuleManager] Error fetching module script:', error);
            throw new Error(`Failed to fetch script: ${error.message}`);
        }
    }

    // Add module (similar to Sora's addModule function)
    async addModule(moduleUrl) {
        try {
            // Fetch metadata
            const moduleData = await this.fetchModuleMetadata(moduleUrl);
            
            // Check if module already exists
            if (this.modules.has(moduleData.id)) {
                throw new Error(`Module "${moduleData.metadata.sourceName}" v${moduleData.metadata.version} already exists`);
            }

            // Fetch script
            const script = await this.fetchModuleScript(moduleData.metadata.scriptUrl);
            moduleData.script = script;

            // Store module
            this.modules.set(moduleData.id, moduleData);
            const saved = this.saveModules();
            
            if (!saved) {
                throw new Error('Failed to save module to storage');
            }

            console.log(`[ModuleManager] Added module: ${moduleData.metadata.sourceName} v${moduleData.metadata.version}`);
            
            // Auto-select if it's the first module
            if (this.modules.size === 1) {
                this.selectModule(moduleData.id);
            }

            return moduleData;

        } catch (error) {
            console.error('[ModuleManager] Error adding module:', error);
            throw error;
        }
    }

    // Remove module
    removeModule(moduleId) {
        try {
            const module = this.modules.get(moduleId);
            if (!module) {
                throw new Error('Module not found');
            }

            this.modules.delete(moduleId);
            
            // If this was the selected module, clear selection
            if (this.selectedModuleId === moduleId) {
                this.selectedModuleId = null;
                if (this.isStorageAvailable()) {
                    localStorage.removeItem('sora_selected_module');
                }
            }

            this.saveModules();
            console.log(`[ModuleManager] Removed module: ${module.metadata.sourceName}`);
            
            return true;
        } catch (error) {
            console.error('[ModuleManager] Error removing module:', error);
            throw error;
        }
    }

    // Select module with access tracking
    selectModule(moduleId) {
        try {
            if (!this.modules.has(moduleId)) {
                throw new Error('Module not found');
            }

            this.selectedModuleId = moduleId;
            
            // Update access time for LRU tracking
            this.updateModuleAccess(moduleId);
            
            if (this.isStorageAvailable()) {
                localStorage.setItem('sora_selected_module', moduleId);
            }
            
            const module = this.modules.get(moduleId);
            console.log(`[ModuleManager] Selected module: ${module.metadata.sourceName}`);
            
            return module;
        } catch (error) {
            console.error('[ModuleManager] Error selecting module:', error);
            throw error;
        }
    }

    // Get selected module
    getSelectedModule() {
        if (this.selectedModuleId && this.modules.has(this.selectedModuleId)) {
            return this.modules.get(this.selectedModuleId);
        }
        return null;
    }

    // Get all modules
    getAllModules() {
        return Array.from(this.modules.values());
    }

    // Generate unique module ID
    generateModuleId(sourceName, version) {
        const cleanName = sourceName.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const cleanVersion = version.replace(/[^a-z0-9.]/g, '');
        return `${cleanName}_${cleanVersion}`;
    }

    // Check if module exists
    moduleExists(sourceName, version = null) {
        for (const module of this.modules.values()) {
            if (module.metadata.sourceName === sourceName) {
                if (version === null || module.metadata.version === version) {
                    return true;
                }
            }
        }
        return false;
    }

    // Update module
    async updateModule(moduleId) {
        try {
            const existingModule = this.modules.get(moduleId);
            if (!existingModule) {
                throw new Error('Module not found');
            }

            const metadataUrl = existingModule.metadata.metadataUrl;
            if (!metadataUrl) {
                throw new Error('No metadata URL available for update');
            }

            // Fetch updated data
            const updatedData = await this.fetchModuleMetadata(metadataUrl);
            const updatedScript = await this.fetchModuleScript(updatedData.metadata.scriptUrl);
            
            // Keep original import date
            updatedData.metadata.importDate = existingModule.metadata.importDate;
            updatedData.metadata.updateDate = new Date().toISOString();
            updatedData.script = updatedScript;

            // Update stored module
            this.modules.set(moduleId, updatedData);
            this.saveModules();

            console.log(`[ModuleManager] Updated module: ${updatedData.metadata.sourceName}`);
            return updatedData;

        } catch (error) {
            console.error('[ModuleManager] Error updating module:', error);
            throw error;
        }
    }

    // Export modules data
    exportModules() {
        const exportData = {
            modules: Object.fromEntries(this.modules),
            selectedModule: this.selectedModuleId,
            exportDate: new Date().toISOString()
        };
        return JSON.stringify(exportData, null, 2);
    }

    // Import modules data
    importModules(jsonData) {
        try {
            const importData = JSON.parse(jsonData);
            
            if (!importData.modules) {
                throw new Error('Invalid import data: missing modules');
            }

            let importCount = 0;
            for (const [id, moduleData] of Object.entries(importData.modules)) {
                if (!this.modules.has(id)) {
                    this.modules.set(id, moduleData);
                    importCount++;
                }
            }

            if (importData.selectedModule && this.modules.has(importData.selectedModule)) {
                this.selectedModuleId = importData.selectedModule;
            }

            this.saveModules();
            console.log(`[ModuleManager] Imported ${importCount} new modules`);
            
            return importCount;
        } catch (error) {
            console.error('[ModuleManager] Error importing modules:', error);
            throw error;
        }
    }
}

// Global module manager instance
window.moduleManager = new ModuleManager(); 