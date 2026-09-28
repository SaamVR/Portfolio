from playwright.sync_api import sync_playwright
from browser_harness import build_html
html=build_html()
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    for width in [390,768,1024,1440]:
        page=browser.new_page(viewport={'width':width,'height':900})
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content(html,wait_until='domcontentloaded');page.wait_for_timeout(150)
        out=page.evaluate('''() => ({viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,tableClient:document.querySelector('.ops-table-wrap')?.clientWidth,tableScroll:document.querySelector('.ops-table-wrap')?.scrollWidth,dashboardWidth:Math.round(document.querySelector('.ops-dashboard')?.getBoundingClientRect().width||0),runHeight:document.querySelector('#runAutomation')?.getBoundingClientRect().height})''')
        out['errors']=len(errors)
        assert out['scrollWidth']<=out['viewport'],out
        assert out['runHeight']>=44,out
        assert not errors,errors
        print(out)
        page.close()
    # Reduced motion settles dashboard immediately
    page=browser.new_page(viewport={'width':1440,'height':900},reduced_motion='reduce')
    page.set_content(html,wait_until='domcontentloaded');page.wait_for_timeout(80)
    vals=page.evaluate('''() => ({reduce:matchMedia('(prefers-reduced-motion: reduce)').matches,total:document.querySelector('#opsTotal')?.textContent.trim(),hot:document.querySelector('#opsHot')?.textContent.trim(),avg:document.querySelector('#opsAverage')?.textContent.trim()})''')
    assert vals['reduce'] and vals['total']=='3' and vals['hot']=='1' and vals['avg']=='64',vals
    print('reduced',vals)
    browser.close()
