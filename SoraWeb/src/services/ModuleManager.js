import { useModuleStore } from '../stores/module-store'
import Logger from '../utils/Logger'

class ModuleManager {
  constructor() {
    // Initialize store when needed instead of in constructor
    this.moduleStore = null
    this.moduleCache = new Map()
  }

  /**
   * Initialize the module store
   * This should be called after Pinia is ready
   */
  initializeStore() {
    if (!this.moduleStore) {
      try {
        this.moduleStore = useModuleStore()
      } catch (error) {
        Logger.error('Failed to initialize module store:', error)
        throw new Error('Failed to initialize module store. Make sure Pinia is properly set up.')
      }
    }
  }

  /**
   * Log a message with type
   * @param {string} message - Message to log
   * @param {string} type - Log type (Info, Error, etc.)
   */
  log(message, type = 'Info') {
    Logger[type.toLowerCase()](message)
  }

  /**
   * Fetches module metadata from a URL
   * @param {string} metadataUrl - URL to the module metadata
   * @returns {Promise<ModuleMetadata>}
   */
  async fetchModuleMetadata(metadataUrl) {
    try {
      const response = await fetch(metadataUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch module metadata: ${response.statusText}`)
      }
      return await response.json()
    } catch (error) {
      this.log(`Error fetching module metadata: ${error.message}`, 'error')
      throw error
    }
  }

  /**
   * Downloads a module's script content
   * @param {string} scriptUrl - URL to the module script
   * @returns {Promise<string>} - Script content
   */
  async downloadModuleScript(scriptUrl) {
    try {
      const response = await fetch(scriptUrl)
      if (!response.ok) {
        throw new Error(`Failed to download module script: ${response.statusText}`)
      }
      const scriptContent = await response.text()
      
      return scriptContent
    } catch (error) {
      this.log(`Error downloading module script: ${error.message}`, 'error')
      throw error
    }
  }



  /**
   * Adds a new module to the system
   * @param {string} metadataUrl - URL to the module metadata
   * @returns {Promise<ScrapingModule>}
   */
  async addModule(metadataUrl) {
    this.initializeStore() // Ensure store is initialized

    try {
      // Check if module already exists
      const existingModule = this.moduleStore.modules.find(
        m => m.metadataUrl === metadataUrl
      )
      if (existingModule) {
        throw new Error('Module already exists')
      }

      // Fetch metadata
      const metadata = await this.fetchModuleMetadata(metadataUrl)
      
      // Create module object first to get the ID
      const module = {
        id: crypto.randomUUID(),
        metadata,
        localPath: '', // Will be set below
        metadataUrl,
        isActive: false,
        isEnabled: true,
        status: 'idle',
        error: null
      }
      
      // Download script and store it by module ID
      const scriptContent = await this.downloadModuleScript(metadata.scriptUrl)
      const localPath = `${module.id}.js`
      module.localPath = localPath
      
      // Save script content with module ID as key
      this.moduleStore.saveModuleScript(module.id, scriptContent)

      // Add to store
      this.moduleStore.installModule(module)
      this.log(`Added module: ${module.metadata.sourceName}`)
      
      return module

    } catch (error) {
      this.log(`Error adding module: ${error.message}`, 'error')
      throw error
    }
  }

  /**
   * Removes a module from the system
   * @param {ScrapingModule} module - Module to remove
   */
  async removeModule(module) {
    this.initializeStore() // Ensure store is initialized

    try {
      // Remove script by module ID
      this.moduleStore.deleteModuleScript(module.id)

      // Remove from store
      this.moduleStore.uninstallModule(module.id)
      this.log(`Deleted module: ${module.metadata.sourceName}`)
    } catch (error) {
      this.log(`Error removing module: ${error.message}`, 'error')
      throw error
    }
  }

  /**
   * Updates an existing module
   * @param {ScrapingModule} module - Module to update
   */
  async updateModule(module) {
    this.initializeStore() // Ensure store is initialized

    try {
      // Fetch new metadata
      const metadata = await this.fetchModuleMetadata(module.metadataUrl)
      
      // Check if update is needed
      if (metadata.version === module.metadata.version) {
        return module
      }

      // Download new script content
      const scriptContent = await this.downloadModuleScript(metadata.scriptUrl)
      
      // Create updated module object
      const updatedModule = {
        ...module,
        metadata
      }
      
      // Save updated script content with module ID as key
      this.moduleStore.saveModuleScript(module.id, scriptContent)

      // Update in store
      this.moduleStore.updateModule(updatedModule)
      this.log(`Updated module: ${module.metadata.sourceName} to version ${metadata.version}`)
      
      return updatedModule

    } catch (error) {
      this.log(`Error updating module: ${error.message}`, 'error')
      throw error
    }
  }

  /**
   * Refreshes all modules
   * @returns {Promise<void>}
   */
  async refreshModules() {
    this.initializeStore() // Ensure store is initialized

    for (const module of this.moduleStore.modules) {
      try {
        await this.updateModule(module)
      } catch (error) {
        this.log(`Failed to refresh module: ${module.metadata.sourceName} - ${error.message}`, 'error')
      }
    }
  }

  /**
   * Clear module cache
   */
  clearCache() {
    this.moduleCache.clear()
  }
}

// Create singleton instance
const moduleManager = new ModuleManager()
export default moduleManager 