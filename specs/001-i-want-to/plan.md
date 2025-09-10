# Implementation Plan: Firefox Tab Audio Volume Control Extension

**Branch**: `001-i-want-to` | **Date**: 2025-09-09 | **Spec**: [specs/001-initial-spec/spec.md](spec.md)  
**Input**: Feature specification from `/specs/001-initial-spec/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path ✓
   → Feature spec loaded successfully
2. Fill Technical Context (scan for NEEDS CLARIFICATION) ✓
   → Detect Project Type: Single project (Firefox browser extension)
   → Set Structure Decision: Option 1 (single project structure)
3. Evaluate Constitution Check section below ✓
   → Placeholder constitution template found (no violations to document)
   → Update Progress Tracking: Initial Constitution Check
4. Execute Phase 0 → research.md ✓
   → All technical unknowns researched and resolved
5. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md ✓
   → All Phase 1 deliverables created successfully
6. Re-evaluate Constitution Check section ✓
   → No violations from design decisions
   → Update Progress Tracking: Post-Design Constitution Check
7. Plan Phase 2 → Describe task generation approach ✓
8. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Firefox browser extension that provides individual volume control for tabs playing audio. Users can adjust volume levels (0-200%) and mute/unmute tabs independently through a popup interface. Extension detects audio activity automatically, persists settings across browser sessions, and works with any web-based audio source including YouTube. Built using Firefox WebExtensions API with minimal required permissions and TDD methodology.

## Technical Context
**Language/Version**: JavaScript ES6+ (WebExtensions API requirement)  
**Primary Dependencies**: Firefox WebExtensions APIs (tabs, storage, activeTab permissions)  
**Storage**: Browser storage.local (real-time access), storage.sync (cross-session persistence)  
**Testing**: Jest + web-ext (unit tests + browser extension testing)  
**Target Platform**: Firefox browser (WebExtensions compatible)  
**Project Type**: Single project - Firefox browser extension  
**Performance Goals**: <200ms volume change response, <50MB memory usage, 50+ tabs support  
**Constraints**: Firefox API limitations, minimum permissions principle, cross-origin restrictions  
**Scale/Scope**: Personal browser usage scale, multiple simultaneous audio tabs

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity**:
- Projects: 1 (extension only - within limit of 3)
- Using framework directly? (Yes - WebExtensions API directly, no wrapper classes)
- Single data model? (Yes - unified storage schema with AudioTab, VolumeSettings, ExtensionState)
- Avoiding patterns? (Yes - direct API usage, no Repository/UoW patterns)

**Architecture**:
- EVERY feature as library? (N/A - Browser extension architecture doesn't use libraries)
- Libraries listed: None (extension uses browser APIs directly)
- CLI per library: N/A (browser extension has popup UI instead)
- Library docs: N/A (documentation in quickstart.md format)

**Testing (NON-NEGOTIABLE)**:
- RED-GREEN-Refactor cycle enforced? (Yes - TDD workflow planned in Phase 2)
- Git commits show tests before implementation? (Will be enforced in Phase 3-4)
- Order: Contract→Integration→E2E→Unit strictly followed? (Yes - planned in task generation)
- Real dependencies used? (Yes - actual browser APIs, real audio sources for testing)
- Integration tests for: Extension message passing, storage persistence, audio control
- FORBIDDEN: Implementation before test, skipping RED phase (enforced in workflow)

**Observability**:
- Structured logging included? (Yes - browser console logging with structured data)
- Frontend logs → backend? (N/A - extension logs stay in browser dev tools)
- Error context sufficient? (Yes - error handling with context in message passing)

**Versioning**:
- Version number assigned? (Yes - 1.0.0 in manifest.json)
- BUILD increments on every change? (Will be enforced in development workflow)
- Breaking changes handled? (Data migration strategy defined in storage schema)

## Project Structure

### Documentation (this feature)
```
specs/001-i-want-to/
├── plan.md              # This file (/plan command output) ✓
├── research.md          # Phase 0 output (/plan command) ✓
├── data-model.md        # Phase 1 output (/plan command) ✓
├── quickstart.md        # Phase 1 output (/plan command) ✓
├── contracts/           # Phase 1 output (/plan command) ✓
│   ├── extension-api.json
│   ├── message-passing.json
│   └── storage-schema.json
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 1: Single project (SELECTED)
src/
├── manifest.json        # Extension manifest with permissions
├── background/          # Background script for tab monitoring
│   └── background.js
├── popup/              # User interface components
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── content/            # Content scripts for audio control
│   └── content-script.js
├── options/            # Settings page (optional)
│   ├── options.html
│   └── options.js
└── assets/             # Icons and static resources
    ├── icons/
    └── css/

tests/
├── contract/           # Contract validation tests
├── integration/        # Component integration tests
├── e2e/               # End-to-end browser tests
└── unit/              # Business logic unit tests

CLAUDE.md              # Agent context file ✓
```

**Structure Decision**: Option 1 selected - Single project structure appropriate for Firefox browser extension

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - ✅ Firefox WebExtensions API capabilities and limitations
   - ✅ Audio volume control mechanisms (Web Audio API + HTML5 Audio)
   - ✅ Cross-browser extension architecture patterns
   - ✅ UI/UX design patterns for browser extensions
   - ✅ Data storage and persistence strategies
   - ✅ Testing strategies for browser extensions

2. **Generate and dispatch research agents**:
   ```
   ✅ Research WebExtensions API for tab audio detection
   ✅ Find best practices for content script injection and audio control
   ✅ Evaluate storage options for cross-session persistence
   ✅ Analyze security implications of minimum permissions
   ✅ Review testing frameworks for browser extension development
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: WebExtensions API with content script injection
   - Rationale: Native Firefox support, security model compliance
   - Alternatives considered: Native messaging, system-level control (rejected)

**Output**: ✅ research.md with all technical decisions resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - ✅ AudioTab entity with tab identification and audio state
   - ✅ VolumeSettings entity for domain-specific persistence
   - ✅ ExtensionState entity for global state management
   - ✅ GlobalSettings entity for extension configuration

2. **Generate API contracts** from functional requirements:
   - ✅ Message passing schemas for background ↔ popup ↔ content communication
   - ✅ Storage schemas for browser storage.local and storage.sync
   - ✅ Data validation rules and constraints
   - ✅ Output to `/contracts/` directory with JSON schemas

3. **Generate contract tests** from contracts:
   - Contract test tasks will be generated in Phase 2
   - Tests will validate message schemas and storage operations
   - Tests must fail initially (no implementation yet)

4. **Extract test scenarios** from user stories:
   - ✅ Manual testing scenarios in quickstart.md
   - ✅ Automated test strategy defined
   - ✅ Performance validation criteria established

5. **Update agent file incrementally** (O(1) operation):
   - ✅ Created CLAUDE.md with current feature context
   - ✅ Added technical architecture and data model summary
   - ✅ Included recent changes and next phase requirements
   - ✅ Kept under 150 lines for token efficiency (91 lines)

**Output**: ✅ data-model.md, ✅ /contracts/*, contract tests (Phase 2), ✅ quickstart.md, ✅ CLAUDE.md

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `/templates/tasks-template.md` as base structure
- Generate contract test tasks from `/contracts/` schemas (8-10 tasks)
  - Message passing validation tests
  - Storage schema validation tests
  - Data model constraint tests
- Generate entity creation tasks from `data-model.md` (4-5 tasks)
  - AudioTab, VolumeSettings, ExtensionState, GlobalSettings models
- Generate integration test tasks from `quickstart.md` scenarios (5-6 tasks)
  - Background ↔ popup communication tests
  - Content script injection and audio control tests
  - Storage persistence across browser sessions tests
- Generate implementation tasks to make tests pass (10-12 tasks)
  - Background script for tab monitoring
  - Content script for audio element detection
  - Popup UI for volume controls
  - Storage management and persistence

**Ordering Strategy**:
- TDD order: Contract tests → Integration tests → Implementation tasks
- Dependency order: Data models → Background script → Content scripts → Popup UI
- Mark [P] for parallel execution opportunities:
  - Contract tests (independent validation)
  - CSS styling and asset creation
  - Unit tests for business logic
  - Documentation updates

**Task Categories Expected**:
1. **Contract Tests [P]** (8-10 tasks):
   - Validate message passing schemas
   - Test storage operation contracts
   - Verify data model constraints
2. **Model Creation [P]** (4-5 tasks):
   - Implement AudioTab entity
   - Implement VolumeSettings persistence
   - Implement ExtensionState management
   - Implement GlobalSettings configuration
3. **Background Script** (3-4 tasks):
   - Tab monitoring and audio detection
   - Message routing between components
   - Storage operations and persistence
4. **Content Script** (2-3 tasks):
   - Audio element detection and scanning
   - Volume application via Web Audio API
   - Error handling for injection failures
5. **Popup UI** (4-5 tasks):
   - Tab list display with audio indicators
   - Volume sliders and mute buttons
   - Settings interface and configuration
   - CSS styling and responsive design
6. **Integration Tests** (3-4 tasks):
   - End-to-end user scenarios
   - Cross-component communication validation
   - Settings persistence across sessions
7. **Build & Package [P]** (2-3 tasks):
   - Extension manifest configuration
   - Icon assets and branding
   - Extension packaging for Firefox

**Estimated Output**: 25-30 numbered, ordered tasks with clear dependencies and TDD progression

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |

No constitutional violations identified. Extension follows single project structure, uses APIs directly without wrapper patterns, enforces TDD methodology, and maintains simplicity appropriate for the feature scope.

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none required)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*