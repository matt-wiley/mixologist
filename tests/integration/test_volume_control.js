/**
 * Integration tests for Volume Control functionality
 * Tests the complete volume control workflow from UI to audio element manipulation
 */

import { createContentScript } from '../../src/background/audioDetection.js';
import { createYouTubeVolumeController } from '../../src/content/volumeController.js';
import { createBackgroundScript } from '../../src/background/background.js';

describe('Volume Control Integration Tests', () => {
  let mockTab, mockBrowser;

  beforeEach(() => {
    jest.clearAllMocks();

    mockTab = {
      id: 123,
      title: 'YouTube - Test Video',
      url: 'https://www.youtube.com/watch?v=test123',
      audible: true
    };

    mockBrowser = {
      ...global.browser,
      tabs: {
        ...global.browser.tabs,
        get: jest.fn().mockResolvedValue(mockTab),
        sendMessage: jest.fn().mockResolvedValue({ success: true })
      }
    };
    global.browser = mockBrowser;
  });

  describe('Volume Change Messages', () => {
    test('should handle volume change request from popup to background script', async () => {
      const backgroundScript = createBackgroundScript(); // Will fail - not implemented
      
      const volumeChangeMessage = {
        type: 'VOLUME_CHANGE',
        payload: {
          tabId: 123,
          volumeLevel: 75
        },
        requestId: 'vol-change-123'
      };

      const response = await backgroundScript.handleMessage(volumeChangeMessage);
      
      expect(response).toEqual({
        success: true,
        tabId: 123,
        newVolumeLevel: 75,
        requestId: 'vol-change-123'
      });
      
      // Verify the volume change was communicated to content script
      expect(mockBrowser.tabs.sendMessage).toHaveBeenCalledWith(123, {
        type: 'SET_VOLUME',
        payload: { volumeLevel: 75 }
      });
    });

    test('should handle mute toggle request', async () => {
      const backgroundScript = createBackgroundScript(); // Will fail - not implemented
      
      const muteMessage = {
        type: 'MUTE_TOGGLE',
        payload: {
          tabId: 123,
          isMuted: true
        }
      };

      const response = await backgroundScript.handleMessage(muteMessage);
      
      expect(response).toEqual({
        success: true,
        tabId: 123,
        isMuted: true
      });
      
      expect(mockBrowser.tabs.sendMessage).toHaveBeenCalledWith(123, {
        type: 'SET_MUTE',
        payload: { isMuted: true }
      });
    });

    test('should handle errors when tab does not exist', async () => {
      mockBrowser.tabs.get.mockRejectedValue(new Error('Tab not found'));
      
      const backgroundScript = createBackgroundScript(); // Will fail - not implemented
      
      const volumeChangeMessage = {
        type: 'VOLUME_CHANGE',
        payload: {
          tabId: 999, // Non-existent tab
          volumeLevel: 50
        }
      };

      const response = await backgroundScript.handleMessage(volumeChangeMessage);
      
      expect(response).toEqual({
        success: false,
        error: 'Tab not found',
        code: 'INVALID_TAB'
      });
    });
  });

  describe('Content Script Volume Control', () => {
    test('should apply volume changes to audio elements', async () => {
      // Create mock audio elements
      const videoElement = document.createElement('video');
      const audioElement = document.createElement('audio');
      
      videoElement.volume = 1.0;
      audioElement.volume = 1.0;
      
      document.body.appendChild(videoElement);
      document.body.appendChild(audioElement);
      
      const contentScript = createContentScript(); // Will fail - not implemented
      
      // Simulate receiving volume change message from background
      const setVolumeMessage = {
        type: 'SET_VOLUME',
        payload: { volumeLevel: 50 } // 50% volume
      };
      
      await contentScript.handleMessage(setVolumeMessage);
      
      // Verify volume was applied to all audio elements
      expect(videoElement.volume).toBe(0.5);
      expect(audioElement.volume).toBe(0.5);
      
      // Clean up
      document.body.removeChild(videoElement);
      document.body.removeChild(audioElement);
    });

    test('should handle volume amplification above 100%', async () => {
      const videoElement = document.createElement('video');
      videoElement.volume = 1.0;
      document.body.appendChild(videoElement);
      
      const contentScript = createContentScript(); // Will fail - not implemented
      
      // Test amplification to 150%
      const amplifyMessage = {
        type: 'SET_VOLUME',
        payload: { volumeLevel: 150 }
      };
      
      await contentScript.handleMessage(amplifyMessage);
      
      // Note: HTML5 audio elements are capped at 1.0, so we need to implement
      // gain nodes or other audio context manipulation for amplification
      expect(videoElement.volume).toBe(1.0); // Capped at maximum
      
      // Verify our amplification system is aware of the 150% setting
      const volumeController = contentScript.getVolumeController();
      expect(volumeController.getCurrentAmplification()).toBe(1.5);
      
      document.body.removeChild(videoElement);
    });

    test('should apply mute/unmute to audio elements', async () => {
      const videoElement = document.createElement('video');
      videoElement.muted = false;
      document.body.appendChild(videoElement);
      
      const contentScript = createContentScript(); // Will fail - not implemented
      
      // Test muting
      const muteMessage = {
        type: 'SET_MUTE',
        payload: { isMuted: true }
      };
      
      await contentScript.handleMessage(muteMessage);
      expect(videoElement.muted).toBe(true);
      
      // Test unmuting
      const unmuteMessage = {
        type: 'SET_MUTE',
        payload: { isMuted: false }
      };
      
      await contentScript.handleMessage(unmuteMessage);
      expect(videoElement.muted).toBe(false);
      
      document.body.removeChild(videoElement);
    });

    test('should handle dynamically added audio elements', async () => {
      const contentScript = createContentScript(); // Will fail - not implemented
      
      // Set initial volume
      await contentScript.handleMessage({
        type: 'SET_VOLUME',
        payload: { volumeLevel: 75 }
      });
      
      // Add new audio element after volume is set
      const newVideoElement = document.createElement('video');
      newVideoElement.volume = 1.0;
      document.body.appendChild(newVideoElement);
      
      // Simulate DOM mutation observation
      await contentScript.onNewAudioElementAdded(newVideoElement);
      
      // New element should inherit current volume setting
      expect(newVideoElement.volume).toBe(0.75);
      
      document.body.removeChild(newVideoElement);
    });
  });

  describe('YouTube-Specific Volume Control', () => {
    test('should control YouTube player volume through API', async () => {
      // Mock YouTube player API
      global.YT = {
        Player: function(elementId) {
          return {
            setVolume: jest.fn(),
            getVolume: jest.fn().mockReturnValue(100),
            mute: jest.fn(),
            unMute: jest.fn(),
            isMuted: jest.fn().mockReturnValue(false)
          };
        }
      };
      
      // Simulate YouTube player container
      document.body.innerHTML = `
        <div id="movie_player">
          <video class="html5-main-video"></video>
        </div>
      `;
      
      const youtubeController = createYouTubeVolumeController(); // Will fail - not implemented
      
      await youtubeController.setVolume(75);
      
      // Verify YouTube API was called
      // Note: This will need to be implemented with proper YouTube player detection
      expect(youtubeController.getVolume()).toBe(75);
      
      document.body.innerHTML = '';
      delete global.YT;
    });

    test('should distinguish between YouTube ads and content for volume control', async () => {
      document.body.innerHTML = `
        <div id="movie_player" class="ad-showing">
          <video class="html5-main-video"></video>
        </div>
      `;
      
      const youtubeController = createYouTubeVolumeController(); // Will fail - not implemented
      
      // When ad is playing, volume changes should be limited/handled differently
      const adVolumeResult = await youtubeController.setVolume(50);
      expect(adVolumeResult.isAd).toBe(true);
      expect(adVolumeResult.volumeApplied).toBe(false); // Don't change ad volume
      
      // Remove ad class to simulate content playing
      document.querySelector('#movie_player').classList.remove('ad-showing');
      
      const contentVolumeResult = await youtubeController.setVolume(50);
      expect(contentVolumeResult.isAd).toBe(false);
      expect(contentVolumeResult.volumeApplied).toBe(true);
      
      document.body.innerHTML = '';
    });
  });

  describe('Volume Persistence Integration', () => {
    test('should save volume changes to storage', async () => {
      const mockStorageSet = jest.fn().mockResolvedValue();
      mockBrowser.storage.sync.set = mockStorageSet;
      
      const backgroundScript = createBackgroundScript(); // Will fail - not implemented
      
      const volumeChangeMessage = {
        type: 'VOLUME_CHANGE',
        payload: {
          tabId: 123,
          volumeLevel: 80
        }
      };
      
      await backgroundScript.handleMessage(volumeChangeMessage);
      
      // Verify volume setting was persisted for the domain
      expect(mockStorageSet).toHaveBeenCalledWith({
        volumeSettings: expect.objectContaining({
          'youtube.com': expect.objectContaining({
            domain: 'youtube.com',
            defaultVolume: 80,
            lastUsed: expect.any(Number)
          })
        })
      });
    });

    test('should restore volume settings when tab audio starts', async () => {
      // Mock existing volume settings
      const mockStorageGet = jest.fn().mockResolvedValue({
        volumeSettings: {
          'youtube.com': {
            domain: 'youtube.com',
            defaultVolume: 65,
            isMuted: false,
            lastUsed: Date.now(),
            createdAt: Date.now() - 86400000
          }
        }
      });
      mockBrowser.storage.sync.get = mockStorageGet;
      
      const backgroundScript = createBackgroundScript(); // Will fail - not implemented
      
      // Simulate new audio detection
      const audioUpdateMessage = {
        type: 'TAB_AUDIO_UPDATE',
        payload: {
          tabId: 123,
          isAudioActive: true,
          url: 'https://youtube.com/watch?v=test'
        }
      };
      
      await backgroundScript.handleMessage(audioUpdateMessage);
      
      // Verify volume was restored from settings
      expect(mockBrowser.tabs.sendMessage).toHaveBeenCalledWith(123, {
        type: 'SET_VOLUME',
        payload: { volumeLevel: 65 }
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle content script communication errors gracefully', async () => {
      mockBrowser.tabs.sendMessage.mockRejectedValue(new Error('Content script not responding'));
      
      const backgroundScript = createBackgroundScript(); // Will fail - not implemented
      
      const volumeChangeMessage = {
        type: 'VOLUME_CHANGE',
        payload: {
          tabId: 123,
          volumeLevel: 75
        }
      };

      const response = await backgroundScript.handleMessage(volumeChangeMessage);
      
      expect(response).toEqual({
        success: false,
        error: 'Content script not responding',
        code: 'CONTENT_SCRIPT_ERROR'
      });
    });

    test('should validate volume levels are within acceptable range', async () => {
      const backgroundScript = createBackgroundScript(); // Will fail - not implemented
      
      // Test volume too high
      const invalidHighMessage = {
        type: 'VOLUME_CHANGE',
        payload: {
          tabId: 123,
          volumeLevel: 250 // Above maximum of 200
        }
      };

      const highResponse = await backgroundScript.handleMessage(invalidHighMessage);
      expect(highResponse.success).toBe(false);
      expect(highResponse.error).toContain('Volume level must be between 0 and 200');
      
      // Test negative volume
      const invalidLowMessage = {
        type: 'VOLUME_CHANGE',
        payload: {
          tabId: 123,
          volumeLevel: -10
        }
      };

      const lowResponse = await backgroundScript.handleMessage(invalidLowMessage);
      expect(lowResponse.success).toBe(false);
      expect(lowResponse.error).toContain('Volume level must be between 0 and 200');
    });
  });
});

// Factory functions are now imported from the actual implementation files

// YouTube volume controller is now implemented in the imported module