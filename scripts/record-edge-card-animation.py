from __future__ import annotations

import shutil
import subprocess
import time
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "reports" / "ui" / "edge-card-prototype"
WEBM_PATH = OUTPUT_DIR / "edge-card-tv-animation-1920x1080.webm"
MP4_PATH = OUTPUT_DIR / "edge-card-tv-animation-1920x1080.mp4"
RAW_WEBM_PATH = OUTPUT_DIR / ".recording" / "edge-card-tv-animation-raw.webm"


def record_animation() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    temporary_video_dir = OUTPUT_DIR / ".recording"

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            record_video_dir=str(temporary_video_dir),
            record_video_size={"width": 1920, "height": 1080},
            reduced_motion="no-preference",
        )
        page = context.new_page()
        video_started_at = time.monotonic()
        console_errors: list[str] = []
        page.on(
            "console",
            lambda message: console_errors.append(message.text)
            if message.type == "error"
            else None,
        )

        page.goto("http://127.0.0.1:5173/prototypes/edge-cards/", wait_until="networkidle")
        animation_starts_at = max(0.0, time.monotonic() - video_started_at - 0.2)
        page.get_by_role("button", name="Preview TV reveal").click()
        page.wait_for_function(
            "() => document.querySelector('#tv-preview')?.dataset.stage !== 'idle'"
        )
        page.wait_for_timeout(1900)
        if page.locator("#tv-preview").get_attribute("data-stage") != "result":
            raise RuntimeError("Edge Card TV reveal did not reach its result stage.")
        page.wait_for_timeout(1600)

        video = page.video
        context.close()
        if video is None:
            raise RuntimeError("Playwright did not create a video artifact.")
        video.save_as(str(RAW_WEBM_PATH))
        browser.close()

    if console_errors:
        raise RuntimeError(f"Browser console errors: {console_errors}")

    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("ffmpeg is required to trim the browser startup from the review recording.")

    shared_trim_arguments = [
        ffmpeg,
        "-y",
        "-ss",
        f"{animation_starts_at:.3f}",
        "-i",
        str(RAW_WEBM_PATH),
        "-t",
        "3.8",
        "-an",
    ]
    subprocess.run(
        [
            *shared_trim_arguments,
            "-c:v",
            "libvpx-vp9",
            "-crf",
            "30",
            "-b:v",
            "0",
            str(WEBM_PATH),
        ],
        check=True,
    )
    subprocess.run(
        [
            *shared_trim_arguments,
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            str(MP4_PATH),
        ],
        check=True,
    )

    print(f"Recorded WebM: {WEBM_PATH}")
    print(f"Recorded MP4: {MP4_PATH}")


if __name__ == "__main__":
    record_animation()
