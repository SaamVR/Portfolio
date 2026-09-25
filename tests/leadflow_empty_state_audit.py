from playwright.sync_api import sync_playwright
from browser_harness import build_html
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':1000})
    errors=[]; page.on('pageerror',lambda e: errors.append(str(e)))
    page.set_content(build_html(empty=True),wait_until='domcontentloaded'); page.wait_for_timeout(150)
    out=page.evaluate('''() => ({
      trend:document.querySelector('#opsScoreTrend')?.innerText.trim(),
      queue:document.querySelector('#opsActionQueue')?.innerText.trim(),
      sources:document.querySelector('#opsSourceQuality')?.innerText.trim(),
      urgency:document.querySelector('#opsUrgencyMix')?.innerText.trim(),
      table:document.querySelector('#opsPipelineRows')?.innerText.trim(),
      activity:document.querySelector('#opsActivityFeed')?.innerText.trim(),
      total:document.querySelector('#opsTotal')?.innerText.trim()
    })''')
    out['errors']=len(errors)
    expected={
      'trend':'Run a lead to build the score trend.',
      'queue':'No queued actions yet.',
      'sources':'No source data yet.',
      'urgency':'No timeline data yet.',
      'table':'No qualified leads yet. Run the interactive demo to add the first record.',
      'activity':'Run the interactive demo to create the first local record.',
      'total':'0','errors':0
    }
    assert out==expected,(out,expected)
    print(out)
    browser.close()
