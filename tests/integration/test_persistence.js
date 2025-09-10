/**
 * Integration tests for Settings Persistence
 * Tests storage operations and cross-session persistence of volume settings
 */

import { 
  createStorageService, 
  createExtensionManager, 
  createMigrationService 
} from '../../src/background/storageService.js';

describe('Settings Persistence Integration Tests', () => {
  let mockBrowser, mockStorageLocal, mockStorageSync;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock storage APIs
    mockStorageLocal = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(),
      remove: jest.fn().mockResolvedValue(),
      clear: jest.fn().mockResolvedValue()
    };

    mockStorageSync = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(),
      remove: jest.fn().mockResolvedValue(),
      clear: jest.fn().mockResolvedValue()
    };

    mockBrowser = {
      ...global.browser,
      storage: {
        local: mockStorageLocal,
        sync: mockStorageSync
      }
    };
    global.browser = mockBrowser;
  });

  describe('Volume Settings Persistence', () => {
    test('should persist volume settings to sync storage', async () => {
      const storageService = createStorageService(); // Will fail - not implemented
      
      const volumeSettings = {
        domain: 'youtube.com',
        defaultVolume: 75,
        isMuted: false,
        lastUsed: Date.now(),
        createdAt: Date.now()
      };

      await storageService.saveVolumeSettings('youtube.com', volumeSettings);

      expect(mockStorageSync.set).toHaveBeenCalledWith({
        volumeSettings: {
          'youtube.com': volumeSettings
        }
      });
    });

    test('should retrieve volume settings from sync storage', async () => {
      const existingSettings = {
        volumeSettings: {
          'youtube.com': {
            domain: 'youtube.com',
            defaultVolume: 85,
            isMuted: false,
            lastUsed: Date.now() - 3600000,
            createdAt: Date.now() - 86400000
          },
          'spotify.com': {
            domain: 'spotify.com',
            defaultVolume: 100,
            isMuted: true,
            lastUsed: Date.now() - 7200000,
            createdAt: Date.now() - 172800000
          }
        }
      };

      mockStorageSync.get.mockResolvedValue(existingSettings);

      const storageService = createStorageService(); // Will fail - not implemented
      const settings = await storageService.getVolumeSettings('youtube.com');

      expect(mockStorageSync.get).toHaveBeenCalledWith(['volumeSettings']);
      expect(settings).toEqual(existingSettings.volumeSettings['youtube.com']);
    });

    test('should return default settings for new domains', async () => {
      mockStorageSync.get.mockResolvedValue({ volumeSettings: {} });

      const storageService = createStorageService(); // Will fail - not implemented
      const settings = await storageService.getVolumeSettings('newsite.com');

      expect(settings).toEqual({
        domain: 'newsite.com',
        defaultVolume: 100, // Default volume
        isMuted: false,
        lastUsed: expect.any(Number),
        createdAt: expect.any(Number)
      });
    });

    test('should update existing volume settings', async () => {
      const existingSettings = {
        volumeSettings: {
          'youtube.com': {
            domain: 'youtube.com',
            defaultVolume: 75,
            isMuted: false,
            lastUsed: Date.now() - 3600000,
            createdAt: Date.now() - 86400000
          }
        }
      };

      mockStorageSync.get.mockResolvedValue(existingSettings);

      const storageService = createStorageService(); // Will fail - not implemented
      
      await storageService.updateVolumeSettings('youtube.com', {
        defaultVolume: 90,
        isMuted: true
      });

      expect(mockStorageSync.set).toHaveBeenCalledWith({
        volumeSettings: {
          'youtube.com': {
            domain: 'youtube.com',
            defaultVolume: 90,
            isMuted: true,
            lastUsed: expect.any(Number),
            createdAt: existingSettings.volumeSettings['youtube.com'].createdAt
          }
        }
      });
    });
  });

  describe('Extension State Persistence', () => {
    test('should persist current tab states to local storage', async () => {
      const storageService = createStorageService(); // Will fail - not implemented
      
      const audioTabs = {
        '123': {
          tabId: 123,
          title: 'YouTube - Test Video',
          url: 'https://youtube.com/watch?v=test',
          domain: 'youtube.com',
          volumeLevel: 75,
          isMuted: false,
          isAudioActive: true,
          lastAudioActivity: Date.now()
        },
        '456': {
          tabId: 456,
          title: 'Spotify Web Player',
          url: 'https://open.spotify.com/track/test',
          domain: 'open.spotify.com',
          volumeLevel: 100,
          isMuted: true,
          isAudioActive: false,
          lastAudioActivity: Date.now() - 30000
        }
      };

      await storageService.saveAudioTabs(audioTabs);

      expect(mockStorageLocal.set).toHaveBeenCalledWith({
        audioTabs: audioTabs
      });
    });

    test('should retrieve current tab states from local storage', async () => {
      const storedTabs = {
        audioTabs: {
          '123': {
            tabId: 123,
            title: 'Test Tab',
            url: 'https://example.com',
            domain: 'example.com',
            volumeLevel: 50,
            isMuted: false,
            isAudioActive: true,
            lastAudioActivity: Date.now()
          }
        }
      };

      mockStorageLocal.get.mockResolvedValue(storedTabs);

      const storageService = createStorageService(); // Will fail - not implemented
      const audioTabs = await storageService.getAudioTabs();

      expect(mockStorageLocal.get).toHaveBeenCalledWith(['audioTabs']);
      expect(audioTabs).toEqual(storedTabs.audioTabs);
    });

    test('should clean up stale tab data on browser restart', async () => {
      // Simulate tabs from previous session that no longer exist
      const staleTabData = {
        audioTabs: {
          '999': { // This tab no longer exists
            tabId: 999,
            title: 'Closed Tab',
            url: 'https://closed.com',
            domain: 'closed.com',
            volumeLevel: 80,
            isMuted: false,
            isAudioActive: false,
            lastAudioActivity: Date.now() - 86400000 // 24 hours ago
          }
        }
      };

      mockStorageLocal.get.mockResolvedValue(staleTabData);

      const storageService = createStorageService(); // Will fail - not implemented
      await storageService.cleanupStaleTabData();

      expect(mockStorageLocal.set).toHaveBeenCalledWith({
        audioTabs: {} // Cleaned up
      });
    });
  });

  describe('Global Settings Persistence', () => {
    test('should persist global extension settings', async () => {
      const globalSettings = {
        defaultVolume: 80,
        enabledByDefault: true,
        showNotifications: false,
        maxTabs: 25,
        version: '1.0.0'
      };

      const storageService = createStorageService(); // Will fail - not implemented
      await storageService.saveGlobalSettings(globalSettings);

      expect(mockStorageSync.set).toHaveBeenCalledWith({
        globalSettings: globalSettings
      });
    });

    test('should retrieve global settings with defaults', async () => {
      mockStorageSync.get.mockResolvedValue({});

      const storageService = createStorageService(); // Will fail - not implemented
      const settings = await storageService.getGlobalSettings();

      expect(settings).toEqual({
        defaultVolume: 100,
        enabledByDefault: true,
        showNotifications: true,
        maxTabs: 50,
        version: '1.0.0'
      });
    });

    test('should merge partial global settings updates', async () => {
      const existingSettings = {
        globalSettings: {
          defaultVolume: 80,
          enabledByDefault: true,
          showNotifications: true,
          maxTabs: 50,
          version: '1.0.0'
        }
      };

      mockStorageSync.get.mockResolvedValue(existingSettings);

      const storageService = createStorageService(); // Will fail - not implemented
      await storageService.updateGlobalSettings({
        defaultVolume: 90,
        showNotifications: false
      });

      expect(mockStorageSync.set).toHaveBeenCalledWith({
        globalSettings: {
          defaultVolume: 90,
          enabledByDefault: true,
          showNotifications: false, // Updated
          maxTabs: 50,
          version: '1.0.0'
        }
      });
    });
  });

  describe('Cross-Session Restoration', () => {
    test('should restore volume settings when extension starts', async () => {
      const persistedSettings = {
        volumeSettings: {
          'youtube.com': { defaultVolume: 65, isMuted: false },
          'spotify.com': { defaultVolume: 90, isMuted: true }
        },
        globalSettings: {
          defaultVolume: 100,
          enabledByDefault: true,
          showNotifications: true,
          maxTabs: 50,
          version: '1.0.0'
        }
      };

      mockStorageSync.get.mockResolvedValue(persistedSettings);

      const extensionManager = createExtensionManager(); // Will fail - not implemented
      await extensionManager.initialize();

      expect(mockStorageSync.get).toHaveBeenCalledWith(['volumeSettings', 'globalSettings']);
      
      const restoredSettings = extensionManager.getVolumeSettingsCache();
      expect(restoredSettings).toEqual(persistedSettings.volumeSettings);
    });

    test('should handle corruption in stored data gracefully', async () => {
      // Simulate corrupted storage data
      mockStorageSync.get.mockResolvedValue({
        volumeSettings: 'corrupted-data', // Should be object
        globalSettings: null
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const extensionManager = createExtensionManager(); // Will fail - not implemented
      await extensionManager.initialize();

      // Should fall back to defaults and clear corrupted data
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Corrupted storage data'));
      expect(mockStorageSync.set).toHaveBeenCalledWith({
        volumeSettings: {},
        globalSettings: expect.any(Object)
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Data Migration', () => {
    test('should migrate data from older extension versions', async () => {
      // Simulate old format data
      const oldFormatData = {
        tabs: { // Old key name
          '123': {
            id: 123, // Old field name
            vol: 75, // Old field name
            muted: false
          }
        },
        settings: { // Old key name
          defaultVol: 90 // Old field name
        }
      };

      mockStorageLocal.get.mockResolvedValue(oldFormatData);
      mockStorageSync.get.mockResolvedValue({});

      const migrationService = createMigrationService(); // Will fail - not implemented
      const migrated = await migrationService.migrateFromVersion('0.9.0', '1.0.0');

      expect(migrated).toBe(true);
      
      // Should have converted to new format
      expect(mockStorageLocal.set).toHaveBeenCalledWith({
        audioTabs: {
          '123': {
            tabId: 123,
            volumeLevel: 75,
            isMuted: false,
            // Additional fields should be filled with defaults
            title: '',
            url: '',
            domain: '',
            isAudioActive: false,
            lastAudioActivity: expect.any(Number)
          }
        }
      });

      // Should clean up old data
      expect(mockStorageLocal.remove).toHaveBeenCalledWith(['tabs', 'settings']);
    });

    test('should skip migration when no old data exists', async () => {
      mockStorageLocal.get.mockResolvedValue({});
      
      const migrationService = createMigrationService(); // Will fail - not implemented
      const migrated = await migrationService.migrateFromVersion('0.9.0', '1.0.0');

      expect(migrated).toBe(false);
      expect(mockStorageLocal.set).not.toHaveBeenCalled();
    });
  });

  describe('Storage Error Handling', () => {
    test('should handle storage quota exceeded errors', async () => {
      const quotaError = new Error('QuotaExceededError');
      mockStorageSync.set.mockRejectedValue(quotaError);

      const storageService = createStorageService(); // Will fail - not implemented
      
      const result = await storageService.saveVolumeSettings('youtube.com', {
        domain: 'youtube.com',
        defaultVolume: 75,
        isMuted: false
      });

      expect(result).toEqual({
        success: false,
        error: 'Storage quota exceeded',
        code: 'QUOTA_EXCEEDED'
      });
    });

    test('should handle storage API unavailability', async () => {
      // Simulate storage API not available
      global.browser.storage = undefined;

      const storageService = createStorageService(); // Will fail - not implemented
      
      const result = await storageService.getVolumeSettings('youtube.com');

      expect(result).toEqual({
        success: false,
        error: 'Storage API not available',
        code: 'STORAGE_UNAVAILABLE'
      });

      // Restore for other tests
      global.browser.storage = { local: mockStorageLocal, sync: mockStorageSync };
    });
  });

  describe('Performance Optimization', () => {
    test('should batch storage operations to reduce API calls', async () => {
      const storageService = createStorageService(); // Will fail - not implemented
      
      // Start batching
      storageService.startBatch();
      
      // Queue multiple operations
      storageService.saveVolumeSettings('youtube.com', { defaultVolume: 70 });
      storageService.saveVolumeSettings('spotify.com', { defaultVolume: 80 });
      storageService.saveVolumeSettings('soundcloud.com', { defaultVolume: 90 });
      
      // Execute batch
      await storageService.executeBatch();

      // Should have made only one storage call for all operations
      expect(mockStorageSync.set).toHaveBeenCalledTimes(1);
      expect(mockStorageSync.set).toHaveBeenCalledWith({
        volumeSettings: {
          'youtube.com': { defaultVolume: 70 },
          'spotify.com': { defaultVolume: 80 },
          'soundcloud.com': { defaultVolume: 90 }
        }
      });
    });

    test('should cache frequently accessed settings', async () => {
      const storageService = createStorageService(); // Will fail - not implemented
      
      // First access should hit storage
      mockStorageSync.get.mockResolvedValue({
        volumeSettings: {
          'youtube.com': { defaultVolume: 75 }
        }
      });
      
      const settings1 = await storageService.getVolumeSettings('youtube.com');
      expect(mockStorageSync.get).toHaveBeenCalledTimes(1);
      
      // Second access should use cache
      const settings2 = await storageService.getVolumeSettings('youtube.com');
      expect(mockStorageSync.get).toHaveBeenCalledTimes(1); // Still only 1 call
      
      expect(settings1).toEqual(settings2);
    });
  });
});

// Factory functions are now imported from the actual implementation files