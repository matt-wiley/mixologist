/**
 * Integration tests for Popup Interface
 * Tests the complete popup UI workflow including user interactions and background communication
 */

describe('Popup Interface Integration Tests', () => {
  let mockBrowser, container;

  beforeEach(() => {
    // Set up DOM container for popup
    container = document.createElement('div');
    container.id = 'popup-container';
    document.body.appendChild(container);

    // Reset browser mocks
    jest.clearAllMocks();
    
    mockBrowser = {
      ...global.browser,
      runtime: {
        ...global.browser.runtime,
        sendMessage: jest.fn().mockResolvedValue({ success: true })
      },
      tabs: {
        ...global.browser.tabs,
        query: jest.fn().mockResolvedValue([])
      }
    };
    global.browser = mockBrowser;
  });

  afterEach(() => {
    // Clean up DOM
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    
    // Clear any timers or intervals
    jest.clearAllTimers();
  });

  describe('Popup Initialization', () => {
    test('should initialize popup and load active audio tabs', async () => {
      // Mock active tabs response
      const mockTabsResponse = {
        success: true,
        tabs: [
          {
            tabId: 123,
            title: 'YouTube - Test Video',
            domain: 'youtube.com',
            favicon: 'https://youtube.com/favicon.ico',
            volumeLevel: 75,
            isMuted: false,
            isAudioActive: true
          },
          {
            tabId: 456,
            title: 'Spotify Web Player',
            domain: 'open.spotify.com',
            favicon: 'https://open.spotify.com/favicon.ico',
            volumeLevel: 100,
            isMuted: true,
            isAudioActive: false
          }
        ]
      };

      mockBrowser.runtime.sendMessage.mockResolvedValueOnce(mockTabsResponse);

      const popupController = createPopupController(container); // Will fail - not implemented
      await popupController.initialize();

      // Verify popup requested active tabs
      expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'GET_ACTIVE_TABS',
        payload: {},
        requestId: expect.any(String)
      });

      // Verify popup rendered tab controls
      const tabElements = container.querySelectorAll('.tab-control');
      expect(tabElements).toHaveLength(2);
      
      const youtubeTab = container.querySelector('[data-tab-id="123"]');
      expect(youtubeTab.querySelector('.tab-title').textContent).toBe('YouTube - Test Video');
      expect(youtubeTab.querySelector('.volume-slider').value).toBe('75');
    });

    test('should display empty state when no audio tabs exist', async () => {
      mockBrowser.runtime.sendMessage.mockResolvedValueOnce({
        success: true,
        tabs: []
      });

      const popupController = createPopupController(container); // Will fail - not implemented
      await popupController.initialize();

      const emptyState = container.querySelector('.empty-state');
      expect(emptyState).toBeInTheDocument();
      expect(emptyState.textContent).toContain('No audio tabs detected');
    });

    test('should handle initialization errors gracefully', async () => {
      mockBrowser.runtime.sendMessage.mockRejectedValue(new Error('Background script not responding'));

      const popupController = createPopupController(container); // Will fail - not implemented
      await popupController.initialize();

      const errorMessage = container.querySelector('.error-message');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage.textContent).toContain('Unable to connect to background script');
    });
  });

  describe('Volume Control Interactions', () => {
    test('should send volume change message when slider is moved', async () => {
      // Set up popup with a tab
      const mockTabsResponse = {
        success: true,
        tabs: [{
          tabId: 123,
          title: 'Test Tab',
          domain: 'example.com',
          volumeLevel: 50,
          isMuted: false,
          isAudioActive: true
        }]
      };

      mockBrowser.runtime.sendMessage.mockResolvedValueOnce(mockTabsResponse);
      mockBrowser.runtime.sendMessage.mockResolvedValueOnce({ success: true }); // Volume change response

      const popupController = createPopupController(container); // Will fail - not implemented
      await popupController.initialize();

      // Simulate volume slider change
      const volumeSlider = container.querySelector('[data-tab-id="123"] .volume-slider');
      volumeSlider.value = '80';
      volumeSlider.dispatchEvent(new Event('input'));

      // Wait for debounced volume change
      await new Promise(resolve => setTimeout(resolve, 350));

      expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'VOLUME_CHANGE',
        payload: {
          tabId: 123,
          volumeLevel: 80
        },
        requestId: expect.any(String)
      });
    });

    test('should handle volume amplification above 100%', async () => {
      const mockTabsResponse = {
        success: true,
        tabs: [{
          tabId: 123,
          title: 'Test Tab',
          domain: 'example.com',
          volumeLevel: 100,
          isMuted: false,
          isAudioActive: true
        }]
      };

      mockBrowser.runtime.sendMessage.mockResolvedValueOnce(mockTabsResponse);

      const popupController = createPopupController(container); // Will fail - not implemented
      await popupController.initialize();

      const volumeSlider = container.querySelector('[data-tab-id="123"] .volume-slider');
      
      // Test setting volume to 150%
      volumeSlider.value = '150';
      volumeSlider.dispatchEvent(new Event('input'));

      // Verify amplification indicator is shown
      const amplificationIndicator = container.querySelector('[data-tab-id="123"] .amplification-indicator');
      expect(amplificationIndicator).toBeVisible();
      expect(amplificationIndicator.textContent).toContain('150%');
      
      // Verify slider appearance changes for amplification
      expect(volumeSlider).toHaveClass('amplified');
    });

    test('should debounce rapid volume changes', async () => {
      const mockTabsResponse = {
        success: true,
        tabs: [{
          tabId: 123,
          title: 'Test Tab',
          domain: 'example.com',
          volumeLevel: 50,
          isMuted: false,
          isAudioActive: true
        }]
      };

      mockBrowser.runtime.sendMessage.mockResolvedValueOnce(mockTabsResponse);

      const popupController = createPopupController(container); // Will fail - not implemented
      await popupController.initialize();

      const volumeSlider = container.querySelector('[data-tab-id="123"] .volume-slider');
      
      // Rapidly change volume multiple times - do them truly rapidly
      volumeSlider.value = '60';
      volumeSlider.dispatchEvent(new Event('input'));
      
      // Wait just 1ms between calls to ensure they're truly rapid
      await new Promise(resolve => setTimeout(resolve, 1));
      
      volumeSlider.value = '70';
      volumeSlider.dispatchEvent(new Event('input'));
      
      await new Promise(resolve => setTimeout(resolve, 1));
      
      volumeSlider.value = '80';
      volumeSlider.dispatchEvent(new Event('input'));

      // Wait for debounce period plus a little extra
      await new Promise(resolve => setTimeout(resolve, 350));

      // Should only send the final volume change
      const volumeChangeMessages = mockBrowser.runtime.sendMessage.mock.calls.filter(
        call => call[0].type === 'VOLUME_CHANGE'
      );
      expect(volumeChangeMessages).toHaveLength(1);
      expect(volumeChangeMessages[0][0].payload.volumeLevel).toBe(80);
    });
  });

  describe('Mute/Unmute Functionality', () => {
    test('should toggle mute when audio icon is clicked', async () => {
      const mockTabsResponse = {
        success: true,
        tabs: [{
          tabId: 123,
          title: 'Test Tab',
          domain: 'example.com',
          volumeLevel: 75,
          isMuted: false,
          isAudioActive: true
        }]
      };

      mockBrowser.runtime.sendMessage.mockResolvedValueOnce(mockTabsResponse);
      mockBrowser.runtime.sendMessage.mockResolvedValueOnce({ success: true }); // Mute response

      const popupController = createPopupController(container); // Will fail - not implemented
      await popupController.initialize();

      // Click the audio icon to mute
      const audioIcon = container.querySelector('[data-tab-id="123"] .audio-icon');
      audioIcon.click();

      expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'MUTE_TOGGLE',
        payload: {
          tabId: 123,
          isMuted: true
        },
        requestId: expect.any(String)
      });

      // Verify UI updates to show muted state
      expect(audioIcon).toHaveClass('muted');
      
      const volumeSlider = container.querySelector('[data-tab-id="123"] .volume-slider');
      expect(volumeSlider).toBeDisabled();
    });

    test('should show visual mute indicator', async () => {
      const mockTabsResponse = {
        success: true,
        tabs: [{
          tabId: 123,
          title: 'Test Tab',
          domain: 'example.com',
          volumeLevel: 75,
          isMuted: true, // Already muted
          isAudioActive: true
        }]
      };

      mockBrowser.runtime.sendMessage.mockResolvedValueOnce(mockTabsResponse);

      const popupController = createPopupController(container); // Will fail - not implemented
      await popupController.initialize();

      const audioIcon = container.querySelector('[data-tab-id="123"] .audio-icon');
      expect(audioIcon).toHaveClass('muted');
      expect(audioIcon.title).toContain('Unmute');

      const volumeSlider = container.querySelector('[data-tab-id="123"] .volume-slider');
      expect(volumeSlider).toBeDisabled();
    });
  });

  describe('Tab Display and Metadata', () => {
    test('should display tab favicon and title', async () => {
      const mockTabsResponse = {
        success: true,
        tabs: [{
          tabId: 123,
          title: 'YouTube - Amazing Music Video',
          domain: 'youtube.com',
          favicon: 'https://www.youtube.com/favicon.ico',
          volumeLevel: 85,
          isMuted: false,
          isAudioActive: true
        }]
      };

      mockBrowser.runtime.sendMessage.mockResolvedValueOnce(mockTabsResponse);

      const popupController = createPopupController(container); // Will fail - not implemented
      await popupController.initialize();

      const tabElement = container.querySelector('[data-tab-id="123"]');
      const favicon = tabElement.querySelector('.favicon');
      const title = tabElement.querySelector('.tab-title');

      expect(favicon.src).toBe('https://www.youtube.com/favicon.ico');
      expect(title.textContent).toBe('YouTube - Amazing Music Video');
      expect(title.title).toBe('YouTube - Amazing Music Video'); // Tooltip for long titles
    });

    test('should truncate very long tab titles', async () => {
      const longTitle = 'This is a very long tab title that should be truncated because it exceeds the maximum display length for the popup interface';
      
      const mockTabsResponse = {
        success: true,
        tabs: [{
          tabId: 123,
          title: longTitle,
          domain: 'example.com',
          volumeLevel: 100,
          isMuted: false,
          isAudioActive: true
        }]
      };

      mockBrowser.runtime.sendMessage.mockResolvedValueOnce(mockTabsResponse);

      const popupController = createPopupController(container); // Will fail - not implemented
      await popupController.initialize();

      const title = container.querySelector('[data-tab-id="123"] .tab-title');
      expect(title.textContent.length).toBeLessThan(60); // Should be truncated
      expect(title.textContent).toMatch(/\.\.\.$/); // Should end with ellipsis
      expect(title.title).toBe(longTitle); // Full title in tooltip
    });

    test('should handle missing favicon gracefully', async () => {
      const mockTabsResponse = {
        success: true,
        tabs: [{
          tabId: 123,
          title: 'Test Tab',
          domain: 'example.com',
          favicon: null,
          volumeLevel: 100,
          isMuted: false,
          isAudioActive: true
        }]
      };

      mockBrowser.runtime.sendMessage.mockResolvedValueOnce(mockTabsResponse);

      const popupController = createPopupController(container); // Will fail - not implemented
      await popupController.initialize();

      const favicon = container.querySelector('[data-tab-id="123"] .favicon');
      expect(favicon).toHaveClass('default-favicon');
      expect(favicon.textContent).toBe('🔊'); // Default audio icon
    });
  });

  describe('Real-time Updates', () => {
    test('should update display when tab audio state changes', async () => {
      // Initial state with one tab
      const initialResponse = {
        success: true,
        tabs: [{
          tabId: 123,
          title: 'Test Tab',
          domain: 'example.com',
          volumeLevel: 50,
          isMuted: false,
          isAudioActive: true
        }]
      };

      mockBrowser.runtime.sendMessage.mockResolvedValueOnce(initialResponse);

      const popupController = createPopupController(container); // Will fail - not implemented
      await popupController.initialize();

      // Simulate tab audio stopping (message from background script)
      const audioStopMessage = {
        type: 'TAB_AUDIO_UPDATE',
        payload: {
          tabId: 123,
          isAudioActive: false
        }
      };

      await popupController.handleBackgroundMessage(audioStopMessage);

      // Tab should be removed from display
      const tabElement = container.querySelector('[data-tab-id="123"]');
      expect(tabElement).not.toBeInTheDocument();

      // Empty state should be shown
      const emptyState = container.querySelector('.empty-state');
      expect(emptyState).toBeInTheDocument();
    });

    test('should add new tabs when audio starts', async () => {
      // Start with empty state
      mockBrowser.runtime.sendMessage.mockResolvedValueOnce({
        success: true,
        tabs: []
      });

      const popupController = createPopupController(container); // Will fail - not implemented
      await popupController.initialize();

      expect(container.querySelector('.empty-state')).toBeInTheDocument();

      // Simulate new tab with audio
      const newAudioMessage = {
        type: 'TAB_AUDIO_UPDATE',
        payload: {
          tabId: 456,
          title: 'New Audio Tab',
          domain: 'newsite.com',
          isAudioActive: true,
          volumeLevel: 100
        }
      };

      await popupController.handleBackgroundMessage(newAudioMessage);

      // New tab should appear
      const newTabElement = container.querySelector('[data-tab-id="456"]');
      expect(newTabElement).toBeInTheDocument();
      
      // Empty state should be hidden
      expect(container.querySelector('.empty-state')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling and Feedback', () => {
    test('should show error message when volume change fails', async () => {
      const mockTabsResponse = {
        success: true,
        tabs: [{
          tabId: 123,
          title: 'Test Tab',
          domain: 'example.com',
          volumeLevel: 50,
          isMuted: false,
          isAudioActive: true
        }]
      };

      mockBrowser.runtime.sendMessage.mockResolvedValueOnce(mockTabsResponse);
      mockBrowser.runtime.sendMessage.mockResolvedValueOnce({
        success: false,
        error: 'Tab not found'
      });

      const popupController = createPopupController(container); // Will fail - not implemented
      await popupController.initialize();

      // Try to change volume
      const volumeSlider = container.querySelector('[data-tab-id="123"] .volume-slider');
      volumeSlider.value = '80';
      volumeSlider.dispatchEvent(new Event('input'));

      await new Promise(resolve => setTimeout(resolve, 350));

      // Error message should be displayed
      const errorToast = container.querySelector('.error-toast');
      expect(errorToast).toBeInTheDocument();
      expect(errorToast.textContent).toContain('Failed to change volume');
      
      // Volume slider should revert to original value
      expect(volumeSlider.value).toBe('50');
    });

    test('should provide visual feedback during volume changes', async () => {
      const mockTabsResponse = {
        success: true,
        tabs: [{
          tabId: 123,
          title: 'Test Tab',
          domain: 'example.com',
          volumeLevel: 50,
          isMuted: false,
          isAudioActive: true
        }]
      };

      mockBrowser.runtime.sendMessage.mockResolvedValueOnce(mockTabsResponse);
      
      // Delay the volume change response to test loading state
      let resolveVolumeChange;
      const volumeChangePromise = new Promise(resolve => {
        resolveVolumeChange = resolve;
      });
      mockBrowser.runtime.sendMessage.mockReturnValueOnce(volumeChangePromise);

      const popupController = createPopupController(container); // Will fail - not implemented
      await popupController.initialize();

      const volumeSlider = container.querySelector('[data-tab-id="123"] .volume-slider');
      volumeSlider.value = '80';
      volumeSlider.dispatchEvent(new Event('input'));

      // Wait slightly longer for the debounced message to actually start sending
      await new Promise(resolve => setTimeout(resolve, 310));

      // Should show loading indicator
      const loadingIndicator = container.querySelector('[data-tab-id="123"] .loading-indicator');
      expect(loadingIndicator).toBeVisible();
      
      // Resolve the volume change
      resolveVolumeChange({ success: true });
      await volumeChangePromise;
      
      // Loading indicator should disappear
      expect(loadingIndicator).not.toBeVisible();
    });
  });

  describe('Keyboard Navigation and Accessibility', () => {
    test('should support keyboard navigation', async () => {
      const mockTabsResponse = {
        success: true,
        tabs: [
          { tabId: 123, title: 'Tab 1', domain: 'example.com', volumeLevel: 50, isMuted: false, isAudioActive: true },
          { tabId: 456, title: 'Tab 2', domain: 'test.com', volumeLevel: 75, isMuted: false, isAudioActive: true }
        ]
      };

      mockBrowser.runtime.sendMessage.mockResolvedValueOnce(mockTabsResponse);

      const popupController = createPopupController(container); // Will fail - not implemented
      await popupController.initialize();

      // Test Tab navigation
      const firstSlider = container.querySelector('[data-tab-id="123"] .volume-slider');
      const secondSlider = container.querySelector('[data-tab-id="456"] .volume-slider');

      firstSlider.focus();
      expect(document.activeElement).toBe(firstSlider);

      // Press Tab key
      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
      firstSlider.dispatchEvent(tabEvent);

      // Focus should move to next control
      expect(document.activeElement).toBe(secondSlider);
    });

    test('should have proper ARIA labels and roles', async () => {
      const mockTabsResponse = {
        success: true,
        tabs: [{
          tabId: 123,
          title: 'YouTube Video',
          domain: 'youtube.com',
          volumeLevel: 75,
          isMuted: false,
          isAudioActive: true
        }]
      };

      mockBrowser.runtime.sendMessage.mockResolvedValueOnce(mockTabsResponse);

      const popupController = createPopupController(container); // Will fail - not implemented
      await popupController.initialize();

      const volumeSlider = container.querySelector('[data-tab-id="123"] .volume-slider');
      const audioIcon = container.querySelector('[data-tab-id="123"] .audio-icon');

      expect(volumeSlider.getAttribute('aria-label')).toContain('Volume for YouTube Video');
      expect(volumeSlider.getAttribute('role')).toBe('slider');
      expect(volumeSlider.getAttribute('aria-valuenow')).toBe('75');
      expect(volumeSlider.getAttribute('aria-valuemin')).toBe('0');
      expect(volumeSlider.getAttribute('aria-valuemax')).toBe('200');

      expect(audioIcon.getAttribute('aria-label')).toContain('Mute YouTube Video');
      expect(audioIcon.getAttribute('role')).toBe('button');
    });
  });
});

// Import the popup controller implementation
const { createPopupController } = require('../../src/popup/popup.js');