import json
import os
import pathlib
import time
import urllib.request

from playwright.sync_api import sync_playwright


ROOT = pathlib.Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "reports" / "ui" / "signal-sector-resolution"
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
    ("01-battle-ready", "battle-ready", None, False),
    ("02-battle-rolling", "battle-rolling", None, False),
    ("03-battle-success", "battle-success", None, False),
    ("04-battle-failure", "battle-failure", None, False),
    ("05-challenge-ready", "challenge-ready", None, False),
    ("06-challenge-rolling", "challenge-rolling", None, False),
    ("07-challenge-success", "challenge-success", None, False),
    ("08-challenge-failure", "challenge-failure", None, False),
    ("09-private-wait", "private-wait", None, False),
    ("10-reconnect", "reconnect", None, False),
    ("11-six-player-battle", "battle-success", "six-operatives", False),
    ("12-reduced-motion", "challenge-success", None, True),
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


def fixture_url(room_code, fixture, p22_fixture=None):
    p22 = f"&p22Fixture={p22_fixture}" if p22_fixture else ""
    return f"{CLIENT}/tv?room={room_code}&resolutionFixture={fixture}{p22}"


def capture_metrics(page, label, expected_fixture):
    metrics = page.evaluate(
        """() => {
          const root = document.documentElement;
          const body = document.body;
          const resolution = document.querySelector('[data-testid="signal-sector-resolution"]');
          const rect = resolution?.getBoundingClientRect() ?? null;
          const actionCoin = document.querySelector('[data-signal-action-coin]');
          const actionCoinRect = actionCoin?.getBoundingClientRect() ?? null;
          return {
            viewport: { width: root.clientWidth, height: root.clientHeight },
            scroll: {
              width: Math.max(root.scrollWidth, body.scrollWidth),
              height: Math.max(root.scrollHeight, body.scrollHeight)
            },
            resolutionMode: resolution?.getAttribute('data-resolution-mode') ?? null,
            resolutionStage: resolution?.getAttribute('data-resolution-stage') ?? null,
            restored: resolution?.getAttribute('data-resolution-restored') ?? null,
            resolutionRect: rect ? {
              x: rect.x, y: rect.y, width: rect.width, height: rect.height,
              right: rect.right, bottom: rect.bottom
            } : null,
            canvasCount: document.querySelectorAll('canvas').length,
            operativeArtwork: document.querySelectorAll('.signal-sector-resolution__portrait--operative img').length,
            oppositionArtwork: document.querySelectorAll('.signal-sector-resolution__portrait--opposition img').length,
            totalCount: document.querySelectorAll('.signal-sector-resolution__total').length,
            actionCoinCount: document.querySelectorAll('[data-signal-action-coin]').length,
            actionCoinKind: actionCoin?.getAttribute('data-signal-action-coin') ?? null,
            actionCoinRect: actionCoinRect ? {
              x: actionCoinRect.x, y: actionCoinRect.y,
              right: actionCoinRect.right, bottom: actionCoinRect.bottom
            } : null,
            arithmeticDetailPanels: document.querySelectorAll('.signal-sector-resolution__side, .signal-sector-resolution__modifiers').length,
            pieceLayerOpacity: getComputedStyle(document.querySelector('.signal-theatre__pieces')).opacity,
            legacyBattle: document.querySelectorAll('[data-testid="signal-theatre-battle"]').length,
            privateLeak: /Secret Alpha|Secret Beta|seatToken|hostToken|private agenda/i.test(body.innerText),
            publicStateLabel: document.querySelector('.signal-sector-resolution__outcome-copy > span')?.textContent?.trim() ?? null
          };
        }"""
    )
    if metrics["scroll"]["width"] > metrics["viewport"]["width"]:
        raise RuntimeError(f"{label}: horizontal overflow {metrics}")
    if metrics["scroll"]["height"] > metrics["viewport"]["height"]:
        raise RuntimeError(f"{label}: vertical overflow {metrics}")
    if not metrics["resolutionRect"]:
        raise RuntimeError(f"{label}: resolution surface missing")
    if metrics["canvasCount"] != 0:
        raise RuntimeError(f"{label}: canvas node found")
    if metrics["operativeArtwork"] != 1 or metrics["oppositionArtwork"] != 1:
        raise RuntimeError(f"{label}: portrait pairing incomplete {metrics}")
    if metrics["totalCount"] != 2:
        raise RuntimeError(f"{label}: expected exactly two totals {metrics}")
    expected_coin = "signal" if "challenge" in expected_fixture else "grit"
    if metrics["actionCoinCount"] != 1 or metrics["actionCoinKind"] != expected_coin:
        raise RuntimeError(f"{label}: action-aware challenge coin missing {metrics}")
    coin_rect = metrics["actionCoinRect"]
    if (
        not coin_rect
        or coin_rect["x"] < 0
        or coin_rect["y"] < 0
        or coin_rect["right"] > metrics["viewport"]["width"]
        or coin_rect["bottom"] > metrics["viewport"]["height"]
    ):
        raise RuntimeError(f"{label}: action coin escaped viewport {metrics}")
    if metrics["arithmeticDetailPanels"] != 0:
        raise RuntimeError(f"{label}: detailed arithmetic panel returned")
    if metrics["pieceLayerOpacity"] != "0":
        raise RuntimeError(f"{label}: chess-piece layer competes with portrait reveal")
    if metrics["legacyBattle"] != 0:
        raise RuntimeError(f"{label}: legacy battle panel rendered")
    if metrics["privateLeak"]:
        raise RuntimeError(f"{label}: private/internal data leak")
    if metrics["publicStateLabel"] not in {"Authoritative result", "Resolution in progress"}:
        raise RuntimeError(f"{label}: public state label missing")
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
        phone.get_by_label("Player name").fill("Sector Answers QA")
        phone.get_by_role("button", name="Join Game").click()
        phone.get_by_role("heading", name="Select operative").wait_for()
        phone.get_by_role("button", name="Bjornis").click()
        phone.get_by_role("heading", name="Choose Starting Contract").wait_for()
        phone.get_by_role("button", name="Select Contract").first.click()
        phone.get_by_role("button", name="Ready").click()

        tv_context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            record_video_dir=str(RECORDINGS / "review"),
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

        for name, fixture, p22_fixture, reduced in CAPTURES:
            tv.emulate_media(reduced_motion="reduce" if reduced else "no-preference")
            tv.goto(fixture_url(session["roomCode"], fixture, p22_fixture), wait_until="networkidle")
            tv.get_by_test_id("signal-sector-resolution").wait_for()
            tv.wait_for_timeout(180)
            for viewport_name, width, height in VIEWPORTS:
                tv.set_viewport_size({"width": width, "height": height})
                tv.wait_for_timeout(120)
                label = f"{name}-{viewport_name}"
                metrics = capture_metrics(tv, label, fixture)
                records.append({
                    "capture": name,
                    "fixture": fixture,
                    "viewport": viewport_name,
                    "reducedMotion": reduced,
                    "metrics": metrics,
                })
                tv.screenshot(path=str(SCREENSHOTS / f"{label}.png"), full_page=False)

        reconnect_context = browser.new_context(viewport={"width": 1600, "height": 900})
        reconnect_context.add_init_script(
            f"localStorage.setItem('ashen-reach-tv-host-token', {json.dumps(session['hostToken'])});"
        )
        reconnect_page = reconnect_context.new_page()
        reconnect_page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
        reconnect_page.on("pageerror", lambda error: console_errors.append(str(error)))
        reconnect_page.goto(fixture_url(session["roomCode"], "battle-ready"), wait_until="networkidle")
        first_restored = reconnect_page.get_by_test_id("signal-sector-resolution").get_attribute("data-resolution-restored")
        reconnect_page.wait_for_timeout(950)
        reconnect_page.reload(wait_until="networkidle")
        second_restored = reconnect_page.get_by_test_id("signal-sector-resolution").get_attribute("data-resolution-restored")
        if first_restored != "false" or second_restored != "true":
            raise RuntimeError(f"Resolution replay suppression failed: {first_restored} -> {second_restored}")
        reconnect_context.close()

        for flow_name, fixtures in [
            ("battle-flow", ["battle-ready", "battle-rolling", "battle-success"]),
            ("tile-challenge-flow", ["challenge-ready", "challenge-rolling", "challenge-failure"]),
        ]:
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
                flow_page.goto(fixture_url(session["roomCode"], fixture), wait_until="networkidle")
                flow_page.get_by_test_id("signal-sector-resolution").wait_for()
                flow_page.wait_for_timeout(900)
            flow_context.close()
            flow_videos.append({
                "flow": flow_name,
                "fixtures": fixtures,
                "path": flow_video.path() if flow_video else None,
            })

        review_video = tv.video
        tv_context.close()
        phone_context.close()
        browser.close()
        review_video_path = review_video.path() if review_video else None

    if console_errors:
        raise RuntimeError("Browser console errors:\n" + "\n".join(console_errors))

    OUTPUT.joinpath("browser-metrics.json").write_text(
        json.dumps({
            "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
            "records": records,
            "consoleErrors": console_errors,
            "reviewVideo": review_video_path,
            "flowVideos": flow_videos,
        }, indent=2),
        encoding="utf-8",
    )
    print(json.dumps({
        "screenshots": len(records),
        "captures": len(CAPTURES),
        "consoleErrors": 0,
        "output": str(OUTPUT),
        "flowVideos": len(flow_videos),
    }, indent=2))


if __name__ == "__main__":
    main()
