import json
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

API = "http://127.0.0.1:8080"
APP = "http://127.0.0.1:5173"
OUT = Path(__file__).parent


def post(path, payload):
    request = urllib.request.Request(
        API + path,
        data=json.dumps(payload).encode(),
        headers={"content-type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request) as response:
        return json.load(response)


def click_if(page, pattern):
    button = page.get_by_role("button", name=pattern)
    if button.count():
        button.first.click()
        return True
    return False


created = post("/api/session/create", {
    "sessionMode": "single-player",
    "gameMode": "standard",
    "scenarioId": "scenario_broken_seal",
})
joined = post("/api/session/join", {
    "roomCode": created["roomCode"],
    "displayName": "Battle Chamber QA",
    "characterId": "void-marshal",
    "seatId": "seat-1",
})

errors = []
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    phone_context = browser.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True)
    tv_context = browser.new_context(viewport={"width": 1366, "height": 768})
    phone = phone_context.new_page()
    tv = tv_context.new_page()
    for page in (phone, tv):
        page.on("console", lambda message: errors.append(f"console: {message.text}") if message.type == "error" else None)
        page.on("pageerror", lambda error: errors.append(f"page: {error}"))

    auth = {
        "roomCode": created["roomCode"],
        "seatId": joined["seatId"],
        "seatToken": joined["seatToken"],
        "displayName": "Battle Chamber QA",
    }
    phone.add_init_script(f"localStorage.setItem('ashenreach.controllerSession', {json.dumps(json.dumps(auth))})")
    phone.goto(f"{APP}/?room={created['roomCode']}", wait_until="networkidle")
    tv.goto(f"{APP}/tv", wait_until="networkidle")
    phone.get_by_role("button", name="Select mission").first.click()
    phone.get_by_role("button", name="Ready").click()
    phone.get_by_role("button", name="Start game").click()
    phone.wait_for_timeout(400)
    fixture = post("/api/qa/phase1-fixture", {
        "roomCode": created["roomCode"],
        "seatToken": joined["seatToken"],
        "fixture": {"kind": "movement-journey", "stage": "ashen-chapel", "withChoirLantern": True},
    })
    phone.wait_for_timeout(400)
    click_if(phone, "Show Tabs")
    phone.locator("button").filter(has_text="Move").last.click(force=True)
    chapel = phone.get_by_text("Ashen Chapel", exact=True).first
    chapel.wait_for()
    chapel.locator("xpath=ancestor::*[.//button[contains(normalize-space(.), 'Select')]][1]").get_by_role("button", name="Select").click()
    phone.get_by_role("button", name="Confirm Move").click()

    # The verified movement journey must complete before the destination test window.
    tv.get_by_test_id("tv-movement-journey").wait_for()
    tv.get_by_test_id("tv-host-battle-chamber").wait_for(timeout=8000)
    tv.screenshot(path=str(OUT / "01-arrival-test-resolving-1366x768.png"))

    # Continue the authored arrival test; Rift Whispers opens through normal sector flow.
    for _ in range(8):
        if "Rift Whispers" in phone.locator("body").inner_text():
            break
        click_if(phone, "Show Tabs")
        battle_tab = phone.locator("button").filter(has_text="Battle")
        if battle_tab.count():
            battle_tab.last.click(force=True)
        if not click_if(phone, "Continue"):
            phone.wait_for_timeout(300)
        else:
            phone.wait_for_timeout(450)

    tv.get_by_test_id("tv-host-battle-chamber").wait_for()
    tv.screenshot(path=str(OUT / "02-recurring-challenge-preparing-1366x768.png"))
    phone.screenshot(path=str(OUT / "02-recurring-challenge-phone-390x844.png"))

    # Commit the normal check action, then the staged roll, without synthetic state.
    attempt = phone.get_by_role("button", name="Attempt Signal check")
    if attempt.count():
        attempt.first.click()
        phone.wait_for_timeout(220)
        tv.screenshot(path=str(OUT / "03-check-staged-1366x768.png"))
    roll = phone.get_by_role("button", name="Roll check dice")
    if roll.count():
        roll.first.click()
    phone.wait_for_timeout(700)
    tv.screenshot(path=str(OUT / "04-check-resolved-1366x768.png"))

    tv.set_viewport_size({"width": 1280, "height": 720})
    tv.screenshot(path=str(OUT / "04a-check-resolved-1280x720.png"))
    tv.set_viewport_size({"width": 1440, "height": 900})
    tv.screenshot(path=str(OUT / "04b-check-resolved-1440x900.png"))

    # Reconstruct the authoritative active stage at a larger viewport and reload.
    tv.set_viewport_size({"width": 1920, "height": 1080})
    tv.screenshot(path=str(OUT / "05-check-resolved-1920x1080.png"))
    tv.reload(wait_until="networkidle")
    tv.get_by_test_id("tv-host-battle-chamber").wait_for()
    tv.screenshot(path=str(OUT / "06-reload-active-1920x1080.png"))

    # Reduced motion uses the same public stage without removing information.
    reduced_context = browser.new_context(viewport={"width": 1366, "height": 768}, reduced_motion="reduce")
    reduced_tv = reduced_context.new_page()
    reduced_tv.on("console", lambda message: errors.append(f"reduced console: {message.text}") if message.type == "error" else None)
    reduced_tv.goto(f"{APP}/tv", wait_until="networkidle")
    reduced_tv.get_by_test_id("tv-host-battle-chamber").wait_for()
    reduced_tv.screenshot(path=str(OUT / "07-reduced-motion-1366x768.png"))

    state = tv.evaluate("""() => ({
      chamber: !!document.querySelector('[data-testid="tv-host-battle-chamber"]'),
      boardHidden: document.querySelector('.tv-command-map-shell')?.getAttribute('aria-hidden') === 'true',
      boardInert: document.querySelector('.tv-command-map-shell')?.hasAttribute('inert') === true,
      operativesRail: !!document.querySelector('.tv-operatives-rail'),
      rightRail: !!document.querySelector('.tv-command-sidebar'),
      journey: !!document.querySelector('[data-testid="tv-movement-journey"]'),
      shop: !!document.querySelector('[data-testid="host-shop-overlay"]'),
      overflowX: document.documentElement.scrollWidth > innerWidth,
      overflowY: document.documentElement.scrollHeight > innerHeight,
      canvas: document.querySelectorAll('canvas').length,
      focus: document.activeElement?.getAttribute('data-testid') || document.activeElement?.tagName
    })""")
    result = {
        "roomCode": created["roomCode"],
        "fixture": fixture,
        "state": state,
        "errors": errors,
        "limitations": [
            "The authenticated fixture provides an arrival test and recurring anomaly challenge, not a deterministic enemy Threat failure.",
            "Success or failure is the authoritative random result; the fixture does not force dice."
        ],
    }
    (OUT / "result.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result, indent=2))
    browser.close()
