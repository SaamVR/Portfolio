from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "site"
html = (ROOT / "index.html").read_text() if (ROOT / "index.html").exists() else ""
js = (ROOT / "app.js").read_text() if (ROOT / "app.js").exists() else ""
css = (ROOT / "styles.css").read_text() if (ROOT / "styles.css").exists() else ""

def test_gltf_runtime_not_fbx():
    assert "GLTFLoader" in js
    assert "FBXLoader" not in js
    assert "./assets/headphones-web.gltf" in js

def test_cable_does_not_control_framing():
    assert "Circle.013_0" in js
    assert "primaryProductBounds" in js

def test_source_facts_are_gltf_facts():
    assert ">36<" in html
    assert ">14<" in html
    assert ">3<" in html
    assert "27.71 SEC" in html
    assert "459" not in html
    assert "180" not in html

def test_responsive_and_reduced_motion():
    assert "@media (max-width: 700px)" in css
    assert "prefers-reduced-motion" in css

def test_animation_scrub_is_not_paused():
    adapter = (ROOT / "runtime" / "render-adapter.js").read_text()
    assert "action.paused = true" not in js
    assert "mixer.setTime" in adapter

def test_cable_is_removed_from_presentation():
    assert "if(cable) cable.visible = false" in js

def test_v2_runtime_contract_modules_exist():
    assert (ROOT / "runtime" / "timeline.js").exists()
    assert (ROOT / "runtime" / "composer.js").exists()


def test_v2_app_uses_global_runtime_not_scene_switches():
    assert './runtime/timeline.js' in js
    assert './runtime/composer.js' in js
    assert './runtime/render-adapter.js' in js
    assert 'resolveScene(' not in js
    assert 'sceneProgress(' not in js
    assert 'sampleCamera(' not in js
    assert 'sampleAnimation(' not in js


def test_v2_integration_wires_product_interactions():
    assert "./runtime/environment.js" in js
    assert "./ui/product-ui.js" in js
    assert "./interactions/fold-controller.js" in js
    assert "./interactions/inspection-controller.js" in js
    assert "./interactions/hotspot-controller.js" in js
    assert "./interactions/mode-controller.js" in js
    assert "bindProductUI(" in js
    assert "createEnvironment(" in js
    assert "createFoldController(" in js
    assert "createInspectionController(" in js
    assert "createHotspotController(" in js
    assert "createModeController(" in js


def test_v2_hotspot_anchor_offsets_are_component_calibrated():
    # Earcup markers use the animated earcup bone origins. The headband keeps a small local correction.
    assert js.count("offset:[0,0,0]") >= 2
    assert "offset:[0,-.43,-1.23]" not in js
    assert "offset:[0,-1.20,-.95]" not in js
    assert "offset:[-.12,-.12,0]" in js
