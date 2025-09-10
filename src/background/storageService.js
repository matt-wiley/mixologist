/**
 * Storage Service
 * Handles all storage operations including sync/local storage, caching, and error handling
 */

import { VolumeSettings } from '../models/VolumeSettings.js';
import { AudioTab } from '../models/AudioTab.js';
import { GlobalSettings } from '../models/GlobalSettings.js';
import { ExtensionState } from '../models/ExtensionState.js';

/**
 * Storage service class for managing extension data
 */
class StorageService {
  constructor() {
    this.cache = new Map();
    this.batchOperations = [];
    this.isBatching = false;
    this.isInitialized = false;
  }

  /**
   * Initialize the storage service
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    // Check storage API availability
    if (!browser?.storage) {
      console.error('Storage API not available');
      return;
    }

    // Set up storage change listeners
    if (browser.storage.onChanged) {
      browser.storage.onChanged.addListener(this.handleStorageChange.bind(this));
    }

    this.isInitialized = true;
  }

  /**
   * Handle storage changes for cache invalidation
   * @param {Object} changes - Storage changes
   * @param {string} namespace - Storage namespace
   */
  handleStorageChange(changes, namespace) {
    // Clear relevant cache entries when storage changes
    for (const key of Object.keys(changes)) {
      this.cache.delete(key);
      
      // Clear domain-specific cache entries
      if (key === 'volumeSettings') {
        for (const cacheKey of this.cache.keys()) {
          if (cacheKey.startsWith('volume_')) {
            this.cache.delete(cacheKey);
          }
        }
      }
    }
  }

  /**
   * Save volume settings for a domain
   * @param {string} domain - Domain name
   * @param {Object} settings - Volume settings object
   * @returns {Promise<Object>} Operation result
   */
  async saveVolumeSettings(domain, settings) {
    try {
      if (!browser?.storage?.sync) {
        return {
          success: false,
          error: 'Storage API not available',
          code: 'STORAGE_UNAVAILABLE'
        };
      }

      // Get existing volume settings
      const result = await browser.storage.sync.get(['volumeSettings']);
      const volumeSettings = result.volumeSettings || {};

      // Update settings for the domain
      volumeSettings[domain] = settings;

      // Save back to storage
      await browser.storage.sync.set({ volumeSettings });

      // Update cache
      this.cache.set('volumeSettings', volumeSettings);
      this.cache.set(`volume_${domain}`, settings);

      return { success: true };
    } catch (error) {
      return this.handleStorageError(error);
    }
  }

  /**
   * Get volume settings for a domain
   * @param {string} domain - Domain name
   * @returns {Promise<Object>} Volume settings or default
   */
  async getVolumeSettings(domain) {
    try {
      if (!browser?.storage?.sync) {
        return {
          success: false,
          error: 'Storage API not available',
          code: 'STORAGE_UNAVAILABLE'
        };
      }

      // Check cache first
      const cacheKey = `volume_${domain}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const result = await browser.storage.sync.get(['volumeSettings']);
      const volumeSettings = result.volumeSettings || {};

      if (volumeSettings[domain]) {
        // Cache and return existing settings
        this.cache.set(cacheKey, volumeSettings[domain]);
        return volumeSettings[domain];
      } else {
        // Create default settings for new domain
        const defaultSettings = {
          domain,
          defaultVolume: 100,
          isMuted: false,
          lastUsed: Date.now(),
          createdAt: Date.now()
        };

        this.cache.set(cacheKey, defaultSettings);
        return defaultSettings;
      }
    } catch (error) {
      console.error('Failed to get volume settings:', error);
      // Return default on error
      return {
        domain,
        defaultVolume: 100,
        isMuted: false,
        lastUsed: Date.now(),
        createdAt: Date.now()
      };
    }
  }

  /**
   * Update volume settings for a domain
   * @param {string} domain - Domain name
   * @param {Object} updates - Settings to update
   * @returns {Promise<Object>} Operation result
   */
  async updateVolumeSettings(domain, updates) {
    try {
      const existingSettings = await this.getVolumeSettings(domain);
      const updatedSettings = {
        ...existingSettings,
        ...updates,
        lastUsed: Date.now()
      };

      return await this.saveVolumeSettings(domain, updatedSettings);
    } catch (error) {
      return this.handleStorageError(error);
    }
  }

  /**
   * Save audio tabs state
   * @param {Object} audioTabs - Audio tabs data
   * @returns {Promise<Object>} Operation result
   */
  async saveAudioTabs(audioTabs) {
    try {
      if (!browser?.storage?.local) {
        return {
          success: false,
          error: 'Storage API not available',
          code: 'STORAGE_UNAVAILABLE'
        };
      }

      await browser.storage.local.set({ audioTabs });
      this.cache.set('audioTabs', audioTabs);

      return { success: true };
    } catch (error) {
      return this.handleStorageError(error);
    }
  }

  /**
   * Get audio tabs state
   * @returns {Promise<Object>} Audio tabs data
   */
  async getAudioTabs() {
    try {
      if (!browser?.storage?.local) {
        return {};
      }

      // Check cache first
      if (this.cache.has('audioTabs')) {
        return this.cache.get('audioTabs');
      }

      const result = await browser.storage.local.get(['audioTabs']);
      const audioTabs = result.audioTabs || {};

      this.cache.set('audioTabs', audioTabs);
      return audioTabs;
    } catch (error) {
      console.error('Failed to get audio tabs:', error);
      return {};
    }
  }

  /**
   * Clean up stale tab data
   */
  async cleanupStaleTabData() {
    try {
      const audioTabs = await this.getAudioTabs();
      const staleThreshold = 24 * 60 * 60 * 1000; // 24 hours
      const now = Date.now();
      const cleanedTabs = {};

      // Filter out stale tabs
      for (const [tabId, tabData] of Object.entries(audioTabs)) {
        if (tabData.lastAudioActivity && (now - tabData.lastAudioActivity) <= staleThreshold) {
          cleanedTabs[tabId] = tabData;
        }
      }

      await this.saveAudioTabs(cleanedTabs);
    } catch (error) {
      console.error('Failed to cleanup stale tab data:', error);
    }
  }

  /**
   * Save global settings
   * @param {Object} settings - Global settings
   * @returns {Promise<Object>} Operation result
   */
  async saveGlobalSettings(settings) {
    try {
      if (!browser?.storage?.sync) {
        return {
          success: false,
          error: 'Storage API not available',
          code: 'STORAGE_UNAVAILABLE'
        };
      }

      await browser.storage.sync.set({ globalSettings: settings });
      this.cache.set('globalSettings', settings);

      return { success: true };
    } catch (error) {
      return this.handleStorageError(error);
    }
  }

  /**
   * Get global settings with defaults
   * @returns {Promise<Object>} Global settings
   */
  async getGlobalSettings() {
    try {
      if (!browser?.storage?.sync) {
        return this.getDefaultGlobalSettings();
      }

      // Check cache first
      if (this.cache.has('globalSettings')) {
        return this.cache.get('globalSettings');
      }

      const result = await browser.storage.sync.get(['globalSettings']);
      const settings = result.globalSettings || this.getDefaultGlobalSettings();

      this.cache.set('globalSettings', settings);
      return settings;
    } catch (error) {
      console.error('Failed to get global settings:', error);
      return this.getDefaultGlobalSettings();
    }
  }

  /**
   * Get default global settings
   * @returns {Object} Default global settings
   */
  getDefaultGlobalSettings() {
    return {
      defaultVolume: 100,
      enabledByDefault: true,
      showNotifications: true,
      maxTabs: 50,
      version: '1.0.0'
    };
  }

  /**
   * Update global settings
   * @param {Object} updates - Settings to update
   * @returns {Promise<Object>} Operation result
   */
  async updateGlobalSettings(updates) {
    try {
      const existingSettings = await this.getGlobalSettings();
      const updatedSettings = {
        ...existingSettings,
        ...updates
      };

      return await this.saveGlobalSettings(updatedSettings);
    } catch (error) {
      return this.handleStorageError(error);
    }
  }

  /**
   * Start batch operations
   */
  startBatch() {
    this.isBatching = true;
    this.batchOperations = [];
  }

  /**
   * Execute batch operations
   * @returns {Promise<Object>} Operation result
   */
  async executeBatch() {
    if (!this.isBatching || this.batchOperations.length === 0) {
      return { success: true };
    }

    try {
      // Combine all volume settings operations
      const volumeSettings = {};
      const otherOperations = [];

      for (const operation of this.batchOperations) {
        if (operation.type === 'volumeSettings') {
          volumeSettings[operation.domain] = operation.settings;
        } else {
          otherOperations.push(operation);
        }
      }

      // Execute volume settings batch
      if (Object.keys(volumeSettings).length > 0) {
        const result = await browser.storage.sync.get(['volumeSettings']);
        const existingSettings = result.volumeSettings || {};
        const mergedSettings = { ...existingSettings, ...volumeSettings };
        
        await browser.storage.sync.set({ volumeSettings: mergedSettings });
      }

      // Execute other operations
      for (const operation of otherOperations) {
        // Handle other operation types as needed
      }

      this.isBatching = false;
      this.batchOperations = [];

      return { success: true };
    } catch (error) {
      return this.handleStorageError(error);
    }
  }

  /**
   * Handle storage errors
   * @param {Error} error - Storage error
   * @returns {Object} Error result
   */
  handleStorageError(error) {
    if (error.message.includes('QuotaExceededError') || error.message.includes('quota')) {
      return {
        success: false,
        error: 'Storage quota exceeded',
        code: 'QUOTA_EXCEEDED'
      };
    }

    return {
      success: false,
      error: error.message,
      code: 'STORAGE_ERROR'
    };
  }

  /**
   * Clear all storage data
   * @returns {Promise<Object>} Operation result
   */
  async clearAllData() {
    try {
      if (browser?.storage?.local) {
        await browser.storage.local.clear();
      }
      if (browser?.storage?.sync) {
        await browser.storage.sync.clear();
      }

      this.cache.clear();
      return { success: true };
    } catch (error) {
      return this.handleStorageError(error);
    }
  }

  /**
   * Get storage usage statistics
   * @returns {Promise<Object>} Storage usage info
   */
  async getStorageUsage() {
    try {
      const usage = {
        local: { bytesInUse: 0, items: 0 },
        sync: { bytesInUse: 0, items: 0 }
      };

      if (browser?.storage?.local?.getBytesInUse) {
        usage.local.bytesInUse = await browser.storage.local.getBytesInUse();
        const localData = await browser.storage.local.get();
        usage.local.items = Object.keys(localData).length;
      }

      if (browser?.storage?.sync?.getBytesInUse) {
        usage.sync.bytesInUse = await browser.storage.sync.getBytesInUse();
        const syncData = await browser.storage.sync.get();
        usage.sync.items = Object.keys(syncData).length;
      }

      return usage;
    } catch (error) {
      console.error('Failed to get storage usage:', error);
      return {
        local: { bytesInUse: 0, items: 0 },
        sync: { bytesInUse: 0, items: 0 }
      };
    }
  }
}

/**
 * Extension manager class for handling extension lifecycle
 */
class ExtensionManager {
  constructor(storageService) {
    this.storageService = storageService || new StorageService();
    this.volumeSettingsCache = {};
    this.isInitialized = false;
  }

  /**
   * Initialize the extension manager
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      await this.storageService.initialize();
      
      // Load settings into cache
      const result = await browser.storage.sync.get(['volumeSettings', 'globalSettings']);
      
      if (result.volumeSettings && typeof result.volumeSettings === 'object') {
        this.volumeSettingsCache = result.volumeSettings;
      } else {
        // Handle corrupted data
        console.warn('Corrupted storage data detected, resetting to defaults');
        await this.resetCorruptedData();
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize extension manager:', error);
    }
  }

  /**
   * Reset corrupted data to defaults
   */
  async resetCorruptedData() {
    try {
      await browser.storage.sync.set({
        volumeSettings: {},
        globalSettings: this.storageService.getDefaultGlobalSettings()
      });
      
      this.volumeSettingsCache = {};
    } catch (error) {
      console.error('Failed to reset corrupted data:', error);
    }
  }

  /**
   * Get volume settings cache
   * @returns {Object} Volume settings cache
   */
  getVolumeSettingsCache() {
    return this.volumeSettingsCache;
  }

  /**
   * Update volume settings cache
   * @param {string} domain - Domain name
   * @param {Object} settings - Volume settings
   */
  updateVolumeSettingsCache(domain, settings) {
    this.volumeSettingsCache[domain] = settings;
  }
}

/**
 * Migration service for handling version upgrades
 */
class MigrationService {
  /**
   * Migrate data from an older version
   * @param {string} fromVersion - Source version
   * @param {string} toVersion - Target version
   * @returns {Promise<boolean>} True if migration was performed
   */
  async migrateFromVersion(fromVersion, toVersion) {
    try {
      // Check for old format data
      const oldData = await browser.storage.local.get(['tabs', 'settings']);
      
      if (!oldData.tabs && !oldData.settings) {
        return false; // No old data to migrate
      }

      const migratedAudioTabs = {};
      
      // Migrate old tab data
      if (oldData.tabs) {
        for (const [tabId, oldTabData] of Object.entries(oldData.tabs)) {
          migratedAudioTabs[tabId] = {
            tabId: parseInt(tabId),
            volumeLevel: oldTabData.vol || 100,
            isMuted: oldTabData.muted || false,
            title: '',
            url: '',
            domain: '',
            isAudioActive: false,
            lastAudioActivity: Date.now()
          };
        }
      }

      // Save migrated data
      await browser.storage.local.set({ audioTabs: migratedAudioTabs });
      
      // Clean up old data
      await browser.storage.local.remove(['tabs', 'settings']);

      console.log('Data migration completed successfully');
      return true;
    } catch (error) {
      console.error('Migration failed:', error);
      return false;
    }
  }

  /**
   * Check if migration is needed
   * @param {string} currentVersion - Current extension version
   * @returns {Promise<boolean>} True if migration is needed
   */
  async isMigrationNeeded(currentVersion) {
    try {
      const oldData = await browser.storage.local.get(['tabs', 'settings']);
      return !!(oldData.tabs || oldData.settings);
    } catch (error) {
      console.error('Failed to check migration status:', error);
      return false;
    }
  }
}

// Factory functions for tests
export function createStorageService() {
  return new StorageService();
}

export function createExtensionManager() {
  return new ExtensionManager();
}

export function createMigrationService() {
  return new MigrationService();
}

// Export classes for direct use
export { StorageService, ExtensionManager, MigrationService };