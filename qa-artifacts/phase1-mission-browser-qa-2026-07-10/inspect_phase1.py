import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).parent
CLIENT = "http://127.0.0.1:5183"
AUTH = {
    "roomCode": "I7AKP",
    "seatId": "seat-1",
    "seatToken": "seat:I7AKP:seat-1:ef98321e-affa-4586-b911-eba7fb7fb4b5",
    "displayName": "Phase One QA",
}

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    phone = browser.new_page(viewport={"width": 390, "height": 844})
    phone.add_init_script(f"localStorage.setItem('ashenreach.controllerSession', JSON.stringify({json.dumps(AUTH)}))")
    phone_errors = []
    phone.on("console", lambda msg: phone_errors.append(f"console:{msg.type}:{msg.text}") if msg.type == "error" else None)
    phone.on("pageerror", lambda exc: phone_errors.append(f"page:{exc}"))
    phone.goto(f"{CLIENT}/?room=I7AKP&seat=seat-1", wait_until="networkidle")
    phone.wait_for_timeout(1500)
    phone.screenshot(path=str(ROOT / "phone-initial-route-mission.png"), full_page=True)
    phone.get_by_role("button", name="Show Tabs").click()
    phone.wait_for_timeout(300)
    expanded_buttons = phone.get_by_role("button").all_inner_texts()
    quest_button = phone.locator("button").filter(has_text="QUEST")
    if quest_button.count():
        quest_button.last.click()
        phone.wait_for_timeout(300)
        phone.screenshot(path=str(ROOT / "phone-route-mission-quest.png"), full_page=True)
    quest_text = phone.locator("body").inner_text()
    move_button = phone.locator("button").filter(has_text="MOVE")
    if move_button.count():
        move_button.last.click()
        phone.wait_for_timeout(300)
    move_buttons = phone.get_by_role("button").all_inner_texts()
    move_text = phone.locator("body").inner_text()
    rolled_text = ""
    rolled_buttons = []
    selected_text = ""
    confirmed_text = ""
    resolution_text = ""
    resolution_buttons = []
    roll = phone.get_by_role("button", name="Roll Movement")
    if roll.count():
        roll.click()
        phone.wait_for_timeout(1800)
        rolled_text = phone.locator("body").inner_text()
        rolled_buttons = phone.get_by_role("button").all_inner_texts()
        phone.screenshot(path=str(ROOT / "phone-route-after-roll.png"), full_page=True)
    selects = phone.get_by_role("button", name="SELECT")
    if selects.count():
        selects.first.click()
        phone.wait_for_timeout(500)
        selected_text = phone.locator("body").inner_text()
        confirm = phone.get_by_role("button", name="Confirm Move")
        if confirm.count():
            confirm.click()
            phone.wait_for_timeout(2500)
            confirmed_text = phone.locator("body").inner_text()
            phone.screenshot(path=str(ROOT / "phone-route-after-confirm.png"), full_page=True)
    battle_button = phone.locator("button").filter(has_text="BATTLE")
    if battle_button.count():
        battle_button.last.click()
        phone.wait_for_timeout(500)
        resolution_text = phone.locator("body").inner_text()
        resolution_buttons = phone.get_by_role("button").all_inner_texts()

    tv = browser.new_page(viewport={"width": 1366, "height": 768})
    tv_errors = []
    tv.on("console", lambda msg: tv_errors.append(f"console:{msg.type}:{msg.text}") if msg.type == "error" else None)
    tv.on("pageerror", lambda exc: tv_errors.append(f"page:{exc}"))
    tv.goto(f"{CLIENT}/tv?room=I7AKP", wait_until="networkidle")
    tv.wait_for_timeout(1500)
    tv.screenshot(path=str(ROOT / "tv-route-after-roll.png"), full_page=True)

    result = {
        "phoneText": phone.locator("body").inner_text(),
        "phoneButtons": phone.get_by_role("button").all_inner_texts(),
        "expandedButtons": expanded_buttons,
        "questText": quest_text,
        "moveButtons": move_buttons,
        "moveText": move_text,
        "rolledText": rolled_text,
        "rolledButtons": rolled_buttons,
        "selectedText": selected_text,
        "confirmedText": confirmed_text,
        "resolutionText": resolution_text,
        "resolutionButtons": resolution_buttons,
        "phoneErrors": phone_errors,
        "phoneScrollWidth": phone.evaluate("document.documentElement.scrollWidth"),
        "phoneClientWidth": phone.evaluate("document.documentElement.clientWidth"),
        "phoneCanvasCount": phone.locator("canvas").count(),
        "tvText": tv.locator("body").inner_text(),
        "tvErrors": tv_errors,
        "tvScrollWidth": tv.evaluate("document.documentElement.scrollWidth"),
        "tvClientWidth": tv.evaluate("document.documentElement.clientWidth"),
        "tvCanvasCount": tv.locator("canvas").count(),
    }
    print(json.dumps(result, indent=2))
    browser.close()
