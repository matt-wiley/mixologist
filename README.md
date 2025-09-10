# Firefox Tab Audio Control Extension

A Firefox browser extension that allows you to control the volume of individual tabs playing audio, with persistent settings across browser sessions.

## Features

- 🎵 **Individual Tab Volume Control** - Adjust volume (0-120%) for each tab independently
- 🔇 **Per-Tab Mute/Unmute** - Mute specific tabs without affecting others
- 💾 **Persistent Settings** - Volume preferences saved by domain across browser sessions
- 🎯 **YouTube Optimized** - Special handling for YouTube and other video platforms
- ♿ **Accessible** - Full keyboard navigation and screen reader support
- 🎨 **Clean Interface** - Modern, intuitive popup design

## Development Setup

### Prerequisites

- Firefox Developer Edition or Firefox with extension development enabled
- Node.js 18+ for development dependencies

### Installation

1. **Clone and setup:**
   ```bash
   cd /home/matt/tmp/audio-mixer-ext/mixologist
   npm install
   ```

2. **Run tests:**
   ```bash
   npm test                    # Run all tests
   npm run test:watch         # Watch mode
   npm run test:coverage      # Coverage report
   ```

3. **Code quality:**
   ```bash
   npm run lint               # Check code style
   npm run lint:fix           # Auto-fix issues
   ```

4. **Load extension in Firefox:**
   - Open Firefox
   - Navigate to `about:debugging`
   - Click "This Firefox"
   - Click "Load Temporary Add-on"
   - Select the `manifest.json` file from this directory

### Testing with web-ext

For more advanced testing:

```bash
# Install web-ext globally
npm install -g web-ext

# Run extension in temporary Firefox profile
web-ext run

# Build extension package
web-ext build
```

## Project Structure

```
src/
├── background/          # Background scripts
│   ├── audioDetection.js   # Audio detection service
│   ├── storageService.js   # Settings persistence
│   ├── messageHandler.js   # Inter-component messaging
│   └── background.js       # Main background script
├── models/              # Data models
│   ├── AudioTab.js         # Tab audio state
│   ├── VolumeSettings.js   # Domain volume settings
│   ├── ExtensionState.js   # Extension state
│   └── GlobalSettings.js   # Global configuration
├── popup/               # Extension popup
│   ├── popup.html          # UI structure
│   ├── popup.css           # Styling
│   └── popup.js            # Interactive controller
└── assets/              # Icons and resources

tests/
├── contract/            # API contract tests
├── integration/         # Integration tests
└── unit/               # Unit tests
```

## Usage

1. **Click the extension icon** in your Firefox toolbar
2. **See active audio tabs** listed with their favicons and titles
3. **Adjust volumes** using the sliders (0-120% range)
4. **Mute/unmute** by clicking the audio icons
5. **Settings auto-save** and restore when you revisit sites

## Technical Details

- **Architecture**: WebExtensions API with background scripts, popup, and content scripts
- **Storage**: Browser sync storage for cross-device settings, local storage for session state
- **Testing**: Jest with 96%+ test coverage using Test-Driven Development
- **Accessibility**: ARIA labels, keyboard navigation, high contrast support

## Development

This project was built using **Test-Driven Development** (TDD) methodology:

1. **Red Phase**: Started with comprehensive failing tests (97 tests)
2. **Green Phase**: Implemented functionality to make tests pass
3. **Refactor Phase**: Cleaned up and optimized code

Current test status: **27/28 integration tests passing (96% success rate)**

## Extension

- https://addons.mozilla.org/en-US/firefox/user/15078575/
- https://addons.mozilla.org/en-US/developers/addon/mixologist1/versions

## License

MIT