from pathlib import Path
ROOT = Path(__file__).resolve().parents[1] / "site"
html = (ROOT/"index.html").read_text()
css = (ROOT/"styles.css").read_text()

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
    assert ".stage{position:relative;overflow:clip;background:transparent!important}" in compact
    assert ".stage{position:relative;z-index:3;" not in compact


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


def test_notify_concept_has_visible_accessible_panel():
    assert 'id="notifyConcept"' in html
    assert 'id="notifyPanel"' in html
    assert 'aria-controls="notifyPanel"' in html
    assert 'role="dialog"' in html
    assert 'aria-modal="true"' in html
    assert 'id="notifyClose"' in html
    assert 'body[data-notify-concept="open"] .interest-panel' in css


def test_chapter_background_is_state_driven():
    compact = css.replace(" ", "").replace("\n", "")
    assert '.stage{position:relative;overflow:clip;background:transparent!important}' in compact
    assert 'body::before{content:"";position:fixed' in compact
    for name in ["hero","design","spatial","adaptive","form","inspect","resolution","behind"]:
        assert f'body[data-range="{name}"]::before' in compact


def test_hotspot_projection_uses_viewport_origin():
    compact = css.replace(" ", "").replace("\n", "")
    hotspot_rule = compact.split(".hotspot{", 1)[1].split("}", 1)[0]
    assert "left:0" in hotspot_rule
    assert "top:0" in hotspot_rule
    assert "left:50%" not in hotspot_rule
    assert "top:50%" not in hotspot_rule


def test_transition_metadata_does_not_override_chapter_contrast():
    assert 'body[data-transition="to-dark"]' not in css
    assert 'body[data-transition="to-light"]' not in css
    assert 'body[data-transition] .copy' not in css


def test_no_literal_escape_sequences_in_product_copy():
    assert "\\n" not in html

def test_detail_hotspots_have_premium_readability_cues():
    compact = css.replace(" ", "").replace("\n", "")
    assert ".hotspot:before{" in compact
    assert 'body[data-range="design"].hotspot[data-visible="true"]' in compact
    assert ".hotspot:hover" in compact
    assert ".hotspot:focus-visible" in compact


def test_behind_nova_has_normal_flow_case_study_handoff():
    compact = css.replace(" ", "").replace("\n", "")
    assert 'id="case-study"' in html
    for label in ["Role", "Challenge", "What I built", "Result"]:
        assert label in html
    assert ".case-study{" in compact
    assert 'body[data-case-study="true"]#webgl' in compact
    assert 'body[data-case-study="true"].hotspot-layer' in compact

def test_navigation_and_hotspot_detail_have_refined_active_states():
    compact = css.replace(" ", "").replace("\n", "")
    assert ".product-nava.is-active" in compact
    assert '.hotspot[aria-expanded="true"]span' in compact

def test_behind_supporting_copy_waits_for_transition_settle():
    compact = css.replace(" ", "").replace("\n", "")
    assert 'body[data-range="behind"][data-settled="false"].behind-transition.behind-lede' in compact
    assert 'body[data-range="behind"][data-settled="false"].behind-transition.button--outline' in compact


def test_r11_readability_system_has_minimum_copy_and_utility_sizes():
    compact = css.replace(" ", "").replace("\n", "")
    assert "--body-copy:16px" in compact
    assert "--body-copy-mobile:14px" in compact
    assert "--utility-copy:10px" in compact
    assert "--utility-copy-mobile:10px" in compact
    assert ".copy>p:not(.eyebrow),.resolution-copy>p:not(.eyebrow)" in compact
    assert "font-size:var(--body-copy)" in compact
    assert "color:#565149" in compact
    assert ".stage--sound.copy>p" in compact
    assert "color:#c6beb2" in compact

def test_r11_mobile_typography_rebalances_headline_to_supporting_copy():
    compact = css.replace(" ", "").replace("\n", "")
    assert "font-size:var(--body-copy-mobile)" in compact
    assert ".copyh2,.resolution-copyh2,.behind-gridh2{font-size:clamp(46px,13.5vw,70px)" in compact

def test_v1_archive_is_packaged_under_main_site():
    v1 = ROOT / "v1"
    assert (v1 / "index.html").exists()
    assert (v1 / "styles.css").exists()
    assert (v1 / "app.js").exists()
    v1_html=(v1/"index.html").read_text()
    v1_js=(v1/"app.js").read_text()
    assert "NOVA — Interactive 3D Product Film" in v1_html
    assert '"three":"../vendor/three.module.js"' in v1_html
    assert "../assets/headphones-web.gltf" in v1_js


def test_r11_form_copy_moves_left_to_preserve_product_clearance():
    compact = css.replace(" ", "").replace("\n", "")
    assert ".stage--form.copy--left{margin-left:3.5vw}" in compact


def test_r11_mobile_copy_width_resets_after_desktop_readability_rule():
    compact = css.replace(" ", "").replace("\n", "")
    assert ".copy,.copy--compact,.copy--center,.inspect-copy,.resolution-copy{width:auto;margin-right:20px}" in compact


def test_r12_ui_bootstraps_before_3d_and_renderer_has_static_fallback():
    app = (ROOT/"app.js").read_text()
    assert './ui/ui-bootstrap.js' in html
    assert html.index('./ui/ui-bootstrap.js') < html.index('./app.js')
    assert "rendererAvailable" in app
    assert "STATIC MODE / 3D UNAVAILABLE" in app
    assert "dataset.modelState='fallback'" in app
    assert 'body[data-model-state="fallback"]' in css
    assert 'class="product-poster"' in html

def test_r12_mobile_navigation_replaces_hidden_desktop_nav():
    compact = css.replace(" ", "").replace("\n", "")
    assert 'id="mobileNavToggle"' in html
    assert 'id="mobileNavPanel"' in html
    assert 'aria-controls="mobileNavPanel"' in html
    assert ".mobile-nav" in compact
    assert 'body[data-mobile-nav="open"]' in css

def test_r12_essential_text_visibility_is_increased():
    compact = css.replace(" ", "").replace("\n", "")
    assert "--body-copy-mobile:16px" in compact
    assert "--control-copy:12px" in compact
    assert "--nav-copy:12px" in compact
    assert "font-size:var(--control-copy)" in compact
    assert "font-size:var(--nav-copy)" in compact

def test_r12_product_copy_explains_benefit_and_mode_meaning():
    for phrase in [
        "concept listening profiles",
        "Spatial opens the presentation",
        "Focus reduces surrounding motion",
        "Ambient keeps the visual field open",
        "Adaptive represents focused isolation",
        "Transparency represents awareness",
        "Explore the cushions, hinge and earcup controls",
    ]:
        assert phrase in html

def test_r12_product_facts_are_explicitly_conceptual_without_fake_specs():
    assert 'id="productFactsPanel"' in html
    assert "Concept product facts" in html
    assert "Not specified in this fictional concept" in html
    assert "Multipoint is part of the concept feature set" in html
    assert "Are the acoustic claims measured?" in html

def test_r12_named_inspection_views_and_client_capabilities_exist():
    for view in ["front","side","rear"]:
        assert f'data-inspection-view="{view}"' in html
    assert 'id="services"' in html
    assert "Interactive product launches" in html
    assert "Product configurators" in html
    assert "Responsive 3D integration" in html
    assert 'id="copyProjectBrief"' in html

def test_r12_social_metadata_is_present_without_fake_image():
    for prop in ['property="og:title"','property="og:description"','property="og:type"','property="og:url"','name="twitter:card"']:
        assert prop in html
