from playwright.sync_api import sync_playwright
from browser_harness import build_html
html=build_html(empty=True)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':950},reduced_motion='reduce')
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(html,wait_until='domcontentloaded');page.wait_for_timeout(100)
    results=[]
    expected={'hot':('92','HIGH PRIORITY'),'review':('64','NEEDS REVIEW'),'nurture':('33','NURTURE')}
    for preset in ['hot','review','nurture']:
        page.locator(f'[data-lead-preset="{preset}"]').click()
        page.locator('#runAutomation').click()
        page.wait_for_function("document.querySelector('#execStatus')?.textContent==='COMPLETE'",timeout=5000)
        score,status=expected[preset]
        out=page.evaluate('''() => ({score:document.querySelector('#scoreValue')?.textContent.trim(),status:document.querySelector('#temperature')?.textContent.trim(),total:document.querySelector('#opsTotal')?.textContent.trim(),tableRows:document.querySelectorAll('#opsPipelineRows tr').length,donut:!!document.querySelector('#opsDistribution svg'),trend:!!document.querySelector('#opsScoreTrend svg'),queue:document.querySelector('#opsActionQueue')?.innerText.trim(),sources:document.querySelector('#opsSourceQuality')?.innerText.trim(),urgency:document.querySelector('#opsUrgencyMix')?.innerText.trim(),events:document.querySelector('#eventCount')?.textContent.trim()})''')
        out['errors']=len(errors)
        assert out['score']==score and out['status']==status,(preset,out)
        assert out['events']=='16 events',(preset,out)
        assert out['donut'] and out['trend'] and not errors,(preset,out,errors)
        results.append([preset,out])
    page.locator('#opsOpenCrm').click()
    page.wait_for_timeout(80)
    crm=page.evaluate('''() => ({crmTotal:document.querySelector('#crmTotal')?.textContent.trim(),rows:document.querySelectorAll('#crmRows tr').length,hidden:document.querySelector('#crmModal')?.getAttribute('aria-hidden')})''')
    crm['errors']=len(errors)
    assert crm['crmTotal']=='3' and crm['rows']==3 and crm['hidden']=='false' and not errors,crm
    page.locator('#closeCrm').click();page.wait_for_timeout(30)
    page.evaluate("document.querySelector('#workspace').scrollIntoView({block:'start'})");page.wait_for_timeout(50)
    anchor=page.evaluate('''() => {const n=document.querySelector('.nav').getBoundingClientRect(),w=document.querySelector('#workspace').getBoundingClientRect();return {navBottom:n.bottom,workspaceTop:w.top,gap:w.top-n.bottom,scrollY}}''')
    assert anchor['gap']>=12,anchor
    print('SCENARIOS',results)
    print('CRM',crm)
    print('ANCHOR',anchor)
    print('FINAL_RUNTIME_AUDIT=PASS')
    browser.close()
