/**
 * Contract tests for Message Passing Schema
 * These tests validate message formats between extension components
 */

const fs = require('fs');
const path = require('path');

describe('Message Passing Contract Tests', () => {
  let messageSchema;

  beforeAll(() => {
    // Load the message passing schema
    const schemaPath = path.join(__dirname, '../../specs/001-i-want-to/contracts/message-passing.json');
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    messageSchema = JSON.parse(schemaContent);
  });

  describe('BaseMessage Schema Validation', () => {
    test('should validate valid base message', () => {
      const validMessage = {
        type: 'TEST_MESSAGE',
        payload: { data: 'test' },
        timestamp: Date.now(),
        requestId: 'req-123'
      };

      expect(() => validateBaseMessage(validMessage)).not.toThrow();
    });

    test('should reject message missing required fields', () => {
      const invalidMessage = {
        payload: { data: 'test' }
        // Missing required 'type' field
      };

      expect(() => validateBaseMessage(invalidMessage)).toThrow('Missing required field: type');
    });

    test('should reject message with invalid type', () => {
      const invalidMessage = {
        type: 123, // Should be string
        payload: { data: 'test' }
      };

      expect(() => validateBaseMessage(invalidMessage)).toThrow('type must be string');
    });
  });

  describe('TabAudioUpdateMessage Schema Validation', () => {
    test('should validate valid tab audio update message', () => {
      const validMessage = {
        type: 'TAB_AUDIO_UPDATE',
        payload: {
          tabId: 123,
          isAudioActive: true,
          audioElements: ['video'],
          url: 'https://youtube.com/watch?v=test'
        },
        timestamp: Date.now()
      };

      expect(() => validateTabAudioUpdateMessage(validMessage)).not.toThrow();
    });

    test('should reject invalid tab audio update message', () => {
      const invalidMessage = {
        type: 'TAB_AUDIO_UPDATE',
        payload: {
          tabId: 'invalid', // Should be number
          isAudioActive: true
        }
      };

      expect(() => validateTabAudioUpdateMessage(invalidMessage)).toThrow('tabId must be number');
    });
  });

  describe('VolumeChangeMessage Schema Validation', () => {
    test('should validate valid volume change message', () => {
      const validMessage = {
        type: 'VOLUME_CHANGE',
        payload: {
          tabId: 123,
          volumeLevel: 75
        },
        requestId: 'vol-change-456'
      };

      expect(() => validateVolumeChangeMessage(validMessage)).not.toThrow();
    });

    test('should reject invalid volume level', () => {
      const invalidMessage = {
        type: 'VOLUME_CHANGE',
        payload: {
          tabId: 123,
          volumeLevel: 250 // Exceeds maximum of 200
        }
      };

      expect(() => validateVolumeChangeMessage(invalidMessage)).toThrow('volumeLevel must be between 0 and 200');
    });
  });

  describe('MuteToggleMessage Schema Validation', () => {
    test('should validate valid mute toggle message', () => {
      const validMessage = {
        type: 'MUTE_TOGGLE',
        payload: {
          tabId: 123,
          isMuted: true
        }
      };

      expect(() => validateMuteToggleMessage(validMessage)).not.toThrow();
    });

    test('should reject missing tabId', () => {
      const invalidMessage = {
        type: 'MUTE_TOGGLE',
        payload: {
          isMuted: true
          // Missing required tabId
        }
      };

      expect(() => validateMuteToggleMessage(invalidMessage)).toThrow('Missing required field: tabId');
    });
  });

  describe('GetActiveTabsMessage Schema Validation', () => {
    test('should validate valid get active tabs request', () => {
      const validMessage = {
        type: 'GET_ACTIVE_TABS',
        payload: {},
        requestId: 'get-tabs-789'
      };

      expect(() => validateGetActiveTabsMessage(validMessage)).not.toThrow();
    });
  });

  describe('TabsResponseMessage Schema Validation', () => {
    test('should validate valid tabs response message', () => {
      const validMessage = {
        type: 'TABS_RESPONSE',
        payload: {
          tabs: [
            { tabId: 123, title: 'Test Tab', volumeLevel: 100, isMuted: false },
            { tabId: 456, title: 'Another Tab', volumeLevel: 50, isMuted: true }
          ]
        },
        requestId: 'get-tabs-789'
      };

      expect(() => validateTabsResponseMessage(validMessage)).not.toThrow();
    });

    test('should reject invalid tabs array', () => {
      const invalidMessage = {
        type: 'TABS_RESPONSE',
        payload: {
          tabs: 'not-an-array' // Should be array
        }
      };

      expect(() => validateTabsResponseMessage(invalidMessage)).toThrow('tabs must be array');
    });
  });

  describe('ErrorMessage Schema Validation', () => {
    test('should validate valid error message', () => {
      const validMessage = {
        type: 'ERROR',
        payload: {
          code: 'INVALID_TAB',
          message: 'Tab not found',
          details: { tabId: 999 }
        },
        requestId: 'failed-req-123'
      };

      expect(() => validateErrorMessage(validMessage)).not.toThrow();
    });

    test('should reject error message without code', () => {
      const invalidMessage = {
        type: 'ERROR',
        payload: {
          message: 'Something went wrong'
          // Missing required 'code' field
        }
      };

      expect(() => validateErrorMessage(invalidMessage)).toThrow('Missing required field: code');
    });
  });
});

// These validation functions will be implemented later
// For now, they will cause the tests to fail (TDD approach)
function validateBaseMessage(message) {
  throw new Error('validateBaseMessage not implemented yet');
}

function validateTabAudioUpdateMessage(message) {
  throw new Error('validateTabAudioUpdateMessage not implemented yet');
}

function validateVolumeChangeMessage(message) {
  throw new Error('validateVolumeChangeMessage not implemented yet');
}

function validateMuteToggleMessage(message) {
  throw new Error('validateMuteToggleMessage not implemented yet');
}

function validateGetActiveTabsMessage(message) {
  throw new Error('validateGetActiveTabsMessage not implemented yet');
}

function validateTabsResponseMessage(message) {
  throw new Error('validateTabsResponseMessage not implemented yet');
}

function validateErrorMessage(message) {
  throw new Error('validateErrorMessage not implemented yet');
}