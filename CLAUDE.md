# Firefox Tab Audio Volume Control Extension - Claude Context

## Project Overview
**Type**: Firefox Browser Extension (WebExtensions API)  
**Goal**: Individual tab audio volume control with persistent settings  
**Language**: JavaScript ES6+  
**Target**: Firefox browser with minimum required permissions

## Current Feature Implementation
**Branch**: `001-i-want-to`  
**Status**: Planning Phase (Phase 1 Complete)  
**Spec Location**: `/specs/001-i-want-to/`

### Core Requirements
- Detect tabs playing audio (FR-001)
- Display audio tabs in popup interface (FR-002)  
- Independent volume control per tab 0-200% (FR-003)
- Mute/unmute functionality per tab (FR-009)
- Settings persistence across browser sessions (FR-007)
- Works with YouTube and other web audio sources (FR-010)
- Minimum permissions principle (FR-012)

## Technical Architecture

### Components
- **Background Script**: Tab monitoring, audio state tracking, storage management
- **Popup Interface**: User controls, volume sliders, tab list display
- **Content Scripts**: Audio element detection, volume application, Web Audio API
- **Storage Layer**: Browser storage.local (fast access), storage.sync (persistence)

### Key Technologies  
- Firefox WebExtensions APIs: tabs, storage, activeTab permissions
- Web Audio API + HTML5 audio/video element control
- Message passing between extension components
- Browser storage for cross-session persistence

### Data Model
- **AudioTab**: Tab ID, title, URL, domain, volume level, mute state, audio activity
- **VolumeSettings**: Domain-specific default volumes and preferences  
- **GlobalSettings**: Extension-wide configuration and behavior
- **ExtensionState**: Current monitored tabs and extension status

## Project Structure
```
specs/001-i-want-to/
├── research.md          # Technical research and decisions
├── data-model.md        # Entity definitions and storage schema  
├── contracts/           # API contracts and message schemas
├── quickstart.md        # Development and testing guide
└── plan.md             # This implementation plan

src/ (to be created in Phase 2)
├── manifest.json        # Extension manifest with permissions
├── background/          # Background script for tab monitoring
├── popup/              # User interface (HTML, CSS, JS)
├── content/            # Content scripts for audio control
└── assets/             # Icons and static resources
```

## Development Guidelines

### Testing Strategy (TDD Required)
1. **Contract Tests**: Message passing schemas, data validation
2. **Integration Tests**: Background ↔ popup ↔ content script communication
3. **E2E Tests**: Real browser testing with audio sources (YouTube, etc.)
4. **Unit Tests**: Business logic, data transformations, storage operations

### Performance Requirements
- Volume changes apply within 200ms
- Extension memory usage < 50MB  
- Support up to 50 concurrent audio tabs
- No browser lag during tab switching

### Security & Privacy
- Request only essential permissions: tabs, storage, activeTab
- No external network requests
- Domain-based settings only (no personal data collection)
- Content script injection only for tabs with audio

## Recent Changes (Last 3)
1. **2025-09-09**: Completed Phase 1 planning
   - Created technical research with WebExtensions API analysis
   - Designed data model for AudioTab, VolumeSettings, ExtensionState
   - Generated API contracts for message passing and storage schemas

2. **2025-09-09**: Initial feature specification  
   - Defined functional requirements FR-001 through FR-012
   - Established user scenarios and acceptance criteria
   - Identified key entities and constraints

3. **2025-09-09**: Project initialization
   - Set up specification structure in /specs/001-i-want-to/
   - Created plan template execution workflow

## Next Phase: Task Generation (/tasks command)
- Generate detailed implementation tasks from contracts and data model
- Create TDD task sequence: contract tests → integration tests → implementation
- Establish task dependencies and parallel execution opportunities  
- Target: ~25-30 numbered tasks for complete extension implementation

## AI Assistant Context Notes
- Focus on Firefox WebExtensions API patterns and best practices
- Prioritize security and minimal permissions approach  
- Emphasize TDD workflow with failing tests before implementation
- Consider cross-browser compatibility for future Chrome support
- Pay attention to audio quality and performance impact
- Reference contracts/ for exact API schemas and data structures

**Total Lines**: 91/150 (efficient token usage maintained)