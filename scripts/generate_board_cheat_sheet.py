#!/usr/bin/env python3
"""Generate a polished, multi-page canonical Ashen Reach board reference.

The generator reads the canonical TypeScript board, board-text effects, tile
function registry, and recurring challenge content through
``export-board-reference-data.ts``. Edit those authoritative sources instead
of maintaining a second copy of the tile rules in this document script.

Usage:
    python -m pip install reportlab
    python scripts/generate_board_cheat_sheet.py
    python scripts/generate_board_cheat_sheet.py --output output/pdf/my-sheet.pdf
"""

from __future__ import annotations

import argparse
import html
import json
import os
import subprocess
from pathlib import Path
from typing import Any, Iterable, Sequence

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.platypus import (
    Flowable,
    HRFlowable,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


# ---------------------------------------------------------------------------
# Editable document metadata and sample rules
# ---------------------------------------------------------------------------

DOCUMENT: dict[str, Any] = {
    "title": "ASHEN REACH",
    "subtitle": "Complete Canonical Board Reference",
    "edition": "Board Reference 2.0",
    "map_label": "NESTED BOARD MAP",
    "footer": "Generated from the canonical Ashen Reach board and tile-function registries",
}


TURN_SEQUENCE: list[tuple[str, str]] = [
    ("1. START", "Resolve mandatory scenario, operative, and lasting-effect hooks."),
    ("2. NAVIGATION", "Roll movement, inspect legal destinations, preview, then confirm one route."),
    ("3. SECTOR", "Read the arrival brief, resolve recurring challenges, then resolve Threat flow."),
    ("4. ACTION", "Use an available sector, shop, contract, stabilization, or confrontation action."),
    ("5. RESOLUTION", "Roll, apply displayed modifiers, resolve reactions, then apply the outcome."),
    ("6. BROADCAST", "Finalize public state, clean up pending effects, and pass to the next seat."),
]


LANE_KEY: list[dict[str, str]] = [
    {
        "name": "BLUE LANE",
        "accent": "#3A79C9",
        "summary": "Signal pressure, anomalies, perception, and route interference.",
        "requirement": "Each printed Blue icon adds one Blue Threat draw on arrival.",
    },
    {
        "name": "YELLOW LANE",
        "accent": "#D7A92B",
        "summary": "Guile pressure, salvage, bargains, and conditional opportunity.",
        "requirement": "Each printed Yellow icon adds one Yellow Threat draw on arrival.",
    },
    {
        "name": "RED LANE",
        "accent": "#B9483F",
        "summary": "Grit pressure, direct conflict, hazards, and physical attrition.",
        "requirement": "Each printed Red icon adds one Red Threat draw on arrival.",
    },
]


MOVEMENT_RULES: list[tuple[str, str]] = [
    (
        "Outside the Inner Tier",
        "Roll movement. Choose only a server-provided destination at the exact accepted distance.",
    ),
    (
        "Tier Transition",
        "At an authored transition, cross one canonical edge without a die. Movement ends immediately.",
    ),
    (
        "Inner Tier",
        "Do not roll movement. Move one connected step after clearing the current fixed challenge.",
    ),
]


# Schema used by every space:
# {
#   "name": str,
#   "lane": "Blue" | "Yellow" | "Red" | "Neutral",
#   "movement": str,
#   "mode": str,
#   "actions": [{"label": str, "text": str}, ...],
#   "roll_table": [("1-2", "Result"), ...],       # optional
#   "requirements": [str, ...],                   # optional
#   "rewards": [str, ...],                        # optional
#   "penalties": [str, ...],                      # optional
#   "note": str,                                  # optional
# }

TIERS: list[dict[str, Any]] = [
    {
        "title": "OUTER TIER SPACES",
        "kicker": "Open Routes",
        "accent": "#B85B43",
        "summary": (
            "Broad movement, service access, and low-to-moderate difficulty. "
            "Resolve the arrival queue before using optional sector text."
        ),
        "movement_note": (
            "Movement: roll, then select an exact-distance legal route. "
            "Printed lane icons draw from their shared global bags."
        ),
        "overview_movement": "Roll; move the exact accepted distance.",
        "overview_focus": "Open services; clear the arrival queue first.",
        "spaces": [
            {
                "name": "Ashwake Depot",
                "lane": "Yellow",
                "movement": "Exact-distance route",
                "mode": "Choose One or End Engagement Phase",
                "actions": [
                    {
                        "label": "Power Up",
                        "text": "Pay 1 Salvage to gain +1 Forge on your next test this turn.",
                    },
                    {
                        "label": "Strip the Lockers",
                        "text": "Roll on the depot table below.",
                    },
                ],
                "roll_table": [
                    ("1-2", "Lose 1 Salvage."),
                    ("3-4", "Gain 1 Salvage."),
                    ("5+", "Gain 2 Salvage, then end the Action phase."),
                ],
                "note": "Sample action text; costs and rewards are intentionally easy to edit.",
            },
            {
                "name": "Glassmere Spindle",
                "lane": "Blue",
                "movement": "Exact-distance route",
                "mode": "Resolve on Arrival",
                "actions": [
                    {
                        "label": "Tune the Span",
                        "text": "Test Signal 7. Apply all displayed modifier sources before classifying the result.",
                    }
                ],
                "rewards": ["Success: preview one additional legal destination next Navigation phase."],
                "penalties": ["Failure: draw 1 Blue Threat and resolve it."],
            },
            {
                "name": "Rivet Market",
                "lane": "Yellow",
                "movement": "Exact-distance route",
                "mode": "Choose One or End Engagement Phase",
                "actions": [
                    {
                        "label": "Trade",
                        "text": "If every drawn Threat this visit was cleared, open the available shop.",
                    },
                    {
                        "label": "Broker a Route",
                        "text": "Pay 2 Salvage to ignore one non-gate route blocker this turn.",
                    },
                ],
                "requirements": ["Shop access requires every drawn Threat this visit to resolve successfully."],
            },
            {
                "name": "Saltwind Causeway",
                "lane": "Red",
                "movement": "Exact-distance route",
                "mode": "Persistent Hazard Challenge",
                "actions": [
                    {
                        "label": "Cross the Gale",
                        "text": "Test Grit 8. This recurring challenge remains attached after either outcome.",
                    }
                ],
                "rewards": ["Success: gain 1 Salvage from exposed route caches."],
                "penalties": ["Failure: suffer 1 Wound and end the Action phase."],
            },
            {
                "name": "Cinder Relay",
                "lane": "Blue",
                "movement": "Exact-distance route",
                "mode": "Roll 1 Die",
                "actions": [],
                "roll_table": [
                    ("1", "The relay backfeeds: suffer 1 Wound."),
                    ("2-3", "Static only: no additional effect."),
                    ("4-5", "Gain +1 Signal on the next test this turn."),
                    ("6", "Gain 1 Win Progress, then disable this action for the round."),
                ],
            },
            {
                "name": "Sootwater Yard",
                "lane": "Neutral",
                "movement": "Exact-distance route",
                "mode": "Choose One or End Engagement Phase",
                "actions": [
                    {
                        "label": "Recover",
                        "text": "Discard one temporary modifier to remove 1 Wound.",
                    },
                    {
                        "label": "Survey",
                        "text": "Test Guile 7. On success, gain 1 Salvage.",
                    },
                ],
                "penalties": ["Survey failure: lose up to 1 Salvage; the encounter continues."],
            },
            {
                "name": "Ember Ferry",
                "lane": "Red",
                "movement": "Authored tier transition",
                "mode": "Choose Before Rolling Movement",
                "actions": [
                    {
                        "label": "Cross Inward",
                        "text": "Traverse one canonical edge without rolling. End movement and begin arrival.",
                    },
                    {
                        "label": "Remain Outside",
                        "text": "Choose Roll Movement instead; tier crossing is unavailable for this turn.",
                    },
                ],
                "requirements": ["Scenario locks, blockers, gates, and destination legality still apply."],
            },
        ],
    },
    {
        "title": "MIDDLE TIER SPACES",
        "kicker": "Contested Routes",
        "accent": "#59799A",
        "summary": (
            "Higher difficulty, layered consequences, and stronger rewards. "
            "Persistent challenges remain on their sectors for later visitors."
        ),
        "movement_note": (
            "Movement: exact-distance routes remain authoritative. "
            "Tier crossing is available only from authored transition sectors before the roll."
        ),
        "overview_movement": "Roll exact distance; cross only at an authored transition.",
        "overview_focus": "Higher difficulty; persistent challenges.",
        "spaces": [
            {
                "name": "Knotrail Bastion",
                "lane": "Red",
                "movement": "Exact-distance route",
                "mode": "Choose One or End Engagement Phase",
                "actions": [
                    {
                        "label": "Breach Drill",
                        "text": "Test Forge 10. You may pay 1 Salvage before rolling to reduce difficulty by 1.",
                    },
                    {
                        "label": "Hold Position",
                        "text": "Gain +1 Grit until the end of this turn, then end the Action phase.",
                    },
                ],
                "rewards": ["Breach success: gain 2 Salvage."],
                "penalties": ["Breach failure: draw 1 Red Threat."],
            },
            {
                "name": "Pallid Archive",
                "lane": "Blue",
                "movement": "Exact-distance route",
                "mode": "Roll 1 Die",
                "actions": [],
                "roll_table": [
                    ("1-2", "Lose up to 2 Salvage."),
                    ("3-4", "Reveal one contract opportunity."),
                    ("5", "Gain 1 Salvage and one contract opportunity."),
                    ("6", "Gain 1 Win Progress; this result may resolve only once per round."),
                ],
                "note": "Automatic Salvage loss is not a payment and cannot reduce Salvage below 0.",
            },
            {
                "name": "Choir Engine",
                "lane": "Blue",
                "movement": "Exact-distance route",
                "mode": "Persistent Anomaly Challenge",
                "actions": [
                    {
                        "label": "Quiet the Array",
                        "text": "Test Signal 11. Resolve before all Threat draws on this arrival.",
                    }
                ],
                "rewards": ["Success: gain +1 on the next Signal test this round."],
                "penalties": ["Failure: suffer 1 Wound and add 1 Global Escalation."],
            },
            {
                "name": "Mirror Quay",
                "lane": "Yellow",
                "movement": "Exact-distance route",
                "mode": "Choose One or End Engagement Phase",
                "actions": [
                    {
                        "label": "Take the Short Reflection",
                        "text": "Move to a displayed linked sector, then immediately begin its arrival lifecycle.",
                    },
                    {
                        "label": "Search the Wake",
                        "text": "Test Guile 10.",
                    },
                ],
                "rewards": ["Search success: gain 2 Salvage."],
                "penalties": ["Search failure: draw 1 Yellow Threat."],
            },
            {
                "name": "Emberlung Works",
                "lane": "Red",
                "movement": "Exact-distance route",
                "mode": "Roll 1 Die",
                "actions": [],
                "roll_table": [
                    ("1-2", "Suffer 2 Wounds."),
                    ("3-4", "Suffer 1 Wound."),
                    ("5", "No additional effect."),
                    ("6", "Gain 2 Salvage from the cooled vents."),
                ],
            },
            {
                "name": "Crown-Key Gate",
                "lane": "Neutral",
                "movement": "Authored tier transition",
                "mode": "Check Requirement Before Crossing",
                "actions": [
                    {
                        "label": "Enter the Inner Tier",
                        "text": "Cross one canonical edge without a die, end movement, and begin arrival.",
                    }
                ],
                "requirements": [
                    "Own at least one Artifact item.",
                    "Clear any scenario lock or blocker shown by the authoritative route.",
                ],
                "penalties": ["If the crossing is unavailable, choose Roll Movement or another legal pre-roll option."],
            },
        ],
    },
    {
        "title": "INNER TIER SPACES",
        "kicker": "Final Approach",
        "accent": "#4F4A72",
        "summary": (
            "Fixed one-step movement, mandatory challenges, and scenario pressure. "
            "Normal movement modifiers cannot skip final-approach sectors."
        ),
        "movement_note": (
            "Movement: no movement die. Clear the current fixed challenge, then move exactly one connected step inward. "
            "Retreating one prior step remains legal."
        ),
        "overview_movement": "No roll; clear the challenge, then move one step.",
        "overview_focus": "Mandatory path; scenario pressure.",
        "spaces": [
            {
                "name": "Breach Road",
                "lane": "Red",
                "movement": "One connected step",
                "mode": "Fixed Challenge - Stop Here",
                "actions": [
                    {
                        "label": "Break the Line",
                        "text": "Test Grit 12. A failed challenge leaves the operative in place.",
                    }
                ],
                "rewards": ["Success: mark this sector cleared for this operative."],
                "penalties": ["Failure: suffer 1 Wound and add 1 Loss Pressure if the scenario enables it."],
            },
            {
                "name": "Choir Road",
                "lane": "Blue",
                "movement": "One connected step",
                "mode": "Fixed Challenge - Stop Here",
                "actions": [
                    {
                        "label": "Cross the Chorus",
                        "text": "Test Signal 12. A failed challenge leaves the operative in place.",
                    }
                ],
                "rewards": ["Success: mark this sector cleared for this operative."],
                "penalties": ["Failure: draw 1 Affliction from an approved source."],
            },
            {
                "name": "Bone Meridian",
                "lane": "Yellow",
                "movement": "One connected step",
                "mode": "Roll 1 Die After Arrival",
                "actions": [],
                "roll_table": [
                    ("1-2", "Lose up to 2 Salvage."),
                    ("3-4", "Test Guile 12; failure ends the Action phase."),
                    ("5", "Gain +1 on the next test this turn."),
                    ("6", "Gain 1 Win Progress."),
                ],
            },
            {
                "name": "Gate of Cinders",
                "lane": "Red",
                "movement": "One connected step",
                "mode": "Final Gate Challenge",
                "actions": [
                    {
                        "label": "Open the Gate",
                        "text": "Test Forge 13. Normal movement aids and route overrides cannot skip this step.",
                    }
                ],
                "requirements": ["Arrive from Bone Meridian by an authored inner-approach edge."],
                "rewards": ["Success: unlock the final step into the Core for this operative."],
                "penalties": ["Failure: remain here and add 1 Global Escalation."],
            },
            {
                "name": "Silent Span",
                "lane": "Blue",
                "movement": "One connected step",
                "mode": "Choose One or End Engagement Phase",
                "actions": [
                    {
                        "label": "Stabilize",
                        "text": "Pay 2 Salvage to prevent the next automatic Wound this turn.",
                    },
                    {
                        "label": "Listen",
                        "text": "Test Command 13. On success, reveal the next confrontation modifier.",
                    },
                ],
                "penalties": ["Listen failure: the next confrontation gains +1 difficulty."],
            },
            {
                "name": "Ashen Reach Core",
                "lane": "Neutral",
                "movement": "Single final step",
                "mode": "Scenario Confrontation",
                "actions": [
                    {
                        "label": "Begin Confrontation",
                        "text": "Entering the Core starts the active scenario's authoritative final objective.",
                    },
                    {
                        "label": "Resolve",
                        "text": "Follow the displayed test, battle, reaction, consequence, and victory sequence.",
                    },
                ],
                "requirements": ["The operative must have cleared the Gate of Cinders."],
                "rewards": ["Apply scenario Win Progress and victory only through the canonical completion flow."],
                "penalties": ["Apply scenario Loss Pressure and defeat only when the active scenario enables them."],
            },
        ],
    },
]

# The board overview uses a seven-by-seven nested track. Coordinates are
# zero-based ``(row, column)`` values, with row 0 at the top. Keeping this map
# separate from the space rules makes it easy to rearrange the board without
# changing any encounter text.
BOARD_POSITIONS: dict[str, tuple[int, int]] = {
    # Outer track
    "Ashwake Depot": (0, 0),
    "Glassmere Spindle": (0, 3),
    "Rivet Market": (0, 6),
    "Saltwind Causeway": (3, 6),
    "Cinder Relay": (6, 6),
    "Sootwater Yard": (6, 3),
    "Ember Ferry": (2, 0),
    # Middle track
    "Knotrail Bastion": (1, 1),
    "Pallid Archive": (1, 3),
    "Choir Engine": (1, 5),
    "Mirror Quay": (3, 5),
    "Emberlung Works": (5, 3),
    "Crown-Key Gate": (2, 1),
    # Inner track and central objective
    "Breach Road": (2, 2),
    "Choir Road": (2, 3),
    "Bone Meridian": (2, 4),
    "Gate of Cinders": (3, 4),
    "Silent Span": (4, 3),
    "Ashen Reach Core": (3, 3),
}

BOARD_GATES = {"Ember Ferry", "Crown-Key Gate", "Gate of Cinders"}

CANONICAL_AUDIT: dict[str, Any] = {}
CANONICAL_DATA_LOADED = False


def ring_positions(inset: int) -> list[tuple[int, int]]:
    """Return clockwise positions around one nested ring of the 7x7 board."""

    low = inset
    high = 6 - inset
    positions: list[tuple[int, int]] = []
    positions.extend((low, column) for column in range(low, high + 1))
    positions.extend((row, high) for row in range(low + 1, high + 1))
    positions.extend((high, column) for column in range(high - 1, low - 1, -1))
    positions.extend((row, low) for row in range(high - 1, low, -1))
    return positions


CANONICAL_RING_POSITIONS = {
    "outer": ring_positions(0),
    "middle": ring_positions(1),
    "inner": ring_positions(2),
    "center": [(3, 3)],
}


def unique_strings(values: Iterable[str | None]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if value and value not in seen:
            seen.add(value)
            result.append(value)
    return result


def canonical_space_to_reference(space: dict[str, Any]) -> dict[str, Any]:
    icons = [str(icon).title() for icon in space.get("threatIcons", [])]
    effect = space.get("effect") or {}
    text_box = space["textBox"]
    function_definition = space["functions"]
    choice_effects = {
        choice["id"]: choice
        for choice in effect.get("choices", [])
    }

    actions: list[dict[str, str]] = []
    for choice in text_box.get("choices", []):
        resolved = choice_effects.get(choice["id"], {})
        prefix = ""
        if resolved.get("stat") and resolved.get("difficulty") is not None:
            prefix = (
                f"Test {str(resolved['stat']).title()} "
                f"{resolved['difficulty']}. "
            )
        actions.append(
            {
                "label": choice["label"],
                "text": prefix + resolved.get("summary", text_box["text"]),
            }
        )
    if not actions:
        actions.append(
            {
                "label": text_box["title"],
                "text": (
                    text_box["text"]
                    if text_box.get("intent") == "scenario-confrontation"
                    else space["ruleText"]
                ),
            }
        )

    for rule in function_definition.get("optionalActions", []):
        if rule["kind"] != "board-action":
            actions.append({"label": rule["label"], "text": rule["detail"]})

    requirements = unique_strings(
        [
            requirement.get("errorMessage")
            for requirement in space.get("movementRequirements", [])
        ]
        + [
            (
                f"Arrival: {rule['label']} - {rule['detail']}. "
                "Resolve before Threat draws."
            )
            for rule in function_definition.get("arrival", [])
            if rule["kind"] == "tile-challenge"
        ]
        + [
            f"{rule['label']}: {rule['detail']}"
            for rule in function_definition.get("persistentRules", [])
        ]
    )

    reward_summaries = [effect.get("summary")]
    reward_summaries.extend(
        choice.get("summary")
        for choice in effect.get("choices", [])
    )
    rewards = []
    if not text_box.get("choices"):
        rewards = unique_strings(
            f"Success: {summary}" if effect.get("stat") else summary
            for summary in reward_summaries
        )

    penalty_summaries = [effect.get("failureSummary")]
    penalty_summaries.extend(
        choice.get("failureSummary")
        for choice in effect.get("choices", [])
    )
    penalties = unique_strings(penalty_summaries)

    tier = space["tier"]
    if text_box.get("intent") == "scenario-confrontation":
        mode = "Scenario Confrontation"
    elif text_box.get("choices"):
        mode = "Choose One or End Engagement Phase"
    elif effect.get("stat") and effect.get("difficulty") is not None:
        mode = f"Test {str(effect['stat']).title()} {effect['difficulty']}"
    else:
        mode = "Resolve Sector Action"
    if any(
        rule["kind"] == "tile-challenge"
        for rule in function_definition.get("arrival", [])
    ):
        mode = "Local Challenge, Then Sector Action"

    movement_defaults = {
        "outer": "Exact-distance route",
        "middle": "Exact-distance route",
        "inner": "One connected step",
        "center": "Single final step",
    }
    movement_box = space.get("movementBox")
    movement = movement_box["title"] if movement_box else movement_defaults[tier]

    return {
        "id": space["id"],
        "name": space["name"],
        "lane": icons[0] if icons else "Neutral",
        "threat_icons": icons,
        "movement": movement,
        "mode": mode,
        "actions": actions,
        "requirements": requirements,
        "rewards": rewards,
        "penalties": penalties,
        "note": f"Function: {text_box['effectKey']}.",
        "tags": space.get("tags", []),
        "function_supported": all(
            rule.get("supported", False)
            for group in (
                "arrival",
                "optionalActions",
                "persistentRules",
                "departure",
            )
            for rule in function_definition.get(group, [])
        ),
    }


def load_canonical_board_data() -> None:
    """Load the 49 canonical sectors through the TypeScript source-of-truth."""

    global TIERS
    global BOARD_POSITIONS
    global BOARD_GATES
    global CANONICAL_AUDIT
    global CANONICAL_DATA_LOADED

    if CANONICAL_DATA_LOADED:
        return

    repository_root = Path(__file__).resolve().parent.parent
    npm_executable = "npm.cmd" if os.name == "nt" else "npm"
    command = [
        npm_executable,
        "exec",
        "--",
        "tsx",
        "scripts/export-board-reference-data.ts",
    ]
    completed = subprocess.run(
        command,
        cwd=repository_root,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )
    if completed.returncode != 0:
        raise RuntimeError(
            "Unable to export canonical board data:\n"
            + (completed.stderr.strip() or completed.stdout.strip())
        )
    try:
        payload = json.loads(completed.stdout)
    except json.JSONDecodeError as error:
        raise RuntimeError("Canonical board exporter returned invalid JSON.") from error

    expected_counts = {"outer": 24, "middle": 16, "inner": 8, "center": 1}
    if payload.get("audit", {}).get("tierCounts") != expected_counts:
        raise ValueError(
            "Canonical board tier counts changed; review the PDF ring layout before export."
        )

    grouped: dict[str, list[dict[str, Any]]] = {
        "outer": [],
        "middle": [],
        "inner": [],
        "center": [],
    }
    BOARD_POSITIONS = {}
    BOARD_GATES = set()
    for canonical_space in payload["spaces"]:
        tier = canonical_space["tier"]
        grouped[tier].append(canonical_space)
        ring = CANONICAL_RING_POSITIONS[tier]
        position = ring[int(canonical_space["index"])]
        BOARD_POSITIONS[canonical_space["name"]] = position
        if (
            canonical_space.get("movementBox")
            or canonical_space.get("movementRequirements")
            or "movement" in canonical_space.get("tags", [])
        ):
            BOARD_GATES.add(canonical_space["name"])

    outer_spaces = [
        canonical_space_to_reference(space)
        for space in sorted(grouped["outer"], key=lambda item: item["index"])
    ]
    middle_spaces = [
        canonical_space_to_reference(space)
        for space in sorted(grouped["middle"], key=lambda item: item["index"])
    ]
    inner_spaces = [
        canonical_space_to_reference(space)
        for space in sorted(grouped["inner"], key=lambda item: item["index"])
    ]
    inner_spaces.extend(
        canonical_space_to_reference(space)
        for space in sorted(grouped["center"], key=lambda item: item["index"])
    )

    TIERS = [
        {
            "title": "OUTER TIER SPACES",
            "kicker": "Broken Perimeter",
            "accent": "#B85B43",
            "summary": (
                "Twenty-four canonical perimeter sectors with services, route "
                "contacts, salvage, and low-to-moderate pressure."
            ),
            "movement_note": (
                "Roll movement and select an exact-distance legal route. "
                "Printed lane icons resolve before optional sector functions."
            ),
            "spaces": outer_spaces,
        },
        {
            "title": "MIDDLE TIER SPACES",
            "kicker": "War Choir Line",
            "accent": "#59799A",
            "summary": (
                "Sixteen canonical contested sectors with layered choices, "
                "higher pressure, and the default inner-tier gate."
            ),
            "movement_note": (
                "Exact-distance routes remain authoritative. Cross tiers only "
                "from an authored transition before rolling."
            ),
            "spaces": middle_spaces,
        },
        {
            "title": "INNER TIER & CORE SPACES",
            "kicker": "Crownfall and Final Approach",
            "accent": "#4F4A72",
            "summary": (
                "Eight inner trials plus the scenario-controlled Core. "
                "Clear fixed requirements before advancing one connected step."
            ),
            "movement_note": (
                "Do not roll movement. Clear the current challenge, move one "
                "connected step, and enter the Core only through its legal gate."
            ),
            "spaces": inner_spaces,
        },
    ]
    CANONICAL_AUDIT = payload["audit"]
    CANONICAL_DATA_LOADED = True


# ---------------------------------------------------------------------------
# Visual system
# ---------------------------------------------------------------------------

PAGE_SIZE = landscape(A4)
PAGE_WIDTH, PAGE_HEIGHT = PAGE_SIZE
LEFT_MARGIN = 13 * mm
RIGHT_MARGIN = 13 * mm
TOP_MARGIN = 11 * mm
BOTTOM_MARGIN = 12 * mm

PAPER = colors.HexColor("#F2EFE8")
PAPER_LIGHT = colors.HexColor("#FBFAF6")
INK = colors.HexColor("#20242A")
MUTED = colors.HexColor("#5D6268")
RULE = colors.HexColor("#C5BFB4")
DARK = colors.HexColor("#1C2630")
BONE = colors.HexColor("#F6EBD4")
SUCCESS = colors.HexColor("#2F765D")
SUCCESS_BG = colors.HexColor("#E7F2EC")
DANGER = colors.HexColor("#A3423A")
DANGER_BG = colors.HexColor("#F5E7E4")
REQUIREMENT = colors.HexColor("#8A681E")
REQUIREMENT_BG = colors.HexColor("#F5EED7")
NEUTRAL_BG = colors.HexColor("#E8E7E2")

LANE_COLORS: dict[str, colors.Color] = {
    "Blue": colors.HexColor("#3A79C9"),
    "Yellow": colors.HexColor("#D7A92B"),
    "Red": colors.HexColor("#B9483F"),
    "Neutral": colors.HexColor("#777C82"),
}


def register_optional_fonts() -> tuple[str, str, str]:
    """Use bundled/system DejaVu fonts when available; otherwise use PDF fonts."""

    candidates = [
        Path("C:/Windows/Fonts/DejaVuSans.ttf"),
        Path("C:/Windows/Fonts/arial.ttf"),
    ]
    bold_candidates = [
        Path("C:/Windows/Fonts/DejaVuSans-Bold.ttf"),
        Path("C:/Windows/Fonts/arialbd.ttf"),
    ]
    serif_candidates = [
        Path("C:/Windows/Fonts/DejaVuSerif-Bold.ttf"),
        Path("C:/Windows/Fonts/georgiab.ttf"),
    ]

    regular_path = next((path for path in candidates if path.exists()), None)
    bold_path = next((path for path in bold_candidates if path.exists()), None)
    serif_path = next((path for path in serif_candidates if path.exists()), None)

    if regular_path and bold_path:
        pdfmetrics.registerFont(TTFont("CheatSans", str(regular_path)))
        pdfmetrics.registerFont(TTFont("CheatSans-Bold", str(bold_path)))
        regular_name = "CheatSans"
        bold_name = "CheatSans-Bold"
    else:
        regular_name = "Helvetica"
        bold_name = "Helvetica-Bold"

    if serif_path:
        pdfmetrics.registerFont(TTFont("CheatSerif-Bold", str(serif_path)))
        serif_name = "CheatSerif-Bold"
    else:
        serif_name = "Times-Bold"

    return regular_name, bold_name, serif_name


FONT_REGULAR, FONT_BOLD, FONT_SERIF_BOLD = register_optional_fonts()


def make_styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "Title24",
            parent=base["Title"],
            fontName=FONT_SERIF_BOLD,
            fontSize=24,
            leading=26,
            textColor=BONE,
            alignment=TA_LEFT,
            spaceAfter=0,
        ),
        "subtitle": ParagraphStyle(
            "Subtitle",
            parent=base["Normal"],
            fontName=FONT_REGULAR,
            fontSize=9.5,
            leading=12,
            textColor=colors.HexColor("#C9D1D8"),
        ),
        "overview_header": ParagraphStyle(
            "OverviewHeader",
            parent=base["Heading2"],
            fontName=FONT_BOLD,
            fontSize=16,
            leading=19,
            textColor=INK,
            spaceBefore=0,
            spaceAfter=5,
        ),
        "tier_title": ParagraphStyle(
            "TierTitle16",
            parent=base["Heading2"],
            fontName=FONT_BOLD,
            fontSize=16,
            leading=18,
            textColor=BONE,
            spaceAfter=0,
        ),
        "tier_kicker": ParagraphStyle(
            "TierKicker",
            parent=base["Normal"],
            fontName=FONT_BOLD,
            fontSize=8.5,
            leading=10,
            textColor=colors.HexColor("#E9DED0"),
            alignment=TA_LEFT,
        ),
        "tier_summary": ParagraphStyle(
            "TierSummary",
            parent=base["Normal"],
            fontName=FONT_REGULAR,
            fontSize=9.2,
            leading=11.5,
            textColor=INK,
        ),
        "space_name": ParagraphStyle(
            "SpaceName11",
            parent=base["Heading3"],
            fontName=FONT_BOLD,
            fontSize=11,
            leading=12.5,
            textColor=INK,
            spaceAfter=0,
        ),
        "mode": ParagraphStyle(
            "Mode",
            parent=base["Normal"],
            fontName=FONT_BOLD,
            fontSize=8.4,
            leading=10,
            textColor=MUTED,
            spaceAfter=3,
        ),
        "body": ParagraphStyle(
            "Body9",
            parent=base["Normal"],
            fontName=FONT_REGULAR,
            fontSize=9,
            leading=11.2,
            textColor=INK,
            spaceAfter=2.5,
        ),
        "body_compact": ParagraphStyle(
            "BodyCompact",
            parent=base["Normal"],
            fontName=FONT_REGULAR,
            fontSize=8.5,
            leading=10.2,
            textColor=INK,
            spaceAfter=1.5,
        ),
        "bullet": ParagraphStyle(
            "Bullet9",
            parent=base["Normal"],
            fontName=FONT_REGULAR,
            fontSize=9,
            leading=11.2,
            leftIndent=10,
            firstLineIndent=-7,
            bulletIndent=1,
            textColor=INK,
            spaceAfter=2,
        ),
        "badge": ParagraphStyle(
            "Badge",
            parent=base["Normal"],
            fontName=FONT_BOLD,
            fontSize=7.5,
            leading=8.5,
            textColor=colors.white,
            alignment=TA_CENTER,
        ),
        "movement": ParagraphStyle(
            "Movement",
            parent=base["Normal"],
            fontName=FONT_REGULAR,
            fontSize=8,
            leading=9.4,
            textColor=MUTED,
        ),
        "roll": ParagraphStyle(
            "Roll",
            parent=base["Normal"],
            fontName=FONT_BOLD,
            fontSize=8.2,
            leading=9.4,
            textColor=INK,
            alignment=TA_CENTER,
        ),
        "roll_result": ParagraphStyle(
            "RollResult",
            parent=base["Normal"],
            fontName=FONT_REGULAR,
            fontSize=8.2,
            leading=9.6,
            textColor=INK,
        ),
        "table_header_center": ParagraphStyle(
            "TableHeaderCenter",
            parent=base["Normal"],
            fontName=FONT_BOLD,
            fontSize=8.2,
            leading=9.6,
            textColor=BONE,
            alignment=TA_CENTER,
        ),
        "table_header_left": ParagraphStyle(
            "TableHeaderLeft",
            parent=base["Normal"],
            fontName=FONT_BOLD,
            fontSize=8.2,
            leading=9.6,
            textColor=BONE,
        ),
        "outcome": ParagraphStyle(
            "Outcome",
            parent=base["Normal"],
            fontName=FONT_REGULAR,
            fontSize=8.3,
            leading=9.8,
            textColor=INK,
        ),
        "small": ParagraphStyle(
            "Small",
            parent=base["Normal"],
            fontName=FONT_REGULAR,
            fontSize=7.6,
            leading=9,
            textColor=MUTED,
        ),
        "small_bold": ParagraphStyle(
            "SmallBold",
            parent=base["Normal"],
            fontName=FONT_BOLD,
            fontSize=8,
            leading=9.5,
            textColor=INK,
        ),
        "center_small": ParagraphStyle(
            "CenterSmall",
            parent=base["Normal"],
            fontName=FONT_REGULAR,
            fontSize=8,
            leading=10,
            textColor=INK,
            alignment=TA_CENTER,
        ),
    }


STYLES = make_styles()


# ---------------------------------------------------------------------------
# Board-map overview
# ---------------------------------------------------------------------------


def blend_color(
    first: colors.Color,
    second: colors.Color,
    amount: float,
) -> colors.Color:
    """Return a simple RGB blend without relying on PDF transparency."""

    return colors.Color(
        first.red + (second.red - first.red) * amount,
        first.green + (second.green - first.green) * amount,
        first.blue + (second.blue - first.blue) * amount,
    )


class BoardMap(Flowable):
    """Draw a nested seven-by-seven board track from ``BOARD_POSITIONS``."""

    def __init__(self, width: float, height: float = 375) -> None:
        super().__init__()
        self.width = width
        self.height = height
        self.space_by_position: dict[tuple[int, int], tuple[dict[str, Any], int]] = {}
        for tier_index, tier in enumerate(TIERS):
            for space in tier["spaces"]:
                position = BOARD_POSITIONS[space["name"]]
                self.space_by_position[position] = (space, tier_index)

        self.tile_name_style = ParagraphStyle(
            "BoardTileName",
            parent=STYLES["small_bold"],
            fontName=FONT_BOLD,
            fontSize=8.2,
            leading=8.9,
            textColor=BONE,
            alignment=TA_CENTER,
            spaceAfter=0,
        )

    @staticmethod
    def tier_for_cell(row: int, column: int) -> int:
        if row in (0, 6) or column in (0, 6):
            return 0
        if row in (1, 5) or column in (1, 5):
            return 1
        if row in (2, 4) or column in (2, 4):
            return 2
        return 3

    @staticmethod
    def neutral_band_label(space: dict[str, Any]) -> str:
        if space["id"] == "center_cinder_gate":
            return "FINAL OBJECTIVE"
        if space["name"] in BOARD_GATES:
            return "ROUTE / GATE"
        return "NO THREAT DRAW"

    def draw_route_glyph(
        self,
        row: int,
        column: int,
        x: float,
        y: float,
        cell_width: float,
        cell_height: float,
        accent: colors.Color,
        tier_index: int,
    ) -> None:
        canvas = self.canv
        center_x = x + cell_width / 2
        center_y = y + cell_height / 2
        inset = min(cell_width, cell_height) * 0.18

        canvas.setStrokeColor(blend_color(accent, PAPER, 0.18))
        canvas.setLineWidth(1.1)

        horizontal = row in (tier_index, 6 - tier_index)
        vertical = column in (tier_index, 6 - tier_index)
        if horizontal:
            canvas.line(x + inset, center_y, x + cell_width - inset, center_y)
        if vertical:
            canvas.line(center_x, y + inset, center_x, y + cell_height - inset)

        canvas.setFillColor(accent)
        canvas.circle(center_x, center_y, 2.2, fill=1, stroke=0)

        canvas.setFont(FONT_BOLD, 5.4)
        canvas.setFillColor(blend_color(accent, BONE, 0.38))
        tier_names = ("OUTER ROUTE", "MIDDLE ROUTE", "INNER PATH", "CORE")
        canvas.drawCentredString(center_x, y + 5.2, tier_names[tier_index])

    def draw_active_tile(
        self,
        space: dict[str, Any],
        x: float,
        y: float,
        cell_width: float,
        cell_height: float,
    ) -> None:
        canvas = self.canv
        icons = space.get("threat_icons", [])
        lane = icons[0] if icons else "Neutral"
        accent = LANE_COLORS[lane]
        base = blend_color(DARK, accent, 0.58 if lane != "Neutral" else 0.40)

        canvas.setFillColor(base)
        canvas.rect(x, y, cell_width, cell_height, fill=1, stroke=0)

        # Layered inset panels create a board-tile glow without bitmap assets.
        for index, amount in enumerate((0.10, 0.16, 0.22)):
            inset = 4 + index * 4
            if cell_width - inset * 2 <= 0 or cell_height - inset * 2 <= 0:
                break
            canvas.setFillColor(blend_color(base, BONE, amount))
            canvas.rect(
                x + inset,
                y + inset,
                cell_width - inset * 2,
                cell_height - inset * 2,
                fill=1,
                stroke=0,
            )

        band_height = 12.2
        if icons:
            grouped_icons: list[tuple[str, int]] = []
            for icon in icons:
                if grouped_icons and grouped_icons[-1][0] == icon:
                    grouped_icons[-1] = (icon, grouped_icons[-1][1] + 1)
                else:
                    grouped_icons.append((icon, 1))
            total_icons = len(icons)
            cursor_x = x
            for icon, count in grouped_icons:
                segment_width = cell_width * count / total_icons
                segment_color = LANE_COLORS[icon]
                canvas.setFillColor(segment_color)
                canvas.rect(cursor_x, y, segment_width, band_height, fill=1, stroke=0)
                canvas.setFillColor(INK if icon == "Yellow" else colors.white)
                canvas.setFont(FONT_BOLD, 6.0)
                canvas.drawCentredString(
                    cursor_x + segment_width / 2,
                    y + 3.3,
                    f"{count} {icon.upper()}",
                )
                cursor_x += segment_width
        else:
            canvas.setFillColor(accent)
            canvas.rect(x, y, cell_width, band_height, fill=1, stroke=0)
            canvas.setFillColor(colors.white)
            canvas.setFont(FONT_BOLD, 6.0)
            canvas.drawCentredString(
                x + cell_width / 2,
                y + 3.3,
                self.neutral_band_label(space),
            )

        title = Paragraph(esc(space["name"]), self.tile_name_style)
        available_height = cell_height - band_height - 4
        title_width, title_height = title.wrap(cell_width - 10, available_height)
        title.drawOn(
            canvas,
            x + (cell_width - title_width) / 2,
            y + band_height + (available_height - title_height) / 2 + 1,
        )

        canvas.setStrokeColor(blend_color(accent, colors.white, 0.22))
        canvas.setLineWidth(1.1)
        canvas.rect(x + 0.6, y + 0.6, cell_width - 1.2, cell_height - 1.2, fill=0, stroke=1)

        if space["name"] in BOARD_GATES:
            canvas.setStrokeColor(BONE)
            canvas.setLineWidth(1.4)
            canvas.rect(x + 3, y + 3, cell_width - 6, cell_height - 6, fill=0, stroke=1)
            canvas.setFillColor(BONE)
            canvas.saveState()
            canvas.translate(x + cell_width - 9, y + cell_height - 8)
            canvas.rotate(45)
            canvas.rect(-2.3, -2.3, 4.6, 4.6, fill=1, stroke=0)
            canvas.restoreState()

    def draw(self) -> None:
        canvas = self.canv
        cell_width = self.width / 7
        cell_height = self.height / 7
        tier_accents = (
            colors.HexColor("#B85B43"),
            colors.HexColor("#59799A"),
            colors.HexColor("#4F4A72"),
            colors.HexColor("#A78752"),
        )
        tier_backgrounds = (
            colors.HexColor("#343A3F"),
            colors.HexColor("#2D3740"),
            colors.HexColor("#363347"),
            colors.HexColor("#24262A"),
        )

        canvas.saveState()
        canvas.setFillColor(DARK)
        canvas.rect(0, 0, self.width, self.height, fill=1, stroke=0)

        for row in range(7):
            for column in range(7):
                x = column * cell_width
                y = self.height - (row + 1) * cell_height
                tier_index = self.tier_for_cell(row, column)

                canvas.setFillColor(tier_backgrounds[tier_index])
                canvas.rect(x, y, cell_width, cell_height, fill=1, stroke=0)

                entry = self.space_by_position.get((row, column))
                if entry:
                    space, _ = entry
                    self.draw_active_tile(space, x, y, cell_width, cell_height)
                else:
                    self.draw_route_glyph(
                        row,
                        column,
                        x,
                        y,
                        cell_width,
                        cell_height,
                        tier_accents[tier_index],
                        tier_index,
                    )

                canvas.setStrokeColor(colors.HexColor("#171D22"))
                canvas.setLineWidth(0.5)
                canvas.rect(x, y, cell_width, cell_height, fill=0, stroke=1)

        # Heavy nested borders make the three rings read like a physical board.
        border_specs = [
            (0, 0, 7, tier_accents[0], 2.5),
            (1, 1, 5, tier_accents[1], 3.2),
            (2, 2, 3, tier_accents[2], 3.2),
            (3, 3, 1, BONE, 2.0),
        ]
        for column, bottom_row, size, accent, line_width in border_specs:
            canvas.setStrokeColor(accent)
            canvas.setLineWidth(line_width)
            canvas.rect(
                column * cell_width,
                bottom_row * cell_height,
                size * cell_width,
                size * cell_height,
                fill=0,
                stroke=1,
            )

        canvas.restoreState()


# ---------------------------------------------------------------------------
# Flowable builders
# ---------------------------------------------------------------------------


def esc(value: Any) -> str:
    return html.escape(str(value), quote=True)


def bullet_paragraph(label: str, text: str) -> Paragraph:
    return Paragraph(
        f"&#8226;&nbsp;<b>{esc(label)}:</b> {esc(text)}",
        STYLES["bullet"],
    )


def badge(text: str, background: colors.Color, width: float = 31 * mm) -> Table:
    foreground = colors.HexColor("#1D2228") if background == LANE_COLORS["Yellow"] else colors.white
    badge_style = ParagraphStyle(
        f"Badge-{text}",
        parent=STYLES["badge"],
        textColor=foreground,
    )
    item = Table(
        [[Paragraph(esc(text).upper(), badge_style)]],
        colWidths=[width],
        rowHeights=[5.2 * mm],
    )
    item.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), background),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.Color(0, 0, 0, alpha=0.25)),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 2),
                ("RIGHTPADDING", (0, 0), (-1, -1), 2),
                ("TOPPADDING", (0, 0), (-1, -1), 1),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
            ]
        )
    )
    return item


def threat_badge(space: dict[str, Any], width: float = 23 * mm) -> Table:
    icons = space.get("threat_icons", [])
    if not icons:
        return badge("No Draw", LANE_COLORS["Neutral"], width)

    grouped: list[tuple[str, int]] = []
    for icon in icons:
        if grouped and grouped[-1][0] == icon:
            grouped[-1] = (icon, grouped[-1][1] + 1)
        else:
            grouped.append((icon, 1))

    cells: list[Paragraph] = []
    widths: list[float] = []
    total = len(icons)
    for icon, count in grouped:
        segment_style = ParagraphStyle(
            f"ThreatBadge-{icon}-{count}",
            parent=STYLES["badge"],
            fontSize=7,
            textColor=INK if icon == "Yellow" else colors.white,
        )
        label = icon.upper() if len(grouped) == 1 and count == 1 else f"{count}{icon[0].upper()}"
        cells.append(Paragraph(label, segment_style))
        widths.append(width * count / total)

    item = Table([cells], colWidths=widths, rowHeights=[5.2 * mm])
    styles: list[tuple[Any, ...]] = [
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 1),
        ("RIGHTPADDING", (0, 0), (-1, -1), 1),
        ("TOPPADDING", (0, 0), (-1, -1), 1),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.Color(0, 0, 0, alpha=0.25)),
    ]
    for index, (icon, _) in enumerate(grouped):
        styles.append(("BACKGROUND", (index, 0), (index, 0), LANE_COLORS[icon]))
    item.setStyle(TableStyle(styles))
    return item


def outcome_box(title: str, items: Sequence[str], kind: str) -> Table | None:
    if not items:
        return None

    palette = {
        "reward": (SUCCESS, SUCCESS_BG),
        "penalty": (DANGER, DANGER_BG),
        "requirement": (REQUIREMENT, REQUIREMENT_BG),
    }
    foreground, background = palette[kind]
    content: list[Flowable] = [
        Paragraph(f"<b>{esc(title)}</b>", STYLES["outcome"]),
    ]
    content.extend(
        Paragraph(f"&#8226;&nbsp;{esc(item)}", STYLES["outcome"])
        for item in items
    )
    table = Table([[content]], colWidths=[None])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), background),
                ("LINEBEFORE", (0, 0), (0, -1), 3, foreground),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return table


def roll_table(rows: Sequence[Sequence[str]], width: float) -> Table:
    data = [
        [
            Paragraph("ROLL", STYLES["table_header_center"]),
            Paragraph("RESULT", STYLES["table_header_left"]),
        ]
    ]
    for roll, result in rows:
        data.append(
            [
                Paragraph(esc(roll), STYLES["roll"]),
                Paragraph(esc(result), STYLES["roll_result"]),
            ]
        )

    table = Table(data, colWidths=[17 * mm, width - 17 * mm])
    styling: list[tuple[Any, ...]] = [
        ("BACKGROUND", (0, 0), (-1, 0), DARK),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.35, RULE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 2.4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2.4),
    ]
    for row_index in range(1, len(data)):
        if row_index % 2 == 0:
            styling.append(("BACKGROUND", (0, row_index), (-1, row_index), NEUTRAL_BG))
    table.setStyle(TableStyle(styling))
    return table


def space_card(space: dict[str, Any], width: float) -> Table:
    lane_name = space.get("lane", "Neutral")
    lane_color = LANE_COLORS.get(lane_name, LANE_COLORS["Neutral"])

    heading = Table(
        [
            [
                Paragraph(esc(space["name"]), STYLES["space_name"]),
                threat_badge(space, width=23 * mm),
            ]
        ],
        colWidths=[width - 27 * mm, 23 * mm],
    )
    heading.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )

    body: list[Flowable] = [
        heading,
        Paragraph(
            f"<b>MOVEMENT:</b> {esc(space['movement'])}",
            STYLES["movement"],
        ),
        Paragraph(esc(space["mode"]).upper(), STYLES["mode"]),
    ]

    for action in space.get("actions", []):
        body.append(bullet_paragraph(action["label"], action["text"]))

    if space.get("roll_table"):
        body.append(Spacer(1, 1.5 * mm))
        body.append(roll_table(space["roll_table"], width - 9 * mm))

    for title, key, kind in [
        ("REQUIREMENTS", "requirements", "requirement"),
        ("REWARD", "rewards", "reward"),
        ("PENALTY", "penalties", "penalty"),
    ]:
        box = outcome_box(title, space.get(key, []), kind)
        if box:
            body.append(Spacer(1, 1.3 * mm))
            body.append(box)

    if space.get("note"):
        body.append(Spacer(1, 1.2 * mm))
        body.append(Paragraph(f"<i>{esc(space['note'])}</i>", STYLES["small"]))

    card = Table([[body]], colWidths=[width])
    card.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), PAPER_LIGHT),
                ("BOX", (0, 0), (-1, -1), 0.7, RULE),
                ("LINEBEFORE", (0, 0), (0, -1), 4, lane_color),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    # The card is already a single unsplittable Table. Wrapping it in
    # KeepTogether breaks ReportLab's height calculation when the card is
    # nested inside the page's three-column Table.
    return card


def estimate_space_weight(space: dict[str, Any]) -> float:
    text_length = sum(len(action["text"]) for action in space.get("actions", []))
    text_length += sum(len(result) for _, result in space.get("roll_table", []))
    text_length += sum(
        len(item)
        for key in ("requirements", "rewards", "penalties")
        for item in space.get(key, [])
    )
    text_length += len(space.get("note", ""))
    return 4.0 + (text_length / 115.0)


def split_into_balanced_columns(
    spaces: Sequence[dict[str, Any]],
    column_count: int = 3,
) -> list[list[dict[str, Any]]]:
    """Keep source order while splitting at approximately equal text weight."""

    weights = [estimate_space_weight(space) for space in spaces]
    target = sum(weights) / column_count
    columns: list[list[dict[str, Any]]] = [[] for _ in range(column_count)]
    column_index = 0
    current_weight = 0.0

    for index, (space, weight) in enumerate(zip(spaces, weights)):
        remaining_items = len(spaces) - index
        remaining_columns = column_count - column_index
        must_leave_one_each = remaining_items <= remaining_columns
        would_overflow = current_weight and current_weight + weight > target * 1.08
        if column_index < column_count - 1 and (would_overflow or must_leave_one_each):
            column_index += 1
            current_weight = 0.0
        columns[column_index].append(space)
        current_weight += weight

    return columns


def paginate_space_columns(
    spaces: Sequence[dict[str, Any]],
    column_width: float,
    max_column_height: float = 438,
) -> list[list[list[dict[str, Any]]]]:
    """Pack cards into the shortest legal column while respecting page height."""

    pages: list[list[list[dict[str, Any]]]] = []
    columns: list[list[dict[str, Any]]] = [[], [], []]
    heights = [0.0, 0.0, 0.0]
    gap = 3 * mm

    for space in spaces:
        card_height = space_card(space, column_width).wrap(column_width, 10000)[1]
        candidates = [
            index
            for index in range(3)
            if heights[index]
            + card_height
            + (gap if columns[index] else 0)
            <= max_column_height
        ]
        if not candidates:
            pages.append(columns)
            columns = [[], [], []]
            heights = [0.0, 0.0, 0.0]
            candidates = [0, 1, 2]
        column_index = min(candidates, key=lambda index: heights[index])
        required_height = card_height + (gap if columns[column_index] else 0)
        columns[column_index].append(space)
        heights[column_index] += required_height

    if any(columns):
        pages.append(columns)
    return pages


def document_header() -> Table:
    left = [
        Paragraph(esc(DOCUMENT["title"]), STYLES["title"]),
        Paragraph(esc(DOCUMENT["subtitle"]), STYLES["subtitle"]),
    ]
    right_style = ParagraphStyle(
        "Edition",
        parent=STYLES["subtitle"],
        fontName=FONT_BOLD,
        alignment=TA_CENTER,
        textColor=BONE,
    )
    right = Table(
        [[Paragraph(esc(DOCUMENT.get("map_label", DOCUMENT["edition"])), right_style)]],
        colWidths=[43 * mm],
        rowHeights=[12 * mm],
    )
    right.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#6D7D89")),
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#263642")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )
    table = Table(
        [[left, right]],
        colWidths=[
            PAGE_WIDTH - LEFT_MARGIN - RIGHT_MARGIN - 48 * mm,
            43 * mm,
        ],
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), DARK),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (0, -1), 8 * mm),
                ("RIGHTPADDING", (0, 0), (0, -1), 6 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 6 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5 * mm),
                ("LEFTPADDING", (1, 0), (1, -1), 0),
                ("RIGHTPADDING", (1, 0), (1, -1), 5 * mm),
            ]
        )
    )
    return table


def board_overview_page() -> list[Flowable]:
    """Build the game-board overview page."""

    usable_width = PAGE_WIDTH - LEFT_MARGIN - RIGHT_MARGIN
    tier_legend_width = usable_width * 0.35
    lane_legend_width = usable_width * 0.31
    note_width = usable_width - tier_legend_width - lane_legend_width

    tier_colors = [
        colors.HexColor("#B85B43"),
        colors.HexColor("#59799A"),
        colors.HexColor("#4F4A72"),
        colors.HexColor("#A78752"),
    ]
    tier_track = Table(
        [
            [Paragraph("TIER TRACK", STYLES["small_bold"])],
            [
                Table(
                    [
                        [
                            Paragraph(label, STYLES["table_header_center"])
                            for label in ("OUTER", "MIDDLE", "INNER", "CORE")
                        ]
                    ],
                    colWidths=[tier_legend_width / 4 - 3] * 4,
                )
            ],
        ],
        colWidths=[tier_legend_width - 8],
    )
    tier_track._cellvalues[1][0].setStyle(
        TableStyle(
            [
                ("BACKGROUND", (index, 0), (index, 0), tier_colors[index])
                for index in range(4)
            ]
            + [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 2),
                ("RIGHTPADDING", (0, 0), (-1, -1), 2),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]
        )
    )
    tier_track.setStyle(
        TableStyle(
            [
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )

    lane_cell_width = lane_legend_width / 3 - 4
    lane_track = Table(
        [
            [Paragraph("THREAT TILES", STYLES["small_bold"])],
            [
                Table(
                    [
                        [
                            badge("Blue", LANE_COLORS["Blue"], lane_cell_width),
                            badge("Yellow", LANE_COLORS["Yellow"], lane_cell_width),
                            badge("Red", LANE_COLORS["Red"], lane_cell_width),
                        ]
                    ],
                    colWidths=[lane_cell_width] * 3,
                )
            ],
        ],
        colWidths=[lane_legend_width - 8],
    )
    lane_track.setStyle(
        TableStyle(
            [
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )

    map_note = [
        Paragraph("HOW TO READ THE BOARD", STYLES["small_bold"]),
        Paragraph(
            "Each colored band segment adds one matching Threat draw on arrival. "
            "A double border and diamond marks a movement or gate rule. "
            f"Audit: {CANONICAL_AUDIT.get('totalSpaces', 0)}/49 sectors, "
            f"{len(CANONICAL_AUDIT.get('unsupportedRules', []))} unsupported "
            "functions. Follow the nested tracks inward.",
            STYLES["body_compact"],
        ),
    ]
    legend = Table(
        [[tier_track, lane_track, map_note]],
        colWidths=[tier_legend_width, lane_legend_width, note_width],
    )
    legend.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), PAPER_LIGHT),
                ("BOX", (0, 0), (-1, -1), 0.6, RULE),
                ("INNERGRID", (0, 0), (-1, -1), 0.35, RULE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )

    return [
        document_header(),
        Spacer(1, 2 * mm),
        BoardMap(usable_width, 374),
        Spacer(1, 2 * mm),
        legend,
    ]


def section_title(title: str, accent: colors.Color | None = None) -> list[Flowable]:
    line_color = accent or colors.HexColor("#9A6A43")
    return [
        Paragraph(esc(title), STYLES["overview_header"]),
        HRFlowable(
            width="100%",
            thickness=1.8,
            color=line_color,
            spaceBefore=0,
            spaceAfter=2 * mm,
        ),
    ]


def overview_page() -> list[Flowable]:
    story: list[Flowable] = [document_header(), Spacer(1, 3 * mm)]

    story.extend(section_title("QUICK START"))

    turn_cells: list[list[Flowable]] = []
    usable_width = PAGE_WIDTH - LEFT_MARGIN - RIGHT_MARGIN
    turn_width = usable_width / 3.0 - 3 * mm
    for label, description in TURN_SEQUENCE:
        turn_cells.append(
            [
                Paragraph(label, STYLES["small_bold"]),
                Paragraph(esc(description), STYLES["body_compact"]),
            ]
        )

    turn_grid = Table(
        [
            [
                turn_cells[0],
                turn_cells[1],
                turn_cells[2],
            ],
            [
                turn_cells[3],
                turn_cells[4],
                turn_cells[5],
            ],
        ],
        colWidths=[turn_width] * 3,
        hAlign="LEFT",
    )
    turn_grid.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), PAPER_LIGHT),
                ("BOX", (0, 0), (-1, -1), 0.6, RULE),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, RULE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(turn_grid)
    story.append(Spacer(1, 3 * mm))

    story.extend(section_title("MOVEMENT & LANE REQUIREMENTS", colors.HexColor("#59799A")))

    movement_data: list[list[Any]] = []
    for name, rule in MOVEMENT_RULES:
        movement_data.append(
            [
                Paragraph(f"<b>{esc(name)}</b>", STYLES["body_compact"]),
                Paragraph(esc(rule), STYLES["body_compact"]),
            ]
        )
    movement_area_width = usable_width * 0.56 - 4 * mm
    movement_label_width = 38 * mm
    movement_table = Table(
        movement_data,
        colWidths=[
            movement_label_width,
            movement_area_width - movement_label_width,
        ],
    )
    movement_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), NEUTRAL_BG),
                ("BOX", (0, 0), (-1, -1), 0.5, RULE),
                ("INNERGRID", (0, 0), (-1, -1), 0.35, RULE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )

    lane_cards: list[Any] = []
    lane_area_width = usable_width * 0.44
    lane_card_width = lane_area_width / 3
    for lane in LANE_KEY:
        accent = colors.HexColor(lane["accent"])
        lane_content = [
            badge(lane["name"], accent, width=lane_card_width - 8),
            Spacer(1, 2),
            Paragraph(esc(lane["summary"]), STYLES["center_small"]),
            Spacer(1, 2),
            Paragraph(f"<b>{esc(lane['requirement'])}</b>", STYLES["center_small"]),
        ]
        lane_cards.append(lane_content)

    lane_table = Table(
        [lane_cards],
        colWidths=[lane_card_width] * 3,
    )
    lane_table.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 0.5, RULE),
                ("INNERGRID", (0, 0), (-1, -1), 0.35, RULE),
                ("BACKGROUND", (0, 0), (-1, -1), PAPER_LIGHT),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )

    movement_and_lanes = Table(
        [[movement_table, lane_table]],
        colWidths=[usable_width * 0.56, usable_width * 0.44],
    )
    movement_and_lanes.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (0, -1), 0),
                ("RIGHTPADDING", (0, 0), (0, -1), 4 * mm),
                ("LEFTPADDING", (1, 0), (1, -1), 0),
                ("RIGHTPADDING", (1, 0), (1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    story.append(movement_and_lanes)
    story.append(Spacer(1, 3 * mm))

    story.extend(section_title("TESTS, THREATS & OUTCOMES", colors.HexColor("#4F4A72")))

    formula_area_width = usable_width * 0.45 - 4 * mm
    formula_label_width = 30 * mm
    formula = Table(
        [
            [
                Paragraph("TEST FORMULA", STYLES["table_header_left"]),
                Paragraph(
                    "Dice total + base attribute + permanent/equipped modifiers + "
                    "temporary modifiers vs. displayed difficulty",
                    STYLES["body_compact"],
                ),
            ],
            [
                Paragraph("ARRIVAL ORDER", STYLES["table_header_left"]),
                Paragraph(
                    "Sector brief -> recurring challenges -> Threat queue -> optional sector action",
                    STYLES["body_compact"],
                ),
            ],
            [
                Paragraph("THREAT ORDER", STYLES["table_header_left"]),
                Paragraph(
                    "Event -> Enemy -> Nemesis -> Encounter -> Asset",
                    STYLES["body_compact"],
                ),
            ],
            [
                Paragraph("COST LANGUAGE", STYLES["table_header_left"]),
                Paragraph(
                    "<b>Lose:</b> automatic, floor 0, continue. "
                    "<b>Pay:</b> full cost required; no partial benefit.",
                    STYLES["body_compact"],
                ),
            ],
        ],
        colWidths=[
            formula_label_width,
            formula_area_width - formula_label_width,
        ],
    )
    formula.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), DARK),
                ("TEXTCOLOR", (0, 0), (0, -1), colors.white),
                ("BACKGROUND", (1, 0), (1, -1), PAPER_LIGHT),
                ("GRID", (0, 0), (-1, -1), 0.4, RULE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )

    tier_rows: list[list[Any]] = [
        [
            Paragraph("TIER", STYLES["table_header_center"]),
            Paragraph("MOVEMENT", STYLES["table_header_left"]),
            Paragraph("REFERENCE FOCUS", STYLES["table_header_left"]),
        ]
    ]
    for tier in TIERS:
        tier_rows.append(
            [
                Paragraph(esc(tier["title"].replace(" SPACES", "")), STYLES["roll"]),
                Paragraph(
                    esc(tier.get("overview_movement", tier["movement_note"])),
                    STYLES["body_compact"],
                ),
                Paragraph(
                    esc(tier.get("overview_focus", tier["summary"])),
                    STYLES["body_compact"],
                ),
            ]
        )
    tier_area_width = usable_width * 0.55
    tier_name_width = 29 * mm
    tier_movement_width = tier_area_width * 0.34
    tier_table = Table(
        tier_rows,
        colWidths=[
            tier_name_width,
            tier_movement_width,
            tier_area_width - tier_name_width - tier_movement_width,
        ],
    )
    tier_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), DARK),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("BACKGROUND", (0, 1), (-1, -1), PAPER_LIGHT),
                ("GRID", (0, 0), (-1, -1), 0.4, RULE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 3.5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
            ]
        )
    )

    bottom = Table(
        [[formula, tier_table]],
        colWidths=[usable_width * 0.45, usable_width * 0.55],
    )
    bottom.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (0, -1), 0),
                ("RIGHTPADDING", (0, 0), (0, -1), 4 * mm),
                ("LEFTPADDING", (1, 0), (1, -1), 0),
                ("RIGHTPADDING", (1, 0), (1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    story.append(bottom)
    story.append(Spacer(1, 3 * mm))
    disclaimer = outcome_box(
        "TEMPLATE NOTICE",
        [
            "The included spaces and outcomes are original sample data for layout testing.",
            "Replace TIERS data with current authoritative sector rules before using this sheet during play.",
        ],
        "requirement",
    )
    if disclaimer:
        story.append(disclaimer)
    return story


def tier_page(tier: dict[str, Any]) -> list[Flowable]:
    usable_width = PAGE_WIDTH - LEFT_MARGIN - RIGHT_MARGIN
    accent = colors.HexColor(tier["accent"])

    banner = Table(
        [
            [
                [
                    Paragraph(esc(tier["title"]), STYLES["tier_title"]),
                    Paragraph(esc(tier["kicker"]).upper(), STYLES["tier_kicker"]),
                ],
                Paragraph(esc(tier["summary"]), STYLES["subtitle"]),
            ]
        ],
        colWidths=[usable_width * 0.36, usable_width * 0.64],
    )
    banner.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), DARK),
                ("LINEBEFORE", (0, 0), (0, -1), 7, accent),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )

    movement_strip = Table(
        [
            [
                Paragraph("MOVEMENT & ARRIVAL", STYLES["table_header_left"]),
                Paragraph(esc(tier["movement_note"]), STYLES["body_compact"]),
            ]
        ],
        colWidths=[39 * mm, usable_width - 39 * mm],
    )
    movement_strip.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, 0), accent),
                ("TEXTCOLOR", (0, 0), (0, 0), colors.white),
                ("BACKGROUND", (1, 0), (1, 0), PAPER_LIGHT),
                ("BOX", (0, 0), (-1, -1), 0.5, RULE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )

    gap = 4 * mm
    column_width = (usable_width - 2 * gap) / 3
    columns = tier.get("_columns") or split_into_balanced_columns(tier["spaces"], 3)
    column_flowables: list[list[Flowable]] = []
    for column in columns:
        contents: list[Flowable] = []
        for index, space in enumerate(column):
            if index:
                contents.append(Spacer(1, 3 * mm))
            contents.append(space_card(space, column_width))
        column_flowables.append(contents)

    card_grid = Table(
        [column_flowables],
        colWidths=[column_width, column_width, column_width],
    )
    card_grid.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (0, -1), 0),
                ("RIGHTPADDING", (0, 0), (0, -1), gap),
                ("LEFTPADDING", (1, 0), (1, -1), 0),
                ("RIGHTPADDING", (1, 0), (1, -1), gap),
                ("LEFTPADDING", (2, 0), (2, -1), 0),
                ("RIGHTPADDING", (2, 0), (2, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )

    return [
        banner,
        Spacer(1, 3 * mm),
        movement_strip,
        Spacer(1, 4 * mm),
        card_grid,
    ]


# ---------------------------------------------------------------------------
# Document generation and validation
# ---------------------------------------------------------------------------


def validate_data() -> None:
    if len(TIERS) != 3:
        raise ValueError("This template expects exactly three tier definitions.")

    allowed_lanes = set(LANE_COLORS)
    names: set[str] = set()
    for tier in TIERS:
        if not tier.get("spaces"):
            raise ValueError(f"Tier has no spaces: {tier.get('title', '<untitled>')}")
        for space in tier["spaces"]:
            name = space.get("name")
            if not name:
                raise ValueError(f"Space without a name in {tier['title']}")
            if name in names:
                raise ValueError(f"Duplicate space name: {name}")
            names.add(name)
            if space.get("lane", "Neutral") not in allowed_lanes:
                raise ValueError(f"Unsupported lane on {name}: {space.get('lane')}")
            if not space.get("mode"):
                raise ValueError(f"Missing mode/action structure on {name}")
            if not space.get("actions") and not space.get("roll_table"):
                raise ValueError(f"{name} needs actions or a roll_table")
            if not space.get("function_supported", True):
                raise ValueError(f"Unsupported canonical tile function on {name}")

    board_names = set(BOARD_POSITIONS)
    if board_names != names:
        missing = sorted(names - board_names)
        unknown = sorted(board_names - names)
        raise ValueError(
            f"BOARD_POSITIONS mismatch; missing={missing}, unknown={unknown}"
        )
    positions = list(BOARD_POSITIONS.values())
    if len(set(positions)) != len(positions):
        raise ValueError("BOARD_POSITIONS contains duplicate coordinates.")
    if any(not (0 <= row <= 6 and 0 <= column <= 6) for row, column in positions):
        raise ValueError("BOARD_POSITIONS coordinates must remain inside the 7x7 map.")
    if not BOARD_GATES <= names:
        raise ValueError("BOARD_GATES contains an unknown space name.")

    if CANONICAL_AUDIT:
        if CANONICAL_AUDIT.get("totalSpaces") != 49:
            raise ValueError("Canonical audit does not contain all 49 sectors.")
        if CANONICAL_AUDIT.get("unsupportedRules"):
            raise ValueError(
                f"Unsupported tile rules: {CANONICAL_AUDIT['unsupportedRules']}"
            )
        coverage = CANONICAL_AUDIT.get("effectCoverage", {})
        for key in (
            "missingEffectKeys",
            "unusedEffectKeys",
            "mismatchedChoiceKeys",
            "invalidCheckKeys",
            "legacyBoardTestKeys",
        ):
            if coverage.get(key):
                raise ValueError(f"Canonical effect coverage failed: {key}={coverage[key]}")


def draw_page_chrome(canvas: Any, doc: SimpleDocTemplate) -> None:
    canvas.saveState()
    canvas.setFillColor(PAPER)
    canvas.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)

    footer_y = 6.2 * mm
    canvas.setStrokeColor(RULE)
    canvas.setLineWidth(0.45)
    canvas.line(LEFT_MARGIN, 9.2 * mm, PAGE_WIDTH - RIGHT_MARGIN, 9.2 * mm)

    canvas.setFont(FONT_REGULAR, 7)
    canvas.setFillColor(MUTED)
    canvas.drawString(LEFT_MARGIN, footer_y, DOCUMENT["footer"])
    canvas.drawRightString(
        PAGE_WIDTH - RIGHT_MARGIN,
        footer_y,
        f"{DOCUMENT['edition']}  |  PAGE {doc.page}",
    )
    canvas.restoreState()


def build_pdf(output_path: Path) -> Path:
    load_canonical_board_data()
    validate_data()
    output_path.parent.mkdir(parents=True, exist_ok=True)

    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=PAGE_SIZE,
        leftMargin=LEFT_MARGIN,
        rightMargin=RIGHT_MARGIN,
        topMargin=TOP_MARGIN,
        bottomMargin=BOTTOM_MARGIN,
        title=f"{DOCUMENT['title']} - {DOCUMENT['subtitle']}",
        author="Ashen Reach reference generator",
        subject="Editable multi-tier board game cheat sheet",
        creator="ReportLab",
        pageCompression=1,
    )

    story: list[Flowable] = []
    story.extend(board_overview_page())
    usable_width = PAGE_WIDTH - LEFT_MARGIN - RIGHT_MARGIN
    column_width = (usable_width - 8 * mm) / 3
    for tier in TIERS:
        column_pages = paginate_space_columns(tier["spaces"], column_width)
        page_total = len(column_pages)
        covered = 0
        for page_index, page_columns in enumerate(column_pages):
            page_spaces = [
                space
                for column in page_columns
                for space in column
            ]
            page_tier = dict(tier)
            page_tier["spaces"] = page_spaces
            page_tier["_columns"] = page_columns
            if page_total > 1:
                page_tier["title"] = (
                    f"{tier['title']} - {page_index + 1} OF {page_total}"
                )
                page_tier["kicker"] = (
                    f"{tier['kicker']} | canonical sectors "
                    f"{covered + 1}-{covered + len(page_spaces)}"
                )
            covered += len(page_spaces)
            story.append(PageBreak())
            story.extend(tier_page(page_tier))

    doc.build(story, onFirstPage=draw_page_chrome, onLaterPages=draw_page_chrome)
    return output_path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate the complete canonical Ashen Reach board reference PDF.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("output/pdf/ashen_reach_three_tier_cheat_sheet.pdf"),
        help="Destination PDF path (default: output/pdf/ashen_reach_three_tier_cheat_sheet.pdf)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    output = build_pdf(args.output.resolve())
    usable_width = PAGE_WIDTH - LEFT_MARGIN - RIGHT_MARGIN
    column_width = (usable_width - 8 * mm) / 3
    page_count = 1 + sum(
        len(paginate_space_columns(tier["spaces"], column_width))
        for tier in TIERS
    )
    print(f"Generated: {output}")
    print(f"Pages: {page_count}")
    print(f"Canonical spaces: {sum(len(tier['spaces']) for tier in TIERS)}")


if __name__ == "__main__":
    main()
