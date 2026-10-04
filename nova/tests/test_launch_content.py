from pathlib import Path
from html.parser import HTMLParser

ROOT=Path(__file__).resolve().parents[1]/'site'
html=(ROOT/'index.html').read_text()
css=(ROOT/'launch.css').read_text()

class Document(HTMLParser):
    def __init__(self):
        super().__init__();self.tags=[];self.ids=[]
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs);self.tags.append((tag,attrs))
        if 'id' in attrs:self.ids.append(attrs['id'])

document=Document();document.feed(html)

def test_navigation_targets_exist_without_duplicate_ids():
    assert len(document.ids)==len(set(document.ids))
    for tag,attrs in document.tags:
        href=attrs.get('href','')
        if href.startswith('#'):assert href[1:] in document.ids
        for attr in ('aria-controls','aria-labelledby'):
            for target in attrs.get(attr,'').split():assert target in document.ids

def test_launch_has_seven_sequential_product_chapters():
    chapters=[a['data-range-anchor'] for t,a in document.tags if 'data-range-anchor' in a]
    assert chapters==['hero','design','spatial','adaptive','form','inspect','resolution']
    assert 'case-study' not in document.ids and 'services' not in document.ids
    assert 'Discover NOVA' in html and 'Full specifications' in html

def test_product_claims_keep_hardware_benchmark_and_battery_conditions():
    for text in ['Sony WH-1000XM6','LDAC: up to 26 hrs NC on / 36 hrs NC off','Bluetooth is unavailable while the supplied headphone cable is connected','measured NOVA hardware','Official sources']:
        assert text in html
    for text in ['id="notifyConcept"','id="notifyDemoForm"','verified browser QA','LCP ≤2.5s']:
        assert text not in html

def test_inspection_and_folding_controls_remain_semantic_and_gated():
    for key,values in [('data-fold-state',['open','fold']),('data-inspection-view',['front','side','rear'])]:
        buttons=[a for t,a in document.tags if t=='button' and key in a]
        assert [a[key] for a in buttons]==values
        assert all(a.get('data-requires-3d')=='true' for a in buttons)

def test_fallback_uses_a_real_model_poster_with_reserved_dimensions():
    posters=[a for t,a in document.tags if t=='img' and 'product-poster__image' in a.get('class','')]
    assert len(posters)==1
    image=posters[0];assert image['width']==image['height']=='1200'
    assert (ROOT/image['src']).is_file()
    assert (ROOT/image['src']).stat().st_size>10000

def test_responsive_motion_and_focus_are_available():
    assert 'prefers-reduced-motion' in css
    assert '@media(max-width:700px)' in css
    assert ':focus-visible' in (ROOT/'styles.css').read_text()
    assert 'touch-action:pan-y' in css

def test_v4_archive_is_linked_and_new_release_metadata_is_exact():
    assert 'data-release="new"' in html
    assert 'https://new.nova-interactive-portfolio.pages.dev/' in html
    assert 'https://v4.nova-interactive-portfolio.pages.dev/' in html

def test_specifications_dialog_is_accessible():
    facts=[a for t,a in document.tags if a.get('id')=='productFactsPanel'][0]
    assert facts['role']=='dialog' and facts['aria-modal']=='true'
    assert facts['aria-labelledby']=='productFactsTitle'
    assert 'data-facts-close' in html
