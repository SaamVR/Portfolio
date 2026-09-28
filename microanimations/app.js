document.addEventListener('DOMContentLoaded', () => {
    // 01. Smart Loading
    setupToggle('#anim-smart-loading .trigger-btn', '#anim-smart-loading .anim-element', 3000);

    // 02. Success / Check
    setupToggle('#anim-success-check .action-btn', '#anim-success-check .action-btn', 2500);

    // 03. Upload Progress
    setupToggle('#anim-upload .trigger-zone', '#anim-upload .trigger-zone', 2500);

    // 04. Download Complete
    setupToggle('#anim-download .trigger-zone', '#anim-download .trigger-zone', 2500);

    // 05. Add to Cart
    setupToggle('#anim-add-to-cart .trigger-btn', '#anim-add-to-cart .commerce-stage', 2500);

    // 06. Payment / Checkout
    setupToggle('#anim-checkout .pay-btn', '#anim-checkout .stage', 4000);

    // 07. Notification
    setupToggle('#anim-notification .trigger-btn', '#anim-notification .notification-stage', 3500);

    // 08. Favorite / Like
    setupToggle('#anim-favorite .trigger-zone', '#anim-favorite .heart-btn', 1500);

    // 09. Theme Switch
    // Theme switch doesn't auto-reset. It toggles.
    const themeBtn = document.querySelector('#anim-toggle .trigger-zone');
    const themeCard = document.querySelector('#anim-toggle');
    if(themeBtn) {
        themeBtn.addEventListener('click', () => {
            themeBtn.classList.toggle('is-dark');
            themeCard.classList.toggle('dark-mode');
        });
    }

    // 10. Form Validation
    setupToggle('#anim-validation .trigger-zone', '#anim-validation .mock-form', 5000);
});

/**
 * Attaches a click listener to a trigger element that adds an 'is-animating' class 
 * to a target element for a specified duration, preventing double-clicks.
 */
function setupToggle(triggerSelector, targetSelector, durationMs) {
    const trigger = document.querySelector(triggerSelector);
    const target = document.querySelector(targetSelector);
    
    if (!trigger || !target) return;

    trigger.addEventListener('click', () => {
        if (target.classList.contains('is-animating')) return;
        
        target.classList.add('is-animating');
        
        setTimeout(() => {
            target.classList.remove('is-animating');
        }, durationMs);
    });
}
