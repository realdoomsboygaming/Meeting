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
        }
    }

    // Save modules to localStorage
    saveModules() {
        try {
            const modulesData = Object.fromEntries(this.modules);
            localStorage.setItem('sora_modules', JSON.stringify(modulesData));
            if (this.selectedModuleId) {
                localStorage.setItem('sora_selected_module', this.selectedModuleId);
            }
            console.log(`[ModuleManager] Saved ${this.modules.size} modules to storage`);
        } catch (error) {
            console.error('[ModuleManager] Error saving modules:', error);
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
            this.saveModules();

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
                localStorage.removeItem('sora_selected_module');
            }

            this.saveModules();
            console.log(`[ModuleManager] Removed module: ${module.metadata.sourceName}`);
            
            return true;
        } catch (error) {
            console.error('[ModuleManager] Error removing module:', error);
            throw error;
        }
    }

    // Select module
    selectModule(moduleId) {
        try {
            if (!this.modules.has(moduleId)) {
                throw new Error('Module not found');
            }

            this.selectedModuleId = moduleId;
            localStorage.setItem('sora_selected_module', moduleId);
            
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