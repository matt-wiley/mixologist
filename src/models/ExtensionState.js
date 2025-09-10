/**
 * ExtensionState model class
 * Tracks current extension state including active tabs and global enabled state
 */

export class ExtensionState {
  /**
   * @param {Object} data - ExtensionState data
   * @param {Array<number>} data.activeTabs - Array of active tab IDs currently being controlled
   * @param {boolean} data.isEnabled - Whether the extension is currently enabled
   * @param {number} data.lastUpdate - Timestamp of last state update
   * @param {number} data.totalTabsControlled - Total number of tabs controlled in this session
   */
  constructor(data) {
    this.validate(data);
    
    this.activeTabs = data.activeTabs || [];
    this.isEnabled = data.isEnabled;
    this.lastUpdate = data.lastUpdate || Date.now();
    this.totalTabsControlled = data.totalTabsControlled || 0;
  }

  /**
   * Validates ExtensionState data according to contract schema
   * @param {Object} data - Data to validate
   * @throws {Error} If validation fails
   */
  validate(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('ExtensionState data must be an object');
    }

    // Required fields validation
    const requiredFields = ['isEnabled'];
    const missingFields = requiredFields.filter(field => !(field in data));
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Type and value validations
    if (typeof data.isEnabled !== 'boolean') {
      throw new Error('isEnabled must be boolean');
    }

    if (data.activeTabs !== undefined) {
      if (!Array.isArray(data.activeTabs)) {
        throw new Error('activeTabs must be array');
      }
      
      // Validate each tab ID
      for (const tabId of data.activeTabs) {
        if (!Number.isInteger(tabId) || tabId <= 0) {
          throw new Error('activeTabs must contain positive integers');
        }
      }
    }

    if (data.lastUpdate !== undefined && (!Number.isInteger(data.lastUpdate) || data.lastUpdate < 0)) {
      throw new Error('lastUpdate must be valid timestamp');
    }

    if (data.totalTabsControlled !== undefined && (!Number.isInteger(data.totalTabsControlled) || data.totalTabsControlled < 0)) {
      throw new Error('totalTabsControlled must be non-negative integer');
    }
  }

  /**
   * Updates extension enabled state
   * @param {boolean} isEnabled - New enabled state
   */
  setEnabled(isEnabled) {
    if (typeof isEnabled !== 'boolean') {
      throw new Error('isEnabled must be boolean');
    }
    this.isEnabled = isEnabled;
    this.lastUpdate = Date.now();
  }

  /**
   * Adds a tab to active tabs list
   * @param {number} tabId - Tab ID to add
   */
  addActiveTab(tabId) {
    if (!Number.isInteger(tabId) || tabId <= 0) {
      throw new Error('tabId must be positive integer');
    }
    
    if (!this.activeTabs.includes(tabId)) {
      this.activeTabs.push(tabId);
      this.totalTabsControlled++;
      this.lastUpdate = Date.now();
    }
  }

  /**
   * Removes a tab from active tabs list
   * @param {number} tabId - Tab ID to remove
   */
  removeActiveTab(tabId) {
    if (!Number.isInteger(tabId) || tabId <= 0) {
      throw new Error('tabId must be positive integer');
    }
    
    const index = this.activeTabs.indexOf(tabId);
    if (index !== -1) {
      this.activeTabs.splice(index, 1);
      this.lastUpdate = Date.now();
    }
  }

  /**
   * Clears all active tabs
   */
  clearActiveTabs() {
    this.activeTabs = [];
    this.lastUpdate = Date.now();
  }

  /**
   * Updates the list of active tabs
   * @param {Array<number>} tabIds - Array of active tab IDs
   */
  setActiveTabs(tabIds) {
    if (!Array.isArray(tabIds)) {
      throw new Error('activeTabs must be array');
    }
    
    for (const tabId of tabIds) {
      if (!Number.isInteger(tabId) || tabId <= 0) {
        throw new Error('activeTabs must contain positive integers');
      }
    }
    
    this.activeTabs = [...tabIds];
    this.lastUpdate = Date.now();
  }

  /**
   * Checks if a tab is currently active
   * @param {number} tabId - Tab ID to check
   * @returns {boolean} True if tab is active
   */
  isTabActive(tabId) {
    return this.activeTabs.includes(tabId);
  }

  /**
   * Gets the number of active tabs
   * @returns {number} Number of active tabs
   */
  getActiveTabCount() {
    return this.activeTabs.length;
  }

  /**
   * Checks if extension state is recent
   * @param {number} maxAge - Maximum age in milliseconds (default: 1 hour)
   * @returns {boolean} True if state is recent
   */
  isRecent(maxAge = 60 * 60 * 1000) {
    return (Date.now() - this.lastUpdate) <= maxAge;
  }

  /**
   * Gets age of state in minutes
   * @returns {number} Age in minutes
   */
  getAgeInMinutes() {
    return Math.floor((Date.now() - this.lastUpdate) / (60 * 1000));
  }

  /**
   * Gets display-friendly status summary
   * @returns {string} Status summary
   */
  getStatusSummary() {
    const status = this.isEnabled ? 'Enabled' : 'Disabled';
    const tabCount = this.getActiveTabCount();
    return `${status} - ${tabCount} active tab${tabCount !== 1 ? 's' : ''}`;
  }

  /**
   * Resets total tabs controlled counter
   */
  resetTotalTabsControlled() {
    this.totalTabsControlled = 0;
    this.lastUpdate = Date.now();
  }

  /**
   * Increments total tabs controlled counter
   */
  incrementTotalTabsControlled() {
    this.totalTabsControlled++;
    this.lastUpdate = Date.now();
  }

  /**
   * Creates a copy with updated values
   * @param {Object} updates - Values to update
   * @returns {ExtensionState} New ExtensionState instance with updates
   */
  update(updates) {
    return new ExtensionState({
      ...this.toJSON(),
      ...updates,
      lastUpdate: Date.now() // Always update lastUpdate on any change
    });
  }

  /**
   * Converts ExtensionState to plain object for storage
   * @returns {Object} Plain object representation
   */
  toJSON() {
    return {
      activeTabs: [...this.activeTabs],
      isEnabled: this.isEnabled,
      lastUpdate: this.lastUpdate,
      totalTabsControlled: this.totalTabsControlled
    };
  }

  /**
   * Creates ExtensionState from stored data
   * @param {Object} data - Stored data object
   * @returns {ExtensionState} New ExtensionState instance
   */
  static fromJSON(data) {
    return new ExtensionState(data);
  }

  /**
   * Creates default ExtensionState
   * @param {Object} options - Optional overrides
   * @returns {ExtensionState} New ExtensionState instance with defaults
   */
  static createDefault(options = {}) {
    return new ExtensionState({
      activeTabs: [],
      isEnabled: true,
      lastUpdate: Date.now(),
      totalTabsControlled: 0,
      ...options
    });
  }

  /**
   * Creates ExtensionState from active tabs array
   * @param {Array<number>} tabIds - Array of active tab IDs
   * @param {Object} options - Optional overrides
   * @returns {ExtensionState} New ExtensionState instance
   */
  static fromActiveTabs(tabIds, options = {}) {
    if (!Array.isArray(tabIds)) {
      throw new Error('tabIds must be array');
    }
    
    return new ExtensionState({
      activeTabs: [...tabIds],
      isEnabled: true,
      lastUpdate: Date.now(),
      totalTabsControlled: tabIds.length,
      ...options
    });
  }

  /**
   * Merges multiple ExtensionState instances (used for conflict resolution)
   * Uses the most recent state but combines unique active tabs
   * @param {Array<ExtensionState>} stateArray - Array of ExtensionState instances
   * @returns {ExtensionState} Merged ExtensionState
   */
  static merge(stateArray) {
    if (!Array.isArray(stateArray) || stateArray.length === 0) {
      throw new Error('stateArray must be non-empty array');
    }

    if (stateArray.length === 1) {
      return stateArray[0];
    }

    // Sort by last update (most recent first)
    const sorted = stateArray.sort((a, b) => b.lastUpdate - a.lastUpdate);
    const mostRecent = sorted[0];

    // Combine unique active tabs from all states
    const allActiveTabs = new Set();
    let maxTotalControlled = 0;

    for (const state of stateArray) {
      for (const tabId of state.activeTabs) {
        allActiveTabs.add(tabId);
      }
      maxTotalControlled = Math.max(maxTotalControlled, state.totalTabsControlled);
    }

    return new ExtensionState({
      activeTabs: Array.from(allActiveTabs),
      isEnabled: mostRecent.isEnabled,
      lastUpdate: mostRecent.lastUpdate,
      totalTabsControlled: maxTotalControlled
    });
  }
}

// Export validation function for use in tests
export function validateExtensionState(state) {
  const instance = new ExtensionState(state);
  return instance;
}