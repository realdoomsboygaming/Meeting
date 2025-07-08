// app-initializer.js - Proper initialization of the new integrated application system
// Replaces old sora-app.js initialization and inline script

import { ApplicationController } from './application-controller.js';
import { EnhancedModuleManager } from './enhanced-module-manager.js';

class AppInitializer {
    constructor() {
        this.app = null;
        this.moduleManager = null;
        this.isInitialized = false;
    }

    async initialize() {
        try {
            console.log('🚀 Initializing Sora Streaming Hub...');

            // Initialize the enhanced module manager first
            console.log('📦 Initializing Enhanced Module Manager...');
            this.moduleManager = new EnhancedModuleManager();
            await this.moduleManager.initialize();

            // Initialize the application controller
            console.log('🎮 Initializing Application Controller...');
            this.app = new ApplicationController();

            // Wait for application controller to fully initialize
            await this.waitForAppInitialization();

            // Connect the module manager to the application
            this.app.setModuleManager(this.moduleManager);

            // Set up module selection handling
            this.moduleManager.on('moduleSelected', (module) => {
                this.app.setSelectedModule(module);
            });

            // Set up module events
            this.moduleManager.on('moduleAdded', (module) => {
                this.app.log(`Module added: ${module.metadata.sourceName}`, 'success');
                this.app.updateStats();
                this.app.updateModulesList();
            });

            this.moduleManager.on('moduleError', (error) => {
                this.app.log(`Module error: ${error.error}`, 'error');
            });

            this.moduleManager.on('modulesLoaded', (data) => {
                this.app.log(`Loaded ${data.count} modules from storage`, 'info');
                this.app.updateStats();
                this.app.updateModulesList();
            });

            // Make instances globally available for backwards compatibility
            window.app = this.app;
            window.moduleManager = this.moduleManager;

            // Set up proxy controls that were in the old system
            this.setupProxyControls();

            this.isInitialized = true;
            console.log('✅ Integrated application system initialized successfully');

            // Load any previously selected module
            const selectedModule = this.moduleManager.getSelectedModule();
            if (selectedModule) {
                this.app.setSelectedModule(selectedModule);
                this.app.log(`Restored selected module: ${selectedModule.metadata.sourceName}`, 'info');
            }

        } catch (error) {
            console.error('❌ Failed to initialize application system:', error);
            this.showInitializationError(error);
        }
    }

    async waitForAppInitialization() {
        return new Promise((resolve) => {
            const checkInitialized = () => {
                if (this.app && this.app.isInitialized) {
                    resolve();
                } else {
                    setTimeout(checkInitialized, 100);
                }
            };
            checkInitialized();
        });
    }

    setupProxyControls() {
        // Set up proxy control functionality that was in the old sora-app.js
        if (this.app.elements.proxyTestBtn) {
            this.app.elements.proxyTestBtn.addEventListener('click', () => {
                this.testProxyConnection();
            });
        }

        if (this.app.elements.proxySettingsBtn) {
            this.app.elements.proxySettingsBtn.addEventListener('click', () => {
                this.showProxySettings();
            });
        }
    }

    async testProxyConnection() {
        try {
            this.app.log('🧪 Testing CORS proxy access...', 'info');
            
            // Test with a known CORS-blocked resource
            const testUrl = 'https://i.imgur.com/test.png';
            const response = await this.app.networkUtils.fetchWithTimeout(testUrl, {
                method: 'GET',
                timeout: 10000
            });

            if (response) {
                this.app.log('✅ Proxy test successful!', 'success');
                this.showMessage("Proxy Working!", "success", "✅ Successfully accessed CORS-blocked resource through proxy!");
            } else {
                throw new Error('No response data');
            }
        } catch (error) {
            this.app.log(`❌ Proxy test failed: ${error.message}`, 'error');
            this.showMessage("Proxy Test Failed", "error", 
                `❌ Failed to access resource through proxy:\n${error.message}\n\nTry a different proxy or check your configuration.`);
        }
    }

    showProxySettings() {
        // Simple proxy settings dialog
        const currentProxy = localStorage.getItem('corsProxy') || 'https://corsproxy.io/?';
        
        const newProxy = prompt(
            'Enter CORS Proxy URL:\n\n' +
            'Current: ' + currentProxy + '\n\n' +
            'Examples:\n' +
            '• https://corsproxy.io/?\n' +
            '• https://your-worker.your-subdomain.workers.dev/?\n' +
            '• Custom proxy URL\n\n' +
            'Enter new proxy URL (or cancel to keep current):',
            currentProxy
        );

        if (newProxy && newProxy !== currentProxy) {
            localStorage.setItem('corsProxy', newProxy);
            this.app.networkUtils.setCorsProxy(newProxy);
            this.app.log(`Proxy updated: ${newProxy}`, 'success');
            this.showMessage("Proxy Updated", "success", `New proxy set: ${newProxy}`);
        }
    }

    showMessage(title, type = "info", message = "") {
        // Create a simple message notification
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 9999;
            background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db'};
            color: white; padding: 15px 25px; border-radius: 8px;
            font-family: Inter, sans-serif; font-weight: 500;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            max-width: 400px; animation: slideIn 0.3s ease;
        `;
        
        messageDiv.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 5px;">${title}</div>
            <div style="font-size: 14px; opacity: 0.9;">${message}</div>
        `;

        document.body.appendChild(messageDiv);

        // Remove message after 5 seconds
        setTimeout(() => {
            messageDiv.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => messageDiv.remove(), 300);
        }, 5000);

        // Add CSS animations if not already present
        if (!document.querySelector('#message-animations')) {
            const style = document.createElement('style');
            style.id = 'message-animations';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    showInitializationError(error) {
        // Show user-friendly error message
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
            background: #ff4757; color: white; padding: 15px 25px; border-radius: 8px;
            font-family: Inter, sans-serif; font-weight: 500; z-index: 9999;
            box-shadow: 0 4px 12px rgba(255, 71, 87, 0.3);
        `;
        errorDiv.textContent = `Application failed to start: ${error.message}`;
        document.body.appendChild(errorDiv);

        // Remove error after 10 seconds
        setTimeout(() => errorDiv.remove(), 10000);
    }

    // Public API
    getApp() {
        return this.app;
    }

    getModuleManager() {
        return this.moduleManager;
    }

    isReady() {
        return this.isInitialized;
    }
}

// Create global initializer instance
const appInitializer = new AppInitializer();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    appInitializer.initialize();
});

// Make initializer globally available
window.appInitializer = appInitializer;

// Export for module use
export { AppInitializer, appInitializer }; 