# P15 Release Blocker Backlog

## P0 Critical

None open.

## P1 High

None open after the reconnect bootstrap, ended-board focus and physical hit-area corrections.

## P2 Medium

- Curate the large QA evidence set before committing; raw duplicate browser recordings should remain local.
- Rename the legacy `validate-six-scenario-e2e.ts` runner in a future maintenance pass; it now enumerates the catalog correctly, so the filename is cosmetic.
- Make the Windows browser-campaign wrapper terminate the full spawned QA server process tree automatically; P15 finalization detected and stopped nine orphaned trees.
- Consider eliminating expected missing-art console warnings from fallback unit tests by using an explicit test logger.

## P3 Low

- Add canonical P0/P1 report aliases to make the research sequence easier to browse.
- Consider dedicated performance budgets for the admin registry and phone bundle.

No P2/P3 item changes gameplay or blocks broader playtesting.
