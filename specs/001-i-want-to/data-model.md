# Data Model: Firefox Tab Audio Volume Control Extension

**Date**: 2025-09-09  
**Feature**: Tab-specific audio volume control  
**Source**: Extracted from feature specification requirements

## Core Entities

### AudioTab
Represents a Firefox tab currently playing audio with its volume control state.

**Fields**:
- `tabId` (number, required): Firefox tab identifier, unique per browser session
- `title` (string, required): Tab title for display purposes
- `url` (string, required): Full URL of the tab for domain-based settings
- `domain` (string, required): Extracted domain for persistent settings (e.g., "youtube.com")
- `favicon` (string, optional): Tab favicon URL for visual identification
- `volumeLevel` (number, required): Current volume level percentage (0-200)
- `isMuted` (boolean, required): Current mute state of the tab
- `isAudioActive` (boolean, required): Whether tab is currently playing audio
- `lastAudioActivity` (timestamp, required): Last time audio state changed
- `audioElements` (array, optional): List of detected audio/video elements in the tab

**Validation Rules**:
- `tabId` must be positive integer
- `volumeLevel` must be between 0 and 200 (allowing amplification above 100%)
- `url` must be valid HTTP/HTTPS URL
- `domain` must be extracted from valid URL
- `lastAudioActivity` must be valid timestamp

**State Transitions**:
- `DETECTED` → Tab has audio elements but not playing
- `PLAYING` → Tab is actively playing audio (`isAudioActive: true`)
- `MUTED` → Audio is muted (`isMuted: true`)
- `STOPPED` → Audio stopped, tab may be removed from control list
- `CLOSED` → Tab closed, remove from active tabs

### VolumeSettings
Configuration for persistent volume settings per domain/site.

**Fields**:
- `domain` (string, required): Website domain (e.g., "youtube.com", "spotify.com")
- `defaultVolume` (number, required): Default volume level for this domain (0-200)
- `isMuted` (boolean, required): Default mute state for this domain
- `lastUsed` (timestamp, required): Last time settings were applied
- `isEnabled` (boolean, required): Whether volume control is enabled for this domain
- `customSettings` (object, optional): Domain-specific configuration overrides

**Validation Rules**:
- `domain` must be valid domain format (no protocol, ports allowed)
- `defaultVolume` must be between 0 and 200
- `lastUsed` must be valid timestamp
- `customSettings` must contain only recognized configuration keys

### ExtensionState
Global state tracking all monitored tabs and extension configuration.

**Fields**:
- `activeTabs` (array of AudioTab, required): Currently monitored tabs with audio
- `globalSettings` (GlobalSettings, required): Extension-wide configuration
- `lastUpdate` (timestamp, required): Last time extension state was updated
- `version` (string, required): Extension version for data migration
- `isEnabled` (boolean, required): Master enable/disable switch

**Relationships**:
- `activeTabs` contains 0 to N `AudioTab` entities
- Each `AudioTab.domain` may have corresponding `VolumeSettings`
- `ExtensionState` aggregates all other entities

### GlobalSettings
Extension-wide configuration and preferences.

**Fields**:
- `defaultVolume` (number, required): Default volume for new tabs (0-200)
- `showInactiveTabs` (boolean, required): Whether to show tabs with no current audio
- `autoCleanup` (boolean, required): Automatically remove stopped audio tabs
- `cleanupDelaySeconds` (number, required): Delay before removing inactive tabs
- `enableNotifications` (boolean, required): Show notifications for audio changes
- `syncSettings` (boolean, required): Enable sync across Firefox instances
- `minVolumeStep` (number, required): Minimum volume adjustment step (1-10)
- `maxVolumeLimit` (number, required): Maximum allowed volume level (100-200)

**Validation Rules**:
- `defaultVolume` must be between 0 and `maxVolumeLimit`
- `cleanupDelaySeconds` must be between 5 and 300 (5 minutes max)
- `minVolumeStep` must be between 1 and 10
- `maxVolumeLimit` must be between 100 and 200

## Data Storage Schema

### Browser Storage Structure
```javascript
// storage.local (fast access for real-time control)
{
  "extensionState": {
    "activeTabs": [AudioTab, ...],
    "lastUpdate": timestamp,
    "version": "1.0.0",
    "isEnabled": true
  },
  "globalSettings": GlobalSettings
}

// storage.sync (cross-browser synchronization)
{
  "volumeSettings": {
    "youtube.com": VolumeSettings,
    "spotify.com": VolumeSettings,
    // ... other domains
  },
  "globalSettings": GlobalSettings // backup/sync copy
}
```

### Message Passing Schema
Communication between background script, popup, and content scripts:

```javascript
// Background → Popup
{
  "type": "TAB_AUDIO_UPDATE",
  "payload": {
    "tabId": number,
    "audioTab": AudioTab
  }
}

// Popup → Background
{
  "type": "SET_TAB_VOLUME",
  "payload": {
    "tabId": number,
    "volumeLevel": number
  }
}

// Background → Content Script
{
  "type": "APPLY_VOLUME",
  "payload": {
    "volumeLevel": number,
    "isMuted": boolean
  }
}

// Content Script → Background
{
  "type": "AUDIO_ELEMENTS_DETECTED",
  "payload": {
    "audioElements": array,
    "hasAudio": boolean
  }
}
```

## Entity Lifecycle

### AudioTab Lifecycle
1. **Creation**: Tab starts playing audio → `tabs.onUpdated` event → Create AudioTab entity
2. **Updates**: Volume changes → Update `volumeLevel` → Persist to storage
3. **Persistence**: Domain settings updated → Save to VolumeSettings
4. **Cleanup**: Audio stops → Mark inactive → Remove after delay (if autoCleanup enabled)
5. **Deletion**: Tab closed → Remove from activeTabs immediately

### VolumeSettings Lifecycle
1. **Creation**: First volume adjustment for domain → Create VolumeSettings entry
2. **Updates**: Volume changes → Update defaultVolume and lastUsed
3. **Sync**: Settings changes → Sync to storage.sync for cross-browser persistence
4. **Migration**: Extension updates → Validate schema, migrate if needed

## Data Migration Strategy

### Version 1.0.0 → 1.1.0 (Example)
```javascript
function migrateData(oldVersion, newVersion) {
  if (oldVersion === "1.0.0" && newVersion === "1.1.0") {
    // Add new fields with defaults
    globalSettings.maxVolumeLimit = globalSettings.maxVolumeLimit || 150;
    globalSettings.minVolumeStep = globalSettings.minVolumeStep || 5;
  }
  return updatedData;
}
```

## Performance Considerations

### Storage Optimization
- Use `storage.local` for frequently accessed data (active tabs)
- Use `storage.sync` for long-term persistence (domain settings)
- Batch storage operations to minimize API calls
- Clean up inactive tabs to prevent storage bloat

### Memory Management
- Limit `activeTabs` array size (max 50 tabs)
- Remove old `VolumeSettings` entries (cleanup after 30 days unused)
- Use efficient data structures for tab lookup (Map vs Array)

### Event Handling
- Debounce rapid volume changes (200ms delay)
- Throttle audio detection checks (500ms intervals)
- Clean up event listeners when tabs close

This data model supports all functional requirements from the specification:
- FR-001: AudioTab entity tracks audio detection
- FR-002-FR-005: ExtensionState and message passing enable UI control
- FR-006-FR-008: Event-driven updates handle tab state changes
- FR-009: isMuted field supports mute/unmute functionality
- FR-010-FR-011: Domain-based settings and UI data fields
- FR-012: Minimal data collection respects privacy requirements