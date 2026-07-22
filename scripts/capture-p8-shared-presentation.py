"""Deterministic intermediate-viewport QA for the P8 presentation system."""

from __future__ import annotations

import json
import os
import time
import urllib.request
from pathlib import Path
from typing import Any

from playwright.sync_api import BrowserContext, Page, sync_playwright


API = os.environ.get("ASHEN_REACH_API_ORIGIN", "http://127.0.0.1:8080")
CLIENT = os.environ.get("ASHEN_REACH_CLIENT_ORIGIN", "http://127.0.0.1:5173")
OUTPUT = Path("docs/qa/p8-shared-presentation").resolve()
PHONE_VIEWPORT = {"width": 430, "height": 932}
TV_VIEWPORT = {"width": 1600, "height": 900}
records: list[dict[str, Any]] = []
console_errors: list[str] = []


def post(path: str, body: dict[str, Any]) -> dict[str, Any]:
    request = urllib.request.Request(
        f"{API}{path}",
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=15) as response:
        return json.loads(response.read().decode("utf-8"))


def watch(page: Page) -> None:
    page.on("console", lambda message: console_errors.append(f"{page.url}: {message.text}") if message.type == "error" else None)
    page.on("pageerror", lambda error: console_errors.append(f"{page.url}: {error}"))


def join_phone(page: Page, room_code: str, name: str, operative_name: str) -> dict[str, Any]:
    page.goto(f"{CLIENT}/?room={room_code}&resetAuth=1&qaNetworkControls=1", wait_until="networkidle")
    page.get_by_label("Player name").fill(name)
    page.get_by_role("button", name="Join Game").click()
    page.get_by_role("heading", name="Select operative").wait_for()
    page.get_by_role("button", name=operative_name).click()
    page.get_by_role("heading", name="Choose Starting Mission").wait_for()
    page.get_by_role("button", name="Select Mission").filter(visible=True).first.click()
    page.get_by_role("button", name="Ready").click()
    auth = page.evaluate("JSON.parse(localStorage.getItem('ashenreach.controllerSession') || 'null')")
    if not auth:
        raise RuntimeError(f"No controller authentication was stored for {name}")
    return auth


def seed(auth: dict[str, Any], kind: str, stage: str) -> None:
    post("/api/qa/phase1-fixture", {
        "roomCode": auth["roomCode"],
        "seatToken": auth["seatToken"],
        "fixture": {"kind": kind, "stage": stage},
    })
    time.sleep(0.35)


def open_tab(page: Page, tab: str) -> None:
    button = page.locator(f'button[data-tab="{tab}"]')
    if not button.is_visible():
        show_tabs = page.get_by_role("button", name="Show Tabs", exact=True)
        if show_tabs.is_visible():
            show_tabs.click()
    if button.is_visible():
        button.click()
        page.wait_for_timeout(120)


def capture(page: Page, surface: str, state: str) -> None:
    page.wait_for_timeout(250)
    page.evaluate("""
      () => {
        window.scrollTo(0, 0);
        document.querySelectorAll('.phone-portrait-scroll, .phone-action-content-root, .phone-sheet-actions')
          .forEach((element) => { element.scrollTop = 0; });
      }
    """)
    measurements = page.evaluate("""
      () => {
        const visible = (element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
        };
        const touchTargets = [...document.querySelectorAll('button:not([disabled]), [role="button"]')]
          .filter(visible)
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return { label: (element.getAttribute('aria-label') || element.textContent || '').trim().slice(0, 80), width: element.offsetWidth, height: element.offsetHeight };
          });
        const imageOverflow = [...document.images].filter(visible).flatMap((image) => {
          const parent = image.parentElement;
          if (!parent) return [];
          const parentStyle = getComputedStyle(parent);
          if (parentStyle.overflowX !== 'visible' && parentStyle.overflowY !== 'visible') return [];
          const imageRect = image.getBoundingClientRect();
          const parentRect = parent.getBoundingClientRect();
          const exceeds = imageRect.left < parentRect.left - 1 || imageRect.right > parentRect.right + 1 || imageRect.top < parentRect.top - 1 || imageRect.bottom > parentRect.bottom + 1;
          return exceeds ? [{ alt: image.alt, src: image.currentSrc.split('/').pop() }] : [];
        });
        return {
          rootWidth: document.documentElement.scrollWidth,
          bodyWidth: document.body.scrollWidth,
          viewportWidth: document.documentElement.clientWidth,
          touchTargets,
          imageOverflow,
          liveRegions: [...document.querySelectorAll('[aria-live]')].filter(visible).map((node) => (node.textContent || '').trim()).filter(Boolean),
          activeElement: document.activeElement?.textContent?.trim().slice(0, 100) || document.activeElement?.tagName || null,
        };
      }
    """)
    overflow = max(measurements["rootWidth"], measurements["bodyWidth"]) - measurements["viewportWidth"]
    if overflow > 0:
        raise RuntimeError(f"{surface}/{state} horizontally overflows by {overflow}px")
    if measurements["imageOverflow"]:
        raise RuntimeError(f"{surface}/{state} has image overflow: {measurements['imageOverflow']}")
    undersized = []
    if surface == "phone":
        undersized = [target for target in measurements["touchTargets"] if target["width"] < 43.5 or target["height"] < 43.5]
        if undersized:
            raise RuntimeError(f"{surface}/{state} has undersized touch targets: {undersized[:5]}")
    folder = OUTPUT / surface
    folder.mkdir(parents=True, exist_ok=True)
    viewport = page.viewport_size
    filename = f"{state}-{viewport['width']}x{viewport['height']}.png"
    page.screenshot(path=str(folder / filename), full_page=False)
    records.append({
        "surface": surface,
        "state": state,
        "file": filename,
        "viewport": f"{viewport['width']}x{viewport['height']}",
        "horizontalOverflow": overflow,
        "imageOverflow": measurements["imageOverflow"],
        "undersizedTouchTargets": undersized,
        "liveRegions": measurements["liveRegions"],
        "activeElement": measurements["activeElement"],
    })


def save_video(context: BrowserContext, page: Page, filename: str) -> None:
    video = page.video
    page.close()
    if video:
        video.save_as(str(OUTPUT / "recordings" / filename))
    context.close()


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    (OUTPUT / "recordings").mkdir(parents=True, exist_ok=True)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        session = post("/api/session/create", {
            "sessionMode": "multiplayer",
            "interactionMode": "co-op",
            "gameMode": "standard",
            "playerCount": 2,
        })
        owner_context = browser.new_context(viewport=PHONE_VIEWPORT, record_video_dir=str(OUTPUT / "recordings" / "raw-phone"), record_video_size=PHONE_VIEWPORT)
        guest_context = browser.new_context(viewport=PHONE_VIEWPORT)
        tv_context = browser.new_context(viewport=TV_VIEWPORT, record_video_dir=str(OUTPUT / "recordings" / "raw-tv"), record_video_size=TV_VIEWPORT)
        tv_context.add_init_script(script=f"localStorage.setItem('ashenreach-tv-host-token', {json.dumps(session['hostToken'])})")
        owner = owner_context.new_page()
        guest = guest_context.new_page()
        tv = tv_context.new_page()
        for page in (owner, guest, tv):
            watch(page)

        tv.goto(f"{CLIENT}/tv?room={session['roomCode']}", wait_until="networkidle")
        capture(tv, "tv", "lobby")

        owner.goto(f"{CLIENT}/?room={session['roomCode']}&resetAuth=1")
        owner.get_by_label("Player name").fill("P8Owner")
        owner.get_by_role("button", name="Join Game").click()
        owner.get_by_role("heading", name="Select operative").wait_for()
        capture(owner, "phone", "setup-selection")
        owner.get_by_role("button", name="Bjornis", exact=False).click()
        owner.get_by_role("heading", name="Choose Starting Mission").wait_for()
        owner.get_by_role("button", name="Select Mission").filter(visible=True).first.click()
        owner.get_by_role("button", name="Ready").click()
        auth = owner.evaluate("JSON.parse(localStorage.getItem('ashenreach.controllerSession') || 'null')")
        if not auth:
            raise RuntimeError("Owner authentication was not stored")
        join_phone(guest, session["roomCode"], "P8Guest", "Deepdale")
        owner.get_by_role("button", name="Start Game").click()
        owner.get_by_test_id("phone-required-action-shell").wait_for(timeout=10_000)

        states = [
            ("required-action", "phone-action", "free-action", None),
            ("movement-selection", "phone-movement", "four-routes", None),
            ("battle-comparison", "phone-battle", "battle-setup", None),
            ("battle-result", "phone-battle", "success", None),
            ("end-turn", "waiting-handoff", "end-turn", None),
            ("player-card", "inventory-player-card", "basic", "player"),
            ("relevant-now", "inventory-player-card", "battle", "inventory"),
            ("full-inventory", "inventory-player-card", "many", "inventory"),
            ("long-rules", "inventory-player-card", "long-copy", "inventory"),
            ("missing-art", "inventory-player-card", "missing-art", "inventory"),
            ("blocked-state", "inventory-player-card", "wrong-timing", "inventory"),
            ("shop-offer", "host-shop", "equipment", None),
            ("shop-result", "host-shop", "purchase-result", None),
        ]
        for name, kind, stage, tab in states:
            if kind == "inventory-player-card":
                seed(auth, "phone-action", "free-action")
            seed(auth, kind, stage)
            if tab:
                open_tab(owner, tab)
            capture(owner, "phone", name)

        host_states = [
            ("movement-markers", "phone-movement", "four-routes"),
            ("encounter-focus", "phone-battle", "encounter"),
            ("battle-comparison", "phone-battle", "battle-setup"),
            ("battle-result", "phone-battle", "success"),
            ("operative-handoff", "waiting-handoff", "handoff"),
            ("public-operative-summary", "inventory-player-card", "equipped"),
            ("missing-art-fallback", "inventory-player-card", "missing-art"),
        ]
        for name, kind, stage in host_states:
            if kind == "inventory-player-card":
                seed(auth, "phone-action", "free-action")
            seed(auth, kind, stage)
            capture(tv, "tv", name)

        owner.emulate_media(reduced_motion="reduce")
        tv.emulate_media(reduced_motion="reduce")
        seed(auth, "phone-action", "free-action")
        seed(auth, "inventory-player-card", "long-copy")
        open_tab(owner, "inventory")
        capture(owner, "phone", "reduced-motion")
        capture(tv, "tv", "reduced-motion")

        owner.emulate_media(reduced_motion="no-preference")
        tv.emulate_media(reduced_motion="no-preference")
        seed(auth, "host-shop", "equipment")
        capture(tv, "tv", "shop-overlay")

        owner.reload(wait_until="networkidle")
        capture(owner, "phone", "reconnecting-restored")
        tv.reload(wait_until="networkidle")
        capture(tv, "tv", "reconnecting-restored")

        owner.goto(f"{CLIENT}/?qaPresentation=p8&surface=phone", wait_until="networkidle")
        for viewport in ({"width": 360, "height": 800}, {"width": 390, "height": 844}, PHONE_VIEWPORT):
            owner.set_viewport_size(viewport)
            capture(owner, "phone", "shared-missing-art-and-long-copy")

        tv.goto(f"{CLIENT}/tv?qaPresentation=p8&surface=tv", wait_until="networkidle")
        for viewport in ({"width": 1366, "height": 768}, TV_VIEWPORT, {"width": 1920, "height": 1080}):
            tv.set_viewport_size(viewport)
            capture(tv, "tv", "shared-missing-art-and-long-copy")

        save_video(owner_context, owner, "cross-feature-phone-430x932.webm")
        guest.close()
        guest_context.close()
        save_video(tv_context, tv, "cross-feature-tv-1600x900.webm")
        browser.close()

    (OUTPUT / "capture-results.json").write_text(json.dumps({
        "captures": records,
        "consoleErrors": console_errors,
    }, indent=2), encoding="utf-8")
    if console_errors:
        raise RuntimeError("Browser console errors:\n" + "\n".join(console_errors))
    print(json.dumps({"output": str(OUTPUT), "screenshots": len(records), "consoleErrors": len(console_errors)}, indent=2))


if __name__ == "__main__":
    main()
