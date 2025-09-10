/**
 * GlobalSettings model class
 * Represents extension-wide configuration settings
 */

export class GlobalSettings {
  /**
   * @param {Object} data - GlobalSettings data
   * @param {number} data.defaultVolume - Default volume level for new tabs (0-200)
   * @param {boolean} data.showInactiveTabs - Whether to show tabs with no current audio
   * @param {boolean} data.autoCleanup - Whether to auto-remove stopped audio tabs
   * @param {number} data.cleanupDelaySeconds - Delay before removing inactive tabs (5-300 seconds)
   * @param {boolean} data.enableNotifications - Whether to show notifications for audio changes
   * @param {boolean} data.syncSettings - Whether to enable cross-browser sync
   * @param {number} data.minVolumeStep - Minimum volume adjustment step (1-10)
   * @param {number} data.maxVolumeLimit - Maximum allowed volume level (100-200)
   */
  constructor(data) {
    this.validate(data);
    
    this.defaultVolume = data.defaultVolume;
    this.showInactiveTabs = data.showInactiveTabs;
    this.autoCleanup = data.autoCleanup;
    this.cleanupDelaySeconds = data.cleanupDelaySeconds;
    this.enableNotifications = data.enableNotifications;
    this.syncSettings = data.syncSettings;
    this.minVolumeStep = data.minVolumeStep;
    this.maxVolumeLimit = data.maxVolumeLimit;
  }

  /**
   * Validates GlobalSettings data according to contract schema
   * @param {Object} data - Data to validate
   * @throws {Error} If validation fails
   */
  validate(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('GlobalSettings data must be an object');
    }

    // Required fields validation
    const requiredFields = [
      'defaultVolume',
      'showInactiveTabs', 
      'autoCleanup',
      'cleanupDelaySeconds',
      'enableNotifications',
      'syncSettings',
      'minVolumeStep',
      'maxVolumeLimit'
    ];
    const missingFields = requiredFields.filter(field => !(field in data));
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Type and value validations
    if (typeof data.defaultVolume !== 'number' || data.defaultVolume < 0 || data.defaultVolume > 200) {
      throw new Error('defaultVolume must be between 0 and 200');
    }

    if (typeof data.showInactiveTabs !== 'boolean') {
      throw new Error('showInactiveTabs must be boolean');
    }

    if (typeof data.autoCleanup !== 'boolean') {
      throw new Error('autoCleanup must be boolean');
    }

    if (!Number.isInteger(data.cleanupDelaySeconds) || data.cleanupDelaySeconds < 5 || data.cleanupDelaySeconds > 300) {
      throw new Error('cleanupDelaySeconds must be integer between 5 and 300');
    }

    if (typeof data.enableNotifications !== 'boolean') {
      throw new Error('enableNotifications must be boolean');
    }

    if (typeof data.syncSettings !== 'boolean') {
      throw new Error('syncSettings must be boolean');
    }

    if (!Number.isInteger(data.minVolumeStep) || data.minVolumeStep < 1 || data.minVolumeStep > 10) {
      throw new Error('minVolumeStep must be integer between 1 and 10');
    }

    if (!Number.isInteger(data.maxVolumeLimit) || data.maxVolumeLimit < 100 || data.maxVolumeLimit > 200) {
      throw new Error('maxVolumeLimit must be integer between 100 and 200');
    }
  }

  /**
   * Updates default volume setting
   * @param {number} newVolume - New default volume (0-200)
   */
  setDefaultVolume(newVolume) {
    if (typeof newVolume !== 'number' || newVolume < 0 || newVolume > 200) {
      throw new Error('defaultVolume must be between 0 and 200');
    }
    this.defaultVolume = newVolume;
  }

  /**
   * Updates show inactive tabs setting
   * @param {boolean} showInactive - New show inactive tabs setting
   */
  setShowInactiveTabs(showInactive) {
    if (typeof showInactive !== 'boolean') {
      throw new Error('showInactiveTabs must be boolean');
    }
    this.showInactiveTabs = showInactive;
  }

  /**
   * Updates auto cleanup setting
   * @param {boolean} autoCleanup - New auto cleanup setting
   */
  setAutoCleanup(autoCleanup) {
    if (typeof autoCleanup !== 'boolean') {
      throw new Error('autoCleanup must be boolean');
    }
    this.autoCleanup = autoCleanup;
  }

  /**
   * Updates cleanup delay setting
   * @param {number} delaySeconds - New cleanup delay in seconds (5-300)
   */
  setCleanupDelay(delaySeconds) {
    if (!Number.isInteger(delaySeconds) || delaySeconds < 5 || delaySeconds > 300) {
      throw new Error('cleanupDelaySeconds must be integer between 5 and 300');
    }
    this.cleanupDelaySeconds = delaySeconds;
  }

  /**
   * Updates notifications setting
   * @param {boolean} enableNotifications - New notifications setting
   */
  setNotifications(enableNotifications) {
    if (typeof enableNotifications !== 'boolean') {
      throw new Error('enableNotifications must be boolean');
    }
    this.enableNotifications = enableNotifications;
  }

  /**
   * Updates sync settings setting
   * @param {boolean} syncSettings - New sync setting
   */
  setSyncSettings(syncSettings) {
    if (typeof syncSettings !== 'boolean') {
      throw new Error('syncSettings must be boolean');
    }
    this.syncSettings = syncSettings;
  }

  /**
   * Updates minimum volume step setting
   * @param {number} step - New minimum volume step (1-10)
   */
  setMinVolumeStep(step) {
    if (!Number.isInteger(step) || step < 1 || step > 10) {
      throw new Error('minVolumeStep must be integer between 1 and 10');
    }
    this.minVolumeStep = step;
  }

  /**
   * Updates maximum volume limit setting
   * @param {number} limit - New maximum volume limit (100-200)
   */
  setMaxVolumeLimit(limit) {
    if (!Number.isInteger(limit) || limit < 100 || limit > 200) {
      throw new Error('maxVolumeLimit must be integer between 100 and 200');
    }
    this.maxVolumeLimit = limit;
  }

  /**
   * Gets default volume as percentage string for display
   * @returns {string} Volume percentage (e.g., "75%", "150%")
   */
  getDefaultVolumePercentage() {
    return `${Math.round(this.defaultVolume)}%`;
  }

  /**
   * Checks if default volume is amplified above 100%
   * @returns {boolean} True if default volume > 100
   */
  isDefaultVolumeAmplified() {
    return this.defaultVolume > 100;
  }

  /**
   * Gets cleanup delay in display-friendly format
   * @returns {string} Formatted delay (e.g., "1m 30s", "45s")
   */
  getFormattedCleanupDelay() {
    if (this.cleanupDelaySeconds < 60) {
      return `${this.cleanupDelaySeconds}s`;
    }
    
    const minutes = Math.floor(this.cleanupDelaySeconds / 60);
    const seconds = this.cleanupDelaySeconds % 60;
    
    if (seconds === 0) {
      return `${minutes}m`;
    }
    
    return `${minutes}m ${seconds}s`;
  }

  /**
   * Gets volume step as percentage string
   * @returns {string} Volume step percentage (e.g., "5%")
   */
  getVolumeStepPercentage() {
    return `${this.minVolumeStep}%`;
  }

  /**
   * Gets max volume limit as percentage string
   * @returns {string} Volume limit percentage (e.g., "150%")
   */
  getMaxVolumeLimitPercentage() {
    return `${this.maxVolumeLimit}%`;
  }

  /**
   * Checks if settings allow volume amplification
   * @returns {boolean} True if max volume limit > 100
   */
  isAmplificationEnabled() {
    return this.maxVolumeLimit > 100;
  }

  /**
   * Validates a volume value against current settings
   * @param {number} volume - Volume to validate
   * @returns {boolean} True if volume is within allowed range
   */
  isVolumeAllowed(volume) {
    return typeof volume === 'number' && volume >= 0 && volume <= this.maxVolumeLimit;
  }

  /**
   * Clamps a volume value to allowed range
   * @param {number} volume - Volume to clamp
   * @returns {number} Clamped volume value
   */
  clampVolume(volume) {
    if (typeof volume !== 'number') {
      return this.defaultVolume;
    }
    return Math.max(0, Math.min(this.maxVolumeLimit, volume));
  }

  /**
   * Adjusts volume by step amount
   * @param {number} currentVolume - Current volume level
   * @param {boolean} increase - Whether to increase (true) or decrease (false)
   * @returns {number} New volume level
   */
  adjustVolumeByStep(currentVolume, increase = true) {
    if (typeof currentVolume !== 'number') {
      return this.defaultVolume;
    }
    
    const adjustment = increase ? this.minVolumeStep : -this.minVolumeStep;
    const newVolume = currentVolume + adjustment;
    
    return this.clampVolume(newVolume);
  }

  /**
   * Creates a copy with updated values
   * @param {Object} updates - Values to update
   * @returns {GlobalSettings} New GlobalSettings instance with updates
   */
  update(updates) {
    return new GlobalSettings({
      ...this.toJSON(),
      ...updates
    });
  }

  /**
   * Converts GlobalSettings to plain object for storage
   * @returns {Object} Plain object representation
   */
  toJSON() {
    return {
      defaultVolume: this.defaultVolume,
      showInactiveTabs: this.showInactiveTabs,
      autoCleanup: this.autoCleanup,
      cleanupDelaySeconds: this.cleanupDelaySeconds,
      enableNotifications: this.enableNotifications,
      syncSettings: this.syncSettings,
      minVolumeStep: this.minVolumeStep,
      maxVolumeLimit: this.maxVolumeLimit
    };
  }

  /**
   * Creates GlobalSettings from stored data
   * @param {Object} data - Stored data object
   * @returns {GlobalSettings} New GlobalSettings instance
   */
  static fromJSON(data) {
    return new GlobalSettings(data);
  }

  /**
   * Creates default GlobalSettings
   * @param {Object} options - Optional overrides
   * @returns {GlobalSettings} New GlobalSettings instance with defaults
   */
  static createDefault(options = {}) {
    return new GlobalSettings({
      defaultVolume: 100,
      showInactiveTabs: false,
      autoCleanup: true,
      cleanupDelaySeconds: 30,
      enableNotifications: true,
      syncSettings: false,
      minVolumeStep: 5,
      maxVolumeLimit: 200,
      ...options
    });
  }

  /**
   * Creates GlobalSettings with conservative/safe defaults
   * @param {Object} options - Optional overrides
   * @returns {GlobalSettings} New GlobalSettings instance with conservative defaults
   */
  static createConservative(options = {}) {
    return new GlobalSettings({
      defaultVolume: 100,
      showInactiveTabs: false,
      autoCleanup: false,
      cleanupDelaySeconds: 60,
      enableNotifications: false,
      syncSettings: false,
      minVolumeStep: 10,
      maxVolumeLimit: 150,
      ...options
    });
  }

  /**
   * Creates GlobalSettings with power user defaults
   * @param {Object} options - Optional overrides
   * @returns {GlobalSettings} New GlobalSettings instance with power user defaults
   */
  static createPowerUser(options = {}) {
    return new GlobalSettings({
      defaultVolume: 100,
      showInactiveTabs: true,
      autoCleanup: true,
      cleanupDelaySeconds: 5,
      enableNotifications: true,
      syncSettings: true,
      minVolumeStep: 1,
      maxVolumeLimit: 200,
      ...options
    });
  }

  /**
   * Merges multiple GlobalSettings instances (used for conflict resolution)
   * Uses the most permissive settings and averages numerical values
   * @param {Array<GlobalSettings>} settingsArray - Array of GlobalSettings instances
   * @returns {GlobalSettings} Merged GlobalSettings
   */
  static merge(settingsArray) {
    if (!Array.isArray(settingsArray) || settingsArray.length === 0) {
      throw new Error('settingsArray must be non-empty array');
    }

    if (settingsArray.length === 1) {
      return settingsArray[0];
    }

    // Calculate averages for numerical values
    const avgDefaultVolume = Math.round(
      settingsArray.reduce((sum, s) => sum + s.defaultVolume, 0) / settingsArray.length
    );
    
    const avgCleanupDelay = Math.round(
      settingsArray.reduce((sum, s) => sum + s.cleanupDelaySeconds, 0) / settingsArray.length
    );

    // Use minimum step and maximum limit for most permissive settings
    const minStep = Math.min(...settingsArray.map(s => s.minVolumeStep));
    const maxLimit = Math.max(...settingsArray.map(s => s.maxVolumeLimit));

    // Use OR logic for boolean settings (most permissive)
    const showInactiveTabs = settingsArray.some(s => s.showInactiveTabs);
    const autoCleanup = settingsArray.some(s => s.autoCleanup);
    const enableNotifications = settingsArray.some(s => s.enableNotifications);
    const syncSettings = settingsArray.some(s => s.syncSettings);

    return new GlobalSettings({
      defaultVolume: avgDefaultVolume,
      showInactiveTabs,
      autoCleanup,
      cleanupDelaySeconds: avgCleanupDelay,
      enableNotifications,
      syncSettings,
      minVolumeStep: minStep,
      maxVolumeLimit: maxLimit
    });
  }

  /**
   * Validates settings compatibility between instances
   * @param {GlobalSettings} other - Other GlobalSettings instance to compare
   * @returns {Array<string>} Array of compatibility warnings (empty if fully compatible)
   */
  checkCompatibility(other) {
    const warnings = [];

    if (this.maxVolumeLimit !== other.maxVolumeLimit) {
      warnings.push('Different maximum volume limits may cause inconsistent behavior');
    }

    if (this.minVolumeStep !== other.minVolumeStep) {
      warnings.push('Different volume steps may affect user experience');
    }

    if (this.cleanupDelaySeconds !== other.cleanupDelaySeconds && this.autoCleanup && other.autoCleanup) {
      warnings.push('Different cleanup delays may cause timing inconsistencies');
    }

    return warnings;
  }
}

// Export validation function for use in tests
export function validateGlobalSettings(settings) {
  const instance = new GlobalSettings(settings);
  return instance;
}