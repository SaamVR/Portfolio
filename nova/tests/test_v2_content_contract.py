from pathlib import Path
ROOT = Path(__file__).resolve().parents[1] / "site"
html = (ROOT/"index.html").read_text()
css = (ROOT/"styles.css").read_text()
ui = (ROOT/"ui"/"product-ui.js").read_text()

def test_product_story_precedes_technical_story():
    assert "Hear beyond" in html
    assert "Behind NOVA" in html
    assert html.index("Hear beyond") < html.index("Behind NOVA")

def test_required_product_controls_are_semantic_buttons():
    for value in ["spatial","focus","ambient"]:
        assert f'data-listening-mode="{value}"' in html
    for value in ["adaptive","transparency"]:
        assert f'data-noise-mode="{value}"' in html
    for value in ["open","fold"]:
        assert f'data-fold-state="{value}"' in html
    assert 'id="inspectionReset"' in html
    assert "<button" in html

def test_no_fake_numeric_product_specs():
    banned = ["40-hour","50-hour","mm driver","Bluetooth 5.","Hi-Res Certified","$399","$499"]
    assert not any(term.lower() in html.lower() for term in banned)

def test_technical_facts_live_after_product_journey():
    assert html.index("Behind NOVA") < html.index(">36<")
    assert html.index("Behind NOVA") < html.index(">14<")

def test_mobile_and_reduced_motion_are_authored():
    assert "@media (max-width: 700px)" in css
    assert "prefers-reduced-motion" in css
    assert ":focus-visible" in css


def test_stage_controls_layer_above_interactive_canvas():
    compact = css.replace(" ", "").replace("\n", "")
    assert ".stage{position:relative;overflow:clip}" in compact
    assert ".stage{position:relative;z-index:3;overflow:clip}" not in compact


def test_stage_geometry_matches_global_timeline():
    compact = css.replace(" ", "").replace("\n", "")
    assert ".stage+.stage{margin-top:-100svh}" in compact
    expected = {
        "hero": "220svh",
        "design": "260svh",
        "sound": "270svh",
        "control": "230svh",
        "form": "240svh",
        "inspect": "240svh",
        "resolution": "200svh",
        "behind": "140svh",
    }
    for name, height in expected.items():
        assert f".stage--{name}{{min-height:{height}" in compact


def test_notify_cta_has_visible_demo_panel():
    assert 'id="notifyConcept"' in html
    assert 'aria-controls="notifyPanel"' in html
    assert 'id="notifyPanel"' in html
    assert 'id="notifyForm"' in html
    assert 'type="email"' in html
    assert "No data is transmitted" in html
    assert "event.preventDefault()" in ui
    assert "notifyPanel" in ui
    assert "fetch(" not in ui
