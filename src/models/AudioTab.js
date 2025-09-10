/**
 * AudioTab model class
 * Represents a Firefox tab currently playing audio with its volume control state
 */

export class AudioTab {
  /**
   * @param {Object} data - AudioTab data
   * @param {number} data.tabId - Firefox tab identifier
   * @param {string} data.title - Tab title for display purposes
   * @param {string} data.url - Full URL of the tab
   * @param {string} data.domain - Extracted domain for persistent settings
   * @param {string} [data.favicon] - Tab favicon URL for visual identification
   * @param {number} data.volumeLevel - Current volume level percentage (0-200)
   * @param {boolean} data.isMuted - Current mute state of the tab
   * @param {boolean} data.isAudioActive - Whether tab is currently playing audio
   * @param {number} data.lastAudioActivity - Last time audio state changed
   * @param {Array<string>} [data.audioElements] - List of detected audio/video elements
   */
  constructor(data) {
    this.validate(data);
    
    this.tabId = data.tabId;
    this.title = data.title;
    this.url = data.url;
    this.domain = data.domain || this.extractDomain(data.url);
    this.favicon = data.favicon || null;
    this.volumeLevel = data.volumeLevel;
    this.isMuted = data.isMuted;
    this.isAudioActive = data.isAudioActive;
    this.lastAudioActivity = data.lastAudioActivity || Date.now();
    this.audioElements = data.audioElements || [];
  }

  /**
   * Validates AudioTab data according to contract schema
   * @param {Object} data - Data to validate
   * @throws {Error} If validation fails
   */
  validate(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('AudioTab data must be an object');
    }

    // Required fields validation
    const requiredFields = ['tabId', 'title', 'url', 'volumeLevel', 'isMuted', 'isAudioActive'];
    const missingFields = requiredFields.filter(field => !(field in data));
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Type and value validations
    if (!Number.isInteger(data.tabId) || data.tabId <= 0) {
      throw new Error('tabId must be positive integer');
    }

    if (typeof data.title !== 'string') {
      throw new Error('title must be string');
    }

    if (typeof data.url !== 'string') {
      throw new Error('url must be string');
    }

    if (!this.isValidUrl(data.url)) {
      throw new Error('url must be valid HTTP/HTTPS URL');
    }

    if (typeof data.volumeLevel !== 'number' || data.volumeLevel < 0 || data.volumeLevel > 200) {
      throw new Error('volumeLevel must be between 0 and 200');
    }

    if (typeof data.isMuted !== 'boolean') {
      throw new Error('isMuted must be boolean');
    }

    if (typeof data.isAudioActive !== 'boolean') {
      throw new Error('isAudioActive must be boolean');
    }

    if (data.lastAudioActivity !== undefined && (!Number.isInteger(data.lastAudioActivity) || data.lastAudioActivity < 0)) {
      throw new Error('lastAudioActivity must be valid timestamp');
    }

    if (data.audioElements !== undefined && !Array.isArray(data.audioElements)) {
      throw new Error('audioElements must be array');
    }

    if (data.domain !== undefined && typeof data.domain !== 'string') {
      throw new Error('domain must be string');
    }
  }

  /**
   * Validates URL format
   * @param {string} url - URL to validate
   * @returns {boolean} True if valid HTTP/HTTPS URL
   */
  isValidUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Extracts domain from URL
   * @param {string} url - Full URL
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
   * Updates volume level with validation
   * @param {number} newVolumeLevel - New volume level (0-200)
   */
  setVolumeLevel(newVolumeLevel) {
    if (typeof newVolumeLevel !== 'number' || newVolumeLevel < 0 || newVolumeLevel > 200) {
      throw new Error('volumeLevel must be between 0 and 200');
    }
    this.volumeLevel = newVolumeLevel;
    this.lastAudioActivity = Date.now();
  }

  /**
   * Updates mute state
   * @param {boolean} isMuted - New mute state
   */
  setMuteState(isMuted) {
    if (typeof isMuted !== 'boolean') {
      throw new Error('isMuted must be boolean');
    }
    this.isMuted = isMuted;
    this.lastAudioActivity = Date.now();
  }

  /**
   * Updates audio activity state
   * @param {boolean} isActive - Whether audio is currently active
   */
  setAudioActive(isActive) {
    if (typeof isActive !== 'boolean') {
      throw new Error('isAudioActive must be boolean');
    }
    this.isAudioActive = isActive;
    this.lastAudioActivity = Date.now();
  }

  /**
   * Updates list of detected audio elements
   * @param {Array<string>} elements - Audio element types
   */
  setAudioElements(elements) {
    if (!Array.isArray(elements)) {
      throw new Error('audioElements must be array');
    }
    this.audioElements = elements;
  }

  /**
   * Checks if tab is considered stale (inactive for too long)
   * @param {number} maxInactiveTime - Maximum inactive time in milliseconds (default: 5 minutes)
   * @returns {boolean} True if tab is stale
   */
  isStale(maxInactiveTime = 5 * 60 * 1000) {
    return !this.isAudioActive && (Date.now() - this.lastAudioActivity) > maxInactiveTime;
  }

  /**
   * Returns display-friendly title with truncation
   * @param {number} maxLength - Maximum title length (default: 50)
   * @returns {string} Truncated title
   */
  getDisplayTitle(maxLength = 50) {
    if (this.title.length <= maxLength) {
      return this.title;
    }
    return this.title.substring(0, maxLength - 3) + '...';
  }

  /**
   * Gets volume as percentage string for display
   * @returns {string} Volume percentage (e.g., "75%", "150%")
   */
  getVolumePercentage() {
    return `${Math.round(this.volumeLevel)}%`;
  }

  /**
   * Checks if volume is amplified above 100%
   * @returns {boolean} True if volume > 100
   */
  isAmplified() {
    return this.volumeLevel > 100;
  }

  /**
   * Converts AudioTab to plain object for storage
   * @returns {Object} Plain object representation
   */
  toJSON() {
    return {
      tabId: this.tabId,
      title: this.title,
      url: this.url,
      domain: this.domain,
      favicon: this.favicon,
      volumeLevel: this.volumeLevel,
      isMuted: this.isMuted,
      isAudioActive: this.isAudioActive,
      lastAudioActivity: this.lastAudioActivity,
      audioElements: this.audioElements
    };
  }

  /**
   * Creates AudioTab from stored data
   * @param {Object} data - Stored data object
   * @returns {AudioTab} New AudioTab instance
   */
  static fromJSON(data) {
    return new AudioTab(data);
  }

  /**
   * Creates AudioTab from browser tab object
   * @param {Object} tab - Browser tab object from tabs API
   * @param {Object} options - Additional options
   * @returns {AudioTab} New AudioTab instance
   */
  static fromBrowserTab(tab, options = {}) {
    return new AudioTab({
      tabId: tab.id,
      title: tab.title || '',
      url: tab.url || '',
      domain: options.domain,
      favicon: tab.favIconUrl || null,
      volumeLevel: options.volumeLevel || 100,
      isMuted: options.isMuted || false,
      isAudioActive: options.isAudioActive || tab.audible || false,
      lastAudioActivity: Date.now(),
      audioElements: options.audioElements || []
    });
  }
}

// Export validation function for use in tests
export function validateAudioTab(audioTab) {
  const instance = new AudioTab(audioTab);
  return instance;
}