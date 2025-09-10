/**
 * Integration tests for Tab Audio Detection
 * Tests the complete audio detection workflow from content script to background script
 */

import { 
  createAudioDetector, 
  createYouTubeAudioDetector, 
  createCrossOriginAudioDetector,
  createContentScript 
} from '../../src/background/audioDetection.js';

import { createBackgroundScript } from '../../src/background/background.js';

describe('Tab Audio Detection Integration Tests', () => {
  let mockTab, mockBrowser;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    mockTab = {
      id: 123,
      title: 'YouTube - Test Video',
      url: 'https://www.youtube.com/watch?v=test123',
      audible: true
    };

    // Extended browser mock for audio detection
    mockBrowser = {
      ...global.browser,
      tabs: {
        ...global.browser.tabs,
        get: jest.fn().mockResolvedValue(mockTab),
        query: jest.fn().mockResolvedValue([mockTab])
      }
    };
    global.browser = mockBrowser;
  });

  describe('Audio Element Detection', () => {
    test('should detect when audio starts playing in a tab', async () => {
      // This test will fail until we implement the audio detection system
      
      // Simulate content script detecting audio
      const audioElement = document.createElement('video');
      audioElement.src = 'https://example.com/video.mp4';
      audioElement.autoplay = true;
      
      // Mock DOM
      document.body.appendChild(audioElement);
      
      // Simulate audio detection workflow
      const audioDetector = createAudioDetector(); // Will fail - not implemented
      const detected = await audioDetector.detectAudioElements(document);
      
      expect(detected).toHaveLength(1);
      expect(detected[0].tagName).toBe('VIDEO');
      expect(detected[0].src).toBe('https://example.com/video.mp4');
      
      // Clean up
      document.body.removeChild(audioElement);
    });

    test('should detect multiple audio elements in a single tab', async () => {
      // Create multiple audio elements
      const videoElement = document.createElement('video');
      const audioElement = document.createElement('audio');
      
      videoElement.src = 'https://example.com/video.mp4';
      audioElement.src = 'https://example.com/audio.mp3';
      
      document.body.appendChild(videoElement);
      document.body.appendChild(audioElement);
      
      const audioDetector = createAudioDetector(); // Will fail - not implemented
      const detected = await audioDetector.detectAudioElements(document);
      
      expect(detected).toHaveLength(2);
      expect(detected.map(el => el.tagName)).toContain('VIDEO');
      expect(detected.map(el => el.tagName)).toContain('AUDIO');
      
      // Clean up
      document.body.removeChild(videoElement);
      document.body.removeChild(audioElement);
    });

    test('should ignore muted audio elements', async () => {
      const videoElement = document.createElement('video');
      videoElement.src = 'https://example.com/video.mp4';
      videoElement.muted = true;
      
      document.body.appendChild(videoElement);
      
      const audioDetector = createAudioDetector(); // Will fail - not implemented
      const detected = await audioDetector.detectAudioElements(document);
      
      expect(detected).toHaveLength(0);
      
      // Clean up
      document.body.removeChild(videoElement);
    });
  });

  describe('Audio State Communication', () => {
    test('should send audio state update to background script when audio starts', async () => {
      const mockSendMessage = jest.fn().mockResolvedValue({ success: true });
      global.browser.runtime.sendMessage = mockSendMessage;
      
      // Simulate content script audio detection and messaging
      const contentScript = createContentScript();
      await contentScript.onAudioDetected({
        tabId: 123,
        audioElements: ['video'],
        isAudioActive: true,
        url: 'https://www.youtube.com/watch?v=test123'
      });
      
      expect(mockSendMessage).toHaveBeenCalledWith({
        type: 'TAB_AUDIO_UPDATE',
        payload: {
          tabId: 123,
          isAudioActive: true,
          audioElements: ['video'],
          url: 'https://www.youtube.com/watch?v=test123'
        },
        timestamp: expect.any(Number)
      });
    });

    test('should send audio state update when audio stops', async () => {
      const mockSendMessage = jest.fn().mockResolvedValue({ success: true });
      global.browser.runtime.sendMessage = mockSendMessage;
      
      const contentScript = createContentScript();
      await contentScript.onAudioStopped({
        tabId: 123,
        isAudioActive: false,
        url: 'https://www.youtube.com/watch?v=test123'
      });
      
      expect(mockSendMessage).toHaveBeenCalledWith({
        type: 'TAB_AUDIO_UPDATE',
        payload: {
          tabId: 123,
          isAudioActive: false,
          audioElements: [],
          url: 'https://www.youtube.com/watch?v=test123'
        },
        timestamp: expect.any(Number)
      });
    });
  });

  describe('Background Script Audio State Management', () => {
    test('should update audio tab state when receiving audio update message', async () => {
      const backgroundScript = createBackgroundScript();
      
      const audioUpdateMessage = {
        type: 'TAB_AUDIO_UPDATE',
        payload: {
          tabId: 123,
          isAudioActive: true,
          audioElements: ['video'],
          url: 'https://youtube.com/watch?v=test'
        }
      };
      
      await backgroundScript.handleMessage(audioUpdateMessage);
      
      const audioTabState = await backgroundScript.getAudioTabState(123);
      expect(audioTabState).toMatchObject({
        tabId: 123,
        isAudioActive: true,
        audioElements: ['video'],
        url: 'https://youtube.com/watch?v=test',
        domain: 'youtube.com',
        lastAudioActivity: expect.any(Number)
      });
    });

    test('should remove tab from active list when audio stops', async () => {
      const backgroundScript = createBackgroundScript();
      
      // First, add a tab with audio
      await backgroundScript.handleMessage({
        type: 'TAB_AUDIO_UPDATE',
        payload: {
          tabId: 123,
          isAudioActive: true,
          audioElements: ['video'],
          url: 'https://youtube.com/watch?v=test'
        }
      });
      
      // Then, stop audio
      await backgroundScript.handleMessage({
        type: 'TAB_AUDIO_UPDATE',
        payload: {
          tabId: 123,
          isAudioActive: false,
          audioElements: [],
          url: 'https://youtube.com/watch?v=test'
        }
      });
      
      // Check that the tab's audio state is correctly updated to inactive
      const audioTabState = await backgroundScript.getAudioTabState(123);
      expect(audioTabState.isAudioActive).toBe(false);
    });
  });

  describe('YouTube-Specific Audio Detection', () => {
    test('should detect YouTube video player audio', async () => {
      // Simulate YouTube page
      document.body.innerHTML = `
        <div id="movie_player">
          <video class="html5-main-video" src="blob:https://youtube.com/test"></video>
        </div>
      `;
      
      const youtubeDetector = createYouTubeAudioDetector();
      const detected = await youtubeDetector.detectYouTubeAudio();
      
      expect(detected).toBe(true);
      expect(youtubeDetector.getVideoElement().className).toContain('html5-main-video');
      
      // Clean up
      document.body.innerHTML = '';
    });

    test('should handle YouTube ads vs content distinction', async () => {
      // Simulate YouTube ad playing
      document.body.innerHTML = `
        <div id="movie_player" class="ad-showing">
          <video class="html5-main-video" src="blob:https://youtube.com/ad"></video>
        </div>
      `;
      
      const youtubeDetector = createYouTubeAudioDetector();
      const isContentAudio = await youtubeDetector.isContentAudio();
      
      expect(isContentAudio).toBe(false); // Should detect this is an ad, not content
      
      // Clean up
      document.body.innerHTML = '';
    });
  });

  describe('Cross-Origin Audio Detection', () => {
    test('should handle cross-origin iframe audio detection', async () => {
      // Simulate embedded audio player
      const iframe = document.createElement('iframe');
      iframe.src = 'https://soundcloud.com/player/';
      iframe.setAttribute('data-has-audio', 'true');
      
      document.body.appendChild(iframe);
      
      const crossOriginDetector = createCrossOriginAudioDetector();
      const detected = await crossOriginDetector.detectIframeAudio(iframe);
      
      expect(detected).toBe(true);
      
      // Clean up
      document.body.removeChild(iframe);
    });

    test('should handle audio detection permission errors gracefully', async () => {
      const restrictedDetector = createAudioDetector();
      
      // Simulate permission denied scenario
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      await expect(restrictedDetector.detectAudioElements(null)).resolves.toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Audio detection failed'));
      
      consoleSpy.mockRestore();
    });
  });
});

// Factory functions are now imported from the actual implementation files