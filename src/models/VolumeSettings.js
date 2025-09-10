/**
 * VolumeSettings model class
 * Represents persistent volume settings for a specific domain
 */

export class VolumeSettings {
  /**
   * @param {Object} data - VolumeSettings data
   * @param {string} data.domain - Domain name (e.g., "youtube.com")
   * @param {number} data.defaultVolume - Default volume level for this domain (0-200)
   * @param {boolean} data.isMuted - Default mute state for this domain
   * @param {number} data.lastUsed - Timestamp of last time settings were used
   * @param {number} data.createdAt - Timestamp when settings were first created
   */
  constructor(data) {
    this.validate(data);
    
    this.domain = data.domain;
    this.defaultVolume = data.defaultVolume;
    this.isMuted = data.isMuted;
    this.lastUsed = data.lastUsed || Date.now();
    this.createdAt = data.createdAt || Date.now();
  }

  /**
   * Validates VolumeSettings data according to contract schema
   * @param {Object} data - Data to validate
   * @throws {Error} If validation fails
   */
  validate(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('VolumeSettings data must be an object');
    }

    // Required fields validation
    const requiredFields = ['domain', 'defaultVolume', 'isMuted'];
    const missingFields = requiredFields.filter(field => !(field in data));
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Domain validation
    if (typeof data.domain !== 'string' || !data.domain.trim()) {
      throw new Error('domain must be non-empty string');
    }

    if (!this.isValidDomain(data.domain)) {
      throw new Error('Invalid domain format');
    }

    // Volume validation
    if (typeof data.defaultVolume !== 'number' || data.defaultVolume < 0 || data.defaultVolume > 200) {
      throw new Error('defaultVolume must be between 0 and 200');
    }

    // Mute state validation
    if (typeof data.isMuted !== 'boolean') {
      throw new Error('isMuted must be boolean');
    }

    // Timestamp validations
    if (data.lastUsed !== undefined && (!Number.isInteger(data.lastUsed) || data.lastUsed < 0)) {
      throw new Error('lastUsed must be valid timestamp');
    }

    if (data.createdAt !== undefined && (!Number.isInteger(data.createdAt) || data.createdAt < 0)) {
      throw new Error('createdAt must be valid timestamp');
    }
  }

  /**
   * Validates domain name format
   * @param {string} domain - Domain to validate
   * @returns {boolean} True if valid domain format
   */
  isValidDomain(domain) {
    // Basic domain validation - should contain only valid characters
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-_.]*[a-zA-Z0-9]$/;
    
    // Check basic format
    if (!domainRegex.test(domain)) {
      return false;
    }

    // Domain should not start or end with special characters
    if (domain.startsWith('.') || domain.startsWith('-') || 
        domain.endsWith('.') || domain.endsWith('-')) {
      return false;
    }

    // Should contain at least one dot for TLD
    if (!domain.includes('.')) {
      return false;
    }

    // Check for common invalid patterns
    if (domain.includes('..') || domain.includes('--')) {
      return false;
    }

    return true;
  }

  /**
   * Updates volume setting
   * @param {number} newVolume - New default volume (0-200)
   */
  setDefaultVolume(newVolume) {
    if (typeof newVolume !== 'number' || newVolume < 0 || newVolume > 200) {
      throw new Error('defaultVolume must be between 0 and 200');
    }
    this.defaultVolume = newVolume;
    this.lastUsed = Date.now();
  }

  /**
   * Updates mute setting
   * @param {boolean} isMuted - New mute state
   */
  setMuteState(isMuted) {
    if (typeof isMuted !== 'boolean') {
      throw new Error('isMuted must be boolean');
    }
    this.isMuted = isMuted;
    this.lastUsed = Date.now();
  }

  /**
   * Updates the last used timestamp
   */
  markAsUsed() {
    this.lastUsed = Date.now();
  }

  /**
   * Checks if settings are recently used
   * @param {number} maxAge - Maximum age in milliseconds (default: 30 days)
   * @returns {boolean} True if recently used
   */
  isRecentlyUsed(maxAge = 30 * 24 * 60 * 60 * 1000) {
    return (Date.now() - this.lastUsed) <= maxAge;
  }

  /**
   * Gets age of settings in days
   * @returns {number} Age in days
   */
  getAgeInDays() {
    return Math.floor((Date.now() - this.createdAt) / (24 * 60 * 60 * 1000));
  }

  /**
   * Gets last used time in days ago
   * @returns {number} Days since last used
   */
  getDaysSinceLastUsed() {
    return Math.floor((Date.now() - this.lastUsed) / (24 * 60 * 60 * 1000));
  }

  /**
   * Gets volume as percentage string for display
   * @returns {string} Volume percentage (e.g., "75%", "150%")
   */
  getVolumePercentage() {
    return `${Math.round(this.defaultVolume)}%`;
  }

  /**
   * Checks if volume is amplified above 100%
   * @returns {boolean} True if volume > 100
   */
  isAmplified() {
    return this.defaultVolume > 100;
  }

  /**
   * Gets display-friendly domain name
   * @returns {string} Domain name (removes 'www.' prefix if present)
   */
  getDisplayDomain() {
    return this.domain.replace(/^www\./, '');
  }

  /**
   * Creates a copy with updated values
   * @param {Object} updates - Values to update
   * @returns {VolumeSettings} New VolumeSettings instance with updates
   */
  update(updates) {
    return new VolumeSettings({
      ...this.toJSON(),
      ...updates,
      lastUsed: Date.now() // Always update lastUsed on any change
    });
  }

  /**
   * Converts VolumeSettings to plain object for storage
   * @returns {Object} Plain object representation
   */
  toJSON() {
    return {
      domain: this.domain,
      defaultVolume: this.defaultVolume,
      isMuted: this.isMuted,
      lastUsed: this.lastUsed,
      createdAt: this.createdAt
    };
  }

  /**
   * Creates VolumeSettings from stored data
   * @param {Object} data - Stored data object
   * @returns {VolumeSettings} New VolumeSettings instance
   */
  static fromJSON(data) {
    return new VolumeSettings(data);
  }

  /**
   * Creates default VolumeSettings for a domain
   * @param {string} domain - Domain name
   * @param {Object} options - Optional overrides
   * @returns {VolumeSettings} New VolumeSettings instance with defaults
   */
  static createDefault(domain, options = {}) {
    return new VolumeSettings({
      domain,
      defaultVolume: options.defaultVolume || 100,
      isMuted: options.isMuted || false,
      lastUsed: Date.now(),
      createdAt: Date.now(),
      ...options
    });
  }

  /**
   * Creates VolumeSettings from AudioTab
   * @param {AudioTab} audioTab - AudioTab instance
   * @param {Object} options - Optional overrides
   * @returns {VolumeSettings} New VolumeSettings instance
   */
  static fromAudioTab(audioTab, options = {}) {
    return new VolumeSettings({
      domain: audioTab.domain,
      defaultVolume: audioTab.volumeLevel,
      isMuted: audioTab.isMuted,
      lastUsed: Date.now(),
      createdAt: Date.now(),
      ...options
    });
  }

  /**
   * Merges multiple VolumeSettings for the same domain
   * Uses the most recent settings and averages volume if specified
   * @param {Array<VolumeSettings>} settingsArray - Array of VolumeSettings for same domain
   * @param {boolean} averageVolume - Whether to average volume levels
   * @returns {VolumeSettings} Merged VolumeSettings
   */
  static merge(settingsArray, averageVolume = false) {
    if (!Array.isArray(settingsArray) || settingsArray.length === 0) {
      throw new Error('settingsArray must be non-empty array');
    }

    if (settingsArray.length === 1) {
      return settingsArray[0];
    }

    // Sort by last used (most recent first)
    const sorted = settingsArray.sort((a, b) => b.lastUsed - a.lastUsed);
    const mostRecent = sorted[0];

    let volume = mostRecent.defaultVolume;
    if (averageVolume) {
      const avgVolume = settingsArray.reduce((sum, s) => sum + s.defaultVolume, 0) / settingsArray.length;
      volume = Math.round(avgVolume);
    }

    return new VolumeSettings({
      domain: mostRecent.domain,
      defaultVolume: volume,
      isMuted: mostRecent.isMuted,
      lastUsed: mostRecent.lastUsed,
      createdAt: Math.min(...settingsArray.map(s => s.createdAt))
    });
  }
}

// Export validation function for use in tests
export function validateVolumeSettings(settings) {
  const instance = new VolumeSettings(settings);
  return instance;
}