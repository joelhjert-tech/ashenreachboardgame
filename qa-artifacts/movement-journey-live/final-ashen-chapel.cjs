const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const API = 'http://127.0.0.1:8081';
const APP = 'http://127.0.0.1:5173';
const out = __dirname;

async function post(route, body) {
  const response = await fetch(`${API}${route}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(`${route}: ${response.status} ${JSON.stringify(payload)}`);
  return payload;
}

async function snap(page, name) {
  await page.screenshot({ path: path.join(out, name) });
}

(async () => {
  const created = await post('/api/session/create', {
    sessionMode: 'single-player',
    gameMode: 'standard',
    scenarioId: 'scenario_broken_seal'
  });
  const joined = await post('/api/session/join', {
    roomCode: created.roomCode,
    displayName: 'Ashen Chapel QA',
    characterId: 'void-marshal',
    seatId: 'seat-1'
  });

  const errors = [];
  const browser = await chromium.launch({ headless: true });
  const phoneContext = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const tvContext = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const phone = await phoneContext.newPage();
  const tv = await tvContext.newPage();
  for (const page of [phone, tv]) {
    page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
    page.on('pageerror', error => errors.push(`page: ${error.message}`));
  }
  await phone.addInitScript(auth => localStorage.setItem('ashenreach.controllerSession', JSON.stringify(auth)), {
    roomCode: created.roomCode,
    seatId: joined.seatId,
    seatToken: joined.seatToken,
    displayName: 'Ashen Chapel QA'
  });
  await Promise.all([
    phone.goto(`${APP}/?room=${created.roomCode}`, { waitUntil: 'networkidle' }),
    tv.goto(`${APP}/tv`, { waitUntil: 'networkidle' })
  ]);

  await phone.getByRole('button', { name: /select mission/i }).first().click();
  await phone.getByRole('button', { name: /^ready$/i }).click();
  await phone.getByRole('button', { name: /start game/i }).click();
  await phone.waitForTimeout(500);

  const fixture = await post('/api/qa/phase1-fixture', {
    roomCode: created.roomCode,
    seatToken: joined.seatToken,
    fixture: { kind: 'movement-journey', stage: 'ashen-chapel', withChoirLantern: true }
  });
  await phone.waitForTimeout(500);
  if (await phone.getByRole('button', { name: 'Show Tabs' }).count()) await phone.getByRole('button', { name: 'Show Tabs' }).click();
  await phone.locator('button').filter({ hasText: /^Move$/ }).click({ force: true });
  await phone.waitForTimeout(250);

  const chapelText = phone.getByText('Ashen Chapel', { exact: true }).first();
  await chapelText.waitFor({ timeout: 10000 });
  const chapelContainer = chapelText.locator('xpath=ancestor::*[.//button[contains(normalize-space(.), "Select")]][1]');
  await chapelContainer.getByRole('button', { name: 'Select' }).click();
  await phone.waitForTimeout(250);
  await snap(tv, 'final-ashen-01-destination-preview-tv-1366x768.png');
  await snap(phone, 'final-ashen-01-destination-preview-phone-390x844.png');

  await phone.getByRole('button', { name: /confirm move/i }).click();
  const captures = [
    [40, 'final-ashen-02-departure-tv-1366x768.png'],
    [410, 'final-ashen-03-first-step-tv-1366x768.png'],
    [780, 'final-ashen-04-intermediate-tv-1366x768.png'],
    [1160, 'final-ashen-05-arrival-tv-1366x768.png'],
    [1850, 'final-ashen-06-rift-whispers-tv-1366x768.png']
  ];
  let elapsed = 0;
  for (const [at, name] of captures) {
    await tv.waitForTimeout(at - elapsed);
    elapsed = at;
    await snap(tv, name);
  }
  // Complete the authored Ashen Rite arrival resolution through its normal
  // phone action. The recurring challenge must then open from sector flow.
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if ((await phone.locator('body').innerText()).includes('Rift Whispers')) break;
    const continueButton = phone.getByRole('button', { name: /^continue$/i });
    if (await continueButton.count()) {
      await continueButton.first().click();
      await phone.waitForTimeout(450);
      continue;
    }
    if (await phone.getByRole('button', { name: 'Show Tabs' }).count()) await phone.getByRole('button', { name: 'Show Tabs' }).click();
    const battleTab = phone.locator('button').filter({ hasText: /^Battle$/ });
    if (await battleTab.count()) await battleTab.first().click({ force: true });
    await phone.waitForTimeout(350);
  }
  await tv.waitForTimeout(300);
  await snap(tv, 'final-ashen-06-rift-whispers-tv-1366x768.png');
  await snap(phone, 'final-ashen-06-rift-whispers-phone-390x844.png');

  const beforeRoll = {
    phoneText: (await phone.locator('body').innerText()).slice(0, 12000),
    tvText: (await tv.locator('body').innerText()).slice(0, 12000),
    journey: Boolean(await tv.locator('[data-testid="tv-movement-journey"]').count()),
    overflowX: await tv.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    overflowY: await tv.evaluate(() => document.documentElement.scrollHeight > innerHeight),
    canvas: await tv.locator('canvas').count()
  };

  const lantern = phone.getByRole('button', { name: /use choir lantern/i });
  const lanternVisibleBeforeRoll = await lantern.count() > 0 && await lantern.first().isVisible() && await lantern.first().isEnabled();
  if (lanternVisibleBeforeRoll) {
    await lantern.first().click();
    await phone.waitForTimeout(250);
  }
  const rollChallenge = phone.getByRole('button', { name: /attempt signal check|roll check dice/i });
  if (await rollChallenge.count()) {
    await rollChallenge.first().click();
    await phone.waitForTimeout(250);
    const stagedRoll = phone.getByRole('button', { name: /roll check dice/i });
    if (await stagedRoll.count()) await stagedRoll.first().click();
    await phone.waitForTimeout(1200);
  }
  await snap(tv, 'final-ashen-07-after-resolution-tv-1366x768.png');
  await snap(phone, 'final-ashen-07-after-resolution-phone-390x844.png');
  const afterResolutionText = await tv.locator('body').innerText();

  await tv.reload({ waitUntil: 'networkidle' });
  await tv.waitForTimeout(500);
  await snap(tv, 'final-ashen-08-reload-tv-1366x768.png');
  const afterReload = {
    journey: Boolean(await tv.locator('[data-testid="tv-movement-journey"]').count()),
    riftWhispers: (await tv.locator('body').innerText()).includes('Rift Whispers'),
    overflowX: await tv.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    overflowY: await tv.evaluate(() => document.documentElement.scrollHeight > innerHeight),
    canvas: await tv.locator('canvas').count()
  };

  const result = {
    created, joined: { seatId: joined.seatId }, fixture,
    route: ['scorched-road', 'blastworks', 'ashen-chapel'], routeLength: 2,
    lanternVisibleBeforeRoll,
    beforeRoll,
    riftWhispersStillProjectedAfterResolution: afterResolutionText.includes('Rift Whispers'),
    afterReload,
    errors
  };
  fs.writeFileSync(path.join(out, 'final-ashen-chapel-result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
