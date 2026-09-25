from pathlib import Path
ROOT = Path(__file__).resolve().parents[1] / "site"
html = (ROOT/"index.html").read_text()
css = (ROOT/"styles.css").read_text()

def test_product_story_precedes_technical_story():
    assert "Hear beyond" in html
    assert "Designed like a launch." in html
    assert html.index("Hear beyond") < html.index("Designed like a launch.")

def test_required_product_controls_are_semantic_buttons():
    for value in ["spatial","focus","ambient"]:
        assert f'data-listening-mode="{value}"' in html
    for value in ["adaptive","transparency"]:
        assert f'data-noise-mode="{value}"' in html
    for value in ["open","fold"]:
        assert f'data-fold-state="{value}"' in html
    assert 'id="inspectionReset"' in html
    assert "<button" in html

def test_v3_real_world_specs_are_sourced_and_not_presented_as_nova_manufacturing_claims():
    for phrase in [
        "Sony WH-1000XM6",
        "Bose QuietComfort Ultra Headphones (2nd Gen)",
        "Sennheiser MOMENTUM 4 Wireless",
        "254 g",
        "264 g",
        "293 g",
        "30 hrs",
        "60 hrs",
        "Bluetooth 5.3",
        "Bluetooth 5.4",
        "Bluetooth 5.2",
        "These manufacturer figures are reference context, not NOVA hardware specifications.",
    ]:
        assert phrase in html
    for url in [
        "sony.com/electronics/support/wireless-headphones-bluetooth-headphones/wh-1000xm6/specifications",
        "bose.com/p/headphones/bose-quietcomfort-ultra-headphones-2nd-gen",
        "support.sennheiser-hearing.com/hc/en-gb/articles/37791406604189-MOMENTUM-4-Wireless-Specifications",
    ]:
        assert url in html

def test_technical_facts_live_after_product_journey():
    assert html.index("Designed like a launch.") < html.index(">36<")
    assert html.index("Designed like a launch.") < html.index(">14<")

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
        "behind": "110svh",
    }
    for name, height in expected.items():
        if name == "behind":
            assert ".stage--behind{" in compact and "min-height:110svh" in compact
        else:
            assert f".stage--{name}{{min-height:{height}" in compact


def test_v3_removes_fake_notify_flow_and_replaces_it_with_real_benchmark_panel():
    assert 'id="notifyConcept"' not in html
    assert 'id="notifyPanel"' not in html
    assert "Preview notify flow" not in html
    assert "Demo only" not in html
    assert 'id="benchmarkSpecsTrigger"' in html
    assert 'id="benchmarkPanel"' in html
    assert 'aria-controls="benchmarkPanel"' in html
    assert 'body[data-benchmark-panel="open"]' in css


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

def test_v3_product_copy_uses_practical_language_without_demo_disclaimers():
    for phrase in [
        "These controls change the presentation—not the headphone hardware.",
        "Wide opens the scene",
        "Focus reduces visual distraction",
        "Context preserves more",
        "Isolate tightens",
        "Reveal restores",
        "Explore comfort, hinge movement and the earcup control surface",
    ]:
        assert phrase in html
    for banned in ["fictional product", "Concept product facts", "What the demo", "Not specified in this fictional concept"]:
        assert banned not in html

def test_v3_benchmark_panel_contains_practical_daily_use_context():
    assert 'id="benchmarkPanel"' in html
    for phrase in [
        "Touch + mouse",
        "Graceful fallback",
        "Reduced motion",
        "Responsive delivery",
        "Sony WH-1000XM6",
        "Bose QuietComfort Ultra Headphones (2nd Gen)",
        "Sennheiser MOMENTUM 4 Wireless",
    ]:
        assert phrase in html

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


def test_r12_mobile_resolution_uses_single_row_feature_rail():
    compact = css.replace(" ", "").replace("\n", "")
    assert ".stage--resolution.feature-strip{flex-wrap:nowrap" in compact
    assert "overflow-x:auto" in compact
    assert ".stage--resolution.feature-stripspan{flex:00auto}" in compact


def test_r12_mobile_resolution_copy_sits_below_proven_product_frame():
    compact = css.replace(" ", "").replace("\n", "")
    assert ".stage--resolution.stage-inner{padding-bottom:3svh}" in compact


def test_r13_guided_tour_creates_fast_product_route():
    assert 'id="guidedTourStart"' in html
    assert 'id="guidedTourPanel"' in html
    for step in ["comfort","fold","controls"]:
        assert f'data-tour-step="{step}"' in html
    assert "Three product moments" in html
    assert 'body[data-guided-tour="open"]' in css

def test_r13_case_study_uses_single_compact_transition():
    compact = css.replace(" ", "").replace("\n", "")
    assert "Designed like a launch." in html
    assert "Built like a product." in html
    assert html.index("Designed like a launch.") < html.index('id="case-study"')
    assert ".stage--behind{" in compact
    assert "box-sizing:border-box;min-height:110svh" in compact
    assert ".case-study{position:relative;z-index:24;min-height:155svh;padding:9svh" in compact

def test_r13_portability_copy_explains_product_benefit():
    assert "Fold the earcups inward for a more compact carry shape" in html
    assert "Hold the folded pose" in html

def test_r13_validation_evidence_is_client_facing_and_measured_not_marketing():
    assert 'id="validation-evidence"' in html
    for phrase in [
        "1440 × 1000",
        "1024 × 768",
        "390 × 844",
        "WebGL fallback",
        "Reduced motion",
        "GLTF failure",
        "Verified browser QA",
    ]:
        assert phrase in html
    assert "LCP ≤2.5s" not in html
    assert "INP ≤200ms" not in html

def test_r13_client_cta_is_more_explicit():
    assert "Discuss a 3D product website" in html
    assert "Copy a ready-to-send project brief" in html


def test_r13_compact_handoff_counts_padding_inside_110svh():
    compact = css.replace(" ", "").replace("\n", "")
    assert ".stage--behind{box-sizing:border-box;min-height:110svh" in compact


def test_r13_mobile_hero_fast_path_does_not_add_a_third_text_row():
    compact = css.replace(" ", "").replace("\n", "")
    assert 'aria-label="Three product moments guided tour">Guided tour<' in html
    assert ".stage--hero.hero-actions{display:grid;grid-template-columns:max-contentmax-content" in compact
    assert ".stage--hero.hero-actions.gesture-hint{display:none}" in compact


def test_r13_behind_transition_keeps_padding_inside_viewport_height():
    compact = css.replace(" ", "").replace("\n", "")
    assert ".behind-transition{box-sizing:border-box;position:sticky!important;top:0;min-height:100svh" in compact


def test_r13_compact_behind_parent_does_not_add_padding_outside_sticky_child():
    compact = css.replace(" ", "").replace("\n", "")
    assert ".stage--behind{box-sizing:border-box;min-height:110svh" in compact
    assert "color:#eee8de;padding:0}" in compact
    assert ".behind-transition{box-sizing:border-box;position:sticky!important;top:0;min-height:100svh" in compact


def test_v3_design_detail_rail_replaces_three_competing_text_callouts():
    for detail in ["cushion","headband","controls"]:
        assert f'data-design-detail="{detail}"' in html
    assert 'class="design-detail-rail"' in html
    compact = css.replace(" ", "").replace("\n", "")
    assert 'body[data-range="design"].hotspotspan{opacity:0' in compact
    assert 'body[data-range="design"].hotspot[aria-expanded="true"]span' in compact

def test_v3_scroll_progress_is_damped_for_smooth_motion():
    app=(ROOT/"app.js").read_text()
    assert "smoothedProgress" in app
    assert "THREE.MathUtils.damp" in app
    assert "SCROLL_DAMPING" in app

def test_v3_meta_and_product_summary_are_project_ready():
    assert 'content="NOVA is an interactive 3D over-ear headphone experience focused on comfort geometry, articulation, folding form and direct product inspection."' in html
    assert "Project specifications" in html
    for phrase in ["31.3K triangles","14 skinned meshes","36-joint rig","12 × 1K WebP maps","1.86 MB GLTF"]:
        assert phrase in html
    assert "30–60 h battery class" not in html
    assert "254–293 g benchmark" not in html


def test_v3_mobile_design_uses_compact_three_selector_rail():
    compact = css.replace(" ", "").replace("\n", "")
    assert ".stage--design.design-detail-rail{grid-template-columns:repeat(3,minmax(0,1fr))" in compact
    assert ".stage--design.design-detail-railbuttonsmall{display:none}" in compact
    assert ".stage--design.interaction-note{display:none}" in compact


def test_v3_project_specs_are_measured_asset_facts_not_nova_hardware_claims():
    for phrase in [
        "28 render primitives",
        "31,306 triangles",
        "36 joints",
        "5 materials",
        "12 × 1024² WebP textures",
        "3 animation clips",
        "42 channels",
        "27.708 s",
        "2.45 MiB 3D asset payload",
    ]:
        assert phrase in html
    assert "Market reference" in html
    assert "These manufacturer figures are reference context, not NOVA hardware specifications." in html

def test_v3_visible_mode_labels_are_presentation_controls_not_fake_headphone_features():
    for phrase in ["Wide","Focus","Context","Isolate","Reveal"]:
        assert f">{phrase}<" in html
    for phrase in [">Spatial<",">Ambient<",">Adaptive<",">Transparency<"]:
        assert phrase not in html

def test_v3_design_shows_only_one_marker_at_a_time():
    compact = css.replace(" ", "").replace("\n", "")
    assert 'body[data-range="design"].hotspot{opacity:0' in compact
    for detail in ["cushion","headband","controls"]:
        assert f'body[data-range="design"][data-design-detail="{detail}"].hotspot[data-hotspot="{detail}"]' in compact


def test_v3_mobile_design_uses_stable_selector_rail_not_moving_marker_taps():
    compact = css.replace(" ", "").replace("\n", "")
    assert 'body[data-range="design"].hotspot[data-visible="true"]{pointer-events:none!important' in compact


def test_v3_hero_leads_with_supported_physical_product_details_not_runtime_numbers():
    hero = html[html.index('id="hero"'):html.index('id="design"')]
    for phrase in ["deep circumaural cushions","articulated yokes","fold-in geometry","earcup control surface"]:
        assert phrase in hero
    for phrase in ["31.3K triangles","1.86 MB","36-joint rig"]:
        assert phrase not in hero
