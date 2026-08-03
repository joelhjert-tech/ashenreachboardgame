from __future__ import annotations

import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "reports" / "ui" / "phone-operative-inspection"
CLIENT_ORIGIN = os.environ.get("ASHEN_REACH_CLIENT_ORIGIN", "http://127.0.0.1:5173")
API_ORIGIN = os.environ.get("ASHEN_REACH_API_ORIGIN", "http://127.0.0.1:8080")


def capture() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    errors: list[str] = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=1)
        page.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)
        page.on("pageerror", lambda error: errors.append(str(error)))

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
        page.get_by_label("Player name").fill("QA Phone")
        page.get_by_role("button", name="Join Game").click()
        page.get_by_role("heading", name="Choose Piece").wait_for()
        page.get_by_role("button", name="Continue to Operative").click()
        page.get_by_role("heading", name="Choose Operative").wait_for()

        card = page.locator(".phone-character-option").first
        card.scroll_into_view_if_needed()
        inspect = card.get_by_role("button", name="Inspect operative dossier")
        select = card.locator(".phone-character-select-action")
        inspect.wait_for()
        select.wait_for()

        card_box = card.bounding_box()
        if card_box is None:
            raise RuntimeError("First operative card did not render a measurable box")
        card.click(position={"x": card_box["width"] / 2, "y": 40})
        page.get_by_role("heading", name="Choose Operative").wait_for()
        if page.get_by_role("dialog").count() != 0:
            raise RuntimeError("Tapping passive operative artwork unexpectedly opened a dialog")

        selection_metrics = page.evaluate(
            """() => {
                const card = document.querySelector('.phone-character-option');
                const image = card?.querySelector('img');
                const copy = card?.querySelector(':scope > span');
                const inspect = card?.querySelector('.phone-character-inspect');
                const select = card?.querySelector('.phone-character-select-action');
                const cardRect = card?.getBoundingClientRect();
                const imageRect = image?.getBoundingClientRect();
                return {
                    viewport: { width: innerWidth, height: innerHeight },
                    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
                    canvasCount: document.querySelectorAll('canvas').length,
                    cardCount: document.querySelectorAll('.phone-character-option').length,
                    imageLoaded: image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
                    cardSize: cardRect ? { width: cardRect.width, height: cardRect.height } : null,
                    artworkSize: imageRect ? { width: imageRect.width, height: imageRect.height } : null,
                    artworkFillsCard: Boolean(cardRect && imageRect &&
                        imageRect.width >= cardRect.width - 2 &&
                        imageRect.height >= cardRect.height - 2),
                    copyBackground: copy ? getComputedStyle(copy).backgroundColor : null,
                    lowerVignette: card ? getComputedStyle(card, '::after').backgroundImage : null,
                    inspectHeight: inspect?.getBoundingClientRect().height ?? 0,
                    selectHeight: select?.getBoundingClientRect().height ?? 0,
                    inspectVisible: inspect instanceof HTMLElement && inspect.getBoundingClientRect().bottom <= innerHeight,
                    selectVisible: select instanceof HTMLElement && select.getBoundingClientRect().bottom <= innerHeight,
                    remainedInOperativeSelection: Boolean(document.querySelector('main[aria-label="Choose operative"]'))
                };
            }"""
        )
        page.screenshot(path=str(OUTPUT / "operative-selection-transparent-390x844.png"))

        inspect.click()
        dialog = page.get_by_role("dialog")
        dialog.wait_for()
        dialog_metrics = page.evaluate(
            """() => {
                const dialog = document.querySelector('.phone-operative-inspection__sheet');
                const scroller = document.querySelector('.phone-operative-inspection__scroll');
                const footer = document.querySelector('.phone-operative-inspection__actions');
                const footerRect = footer?.getBoundingClientRect();
                return {
                    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
                    canvasCount: document.querySelectorAll('canvas').length,
                    statCount: document.querySelectorAll('.phone-operative-inspection__stats > div').length,
                    abilityCount: document.querySelectorAll('.phone-operative-inspection__abilities article').length,
                    hasStrengthsAndWeaknesses: Boolean(document.querySelector('.phone-operative-inspection__fit')),
                    hasStartingGuidance: Boolean(document.querySelector('.phone-operative-inspection__starting')),
                    hasBackground: [...document.querySelectorAll('.phone-operative-inspection__section h3')]
                        .some((heading) => heading.textContent?.trim() === 'Background'),
                    dialogFitsViewport: Boolean(dialog && dialog.getBoundingClientRect().width <= innerWidth),
                    footerVisible: Boolean(footerRect && footerRect.top >= 0 && footerRect.bottom <= innerHeight),
                    internalScrollAvailable: scroller instanceof HTMLElement && scroller.scrollHeight >= scroller.clientHeight,
                    underlyingPickerInert: document.querySelector('.phone-portrait-controller')?.hasAttribute('inert') ?? false,
                    focusedControl: document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent?.trim()
                };
            }"""
        )
        page.screenshot(path=str(OUTPUT / "operative-inspection-bjornis-390x844.png"))

        page.get_by_role("button", name="Keep browsing").click()
        dialog.wait_for(state="detached")
        focus_returned = page.locator(".phone-character-inspect").first.evaluate(
            "element => document.activeElement === element"
        )

        report = {
            "roomCode": room_code,
            "selection": selection_metrics,
            "inspection": dialog_metrics,
            "focusReturnedAfterClose": focus_returned,
            "browserErrors": errors,
            "pass": (
                not selection_metrics["horizontalOverflow"]
                and selection_metrics["canvasCount"] == 0
                and selection_metrics["artworkFillsCard"]
                and selection_metrics["copyBackground"] == "rgba(0, 0, 0, 0)"
                and selection_metrics["inspectHeight"] >= 44
                and selection_metrics["selectHeight"] >= 44
                and selection_metrics["remainedInOperativeSelection"]
                and not dialog_metrics["horizontalOverflow"]
                and dialog_metrics["canvasCount"] == 0
                and dialog_metrics["statCount"] == 5
                and dialog_metrics["abilityCount"] >= 1
                and dialog_metrics["hasStrengthsAndWeaknesses"]
                and dialog_metrics["hasStartingGuidance"]
                and dialog_metrics["dialogFitsViewport"]
                and dialog_metrics["footerVisible"]
                and dialog_metrics["underlyingPickerInert"]
                and focus_returned
                and not errors
            ),
        }
        (OUTPUT / "operative-inspection-qa.json").write_text(
            json.dumps(report, indent=2), encoding="utf-8"
        )
        browser.close()

        if not report["pass"]:
            raise RuntimeError(json.dumps(report, indent=2))


if __name__ == "__main__":
    capture()
