import json
import os
from pathlib import Path
from urllib.request import Request, urlopen

from playwright.sync_api import sync_playwright


API_ORIGIN = os.environ.get("ASHEN_REACH_API_ORIGIN", "http://127.0.0.1:8080")
CLIENT_ORIGIN = os.environ.get("ASHEN_REACH_CLIENT_ORIGIN", "http://127.0.0.1:5173")
OUTPUT = Path("reports/ui/mission-replacement")


def post(path: str, payload: dict) -> dict:
    request = Request(
        f"{API_ORIGIN}{path}",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urlopen(request, timeout=15) as response:
        return json.loads(response.read().decode("utf-8"))


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    session = post(
        "/api/session/create",
        {
            "sessionMode": "single-player",
            "interactionMode": "co-op",
            "gameMode": "standard",
            "playerCount": 1,
        },
    )
    room_code = session["roomCode"]
    console_errors: list[str] = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        phone = browser.new_page(viewport={"width": 390, "height": 844})
        phone.on(
            "console",
            lambda message: console_errors.append(message.text)
            if message.type == "error"
            else None,
        )
        phone.on("pageerror", lambda error: console_errors.append(str(error)))

        phone.goto(f"{CLIENT_ORIGIN}/?room={room_code}&resetAuth=1")
        phone.wait_for_load_state("networkidle")
        phone.get_by_label("Player name").fill("Playtester")
        phone.get_by_role("button", name="Join Game").click()
        phone.get_by_role("heading", name="Choose Piece").wait_for()
        phone.get_by_role("button", name="Continue to Operative").click()
        phone.get_by_role("heading", name="Choose Operative").wait_for()
        phone.locator(".phone-character-option").filter(visible=True).first.click()
        phone.get_by_role("heading", name="Choose Starting Contract").wait_for()
        phone.get_by_role("button", name="Select Contract").filter(visible=True).first.click()
        phone.get_by_role("button", name="Ready").click()
        start = phone.get_by_role("button", name="Start Game")
        start.wait_for()
        start.click()

        auth = phone.evaluate(
            "() => JSON.parse(localStorage.getItem('ashenreach.controllerSession') || 'null')"
        )
        if not auth:
            raise RuntimeError("Phone session credentials were not established")

        tv = browser.new_page(viewport={"width": 1920, "height": 1080})
        tv.on(
            "console",
            lambda message: console_errors.append(message.text)
            if message.type == "error"
            else None,
        )
        tv.on("pageerror", lambda error: console_errors.append(str(error)))
        tv.goto(f"{CLIENT_ORIGIN}/tv?room={room_code}")
        tv.wait_for_load_state("networkidle")
        tv.get_by_test_id("signal-theatre-host").wait_for()

        post(
            "/api/qa/phase1-fixture",
            {
                "roomCode": auth["roomCode"],
                "seatToken": auth["seatToken"],
                "fixture": {"kind": "objective-presentation", "stage": "replacement"},
            },
        )

        phone_dialog = phone.get_by_test_id("phone-mission-replacement")
        tv_window = tv.get_by_test_id("signal-mission-selection")
        phone_dialog.wait_for(timeout=10_000)
        tv_window.wait_for(timeout=10_000)
        phone.wait_for_timeout(900)
        tv.wait_for_timeout(900)

        phone.screenshot(path=str(OUTPUT / "phone-mission-replacement-390x844.png"))
        tv.screenshot(path=str(OUTPUT / "tv-mission-replacement-1920x1080.png"))
        tv.set_viewport_size({"width": 1366, "height": 768})
        tv.wait_for_timeout(180)
        tv.screenshot(path=str(OUTPUT / "tv-mission-replacement-1366x768.png"))

        phone_metrics = phone.evaluate(
            """() => ({
                overflowX: Math.max(
                    document.body.scrollWidth,
                    document.documentElement.scrollWidth
                ) - document.documentElement.clientWidth,
                canvasCount: document.querySelectorAll('canvas').length,
                offerCount: document.querySelectorAll('.phone-mission-offer').length,
                dialogCount: document.querySelectorAll('[role="dialog"]').length,
                navigationCount: document.querySelectorAll('nav').length,
                optionNames: Array.from(
                    document.querySelectorAll('.phone-mission-offer h2')
                ).map((node) => node.textContent?.trim()).filter(Boolean)
            })"""
        )
        tv_metrics = tv.evaluate(
            """() => ({
                overflowX: Math.max(
                    document.body.scrollWidth,
                    document.documentElement.scrollWidth
                ) - document.documentElement.clientWidth,
                canvasCount: document.querySelectorAll('canvas').length,
                dossierCount: document.querySelectorAll(
                    '.signal-theatre__mission-dossiers article'
                ).length,
                text: document.querySelector(
                    '[data-testid="signal-mission-selection"]'
                )?.textContent || ''
            })"""
        )

        leaked_options = [
            name for name in phone_metrics["optionNames"] if name in tv_metrics["text"]
        ]
        results = {
            "phone": {
                key: value
                for key, value in phone_metrics.items()
                if key != "optionNames"
            },
            "tv": {key: value for key, value in tv_metrics.items() if key != "text"},
            "privateOptionNamesOnTv": leaked_options,
            "consoleErrors": console_errors,
        }
        (OUTPUT / "capture-results.json").write_text(
            json.dumps(results, indent=2) + "\n", encoding="utf-8"
        )

        if phone_metrics["overflowX"] != 0 or tv_metrics["overflowX"] != 0:
            raise RuntimeError(f"Horizontal overflow detected: {results}")
        if phone_metrics["offerCount"] > 3 or phone_metrics["offerCount"] == 0:
            raise RuntimeError(f"Unexpected phone offer count: {results}")
        if phone_metrics["dialogCount"] != 1 or phone_metrics["navigationCount"] != 0:
            raise RuntimeError(f"Phone replacement window is not isolated: {results}")
        if tv_metrics["dossierCount"] != 3 or leaked_options:
            raise RuntimeError(f"TV mission presentation is not public-safe: {results}")
        if console_errors:
            raise RuntimeError(f"Browser errors detected: {results}")

        browser.close()
        print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
