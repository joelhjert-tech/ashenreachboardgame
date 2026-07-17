import json
import subprocess
import time
import urllib.request
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1] / "dedicated-battle" / "same-session"
root.mkdir(parents=True, exist_ok=True)
states = [
    ("board-before", "host-transition-01-board-before.png"),
    ("battle-active", "host-transition-02-battle-active.png"),
    ("battle-resolved", "host-transition-03-battle-resolved.png"),
    ("board-restored", "host-transition-04-board-restored.png"),
]

repo = Path(__file__).resolve().parents[3]
server = subprocess.Popen(
    [str(repo / "node_modules" / ".bin" / "vite.cmd"), "--host", "127.0.0.1", "--port", "4205", "--strictPort", "--config", "qa-artifacts/final-visual-qa/battle-harness/vite.config.ts"],
    cwd=repo,
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
)
try:
  for _ in range(80):
    try:
      with urllib.request.urlopen("http://127.0.0.1:4205/qa-artifacts/final-visual-qa/battle-harness/index.html", timeout=1) as response:
        if response.status == 200: break
    except Exception:
      time.sleep(0.25)
  else:
    raise RuntimeError("Harness server did not become ready")

  with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1440, "height": 900}, reduced_motion="no-preference")
    page = context.new_page()
    console_messages = []
    page_errors = []
    page.on("console", lambda msg: console_messages.append({"type": msg.type, "text": msg.text}))
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    page.goto("http://127.0.0.1:4205/qa-artifacts/final-visual-qa/battle-harness/index.html", wait_until="networkidle", timeout=30000)

    page.evaluate("""
      window.__transitionMetrics = { boardAdds: 0, battleAdds: 0 };
      new MutationObserver((records) => {
        for (const record of records) for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches('.tv-board-panel') || node.querySelector('.tv-board-panel')) window.__transitionMetrics.boardAdds++;
          if (node.matches('[data-testid="tv-dedicated-battle-stage"]') || node.querySelector('[data-testid="tv-dedicated-battle-stage"]')) window.__transitionMetrics.battleAdds++;
        }
      }).observe(document.getElementById('root'), { childList: true, subtree: true });
    """)

    results = []
    for state, filename in states:
        page.evaluate("state => window.__ASHEN_TRANSITION_QA__.setState(state)", state)
        page.wait_for_timeout(250)
        target = "[data-testid='tv-dedicated-battle-stage']" if state.startswith("battle") else ".tv-board-panel"
        page.locator(target).wait_for(state="visible", timeout=5000)
        page.wait_for_timeout(350)
        path = root / filename
        page.screenshot(path=str(path))
        dimensions = Image.open(path).size
        assert dimensions == (1440, 900), (path, dimensions)
        metrics = page.evaluate("""() => ({
          viewport: { width: innerWidth, height: innerHeight },
          document: { scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight, clientWidth: document.documentElement.clientWidth, clientHeight: document.documentElement.clientHeight },
          boardCount: document.querySelectorAll('.tv-board-panel').length,
          battleCount: document.querySelectorAll('[data-testid="tv-dedicated-battle-stage"]').length,
          focused: document.activeElement?.getAttribute('data-testid') || document.activeElement?.getAttribute('aria-label') || document.activeElement?.tagName,
          privateTextPresent: /private agenda|hidden inventory|ownerprivate/i.test(document.body.innerText)
        })""")
        expected_board = 0 if state.startswith("battle") else 1
        expected_battle = 1 if state.startswith("battle") else 0
        assert metrics["boardCount"] == expected_board, (state, metrics)
        assert metrics["battleCount"] == expected_battle, (state, metrics)
        assert metrics["document"]["scrollWidth"] <= metrics["document"]["clientWidth"], (state, metrics)
        assert metrics["document"]["scrollHeight"] <= metrics["document"]["clientHeight"], (state, metrics)
        assert not metrics["privateTextPresent"], (state, metrics)
        if state.startswith("battle"):
            assert metrics["focused"] == "tv-dedicated-battle-stage", (state, metrics)
        if state == "board-restored":
            assert metrics["focused"] == "tv-command-main", (state, metrics)
        results.append({"state": state, "path": str(path), "dimensions": dimensions, **metrics})

    continuity = page.evaluate("""() => ({
      ...window.__transitionMetrics,
      appRenderCount: window.__ASHEN_TRANSITION_QA__.getRenderCount(),
      finalFocus: document.activeElement?.getAttribute('data-testid') || document.activeElement?.getAttribute('aria-label') || document.activeElement?.tagName
    })""")
    assert not page_errors, page_errors
    error_console = [entry for entry in console_messages if entry["type"] in ("error", "warning")]
    assert not error_console, error_console
    manifest = {"results": results, "continuity": continuity, "console": console_messages, "pageErrors": page_errors}
    (root / "host-transition-manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps(manifest, indent=2))
    context.close()
    browser.close()
finally:
  subprocess.run(["taskkill", "/PID", str(server.pid), "/T", "/F"], capture_output=True)
