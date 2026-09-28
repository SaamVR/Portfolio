from playwright.sync_api import sync_playwright
from browser_harness import build_html
html=build_html()
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':1000})
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(html,wait_until='domcontentloaded');page.wait_for_timeout(180)
    rows=page.evaluate('''() => [...document.querySelectorAll('.ops-quality-row')].map(r=>({name:r.querySelector('b')?.textContent.trim(),avg:Number(r.querySelector(':scope>strong')?.childNodes[0]?.textContent.trim()),width:Math.round(parseFloat(r.querySelector('.ops-quality-track i')?.style.width))}))''')
    assert rows==[
      {'name':'Website Form','avg':87,'width':87},
      {'name':'Meta Lead Ads','avg':67,'width':67},
      {'name':'Referral','avg':39,'width':39}
    ],rows
    # sparse fallback via pure model and a rendered isolated record
    sparse=page.evaluate('''() => LeadFlowDashboard.buildDashboardModel([{name:'Sparse',company:'Test',score:50,status:'review',timeline:'month',action:'Human review'}])''')
    assert sparse['sources'][0]['name']=='Unspecified',sparse
    assert not errors,errors
    print('ROWS',rows)
    print('SPARSE_SOURCE',sparse['sources'][0])
    browser.close()
