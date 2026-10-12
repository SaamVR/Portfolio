/**
 * LeadFlow V2: reproducible, off-device cinema capture.
 *
 * Usage:
 *   node scripts/render-recorded-film.cjs qualified \
 *       https://refinement-review.leadflow-evidence-v2.pages.dev/ 20 capture-output
 *
 * Rendering occurs from a real, confirmed synthetic server receipt.
 * Every video frame is a deterministic seek into the authored 24.4-second
 * StoryDirector. Video time is NOT network latency.
 */
const puppeteer = require('puppeteer-core');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');

const scenario = process.argv[2] || 'qualified';
const previewUrl = new URL(process.argv[3] || 'https://refinement-review.leadflow-evidence-v2.pages.dev/');
const fps = Number(process.argv[4] || 20);
const outputDir = path.resolve(process.argv[5] || 'capture-output');
const chrome = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
if (!['qualified','timeout'].includes(scenario)) throw Error('Only verified synthetic film scenarios are allowed.');
if (!Number.isInteger(fps) || fps < 12 || fps > 30) throw Error('FPS must be 12–30.');
if (previewUrl.protocol !== 'https:' ||
    !/^[a-z0-9-]+\.leadflow-evidence-v2\.pages\.dev$/.test(previewUrl.hostname)) {
  throw Error('Only public, isolated LeadFlow V2 Pages previews are allowed.');
}

function encoderExit(child, stderr) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('Encoder finalization timed out. ' + stderr())), 120000);
    timer.unref(); // Do not stall an otherwise completed recording for two minutes.
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('close', code => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(Error('ffmpeg exited ' + code + ': ' + stderr()));
    });
  });
}

async function record() {
  fs.mkdirSync(outputDir, { recursive: true });
  const silent = path.join(outputDir, 'leadflow-v2-' + scenario + '-silent.mp4');
  const chromeArgs = ['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-first-run'];
  const browser = await puppeteer.launch({
    executablePath: chrome, headless: true, args: chromeArgs, timeout: 90000
  });
  let encoder;
  try {
    const page = await browser.newPage();
    const browserErrors = [];
    page.on('pageerror', e => browserErrors.push(e.message));
    await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 1 });
    await page.goto(previewUrl.href, { waitUntil: 'domcontentloaded', timeout: 50000 });
    await page.waitForFunction(() =>
      document.querySelector('#api-status')?.textContent?.includes('LIVE EDGE API'),
    { timeout: 25000 });
    await page.evaluate(async () => { await document.fonts.ready; });
    if (scenario === 'qualified') {
      await page.click('#film-launch');
    } else {
      await page.click('[data-scenario="timeout"]');
      await page.click('#run-button');
      await page.waitForFunction(() =>
        document.querySelector('#run-status')?.textContent === 'COMPLETED',
      { timeout: 18000 });
      await page.click('#film-from-receipt');
    }
    await page.waitForFunction(() =>
      ['playing','finished'].includes(document.querySelector('#film-stage')?.dataset.state),
    { timeout: 20000 });
    const receipt = await page.evaluate(async () => {
      const { film } = await import('./storyboard.js');
      film.pause();
      window.__portfolioDirector = film;
      const style = document.createElement('style');
      style.textContent = '.film-stage,.film-stage *, .film-stage *::before,' +
        '.film-stage *::after{transition:none!important;animation:none!important}';
      document.head.append(style);
      document.querySelector('#film-status').textContent = 'RECORDED REPLAY / SERVER VERIFIED';
      return {
        runId: film.receipt?.runId,
        score: film.receipt?.qualification?.score,
        crm: film.receipt?.execution?.crm,
        attempts: film.receipt?.crm?.attempts,
        timeoutEvents: film.receipt?.events?.filter(e=>e.stage==='crm.sandbox.timeout').length
      };
    });
    if (!receipt.runId || receipt.crm !== 'sandbox-contract-only') {
      throw Error('Rendering without a confirmed sandbox API receipt is forbidden.');
    }
    if (scenario === 'qualified' && (receipt.attempts !== 1 || receipt.timeoutEvents)) {
      throw Error('The qualified film did not receive the normal server scenario.');
    }
    if (scenario === 'timeout' && (receipt.attempts !== 3 || receipt.timeoutEvents !== 2)) {
      throw Error('The fault film did not receive two injected timeout events.');
    }
    const bounds = await page.$eval('#film-stage', el => {
      const r = el.getBoundingClientRect();
      return { x:r.x + scrollX, y:r.y + scrollY, width:r.width, height:r.height };
    });
    if (Math.abs(bounds.width - 1200) > 2) throw Error('Unexpected stage width, cannot record reliably.');
    const cdp = await page.target().createCDPSession();
    await cdp.send('Page.enable');
    const args = [
      '-hide_banner','-nostdin','-loglevel','error','-y',
      '-f','image2pipe','-framerate',String(fps),'-vcodec','mjpeg','-i','pipe:0',
      '-vf','scale=1200:678:flags=lanczos,setsar=1,format=yuv420p',
      '-c:v','libx264','-preset','veryfast','-crf','21','-r',String(fps),
      '-movflags','+faststart',silent
    ];
    encoder = spawn(ffmpeg, args, { stdio:['pipe','ignore','pipe'] });
    let errorText = '';
    encoder.stderr.on('data', data => { errorText = (errorText + String(data)).slice(-10000); });
    const complete = encoderExit(encoder, () => errorText);
    const frameCount = Math.ceil(25.4 * fps);
    const startedAt = Date.now();
    console.log('RECORDING', JSON.stringify({ scenario, receipt, fps, frameCount, bounds }));
    for (let index = 0; index < frameCount; index++) {
      const filmTime = Math.min(24400, index * 1000 / fps);
      await page.evaluate(t => window.__portfolioDirector.seek(t), filmTime);
      const shot = await cdp.send('Page.captureScreenshot', {
        format:'jpeg',quality:82,fromSurface:true,captureBeyondViewport:true,
        clip:{...bounds,scale:1}
      });
      const frame = Buffer.from(shot.data, 'base64');
      if (!encoder.stdin.write(frame)) await once(encoder.stdin, 'drain');
      if ([Math.round(fps*3),Math.round(fps*12),Math.round(fps*17),Math.round(fps*22)].includes(index)) {
        fs.writeFileSync(path.join(outputDir, scenario + '-shot-' + index + '.jpg'), frame);
      }
      if ((index+1)%100===0 || index+1===frameCount) {
        console.log('FRAMES',scenario,index+1,'/',frameCount,'elapsed_seconds',Math.round((Date.now()-startedAt)/1000));
      }
    }
    encoder.stdin.end();
    await complete;
    if (browserErrors.length) throw Error('Browser JavaScript failures: ' + browserErrors.join('; '));
    const result = {scenario,previewUrl:previewUrl.href,fps,durationSeconds:frameCount/fps,
      receipt,bytes:fs.statSync(silent).size,createdAt:new Date().toISOString(),
      limitation:'Synthetic server-confirmed sandbox replay; no LLM or provider write'};
    fs.writeFileSync(path.join(outputDir,scenario+'-receipt.json'),JSON.stringify(result,null,2)+'\n');
    console.log('RECORDED',JSON.stringify(result));
  } finally {
    if (encoder && !encoder.killed && encoder.exitCode === null) encoder.kill('SIGTERM');
    await browser.close();
  }
}
record().catch(e=>{console.error('CAPTURE_FAILED',e.stack);process.exitCode=1});
