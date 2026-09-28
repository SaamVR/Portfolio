from playwright.sync_api import sync_playwright
from browser_harness import build_html
html=build_html()
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    for theme in ['dark','light']:
        page=browser.new_page(viewport={'width':1440,'height':1100})
        page.set_content(html,wait_until='domcontentloaded');page.evaluate("t=>document.documentElement.dataset.theme=t",theme);page.wait_for_timeout(150)
        small=page.evaluate('''() => [...document.querySelectorAll('body *')].filter(el=>el.children.length===0&&el.textContent.trim()&&el.getClientRects().length&&parseFloat(getComputedStyle(el).fontSize)<12).map(el=>({text:el.textContent.trim().slice(0,60),size:parseFloat(getComputedStyle(el).fontSize)}))''')
        assert not small,(theme,small[:20])
        print(theme,'under12=',len(small))
        page.close()
    browser.close()
