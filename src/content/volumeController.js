/**
 * Volume Controller
 * Controls volume of detected audio elements with support for amplification
 */

/**
 * Volume controller class for managing audio element volumes
 */
class VolumeController {
  constructor(audioDetector = null) {
    this.audioDetector = audioDetector;
    this.currentVolume = 100; // 0-200 scale
    this.isMuted = false;
    this.originalVolumes = new Map(); // Store original volumes for restoration
    this.audioContext = null;
    this.gainNodes = new Map(); // For amplification above 100%
    this.isWebAudioSupported = this.checkWebAudioSupported();
  }

  /**
   * Initialize the volume controller
   */
  initialize() {
    // Store original volumes of all existing elements
    this.storeOriginalVolumes();
    
    // Set up Web Audio Context if needed for amplification
    if (this.isWebAudioSupported) {
      this.setupWebAudioContext();
    }
  }

  /**
   * Set volume level for all audio elements
   * @param {number} volumeLevel - Volume level (0-200)
   */
  setVolume(volumeLevel) {
    if (typeof volumeLevel !== 'number' || volumeLevel < 0 || volumeLevel > 200) {
      console.warn('Invalid volume level:', volumeLevel);
      return;
    }

    this.currentVolume = volumeLevel;
    
    // Apply volume to all tracked elements
    if (this.audioDetector) {
      const audioElements = this.audioDetector.getAudioElements();
      
      for (const [element, info] of audioElements) {
        this.applyVolumeToElement(element, volumeLevel);
      }
    } else {
      // Fallback: find all audio/video elements in DOM
      const audioElements = document.querySelectorAll('audio, video');
      for (const element of audioElements) {
        this.applyVolumeToElement(element, volumeLevel);
      }
    }

    console.log('Volume set to:', volumeLevel + '%');
  }

  /**
   * Set mute state for all audio elements
   * @param {boolean} muted - Mute state
   */
  setMuted(muted) {
    if (typeof muted !== 'boolean') {
      console.warn('Invalid mute state:', muted);
      return;
    }

    this.isMuted = muted;
    
    // Apply mute to all tracked elements
    if (this.audioDetector) {
      const audioElements = this.audioDetector.getAudioElements();
      
      for (const [element] of audioElements) {
        this.applyMuteToElement(element, muted);
      }
    } else {
      // Fallback: find all audio/video elements in DOM
      const audioElements = document.querySelectorAll('audio, video');
      for (const element of audioElements) {
        this.applyMuteToElement(element, muted);
      }
    }

    console.log('Mute state set to:', muted);
  }

  /**
   * Apply volume to a specific element
   * @param {HTMLElement} element - Audio/video element
   * @param {number} volumeLevel - Volume level (0-200)
   */
  applyVolumeToElement(element, volumeLevel) {
    try {
      // Store original volume if not already stored
      if (!this.originalVolumes.has(element)) {
        this.originalVolumes.set(element, element.volume);
      }

      if (volumeLevel <= 100) {
        // Standard volume control (0-100%)
        element.volume = volumeLevel / 100;
        
        // Remove any Web Audio processing
        this.removeWebAudioProcessing(element);
      } else {
        // Amplified volume (100-200%) - requires Web Audio API
        element.volume = 1.0; // Max native volume
        
        if (this.isWebAudioSupported) {
          this.applyWebAudioAmplification(element, volumeLevel / 100);
        } else {
          console.warn('Volume amplification not supported - Web Audio API unavailable');
        }
      }
    } catch (error) {
      console.error('Error setting volume for element:', error);
    }
  }

  /**
   * Apply mute state to a specific element
   * @param {HTMLElement} element - Audio/video element
   * @param {boolean} muted - Mute state
   */
  applyMuteToElement(element, muted) {
    try {
      element.muted = muted;
    } catch (error) {
      console.error('Error setting mute for element:', error);
    }
  }

  /**
   * Apply Web Audio API amplification to element
   * @param {HTMLElement} element - Audio/video element
   * @param {number} gainValue - Gain value (1.0-2.0 for 100-200%)
   */
  applyWebAudioAmplification(element, gainValue) {
    if (!this.audioContext) {
      return;
    }

    try {
      // Remove existing processing for this element
      this.removeWebAudioProcessing(element);

      // Create audio source from the media element
      const source = this.audioContext.createMediaElementSource(element);
      
      // Create gain node for amplification
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = gainValue;
      
      // Connect the audio graph: source -> gain -> destination
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Store the gain node for later cleanup
      this.gainNodes.set(element, {
        source: source,
        gainNode: gainNode
      });

      console.log(`Applied Web Audio amplification: ${(gainValue * 100).toFixed(0)}%`);
    } catch (error) {
      console.error('Error applying Web Audio amplification:', error);
    }
  }

  /**
   * Remove Web Audio processing for an element
   * @param {HTMLElement} element - Audio/video element
   */
  removeWebAudioProcessing(element) {
    const audioNodes = this.gainNodes.get(element);
    if (audioNodes) {
      try {
        // Disconnect the audio nodes
        audioNodes.source.disconnect();
        audioNodes.gainNode.disconnect();
      } catch (error) {
        console.warn('Error disconnecting Web Audio nodes:', error);
      }
      
      this.gainNodes.delete(element);
    }
  }

  /**
   * Set up Web Audio Context for amplification
   */
  setupWebAudioContext() {
    if (!this.isWebAudioSupported) {
      return;
    }

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Resume context if suspended (required by some browsers)
      if (this.audioContext.state === 'suspended') {
        // Try to resume on user interaction
        document.addEventListener('click', () => {
          if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
          }
        }, { once: true });
      }
    } catch (error) {
      console.error('Failed to create Web Audio Context:', error);
      this.isWebAudioSupported = false;
    }
  }

  /**
   * Check if Web Audio API is supported
   * @returns {boolean} True if Web Audio API is available
   */
  checkWebAudioSupported() {
    return !!(window.AudioContext || window.webkitAudioContext);
  }

  /**
   * Store original volumes of all tracked elements
   */
  storeOriginalVolumes() {
    if (this.audioDetector) {
      const audioElements = this.audioDetector.getAudioElements();
      
      for (const [element] of audioElements) {
        if (!this.originalVolumes.has(element)) {
          this.originalVolumes.set(element, element.volume);
        }
      }
    } else {
      // Fallback: find all audio/video elements in DOM
      const audioElements = document.querySelectorAll('audio, video');
      for (const element of audioElements) {
        if (!this.originalVolumes.has(element)) {
          this.originalVolumes.set(element, element.volume);
        }
      }
    }
  }

  /**
   * Apply current settings to a newly detected element
   * @param {HTMLElement} element - Newly detected audio element
   */
  applySettingsToNewElement(element) {
    // Store original volume
    this.originalVolumes.set(element, element.volume);
    
    // Apply current volume and mute settings
    this.applyVolumeToElement(element, this.currentVolume);
    this.applyMuteToElement(element, this.isMuted);
  }

  /**
   * Restore original volume to an element
   * @param {HTMLElement} element - Audio/video element
   */
  restoreOriginalVolume(element) {
    const originalVolume = this.originalVolumes.get(element);
    if (originalVolume !== undefined) {
      try {
        element.volume = originalVolume;
        this.removeWebAudioProcessing(element);
        this.originalVolumes.delete(element);
      } catch (error) {
        console.error('Error restoring original volume:', error);
      }
    }
  }

  /**
   * Restore all elements to their original volumes
   */
  restoreAllOriginalVolumes() {
    for (const [element] of this.originalVolumes) {
      this.restoreOriginalVolume(element);
    }
  }

  /**
   * Get current volume level
   * @returns {number} Current volume level (0-200)
   */
  getCurrentVolume() {
    return this.currentVolume;
  }

  /**
   * Get current volume level (alias for getCurrentVolume)
   * @returns {number} Current volume level (0-200)
   */
  getVolume() {
    return this.currentVolume;
  }

  /**
   * Get current mute state
   * @returns {boolean} Current mute state
   */
  getCurrentMuteState() {
    return this.isMuted;
  }

  /**
   * Check if amplification is available
   * @returns {boolean} True if amplification is supported
   */
  isAmplificationAvailable() {
    return this.isWebAudioSupported;
  }

  /**
   * Get controller status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      currentVolume: this.currentVolume,
      isMuted: this.isMuted,
      webAudioSupported: this.isWebAudioSupported,
      audioContextState: this.audioContext ? this.audioContext.state : 'unavailable',
      trackedElements: this.originalVolumes.size,
      amplifiedElements: this.gainNodes.size
    };
  }

  /**
   * Clean up volume controller resources
   */
  cleanup() {
    // Restore all original volumes
    this.restoreAllOriginalVolumes();
    
    // Clean up Web Audio resources
    for (const [element] of this.gainNodes) {
      this.removeWebAudioProcessing(element);
    }
    
    // Close audio context
    if (this.audioContext) {
      try {
        this.audioContext.close();
        this.audioContext = null;
      } catch (error) {
        console.warn('Error closing audio context:', error);
      }
    }
    
    this.gainNodes.clear();
    this.originalVolumes.clear();
  }
}

/**
 * YouTube-specific volume controller
 */
class YouTubeVolumeController extends VolumeController {
  constructor(audioDetector) {
    super(audioDetector);
    this.youtubePlayer = null;
  }

  /**
   * Initialize YouTube-specific controller
   */
  initialize() {
    super.initialize();
    this.detectYouTubePlayer();
  }

  /**
   * Detect YouTube player API
   */
  detectYouTubePlayer() {
    // Look for YouTube player API
    if (window.YT && window.YT.Player) {
      // Try to find player instance
      const playerElements = document.querySelectorAll('[id*="player"]');
      for (const element of playerElements) {
        if (element.getPlayerState) {
          this.youtubePlayer = element;
          break;
        }
      }
    }
  }

  /**
   * Set volume using YouTube API if available
   * @param {number} volumeLevel - Volume level (0-200)
   */
  setVolume(volumeLevel) {
    if (this.youtubePlayer && this.youtubePlayer.setVolume) {
      try {
        // YouTube API only supports 0-100, so cap at 100 for API control
        const youtubeVolume = Math.min(volumeLevel, 100);
        this.youtubePlayer.setVolume(youtubeVolume);
        
        // If volume > 100, fall back to Web Audio amplification
        if (volumeLevel > 100) {
          const videoElement = document.querySelector('video.html5-main-video');
          if (videoElement) {
            this.applyWebAudioAmplification(videoElement, volumeLevel / 100);
          }
        }
        
        console.log('YouTube volume set via API:', youtubeVolume + '%');
        return;
      } catch (error) {
        console.warn('YouTube API volume control failed:', error);
      }
    }
    
    // Fall back to standard volume control
    super.setVolume(volumeLevel);
  }

  /**
   * Set mute using YouTube API if available
   * @param {boolean} muted - Mute state
   */
  setMuted(muted) {
    if (this.youtubePlayer) {
      try {
        if (muted && this.youtubePlayer.mute) {
          this.youtubePlayer.mute();
        } else if (!muted && this.youtubePlayer.unMute) {
          this.youtubePlayer.unMute();
        }
        console.log('YouTube mute set via API:', muted);
        return;
      } catch (error) {
        console.warn('YouTube API mute control failed:', error);
      }
    }
    
    // Fall back to standard mute control
    super.setMuted(muted);
  }
}

// Factory functions for creating controller instances
function createVolumeController(audioDetector = null) {
  return new VolumeController(audioDetector);
}

function createYouTubeVolumeController(audioDetector = null) {
  return new YouTubeVolumeController(audioDetector);
}

// Export for testing and ES6 module compatibility
export { createVolumeController, createYouTubeVolumeController, VolumeController, YouTubeVolumeController };

// Make available globally for other content scripts
if (typeof window !== 'undefined') {
  window.createVolumeController = createVolumeController;
  window.createYouTubeVolumeController = createYouTubeVolumeController;
  window.VolumeController = VolumeController;
  window.YouTubeVolumeController = YouTubeVolumeController;
}