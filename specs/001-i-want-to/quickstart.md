# Quickstart Guide: Firefox Tab Audio Volume Control Extension

**Feature**: Tab-specific audio volume control for Firefox  
**Date**: 2025-09-09  
**Prerequisites**: Firefox browser, basic web development setup

## Development Setup

### 1. Environment Preparation
```bash
# Clone repository and navigate to extension directory
cd /home/matt/tmp/audio-mixer-ext/mixologist

# Install development dependencies (if using build tools)
npm install --dev

# Verify Firefox Developer Edition or Firefox with extension development enabled
firefox --version
```

### 2. Extension Structure Setup
```bash
# Create extension source structure
mkdir -p src/{background,popup,content,options}
mkdir -p src/assets/{icons,css}
mkdir -p tests/{unit,integration,e2e}

# Create key files
touch src/manifest.json
touch src/background/background.js
touch src/popup/{popup.html,popup.js,popup.css}
touch src/content/content-script.js
```

### 3. Basic Manifest Configuration
Create `src/manifest.json` with minimum required permissions:
```json
{
  "manifest_version": 2,
  "name": "Tab Audio Volume Control",
  "version": "1.0.0",
  "description": "Control volume of individual Firefox tabs",
  
  "permissions": [
    "tabs",
    "storage",
    "activeTab"
  ],
  
  "background": {
    "scripts": ["background/background.js"],
    "persistent": false
  },
  
  "browser_action": {
    "default_popup": "popup/popup.html",
    "default_icon": "assets/icons/icon-32.png"
  },
  
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content/content-script.js"],
    "run_at": "document_idle"
  }]
}
```

## Testing Scenarios

### Manual Testing Checklist

#### 1. Audio Detection Test
**Objective**: Verify extension detects tabs playing audio
**Steps**:
1. Open Firefox and load the extension (`about:debugging` → Load Temporary Add-on)
2. Open YouTube video in tab 1, start playing
3. Open Spotify web player in tab 2, start playing music
4. Click extension icon in toolbar
5. **Expected**: Both tabs should appear in popup list with audio indicators

**Validation**:
- [ ] YouTube tab appears with correct title and favicon
- [ ] Spotify tab appears with correct title and favicon  
- [ ] Audio activity indicators show "playing" state
- [ ] Volume sliders appear at default level (100%)

#### 2. Volume Control Test
**Objective**: Verify individual tab volume adjustment
**Steps**:
1. Complete Audio Detection Test setup
2. In extension popup, move YouTube tab volume slider to 50%
3. Move Spotify tab volume slider to 150%
4. **Expected**: YouTube volume decreases, Spotify increases (louder than original)

**Validation**:
- [ ] YouTube audio volume reduces immediately
- [ ] Spotify audio volume increases immediately
- [ ] Other tabs unaffected by volume changes
- [ ] Volume levels persist when popup closed/reopened

#### 3. Mute/Unmute Test
**Objective**: Verify mute functionality per tab
**Steps**:
1. Continue from Volume Control Test
2. Click mute button for YouTube tab
3. Click mute button for Spotify tab
4. **Expected**: Each tab mutes independently

**Validation**:
- [ ] YouTube tab audio stops when muted
- [ ] Spotify tab audio stops when muted
- [ ] Mute indicators appear (visual feedback)
- [ ] Unmuting restores previous volume levels
- [ ] Firefox native mute state not affected

#### 4. Tab State Changes Test
**Objective**: Verify handling of dynamic tab changes
**Steps**:
1. Open extension popup with active audio tabs
2. Pause audio in one tab
3. Close one tab playing audio
4. Open new tab and start audio
5. Refresh extension popup
6. **Expected**: List updates reflect current audio state

**Validation**:
- [ ] Paused tabs removed from list (if autoCleanup enabled)
- [ ] Closed tabs immediately removed from list
- [ ] New audio tabs appear in list
- [ ] No phantom/stale entries remain

#### 5. Settings Persistence Test
**Objective**: Verify volume settings persist across browser sessions
**Steps**:
1. Set custom volume levels for different domains (YouTube: 75%, Spotify: 125%)
2. Close Firefox completely
3. Restart Firefox
4. Navigate to same domains and start audio
5. Open extension popup
6. **Expected**: Volume levels restored from previous session

**Validation**:
- [ ] Domain-specific volumes restored correctly
- [ ] Mute states restored if previously set
- [ ] New tabs on same domain use saved defaults
- [ ] Settings sync across Firefox instances (if enabled)

### Automated Test Setup

#### Unit Tests
```bash
# Run unit tests for business logic
npm test

# Coverage report
npm run test:coverage
```

**Key test files to create**:
- `tests/unit/audio-tab.test.js` - AudioTab entity validation
- `tests/unit/volume-settings.test.js` - VolumeSettings persistence
- `tests/unit/message-passing.test.js` - Inter-component communication

#### Integration Tests  
```bash
# Run browser extension integration tests
npm run test:integration

# Test with real Firefox instance
web-ext run --source-dir=src
```

**Integration scenarios**:
- Background script ↔ Storage API
- Popup ↔ Background script communication
- Content script injection and audio detection
- Cross-component message passing validation

#### End-to-End Tests
```bash
# Run full browser automation tests
npm run test:e2e
```

**E2E scenarios**:
- Complete user workflows from installation to volume control
- Multi-tab audio scenarios with popular websites
- Settings persistence across browser restarts
- Error handling for permission failures

## Performance Validation

### Load Testing
1. Open 20+ tabs with various audio sources
2. Monitor extension performance impact:
   - Memory usage (`about:memory`)
   - CPU usage (browser task manager)
   - Response time of volume adjustments

**Acceptance Criteria**:
- [ ] Memory usage < 50MB for extension
- [ ] Volume changes apply within 200ms
- [ ] No browser lag during tab switching
- [ ] Graceful handling of 50+ tabs

### Audio Quality Testing
1. Play high-quality audio (lossless/320kbps)
2. Test volume range 0-200%
3. Validate audio integrity at all volume levels

**Validation**:
- [ ] No audio distortion at high volumes (150-200%)
- [ ] Smooth volume transitions (no clicks/pops)
- [ ] Accurate volume level representation
- [ ] No impact on audio latency

## Common Issues & Troubleshooting

### Extension Not Loading
**Symptoms**: Extension icon missing, no popup
**Solution**: Check `about:debugging` for load errors, validate manifest.json

### Audio Not Detected
**Symptoms**: Tabs playing audio don't appear in extension
**Solution**: Verify content script injection, check browser console for errors

### Volume Control Not Working
**Symptoms**: Sliders move but no audio change
**Solution**: Check content script permissions, verify audio element detection

### Settings Not Persisting
**Symptoms**: Volume levels reset after browser restart
**Solution**: Verify storage permissions, check storage API calls

## Development Workflow

### 1. TDD Development Cycle
```bash
# Write failing test first
npm run test:watch

# Implement minimal code to pass test
# Refactor while maintaining test passes
```

### 2. Extension Development Cycle
```bash
# Make code changes
# Reload extension in Firefox
web-ext reload --source-dir=src

# Test manually
# Check browser console for errors
```

### 3. Release Preparation
```bash
# Run full test suite
npm run test:all

# Build optimized extension
npm run build

# Package for Firefox Add-ons
web-ext build --source-dir=dist
```

## Success Criteria

This quickstart validates the following functional requirements:
- ✅ **FR-001**: Extension detects all tabs with active audio
- ✅ **FR-002**: Popup displays list of audio-playing tabs
- ✅ **FR-003**: Independent volume control per tab
- ✅ **FR-004**: Tab title/URL and volume level display
- ✅ **FR-005**: Immediate volume change response
- ✅ **FR-006**: Dynamic tab list updates
- ✅ **FR-007**: Settings persistence across sessions
- ✅ **FR-008**: Handle audio start/stop state changes
- ✅ **FR-009**: Mute/unmute functionality per tab
- ✅ **FR-010**: Works with YouTube and other audio sources
- ✅ **FR-011**: Shows favicon, title, audio icon, volume controls
- ✅ **FR-012**: Uses minimum required permissions

**Ready for Phase 2 when**:
- All manual testing scenarios pass
- Unit test coverage > 80%
- Integration tests validate all message passing contracts
- Performance meets acceptance criteria
- Extension loads successfully in Firefox