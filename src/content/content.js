/**
 * Main Content Script
 * Coordinates audio detection and volume control, handles communication with background script
 */

/**
 * Content script controller class
 */
class ContentScript {
  constructor() {
    this.audioDetector = null;
    this.volumeController = null;
    this.isInitialized = false;
    this.messageHandlers = new Map();
    this.isYouTubePage = this.checkIfYouTubePage();
    this.initializationTimeout = null;
  }

  /**
   * Initialize the content script
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      // Wait for DOM to be ready
      await this.waitForDOMReady();

      // Create audio detector
      this.audioDetector = window.createAudioElementDetector();
      
      // Create appropriate volume controller
      if (this.isYouTubePage) {
        this.volumeController = window.createYouTubeVolumeController(this.audioDetector);
      } else {
        this.volumeController = window.createVolumeController(this.audioDetector);
      }

      // Set up message handlers
      this.setupMessageHandlers();
      
      // Initialize components
      this.audioDetector.initialize();
      this.volumeController.initialize();

      // Set up periodic audio state reporting
      this.setupPeriodicReporting();
      
      // Request any stored settings for this domain
      this.requestStoredSettings();

      this.isInitialized = true;
      console.log('Content script initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize content script:', error);
    }
  }

  /**
   * Wait for DOM to be ready
   */
  waitForDOMReady() {
    return new Promise((resolve) => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', resolve, { once: true });
      } else {
        resolve();
      }
    });
  }

  /**
   * Set up message handlers for communication with background script
   */
  setupMessageHandlers() {
    // Set up message handlers
    this.messageHandlers.set('SET_VOLUME', this.handleSetVolume.bind(this));
    this.messageHandlers.set('SET_MUTE', this.handleSetMute.bind(this));
    this.messageHandlers.set('GET_STATUS', this.handleGetStatus.bind(this));
    this.messageHandlers.set('RESCAN_AUDIO', this.handleRescanAudio.bind(this));

    // Listen for messages from background script
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      return this.handleMessage(message, sender, sendResponse);
    });
  }

  /**
   * Handle incoming messages from background script
   * @param {Object} message - Message object
   * @param {Object} sender - Message sender info
   * @param {Function} sendResponse - Response callback
   * @returns {boolean} True if response will be sent asynchronously
   */
  handleMessage(message, sender, sendResponse) {
    try {
      if (!message || !message.type) {
        sendResponse({ success: false, error: 'Invalid message format' });
        return false;
      }

      const handler = this.messageHandlers.get(message.type);
      if (!handler) {
        sendResponse({ success: false, error: `Unknown message type: ${message.type}` });
        return false;
      }

      // Execute handler
      const result = handler(message, sender);
      
      if (result instanceof Promise) {
        // Handle async response
        result.then(response => {
          sendResponse(response);
        }).catch(error => {
          sendResponse({ success: false, error: error.message });
        });
        return true; // Indicate async response
      } else {
        // Handle sync response
        sendResponse(result);
        return false;
      }

    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
      return false;
    }
  }

  /**
   * Handle SET_VOLUME message
   * @param {Object} message - Message object
   * @param {Object} sender - Message sender
   * @returns {Object} Response object
   */
  handleSetVolume(message, sender) {
    try {
      const { volumeLevel } = message.payload;
      
      if (typeof volumeLevel !== 'number' || volumeLevel < 0 || volumeLevel > 200) {
        return { success: false, error: 'Invalid volume level' };
      }

      this.volumeController.setVolume(volumeLevel);
      
      return { 
        success: true, 
        volumeLevel: volumeLevel,
        amplificationUsed: volumeLevel > 100 && this.volumeController.isAmplificationAvailable()
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle SET_MUTE message
   * @param {Object} message - Message object
   * @param {Object} sender - Message sender
   * @returns {Object} Response object
   */
  handleSetMute(message, sender) {
    try {
      const { isMuted } = message.payload;
      
      if (typeof isMuted !== 'boolean') {
        return { success: false, error: 'Invalid mute state' };
      }

      this.volumeController.setMuted(isMuted);
      
      return { success: true, isMuted: isMuted };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle GET_STATUS message
   * @param {Object} message - Message object
   * @param {Object} sender - Message sender
   * @returns {Object} Response object
   */
  handleGetStatus(message, sender) {
    try {
      const detectorStatus = this.audioDetector.getStatus();
      const controllerStatus = this.volumeController.getStatus();
      
      return {
        success: true,
        status: {
          isInitialized: this.isInitialized,
          isYouTube: this.isYouTubePage,
          detector: detectorStatus,
          controller: controllerStatus,
          url: window.location.href
        }
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle RESCAN_AUDIO message
   * @param {Object} message - Message object
   * @param {Object} sender - Message sender
   * @returns {Object} Response object
   */
  handleRescanAudio(message, sender) {
    try {
      this.audioDetector.rescan();
      const detectorStatus = this.audioDetector.getStatus();
      
      return {
        success: true,
        elementCount: detectorStatus.elementCount,
        hasActiveAudio: detectorStatus.hasActiveAudio
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Set up periodic audio state reporting
   */
  setupPeriodicReporting() {
    // Report audio state immediately
    this.reportAudioState();
    
    // Set up periodic reporting every 5 seconds
    setInterval(() => {
      if (this.audioDetector.hasActiveAudio()) {
        this.reportAudioState();
      }
    }, 5000);
    
    // Also report when audio elements change
    const originalReportMethod = this.audioDetector.reportAudioState;
    this.audioDetector.reportAudioState = () => {
      originalReportMethod.call(this.audioDetector);
      
      // Apply current volume settings to any new elements
      this.applySettingsToNewElements();
    };
  }

  /**
   * Apply current volume settings to newly detected elements
   */
  applySettingsToNewElements() {
    const audioElements = this.audioDetector.getAudioElements();
    
    for (const [element] of audioElements) {
      this.volumeController.applySettingsToNewElement(element);
    }
  }

  /**
   * Report current audio state to background script
   */
  reportAudioState() {
    try {
      const hasActiveAudio = this.audioDetector.hasActiveAudio();
      const audioElements = this.audioDetector.getAudioElementTypes();
      
      browser.runtime.sendMessage({
        type: 'TAB_AUDIO_UPDATE',
        payload: {
          tabId: 0, // Will be resolved by background script
          isAudioActive: hasActiveAudio,
          audioElements: audioElements,
          url: window.location.href
        }
      }).catch(error => {
        console.warn('Failed to report audio state:', error);
      });
      
    } catch (error) {
      console.warn('Error reporting audio state:', error);
    }
  }

  /**
   * Request stored settings from background script
   */
  requestStoredSettings() {
    try {
      browser.runtime.sendMessage({
        type: 'RESTORE_SETTINGS',
        payload: {
          tabId: 0, // Will be resolved by background script
          url: window.location.href
        }
      }).then(response => {
        if (response && response.success && response.volumeSettings) {
          // Apply restored settings
          const { defaultVolume, isMuted } = response.volumeSettings;
          
          if (typeof defaultVolume === 'number') {
            this.volumeController.setVolume(defaultVolume);
          }
          
          if (typeof isMuted === 'boolean') {
            this.volumeController.setMuted(isMuted);
          }
          
          console.log('Applied restored settings:', response.volumeSettings);
        }
      }).catch(error => {
        console.warn('Failed to restore settings:', error);
      });
      
    } catch (error) {
      console.warn('Error requesting stored settings:', error);
    }
  }

  /**
   * Check if current page is YouTube
   * @returns {boolean} True if YouTube page
   */
  checkIfYouTubePage() {
    return window.location.hostname.includes('youtube.com') || 
           window.location.hostname.includes('youtu.be');
  }

  /**
   * Clean up content script resources
   */
  cleanup() {
    if (this.audioDetector) {
      this.audioDetector.cleanup();
    }
    
    if (this.volumeController) {
      this.volumeController.cleanup();
    }
    
    // Remove message listeners
    if (browser.runtime.onMessage.hasListener) {
      browser.runtime.onMessage.removeListener(this.handleMessage);
    }
    
    this.isInitialized = false;
    console.log('Content script cleaned up');
  }

  /**
   * Get content script status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isYouTube: this.isYouTubePage,
      detectorStatus: this.audioDetector ? this.audioDetector.getStatus() : null,
      controllerStatus: this.volumeController ? this.volumeController.getStatus() : null,
      url: window.location.href
    };
  }
}

// Global content script instance
let contentScript = null;

/**
 * Initialize content script when DOM is ready
 */
function initializeContentScript() {
  if (contentScript) {
    return contentScript;
  }
  
  contentScript = new ContentScript();
  
  // Initialize immediately if DOM is ready, otherwise wait
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      contentScript.initialize();
    });
  } else {
    // Add small delay to allow for dynamic content to load
    setTimeout(() => {
      contentScript.initialize();
    }, 100);
  }
  
  return contentScript;
}

// Handle page navigation in SPAs (like YouTube)
let currentUrl = window.location.href;
const checkForUrlChange = () => {
  if (currentUrl !== window.location.href) {
    currentUrl = window.location.href;
    console.log('URL changed, reinitializing content script');
    
    if (contentScript) {
      contentScript.cleanup();
      contentScript = null;
    }
    
    // Reinitialize after a short delay to allow page to load
    setTimeout(() => {
      initializeContentScript();
    }, 1000);
  }
};

// Check for URL changes periodically (for SPAs)
setInterval(checkForUrlChange, 2000);

// Initialize on script load
initializeContentScript();

// Factory functions for testing
function createContentScript() {
  return new ContentScript();
}

// Export for testing and ES6 module compatibility  
export { createContentScript, ContentScript };

// Make available globally for testing
if (typeof window !== 'undefined') {
  window.createContentScript = createContentScript;
  window.ContentScript = ContentScript;
}

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Page is hidden, reduce activity
    console.log('Page hidden, reducing content script activity');
  } else {
    // Page is visible, ensure content script is active
    console.log('Page visible, ensuring content script is active');
    if (!contentScript || !contentScript.isInitialized) {
      initializeContentScript();
    }
  }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
  if (contentScript) {
    contentScript.cleanup();
  }
});