import json
import os
import pathlib
import time
import urllib.request
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "reports" / "ui" / "p22-operative-pieces"
SCREENSHOTS = OUTPUT / "screenshots"
RECORDINGS = OUTPUT / "recordings"
API = os.environ.get("ASHEN_REACH_API_ORIGIN", "http://127.0.0.1:8080")
CLIENT = os.environ.get("ASHEN_REACH_CLIENT_ORIGIN", "http://127.0.0.1:5173")
VIEWPORTS = [
    ("1366x768", 1366, 768),
    ("1600x900", 1600, 900),
    ("1920x1080", 1920, 1080),
]
CAPTURES = [
    ("01-one-piece", "one-operative", "heraldic-reliquary"),
    ("02-three-pieces", "three-operatives", "heraldic-reliquary"),
    ("03-six-player-board", "six-operatives", "heraldic-reliquary"),
    ("04-two-one-sector", "two-operatives", "heraldic-reliquary"),
    ("05-six-one-sector", "six-operatives", "heraldic-reliquary"),
    ("06-active-operative", "active-operative", "heraldic-reliquary"),
    ("07-handoff", "handoff", "heraldic-reliquary"),
    ("08-movement-start", "movement", "heraldic-reliquary"),
    ("09-intermediate-movement", "movement", "heraldic-reliquary"),
    ("10-cross-ring", "cross-ring", "heraldic-reliquary"),
    ("11-arrival", "arrival", "heraldic-reliquary"),
    ("12-encounter-transition", "encounter-transition", "heraldic-reliquary"),
    ("13-missing-portrait", "missing-portrait", "heraldic-reliquary"),
    ("14-long-names", "long-names", "heraldic-reliquary"),
    ("15-bright-sector", "bright-sector", "heraldic-reliquary"),
    ("16-dark-sector", "dark-sector", "heraldic-reliquary"),
    ("17-reduced-motion", "reduced-motion", "heraldic-reliquary"),
    ("18-victory-background", "victory-background", "heraldic-reliquary"),
    ("19-defeat-background", "defeat-background", "heraldic-reliquary"),
    ("20-option-a", "six-operatives", "heraldic-reliquary"),
    ("21-option-b", "six-operatives", "operative-bust"),
    ("22-selected-production", "six-operatives", "heraldic-reliquary"),
]
FLOW_RECORDINGS = [
    ("01-turn-handoff", ["active-operative", "handoff"]),
    ("02-short-movement", ["movement", "arrival"]),
    ("03-long-movement", ["movement", "movement", "arrival"]),
    ("04-cross-ring-movement", ["movement", "cross-ring", "arrival"]),
    ("05-arrival", ["movement", "arrival", "encounter-transition"]),
    ("06-multi-operative-formation", ["one-operative", "two-operatives", "three-operatives"]),
    ("07-six-player-sequence", ["six-operatives", "handoff", "six-operatives"]),
    ("08-reconnect-restoration", ["reconnect", "reconnect"]),
    ("09-reduced-motion-movement", ["reduced-motion", "arrival"]),
]


def post_json(path, body):
    request = urllib.request.Request(
        f"{API}{path}",
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.loads(response.read().decode("utf-8"))


def create_session():
    return post_json("/api/session/create", {
        "sessionMode": "single-player",
        "interactionMode": "co-op",
        "gameMode": "standard",
        "playerCount": 1,
    })


def capture_metrics(page, label):
    metrics = page.evaluate(
        """() => {
          const root = document.documentElement;
          const body = document.body;
          const pieces = [...document.querySelectorAll('[data-operative-piece]')];
          const rects = pieces.map((piece) => {
            const rect = piece.getBoundingClientRect();
            return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom };
          });
          let overlaps = 0;
          for (let i = 0; i < rects.length; i += 1) {
            for (let j = i + 1; j < rects.length; j += 1) {
              const a = rects[i], b = rects[j];
              const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.x, b.x));
              const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y));
              if (width * height > Math.min(a.width * a.height, b.width * b.height) * .72) overlaps += 1;
            }
          }
          return {
            viewport: { width: root.clientWidth, height: root.clientHeight },
            scroll: {
              width: Math.max(root.scrollWidth, body.scrollWidth),
              height: Math.max(root.scrollHeight, body.scrollHeight)
            },
            canvasCount: document.querySelectorAll('canvas').length,
            pieceCount: pieces.length,
            pieceRects: rects,
            escapedPieces: rects.filter((rect) => rect.x < 0 || rect.y < 0 || rect.right > root.clientWidth || rect.bottom > root.clientHeight).length,
            severeOverlaps: overlaps,
            environment: document.querySelector('.signal-theatre__environment-image')?.getAttribute('src') ?? null,
            legacyTileImages: [...document.images].filter((image) => image.src.includes('/assets/map/tiles/')).length,
            privateLeak: /seatToken|hostToken|private agenda|secret option/i.test(body.innerText)
          };
        }"""
    )
    if metrics["scroll"]["width"] > metrics["viewport"]["width"]:
        raise RuntimeError(f"{label}: horizontal overflow {metrics}")
    if metrics["scroll"]["height"] > metrics["viewport"]["height"]:
        raise RuntimeError(f"{label}: vertical overflow {metrics}")
    if metrics["canvasCount"] != 0:
        raise RuntimeError(f"{label}: canvas node found")
    if metrics["escapedPieces"] != 0:
        raise RuntimeError(f"{label}: piece escaped viewport {metrics}")
    if metrics["severeOverlaps"] != 0:
        raise RuntimeError(f"{label}: pieces overlap excessively {metrics}")
    if metrics["legacyTileImages"] != 0:
        raise RuntimeError(f"{label}: legacy tile art rendered")
    if metrics["privateLeak"]:
        raise RuntimeError(f"{label}: private/internal data leak")
    return metrics


def main():
    SCREENSHOTS.mkdir(parents=True, exist_ok=True)
    RECORDINGS.mkdir(parents=True, exist_ok=True)
    session = create_session()
    records = []
    console_errors = []
    flow_videos = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        phone_context = browser.new_context(viewport={"width": 390, "height": 844})
        phone = phone_context.new_page()
        phone.goto(f"{CLIENT}/?room={session['roomCode']}&resetAuth=1", wait_until="networkidle")
        phone.get_by_label("Player name").fill("P22 Host QA")
        phone.get_by_role("button", name="Join Game").click()
        phone.get_by_role("heading", name="Select operative").wait_for()
        phone.get_by_role("button", name="Bjornis").click()
        phone.get_by_role("heading", name="Choose Starting Mission").wait_for()
        phone.get_by_role("button", name="Select Mission").first.click()
        phone.get_by_role("button", name="Ready").click()

        tv_context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            record_video_dir=str(RECORDINGS),
            record_video_size={"width": 1920, "height": 1080},
        )
        tv_context.add_init_script(
            f"localStorage.setItem('ashen-reach-tv-host-token', {json.dumps(session['hostToken'])});"
        )
        tv = tv_context.new_page()
        tv.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
        tv.on("pageerror", lambda error: console_errors.append(str(error)))
        tv.goto(f"{CLIENT}/tv?room={session['roomCode']}", wait_until="networkidle")
        phone.get_by_role("button", name="Start Game").click()
        tv.get_by_test_id("signal-theatre-host").wait_for()

        for name, fixture, variant in CAPTURES:
            reduced = fixture == "reduced-motion"
            tv.emulate_media(reduced_motion="reduce" if reduced else "no-preference")
            variant_query = "operative-bust" if variant == "operative-bust" else "heraldic-reliquary"
            tv.goto(
                f"{CLIENT}/tv?room={session['roomCode']}&p22Fixture={fixture}&pieceVariant={variant_query}",
                wait_until="networkidle",
            )
            tv.get_by_test_id("signal-operative-formation").wait_for()
            tv.wait_for_timeout(220)
            for viewport_name, width, height in VIEWPORTS:
                tv.set_viewport_size({"width": width, "height": height})
                tv.wait_for_timeout(160)
                label = f"{name}-{viewport_name}"
                metrics = capture_metrics(tv, label)
                records.append({
                    "capture": name,
                    "fixture": fixture,
                    "variant": variant,
                    "viewport": viewport_name,
                    "metrics": metrics,
                })
                tv.screenshot(path=str(SCREENSHOTS / f"{label}.png"), full_page=False)

        # Restoration must remain stable and must not start a new journey.
        tv.goto(
            f"{CLIENT}/tv?room={session['roomCode']}&p22Fixture=reconnect",
            wait_until="networkidle",
        )
        before = tv.get_by_test_id("signal-theatre-host").get_attribute("data-motion-id")
        tv.reload(wait_until="networkidle")
        after = tv.get_by_test_id("signal-theatre-host").get_attribute("data-motion-id")
        if before != after or tv.locator(".operative-piece.is-moving").count() != 0:
            raise RuntimeError(f"Reconnect replayed presentation: {before} -> {after}")

        for flow_name, fixtures in FLOW_RECORDINGS:
            flow_dir = RECORDINGS / flow_name
            flow_dir.mkdir(parents=True, exist_ok=True)
            flow_context = browser.new_context(
                viewport={"width": 1920, "height": 1080},
                record_video_dir=str(flow_dir),
                record_video_size={"width": 1920, "height": 1080},
            )
            flow_context.add_init_script(
                f"localStorage.setItem('ashen-reach-tv-host-token', {json.dumps(session['hostToken'])});"
            )
            flow_page = flow_context.new_page()
            flow_page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
            flow_page.on("pageerror", lambda error: console_errors.append(str(error)))
            flow_video = flow_page.video
            for fixture in fixtures:
                reduced = fixture == "reduced-motion"
                flow_page.emulate_media(reduced_motion="reduce" if reduced else "no-preference")
                flow_page.goto(
                    f"{CLIENT}/tv?room={session['roomCode']}&p22Fixture={fixture}&pieceVariant=heraldic-reliquary",
                    wait_until="networkidle",
                )
                flow_page.get_by_test_id("signal-operative-formation").wait_for()
                flow_page.wait_for_timeout(760 if reduced else 1050)
                if flow_name == "08-reconnect-restoration":
                    flow_page.reload(wait_until="networkidle")
                    flow_page.wait_for_timeout(700)
            flow_context.close()
            flow_videos.append({
                "flow": flow_name,
                "fixtures": fixtures,
                "path": flow_video.path() if flow_video else None,
            })

        video = tv.video
        tv_context.close()
        phone_context.close()
        browser.close()
        video_path = video.path() if video else None

    if console_errors:
        raise RuntimeError("Browser console errors:\n" + "\n".join(console_errors))

    OUTPUT.joinpath("p22-browser-metrics.json").write_text(
        json.dumps({
            "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
            "records": records,
            "consoleErrors": console_errors,
            "video": video_path,
            "flowVideos": flow_videos,
        }, indent=2),
        encoding="utf-8",
    )
    print(json.dumps({
        "screenshots": len(records),
        "captures": len(CAPTURES),
        "consoleErrors": 0,
        "output": str(OUTPUT),
        "video": video_path,
        "flowVideos": len(flow_videos),
    }, indent=2))


if __name__ == "__main__":
    main()
