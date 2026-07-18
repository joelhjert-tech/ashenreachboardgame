# Cross-Ring Hazard Lock Repair

The seven canonical Outer↔Middle pairs remain unchanged and reciprocal:

- `glassmere-spindle` ↔ `black-relay-spire`
- `outer_ember_sanctum` ↔ `middle_red_march_outpost`
- `mirecoil-beacon` ↔ `middle_webglass_breach`
- `outer_oathpost` ↔ `the-salt-archive`
- `votive-engine-room` ↔ `weeping-ammunition-shrine`
- `kettleward-foundry` ↔ `middle_shard_sprawl`
- `transit-gate` ↔ `middle_guardian_span`

Every directed edge still costs exactly one, requires exact movement one, and ends movement. Movement therefore resolves before `sector` arrival creates a recurring challenge or Threat.

The lock was at the post-challenge Contract handoff: the tile challenge could finish and archive its mission while the phone inferred a replacement picker from the catalog, leaving no authoritative owner for continuation. Tile-challenge cleanup remains first; the server now records a single pending mission continuation, waits for the owner’s validated selection, then resumes the stored `broadcast` continuation exactly once. Empty assistance/item windows do not add a second continuation owner.

Topology, route legality, success/failure effects, and save version remain unchanged. Representative cross-ring QA is under `reports/live-play-ui-repair-qa/cross-ring-route-*.png`; all canonical directed transitions remain covered by the topology planner test.
