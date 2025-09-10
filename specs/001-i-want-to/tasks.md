# Tasks: Firefox Tab Audio Volume Control Extension

**Input**: Design documents from `/specs/001-i-want-to/`
**Prerequisites**: plan.md (✓), research.md (✓), data-model.md (✓), contracts/ (✓)

## Execution Flow (main)
```
1. Load plan.md from feature directory ✓
   → Tech stack: JavaScript ES6+, WebExtensions API, Jest testing
   → Structure: Single project (src/, tests/)
2. Load optional design documents: ✓
   → data-model.md: 4 entities → model tasks
   → contracts/: 3 files → contract test tasks
   → research.md: WebExtensions decisions → setup tasks
3. Generate tasks by category: ✓
   → Setup: extension structure, dependencies, manifest
   → Tests: contract tests, integration tests
   → Core: models, background script, popup, content scripts
   → Integration: message passing, storage, audio control
   → Polish: unit tests, performance, packaging
4. Apply task rules: ✓
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...) ✓
6. Generate dependency graph ✓
7. Create parallel execution examples ✓
8. Validate task completeness: ✓
   → All contracts have tests ✓
   → All entities have models ✓
   → All user scenarios covered ✓
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Single project**: `src/`, `tests/` at repository root
- Extension structure: `src/{background,popup,content,models}/`

## Phase 3.1: Setup
- [ ] T001 Create Firefox extension directory structure (src/background/, src/popup/, src/content/, src/models/, src/assets/)
- [ ] T002 Initialize package.json with Jest and web-ext development dependencies
- [ ] T003 [P] Create manifest.json with required permissions and extension metadata
- [ ] T004 [P] Configure ESLint for WebExtensions API and modern JavaScript

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [ ] T005 [P] Contract test for extension API schema in tests/contract/test_extension_api.js
- [ ] T006 [P] Contract test for message passing schema in tests/contract/test_message_passing.js
- [ ] T007 [P] Contract test for storage schema in tests/contract/test_storage_schema.js
- [ ] T008 [P] Integration test for tab audio detection in tests/integration/test_audio_detection.js
- [ ] T009 [P] Integration test for volume control in tests/integration/test_volume_control.js
- [ ] T010 [P] Integration test for settings persistence in tests/integration/test_persistence.js
- [ ] T011 [P] Integration test for popup interface in tests/integration/test_popup_interface.js

## Phase 3.3: Core Implementation (ONLY after tests are failing)
- [ ] T012 [P] AudioTab model class in src/models/AudioTab.js
- [ ] T013 [P] VolumeSettings model class in src/models/VolumeSettings.js
- [ ] T014 [P] ExtensionState model class in src/models/ExtensionState.js
- [ ] T015 [P] GlobalSettings model class in src/models/GlobalSettings.js
- [ ] T016 Background script audio detection service in src/background/audioDetection.js
- [ ] T017 Background script storage service in src/background/storageService.js
- [ ] T018 Background script message handler in src/background/messageHandler.js
- [ ] T019 Main background script initialization in src/background/background.js
- [ ] T020 [P] Popup HTML structure in src/popup/popup.html
- [ ] T021 [P] Popup CSS styling in src/popup/popup.css
- [ ] T022 Popup JavaScript controller in src/popup/popup.js
- [ ] T023 Content script audio element detector in src/content/audioElementDetector.js
- [ ] T024 Content script volume controller in src/content/volumeController.js
- [ ] T025 Main content script in src/content/content.js

## Phase 3.4: Integration
- [ ] T026 Message passing between background and popup scripts
- [ ] T027 Message passing between background and content scripts
- [ ] T028 Storage synchronization for cross-session persistence
- [ ] T029 Tab event listeners for audio state changes
- [ ] T030 Permission handling and error management
- [ ] T031 Audio element volume manipulation implementation

## Phase 3.5: Polish
- [ ] T032 [P] Unit tests for AudioTab model in tests/unit/test_AudioTab.js
- [ ] T033 [P] Unit tests for VolumeSettings model in tests/unit/test_VolumeSettings.js
- [ ] T034 [P] Unit tests for storage service in tests/unit/test_storageService.js
- [ ] T035 [P] Unit tests for audio detection in tests/unit/test_audioDetection.js
- [ ] T036 Performance optimization for 50+ tabs (<50MB memory usage)
- [ ] T037 [P] Extension icons and assets in src/assets/icons/
- [ ] T038 [P] Build script for extension packaging
- [ ] T039 Manual testing with YouTube and other audio sources
- [ ] T040 Code cleanup and documentation

## Dependencies
- Setup (T001-T004) before everything else
- Tests (T005-T011) before implementation (T012-T031)
- Models (T012-T015) before services (T016-T019)
- Background scripts (T016-T019) before popup/content (T020-T025)
- Core implementation before integration (T026-T031)
- Integration before polish (T032-T040)

## Parallel Example
```bash
# Launch T005-T007 contract tests together:
Task: "Contract test for extension API schema in tests/contract/test_extension_api.js"
Task: "Contract test for message passing schema in tests/contract/test_message_passing.js"
Task: "Contract test for storage schema in tests/contract/test_storage_schema.js"

# Launch T012-T015 model creation together:
Task: "AudioTab model class in src/models/AudioTab.js"
Task: "VolumeSettings model class in src/models/VolumeSettings.js"
Task: "ExtensionState model class in src/models/ExtensionState.js"
Task: "GlobalSettings model class in src/models/GlobalSettings.js"

# Launch T032-T035 unit tests together:
Task: "Unit tests for AudioTab model in tests/unit/test_AudioTab.js"
Task: "Unit tests for VolumeSettings model in tests/unit/test_VolumeSettings.js"
Task: "Unit tests for storage service in tests/unit/test_storageService.js"
Task: "Unit tests for audio detection in tests/unit/test_audioDetection.js"
```

## Notes
- [P] tasks = different files, no dependencies
- Verify tests fail before implementing
- Commit after each task
- Use web-ext for extension testing
- Test with Firefox Developer Edition

## Task Generation Rules
*Applied during main() execution*

1. **From Contracts**:
   - extension-api.json → T005 contract test
   - message-passing.json → T006 contract test
   - storage-schema.json → T007 contract test
   
2. **From Data Model**:
   - AudioTab entity → T012 model task
   - VolumeSettings entity → T013 model task
   - ExtensionState entity → T014 model task
   - GlobalSettings entity → T015 model task
   
3. **From User Stories**:
   - Tab audio detection → T008 integration test
   - Volume control → T009 integration test
   - Settings persistence → T010 integration test
   - Popup interface → T011 integration test

4. **Ordering**:
   - Setup → Tests → Models → Services → UI → Integration → Polish
   - WebExtensions dependencies: manifest → background → content/popup

## Validation Checklist
*GATE: Checked by main() before returning*

- [✓] All contracts have corresponding tests (T005-T007)
- [✓] All entities have model tasks (T012-T015)
- [✓] All tests come before implementation (T005-T011 before T012+)
- [✓] Parallel tasks truly independent ([P] tasks use different files)
- [✓] Each task specifies exact file path
- [✓] No task modifies same file as another [P] task