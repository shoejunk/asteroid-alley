// Run with PLAYWRIGHT_MODULE pointing to an installed playwright package.
// Optional GAME_URL checks a deployed copy; otherwise starts a local static server.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const root = path.resolve(__dirname, '..');
let server;
(async () => {
  let url = process.env.GAME_URL;
  if (!url) {
    server = http.createServer((req, res) => {
      const file = path.join(root, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
      fs.readFile(file, (err, data) => {
        if (err) return res.writeHead(404).end();
        res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html');
        res.end(data);
      });
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    url = `http://127.0.0.1:${server.address().port}/`;
  }
  const browser = await chromium.launch({channel:'msedge',headless:true});
  try {
    for (const mobile of [false, true]) {
      const context = await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},isMobile:mobile,hasTouch:true});
      const page = await context.newPage(), errors = [];
      await page.addInitScript(()=>{
        const NativeAudio=window.AudioContext||window.webkitAudioContext;
        if(NativeAudio)window.AudioContext=class extends NativeAudio{constructor(...args){super(...args);window.__testAudio=this;}};
      });
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(url);
      const snapshot = () => page.evaluate(() => asteroidAlley.snapshot());
      await page.locator('#start').click();
      // Regression reproduction: the original handler pauses on this event.
      await page.evaluate(() => window.dispatchEvent(new Event('blur')));
      assert.equal((await snapshot()).state, 'playing', 'visible blur must not pause');
      const cdp = await context.newCDPSession(page);
      for (let i=0;i<8;i++) {
        const box = await page.locator('#game').boundingBox();
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+100,y:box.y+box.height*.6}]});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+60,y:box.y+box.height*.6}]});
        await page.evaluate(()=>new Promise(requestAnimationFrame));
        const before = await snapshot();
        await page.evaluate(() => window.dispatchEvent(new Event('blur')));
        await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+90,y:box.y+box.height*.6}]});
        await page.evaluate(()=>new Promise(requestAnimationFrame));
        const after = await snapshot();
        assert.equal(after.state,'playing');
        assert(after.ship.x>before.ship.x,`steering continues after visible blur: ${JSON.stringify({mobile,i,before:before.ship,after:after.ship})}`);
        // Crossing the header Pause button in the same captured drag must not click it.
        const pauseBox = await page.locator('#pause').boundingBox();
        await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:pauseBox.x+20,y:pauseBox.y+20}]});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        assert.equal((await snapshot()).state,'playing');
        await page.setViewportSize(mobile?{width:390,height:844-(i%2)*40}:{width:1280,height:900-(i%2)*40});
        await page.evaluate(() => {
          document.dispatchEvent(new Event('visibilitychange')); // still visible
          game.dispatchEvent(new PointerEvent('pointercancel',{pointerId:999}));
          game.dispatchEvent(new PointerEvent('lostpointercapture',{pointerId:999}));
        });
        assert.equal((await snapshot()).state,'playing');
        // Real hidden state, then visible: stay paused until an explicit resume.
        await page.evaluate(() => {Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
        assert.equal((await snapshot()).state,'paused');
        const paused = await snapshot();
        await page.waitForTimeout(40);
        assert.equal((await snapshot()).elapsed,paused.elapsed);
        await page.evaluate(() => {Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
        assert.equal((await snapshot()).state,'paused');
        await page.locator('#start').click();
        assert.equal((await snapshot()).state,'playing');
      }
      await page.locator('#sound').click();
      await page.evaluate(async()=>{if(window.__testAudio)await window.__testAudio.suspend();});
      await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
      assert.equal((await snapshot()).state,'playing','audio suspension plus visible blur must not pause');
      await page.locator('#pause').click();
      assert.equal((await snapshot()).state,'paused','intentional pause remains');
      await page.locator('#start').click();
      await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
      assert.equal((await snapshot()).state,'paused','pagehide pauses');
      await page.locator('#start').click();
      await page.keyboard.press('Escape');
      assert.equal((await snapshot()).state,'paused');
      await page.keyboard.press('Escape');
      assert.equal((await snapshot()).state,'playing');
      assert.deepEqual(errors,[]);
      console.log(`PASS ${mobile?'mobile':'desktop'}: 8 drag/blur/header crossing/resize/background/resume cycles, sound, intentional pause, pagehide, keyboard, no JS errors`);
      await context.close();
    }
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server?.close());
