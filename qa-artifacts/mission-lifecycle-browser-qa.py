import json
import os
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright


API = os.environ.get("QA_API", "http://127.0.0.1:8080")
CLIENT = os.environ.get("QA_CLIENT", "http://127.0.0.1:5173")
OUT = Path("qa-artifacts")


def post(path, payload):
    request = urllib.request.Request(
        API + path,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request) as response:
        return json.load(response)


def seed(room_code, seat_token, count):
    return post("/api/qa/phase1-fixture", {
        "roomCode": room_code,
        "seatToken": seat_token,
        "fixture": {"kind": "relic-trade", "completedContracts": count},
    })


def body_text(page):
    return page.locator("body").inner_text()


created = post("/api/session/create", {
    "sessionMode": "single-player",
    "gameMode": "standard",
    "interactionMode": "co-op",
    "playerCount": 1,
})
joined = post("/api/session/join", {
    "roomCode": created["roomCode"],
    "displayName": "Lifecycle QA",
    "characterId": "void-marshal",
})
auth = {
    "roomCode": created["roomCode"],
    "seatId": joined["seatId"],
    "seatToken": joined["seatToken"],
    "displayName": "Lifecycle QA",
}

errors = []
result = {"roomCode": created["roomCode"]}

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 390, "height": 844})
    phone = context.new_page()
    phone.on("console", lambda msg: errors.append(f"phone console {msg.type}: {msg.text}") if msg.type == "error" else None)
    phone.on("pageerror", lambda error: errors.append(f"phone pageerror: {error}"))
    phone.goto(CLIENT)
    phone.evaluate("auth => localStorage.setItem('ashenreach.controllerSession', JSON.stringify(auth))", auth)
    phone.reload(wait_until="networkidle")
    phone.get_by_role("button", name="Select Mission").first.click()
    phone.get_by_role("button", name="Ready", exact=True).click()
    phone.get_by_role("button", name="Start Game", exact=True).click()
    phone.get_by_role("button", name="Show Tabs", exact=True).click()
    phone.locator('[data-tab="shop"]').wait_for(timeout=15000)

    tv_context = browser.new_context(viewport={"width": 1366, "height": 768})
    tv = tv_context.new_page()
    tv.on("console", lambda msg: errors.append(f"tv console {msg.type}: {msg.text}") if msg.type == "error" else None)
    tv.on("pageerror", lambda error: errors.append(f"tv pageerror: {error}"))
    tv.goto(CLIENT + "/tv", wait_until="networkidle")

    seed(created["roomCode"], joined["seatToken"], 2)
    phone.locator('[data-tab="shop"]').click()
    phone.wait_for_timeout(500)
    trade = phone.get_by_role("button", name="Trade Missions for Artifact")
    trade.wait_for()
    result["twoBlocked"] = trade.is_disabled()
    result["phoneTwoText"] = body_text(phone)
    result["tvTwoText"] = body_text(tv)
    result["phoneShowsTwoOfThree"] = "2/3" in result["phoneTwoText"]
    result["tvShowsTwoOfThree"] = "2/3" in result["tvTwoText"]
    phone.screenshot(path=str(OUT / "mission-lifecycle-phone-2-of-3.png"), full_page=True)
    tv.screenshot(path=str(OUT / "mission-lifecycle-tv-2-of-3.png"), full_page=True)

    seed(created["roomCode"], joined["seatToken"], 3)
    phone.wait_for_timeout(500)
    trade = phone.get_by_role("button", name="Trade Missions for Artifact")
    result["threeEnabled"] = trade.is_enabled()
    trade.click()
    phone.wait_for_timeout(700)

    result["postTradeText"] = body_text(phone)
    result["tvPostTradeText"] = body_text(tv)
    result["repeatBlocked"] = phone.get_by_role("button", name="Trade Missions for Artifact").is_disabled()
    phone.locator('[data-tab="inventory"]').click()
    phone.wait_for_timeout(300)
    result["inventoryText"] = body_text(phone)
    result["artifactCountOne"] = "ARTIFACTS / RELICS\n1" in result["inventoryText"]
    result["tvShowsZeroOfThree"] = "0/3" in result["tvPostTradeText"]
    phone.screenshot(path=str(OUT / "mission-lifecycle-phone-artifact.png"), full_page=True)
    tv.screenshot(path=str(OUT / "mission-lifecycle-tv-post-trade.png"), full_page=True)
    result["phoneCanvasCount"] = phone.locator("canvas").count()
    result["tvCanvasCount"] = tv.locator("canvas").count()
    result["errors"] = errors
    for verbose_key in ("phoneTwoText", "tvTwoText", "postTradeText", "tvPostTradeText", "inventoryText"):
        result.pop(verbose_key, None)
    browser.close()

print(json.dumps(result))
