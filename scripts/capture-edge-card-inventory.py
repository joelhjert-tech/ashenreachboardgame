from __future__ import annotations

import re
import os
from pathlib import Path

from playwright.sync_api import Page, sync_playwright


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "reports" / "ui" / "edge-card-inventory"
CLIENT_ORIGIN = os.environ.get("ASHEN_REACH_CLIENT_ORIGIN", "http://127.0.0.1:5173")
API_ORIGIN = os.environ.get("ASHEN_REACH_API_ORIGIN", "http://127.0.0.1:8080")


def start_single_player_game(page: Page) -> str:
    response = page.request.post(
        f"{API_ORIGIN}/api/session/create",
        data={
            "sessionMode": "single-player",
            "interactionMode": "co-op",
            "gameMode": "standard",
            "playerCount": 1,
        },
    )
    if not response.ok:
        raise RuntimeError(f"Session creation failed: {response.status} {response.text()}")
    room_code = response.json()["roomCode"]

    page.goto(f"{CLIENT_ORIGIN}/?room={room_code}&resetAuth=1", wait_until="networkidle")
    page.get_by_label("Player name").fill("Edge Auditor")
    page.get_by_role("button", name="Join Game").click()
    page.get_by_role("heading", name="Choose Piece").wait_for()
    page.get_by_role("button", name="Continue to Operative").click()
    page.get_by_role("heading", name="Choose Operative").wait_for()
    page.get_by_role("button", name=re.compile("Bjornis", re.IGNORECASE)).click()
    page.get_by_role("heading", name="Choose Starting Contract").wait_for()
    page.get_by_role("button", name="Select Contract").first.click()

    for _ in range(2):
        choice = page.get_by_role(
            "button", name=re.compile(r"^Choose (Equipment|Follower)$", re.IGNORECASE)
        )
        choice.first.wait_for()
        choice.first.click()

    ready = page.get_by_role("button", name="Ready", exact=True)
    ready.wait_for()
    ready.click()
    start = page.get_by_role("button", name="Start Game", exact=True)
    if start.is_visible():
        start.click()
    return room_code


def open_inventory(page: Page) -> None:
    show_tabs = page.get_by_role("button", name="Show Tabs", exact=True)
    if show_tabs.is_visible():
        show_tabs.click()
    inventory = page.get_by_role("tab", name="Inventory", exact=True)
    inventory.wait_for()
    inventory.click()


def capture() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    errors: list[str] = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 390, "height": 844})
        page.on(
            "console",
            lambda message: errors.append(message.text)
            if message.type == "error"
            else None,
        )
        page.on("pageerror", lambda error: errors.append(str(error)))

        room_code = start_single_player_game(page)
        open_inventory(page)

        edge_label = page.locator(".phone-inventory-group-label", has_text="Edge Cards")
        edge_label.wait_for()
        toggle = edge_label.locator("xpath=ancestor::button")
        if toggle.get_attribute("aria-expanded") != "true":
            toggle.click()
        page.get_by_label("Private Edge Card hand").wait_for()
        toggle.scroll_into_view_if_needed()

        metrics = page.evaluate(
            """() => {
                const edgeLabel = [...document.querySelectorAll('.phone-inventory-group-label')]
                    .find((element) => element.textContent?.trim() === 'Edge Cards');
                const edgeGroup = edgeLabel?.closest('.phone-inventory-group');
                const edgeIcon = edgeGroup?.querySelector('.phone-inventory-group-icon');
                const mainContent = document.querySelector('.phone-controller-content');
                return {
                    width: window.innerWidth,
                    horizontalOverflow:
                        document.documentElement.scrollWidth > document.documentElement.clientWidth,
                    canvasCount: document.querySelectorAll('canvas').length,
                    categoryCount: document.querySelectorAll('.phone-inventory-group').length,
                    openCategoryCount: document.querySelectorAll('.phone-inventory-group.is-open').length,
                    edgeExpanded:
                        edgeGroup?.querySelector('.phone-inventory-group-toggle')?.getAttribute('aria-expanded'),
                    edgeIconLoaded:
                        edgeIcon instanceof HTMLImageElement &&
                        edgeIcon.complete &&
                        edgeIcon.naturalWidth > 0,
                    mainContentOverflow:
                        mainContent instanceof HTMLElement
                            ? mainContent.scrollWidth > mainContent.clientWidth
                            : false
                };
            }"""
        )

        page.screenshot(
            path=str(OUTPUT / "phone-edge-card-category-390x844.png"),
            full_page=False,
        )
        browser.close()

    expected = {
        "width": 390,
        "horizontalOverflow": False,
        "canvasCount": 0,
        "categoryCount": 7,
        "openCategoryCount": 1,
        "edgeExpanded": "true",
        "edgeIconLoaded": True,
        "mainContentOverflow": False,
    }
    if metrics != expected:
        raise RuntimeError(f"Unexpected phone inventory metrics: {metrics}")
    if errors:
        raise RuntimeError(f"Browser errors: {errors}")

    print(
        {
            "roomCode": room_code,
            "capture": str(OUTPUT / "phone-edge-card-category-390x844.png"),
            "metrics": metrics,
            "consoleErrors": len(errors),
        }
    )


if __name__ == "__main__":
    capture()
