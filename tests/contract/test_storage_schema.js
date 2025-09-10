/**
 * Contract tests for Storage Schema
 * These tests validate storage data structures and operations
 */

const fs = require('fs');
const path = require('path');

describe('Storage Schema Contract Tests', () => {
  let storageSchema;

  beforeAll(() => {
    // Load the storage schema
    const schemaPath = path.join(__dirname, '../../specs/001-i-want-to/contracts/storage-schema.json');
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    storageSchema = JSON.parse(schemaContent);
  });

  describe('Local Storage Schema Validation', () => {
    test('should validate valid audioTabs storage structure', () => {
      const validAudioTabsStorage = {
        audioTabs: {
          '123': {
            tabId: 123,
            title: 'YouTube - Music Video',
            url: 'https://www.youtube.com/watch?v=test',
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
        }
      };

      expect(() => validateLocalStorageStructure(validAudioTabsStorage)).not.toThrow();
    });

    test('should validate valid extensionState storage structure', () => {
      const validExtensionState = {
        extensionState: {
          activeTabs: [123, 456, 789],
          isEnabled: true,
          lastUpdate: Date.now(),
          totalTabsControlled: 3
        }
      };

      expect(() => validateLocalStorageStructure(validExtensionState)).not.toThrow();
    });

    test('should reject invalid audioTabs structure', () => {
      const invalidStorage = {
        audioTabs: {
          '123': {
            tabId: 'invalid', // Should be number
            title: 'Test Tab'
          }
        }
      };

      expect(() => validateLocalStorageStructure(invalidStorage)).toThrow('tabId must be number');
    });
  });

  describe('Sync Storage Schema Validation', () => {
    test('should validate valid volumeSettings storage structure', () => {
      const validVolumeSettings = {
        volumeSettings: {
          'youtube.com': {
            domain: 'youtube.com',
            defaultVolume: 80,
            isMuted: false,
            lastUsed: Date.now(),
            createdAt: Date.now() - 86400000
          },
          'spotify.com': {
            domain: 'spotify.com',
            defaultVolume: 100,
            isMuted: false,
            lastUsed: Date.now() - 3600000,
            createdAt: Date.now() - 172800000
          }
        }
      };

      expect(() => validateSyncStorageStructure(validVolumeSettings)).not.toThrow();
    });

    test('should validate valid globalSettings storage structure', () => {
      const validGlobalSettings = {
        globalSettings: {
          defaultVolume: 100,
          enabledByDefault: true,
          showNotifications: true,
          maxTabs: 50,
          version: '1.0.0'
        }
      };

      expect(() => validateSyncStorageStructure(validGlobalSettings)).not.toThrow();
    });

    test('should reject invalid volumeSettings domain format', () => {
      const invalidStorage = {
        volumeSettings: {
          'not-a-valid-domain!': {
            domain: 'not-a-valid-domain!',
            defaultVolume: 80,
            isMuted: false,
            lastUsed: Date.now(),
            createdAt: Date.now()
          }
        }
      };

      expect(() => validateSyncStorageStructure(invalidStorage)).toThrow('Invalid domain format');
    });

    test('should reject globalSettings with invalid maxTabs', () => {
      const invalidStorage = {
        globalSettings: {
          defaultVolume: 100,
          enabledByDefault: true,
          showNotifications: true,
          maxTabs: 0, // Should be positive
          version: '1.0.0'
        }
      };

      expect(() => validateSyncStorageStructure(invalidStorage)).toThrow('maxTabs must be positive');
    });
  });

  describe('Storage Key Validation', () => {
    test('should validate local storage keys', () => {
      const validLocalKeys = ['audioTabs', 'extensionState'];
      
      validLocalKeys.forEach(key => {
        expect(() => validateStorageKey(key, 'local')).not.toThrow();
      });
    });

    test('should validate sync storage keys', () => {
      const validSyncKeys = ['volumeSettings', 'globalSettings'];
      
      validSyncKeys.forEach(key => {
        expect(() => validateStorageKey(key, 'sync')).not.toThrow();
      });
    });

    test('should reject invalid storage keys', () => {
      const invalidKeys = ['invalidKey', 'notAllowed', ''];
      
      invalidKeys.forEach(key => {
        expect(() => validateStorageKey(key, 'local')).toThrow(`Invalid storage key: ${key}`);
      });
    });
  });

  describe('Storage Operation Validation', () => {
    test('should validate storage get operations', () => {
      const validGetOps = [
        { key: 'audioTabs', storage: 'local' },
        { key: 'volumeSettings', storage: 'sync' },
        { key: 'extensionState', storage: 'local' },
        { key: 'globalSettings', storage: 'sync' }
      ];

      validGetOps.forEach(op => {
        expect(() => validateStorageOperation('get', op)).not.toThrow();
      });
    });

    test('should validate storage set operations', () => {
      const validSetOps = [
        { 
          key: 'audioTabs', 
          storage: 'local',
          data: {
            '123': {
              tabId: 123,
              title: 'Test',
              url: 'https://example.com',
              domain: 'example.com',
              volumeLevel: 100,
              isMuted: false,
              isAudioActive: true,
              lastAudioActivity: Date.now()
            }
          }
        }
      ];

      validSetOps.forEach(op => {
        expect(() => validateStorageOperation('set', op)).not.toThrow();
      });
    });

    test('should reject storage operations with wrong storage type', () => {
      const invalidOp = { key: 'volumeSettings', storage: 'local' }; // Should be 'sync'

      expect(() => validateStorageOperation('get', invalidOp)).toThrow('volumeSettings must use sync storage');
    });
  });

  describe('Data Migration Validation', () => {
    test('should validate data migration from older versions', () => {
      const oldFormatData = {
        tabs: { // Old format
          '123': { id: 123, vol: 75, muted: false }
        }
      };

      const expectedNewFormat = {
        audioTabs: {
          '123': {
            tabId: 123,
            volumeLevel: 75,
            isMuted: false,
            // Additional required fields should be added during migration
            title: '',
            url: '',
            domain: '',
            isAudioActive: false,
            lastAudioActivity: expect.any(Number)
          }
        }
      };

      expect(() => validateDataMigration(oldFormatData, '0.9.0', '1.0.0')).not.toThrow();
    });
  });
});

// These validation functions will be implemented later
// For now, they will cause the tests to fail (TDD approach)
function validateLocalStorageStructure(data) {
  throw new Error('validateLocalStorageStructure not implemented yet');
}

function validateSyncStorageStructure(data) {
  throw new Error('validateSyncStorageStructure not implemented yet');
}

function validateStorageKey(key, storageType) {
  throw new Error('validateStorageKey not implemented yet');
}

function validateStorageOperation(operation, params) {
  throw new Error('validateStorageOperation not implemented yet');
}

function validateDataMigration(oldData, oldVersion, newVersion) {
  throw new Error('validateDataMigration not implemented yet');
}