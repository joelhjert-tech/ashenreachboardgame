import json
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).parent
API = "http://127.0.0.1:8080"
CLIENT = "http://127.0.0.1:5184"
AUTH = {"roomCode":"TVUAZ","displayName":"Deterministic QA","seatId":"seat-1","seatToken":"seat:TVUAZ:seat-1:92a5c95c-98cf-42ed-8bdb-29cf9d5db474"}

def fixture(kind, stage):
    body = json.dumps({"roomCode":AUTH["roomCode"],"seatToken":AUTH["seatToken"],"fixture":{"kind":kind,"stage":stage}}).encode()
    req = urllib.request.Request(f"{API}/api/qa/phase1-fixture", data=body, headers={"Content-Type":"application/json"}, method="POST")
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read())

def open_phone(context):
    page = context.new_page()
    page.goto(f"{CLIENT}/?room={AUTH['roomCode']}&seat=seat-1", wait_until="networkidle")
    page.wait_for_timeout(500)
    tabs = page.get_by_role("button", name="Show Tabs")
    if tabs.count(): tabs.click()
    return page

def click_tab(page, name):
    page.get_by_role("tab", name=name.upper()).click()
    page.wait_for_timeout(250)

def move_to(context, target, label):
    page = open_phone(context)
    click_tab(page, "Move")
    row = page.locator(".phone-movement-row").filter(has_text=target)
    if not row.count():
        raise AssertionError(f"No movement row for {target}: {page.locator('body').inner_text()}")
    row.get_by_role("button", name="SELECT").click()
    page.get_by_role("button", name="Confirm Move").click()
    page.wait_for_timeout(1200)
    click_tab(page, "Quest")
    text = page.locator("body").inner_text()
    page.screenshot(path=str(ROOT / f"det-{label}.png"), full_page=True)
    page.close()
    return text

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width":390,"height":844})
    context.add_init_script(f"localStorage.setItem('ashenreach.controllerSession', JSON.stringify({json.dumps(AUTH)}))")
    results = {}

    fixture("route", "first")
    results["routeFirst"] = move_to(context, "Glass Signal Pier", "route-first")

    fixture("route", "duplicate")
    results["routeDuplicate"] = move_to(context, "Glass Signal Pier", "route-duplicate")

    fixture("route", "ordered-wrong")
    results["orderedWrong"] = move_to(context, "Anchor Market", "route-ordered-wrong")

    fixture("route", "final")
    results["routeFinal"] = move_to(context, "Sunken Pier", "route-final")

    fixture("route", "completion-ready")
    page = open_phone(context)
    click_tab(page, "Action")
    page.locator("summary").filter(has_text="CONTRACTS").click()
    complete = page.locator("button:visible").filter(has_text="Complete Echo Triangulation")
    results["routeCompleteButton"] = complete.count()
    if complete.count():
        complete.first.click()
        page.wait_for_timeout(900)
    results["routeCompleteAgain"] = page.locator("button:visible").filter(has_text="Complete Echo Triangulation").count()
    click_tab(page, "Inventory")
    results["inventoryAfterRoute"] = page.locator("body").inner_text()
    page.screenshot(path=str(ROOT / "det-route-completed-inventory.png"), full_page=True)
    click_tab(page, "Action")
    continued = page.locator("button:visible").filter(has_text="CONTINUE")
    if continued.count(): continued.first.click(); page.wait_for_timeout(500)
    contracts = page.locator("summary").filter(has_text="CONTRACTS")
    if contracts.count(): contracts.click()
    results["newMissionAfterRoute"] = page.locator("body").inner_text()
    page.close()

    fixture("shop", "wrong-shop")
    page = open_phone(context)
    click_tab(page, "Shop")
    results["wrongShop"] = page.locator("body").inner_text()
    page.close()

    fixture("shop", "valid-first")
    page = open_phone(context)
    click_tab(page, "Shop")
    results["validShopBefore"] = page.locator("body").inner_text()
    repair = page.locator("button").filter(has_text="Repair Gear")
    results["repairButtonFirst"] = repair.count()
    if repair.count():
        repair.first.click()
        page.wait_for_timeout(700)
    click_tab(page, "Quest")
    results["validShopAfterFirst"] = page.locator("body").inner_text()
    page.close()

    fixture("shop", "valid-final")
    page = open_phone(context)
    click_tab(page, "Shop")
    repair = page.locator("button").filter(has_text="Repair Gear")
    results["repairButtonFinal"] = repair.count()
    if repair.count():
        repair.first.click()
        page.wait_for_timeout(700)
    fixture("shop", "completion-ready")
    page.reload(wait_until="networkidle")
    tabs = page.get_by_role("button", name="Show Tabs")
    if tabs.count(): tabs.click()
    click_tab(page, "Action")
    page.locator("summary").filter(has_text="CONTRACTS").click()
    complete_shop = page.locator("button:visible").filter(has_text="Complete Foundry Proof Marks")
    results["shopCompleteButton"] = complete_shop.count()
    if complete_shop.count():
        complete_shop.first.click()
        page.wait_for_timeout(900)
    results["shopCompleteAgain"] = page.locator("button:visible").filter(has_text="Complete Foundry Proof Marks").count()
    click_tab(page, "Inventory")
    results["inventoryAfterShop"] = page.locator("body").inner_text()
    page.screenshot(path=str(ROOT / "det-shop-completed-inventory.png"), full_page=True)
    page.close()

    tv = browser.new_page(viewport={"width":1366,"height":768})
    tv.goto(f"{CLIENT}/tv?room={AUTH['roomCode']}", wait_until="networkidle")
    tv.wait_for_timeout(600)
    results["tvRoute"] = tv.locator("body").inner_text()
    results["tvOverflow"] = tv.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth")
    results["tvCanvas"] = tv.locator("canvas").count()
    tv.screenshot(path=str(ROOT / "det-tv-route-fixture.png"), full_page=True)
    tv.close()

    print(json.dumps(results, indent=2))
    browser.close()

