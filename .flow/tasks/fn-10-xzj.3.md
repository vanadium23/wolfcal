# fn-10-xzj.3 Update importConfig() replace mode to create accounts with empty tokens

## Description
TBD

## Acceptance
- [ ] TBD

## Done summary
Updated importConfig() replace mode to handle both version 1 (with tokens) and version 2 (without tokens). Version 2 accounts get empty tokens and tokenExpiry=0 to force re-auth.
## Evidence
- Commits:
- Tests:
- PRs: