import json, subprocess, time, urllib.request
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

repo = Path(__file__).resolve().parents[3]
out = repo / "qa-artifacts/final-visual-qa/movement-journey"
out.mkdir(parents=True, exist_ok=True)
server = subprocess.Popen([str(repo/"node_modules/.bin/vite.cmd"),"--host","127.0.0.1","--port","4206","--strictPort","--config","qa-artifacts/final-visual-qa/battle-harness/vite.config.ts"],cwd=repo,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
try:
  for _ in range(80):
    try:
      if urllib.request.urlopen("http://127.0.0.1:4206/qa-artifacts/final-visual-qa/battle-harness/movement.html",timeout=1).status==200: break
    except Exception: time.sleep(.25)
  manifest=[]
  with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    page=browser.new_page(viewport={"width":1440,"height":900},reduced_motion="no-preference")
    errors=[]; console=[]
    page.on("pageerror",lambda e: errors.append(str(e)))
    page.on("console",lambda m: console.append({"type":m.type,"text":m.text}))
    page.goto("http://127.0.0.1:4206/qa-artifacts/final-visual-qa/battle-harness/movement.html",wait_until="networkidle")
    def shot(name,state):
      path=out/name; page.screenshot(path=str(path)); size=Image.open(path).size; assert size==(1440,900)
      metrics=page.evaluate("() => ({w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight,cw:document.documentElement.clientWidth,ch:document.documentElement.clientHeight,board:document.querySelectorAll('.tv-board-panel').length,journey:document.querySelectorAll('[data-testid=tv-movement-journey]').length,battle:document.querySelectorAll('[data-testid=tv-dedicated-battle-stage]').length,focus:document.activeElement?.getAttribute('data-testid')||document.activeElement?.tagName,private:/private agenda|ownerprivate|hidden inventory/i.test(document.body.innerText)})")
      assert metrics["w"]<=metrics["cw"] and metrics["h"]<=metrics["ch"] and not metrics["private"]
      manifest.append({"state":state,"path":str(path.relative_to(repo)),"viewport":"1440x900","dimensions":size,"projectionBuilder":"createMovementPatch","movementEventId":"22:seat-1:ashen-chapel","origin":"ashwake-crossing","route":["ashwake-crossing","outer_ember_sanctum","middle_red_march_outpost","reavers-den","ashen-chapel"],"destination":"ashen-chapel","challengeSource":"public sectors.tileChallenges","classification":"public","reducedMotion":False,"result":"passed","metrics":metrics})
    shot("host-movement-01-board-before.png","board before")
    page.evaluate("window.__ASHEN_MOVEMENT_QA__.set('planner',21)"); page.wait_for_timeout(100)
    page.evaluate("window.__ASHEN_MOVEMENT_QA__.set('moved',22)"); page.locator('[data-testid=tv-movement-journey]').wait_for(); shot("host-movement-02-departure.png","departure")
    page.wait_for_timeout(500); shot("host-movement-03-mid-route.png","mid route")
    page.get_by_text("Arrived at Ashen Chapel").wait_for(timeout=4000); shot("host-movement-04-arrival.png","arrival"); shot("host-movement-05-destination-challenges.png","destination challenges")
    page.evaluate("window.__ASHEN_MOVEMENT_QA__.set('battle',23)"); page.locator('[data-testid=tv-dedicated-battle-stage]').wait_for(timeout=4000); shot("host-movement-06-next-state.png","battle next state")
    page.evaluate("window.__ASHEN_MOVEMENT_QA__.set('board',24)"); page.locator('.tv-board-panel').wait_for(); shot("host-movement-07-board-restored.png","board restored")
    for width,height,label,delay,reduced in [(1280,720,"mid-route",500,False),(1280,720,"destination-challenges",1900,False),(1920,1080,"destination-challenges",1900,False),(1440,900,"mid-route-reduced",500,True)]:
      extra=browser.new_page(viewport={"width":width,"height":height},reduced_motion="reduce" if reduced else "no-preference")
      extra.goto("http://127.0.0.1:4206/qa-artifacts/final-visual-qa/battle-harness/movement.html",wait_until="networkidle")
      extra.evaluate("window.__ASHEN_MOVEMENT_QA__.set('planner',31)"); extra.wait_for_timeout(80); extra.evaluate("window.__ASHEN_MOVEMENT_QA__.set('moved',32)")
      extra.locator('[data-testid=tv-movement-journey]').wait_for(); extra.wait_for_timeout(delay)
      path=out/f"host-movement-{label}-{width}x{height}.png"; extra.screenshot(path=str(path)); assert Image.open(path).size==(width,height)
      dims=extra.evaluate("() => [document.documentElement.scrollWidth,document.documentElement.scrollHeight,document.documentElement.clientWidth,document.documentElement.clientHeight]"); assert dims[0]<=dims[2] and dims[1]<=dims[3]
      extra.close()
    assert not errors and not [x for x in console if x["type"] in ("error","warning")]
    browser.close()
  (out/"manifest.json").write_text(json.dumps({"captures":manifest,"errors":errors,"console":console},indent=2),encoding="utf-8")
  print(json.dumps(manifest,indent=2))
finally:
  subprocess.run(["taskkill","/PID",str(server.pid),"/T","/F"],capture_output=True)
