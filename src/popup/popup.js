/**
 * Popup Controller Factory Function
 * Creates and manages the popup interface for the Firefox Tab Audio Control Extension
 */

function createPopupController(container) {
  // DOM element references
  const elements = {
    container: container,
    mainLoading: null,
    popupContent: null,
    tabControls: null,
    emptyState: null,
    errorMessage: null,
    errorText: null,
    errorToast: null,
    errorToastText: null,
    closeToast: null
  };

  // State management
  let audioTabs = new Map();
  let volumeChangeTimeouts = new Map();
  let pendingVolumeChanges = new Map(); // Track pending changes
  const VOLUME_CHANGE_DEBOUNCE = 300;

  /**
   * Initialize popup and load active audio tabs
   */
  async function initialize() {
    try {
      setupDOM();
      setupEventListeners();
      await loadActiveTabs();
    } catch (error) {
      console.error('Failed to initialize popup:', error);
      showErrorMessage('Unable to connect to background script');
    }
  }

  /**
   * Set up DOM element references
   */
  function setupDOM() {
    // Create main container if it doesn't exist
    if (!elements.container.innerHTML.trim()) {
      elements.container.innerHTML = `
        <div class="loading-indicator" id="main-loading">
          <div class="spinner"></div>
          <span>Loading audio tabs...</span>
        </div>

        <div class="popup-content" id="popup-content" style="display: none;">
          <div class="popup-header">
            <h1>Tab Audio Mixer</h1>
          </div>

          <div class="tab-controls" id="tab-controls">
          </div>

          <div class="empty-state" id="empty-state" style="display: none;">
            <div class="empty-icon">🔇</div>
            <p>No audio tabs detected</p>
            <small>Play audio in a tab to control volume here</small>
          </div>

          <div class="error-message" id="error-message" style="display: none;">
            <div class="error-icon">⚠️</div>
            <p id="error-text">Unable to connect to background script</p>
          </div>
        </div>

        <div class="error-toast" id="error-toast" style="display: none;">
          <span id="error-toast-text"></span>
          <button class="close-toast" id="close-toast">&times;</button>
        </div>
      `;
    }

    // Get references to DOM elements
    elements.mainLoading = elements.container.querySelector('#main-loading');
    elements.popupContent = elements.container.querySelector('#popup-content');
    elements.tabControls = elements.container.querySelector('#tab-controls');
    elements.emptyState = elements.container.querySelector('#empty-state');
    elements.errorMessage = elements.container.querySelector('#error-message');
    elements.errorText = elements.container.querySelector('#error-text');
    elements.errorToast = elements.container.querySelector('#error-toast');
    elements.errorToastText = elements.container.querySelector('#error-toast-text');
    elements.closeToast = elements.container.querySelector('#close-toast');
  }

  /**
   * Set up event listeners
   */
  function setupEventListeners() {
    // Close error toast
    if (elements.closeToast) {
      elements.closeToast.addEventListener('click', hideErrorToast);
    }

    // Auto-hide error toast after 5 seconds
    let errorToastTimeout;
    const showErrorToastWithAutoHide = (message) => {
      showErrorToast(message);
      clearTimeout(errorToastTimeout);
      errorToastTimeout = setTimeout(hideErrorToast, 5000);
    };

    // Store reference for later use
    elements.showErrorToastWithAutoHide = showErrorToastWithAutoHide;
  }

  /**
   * Load active audio tabs from background script
   */
  async function loadActiveTabs() {
    try {
      const requestId = generateRequestId();
      const response = await browser.runtime.sendMessage({
        type: 'GET_ACTIVE_TABS',
        payload: {},
        requestId: requestId
      });

      if (response.success) {
        updateTabsList(response.tabs || []);
      } else {
        throw new Error(response.error || 'Unknown error');
      }

      // Show main content, hide loading
      showMainContent();
    } catch (error) {
      console.error('Failed to load active tabs:', error);
      showErrorMessage('Unable to connect to background script');
      showMainContent();
    }
  }

  /**
   * Update the list of tabs in the UI
   */
  function updateTabsList(tabs) {
    // Clear current tabs
    audioTabs.clear();
    elements.tabControls.innerHTML = '';

    // Filter out tabs without proper titles
    const validTabs = tabs.filter(tab => {
      if (!tab.title || tab.title.trim() === '') {
        console.log('Tab Audio Mixer: Filtering out tab without title (tabId:', tab.tabId, ')');
        return false;
      }
      return true;
    });

    if (validTabs.length === 0) {
      showEmptyState();
      return;
    }

    // Add each valid tab
    validTabs.forEach(tab => {
      audioTabs.set(tab.tabId, tab);
      createTabElement(tab);
    });

    hideEmptyState();
  }

  /**
   * Create a tab control element
   */
  function createTabElement(tab) {
    const tabElement = document.createElement('div');
    tabElement.className = 'tab-control';
    tabElement.setAttribute('data-tab-id', tab.tabId);

    // Create favicon
    const favicon = createFaviconElement(tab);
    
    // Create tab info section
    const tabInfo = document.createElement('div');
    tabInfo.className = 'tab-info';

    const tabTitle = document.createElement('div');
    tabTitle.className = 'tab-title';
    const displayTitle = truncateTitle(tab.title);
    tabTitle.textContent = displayTitle;
    tabTitle.title = tab.title; // Full title in tooltip

    const tabDomain = document.createElement('div');
    tabDomain.className = 'tab-domain';
    tabDomain.textContent = tab.domain || '';

    tabInfo.appendChild(tabTitle);
    tabInfo.appendChild(tabDomain);

    // Create volume controls
    const volumeControls = createVolumeControls(tab);

    // Assemble tab element
    tabElement.appendChild(favicon);
    tabElement.appendChild(tabInfo);
    tabElement.appendChild(volumeControls);

    elements.tabControls.appendChild(tabElement);
  }

  /**
   * Create favicon element
   */
  function createFaviconElement(tab) {
    if (tab.favicon) {
      const img = document.createElement('img');
      img.className = 'favicon';
      img.src = tab.favicon;
      img.alt = 'Tab favicon';
      
      // Handle favicon load errors
      img.onerror = function() {
        const defaultFavicon = document.createElement('div');
        defaultFavicon.className = 'favicon default-favicon';
        defaultFavicon.textContent = '🔊';
        img.parentNode.replaceChild(defaultFavicon, img);
      };
      
      return img;
    } else {
      const defaultFavicon = document.createElement('div');
      defaultFavicon.className = 'favicon default-favicon';
      defaultFavicon.textContent = '🔊';
      return defaultFavicon;
    }
  }

  /**
   * Create volume control elements
   */
  function createVolumeControls(tab) {
    const volumeControls = document.createElement('div');
    volumeControls.className = 'volume-controls';

    // Volume slider
    const volumeSlider = document.createElement('input');
    volumeSlider.type = 'range';
    volumeSlider.className = 'volume-slider';
    volumeSlider.min = '0';
    volumeSlider.max = '120';
    // Cap volume at 120% if needed
    const cappedVolume = Math.min(tab.volumeLevel, 120);
    volumeSlider.value = cappedVolume.toString();
    volumeSlider.disabled = tab.isMuted;
    volumeSlider.tabIndex = 0; // Ensure proper tab order
    
    // Accessibility attributes
    volumeSlider.setAttribute('aria-label', `Volume for ${tab.title}`);
    volumeSlider.setAttribute('role', 'slider');
    volumeSlider.setAttribute('aria-valuenow', cappedVolume.toString());
    volumeSlider.setAttribute('aria-valuemin', '0');
    volumeSlider.setAttribute('aria-valuemax', '120');

    // Apply amplified styling if needed
    if (cappedVolume > 100) {
      volumeSlider.classList.add('amplified');
    }

    // Volume slider event listener
    volumeSlider.addEventListener('input', (event) => {
      handleVolumeChange(tab.tabId, parseInt(event.target.value));
    });

    // Handle Tab key for keyboard navigation
    volumeSlider.addEventListener('keydown', (event) => {
      if (event.key === 'Tab' && !event.shiftKey) {
        event.preventDefault();
        const allSliders = elements.container.querySelectorAll('.volume-slider');
        const currentIndex = Array.from(allSliders).indexOf(volumeSlider);
        const nextSlider = allSliders[currentIndex + 1];
        if (nextSlider) {
          nextSlider.focus();
        }
      }
    });

    // Audio icon (mute button)
    const audioIcon = document.createElement('button');
    audioIcon.className = `audio-icon ${tab.isMuted ? 'muted' : ''}`;
    audioIcon.setAttribute('aria-label', `${tab.isMuted ? 'Unmute' : 'Mute'} ${tab.title}`);
    audioIcon.setAttribute('role', 'button');
    audioIcon.title = tab.isMuted ? 'Unmute' : 'Mute';
    audioIcon.tabIndex = 0; // Ensure proper tab order

    audioIcon.addEventListener('click', () => {
      handleMuteToggle(tab.tabId, !tab.isMuted);
    });

    // Volume percentage display
    const volumePercentage = document.createElement('div');
    volumePercentage.className = 'volume-percentage';
    volumePercentage.textContent = `${Math.round(cappedVolume)}%`;

    volumeControls.appendChild(volumeSlider);
    volumeControls.appendChild(audioIcon);
    volumeControls.appendChild(volumePercentage);

    // Add amplification indicator if needed
    if (cappedVolume > 100) {
      const amplificationIndicator = document.createElement('div');
      amplificationIndicator.className = 'amplification-indicator';
      amplificationIndicator.textContent = `${Math.round(cappedVolume)}%`;
      volumeControls.style.position = 'relative';
      volumeControls.appendChild(amplificationIndicator);
    }

    return volumeControls;
  }

  /**
   * Handle volume change with debouncing
   */
  function handleVolumeChange(tabId, newVolume) {
    // Update UI immediately for responsiveness
    updateTabVolumeUI(tabId, newVolume);
    
    // Store the latest pending volume change
    pendingVolumeChanges.set(tabId, newVolume);

    // Clear existing timeout for this tab to prevent multiple requests
    if (volumeChangeTimeouts.has(tabId)) {
      clearTimeout(volumeChangeTimeouts.get(tabId));
      volumeChangeTimeouts.delete(tabId);
    }

    // Set new debounced timeout
    const timeoutId = setTimeout(async () => {
      // Check if there's still a pending change (in case it was cancelled)
      if (!pendingVolumeChanges.has(tabId)) {
        return;
      }
      
      const finalVolume = pendingVolumeChanges.get(tabId);
      pendingVolumeChanges.delete(tabId); // Clear pending change
      
      try {
        showTabLoading(tabId, true);
        
        const requestId = generateRequestId();
        const response = await browser.runtime.sendMessage({
          type: 'VOLUME_CHANGE',
          payload: {
            tabId: tabId,
            volumeLevel: finalVolume
          },
          requestId: requestId
        });

        if (!response.success) {
          throw new Error(response.error || 'Volume change failed');
        }

        // Update stored tab data
        if (audioTabs.has(tabId)) {
          const updatedTab = audioTabs.get(tabId);
          updatedTab.volumeLevel = finalVolume;
          audioTabs.set(tabId, updatedTab);
        }
      } catch (error) {
        console.error('Failed to change volume:', error);
        elements.showErrorToastWithAutoHide('Failed to change volume');
        
        // Revert UI to previous state
        const tab = audioTabs.get(tabId);
        if (tab) {
          const revertVolume = tab.volumeLevel || 100;
          updateTabVolumeUI(tabId, revertVolume);
        }
      } finally {
        showTabLoading(tabId, false);
        volumeChangeTimeouts.delete(tabId);
      }
    }, VOLUME_CHANGE_DEBOUNCE);

    volumeChangeTimeouts.set(tabId, timeoutId);
  }

  /**
   * Handle mute toggle
   */
  async function handleMuteToggle(tabId, newMuteState) {
    // Update UI immediately for responsiveness
    updateTabMuteUI(tabId, newMuteState);
    
    try {
      showTabLoading(tabId, true);
      
      const requestId = generateRequestId();
      const response = await browser.runtime.sendMessage({
        type: 'MUTE_TOGGLE',
        payload: {
          tabId: tabId,
          isMuted: newMuteState
        },
        requestId: requestId
      });

      if (!response.success) {
        throw new Error(response.error || 'Mute toggle failed');
      }

      // Update stored data
      if (audioTabs.has(tabId)) {
        const tab = audioTabs.get(tabId);
        tab.isMuted = newMuteState;
        audioTabs.set(tabId, tab);
      }
    } catch (error) {
      console.error('Failed to toggle mute:', error);
      elements.showErrorToastWithAutoHide('Failed to toggle mute');
      
      // Revert UI on error
      updateTabMuteUI(tabId, !newMuteState);
    } finally {
      showTabLoading(tabId, false);
    }
  }

  /**
   * Handle real-time updates from background script
   */
  async function handleBackgroundMessage(message) {
    if (message.type === 'TAB_AUDIO_UPDATE') {
      const { tabId, isAudioActive } = message.payload;
      
      if (!isAudioActive) {
        // Remove tab from display
        removeTabFromUI(tabId);
        audioTabs.delete(tabId);
        
        // Show empty state if no tabs remain
        if (audioTabs.size === 0) {
          showEmptyState();
        }
      } else {
        // Skip tabs without proper titles (filters out "Unknown" sources)
        if (!message.payload.title || message.payload.title.trim() === '') {
          console.log('Tab Audio Mixer: Skipping tab without title (tabId:', tabId, ')');
          return;
        }

        // Add new tab or update existing one
        const newTab = {
          tabId: tabId,
          title: message.payload.title,
          domain: message.payload.domain || '',
          favicon: message.payload.favicon || null,
          volumeLevel: message.payload.volumeLevel || 100,
          isMuted: message.payload.isMuted || false,
          isAudioActive: true
        };

        if (!audioTabs.has(tabId)) {
          // New tab - add to UI
          audioTabs.set(tabId, newTab);
          createTabElement(newTab);
          hideEmptyState();
        } else {
          // Update existing tab
          audioTabs.set(tabId, newTab);
          updateTabElement(tabId, newTab);
        }
      }
    }
  }

  /**
   * Update tab volume UI
   */
  function updateTabVolumeUI(tabId, volumeLevel) {
    const tabElement = elements.container.querySelector(`[data-tab-id="${tabId}"]`);
    if (!tabElement) return;

    // Cap volume at 120% for UI display
    const cappedVolume = Math.min(volumeLevel, 120);

    const volumeSlider = tabElement.querySelector('.volume-slider');
    const volumePercentage = tabElement.querySelector('.volume-percentage');

    if (volumeSlider) {
      volumeSlider.value = cappedVolume;
      volumeSlider.setAttribute('aria-valuenow', cappedVolume.toString());
      
      // Update amplified styling
      if (cappedVolume > 100) {
        volumeSlider.classList.add('amplified');
      } else {
        volumeSlider.classList.remove('amplified');
      }
    }

    if (volumePercentage) {
      volumePercentage.textContent = `${Math.round(cappedVolume)}%`;
    }

    // Handle amplification indicator for volumes >100%
    const volumeControls = tabElement.querySelector('.volume-controls');
    const existingIndicator = volumeControls?.querySelector('.amplification-indicator');
    
    if (cappedVolume > 100) {
      if (!existingIndicator) {
        const amplificationIndicator = document.createElement('div');
        amplificationIndicator.className = 'amplification-indicator';
        amplificationIndicator.textContent = `${Math.round(cappedVolume)}%`;
        volumeControls.style.position = 'relative';
        volumeControls.appendChild(amplificationIndicator);
      } else {
        existingIndicator.textContent = `${Math.round(cappedVolume)}%`;
      }
    } else {
      if (existingIndicator) {
        existingIndicator.remove();
      }
    }
  }

  /**
   * Update tab mute UI
   */
  function updateTabMuteUI(tabId, isMuted) {
    const tabElement = elements.container.querySelector(`[data-tab-id="${tabId}"]`);
    if (!tabElement) return;

    const audioIcon = tabElement.querySelector('.audio-icon');
    const volumeSlider = tabElement.querySelector('.volume-slider');

    if (audioIcon) {
      audioIcon.className = `audio-icon ${isMuted ? 'muted' : ''}`;
      audioIcon.setAttribute('aria-label', `${isMuted ? 'Unmute' : 'Mute'} tab`);
      audioIcon.title = isMuted ? 'Unmute' : 'Mute';
    }

    if (volumeSlider) {
      volumeSlider.disabled = isMuted;
    }
  }

  /**
   * Remove tab from UI
   */
  function removeTabFromUI(tabId) {
    const tabElement = elements.container.querySelector(`[data-tab-id="${tabId}"]`);
    if (tabElement) {
      tabElement.remove();
    }
  }

  /**
   * Update entire tab element
   */
  function updateTabElement(tabId, tab) {
    removeTabFromUI(tabId);
    createTabElement(tab);
  }

  /**
   * Show/hide tab loading indicator
   */
  function showTabLoading(tabId, show) {
    const tabElement = elements.container.querySelector(`[data-tab-id="${tabId}"]`);
    if (!tabElement) return;

    let existingIndicator = tabElement.querySelector('.loading-indicator');
    
    if (show && !existingIndicator) {
      const loadingIndicator = document.createElement('div');
      loadingIndicator.className = 'loading-indicator';
      loadingIndicator.innerHTML = '<div class="spinner"></div>';
      tabElement.style.position = 'relative';
      tabElement.appendChild(loadingIndicator);
    } else if (!show && existingIndicator) {
      existingIndicator.remove();
    }
  }

  /**
   * Show main content and hide loading
   */
  function showMainContent() {
    if (elements.mainLoading) {
      elements.mainLoading.style.display = 'none';
    }
    if (elements.popupContent) {
      elements.popupContent.style.display = 'block';
    }
  }

  /**
   * Show empty state
   */
  function showEmptyState() {
    // Create empty state if it doesn't exist
    if (!elements.emptyState) {
      elements.emptyState = document.createElement('div');
      elements.emptyState.className = 'empty-state';
      elements.emptyState.id = 'empty-state';
      elements.emptyState.innerHTML = `
        <div class="empty-icon">🔇</div>
        <p>No audio tabs detected</p>
        <small>Play audio in a tab to control volume here</small>
      `;
      elements.popupContent.appendChild(elements.emptyState);
    } else {
      elements.emptyState.style.display = 'block';
    }
    
    if (elements.errorMessage) {
      elements.errorMessage.style.display = 'none';
    }
  }

  /**
   * Hide empty state
   */
  function hideEmptyState() {
    if (elements.emptyState) {
      elements.emptyState.remove();
      elements.emptyState = null;
    }
  }

  /**
   * Show error message
   */
  function showErrorMessage(message) {
    if (elements.errorText) {
      elements.errorText.textContent = message;
    }
    if (elements.errorMessage) {
      elements.errorMessage.style.display = 'block';
    }
    if (elements.emptyState) {
      elements.emptyState.style.display = 'none';
    }
  }

  /**
   * Show error toast
   */
  function showErrorToast(message) {
    if (elements.errorToastText) {
      elements.errorToastText.textContent = message;
    }
    if (elements.errorToast) {
      elements.errorToast.style.display = 'flex';
    }
  }

  /**
   * Hide error toast
   */
  function hideErrorToast() {
    if (elements.errorToast) {
      elements.errorToast.style.display = 'none';
    }
  }

  /**
   * Truncate title with ellipsis
   */
  function truncateTitle(title, maxLength = 50) {
    if (title.length <= maxLength) {
      return title;
    }
    return title.substring(0, maxLength - 3) + '...';
  }

  /**
   * Generate unique request ID
   */
  function generateRequestId() {
    return `popup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Return public interface
  return {
    initialize,
    handleBackgroundMessage
  };
}

// Initialize popup when DOM is loaded (only in browser environment)
if (typeof window !== 'undefined' && window.document) {
  document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('popup-container');
    if (container) {
      const popupController = createPopupController(container);
      popupController.initialize();

      // Listen for messages from background script
      if (typeof browser !== 'undefined' && browser.runtime) {
        browser.runtime.onMessage.addListener((message) => {
          if (message.type === 'TAB_AUDIO_UPDATE') {
            popupController.handleBackgroundMessage(message);
          }
        });
      }
    }
  });
}

// Export for both browser and Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createPopupController };
} else if (typeof window !== 'undefined') {
  window.createPopupController = createPopupController;
}