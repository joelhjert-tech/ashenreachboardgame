from pathlib import Path

from playwright.sync_api import sync_playwright


REPOSITORY = Path(__file__).resolve().parents[1]
PROTOTYPE = REPOSITORY / "prototypes" / "edge-cards" / "index.html"
OUTPUT = REPOSITORY / "reports" / "ui" / "edge-card-prototype"


def attach_console_guard(page, errors: list[str]) -> None:
    page.on(
        "console",
        lambda message: errors.append(message.text) if message.type == "error" else None,
    )


def capture() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    console_errors: list[str] = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)

        desktop = browser.new_page(viewport={"width": 1440, "height": 1100})
        attach_console_guard(desktop, console_errors)
        desktop.goto(PROTOTYPE.as_uri())
        desktop.wait_for_load_state("load")
        desktop.locator('[data-card="Echo Recast"]').click()
        desktop.evaluate("window.scrollTo(0, 0)")
        desktop.screenshot(
            path=str(OUTPUT / "edge-card-workbench-1440x1100.png"),
            full_page=True,
        )

        mobile = browser.new_page(viewport={"width": 390, "height": 844})
        attach_console_guard(mobile, console_errors)
        mobile.goto(PROTOTYPE.as_uri())
        mobile.wait_for_load_state("load")
        mobile.locator('[data-card="Static Shunt"]').click()
        mobile.locator(".phone-lab").screenshot(
            path=str(OUTPUT / "edge-card-phone-390x844.png"),
        )

        tv = browser.new_page(viewport={"width": 1920, "height": 1080})
        attach_console_guard(tv, console_errors)
        tv.goto(PROTOTYPE.as_uri())
        tv.wait_for_load_state("load")
        tv.wait_for_function(
            """() => [...document.querySelectorAll('.tv-preview img')]
                .every((image) => image.complete && image.naturalWidth > 0)"""
        )
        tv.locator('[data-card="Echo Recast"]').click()
        tv.locator(".phone-confirm").click()
        tv.locator("#tv-preview").wait_for(state="visible")
        tv.wait_for_function(
            """() => document.querySelector('#tv-preview')?.dataset.stage === 'detonate'"""
        )
        tv.wait_for_timeout(180)
        tv.screenshot(
            path=str(OUTPUT / "edge-card-tv-detonation-1920x1080.png"),
        )
        tv.wait_for_function(
            """() => document.querySelector('#tv-preview')?.dataset.stage === 'result'"""
        )
        tv.screenshot(
            path=str(OUTPUT / "edge-card-tv-result-1920x1080.png"),
        )

        desktop_metrics = desktop.evaluate(
            """() => ({
                cards: document.querySelectorAll('.edge-card').length,
                selected: document.querySelectorAll('.edge-card.is-selected').length,
                horizontalOverflow:
                    document.documentElement.scrollWidth > document.documentElement.clientWidth,
                canvasCount: document.querySelectorAll('canvas').length,
                abilityDisabled: document.querySelector('#ability-mode')?.disabled
            })"""
        )
        mobile_metrics = mobile.evaluate(
            """() => ({
                horizontalOverflow:
                    document.documentElement.scrollWidth > document.documentElement.clientWidth,
                phoneTitle: document.querySelector('#phone-title')?.textContent,
                previewEnabled: !document.querySelector('.phone-confirm')?.disabled
            })"""
        )
        tv_metrics = tv.evaluate(
            """() => ({
                stage: document.querySelector('#tv-preview')?.dataset.stage,
                horizontalOverflow:
                    document.documentElement.scrollWidth > document.documentElement.clientWidth,
                images: [...document.querySelectorAll('.tv-preview img')].map((image) => ({
                    loaded: image.complete && image.naturalWidth > 0,
                    width: image.naturalWidth,
                    height: image.naturalHeight
                })),
                canvasCount: document.querySelectorAll('canvas').length
            })"""
        )

        browser.close()

    assert desktop_metrics == {
        "cards": 6,
        "selected": 1,
        "horizontalOverflow": False,
        "canvasCount": 0,
        "abilityDisabled": True,
    }, desktop_metrics
    assert mobile_metrics == {
        "horizontalOverflow": False,
        "phoneTitle": "Static Shunt",
        "previewEnabled": True,
    }, mobile_metrics
    assert tv_metrics == {
        "stage": "result",
        "horizontalOverflow": False,
        "images": [
            {"loaded": True, "width": 1672, "height": 941},
            {"loaded": True, "width": 1672, "height": 941},
        ],
        "canvasCount": 0,
    }, tv_metrics
    assert console_errors == [], console_errors

    print(
        {
            "prototype": str(PROTOTYPE),
            "output": str(OUTPUT),
            "desktop": desktop_metrics,
            "mobile": mobile_metrics,
            "tv": tv_metrics,
            "consoleErrors": len(console_errors),
        }
    )


if __name__ == "__main__":
    capture()
