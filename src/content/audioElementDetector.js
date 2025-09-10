/**
 * Audio Element Detector
 * Detects and tracks audio/video elements in the page DOM
 */

/**
 * Audio element detector class for content scripts
 */
class AudioElementDetector {
  constructor() {
    this.audioElements = new Map();
    this.mutationObserver = null;
    this.isObserving = false;
    this.detectYouTube = this.isYouTubePage();
    this.youtubePlayer = null;
  }

  /**
   * Initialize the detector and start scanning
   */
  initialize() {
    // Scan existing DOM
    this.scanForAudioElements();
    
    // Set up mutation observer for dynamic content
    this.setupMutationObserver();
    
    // Special handling for YouTube
    if (this.detectYouTube) {
      this.setupYouTubeDetection();
    }
  }

  /**
   * Scan DOM for audio and video elements
   */
  scanForAudioElements() {
    const audioElements = document.querySelectorAll('audio, video');
    const previousCount = this.audioElements.size;
    
    audioElements.forEach(element => {
      // Track all audio elements regardless of mute state
      if (!this.audioElements.has(element)) {
        this.trackElement(element);
      }
    });

    // Check if we found new elements
    if (this.audioElements.size !== previousCount) {
      this.reportAudioState();
    }
  }

  /**
   * Track an audio/video element
   * @param {HTMLElement} element - Audio or video element
   */
  trackElement(element) {
    const elementInfo = {
      element: element,
      type: element.tagName.toLowerCase(),
      src: element.src || element.currentSrc || 'unknown',
      id: element.id || this.generateElementId(),
      isPlaying: !element.paused,
      volume: element.volume,
      muted: element.muted
    };

    this.audioElements.set(element, elementInfo);
    
    // Listen for play/pause events
    element.addEventListener('play', () => this.onElementPlay(element));
    element.addEventListener('pause', () => this.onElementPause(element));
    element.addEventListener('volumechange', () => this.onVolumeChange(element));
    element.addEventListener('loadstart', () => this.onElementLoadStart(element));
    
    console.log('Audio element detected:', elementInfo);
  }

  /**
   * Set up mutation observer to detect dynamically added elements
   */
  setupMutationObserver() {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }

    this.mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if the added node is an audio/video element
              if (node.tagName === 'AUDIO' || node.tagName === 'VIDEO') {
                this.trackElement(node);
              }
              
              // Check for nested audio/video elements
              const nestedElements = node.querySelectorAll?.('audio, video');
              if (nestedElements) {
                nestedElements.forEach(element => {
                  if (!this.audioElements.has(element)) {
                    this.trackElement(element);
                  }
                });
              }
            }
          });
        }
      });
    });

    this.mutationObserver.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });
    
    this.isObserving = true;
  }

  /**
   * Set up YouTube-specific detection
   */
  setupYouTubeDetection() {
    // Try to detect YouTube player
    this.detectYouTubePlayer();
    
    // YouTube uses dynamic content, so check periodically
    const checkInterval = setInterval(() => {
      if (!this.youtubePlayer) {
        this.detectYouTubePlayer();
      } else {
        clearInterval(checkInterval);
      }
    }, 1000);
    
    // Clear interval after 10 seconds to avoid infinite checking
    setTimeout(() => clearInterval(checkInterval), 10000);
  }

  /**
   * Detect YouTube player element
   */
  detectYouTubePlayer() {
    // Look for various YouTube player selectors
    const selectors = [
      'video.html5-main-video', // Main YouTube video
      'video.video-stream', // Alternative selector
      '#movie_player video', // Player container video
      '.html5-video-player video' // HTML5 player video
    ];

    for (const selector of selectors) {
      const player = document.querySelector(selector);
      if (player) {
        this.youtubePlayer = player;
        this.trackElement(player);
        console.log('YouTube player detected:', selector);
        break;
      }
    }
  }

  /**
   * Check if current page is YouTube
   * @returns {boolean} True if YouTube page
   */
  isYouTubePage() {
    return window.location.hostname.includes('youtube.com') || 
           window.location.hostname.includes('youtu.be');
  }

  /**
   * Handle element play event
   * @param {HTMLElement} element - Audio/video element
   */
  onElementPlay(element) {
    const elementInfo = this.audioElements.get(element);
    if (elementInfo) {
      elementInfo.isPlaying = true;
      this.reportAudioState();
    }
  }

  /**
   * Handle element pause event
   * @param {HTMLElement} element - Audio/video element
   */
  onElementPause(element) {
    const elementInfo = this.audioElements.get(element);
    if (elementInfo) {
      elementInfo.isPlaying = false;
      this.reportAudioState();
    }
  }

  /**
   * Handle volume change event
   * @param {HTMLElement} element - Audio/video element
   */
  onVolumeChange(element) {
    const elementInfo = this.audioElements.get(element);
    if (elementInfo) {
      elementInfo.volume = element.volume;
      elementInfo.muted = element.muted;
    }
  }

  /**
   * Handle element load start event (new content)
   * @param {HTMLElement} element - Audio/video element
   */
  onElementLoadStart(element) {
    const elementInfo = this.audioElements.get(element);
    if (elementInfo) {
      elementInfo.src = element.src || element.currentSrc || 'unknown';
      this.reportAudioState();
    }
  }

  /**
   * Report current audio state to background script
   */
  reportAudioState() {
    const hasActiveAudio = this.hasActiveAudio();
    const audioElements = this.getAudioElementTypes();
    
    try {
      browser.runtime.sendMessage({
        type: 'TAB_AUDIO_UPDATE',
        payload: {
          tabId: this.getTabId(),
          isAudioActive: hasActiveAudio,
          audioElements: audioElements,
          url: window.location.href
        }
      }).catch(error => {
        console.warn('Failed to report audio state:', error);
      });
    } catch (error) {
      console.warn('Browser runtime not available:', error);
    }
  }

  /**
   * Check if any audio is currently active
   * @returns {boolean} True if any audio element is playing
   */
  hasActiveAudio() {
    for (const [element, info] of this.audioElements) {
      // Consider audio active if element is either:
      // 1. Currently playing audio, OR
      // 2. Has audio content and can potentially play (even if muted)
      if ((info.isPlaying && !element.muted) || 
          (element.duration > 0 || !isNaN(element.duration))) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get types of detected audio elements
   * @returns {Array<string>} Array of element types
   */
  getAudioElementTypes() {
    const types = [];
    for (const [, info] of this.audioElements) {
      if (info.isPlaying && types.indexOf(info.type) === -1) {
        types.push(info.type);
      }
    }
    
    if (this.detectYouTube && types.length > 0) {
      types.push('youtube');
    }
    
    return types;
  }

  /**
   * Get all tracked audio elements
   * @returns {Map} Map of tracked elements
   */
  getAudioElements() {
    return new Map(this.audioElements);
  }

  /**
   * Get tab ID from browser API
   * @returns {number} Current tab ID or 0 if unavailable
   */
  getTabId() {
    // In content scripts, we don't have direct access to tab ID
    // This will be resolved by the background script
    return 0;
  }

  /**
   * Generate unique ID for element
   * @returns {string} Unique element identifier
   */
  generateElementId() {
    return 'audio-element-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Clean up detector resources
   */
  cleanup() {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
    
    // Remove event listeners
    for (const [element] of this.audioElements) {
      try {
        element.removeEventListener('play', () => this.onElementPlay(element));
        element.removeEventListener('pause', () => this.onElementPause(element));
        element.removeEventListener('volumechange', () => this.onVolumeChange(element));
        element.removeEventListener('loadstart', () => this.onElementLoadStart(element));
      } catch (error) {
        console.warn('Error removing event listeners:', error);
      }
    }
    
    this.audioElements.clear();
    this.isObserving = false;
  }

  /**
   * Force rescan of DOM for audio elements
   */
  rescan() {
    this.scanForAudioElements();
  }

  /**
   * Get detector status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      isObserving: this.isObserving,
      elementCount: this.audioElements.size,
      hasActiveAudio: this.hasActiveAudio(),
      isYouTube: this.detectYouTube,
      youtubePlayerDetected: !!this.youtubePlayer
    };
  }
}

// Factory function for creating detector instances
function createAudioElementDetector() {
  return new AudioElementDetector();
}

// Export for testing and ES6 module compatibility
export { createAudioElementDetector, AudioElementDetector };

// Make available globally for other content scripts
if (typeof window !== 'undefined') {
  window.createAudioElementDetector = createAudioElementDetector;
  window.AudioElementDetector = AudioElementDetector;
}