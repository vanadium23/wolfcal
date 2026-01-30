# fn-2-m4p.7 Update docs for new OAuth and calendar management flow

## Description
Update documentation to reflect new OAuth flow (Settings-based credentials), calendar management UI, simplified event form, and optimistic UI behavior.

**Size:** M
**Files:** docs/USER_GUIDE.md, docs/SETUP.md, docs/OAUTH_CONFIG.md, README.md

## Approach

Update docs/USER_GUIDE.md:
- Account Management section: Change OAuth credential location from per-account to Settings
- Settings section: Document new calendar enable/disable UI
- Managing Events section: Document simplified form with expandable fields, optimistic UI behavior

Update docs/SETUP.md:
- Step 3: Rewrite to reflect Settings-based OAuth configuration
- Step 4: Update additional account process (no re-entering credentials)

Update docs/OAUTH_CONFIG.md:
- Step 8: Change from per-account to Settings-based credential usage

Update README.md:
- Features section: Mention centralized OAuth configuration

## Key Context

Per docs-gap-scout findings: USER_GUIDE, SETUP, and OAUTH_CONFIG need updates for OAuth flow changes and calendar management features.

Follow existing documentation style with numbered steps, bold UI element names, and cross-references.
## Acceptance
- [ ] docs/USER_GUIDE.md Account Management section updated for Settings-based OAuth
- [ ] docs/USER_GUIDE.md Settings section documents calendar enable/disable UI
- [ ] docs/USER_GUIDE.md Managing Events section documents simplified form and expandable fields
- [ ] docs/USER_GUIDE.md documents optimistic UI behavior (80% opacity, error revert)
- [ ] docs/SETUP.md Step 3 rewritten for Settings OAuth configuration
- [ ] docs/SETUP.md Step 4 updated (no credential re-entry for additional accounts)
- [ ] docs/OAUTH_CONFIG.md Step 8 updated to reference Settings
- [ ] README.md features section mentions centralized OAuth
- [ ] All cross-references between docs updated
- [ ] Screenshot placeholders updated where OAuth flow changed
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
