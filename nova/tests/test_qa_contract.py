from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
qa = (ROOT / ".github/workflows/nova-qa.yml").read_text()
build = (ROOT / ".github/workflows/nova-build.yml").read_text()

def test_visual_qa_targets_v2_integration_and_progress_boundaries():
    assert "nova/v2-integration" in qa
    for value in [".119", ".121", ".279", ".281", ".959", ".961"]:
        assert value in qa
    assert "dataset.range" in qa

def test_visual_qa_exercises_product_interactions():
    for phrase in ["focus", "transparency", "fold", "reset view"]:
        assert phrase.lower() in qa.lower()
    assert "reducedMotion" in qa
    assert "headphones-web.gltf" in qa

def test_build_validates_v2_module_tree():
    required = [
        "runtime/timeline.js",
        "runtime/composer.js",
        "runtime/render-adapter.js",
        "runtime/environment.js",
        "ui/product-ui.js",
        "interactions/fold-controller.js",
        "interactions/inspection-controller.js",
        "interactions/hotspot-controller.js",
        "interactions/mode-controller.js",
    ]
    for path in required:
        assert path in build

def test_refinement_qa_captures_detail_passes_and_guards_copy_collision():
    for value in [".06", ".16", ".18", ".22", ".26", ".76", ".83", ".945"]:
        assert value in qa
    assert "productCopyCollisionAudit" in qa
    assert "headline/product collision" in qa
    assert "390,height:844" in qa

