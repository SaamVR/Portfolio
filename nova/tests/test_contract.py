from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "site"
html = (ROOT / "index.html").read_text() if (ROOT / "index.html").exists() else ""
js = (ROOT / "app.js").read_text() if (ROOT / "app.js").exists() else ""
css = (ROOT / "styles.css").read_text() if (ROOT / "styles.css").exists() else ""

def test_six_directed_chapters():
    for name in ["hero","form","mechanism","choreography","interaction","closing"]:
        assert f'data-scene="{name}"' in html

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

def test_section_local_choreography():
    assert "sceneProgress(section)" in js
    assert "sampleAnimation(activeScene, p)" in js
    assert "scrollY /" not in js

def test_responsive_and_reduced_motion():
    assert "@media (max-width: 700px)" in css
    assert "prefers-reduced-motion" in css


def test_animation_scrub_is_not_paused():
    assert "action.paused = true" not in js
    assert "mixer.setTime(targetTime)" in js

def test_cable_is_removed_from_presentation():
    assert "if(cable) cable.visible = false" in js
