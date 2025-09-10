/**
 * Message Handler Service
 * Handles all message routing and validation between extension components
 */

import { AudioTab } from '../models/AudioTab.js';
import { VolumeSettings } from '../models/VolumeSettings.js';

/**
 * Message handler class for processing extension messages
 */
class MessageHandler {
  constructor(storageService, audioDetector) {
    this.storageService = storageService;
    this.audioDetector = audioDetector;
    this.messageHandlers = new Map();
    this.setupMessageHandlers();
  }

  /**
   * Set up message handlers for different message types
   */
  setupMessageHandlers() {
    this.messageHandlers.set('TAB_AUDIO_UPDATE', this.handleTabAudioUpdate.bind(this));
    this.messageHandlers.set('VOLUME_CHANGE', this.handleVolumeChange.bind(this));
    this.messageHandlers.set('MUTE_TOGGLE', this.handleMuteToggle.bind(this));
    this.messageHandlers.set('GET_ACTIVE_TABS', this.handleGetActiveTabs.bind(this));
    this.messageHandlers.set('GET_TAB_STATE', this.handleGetTabState.bind(this));
    this.messageHandlers.set('RESTORE_SETTINGS', this.handleRestoreSettings.bind(this));
  }

  /**
   * Process incoming message
   * @param {Object} message - Message object
   * @param {Object} sender - Message sender info
   * @param {Function} sendResponse - Response callback
   * @returns {Promise<Object>} Message response
   */
  async handleMessage(message, sender, sendResponse) {
    try {
      // Validate message structure
      const validationResult = this.validateMessage(message);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: validationResult.error,
          code: 'INVALID_MESSAGE'
        };
      }

      // Get handler for message type
      const handler = this.messageHandlers.get(message.type);
      if (!handler) {
        return {
          success: false,
          error: `Unknown message type: ${message.type}`,
          code: 'UNKNOWN_MESSAGE_TYPE'
        };
      }

      // Execute handler
      const response = await handler(message, sender);
      
      // Add request ID to response if provided
      if (message.requestId) {
        response.requestId = message.requestId;
      }

      return response;
    } catch (error) {
      console.error('Message handling error:', error);
      return {
        success: false,
        error: error.message,
        code: 'MESSAGE_HANDLER_ERROR',
        requestId: message.requestId
      };
    }
  }

  /**
   * Validate message structure
   * @param {Object} message - Message to validate
   * @returns {Object} Validation result
   */
  validateMessage(message) {
    if (!message || typeof message !== 'object') {
      return {
        isValid: false,
        error: 'Message must be an object'
      };
    }

    if (!message.type || typeof message.type !== 'string') {
      return {
        isValid: false,
        error: 'Message must have a valid type'
      };
    }

    // Validate payload structure for specific message types
    switch (message.type) {
      case 'VOLUME_CHANGE':
        return this.validateVolumeChangeMessage(message);
      case 'MUTE_TOGGLE':
        return this.validateMuteToggleMessage(message);
      case 'TAB_AUDIO_UPDATE':
        return this.validateTabAudioUpdateMessage(message);
      default:
        return { isValid: true };
    }
  }

  /**
   * Validate volume change message
   * @param {Object} message - Volume change message
   * @returns {Object} Validation result
   */
  validateVolumeChangeMessage(message) {
    if (!message.payload) {
      return {
        isValid: false,
        error: 'VOLUME_CHANGE message requires payload'
      };
    }

    if (!Number.isInteger(message.payload.tabId) || message.payload.tabId <= 0) {
      return {
        isValid: false,
        error: 'VOLUME_CHANGE message requires valid tabId'
      };
    }

    if (typeof message.payload.volumeLevel !== 'number' || 
        message.payload.volumeLevel < 0 || 
        message.payload.volumeLevel > 200) {
      return {
        isValid: false,
        error: 'Volume level must be between 0 and 200'
      };
    }

    return { isValid: true };
  }

  /**
   * Validate mute toggle message
   * @param {Object} message - Mute toggle message
   * @returns {Object} Validation result
   */
  validateMuteToggleMessage(message) {
    if (!message.payload) {
      return {
        isValid: false,
        error: 'MUTE_TOGGLE message requires payload'
      };
    }

    if (!Number.isInteger(message.payload.tabId) || message.payload.tabId <= 0) {
      return {
        isValid: false,
        error: 'MUTE_TOGGLE message requires valid tabId'
      };
    }

    if (typeof message.payload.isMuted !== 'boolean') {
      return {
        isValid: false,
        error: 'MUTE_TOGGLE message requires boolean isMuted value'
      };
    }

    return { isValid: true };
  }

  /**
   * Validate tab audio update message
   * @param {Object} message - Tab audio update message
   * @returns {Object} Validation result
   */
  validateTabAudioUpdateMessage(message) {
    if (!message.payload) {
      return {
        isValid: false,
        error: 'TAB_AUDIO_UPDATE message requires payload'
      };
    }

    if (!Number.isInteger(message.payload.tabId) || message.payload.tabId <= 0) {
      return {
        isValid: false,
        error: 'TAB_AUDIO_UPDATE message requires valid tabId'
      };
    }

    if (typeof message.payload.isAudioActive !== 'boolean') {
      return {
        isValid: false,
        error: 'TAB_AUDIO_UPDATE message requires boolean isAudioActive value'
      };
    }

    return { isValid: true };
  }

  /**
   * Handle tab audio update message
   * @param {Object} message - Message object
   * @param {Object} sender - Message sender
   * @returns {Promise<Object>} Response object
   */
  async handleTabAudioUpdate(message, sender) {
    try {
      const { tabId, isAudioActive, audioElements, url } = message.payload;

      // Get tab information
      let tab;
      try {
        tab = await browser.tabs.get(tabId);
      } catch (error) {
        return {
          success: false,
          error: 'Tab not found',
          code: 'INVALID_TAB'
        };
      }

      // Update audio detector state
      await this.audioDetector.updateTabAudioState(tabId, {
        isAudioActive,
        audioElements,
        url: url || tab.url,
        title: tab.title
      });

      // If audio started, restore volume settings
      if (isAudioActive) {
        const domain = this.extractDomain(url || tab.url);
        const volumeSettings = await this.storageService.getVolumeSettings(domain);
        
        // Send volume settings to content script
        try {
          await browser.tabs.sendMessage(tabId, {
            type: 'SET_VOLUME',
            payload: { volumeLevel: volumeSettings.defaultVolume || 100 }
          });

          if (volumeSettings.isMuted) {
            await browser.tabs.sendMessage(tabId, {
              type: 'SET_MUTE',
              payload: { isMuted: true }
            });
          }
        } catch (error) {
          console.warn('Failed to send volume settings to content script:', error);
        }
      }

      return {
        success: true,
        tabId,
        isAudioActive,
        url: url || tab.url,
        domain: this.extractDomain(url || tab.url),
        lastAudioActivity: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: 'AUDIO_UPDATE_ERROR'
      };
    }
  }

  /**
   * Handle volume change message
   * @param {Object} message - Message object
   * @param {Object} sender - Message sender
   * @returns {Promise<Object>} Response object
   */
  async handleVolumeChange(message, sender) {
    try {
      const { tabId, volumeLevel } = message.payload;

      // Verify tab exists
      let tab;
      try {
        tab = await browser.tabs.get(tabId);
      } catch (error) {
        return {
          success: false,
          error: 'Tab not found',
          code: 'INVALID_TAB'
        };
      }

      // Send volume change to content script
      try {
        await browser.tabs.sendMessage(tabId, {
          type: 'SET_VOLUME',
          payload: { volumeLevel }
        });
      } catch (error) {
        return {
          success: false,
          error: 'Content script not responding',
          code: 'CONTENT_SCRIPT_ERROR'
        };
      }

      // Update audio detector state
      const audioTab = this.audioDetector.getTabAudioState(tabId);
      if (audioTab) {
        audioTab.setVolumeLevel(volumeLevel);
        
        // Save volume settings for the domain
        const domain = this.extractDomain(tab.url);
        await this.storageService.updateVolumeSettings(domain, {
          defaultVolume: volumeLevel
        });
      }

      return {
        success: true,
        tabId,
        newVolumeLevel: volumeLevel
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: 'VOLUME_CHANGE_ERROR'
      };
    }
  }

  /**
   * Handle mute toggle message
   * @param {Object} message - Message object
   * @param {Object} sender - Message sender
   * @returns {Promise<Object>} Response object
   */
  async handleMuteToggle(message, sender) {
    try {
      const { tabId, isMuted } = message.payload;

      // Verify tab exists
      let tab;
      try {
        tab = await browser.tabs.get(tabId);
      } catch (error) {
        return {
          success: false,
          error: 'Tab not found',
          code: 'INVALID_TAB'
        };
      }

      // Send mute change to content script
      try {
        await browser.tabs.sendMessage(tabId, {
          type: 'SET_MUTE',
          payload: { isMuted }
        });
      } catch (error) {
        return {
          success: false,
          error: 'Content script not responding',
          code: 'CONTENT_SCRIPT_ERROR'
        };
      }

      // Update audio detector state
      const audioTab = this.audioDetector.getTabAudioState(tabId);
      if (audioTab) {
        audioTab.setMuteState(isMuted);
        
        // Save mute settings for the domain
        const domain = this.extractDomain(tab.url);
        await this.storageService.updateVolumeSettings(domain, {
          isMuted
        });
      }

      return {
        success: true,
        tabId,
        isMuted
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: 'MUTE_TOGGLE_ERROR'
      };
    }
  }

  /**
   * Handle get active tabs message
   * @param {Object} message - Message object
   * @param {Object} sender - Message sender
   * @returns {Promise<Object>} Response object
   */
  async handleGetActiveTabs(message, sender) {
    try {
      const activeTabs = this.audioDetector.getActiveTabs();
      const tabList = [];

      for (const [tabId, audioTab] of activeTabs) {
        tabList.push({
          tabId: audioTab.tabId,
          title: audioTab.title,
          url: audioTab.url,
          domain: audioTab.domain,
          volumeLevel: audioTab.volumeLevel,
          isMuted: audioTab.isMuted,
          isAudioActive: audioTab.isAudioActive,
          lastAudioActivity: audioTab.lastAudioActivity
        });
      }

      return {
        success: true,
        activeTabs: tabList,
        count: tabList.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: 'GET_ACTIVE_TABS_ERROR'
      };
    }
  }

  /**
   * Handle get tab state message
   * @param {Object} message - Message object
   * @param {Object} sender - Message sender
   * @returns {Promise<Object>} Response object
   */
  async handleGetTabState(message, sender) {
    try {
      const { tabId } = message.payload;
      const audioTab = this.audioDetector.getTabAudioState(tabId);

      if (!audioTab) {
        return {
          success: false,
          error: 'Tab not found in audio state',
          code: 'TAB_NOT_FOUND'
        };
      }

      return {
        success: true,
        tabState: {
          tabId: audioTab.tabId,
          title: audioTab.title,
          url: audioTab.url,
          domain: audioTab.domain,
          volumeLevel: audioTab.volumeLevel,
          isMuted: audioTab.isMuted,
          isAudioActive: audioTab.isAudioActive,
          lastAudioActivity: audioTab.lastAudioActivity,
          audioElements: audioTab.audioElements
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: 'GET_TAB_STATE_ERROR'
      };
    }
  }

  /**
   * Handle restore settings message
   * @param {Object} message - Message object
   * @param {Object} sender - Message sender
   * @returns {Promise<Object>} Response object
   */
  async handleRestoreSettings(message, sender) {
    try {
      const { tabId, url } = message.payload;
      const domain = this.extractDomain(url);
      const volumeSettings = await this.storageService.getVolumeSettings(domain);

      return {
        success: true,
        tabId,
        domain,
        volumeSettings: {
          defaultVolume: volumeSettings.defaultVolume || 100,
          isMuted: volumeSettings.isMuted || false,
          lastUsed: volumeSettings.lastUsed
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: 'RESTORE_SETTINGS_ERROR'
      };
    }
  }

  /**
   * Extract domain from URL
   * @param {string} url - URL to extract domain from
   * @returns {string} Domain name
   */
  extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  }

  /**
   * Add custom message handler
   * @param {string} messageType - Message type to handle
   * @param {Function} handler - Handler function
   */
  addMessageHandler(messageType, handler) {
    this.messageHandlers.set(messageType, handler);
  }

  /**
   * Remove message handler
   * @param {string} messageType - Message type to remove
   */
  removeMessageHandler(messageType) {
    this.messageHandlers.delete(messageType);
  }

  /**
   * Get all registered message types
   * @returns {Array<string>} Array of message types
   */
  getRegisteredMessageTypes() {
    return Array.from(this.messageHandlers.keys());
  }

  /**
   * Check if message type is supported
   * @param {string} messageType - Message type to check
   * @returns {boolean} True if supported
   */
  isMessageTypeSupported(messageType) {
    return this.messageHandlers.has(messageType);
  }

  /**
   * Get message handling statistics
   * @returns {Object} Statistics object
   */
  getStatistics() {
    return {
      registeredHandlers: this.messageHandlers.size,
      supportedTypes: this.getRegisteredMessageTypes()
    };
  }
}

// Factory function for tests
export function createMessageHandler(storageService, audioDetector) {
  return new MessageHandler(storageService, audioDetector);
}

// Export class for direct use
export { MessageHandler };