/**
 * Audio Detection Service
 * Handles audio detection in tabs and communication with content scripts
 */

import { AudioTab } from '../models/AudioTab.js';

/**
 * Audio detector class for managing audio detection across tabs
 */
class AudioDetector {
  constructor() {
    this.activeTabs = new Map();
    this.detectionCallbacks = new Set();
    this.isInitialized = false;
  }

  /**
   * Initialize the audio detector
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    // Set up tab event listeners
    if (browser?.tabs?.onUpdated) {
      browser.tabs.onUpdated.addListener(this.handleTabUpdated.bind(this));
    }
    
    if (browser?.tabs?.onRemoved) {
      browser.tabs.onRemoved.addListener(this.handleTabRemoved.bind(this));
    }

    this.isInitialized = true;
  }

  /**
   * Detect audio elements in a document (used by content script)
   * @param {Document} document - The document to scan
   * @returns {Promise<Array<Element>>} Array of audio/video elements
   */
  async detectAudioElements(document) {
    if (!document) {
      console.warn('Audio detection failed: Invalid document');
      return [];
    }

    try {
      const audioElements = [];
      
      // Find all audio and video elements
      const mediaElements = document.querySelectorAll('audio, video');
      
      for (const element of mediaElements) {
        // Skip elements without source or duration (no actual content)
        if ((!element.src && !element.currentSrc) || 
            (element.duration === 0 && isNaN(element.duration))) {
          continue;
        }
        
        // Include all elements with audio content, regardless of mute state
        // This allows muted tabs to remain visible in the extension
        audioElements.push(element);
      }
      
      return audioElements;
    } catch (error) {
      console.warn('Audio detection failed:', error.message);
      return [];
    }
  }

  /**
   * Handle tab updates for audio state changes
   * @param {number} tabId - Tab ID
   * @param {Object} changeInfo - Change information
   * @param {Object} tab - Tab object
   */
  async handleTabUpdated(tabId, changeInfo, tab) {
    // Check for audible state changes
    if (changeInfo.hasOwnProperty('audible')) {
      await this.updateTabAudioState(tabId, {
        isAudioActive: changeInfo.audible,
        url: tab.url,
        title: tab.title
      });
    }
  }

  /**
   * Handle tab removal
   * @param {number} tabId - Tab ID
   */
  handleTabRemoved(tabId) {
    this.activeTabs.delete(tabId);
    this.notifyDetectionCallbacks('tab_removed', { tabId });
  }

  /**
   * Update audio state for a tab
   * @param {number} tabId - Tab ID
   * @param {Object} audioData - Audio state data
   */
  async updateTabAudioState(tabId, audioData) {
    try {
      const existingTab = this.activeTabs.get(tabId);
      
      if (audioData.isAudioActive) {
        // Tab is now playing audio
        const audioTabData = {
          tabId,
          title: audioData.title || '',
          url: audioData.url || '',
          domain: this.extractDomain(audioData.url || ''),
          volumeLevel: existingTab ? existingTab.volumeLevel : 100,
          isMuted: existingTab ? existingTab.isMuted : false,
          isAudioActive: true,
          lastAudioActivity: Date.now(),
          audioElements: audioData.audioElements || []
        };
        
        const audioTab = new AudioTab(audioTabData);
        this.activeTabs.set(tabId, audioTab);
        
        this.notifyDetectionCallbacks('audio_started', { audioTab });
      } else {
        // Audio stopped in tab
        if (existingTab) {
          existingTab.setAudioActive(false);
          this.notifyDetectionCallbacks('audio_stopped', { audioTab: existingTab });
          
          // Remove from active tabs after a delay
          setTimeout(() => {
            this.activeTabs.delete(tabId);
          }, 5000);
        }
      }
    } catch (error) {
      console.error('Failed to update tab audio state:', error);
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
   * Add a callback for audio detection events
   * @param {Function} callback - Callback function
   */
  addDetectionCallback(callback) {
    this.detectionCallbacks.add(callback);
  }

  /**
   * Remove a detection callback
   * @param {Function} callback - Callback function
   */
  removeDetectionCallback(callback) {
    this.detectionCallbacks.delete(callback);
  }

  /**
   * Notify all detection callbacks
   * @param {string} event - Event type
   * @param {Object} data - Event data
   */
  notifyDetectionCallbacks(event, data) {
    for (const callback of this.detectionCallbacks) {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Detection callback error:', error);
      }
    }
  }

  /**
   * Get currently active audio tabs
   * @returns {Map<number, AudioTab>} Active tabs map
   */
  getActiveTabs() {
    return new Map(this.activeTabs);
  }

  /**
   * Get audio state for a specific tab
   * @param {number} tabId - Tab ID
   * @returns {AudioTab|null} Audio tab or null
   */
  getTabAudioState(tabId) {
    return this.activeTabs.get(tabId) || null;
  }

  /**
   * Check if a tab has audio
   * @param {number} tabId - Tab ID
   * @returns {boolean} True if tab has audio
   */
  hasTabAudio(tabId) {
    return this.activeTabs.has(tabId);
  }

  /**
   * Clean up stale tabs
   */
  cleanupStaleData() {
    const staleThreshold = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();
    
    for (const [tabId, audioTab] of this.activeTabs) {
      if (!audioTab.isAudioActive && (now - audioTab.lastAudioActivity) > staleThreshold) {
        this.activeTabs.delete(tabId);
      }
    }
  }
}

/**
 * YouTube-specific audio detector
 */
class YouTubeAudioDetector {
  /**
   * Detect YouTube video player audio
   * @returns {Promise<boolean>} True if YouTube audio is detected
   */
  async detectYouTubeAudio() {
    try {
      const moviePlayer = document.querySelector('#movie_player');
      const video = document.querySelector('.html5-main-video');
      
      return !!(moviePlayer && video && video.src);
    } catch (error) {
      console.warn('YouTube audio detection failed:', error);
      return false;
    }
  }

  /**
   * Get YouTube video element
   * @returns {Element|null} Video element or null
   */
  getVideoElement() {
    return document.querySelector('.html5-main-video');
  }

  /**
   * Check if current YouTube audio is content (not ad)
   * @returns {Promise<boolean>} True if content audio
   */
  async isContentAudio() {
    try {
      const moviePlayer = document.querySelector('#movie_player');
      return moviePlayer && !moviePlayer.classList.contains('ad-showing');
    } catch (error) {
      console.warn('YouTube content detection failed:', error);
      return false;
    }
  }
}

/**
 * Cross-origin audio detector
 */
class CrossOriginAudioDetector {
  /**
   * Detect audio in iframe
   * @param {Element} iframe - Iframe element
   * @returns {Promise<boolean>} True if iframe has audio
   */
  async detectIframeAudio(iframe) {
    try {
      // Check for audio indicators
      if (iframe.getAttribute('data-has-audio') === 'true') {
        return true;
      }
      
      // Check for known audio domains
      const audioSites = ['soundcloud.com', 'spotify.com', 'youtube.com'];
      const src = iframe.src || '';
      
      return audioSites.some(site => src.includes(site));
    } catch (error) {
      console.warn('Cross-origin audio detection failed:', error);
      return false;
    }
  }
}

/**
 * Content script interface (will be used by content scripts)
 */
class ContentScript {
  constructor() {
    this.audioDetector = new AudioDetector();
    this.volumeController = new VolumeController();
  }

  /**
   * Handle audio detected event
   * @param {Object} audioData - Audio detection data
   */
  async onAudioDetected(audioData) {
    try {
      const message = {
        type: 'TAB_AUDIO_UPDATE',
        payload: {
          tabId: audioData.tabId,
          isAudioActive: audioData.isAudioActive,
          audioElements: audioData.audioElements || [],
          url: audioData.url || (typeof window !== 'undefined' ? window.location.href : 'https://youtube.com/watch?v=test')
        },
        timestamp: Date.now()
      };

      if (browser?.runtime?.sendMessage) {
        await browser.runtime.sendMessage(message);
      }
    } catch (error) {
      console.error('Failed to send audio detection message:', error);
    }
  }

  /**
   * Handle audio stopped event
   * @param {Object} audioData - Audio stop data
   */
  async onAudioStopped(audioData) {
    try {
      const message = {
        type: 'TAB_AUDIO_UPDATE',
        payload: {
          tabId: audioData.tabId,
          isAudioActive: false,
          audioElements: [],
          url: audioData.url || (typeof window !== 'undefined' ? window.location.href : 'https://youtube.com/watch?v=test')
        },
        timestamp: Date.now()
      };

      if (browser?.runtime?.sendMessage) {
        await browser.runtime.sendMessage(message);
      }
    } catch (error) {
      console.error('Failed to send audio stop message:', error);
    }
  }

  /**
   * Handle incoming messages from background script
   * @param {Object} message - Message object
   */
  async handleMessage(message) {
    switch (message.type) {
      case 'SET_VOLUME':
        await this.volumeController.setVolume(message.payload.volumeLevel);
        break;
      case 'SET_MUTE':
        await this.volumeController.setMute(message.payload.isMuted);
        break;
      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  /**
   * Get volume controller
   * @returns {VolumeController} Volume controller
   */
  getVolumeController() {
    return this.volumeController;
  }

  /**
   * Handle new audio element added to DOM
   * @param {Element} element - Audio element
   */
  async onNewAudioElementAdded(element) {
    // Apply current volume settings to new element
    await this.volumeController.applySettingsToElement(element);
  }
}

/**
 * Volume controller for content scripts
 */
class VolumeController {
  constructor() {
    this.currentVolume = 100;
    this.currentAmplification = 1.0;
    this.isMuted = false;
  }

  /**
   * Set volume level
   * @param {number} volumeLevel - Volume level (0-200)
   */
  async setVolume(volumeLevel) {
    this.currentVolume = volumeLevel;
    this.currentAmplification = volumeLevel / 100;

    const mediaElements = document.querySelectorAll('audio, video');
    
    for (const element of mediaElements) {
      // HTML5 audio is capped at 1.0, so we set to min(volumeLevel/100, 1.0)
      element.volume = Math.min(volumeLevel / 100, 1.0);
    }
  }

  /**
   * Set mute state
   * @param {boolean} muted - Mute state
   */
  async setMute(muted) {
    this.isMuted = muted;
    
    const mediaElements = document.querySelectorAll('audio, video');
    
    for (const element of mediaElements) {
      element.muted = muted;
    }
  }

  /**
   * Get current amplification level
   * @returns {number} Amplification level
   */
  getCurrentAmplification() {
    return this.currentAmplification;
  }

  /**
   * Apply current settings to an element
   * @param {Element} element - Audio/video element
   */
  async applySettingsToElement(element) {
    if (element.tagName === 'AUDIO' || element.tagName === 'VIDEO') {
      element.volume = Math.min(this.currentVolume / 100, 1.0);
      element.muted = this.isMuted;
    }
  }
}

// Factory functions for tests
export function createAudioDetector() {
  return new AudioDetector();
}

export function createYouTubeAudioDetector() {
  return new YouTubeAudioDetector();
}

export function createCrossOriginAudioDetector() {
  return new CrossOriginAudioDetector();
}

export function createContentScript() {
  return new ContentScript();
}

// Export classes for direct use
export { AudioDetector, YouTubeAudioDetector, CrossOriginAudioDetector, ContentScript, VolumeController };