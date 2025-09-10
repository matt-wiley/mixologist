/**
 * Main Background Script
 * Initializes and coordinates all background services
 */

import { AudioDetector } from './audioDetection.js';
import { StorageService, ExtensionManager, MigrationService } from './storageService.js';
import { MessageHandler } from './messageHandler.js';
import { AudioTab } from '../models/AudioTab.js';
import { ExtensionState } from '../models/ExtensionState.js';

/**
 * Main background script class that orchestrates all services
 */
class BackgroundScript {
  constructor() {
    this.storageService = null;
    this.audioDetector = null;
    this.messageHandler = null;
    this.extensionManager = null;
    this.migrationService = null;
    this.extensionState = null;
    this.isInitialized = false;
    this.activeTabsMap = new Map();
  }

  /**
   * Initialize the background script
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('Initializing Firefox Tab Audio Control Extension...');

      // Initialize services
      this.storageService = new StorageService();
      await this.storageService.initialize();

      this.audioDetector = new AudioDetector();
      await this.audioDetector.initialize();

      this.messageHandler = new MessageHandler(this.storageService, this.audioDetector);

      this.extensionManager = new ExtensionManager(this.storageService);
      await this.extensionManager.initialize();

      this.migrationService = new MigrationService();

      // Initialize extension state
      this.extensionState = ExtensionState.createDefault();

      // Set up event listeners
      this.setupEventListeners();

      // Set up audio detection callbacks
      this.setupAudioDetectionCallbacks();

      // Perform migration if needed
      await this.handleMigration();

      // Clean up stale data
      await this.cleanupStaleData();

      this.isInitialized = true;
      console.log('Extension initialization complete');
    } catch (error) {
      console.error('Failed to initialize background script:', error);
      throw error;
    }
  }

  /**
   * Set up browser event listeners
   */
  setupEventListeners() {
    // Runtime message listener
    if (browser?.runtime?.onMessage) {
      browser.runtime.onMessage.addListener(this.handleRuntimeMessage.bind(this));
    }

    // Tab event listeners
    if (browser?.tabs?.onCreated) {
      browser.tabs.onCreated.addListener(this.handleTabCreated.bind(this));
    }

    if (browser?.tabs?.onRemoved) {
      browser.tabs.onRemoved.addListener(this.handleTabRemoved.bind(this));
    }

    if (browser?.tabs?.onUpdated) {
      browser.tabs.onUpdated.addListener(this.handleTabUpdated.bind(this));
    }

    // Extension startup/shutdown listeners
    if (browser?.runtime?.onStartup) {
      browser.runtime.onStartup.addListener(this.handleExtensionStartup.bind(this));
    }

    if (browser?.runtime?.onSuspend) {
      browser.runtime.onSuspend.addListener(this.handleExtensionSuspend.bind(this));
    }
  }

  /**
   * Set up audio detection callbacks
   */
  setupAudioDetectionCallbacks() {
    this.audioDetector.addDetectionCallback((event, data) => {
      this.handleAudioDetectionEvent(event, data);
    });
  }

  /**
   * Handle runtime messages
   * @param {Object} message - Message object
   * @param {Object} sender - Message sender
   * @param {Function} sendResponse - Response callback
   * @returns {Promise<boolean>} True if response is async
   */
  handleRuntimeMessage(message, sender, sendResponse) {
    // Handle message asynchronously
    this.messageHandler.handleMessage(message, sender, sendResponse)
      .then(response => {
        sendResponse(response);
      })
      .catch(error => {
        console.error('Message handling error:', error);
        sendResponse({
          success: false,
          error: error.message,
          code: 'MESSAGE_ERROR'
        });
      });

    // Return true to indicate async response
    return true;
  }

  /**
   * Handle message through message handler (for test compatibility)
   * @param {Object} message - Message object
   * @returns {Promise<Object>} Response object
   */
  async handleMessage(message) {
    // Initialize if not already initialized
    if (!this.isInitialized) {
      await this.initialize();
    }
    return await this.messageHandler.handleMessage(message, null);
  }

  /**
   * Handle tab creation
   * @param {Object} tab - Tab object
   */
  handleTabCreated(tab) {
    console.log('Tab created:', tab.id);
  }

  /**
   * Handle tab removal
   * @param {number} tabId - Tab ID
   * @param {Object} removeInfo - Remove info
   */
  handleTabRemoved(tabId, removeInfo) {
    console.log('Tab removed:', tabId);
    this.activeTabsMap.delete(tabId);
    this.extensionState.removeActiveTab(tabId);
  }

  /**
   * Handle tab updates
   * @param {number} tabId - Tab ID
   * @param {Object} changeInfo - Change info
   * @param {Object} tab - Tab object
   */
  handleTabUpdated(tabId, changeInfo, tab) {
    // The audio detector handles audible state changes
    // This is just for logging and additional state management
    if (changeInfo.hasOwnProperty('audible')) {
      console.log(`Tab ${tabId} audio state changed:`, changeInfo.audible);
    }
  }

  /**
   * Handle extension startup
   */
  async handleExtensionStartup() {
    console.log('Extension starting up');
    await this.cleanupStaleData();
  }

  /**
   * Handle extension suspend
   */
  async handleExtensionSuspend() {
    console.log('Extension suspending');
    await this.saveCurrentState();
  }

  /**
   * Handle audio detection events
   * @param {string} event - Event type
   * @param {Object} data - Event data
   */
  handleAudioDetectionEvent(event, data) {
    switch (event) {
      case 'audio_started':
        this.handleAudioStarted(data.audioTab);
        break;
      case 'audio_stopped':
        this.handleAudioStopped(data.audioTab);
        break;
      case 'tab_removed':
        this.handleAudioTabRemoved(data.tabId);
        break;
      default:
        console.log('Unknown audio detection event:', event);
    }
  }

  /**
   * Handle audio started in tab
   * @param {AudioTab} audioTab - Audio tab object
   */
  handleAudioStarted(audioTab) {
    console.log(`Audio started in tab ${audioTab.tabId}: ${audioTab.domain}`);
    this.activeTabsMap.set(audioTab.tabId, audioTab);
    this.extensionState.addActiveTab(audioTab.tabId);
  }

  /**
   * Handle audio stopped in tab
   * @param {AudioTab} audioTab - Audio tab object
   */
  handleAudioStopped(audioTab) {
    console.log(`Audio stopped in tab ${audioTab.tabId}: ${audioTab.domain}`);
    // Keep in activeTabsMap for a while in case audio resumes
    // The cleanup process will remove it later
  }

  /**
   * Handle audio tab removed
   * @param {number} tabId - Tab ID
   */
  handleAudioTabRemoved(tabId) {
    console.log(`Audio tab removed: ${tabId}`);
    this.activeTabsMap.delete(tabId);
    this.extensionState.removeActiveTab(tabId);
  }

  /**
   * Get audio tab state for a specific tab
   * @param {number} tabId - Tab ID
   * @returns {Promise<Object>} Audio tab state
   */
  async getAudioTabState(tabId) {
    const audioTab = this.audioDetector.getTabAudioState(tabId);
    if (!audioTab) {
      return null;
    }

    return {
      tabId: audioTab.tabId,
      title: audioTab.title,
      url: audioTab.url,
      domain: audioTab.domain,
      volumeLevel: audioTab.volumeLevel,
      isMuted: audioTab.isMuted,
      isAudioActive: audioTab.isAudioActive,
      lastAudioActivity: audioTab.lastAudioActivity,
      audioElements: audioTab.audioElements
    };
  }

  /**
   * Get list of active tab IDs
   * @returns {Promise<Array<number>>} Array of active tab IDs
   */
  async getActiveTabs() {
    const activeTabs = this.audioDetector.getActiveTabs();
    return Array.from(activeTabs.keys());
  }

  /**
   * Get current extension state
   * @returns {ExtensionState} Extension state
   */
  getExtensionState() {
    return this.extensionState;
  }

  /**
   * Handle data migration
   */
  async handleMigration() {
    try {
      const needsMigration = await this.migrationService.isMigrationNeeded('1.0.0');
      if (needsMigration) {
        console.log('Performing data migration...');
        const success = await this.migrationService.migrateFromVersion('0.9.0', '1.0.0');
        if (success) {
          console.log('Data migration completed successfully');
        } else {
          console.warn('Data migration failed');
        }
      }
    } catch (error) {
      console.error('Migration error:', error);
    }
  }

  /**
   * Clean up stale data
   */
  async cleanupStaleData() {
    try {
      // Clean up audio detector data
      this.audioDetector.cleanupStaleData();

      // Clean up storage data
      await this.storageService.cleanupStaleTabData();

      // Update extension state
      const currentActiveTabs = Array.from(this.audioDetector.getActiveTabs().keys());
      this.extensionState.setActiveTabs(currentActiveTabs);

      console.log('Stale data cleanup completed');
    } catch (error) {
      console.error('Failed to cleanup stale data:', error);
    }
  }

  /**
   * Save current state to storage
   */
  async saveCurrentState() {
    try {
      const audioTabs = {};
      for (const [tabId, audioTab] of this.audioDetector.getActiveTabs()) {
        audioTabs[tabId] = audioTab.toJSON();
      }

      await this.storageService.saveAudioTabs(audioTabs);
      console.log('Current state saved to storage');
    } catch (error) {
      console.error('Failed to save current state:', error);
    }
  }

  /**
   * Get service instances for testing
   */
  getServices() {
    return {
      storageService: this.storageService,
      audioDetector: this.audioDetector,
      messageHandler: this.messageHandler,
      extensionManager: this.extensionManager,
      migrationService: this.migrationService
    };
  }

  /**
   * Check if background script is initialized
   * @returns {boolean} True if initialized
   */
  isReady() {
    return this.isInitialized;
  }

  /**
   * Shutdown the background script
   */
  async shutdown() {
    try {
      await this.saveCurrentState();
      this.isInitialized = false;
      console.log('Background script shutdown complete');
    } catch (error) {
      console.error('Error during shutdown:', error);
    }
  }
}

// Factory function for tests
export function createBackgroundScript() {
  return new BackgroundScript();
}

// Export class for direct use
export { BackgroundScript };

// Initialize background script when loaded
if (typeof browser !== 'undefined') {
  const backgroundScript = new BackgroundScript();
  backgroundScript.initialize().catch(error => {
    console.error('Failed to initialize background script:', error);
  });
}