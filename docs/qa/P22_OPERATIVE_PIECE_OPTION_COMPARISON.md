# P22 Operative Piece Option Comparison

## Decision

**Selected: Option A — Heraldic Reliquary**

Both variants passed the 66-frame geometry matrix at all three TV resolutions. Option A is the production default because its topper/body/base silhouette reads immediately as a custom Ashenreach chess piece, its active rise and ring are clearer in motion, and its heavier form better matches Signal Theatre. Option B remains useful as a development comparison but is not exposed in normal UI.

## Weighted browser review

| Criterion | Weight | Option A | Option B |
|---|---:|---:|---:|
| Player and operative identity | 25 | 23 | 24 |
| Active-player clarity | 20 | 20 | 18 |
| Six-player formation | 20 | 18 | 19 |
| Board/environment obstruction | 15 | 12 | 14 |
| Movement silhouette | 10 | 10 | 7 |
| Grimdark Ashenreach atmosphere | 10 | 10 | 8 |
| **Total** | **100** | **93** | **90** |

## Findings

### Option A — Heraldic Reliquary

- Strongest chess-piece silhouette and topper recognition.
- Best active-piece hierarchy and directional movement read.
- Heavier grimdark/industrial presence.
- Portrait is smaller in dense formations.
- Occupies slightly more vertical space, mitigated by the widened four-piece layout and bounded six-piece formation.

### Option B — Operative Bust

- Largest portrait and least environment obstruction.
- Slightly cleaner in six-piece density.
- Weaker chess-piece silhouette.
- Topper and body differences recede at room scale.
- Active movement reads more like a portrait token than a reliquary piece.

## Evidence

- `reports/ui/p22-operative-pieces/screenshots/20-option-a-<resolution>.png`
- `reports/ui/p22-operative-pieces/screenshots/21-option-b-<resolution>.png`
- `reports/ui/p22-operative-pieces/screenshots/22-selected-production-<resolution>.png`
- `reports/ui/p22-operative-pieces/p22-browser-metrics.json`

The comparison is browser evidence only; physical-room TV testing was skipped by request.
