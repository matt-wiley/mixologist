/**
 * Contract tests for Extension API Schema
 * These tests validate that our data structures conform to the API contract
 */

const fs = require('fs');
const path = require('path');

// Import validation functions from model classes
import { validateAudioTab } from '../../src/models/AudioTab.js';
import { validateVolumeSettings } from '../../src/models/VolumeSettings.js';
import { validateExtensionState } from '../../src/models/ExtensionState.js';
import { validateGlobalSettings } from '../../src/models/GlobalSettings.js';

describe('Extension API Contract Tests', () => {
  let apiSchema;

  beforeAll(() => {
    // Load the API schema
    const schemaPath = path.join(__dirname, '../../specs/001-i-want-to/contracts/extension-api.json');
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    apiSchema = JSON.parse(schemaContent);
  });

  describe('AudioTab Schema Validation', () => {
    test('should validate valid AudioTab object', () => {
      const validAudioTab = {
        tabId: 123,
        title: 'YouTube - Music Video',
        url: 'https://www.youtube.com/watch?v=example',
        domain: 'youtube.com',
        favicon: 'https://www.youtube.com/favicon.ico',
        volumeLevel: 75,
        isMuted: false,
        isAudioActive: true,
        lastAudioActivity: Date.now(),
        audioElements: ['video', 'audio']
      };

      // This test will fail until we implement AudioTab validation
      expect(() => validateAudioTab(validAudioTab)).not.toThrow();
    });

    test('should reject AudioTab with invalid tabId', () => {
      const invalidAudioTab = {
        tabId: -1, // Invalid: must be positive
        title: 'Test Tab',
        url: 'https://example.com',
        domain: 'example.com',
        volumeLevel: 100,
        isMuted: false,
        isAudioActive: true,
        lastAudioActivity: Date.now()
      };

      expect(() => validateAudioTab(invalidAudioTab)).toThrow('tabId must be positive integer');
    });

    test('should reject AudioTab with invalid volumeLevel', () => {
      const invalidAudioTab = {
        tabId: 123,
        title: 'Test Tab',
        url: 'https://example.com',
        domain: 'example.com',
        volumeLevel: 250, // Invalid: exceeds maximum of 200
        isMuted: false,
        isAudioActive: true,
        lastAudioActivity: Date.now()
      };

      expect(() => validateAudioTab(invalidAudioTab)).toThrow('volumeLevel must be between 0 and 200');
    });

    test('should reject AudioTab with missing required fields', () => {
      const incompleteAudioTab = {
        tabId: 123,
        title: 'Test Tab'
        // Missing required fields: url, domain, volumeLevel, etc.
      };

      expect(() => validateAudioTab(incompleteAudioTab)).toThrow('Missing required fields');
    });
  });

  describe('VolumeSettings Schema Validation', () => {
    test('should validate valid VolumeSettings object', () => {
      const validVolumeSettings = {
        domain: 'youtube.com',
        defaultVolume: 80,
        isMuted: false,
        lastUsed: Date.now(),
        createdAt: Date.now()
      };

      expect(() => validateVolumeSettings(validVolumeSettings)).not.toThrow();
    });

    test('should reject invalid domain format', () => {
      const invalidSettings = {
        domain: 'not-a-valid-domain!@#',
        defaultVolume: 80,
        isMuted: false,
        lastUsed: Date.now(),
        createdAt: Date.now()
      };

      expect(() => validateVolumeSettings(invalidSettings)).toThrow('Invalid domain format');
    });
  });

  describe('ExtensionState Schema Validation', () => {
    test('should validate valid ExtensionState object', () => {
      const validState = {
        activeTabs: [],
        isEnabled: true,
        lastUpdate: Date.now(),
        totalTabsControlled: 0
      };

      expect(() => validateExtensionState(validState)).not.toThrow();
    });

    test('should validate ExtensionState with audio tabs', () => {
      const stateWithTabs = {
        activeTabs: [123, 456, 789],
        isEnabled: true,
        lastUpdate: Date.now(),
        totalTabsControlled: 3
      };

      expect(() => validateExtensionState(stateWithTabs)).not.toThrow();
    });
  });

  describe('GlobalSettings Schema Validation', () => {
    test('should validate valid GlobalSettings object', () => {
      const validGlobalSettings = {
        defaultVolume: 100,
        showInactiveTabs: true,
        autoCleanup: true,
        cleanupDelaySeconds: 60,
        enableNotifications: true,
        syncSettings: true,
        minVolumeStep: 5,
        maxVolumeLimit: 200
      };

      expect(() => validateGlobalSettings(validGlobalSettings)).not.toThrow();
    });

    test('should reject invalid maxVolumeLimit value', () => {
      const invalidSettings = {
        defaultVolume: 100,
        showInactiveTabs: true,
        autoCleanup: true,
        cleanupDelaySeconds: 60,
        enableNotifications: true,
        syncSettings: true,
        minVolumeStep: 5,
        maxVolumeLimit: 50 // Invalid: must be >= 100
      };

      expect(() => validateGlobalSettings(invalidSettings)).toThrow('maxVolumeLimit must be integer between 100 and 200');
    });
  });
});

// Validation functions are now imported from the model classes above