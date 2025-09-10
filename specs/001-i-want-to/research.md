# Technical Research: Firefox Tab Audio Volume Control Extension

**Research Date**: 2025-09-09  
**Feature**: Tab-specific audio volume control for Firefox browser extension

## Research Tasks Completed

### 1. Firefox WebExtensions API Capabilities

**Decision**: Use Firefox WebExtensions API with tabs, storage, and activeTab permissions  
**Rationale**: 
- Native Firefox APIs provide the necessary tab detection and audio state monitoring
- WebExtensions APIs are stable, well-documented, and secure
- Minimal permission model aligns with security requirements

**Key Findings**:
- `tabs.query()` with `audible: true` can detect tabs playing audio
- `tabs.onUpdated` listener can track audio state changes
- `tabs.executeScript()` can inject content scripts for audio control
- `storage.local` and `storage.sync` provide persistent settings storage

**Alternatives Considered**:
- Native messaging with external application: Rejected due to complexity and security concerns
- Direct DOM audio manipulation: Limited by cross-origin restrictions

### 2. Audio Volume Control Mechanisms

**Decision**: Content script injection with Web Audio API fallback to HTML5 Audio controls  
**Rationale**:
- Content scripts can access page audio elements directly
- Web Audio API provides granular volume control when available
- HTML5 audio/video elements have direct volume properties
- Works across different audio sources (YouTube, streaming sites, etc.)

**Implementation Approach**:
- Inject content scripts into tabs with active audio
- Scan for audio/video elements and Web Audio contexts
- Apply volume scaling through gainNode or element.volume
- Store volume settings keyed by tab ID and domain

**Alternatives Considered**:
- System-level audio control: Requires native messaging, security concerns
- Firefox's native tab audio controls: Limited API access, no granular control

### 3. Cross-Browser Extension Architecture

**Decision**: Firefox-first implementation with WebExtensions standard patterns  
**Rationale**:
- Focus on Firefox as primary target per requirements
- Use standard WebExtensions patterns for potential Chrome compatibility later
- Manifest v2 for Firefox (v3 compatibility can be added later)

**Architecture Components**:
- Background script: Tab monitoring, audio state tracking
- Popup interface: User controls, volume sliders
- Content scripts: Audio manipulation, volume application
- Storage layer: Settings persistence across sessions

### 4. UI/UX Design Patterns

**Decision**: Browser action popup with tab list and individual volume controls  
**Rationale**:
- Familiar browser extension pattern
- Minimal screen real estate usage
- Direct access from toolbar
- Clear visual feedback for audio states

**UI Components Required**:
- Tab favicon and title display
- Audio activity indicator (playing/muted states)
- Volume slider per tab (0-200% range for flexibility)
- Mute/unmute toggle button
- Auto-refresh when audio states change

**Alternatives Considered**:
- Sidebar panel: More space but requires additional permissions
- Context menu integration: Less discoverable for primary use case
- Overlay interface: Intrusive to user browsing experience

### 5. Data Storage and Persistence Strategy

**Decision**: Firefox storage.local for tab-specific settings with storage.sync backup  
**Rationale**:
- storage.local provides fast access for real-time audio control
- storage.sync enables settings synchronization across Firefox instances
- Keying by domain allows persistent preferences per site
- Fallback to default volume levels for new tabs/domains

**Storage Schema**:
```javascript
{
  "volumeSettings": {
    "youtube.com": { "volume": 75, "muted": false },
    "spotify.com": { "volume": 90, "muted": false }
  },
  "globalSettings": {
    "defaultVolume": 100,
    "showInactiveAudio": false,
    "autoCleanup": true
  }
}
```

### 6. Testing Strategy for Browser Extensions

**Decision**: Combination of unit tests, integration tests, and manual browser testing  
**Rationale**:
- Browser extension testing requires real browser environment
- WebExtensions API mocking for unit tests
- End-to-end testing with actual audio sources for integration
- Manual testing across different websites for compatibility

**Testing Approach**:
- Jest/Mocha for business logic unit tests
- web-ext for Firefox extension testing
- Selenium WebDriver for automated browser testing
- Manual testing checklist for audio sources (YouTube, Twitch, Spotify, etc.)

**Test Scenarios**:
- Tab audio detection accuracy
- Volume control responsiveness
- Settings persistence across browser restarts
- Multiple simultaneous audio sources
- Tab switching and closing behaviors

## Technology Stack Summary

| Component | Technology | Justification |
|-----------|------------|---------------|
| Extension Framework | Firefox WebExtensions | Native Firefox support, security model |
| Language | JavaScript ES6+ | Web standard, WebExtensions requirement |
| Audio Control | Web Audio API + HTML5 | Direct audio manipulation, broad compatibility |
| Storage | Firefox storage API | Built-in persistence, sync capability |
| UI Framework | Vanilla JavaScript | Minimal dependencies, fast loading |
| Testing | Jest + web-ext | Unit testing + browser extension testing |
| Build System | webpack/rollup | Code bundling, manifest generation |

## Risk Assessment and Mitigation

### Technical Risks
1. **Cross-origin restrictions**: Content script injection may be blocked
   - Mitigation: Use activeTab permission, handle injection failures gracefully
2. **Audio source detection**: Some audio sources may be undetectable
   - Mitigation: Multiple detection methods, fallback strategies
3. **Performance impact**: Audio monitoring might affect browser performance
   - Mitigation: Efficient event handling, cleanup of inactive listeners

### User Experience Risks
1. **Permission concerns**: Users may be wary of tab access permissions
   - Mitigation: Clear explanation of minimum permissions needed
2. **Compatibility issues**: Some websites may break with volume control
   - Mitigation: Domain-specific disable options, graceful error handling

## Next Phase Requirements

Based on this research, Phase 1 design should include:
- Data model for tab audio states and volume settings
- API contracts for background-popup-content script communication
- Integration test scenarios for major audio sources
- Error handling strategies for permission/injection failures