import json
import os
from pathlib import Path
from urllib.request import Request, urlopen

from playwright.sync_api import Page, sync_playwright


API = os.environ.get("ASHEN_REACH_API_ORIGIN", "http://127.0.0.1:8080")
CLIENT = os.environ.get("ASHEN_REACH_CLIENT_ORIGIN", "http://127.0.0.1:5173")
OUTPUT = Path("reports/ui/single-player-movement")


def post_json(path: str, payload: dict) -> dict:
    request = Request(
        f"{API}{path}",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urlopen(request, timeout=20) as response:
        return json.loads(response.read().decode("utf-8"))


def assert_no_overflow(page: Page, label: str) -> None:
    overflow = page.evaluate(
        "Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth"
    )
    if overflow > 1:
        raise RuntimeError(f"{label}: horizontal overflow {overflow}px")


def capture(page: Page, name: str) -> None:
    page.wait_for_function("Array.from(document.images).every((image) => image.complete)")
    assert_no_overflow(page, name)
    page.screenshot(path=str(OUTPUT / name), full_page=False)


def first_visible_button(page: Page, patterns: list[str]):
    for pattern in patterns:
        button = page.get_by_role("button", name=pattern)
        if button.count() and button.first.is_visible():
            return button.first
    return None


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    browser_errors: list[str] = []
    session = post_json(
        "/api/session/create",
        {
            "sessionMode": "single-player",
            "interactionMode": "co-op",
            "gameMode": "standard",
            "playerCount": 1,
        },
    )

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        phone = browser.new_page(viewport={"width": 390, "height": 844})
        phone.on("console", lambda message: browser_errors.append(message.text) if message.type == "error" else None)
        phone.on("pageerror", lambda error: browser_errors.append(str(error)))
        phone.goto(f"{CLIENT}/?room={session['roomCode']}&resetAuth=1")
        phone.wait_for_load_state("networkidle")
        capture(phone, "01-single-player-join-390x844.png")
        phone.get_by_label("Player name").fill("Solo QA")
        phone.get_by_role("button", name="Join Game").click()
        phone.get_by_role("heading", name="Select operative").wait_for()
        capture(phone, "02-character-selection-390x844.png")
        phone.get_by_role("button", name="Bjornis").click()
        phone.get_by_role("heading", name="Choose Starting Mission").wait_for()
        phone.get_by_role("button", name="Select Mission").first.click()
        phone.get_by_role("button", name="Ready").click()

        tv = browser.new_page(viewport={"width": 1920, "height": 1080})
        tv.on("console", lambda message: browser_errors.append(message.text) if message.type == "error" else None)
        tv.on("pageerror", lambda error: browser_errors.append(str(error)))
        tv.add_init_script(
            script=(
                f"localStorage.setItem('ashen-reach-tv-room-code', {json.dumps(session['roomCode'])});"
                f"localStorage.setItem('ashen-reach-tv-host-token', {json.dumps(session['hostToken'])});"
            )
        )
        tv.goto(f"{CLIENT}/tv?room={session['roomCode']}")
        tv.wait_for_load_state("networkidle")

        phone.get_by_role("button", name="Start Game").click()
        roll = phone.get_by_role("button", name="Roll movement")
        roll.wait_for()
        capture(phone, "03-first-movement-prompt-390x844.png")
        for width, height in [(360, 800), (412, 915)]:
            phone.set_viewport_size({"width": width, "height": height})
            capture(phone, f"03-first-movement-prompt-{width}x{height}.png")
        phone.set_viewport_size({"width": 390, "height": 844})
        capture(tv, "03-tv-first-navigation-1920x1080.png")

        roll.click()
        phone.locator("[data-testid='movement-destination']").first.wait_for()
        capture(phone, "04-legal-destinations-390x844.png")
        phone.locator(".phone-move-option-a__select:not(:disabled)").first.click()
        confirm = phone.get_by_test_id("movement-primary-action")
        confirm.wait_for()
        capture(phone, "05-destination-selected-390x844.png")
        confirm.click()
        phone.wait_for_timeout(250)
        capture(phone, "06-movement-confirmed-390x844.png")
        capture(tv, "06-tv-movement-animation-1920x1080.png")
        tv.set_viewport_size({"width": 1440, "height": 900})
        capture(tv, "06-tv-movement-animation-1440x900.png")
        tv.set_viewport_size({"width": 1280, "height": 720})
        capture(tv, "06-tv-movement-animation-1280x720.png")

        for _ in range(16):
            if phone.get_by_role("button", name="Roll movement").count() and phone.get_by_role("button", name="Roll movement").first.is_visible():
                break
            action = first_visible_button(
                phone,
                ["Continue", "End Turn", "Finish Turn", "Skip Shop", "Leave Shop"],
            )
            if action:
                action.click()
                phone.wait_for_timeout(80)
                continue
            phone.wait_for_timeout(120)

        auth = phone.evaluate("JSON.parse(localStorage.getItem('ashenreach.controllerSession') || 'null')")
        if auth:
            phone.evaluate(
                "auth => localStorage.setItem('ashenreach.controllerSession', JSON.stringify(auth))",
                auth,
            )
        phone.goto(f"{CLIENT}/?room={session['roomCode']}")
        phone.wait_for_load_state("networkidle")
        capture(phone, "07-phone-reconnected-authoritative-state-390x844.png")
        capture(tv, "07-tv-authoritative-state-1280x720.png")

        post_json(
            "/api/qa/phase1-fixture",
            {
                "roomCode": auth["roomCode"],
                "seatToken": auth["seatToken"],
                "fixture": {"kind": "phone-movement", "stage": "roll-required"},
            },
        )
        phone.get_by_role("button", name="Roll movement").wait_for()
        capture(phone, "08-second-movement-turn-390x844.png")
        capture(tv, "08-tv-second-movement-turn-1280x720.png")

        if browser_errors:
            raise RuntimeError("Browser errors:\n" + "\n".join(browser_errors))
        browser.close()

    print(json.dumps({"output": str(OUTPUT), "screenshots": 16, "browserErrors": 0}, indent=2))


if __name__ == "__main__":
    main()
