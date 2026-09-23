from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
qa = (ROOT / ".github/workflows/nova-qa.yml").read_text()
build = (ROOT / ".github/workflows/nova-build.yml").read_text()
public_qa = (ROOT / ".github/workflows/nova-public-preview-qa.yml").read_text()
hotspot_qa = (ROOT / ".github/workflows/nova-hotspot-qa.yml").read_text()

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

# Contract trigger: validates the QA workflow implementation on this lane head.

def test_collision_guard_covers_early_hero_and_design_at_strict_threshold():
    assert "{p:.02,label:'hero-opening'}" in qa
    assert "{p:.10,label:'hero-resolved'}" in qa
    assert "{p:.18,label:'design-close'}" in qa
    assert "{p:.20,label:'design-peak'}" in qa
    assert "result.ratio>.04" in qa
# Trigger fast contracts on the strengthened browser-collision implementation.

def test_hotspot_qa_tracks_authored_motion_not_legacy_fixed_screen_band():
    assert "hotspotMotionAudit" in qa
    assert "hotspot should move with authored close pass" in qa
    assert "state.height*.34" not in qa
    assert "state.height*.62" not in qa
# Trigger contracts for motion-aware hotspot QA implementation.
# Final exact verification checkpoint: Contracts + Visual QA + Production Bundle.

def test_focused_hotspot_qa_tracks_close_pass_motion_not_fixed_band():
    assert "hotspot should move with authored close pass" in hotspot_qa
    assert "state.height*.34" not in hotspot_qa
    assert "state.height*.62" not in hotspot_qa
# Trigger contracts for focused motion-aware hotspot QA implementation.

def test_public_preview_hotspots_follow_authored_motion():
    assert "publicHotspotMotionAudit" in public_qa
    assert "deployed hotspot should move with authored close pass" in public_qa
    assert "state.h*.34" not in public_qa
    assert "state.h*.62" not in public_qa
# Trigger contracts for public motion-aware hotspot QA implementation.
# Latest-source exact verification checkpoint after mobile recentering.

def test_r10_visual_qa_covers_case_study_handoff():
    assert "caseStudyAudit" in qa
    assert "case-study product must yield" in qa
    assert "prefix+'_case_study.png'" in qa
    assert "caseStudyAudit({width:1440,height:1000},'desktop')" in qa
    assert "caseStudyAudit({width:390,height:844},'mobile')" in qa

# R10 GREEN verification trigger after browser QA implementation.

def test_r10_visual_qa_uses_cinematic_progress_not_full_document_progress():
    assert "cinematicMax" in qa
    assert "behind.offsetTop+behind.offsetHeight-innerHeight" in qa
    assert "document.documentElement.scrollHeight-innerHeight" not in qa

# R10 GREEN trigger after cinematic-progress QA implementation.

def test_post_deploy_and_focused_hotspot_qa_use_cinematic_progress():
    for workflow in [public_qa, hotspot_qa]:
        assert "cinematicMax" in workflow
        assert "behind.offsetTop+behind.offsetHeight-innerHeight" in workflow
        assert "document.documentElement.scrollHeight-innerHeight" not in workflow

def test_mobile_hotspot_expansion_is_visually_verified():
    assert "mobile_hotspot_detail.png" in qa
    assert "aria-expanded" in qa
    assert "expanded hotspot label" in qa

def test_mobile_hotspot_expanded_label_is_viewport_bounded():
    assert "expanded hotspot label outside viewport" in qa
    assert "labelRect.left" in qa
    assert "labelRect.right" in qa
