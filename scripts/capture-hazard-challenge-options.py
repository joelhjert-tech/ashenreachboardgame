from __future__ import annotations

import json
import os
from pathlib import Path
from urllib.request import Request, urlopen

from playwright.sync_api import Page, sync_playwright


API = os.environ.get("ASHEN_REACH_API_ORIGIN", "http://127.0.0.1:8080")
CLIENT = os.environ.get("ASHEN_REACH_CLIENT_ORIGIN", "http://127.0.0.1:5173")
OUTPUT = Path("reports/ui/hazard-challenge-options").resolve()


def post(path: str, body: dict) -> dict:
    payload = json.dumps(body).encode("utf-8")
    request = Request(f"{API}{path}", data=payload, headers={"Content-Type": "application/json"}, method="POST")
    with urlopen(request) as response:
        return json.loads(response.read().decode("utf-8"))


def start_phone(page: Page) -> dict:
    session = post("/api/session/create", {"sessionMode": "single-player", "interactionMode": "co-op", "gameMode": "standard", "playerCount": 1})
    page.goto(f"{CLIENT}/?room={session['roomCode']}&resetAuth=1", wait_until="networkidle")
    page.get_by_label("Player name").fill("Trial Witness")
    page.get_by_role("button", name="Join Game").click()
    page.get_by_role("heading", name="Select operative").wait_for()
    page.get_by_role("button", name="Bjornis", exact=False).click()
    page.get_by_role("heading", name="Choose Starting Mission").wait_for()
    page.get_by_role("button", name="Select Mission").first.click()
    page.get_by_role("button", name="Ready").click()
    page.get_by_role("button", name="Start Game").click()
    auth = page.evaluate("JSON.parse(localStorage.getItem('ashenreach.controllerSession') || 'null')")
    if not auth:
        raise RuntimeError("Phone authorization was not stored")
    return auth


def seed(auth: dict, stage: str) -> None:
    post("/api/qa/phase1-fixture", {
        "roomCode": auth["roomCode"],
        "seatToken": auth["seatToken"],
        "fixture": {"kind": "card-category", "stage": stage},
    })


def open_state(page: Page, auth: dict, stage: str, width: int, height: int) -> None:
    seed(auth, stage)
    page.set_viewport_size({"width": width, "height": height})
    page.goto(
        f"{CLIENT}/?room={auth['roomCode']}&seat={auth['seatId']}",
        wait_until="networkidle",
    )
    page.locator('[data-hazard-challenge-layout="cinematic"]').wait_for()


def assert_layout(page: Page, label: str) -> dict:
    metrics = page.evaluate(
        """() => {
          const root = document.documentElement;
          const body = document.body;
          const action = document.querySelector('[data-testid="phone-test-primary-action"]');
          const nav = document.querySelector('.phone-turn-tabs');
          const art = document.querySelector('.phone-encounter-art');
          const actionRect = action?.getBoundingClientRect();
          const navRect = nav?.getBoundingClientRect();
          const artRect = art?.getBoundingClientRect();
          const imgRect = art?.querySelector('img')?.getBoundingClientRect();
          return {
            viewportWidth: innerWidth,
            viewportHeight: innerHeight,
            scrollWidth: Math.max(root.scrollWidth, body.scrollWidth),
            action: actionRect ? { top: actionRect.top, bottom: actionRect.bottom } : null,
            nav: navRect ? { top: navRect.top, bottom: navRect.bottom } : null,
            art: artRect ? { left: artRect.left, right: artRect.right, top: artRect.top, bottom: artRect.bottom } : null,
            image: imgRect ? { left: imgRect.left, right: imgRect.right, top: imgRect.top, bottom: imgRect.bottom } : null,
            navBackground: nav ? getComputedStyle(nav).backgroundColor : null,
          };
        }"""
    )
    if metrics["scrollWidth"] > metrics["viewportWidth"]:
        raise RuntimeError(f"{label}: horizontal overflow {metrics}")
    if not metrics["action"]:
        raise RuntimeError(f"{label}: primary action missing {metrics}")
    if metrics["nav"] and metrics["action"]["bottom"] > metrics["nav"]["top"] + 1:
        raise RuntimeError(f"{label}: primary action overlaps navigation {metrics}")
    if not metrics["nav"] and metrics["action"]["bottom"] > metrics["viewportHeight"] + 1:
        raise RuntimeError(f"{label}: primary action is below the viewport {metrics}")
    if metrics["action"]["top"] < 0:
        raise RuntimeError(f"{label}: primary action is above the viewport {metrics}")
    if metrics["art"] and metrics["image"]:
        tolerance = 1
        if metrics["image"]["left"] < metrics["art"]["left"] - tolerance or metrics["image"]["right"] > metrics["art"]["right"] + tolerance:
            raise RuntimeError(f"{label}: artwork escaped its frame {metrics}")
    return metrics


def capture(page: Page, auth: dict, stage: str, width: int, height: int, filename: str) -> dict:
    open_state(page, auth, stage, width, height)
    metrics = assert_layout(page, filename)
    page.screenshot(path=str(OUTPUT / filename), full_page=False)
    return metrics


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    errors: list[str] = []
    metrics: dict[str, dict] = {}
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 390, "height": 844})
        page.on("console", lambda message: errors.append(f"console: {message.text}") if message.type == "error" else None)
        page.on("pageerror", lambda error: errors.append(f"page: {error}"))
        auth = start_phone(page)

        captures = [
            ("hazard-before", 390, 844, "option-a-hazard-390x844.png"),
            ("persistent", 390, 844, "option-a-challenge-390x844.png"),
            ("hazard", 390, 844, "option-a-success-390x844.png"),
            ("hazard-failure", 390, 844, "option-a-failure-390x844.png"),
            ("hazard-before", 360, 800, "option-a-hazard-360x800.png"),
            ("persistent", 430, 932, "option-a-challenge-430x932.png"),
            ("hazard-before", 412, 915, "option-a-hazard-412x915.png"),
            ("persistent", 360, 800, "option-a-challenge-360x800.png"),
        ]
        for stage, width, height, filename in captures:
            metrics[filename] = capture(page, auth, stage, width, height, filename)

        post("/api/qa/phase1-fixture", {
            "roomCode": auth["roomCode"],
            "seatToken": auth["seatToken"],
            "fixture": {"kind": "scar-system", "stage": "choice"},
        })
        page.set_viewport_size({"width": 390, "height": 844})
        page.goto(f"{CLIENT}/?room={auth['roomCode']}&seat={auth['seatId']}", wait_until="networkidle")
        page.get_by_role("heading", name="Choose Your Scar").wait_for()
        scar_name = "option-a-scar-follow-up-390x844.png"
        scar_width = page.evaluate("Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)")
        if scar_width > 390:
            raise RuntimeError(f"{scar_name}: horizontal overflow {scar_width}")
        page.screenshot(path=str(OUTPUT / scar_name), full_page=False)
        metrics[scar_name] = {"viewportWidth": 390, "viewportHeight": 844, "scrollWidth": scar_width, "canonicalScarPrompt": True}

        browser.close()

    if errors:
        raise RuntimeError("Browser errors:\n" + "\n".join(errors))
    (OUTPUT / "browser-metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(json.dumps({"output": str(OUTPUT), "screenshots": len(metrics), "consoleErrors": 0}, indent=2))


if __name__ == "__main__":
    main()
