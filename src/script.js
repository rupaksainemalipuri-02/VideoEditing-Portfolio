const editingToolsPanel = document.querySelector('.editing-tools-panel');
const editingToolIcons = document.querySelectorAll('.editing-tool-icon');
const editingToolItems = document.querySelectorAll('.editing-tool');
const toolsSection = document.getElementById('tools') || document.querySelector('.editing-tools');

let isUserInteractingWithTools = false;
let autoHoverTimers = [];
let hasAutoHoveredThisVisit = false;
let lastToolsScrollY = window.scrollY;

function setToolHover(activeIndex) {
    if (!editingToolItems.length) return;
    editingToolItems.forEach((element, elementIndex) => {
        if (activeIndex === null || activeIndex === undefined || activeIndex < 0) {
            element.style.setProperty('--icon-scale', '1');
            element.style.setProperty('--icon-shift', '0px');
            element.classList.remove('is-hovered');
            return;
        }

        const distance = Math.abs(elementIndex - activeIndex);
        const iconScale = distance === 0 ? 1.5 : distance === 1 ? 1.07 : 1;
        const shiftAmount = distance === 1 ? 12 : distance === 2 ? 14 : 0;
        const iconShift = Math.sign(elementIndex - activeIndex) * shiftAmount;

        element.style.setProperty('--icon-scale', iconScale);
        element.style.setProperty('--icon-shift', `${iconShift}px`);
        if (elementIndex === activeIndex) {
            element.classList.add('is-hovered');
        } else {
            element.classList.remove('is-hovered');
        }
    });
}

function clearAutoHoverTimers() {
    autoHoverTimers.forEach((timer) => clearTimeout(timer));
    autoHoverTimers = [];
}

function triggerToolBounce(index) {
    const item = editingToolItems[index];
    if (!item) return;
    const icon = item.querySelector('.editing-tool-icon');
    if (!icon) return;

    icon.classList.remove('is-bouncing');
    void icon.offsetWidth; // force reflow
    icon.classList.add('is-bouncing');
}

function playToolsAutoHoverSequence() {
    if (isUserInteractingWithTools || !editingToolItems.length) return;
    clearAutoHoverTimers();

    // 1 second initial delay upon entering tools section
    // Fluid ripple wave across icons without waiting for AE & PrPro to scale completely
    // AE -> PrPro -> DaVinci -> wait -> click DaVinci (bounce) -> release

    // Step 1: After Effects (0)
    autoHoverTimers.push(setTimeout(() => {
        if (isUserInteractingWithTools) return;
        setToolHover(0);
    }, 1000));

    // Step 2: Premiere Pro (1) - handoff mid-scale without waiting
    autoHoverTimers.push(setTimeout(() => {
        if (isUserInteractingWithTools) return;
        setToolHover(1);
    }, 1095));

    // Step 3: DaVinci Resolve (2) - handoff mid-scale into final icon
    autoHoverTimers.push(setTimeout(() => {
        if (isUserInteractingWithTools) return;
        setToolHover(2);
    }, 1190));

    // Step 4: Wait on DaVinci, then automatically click DaVinci (triggers bounce!)
    autoHoverTimers.push(setTimeout(() => {
        if (isUserInteractingWithTools) return;
        triggerToolBounce(2);
    }, 1650));

    // Step 5: Settle back to neutral
    autoHoverTimers.push(setTimeout(() => {
        if (isUserInteractingWithTools) return;
        setToolHover(null);
    }, 2150));
}

function checkToolsAutoHover() {
    if (!toolsSection || !editingToolItems.length) return;

    const currentY = window.scrollY;
    const isScrollingDown = currentY >= lastToolsScrollY;
    lastToolsScrollY = currentY;

    const rect = toolsSection.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;

    // Reset visit flag when scrolled away (above or past)
    if (rect.top > windowHeight * 0.85 || rect.bottom < 0) {
        hasAutoHoveredThisVisit = false;
        if (autoHoverTimers.length && (rect.top > windowHeight || rect.bottom < -60)) {
            clearAutoHoverTimers();
            if (!isUserInteractingWithTools) {
                setToolHover(null);
            }
        }
    }

    // Trigger when entering tools section while scrolling DOWN
    const isEnteringTools = rect.top <= windowHeight * 0.72 && rect.bottom >= windowHeight * 0.25;
    if (isScrollingDown && isEnteringTools && !hasAutoHoveredThisVisit && !isUserInteractingWithTools) {
        hasAutoHoveredThisVisit = true;
        playToolsAutoHoverSequence();
    }
}

window.addEventListener('scroll', checkToolsAutoHover, { passive: true });

// IntersectionObserver backup for trigger reliability on all devices
if (toolsSection) {
    const toolsObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            const currentY = window.scrollY;
            const isScrollingDown = currentY >= lastToolsScrollY;
            if (entry.isIntersecting) {
                const rect = entry.boundingClientRect;
                const windowHeight = window.innerHeight || document.documentElement.clientHeight;
                if (isScrollingDown && rect.top <= windowHeight * 0.75 && !hasAutoHoveredThisVisit && !isUserInteractingWithTools) {
                    hasAutoHoveredThisVisit = true;
                    playToolsAutoHoverSequence();
                }
            } else {
                hasAutoHoveredThisVisit = false;
                clearAutoHoverTimers();
                if (!isUserInteractingWithTools) {
                    setToolHover(null);
                }
            }
        });
    }, {
        threshold: [0, 0.2, 0.5]
    });
    toolsObserver.observe(toolsSection);
}

// User Mouse / Touch interactions
if (editingToolsPanel) {
    editingToolsPanel.addEventListener('pointerenter', () => {
        isUserInteractingWithTools = true;
        clearAutoHoverTimers();
    });

    editingToolsPanel.addEventListener('pointermove', (event) => {
        isUserInteractingWithTools = true;
        clearAutoHoverTimers();

        const cursorX = event.clientX;
        const iconCenters = [...editingToolIcons].map((icon) => {
            const bounds = icon.getBoundingClientRect();
            return bounds.left + (bounds.width / 2);
        });
        const iconBounds = [...editingToolIcons].map((icon) => icon.getBoundingClientRect());
        const groupLeft = iconBounds[0].left;
        const groupRight = iconBounds[iconBounds.length - 1].right;
        const activeIndex = iconCenters.reduce((closestIndex, center, index) => {
            return Math.abs(cursorX - center) < Math.abs(cursorX - iconCenters[closestIndex]) ? index : closestIndex;
        }, 0);
        const outsideDistance = cursorX < groupLeft ? groupLeft - cursorX : cursorX > groupRight ? cursorX - groupRight : 0;
        const groupProximity = Math.max(0, Math.min(1, 1 - (outsideDistance / 120)));

        editingToolIcons.forEach((element, elementIndex) => {
            const distance = Math.abs(elementIndex - activeIndex);
            const scaleBoost = distance === 0 ? 0.5 : distance === 1 ? 0.07 : 0;
            const shiftAmount = distance === 1 ? 12 : distance === 2 ? 14 : 0;
            const iconScale = 1 + (scaleBoost * groupProximity);
            const iconShift = Math.sign(elementIndex - activeIndex) * shiftAmount * groupProximity;

            element.style.setProperty('--icon-scale', iconScale);
            element.style.setProperty('--icon-shift', `${iconShift}px`);
            editingToolItems[elementIndex].style.setProperty('--icon-scale', iconScale);
            editingToolItems[elementIndex].style.setProperty('--icon-shift', `${iconShift}px`);
        });
    });

    editingToolsPanel.addEventListener('mouseleave', () => {
        isUserInteractingWithTools = false;
        setToolHover(null);
    });
}

editingToolItems.forEach((item, activeIndex) => {
    item.addEventListener('pointerenter', () => {
        isUserInteractingWithTools = true;
        clearAutoHoverTimers();
        setToolHover(activeIndex);
    });

    item.addEventListener('click', (event) => {
        if (event.isTrusted) {
            clearAutoHoverTimers();
        }
        triggerToolBounce(activeIndex);
    });
});

editingToolIcons.forEach((icon) => {
    icon.addEventListener('animationend', () => {
        icon.classList.remove('is-bouncing');
    });
});


// Typewriter effect only for the last two words of About Me without cursor (with ease-out)
let typewriterTriggered = false;

function runTypewriter() {
    const typewriterElement = document.querySelector('.about-copy-typewriter');
    if (!typewriterElement || typewriterTriggered) return;
    typewriterTriggered = true;

    const fullText = typewriterElement.textContent.trim();
    typewriterElement.textContent = '';

    const TOTAL_DURATION_MS = 1000; // 1 second total
    let startTime = 0;

    function easeOutQuad(t) {
        return 1 - (1 - t) * (1 - t);
    }

    function step(timestamp) {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const linearProgress = Math.min(1, elapsed / TOTAL_DURATION_MS);
        const easedProgress = easeOutQuad(linearProgress);
        const charCount = Math.floor(easedProgress * fullText.length);

        typewriterElement.textContent = fullText.slice(0, charCount);

        if (linearProgress < 1) {
            requestAnimationFrame(step);
        } else {
            typewriterElement.textContent = fullText;
        }
    }

    requestAnimationFrame(step);
}

// Sequential scroll-triggered fade-in and slide-down animation
const revealElements = document.querySelectorAll(
    '.section-title, .about-copy, .editing-tools-panel, .client-work-grid'
);

const revealObserver = new IntersectionObserver((entries) => {
    let delayIndex = 0;
    entries.forEach((entry) => {
        if (entry.isIntersecting && !entry.target.classList.contains('revealed')) {
            const delay = delayIndex * 180; // 180ms delay between consecutive items
            entry.target.style.setProperty('--reveal-delay', `${delay}ms`);
            entry.target.classList.add('revealed');
            delayIndex++;
        }
    });
}, {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
});

revealElements.forEach((element) => {
    revealObserver.observe(element);
});

// Start typewriter animation in advance as the user begins scrolling towards the section
const coverSection = document.querySelector('.cover-section');
const earlyTypewriterObserver = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && window.scrollY > 40) {
        runTypewriter();
    }
}, {
    threshold: 0.01,
    rootMargin: '200px 0px 0px 0px' // Triggers early before the section even reaches the screen
});

if (coverSection) {
    earlyTypewriterObserver.observe(coverSection);
}

// --- Smooth Scroll Engine & Client Works Controller ---
const clientWorkSection = document.querySelector('.client-work');
const clientWorkGrid = document.querySelector('.client-work-grid');

const VERTICAL_SCROLL_SENSITIVITY = 0.44; // Cushioned, responsive vertical scroll
const HORIZONTAL_SCROLL_SENSITIVITY = 0.26; // Card scroll sensitivity

let targetScrollY = window.scrollY;
let isVerticalScrolling = false;

let horizontalScrollTarget = 0;
let isHorizontalScrolling = false;

let isPullingTransition = false;
let lastTransitionDirection = 'down';
let transitionAnimId = null;
let settleTimer = null;
let heroPullTimer = null;
let heroPullDownTimer = null;
let lastVerticalDeltaY = 0;

// Upward overscroll physics state for hero section elements
let heroOverscroll = 0;
let heroOverscrollTarget = 0;
let heroOverscrollVelocity = 0;
let heroOverscrollLastTime = 0;
let heroRawPull = 0;
let heroOverscrollAnimId = null;
let heroOverscrollDecayTimer = null;

// Bottom upward overscroll physics state for contact/footer layer
let bottomOverscroll = 0;
let bottomOverscrollTarget = 0;
let bottomOverscrollVelocity = 0;
let bottomOverscrollLastTime = 0;
let bottomRawPull = 0;
let bottomOverscrollAnimId = null;
let bottomOverscrollDecayTimer = null;

const heroSectionElement = document.querySelector('.hero-section');
const bottomBounceItems = [
    {
        el: document.querySelector('.handle-email'),
        pullScale: 1.0,
        follow: 0.24,
        omega: 26,
        netY: 0,
        v: 0
    },
    {
        el: document.querySelector('.handle-insta'),
        pullScale: 0.94,
        follow: 0.20,
        omega: 20.5,
        netY: 0,
        v: 0
    },
    {
        el: document.querySelector('.contact-page-footer'),
        pullScale: 0.45,
        follow: 0.17,
        omega: 16.5,
        netY: 0,
        v: 0
    }
];
const HERO_MAX_STRETCH = 140;
const BOTTOM_MAX_STRETCH = 95;

function setHeroOverscrollVars(progress) {
    const val = progress.toFixed(4);
    document.documentElement.style.setProperty('--hero-overscroll', val);
    if (heroSectionElement) {
        heroSectionElement.style.setProperty('--hero-overscroll', val);
    }
    if (coverSection) {
        let reboundY = 0;
        if (progress < 0 && window.scrollY <= 2) {
            const absProgress = Math.abs(progress);
            const vh = window.innerHeight || document.documentElement.clientHeight || 0;
            const gapBelowViewport = Math.max(0, coverSection.offsetTop - vh);
            const bridgedGap = gapBelowViewport * Math.min(1, absProgress / 0.08);
            reboundY = -(bridgedGap + absProgress * 270);
        }
        coverSection.style.setProperty('--cover-rebound-y', `${reboundY.toFixed(2)}px`);
    }
}

function setBottomOverscrollVar(px) {
    if (heroContentLayer) {
        heroContentLayer.style.setProperty('--bottom-overscroll-y', `${Math.max(0, px).toFixed(2)}px`);
    }
}

function setBottomOverscrollDirect(px) {
    const clamped = Math.max(0, px);
    bottomOverscroll = clamped;
    bottomOverscrollTarget = clamped;
    bottomOverscrollVelocity = 0;
    setBottomOverscrollVar(clamped);

    bottomBounceItems.forEach((item) => {
        item.netY = clamped * item.pullScale;
        item.v = 0;
        if (item.el) {
            const relativeY = clamped - item.netY;
            if (Math.abs(relativeY) > 0.05 || clamped > 0) {
                item.el.style.translate = `0px ${relativeY.toFixed(2)}px`;
            } else {
                item.el.style.removeProperty('translate');
            }
        }
    });
}

function triggerBottomOverscrollPulse(peakPx = 46) {
    clearTimeout(bottomOverscrollDecayTimer);
    bottomRawPull = peakPx;
    bottomOverscrollTarget = peakPx;
    startBottomOverscrollSpring();
    bottomOverscrollDecayTimer = setTimeout(() => {
        bottomRawPull = 0;
        bottomOverscrollTarget = 0;
        startBottomOverscrollSpring();
    }, 130);
}

function resetBottomItems() {
    bottomBounceItems.forEach((item) => {
        item.netY = 0;
        item.v = 0;
        if (item.el) item.el.style.removeProperty('translate');
    });
}

function cancelBottomOverscroll() {
    if (bottomOverscrollAnimId) {
        cancelAnimationFrame(bottomOverscrollAnimId);
        bottomOverscrollAnimId = null;
    }
    clearTimeout(bottomOverscrollDecayTimer);
    bottomOverscrollDecayTimer = null;
    bottomOverscroll = 0;
    bottomOverscrollTarget = 0;
    bottomOverscrollVelocity = 0;
    bottomOverscrollLastTime = 0;
    bottomRawPull = 0;
    setBottomOverscrollVar(0);
    resetBottomItems();
}

function updateBottomOverscroll(now) {
    if (!bottomOverscrollLastTime) {
        bottomOverscrollLastTime = now;
    }
    const dt = Math.min(0.033, Math.max(0.004, (now - bottomOverscrollLastTime) / 1000));
    bottomOverscrollLastTime = now;
    const frameScale = dt / 0.01667;

    if (bottomOverscrollTarget > 0) {
        const followRate = Math.min(1, frameScale * 0.25);
        bottomOverscroll += (bottomOverscrollTarget - bottomOverscroll) * followRate;
        bottomOverscrollVelocity = 0;
    } else if (bottomOverscroll > 0) {
        const omega = 28;
        const zeta = 0.78;
        const accel = -(omega * omega) * bottomOverscroll - (2 * zeta * omega) * bottomOverscrollVelocity;
        bottomOverscrollVelocity += accel * dt;
        bottomOverscroll += bottomOverscrollVelocity * dt;
        if (bottomOverscroll <= 0.15) {
            bottomOverscroll = 0;
            bottomOverscrollVelocity = 0;
        }
    }

    setBottomOverscrollVar(bottomOverscroll);

    const itemDamping = 0.42;
    let itemsActive = false;

    bottomBounceItems.forEach((item) => {
        if (!item.el) return;

        if (bottomOverscrollTarget > 0) {
            const targetY = bottomOverscrollTarget * item.pullScale;
            const rate = Math.min(1, frameScale * item.follow);
            item.netY += (targetY - item.netY) * rate;
            item.v = 0;
            if (Math.abs(targetY - item.netY) >= 0.05) {
                itemsActive = true;
            }
        } else {
            const accel = -(item.omega * item.omega) * item.netY - (2 * itemDamping * item.omega) * item.v;
            item.v += accel * dt;
            item.netY += item.v * dt;

            if (Math.abs(item.netY) < 0.08 && Math.abs(item.v) < 0.6) {
                item.netY = 0;
                item.v = 0;
            } else {
                itemsActive = true;
            }
        }

        const relativeY = bottomOverscroll - item.netY;
        if (Math.abs(relativeY) > 0.05 || bottomOverscroll > 0 || Math.abs(item.netY) > 0.05) {
            item.el.style.translate = `0px ${relativeY.toFixed(2)}px`;
        } else {
            item.el.style.removeProperty('translate');
        }
    });

    const isLayerSettled = bottomOverscrollTarget === 0 && bottomOverscroll <= 0.15;
    const isLayerFollowSettled = bottomOverscrollTarget > 0 &&
        Math.abs(bottomOverscrollTarget - bottomOverscroll) < 0.05;

    if ((bottomOverscrollTarget === 0 && (!isLayerSettled || itemsActive)) ||
        (bottomOverscrollTarget > 0 && (!isLayerFollowSettled || itemsActive))) {
        bottomOverscrollAnimId = requestAnimationFrame(updateBottomOverscroll);
    } else if (isLayerSettled && !itemsActive) {
        bottomOverscroll = 0;
        bottomOverscrollTarget = 0;
        bottomOverscrollVelocity = 0;
        bottomOverscrollLastTime = 0;
        bottomRawPull = 0;
        setBottomOverscrollVar(0);
        resetBottomItems();
        bottomOverscrollAnimId = null;
    } else {
        bottomOverscrollLastTime = 0;
        bottomOverscrollAnimId = null;
    }
}

function startBottomOverscrollSpring() {
    if (!bottomOverscrollAnimId) {
        bottomOverscrollLastTime = performance.now();
        bottomOverscrollAnimId = requestAnimationFrame(updateBottomOverscroll);
    }
}

function cancelHeroOverscroll() {
    if (heroOverscrollAnimId) {
        cancelAnimationFrame(heroOverscrollAnimId);
        heroOverscrollAnimId = null;
    }
    clearTimeout(heroOverscrollDecayTimer);
    heroOverscrollDecayTimer = null;
    heroOverscroll = 0;
    heroOverscrollTarget = 0;
    heroOverscrollVelocity = 0;
    heroOverscrollLastTime = 0;
    heroRawPull = 0;
    setHeroOverscrollVars(0);
}

function updateHeroOverscroll(now) {
    if (!heroOverscrollLastTime) {
        heroOverscrollLastTime = now;
    }
    const dt = Math.min(0.033, Math.max(0.004, (now - heroOverscrollLastTime) / 1000));
    heroOverscrollLastTime = now;

    if (heroOverscrollTarget > 0) {
        const followRate = Math.min(1, (dt / 0.01667) * 0.22);
        heroOverscroll += (heroOverscrollTarget - heroOverscroll) * followRate;
        heroOverscrollVelocity = 0;
    } else {
        const omega = 17;
        const zeta = 0.35;
        const accel = -(omega * omega) * heroOverscroll - (2 * zeta * omega) * heroOverscrollVelocity;
        heroOverscrollVelocity += accel * dt;
        heroOverscroll += heroOverscrollVelocity * dt;
    }

    const progress = Math.min(1, Math.max(-0.35, heroOverscroll / 125));
    setHeroOverscrollVars(progress);

    const isSettled = heroOverscrollTarget === 0 &&
        Math.abs(heroOverscroll) < 0.08 &&
        Math.abs(heroOverscrollVelocity) < 0.6;
    const isFollowSettled = heroOverscrollTarget > 0 &&
        Math.abs(heroOverscrollTarget - heroOverscroll) < 0.01;

    if (!isSettled && !isFollowSettled) {
        heroOverscrollAnimId = requestAnimationFrame(updateHeroOverscroll);
    } else if (isSettled) {
        heroOverscroll = 0;
        heroOverscrollTarget = 0;
        heroOverscrollVelocity = 0;
        heroOverscrollLastTime = 0;
        heroRawPull = 0;
        setHeroOverscrollVars(0);
        heroOverscrollAnimId = null;
    } else {
        heroOverscrollLastTime = 0;
        heroOverscrollAnimId = null;
    }
}

function startHeroOverscrollSpring() {
    if (!heroOverscrollAnimId) {
        heroOverscrollLastTime = performance.now();
        heroOverscrollAnimId = requestAnimationFrame(updateHeroOverscroll);
    }
}

let topTouchAnchorY = null;
let bottomTouchAnchorY = null;

window.addEventListener('touchstart', (e) => {
    if (isPullingTransition && !e.target.closest('.site-navbar, .navbar-wrapper')) {
        if (transitionAnimId) cancelAnimationFrame(transitionAnimId);
        isPullingTransition = false;
        transitionAnimId = null;
        targetScrollY = window.scrollY;
        updateNavbarOnScroll();
    }
    if (e.touches.length === 1) {
        const y = e.touches[0].clientY;
        const maxScrollY = getMaxScrollY();
        topTouchAnchorY = window.scrollY <= 2 ? y : null;
        bottomTouchAnchorY = (maxScrollY > 20 && window.scrollY >= maxScrollY - 2) ? y : null;
    }
}, { passive: true });

window.addEventListener('touchmove', (e) => {
    if (e.touches.length !== 1) return;
    const y = e.touches[0].clientY;
    const maxScrollY = getMaxScrollY();

    if (window.scrollY <= 2) {
        if (topTouchAnchorY === null) topTouchAnchorY = y;
        const delta = y - topTouchAnchorY;
        if (delta > 0) {
            heroRawPull = delta * 0.35;
            heroOverscrollTarget = (heroRawPull * HERO_MAX_STRETCH) / (heroRawPull + HERO_MAX_STRETCH);
            startHeroOverscrollSpring();
        } else if (delta < -6 && (Math.abs(heroOverscroll) > 0.001 || Math.abs(heroOverscrollVelocity) > 0.01 || heroOverscrollTarget !== 0 || heroRawPull > 0)) {
            cancelHeroOverscroll();
        } else if (heroOverscrollTarget > 0) {
            heroRawPull = 0;
            heroOverscrollTarget = 0;
            startHeroOverscrollSpring();
        }
    } else {
        topTouchAnchorY = null;
    }

    if (maxScrollY > 20 && window.scrollY >= maxScrollY - 2) {
        if (bottomTouchAnchorY === null) bottomTouchAnchorY = y;
        const pullUpDelta = bottomTouchAnchorY - y;
        if (pullUpDelta > 0) {
            bottomRawPull = pullUpDelta * 0.45;
            bottomOverscrollTarget = (bottomRawPull * BOTTOM_MAX_STRETCH) / (bottomRawPull + BOTTOM_MAX_STRETCH);
            startBottomOverscrollSpring();
        } else if (pullUpDelta < -6 && (bottomOverscroll > 0.001 || Math.abs(bottomOverscrollVelocity) > 0.01 || bottomOverscrollTarget > 0 || bottomRawPull > 0)) {
            cancelBottomOverscroll();
        } else if (bottomOverscrollTarget > 0) {
            bottomRawPull = 0;
            bottomOverscrollTarget = 0;
            startBottomOverscrollSpring();
        }
    } else {
        bottomTouchAnchorY = null;
    }
}, { passive: true });

function releaseHeroOverscroll() {
    topTouchAnchorY = null;
    bottomTouchAnchorY = null;

    if (!(heroOverscrollTarget === 0 && Math.abs(heroOverscroll) < 0.001 && Math.abs(heroOverscrollVelocity) < 0.001 && heroRawPull === 0)) {
        heroRawPull = 0;
        heroOverscrollTarget = 0;
        startHeroOverscrollSpring();
    }

    if (!(bottomOverscrollTarget === 0 && bottomOverscroll < 0.001 && Math.abs(bottomOverscrollVelocity) < 0.001 && bottomRawPull === 0)) {
        bottomRawPull = 0;
        bottomOverscrollTarget = 0;
        startBottomOverscrollSpring();
    }
}

window.addEventListener('touchend', releaseHeroOverscroll, { passive: true });
window.addEventListener('touchcancel', releaseHeroOverscroll, { passive: true });

function getMaxScrollY() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
}

function getMaxHorizontalScroll() {
    if (!clientWorkGrid) return 0;
    return Math.max(0, clientWorkGrid.scrollWidth - clientWorkGrid.clientWidth);
}

function isClientWorkInView() {
    if (!clientWorkSection) return false;
    const rect = clientWorkSection.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
}

let lastKnownCursorX = window.innerWidth / 2;
let lastKnownCursorY = window.innerHeight / 2;
let primeInitialTiltForCursor = null;
const instaScreenContainer = document.querySelector('.insta-screen-container');

function getCoverBottomScrollY() {
    if (!coverSection) return 0;
    return (coverSection.offsetTop + coverSection.offsetHeight) - window.innerHeight;
}

const heroContentLayer = document.querySelector('.hero-content-layer');
const supportsScrollTimeline = typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('animation-timeline: scroll()');
const parallaxHeroTitles = document.querySelectorAll('.hero-title');
const parallaxPortfolioTitle = document.querySelector('.portfolio-title');
const parallaxProfileImages = document.querySelectorAll('.profile-image');
const parallaxHeroBio = document.querySelector('.hero-bio');

function updateHeroScrollParallaxFallback(currentY) {
    if (supportsScrollTimeline) return;

    const vh = window.innerHeight || document.documentElement.clientHeight || 1;
    const progress = Math.min(1, Math.max(0, currentY / vh));
    const isMobile = window.matchMedia('(max-width: 700px)').matches;

    const applyParallax = (el, tx, ty, scale) => {
        if (!el) return;
        el.style.translate = `${tx.toFixed(2)}px ${ty.toFixed(2)}px`;
        el.style.scale = scale.toFixed(4);
    };

    const profileX = isMobile ? 0 : -30 * progress;
    const profileY = (isMobile ? -0.48 * vh : -160) * progress;
    const profileScale = 1 - (isMobile ? 0.04 : 0.1) * progress;

    const portfolioX = isMobile ? 0 : -15 * progress;
    const portfolioY = (isMobile ? -0.28 * vh : -100) * progress;
    const portfolioScale = 1 - (isMobile ? 0.09 : 0.05) * progress;

    const titleY = (isMobile ? -0.20 * vh : -100) * progress;
    const titleScale = 1 - (isMobile ? 0.18 : 0.05) * progress;

    const bioY = (isMobile ? -0.62 * vh : -150) * progress;
    const bioScale = 1 - (isMobile ? 0.04 : 0.1) * progress;

    parallaxProfileImages.forEach((img) => applyParallax(img, profileX, profileY, profileScale));
    applyParallax(parallaxPortfolioTitle, portfolioX, portfolioY, portfolioScale);
    parallaxHeroTitles.forEach((title) => applyParallax(title, 0, titleY, titleScale));
    applyParallax(parallaxHeroBio, 0, bioY, bioScale);
}

function updateCoverExitTransform() {
    if (!coverSection) return;
    const coverBottomScrollY = getCoverBottomScrollY();
    const maxScrollY = getMaxScrollY();
    const coverExitDist = window.innerHeight;
    const instaScrollY = coverBottomScrollY + coverExitDist;
    const currentY = window.scrollY;

    if (currentY > 2 && coverSection.style.getPropertyValue('--cover-rebound-y') !== '0px') {
        coverSection.style.setProperty('--cover-rebound-y', '0px');
    }
    if (!isPullingTransition && currentY <= instaScrollY + 4 && (bottomOverscroll > 0.001 || bottomRawPull > 0)) {
        cancelBottomOverscroll();
    }

    updateHeroScrollParallaxFallback(currentY);

    // The moment the user switches from Tools to Work tab (or is at Work/Instagram):
    // that is when the hero elements walk up and Instagram screen walks in in the background.
    // And vice-versa: scrolling back up into Tools/About/Home walks hero elements back down.
    if (heroSectionElement) {
        const coverSnapTarget = window.innerHeight;
        const isNearHero = currentY < coverSnapTarget;
        heroSectionElement.classList.toggle('is-near-hero', isNearHero);

        const workEl = document.getElementById('work');
        const threshold = window.innerHeight * 0.45;
        const isAtWorkOrPast = !isNearHero && (
            (workEl && workEl.getBoundingClientRect().top <= threshold) ||
            (currentY >= coverBottomScrollY - 20)
        );

        if (isAtWorkOrPast) {
            if (!heroSectionElement.classList.contains('is-exit-revealed')) {
                heroSectionElement.classList.add('is-exit-revealed');
            }
            if (typeof primeInitialTiltForCursor === 'function') {
                primeInitialTiltForCursor();
            }
            const instaTitle = heroSectionElement.querySelector('.insta-title');
            if (instaTitle && !instaTitle.classList.contains('revealed')) {
                instaTitle.classList.add('revealed');
            }
            const contactTitle = heroSectionElement.querySelector('.contact-title');
            if (contactTitle && !contactTitle.classList.contains('revealed')) {
                contactTitle.classList.add('revealed');
            }
        } else {
            if (heroSectionElement.classList.contains('is-exit-revealed')) {
                heroSectionElement.classList.remove('is-exit-revealed');
            }
        }
    }

    if (currentY > coverBottomScrollY) {
        if (typeof primeInitialTiltForCursor === 'function') {
            primeInitialTiltForCursor();
        }
        const progress = Math.min(1, Math.max(0, (currentY - coverBottomScrollY) / coverExitDist));
        // Smoothly scale down from 1.0 to 0.88 as the cover section exits
        const scale = 1 - progress * 0.12;
        const scaleStr = scale.toFixed(4);

        coverSection.style.setProperty('--cover-origin', 'center bottom');
        coverSection.style.setProperty('--cover-scale', scaleStr);
        coverSection.style.setProperty('transform-origin', 'center bottom', 'important');
        coverSection.style.setProperty('transform', `scale(${scaleStr})`, 'important');

        // As coversection reveals the Instagram screenshot, it breathes down from 1.15 to 1.000
        const revealScale = 1 + (1 - progress) * 0.15;
        const revealScaleStr = revealScale.toFixed(4);
        document.documentElement.style.setProperty('--insta-reveal-scale', revealScaleStr);
        if (instaScreenContainer) {
            instaScreenContainer.style.setProperty('--insta-reveal-scale', revealScaleStr);
        }
    } else {
        coverSection.style.setProperty('--cover-origin', 'top center');
        coverSection.style.setProperty('--cover-scale', '1');
        coverSection.style.removeProperty('transform');
        coverSection.style.removeProperty('transform-origin');

        document.documentElement.style.setProperty('--insta-reveal-scale', '1.15');
        if (instaScreenContainer) {
            instaScreenContainer.style.setProperty('--insta-reveal-scale', '1.15');
        }
    }

    // Scroll shift for hero content layer to reveal contact section below instapage
    if (heroContentLayer && currentY > instaScrollY) {
        const extraScroll = maxScrollY - instaScrollY;
        const progress = extraScroll > 0 ? Math.min(1, Math.max(0, (currentY - instaScrollY) / extraScroll)) : 0;
        const maxShift = Math.max(0, heroContentLayer.scrollHeight - window.innerHeight);
        const shiftY = progress * maxShift;
        heroContentLayer.style.setProperty('--layer-shift', `${shiftY.toFixed(1)}px`);
    } else if (heroContentLayer) {
        heroContentLayer.style.setProperty('--layer-shift', '0px');
    }
}

function applyIdleSettle() {
    const coverSnapTarget = window.innerHeight;

    clearTimeout(heroPullTimer);
    heroPullTimer = null;
    clearTimeout(heroPullDownTimer);
    heroPullDownTimer = null;

    if (targetScrollY > 0 && targetScrollY < coverSnapTarget) {
        if (lastVerticalDeltaY > 0) {
            // Pull UP: gently settle to cover section top
            targetScrollY = coverSnapTarget;
        } else if (lastVerticalDeltaY < 0) {
            // Pull DOWN: 30% constraint (must pull down past 30% to settle to hero)
            const pullDownThreshold = coverSnapTarget * 0.70;
            if (targetScrollY <= pullDownThreshold) {
                targetScrollY = 0;
            } else {
                targetScrollY = coverSnapTarget;
            }
        }

        if (!isVerticalScrolling) {
            isVerticalScrolling = true;
            requestAnimationFrame(updateVerticalScroll);
        }
        return;
    }

    // Cover section exit auto pull-up: once bottom of cover section is at or past 50vh, pull it up smoothly!
    const coverRect = coverSection ? coverSection.getBoundingClientRect() : null;
    const coverBottomDist = coverRect ? coverRect.bottom : window.innerHeight;
    const coverBottomScrollY = getCoverBottomScrollY();
    const instaScrollY = coverBottomScrollY + window.innerHeight;

    if (coverBottomScrollY > 0 && window.scrollY > coverBottomScrollY && window.scrollY < instaScrollY) {
        if (coverBottomDist <= window.innerHeight * 0.50) {
            transitionTo(instaScrollY, 1300);
            return;
        }
    }
}

function updateVerticalScroll() {
    if (!isVerticalScrolling) return;

    const current = window.scrollY;
    const diff = targetScrollY - current;

    if (Math.abs(diff) < 0.5) {
        window.scrollTo(0, targetScrollY);
        isVerticalScrolling = false;
        updateCoverExitTransform();
        return;
    }

    window.scrollTo(0, current + diff * 0.13);
    updateCoverExitTransform();
    requestAnimationFrame(updateVerticalScroll);
}

function updateClientGridMask() {
    if (!clientWorkGrid) return;
    const scrollLeft = clientWorkGrid.scrollLeft;
    const maxScroll = Math.max(0, clientWorkGrid.scrollWidth - clientWorkGrid.clientWidth);
    const maxFade = Math.min(Math.max(window.innerWidth * 0.05, 32), 72);

    const leftFade = Math.min(scrollLeft, maxFade);
    const rightFade = Math.min(Math.max(0, maxScroll - scrollLeft), maxFade);

    clientWorkGrid.style.setProperty('--client-fade-left', `${leftFade.toFixed(1)}px`);
    clientWorkGrid.style.setProperty('--client-fade-right', `${rightFade.toFixed(1)}px`);
}

if (clientWorkGrid) {
    clientWorkGrid.addEventListener('scroll', updateClientGridMask, { passive: true });
    updateClientGridMask();
}

function updateHorizontalScroll() {
    if (!isHorizontalScrolling || !clientWorkGrid) return;

    const current = clientWorkGrid.scrollLeft;
    const diff = horizontalScrollTarget - current;

    if (Math.abs(diff) < 0.5) {
        clientWorkGrid.scrollLeft = horizontalScrollTarget;
        isHorizontalScrolling = false;
        updateClientGridMask();
        return;
    }

    clientWorkGrid.scrollLeft = current + diff * 0.14;
    updateClientGridMask();
    requestAnimationFrame(updateHorizontalScroll);
}

function transitionTo(targetY, duration = 500, options = {}) {
    if (transitionAnimId) cancelAnimationFrame(transitionAnimId);
    clearTimeout(heroPullTimer);
    heroPullTimer = null;
    clearTimeout(heroPullDownTimer);
    heroPullDownTimer = null;
    if (isVerticalScrolling) {
        isVerticalScrolling = false;
    }
    const bottomOverscrollPx = options.bottomOverscrollPx || 0;
    if (bottomOverscrollPx > 0) {
        if (bottomOverscrollAnimId) {
            cancelAnimationFrame(bottomOverscrollAnimId);
            bottomOverscrollAnimId = null;
        }
        clearTimeout(bottomOverscrollDecayTimer);
        bottomOverscrollDecayTimer = null;
    }
    isPullingTransition = true;
    const isPullingTransitionStartY = window.scrollY;
    const distance = targetY - isPullingTransitionStartY;
    const startY = isPullingTransitionStartY;
    const activeBottomOverscroll = distance >= 0 ? bottomOverscrollPx : 0;
    lastTransitionDirection = distance >= 0 ? 'down' : 'up';

    if (Math.abs(distance) < 1) {
        window.scrollTo(0, targetY);
        targetScrollY = targetY;
        isPullingTransition = false;
        updateCoverExitTransform();
        if (bottomOverscrollPx > 0) {
            triggerBottomOverscrollPulse(Math.min(38, bottomOverscrollPx));
        }
        updateNavbarOnScroll();
        return;
    }

    const startTime = performance.now();
    const virtualTotalDistance = distance + activeBottomOverscroll;

    // Smooth ease curve:
    // When rebounding with bottom overscroll, cubic ease-out creates a natural deceleration into the spring.
    // For normal section travel, cubic ease-in-out creates buttery-smooth, organic acceleration and deceleration without sudden jerk.
    function easeCurve(t) {
        if (options.easing === 'easeOut' || activeBottomOverscroll > 0) {
            return 1 - Math.pow(1 - t, 3);
        }
        return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const eased = easeCurve(progress);

        if (activeBottomOverscroll > 0) {
            const virtualY = startY + virtualTotalDistance * eased;
            const clampedY = Math.min(targetY, virtualY);
            const excess = Math.max(0, virtualY - targetY);

            window.scrollTo(0, clampedY);
            targetScrollY = clampedY;
            setBottomOverscrollDirect(excess);
        } else {
            window.scrollTo(0, startY + distance * eased);
            targetScrollY = window.scrollY;
        }

        updateCoverExitTransform();

        if (progress < 1) {
            transitionAnimId = requestAnimationFrame(step);
        } else {
            window.scrollTo(0, targetY);
            targetScrollY = targetY;
            isPullingTransition = false;
            transitionAnimId = null;
            updateCoverExitTransform();
            if (activeBottomOverscroll > 0) {
                bottomRawPull = 0;
                bottomOverscrollTarget = 0;
                startBottomOverscrollSpring();
            }
            updateNavbarOnScroll();
        }
    }

    transitionAnimId = requestAnimationFrame(step);
}

// Keep target in sync when user scrolls natively or by drag
window.addEventListener('scroll', () => {
    if (!isVerticalScrolling && !isPullingTransition) {
        targetScrollY = window.scrollY;
    }
    if (window.scrollY < window.innerHeight) {
        const currentVh = window.innerHeight || document.documentElement.clientHeight;
        if (Math.abs(currentVh - lastSyncedVh) > 1) {
            syncMobileHeroTypography();
        }
    }
    updateCoverExitTransform();
}, { passive: true });

window.addEventListener('resize', () => {
    updateCoverExitTransform();
    updateClientGridMask();
});

window.addEventListener('wheel', (event) => {
    if (event.ctrlKey) return; // Allow pinch-zoom

    // A. TOUCHPAD HORIZONTAL SWIPE (Left / Right)
    // ONLY affects Client Works carousel when it's in view.
    // DOES NOT touch or interfere with vertical scroll!
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY) && Math.abs(event.deltaX) > 1.5) {
        const maxHScroll = getMaxHorizontalScroll();
        if (isClientWorkInView() && maxHScroll > 0 && clientWorkGrid) {
            event.preventDefault();
            if (!isHorizontalScrolling) {
                horizontalScrollTarget = clientWorkGrid.scrollLeft;
            }
            horizontalScrollTarget = Math.max(
                0,
                Math.min(maxHScroll, horizontalScrollTarget + event.deltaX * 0.8)
            );
            if (!isHorizontalScrolling) {
                isHorizontalScrolling = true;
                requestAnimationFrame(updateHorizontalScroll);
            }
            return;
        }
        return;
    }

    // B. VERTICAL SCROLLING (Up / Down)
    if (Math.abs(event.deltaY) < 0.5) return;

    const currentY = window.scrollY;
    const maxScrollY = getMaxScrollY();
    const coverSnapTarget = window.innerHeight;
    const coverBottomScrollY = getCoverBottomScrollY();
    const maxHScroll = getMaxHorizontalScroll();
    const coverRect = coverSection ? coverSection.getBoundingClientRect() : null;
    const coverBottomDist = coverRect ? coverRect.bottom : window.innerHeight;
    const isCoverDockedAtBottom = coverBottomDist <= window.innerHeight + 8;
    const cardsAreAtEnd = !clientWorkGrid || maxHScroll <= 0 || (
        clientWorkGrid.scrollLeft >= maxHScroll - 8 || horizontalScrollTarget >= maxHScroll - 5
    );

    // If user scrolls during a snap transition:
    // Only cancel if user actively scrolls in the OPPOSITE direction (reversing).
    // Otherwise absorb same-direction momentum so transition glides smoothly without interruption or glitch.
    if (isPullingTransition) {
        const isReversing = (lastTransitionDirection === 'down' && event.deltaY < -3) ||
            (lastTransitionDirection === 'up' && event.deltaY > 3);
        if (isReversing) {
            if (transitionAnimId) cancelAnimationFrame(transitionAnimId);
            isPullingTransition = false;
            transitionAnimId = null;
            targetScrollY = window.scrollY;
        } else {
            event.preventDefault();
            return;
        }
    }

    // 0. Hero Top Upward Overscroll (pulling down / scrolling up past the top of the page)
    if ((currentY <= 15 || targetScrollY <= 0) && event.deltaY < 0 && window.scrollY <= 20) {
        event.preventDefault();
        window.scrollTo(0, 0);
        targetScrollY = 0;
        isVerticalScrolling = false;
        clearTimeout(settleTimer);
        clearTimeout(heroPullTimer);
        clearTimeout(heroPullDownTimer);
        heroPullTimer = null;
        heroPullDownTimer = null;

        heroRawPull += Math.abs(event.deltaY) * 0.32;
        heroOverscrollTarget = (heroRawPull * HERO_MAX_STRETCH) / (heroRawPull + HERO_MAX_STRETCH);

        clearTimeout(heroOverscrollDecayTimer);
        heroOverscrollDecayTimer = setTimeout(() => {
            heroRawPull = 0;
            heroOverscrollTarget = 0;
            startHeroOverscrollSpring();
        }, 110);

        startHeroOverscrollSpring();
        return;
    }

    // If currently overscrolled or rebounding and user scrolls DOWN, release immediately and flow directly into downward scroll
    if ((Math.abs(heroOverscroll) > 0.001 || Math.abs(heroOverscrollVelocity) > 0.01 || heroRawPull > 0) && event.deltaY > 0) {
        if (heroOverscroll <= 0) {
            cancelHeroOverscroll();
        } else {
            heroRawPull = 0;
            heroOverscrollTarget = 0;
            startHeroOverscrollSpring();
        }
        // Do NOT return: allows immediate downward scrolling of the cover section with zero pause!
    }

    // 0B. Page Bottom Upward Overscroll (pulling up / scrolling down past the bottom of the page)
    if (cardsAreAtEnd && maxScrollY > 20 && (currentY >= maxScrollY - 8 || targetScrollY >= maxScrollY - 2) && event.deltaY > 0 && window.scrollY >= maxScrollY - 12) {
        event.preventDefault();
        window.scrollTo(0, maxScrollY);
        targetScrollY = maxScrollY;
        isVerticalScrolling = false;
        clearTimeout(settleTimer);

        bottomRawPull += Math.abs(event.deltaY) * 0.34;
        bottomOverscrollTarget = (bottomRawPull * BOTTOM_MAX_STRETCH) / (bottomRawPull + BOTTOM_MAX_STRETCH);

        clearTimeout(bottomOverscrollDecayTimer);
        bottomOverscrollDecayTimer = setTimeout(() => {
            bottomRawPull = 0;
            bottomOverscrollTarget = 0;
            startBottomOverscrollSpring();
        }, 110);

        startBottomOverscrollSpring();
        return;
    }

    // If currently overscrolled at bottom and user scrolls UP, cancel overscroll cleanly and flow into upward scroll
    if ((bottomOverscroll > 0.001 || bottomRawPull > 0) && event.deltaY < 0) {
        cancelBottomOverscroll();
    }

    // 1. Client Works Horizontal Card Scrubbing (when docked at bottom of cover section)
    // 1A. Downward scroll: while cover is at bottom, scrub cards right until end
    if (isCoverDockedAtBottom && event.deltaY > 0 && !cardsAreAtEnd) {
        event.preventDefault();

        if (!isHorizontalScrolling) {
            horizontalScrollTarget = clientWorkGrid.scrollLeft;
        }
        horizontalScrollTarget = Math.max(
            0,
            Math.min(maxHScroll, horizontalScrollTarget + event.deltaY * HORIZONTAL_SCROLL_SENSITIVITY)
        );
        if (!isHorizontalScrolling) {
            isHorizontalScrolling = true;
            requestAnimationFrame(updateHorizontalScroll);
        }
        return;
    }

    // 1B. Upward scroll: if cover is fully on screen and cards are scrolled, scrub cards back left
    const cardsAreScrolled = clientWorkGrid && (clientWorkGrid.scrollLeft > 5 || horizontalScrollTarget > 5);
    const isInExitZone = window.scrollY > coverBottomScrollY + 4 || coverBottomDist < window.innerHeight - 8;

    if (isCoverDockedAtBottom && !isInExitZone && event.deltaY < 0 && cardsAreScrolled) {
        event.preventDefault();

        if (!isHorizontalScrolling) {
            horizontalScrollTarget = clientWorkGrid.scrollLeft;
        }
        horizontalScrollTarget = Math.max(
            0,
            Math.min(maxHScroll, horizontalScrollTarget + event.deltaY * HORIZONTAL_SCROLL_SENSITIVITY)
        );
        if (!isHorizontalScrolling) {
            isHorizontalScrolling = true;
            requestAnimationFrame(updateHorizontalScroll);
        }
        return;
    }

    // 2. Unified Smooth Vertical Page Scrolling (Hero <-> Cover <-> Exit)
    event.preventDefault();
    if (heroOverscrollTarget > 0) {
        heroOverscrollTarget = 0;
        startHeroOverscrollSpring();
    }

    if (!isVerticalScrolling) {
        targetScrollY = window.scrollY;
    }

    lastVerticalDeltaY = event.deltaY;
    const maxAllowedY = cardsAreAtEnd ? maxScrollY : coverBottomScrollY;

    targetScrollY = Math.max(
        0,
        Math.min(maxAllowedY, targetScrollY + event.deltaY * VERTICAL_SCROLL_SENSITIVITY)
    );

    // Auto pull-up for cover section exit once bottom of cover section reaches 50vh (slow, cinematic pull-up)
    const instaScrollY = coverBottomScrollY + window.innerHeight;
    if (cardsAreAtEnd && event.deltaY > 0 && coverBottomDist <= window.innerHeight * 0.50 && window.scrollY < instaScrollY - 4) {
        transitionTo(instaScrollY, 1350);
        return;
    }

    if (!isVerticalScrolling) {
        isVerticalScrolling = true;
        requestAnimationFrame(updateVerticalScroll);
    }

    // 1-second pause timer in the transition zone
    if (targetScrollY > 0 && targetScrollY < coverSnapTarget) {
        if (event.deltaY > 0) {
            clearTimeout(heroPullDownTimer);
            heroPullDownTimer = null;
            if (!heroPullTimer && targetScrollY > 10) {
                heroPullTimer = setTimeout(() => {
                    heroPullTimer = null;
                    if (targetScrollY > 0 && targetScrollY < coverSnapTarget) {
                        targetScrollY = coverSnapTarget;
                        if (!isVerticalScrolling) {
                            isVerticalScrolling = true;
                            requestAnimationFrame(updateVerticalScroll);
                        }
                    }
                }, 1000);
            }
        } else if (event.deltaY < 0) {
            clearTimeout(heroPullTimer);
            heroPullTimer = null;
            const pullDownThreshold = coverSnapTarget * 0.70;
            if (!heroPullDownTimer && targetScrollY <= pullDownThreshold) {
                heroPullDownTimer = setTimeout(() => {
                    heroPullDownTimer = null;
                    if (targetScrollY > 0 && targetScrollY <= pullDownThreshold) {
                        targetScrollY = 0;
                        if (!isVerticalScrolling) {
                            isVerticalScrolling = true;
                            requestAnimationFrame(updateVerticalScroll);
                        }
                    }
                }, 1000);
            }
        }
    } else {
        clearTimeout(heroPullTimer);
        heroPullTimer = null;
        clearTimeout(heroPullDownTimer);
        heroPullDownTimer = null;
    }

    // Soft idle settle: fired 90ms after user finishes scrolling / lifts fingers
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
        applyIdleSettle();
    }, 90);
}, { passive: false });

updateCoverExitTransform();

// ==========================================================================
// Floating Top Pill Navigation Bar Controller (Single Moving Hover Bubble)
// ==========================================================================
const siteNavbar = document.querySelector('.site-navbar');
const navBubble = document.querySelector('.nav-bubble');
const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
const mobileNav = document.querySelector('.mobile-nav');
const mobileNavTrack = document.querySelector('.mobile-nav-track');
const mobileNavLinks = [...document.querySelectorAll('.mobile-nav-track .mobile-nav-link')];
const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const mobileNavMenu = document.querySelector('.mobile-nav-menu');
const mobileMenuLinks = document.querySelectorAll('.mobile-menu-link');
const allNavLinks = [...navLinks, ...mobileNavLinks, ...mobileMenuLinks];
const mobileSectionOrder = ['home', 'about', 'tools', 'work', 'instagram', 'contact'];
const mobileSectionLabels = {
    home: 'Home',
    about: 'About',
    tools: 'Tools',
    work: 'Client',
    instagram: 'Instagram',
    contact: 'Contact'
};
let isHoveringNavbar = false;
let currentBubbleX = null;
let bubbleStretchTimer = null;
let currentSectionId = 'home';
let suppressNavClick = false;

function updateSectionContentScale() {
    const progress = Math.min(1, Math.max(0, (window.innerWidth - 700) / 324));
    const responsiveScale = (0.78 + (progress * 0.13)) * 1.2;
    const scale = responsiveScale * (1 - (progress * 0.16));
    const gapScale = 0.5 + (progress * 0.5);
    document.documentElement.style.setProperty('--section-content-scale', scale.toFixed(4));
    document.documentElement.style.setProperty('--section-gap-scale', gapScale.toFixed(4));
}

updateSectionContentScale();
window.addEventListener('resize', updateSectionContentScale, { passive: true });

const mobileHeroMeasureCanvas = document.createElement('canvas');
const mobileHeroMeasureCtx = mobileHeroMeasureCanvas.getContext('2d');

let lastSyncedVh = 0;
let lastSyncedWidth = 0;

function syncMobileHeroTypography() {
    const heroIntroLayer = document.querySelector('.hero-intro-layer');
    const heroTitle = document.querySelector('.hero-title');
    if (!heroIntroLayer || !heroTitle) return;

    const isMobile = window.matchMedia('(max-width: 700px)').matches;
    const varNames = [
        '--mobile-hero-top',
        '--mobile-title-gap',
        '--mobile-portfolio-top',
        '--mobile-profile-h',
        '--mobile-profile-bottom',
        '--mobile-bio-inset',
        '--mobile-vh',
        '--video-sx',
        '--video-sy',
        '--video-extra-mb',
        '--video-ink-shift',
        '--video-bg-h',
        '--video-bg-y',
        '--editor-sx',
        '--editor-sy',
        '--editor-extra-mb',
        '--editor-ink-shift',
        '--editor-bg-h',
        '--editor-bg-y'
    ];

    if (!isMobile) {
        varNames.forEach((name) => heroIntroLayer.style.removeProperty(name));
        document.documentElement.style.removeProperty('--mobile-vh');
        if (heroSectionElement) {
            heroSectionElement.style.removeProperty('--mobile-vh');
        }
        lastSyncedVh = 0;
        lastSyncedWidth = 0;
        return;
    }

    const words = heroTitle.querySelectorAll('.hero-title-word');
    if (words.length < 2) return;

    const videoWord = words[0];
    const editorWord = words[1];
    const screenWidth = heroTitle.clientWidth || document.documentElement.clientWidth || window.innerWidth;
    const vh = window.innerHeight || document.documentElement.clientHeight;
    lastSyncedVh = vh;
    lastSyncedWidth = screenWidth;

    const measureWord = (wordEl, fallbackText) => {
        const style = getComputedStyle(wordEl);
        const fontSize = parseFloat(style.fontSize) || 100;
        const lineHeight = parseFloat(style.lineHeight) || fontSize;
        const boxWidth = wordEl.offsetWidth || screenWidth;
        const boxHeight = wordEl.offsetHeight || lineHeight;
        const text = (wordEl.textContent || fallbackText).replace(/\s+/g, '');

        let inkTopOffset = fontSize * 0.11;
        let inkHeight = fontSize * 0.79;

        if (mobileHeroMeasureCtx) {
            mobileHeroMeasureCtx.font = style.font || `${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
            const metrics = mobileHeroMeasureCtx.measureText(text);
            if (
                Number.isFinite(metrics.actualBoundingBoxAscent) &&
                Number.isFinite(metrics.actualBoundingBoxDescent) &&
                (metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent) > 0
            ) {
                const fontAscent = Number.isFinite(metrics.fontBoundingBoxAscent)
                    ? metrics.fontBoundingBoxAscent
                    : fontSize * 0.9;
                const fontDescent = Number.isFinite(metrics.fontBoundingBoxDescent)
                    ? metrics.fontBoundingBoxDescent
                    : fontSize * 0.1;
                const halfLeading = (lineHeight - (fontAscent + fontDescent)) / 2;
                inkTopOffset = Math.max(0, halfLeading + (fontAscent - metrics.actualBoundingBoxAscent));
                inkHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
            }
        }

        return { boxWidth, boxHeight, inkTopOffset, inkHeight };
    };

    const videoMetrics = measureWord(videoWord, 'VIDEO');
    const editorMetrics = measureWord(editorWord, 'EDITOR');

    const navbarWrapper = document.querySelector('.navbar-wrapper');
    const navbarBottom = navbarWrapper ? Math.ceil(navbarWrapper.getBoundingClientRect().bottom) : 0;
    const targetWidth = screenWidth * 0.8;
    const heroTop = Math.max(Math.round(vh * 0.03), navbarBottom + Math.round(vh * 0.015));
    const gap = Math.round(vh * 0.016);
    const targetVideoH = Math.round(vh * 0.368);
    const targetEditorH = Math.round(vh * 0.44);

    const videoSx = targetWidth / videoMetrics.boxWidth;
    const videoSy = targetVideoH / videoMetrics.inkHeight;
    const videoInkShift = -(videoMetrics.inkTopOffset * videoSy);
    const videoExtraMb = targetVideoH - videoMetrics.boxHeight;

    const editorSx = targetWidth / editorMetrics.boxWidth;
    const editorSy = targetEditorH / editorMetrics.inkHeight;
    const editorInkShift = -(editorMetrics.inkTopOffset * editorSy);
    const editorExtraMb = targetEditorH - editorMetrics.boxHeight;

    const portfolioCenterY = heroTop + targetVideoH + (gap / 2);
    const targetProfileH = Math.round(vh * 0.58);
    const bioInset = Math.max(16, Math.min(32, Math.round(vh * 0.026)));

    document.documentElement.style.setProperty('--mobile-vh', `${vh}px`);
    if (heroSectionElement) {
        heroSectionElement.style.setProperty('--mobile-vh', `${vh}px`);
    }

    heroIntroLayer.style.setProperty('--mobile-vh', `${vh}px`);
    heroIntroLayer.style.setProperty('--mobile-hero-top', `${heroTop}px`);
    heroIntroLayer.style.setProperty('--mobile-title-gap', `${gap}px`);
    heroIntroLayer.style.setProperty('--mobile-portfolio-top', `${portfolioCenterY.toFixed(2)}px`);
    heroIntroLayer.style.setProperty('--mobile-profile-h', `${targetProfileH}px`);
    heroIntroLayer.style.setProperty('--mobile-profile-bottom', '0px');
    heroIntroLayer.style.setProperty('--mobile-bio-inset', `${bioInset}px`);

    heroIntroLayer.style.setProperty('--video-sx', videoSx.toFixed(4));
    heroIntroLayer.style.setProperty('--video-sy', videoSy.toFixed(4));
    heroIntroLayer.style.setProperty('--video-extra-mb', `${videoExtraMb.toFixed(2)}px`);
    heroIntroLayer.style.setProperty('--video-ink-shift', `${videoInkShift.toFixed(2)}px`);
    heroIntroLayer.style.setProperty('--video-bg-h', `${(videoMetrics.inkHeight + 2).toFixed(2)}px`);
    heroIntroLayer.style.setProperty('--video-bg-y', `${Math.max(0, videoMetrics.inkTopOffset - 1).toFixed(2)}px`);

    heroIntroLayer.style.setProperty('--editor-sx', editorSx.toFixed(4));
    heroIntroLayer.style.setProperty('--editor-sy', editorSy.toFixed(4));
    heroIntroLayer.style.setProperty('--editor-extra-mb', `${editorExtraMb.toFixed(2)}px`);
    heroIntroLayer.style.setProperty('--editor-ink-shift', `${editorInkShift.toFixed(2)}px`);
    heroIntroLayer.style.setProperty('--editor-bg-h', `${(editorMetrics.inkHeight + 2).toFixed(2)}px`);
    heroIntroLayer.style.setProperty('--editor-bg-y', `${Math.max(0, editorMetrics.inkTopOffset - 1).toFixed(2)}px`);
}

syncMobileHeroTypography();
window.addEventListener('resize', syncMobileHeroTypography, { passive: true });
if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(syncMobileHeroTypography);
}

function updateMobileNavigation(sectionId) {
    const sectionIndex = mobileSectionOrder.indexOf(sectionId);
    if (sectionIndex < 0) return;
    const lastSectionIndex = mobileSectionOrder.length - 1;
    const trackIndex = Math.min(sectionIndex, lastSectionIndex - 1);
    const slotWidth = mobileNavLinks[0]?.getBoundingClientRect().width || 80;

    mobileNav?.classList.toggle('is-terminal', sectionIndex === lastSectionIndex);
    if (mobileNavTrack) {
        mobileNavTrack.style.transform = `translateX(-${trackIndex * slotWidth}px)`;
    }

    mobileNavLinks.forEach((link, index) => {
        const id = mobileSectionOrder[index];
        const isCurrent = id === sectionId;
        const isVisible = index >= trackIndex && index < trackIndex + 2;

        link.classList.toggle('is-current', isCurrent);
        link.classList.toggle('is-next', id === mobileSectionOrder[sectionIndex + 1]);
        link.classList.toggle('is-previous', sectionIndex === lastSectionIndex && id === mobileSectionOrder[sectionIndex - 1]);
        link.tabIndex = isVisible ? 0 : -1;
        link.setAttribute('aria-hidden', String(!isVisible));
        if (isCurrent) {
            link.setAttribute('aria-current', 'location');
        } else {
            link.removeAttribute('aria-current');
        }
    });

    mobileMenuLinks.forEach((link, index) => {
        const isInTopWindow = index >= trackIndex && index < trackIndex + 2;
        link.hidden = isInTopWindow;
        link.tabIndex = (mobileNavMenu?.getAttribute('aria-hidden') === 'false' && !isInTopWindow) ? 0 : -1;
        if (link.getAttribute('href') === `#${sectionId}`) {
            link.setAttribute('aria-current', 'location');
        } else {
            link.removeAttribute('aria-current');
        }
    });
}

function setMobileMenuOpen(isOpen) {
    if (!mobileMenuToggle || !mobileNavMenu) return;
    mobileMenuToggle.setAttribute('aria-expanded', String(isOpen));
    mobileMenuToggle.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
    mobileNavMenu.setAttribute('aria-hidden', String(!isOpen));
    mobileMenuLinks.forEach((link) => {
        link.tabIndex = (isOpen && !link.hidden) ? 0 : -1;
    });
}

if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', () => {
        const isOpen = mobileMenuToggle.getAttribute('aria-expanded') === 'true';
        setMobileMenuOpen(!isOpen);
    });
}

document.addEventListener('pointerdown', (event) => {
    if (mobileNav && !mobileNav.contains(event.target)) {
        setMobileMenuOpen(false);
    }
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        setMobileMenuOpen(false);
    }
});

function moveBubbleTo(targetElement, isInstant = false) {
    if (!navBubble || !siteNavbar || !targetElement) return;

    const targetRect = targetElement.getBoundingClientRect();
    const navRect = siteNavbar.getBoundingClientRect();

    const x = Math.round(targetRect.left - navRect.left);
    const y = Math.round(targetRect.top - navRect.top);
    const width = Math.round(targetRect.width);
    const height = Math.round(targetRect.height);

    if (isInstant || currentBubbleX === null) {
        const prevTransition = navBubble.style.transition;
        navBubble.style.transition = 'none';
        navBubble.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1, 1)`;
        navBubble.style.width = `${width}px`;
        navBubble.style.height = `${height}px`;
        navBubble.classList.add('is-visible');
        void navBubble.offsetWidth; // Force reflow
        navBubble.style.transition = prevTransition;
        currentBubbleX = x;
        return;
    }

    const dx = x - currentBubbleX;
    currentBubbleX = x;

    // Fluid liquid squash & stretch during travel
    if (Math.abs(dx) > 12) {
        const stretchX = Math.min(Math.abs(dx) * 0.0016, 0.16);
        const stretchY = stretchX * 0.55;

        clearTimeout(bubbleStretchTimer);
        navBubble.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${1 + stretchX}, ${1 - stretchY})`;
        navBubble.style.width = `${width}px`;
        navBubble.style.height = `${height}px`;
        navBubble.classList.add('is-visible');

        bubbleStretchTimer = setTimeout(() => {
            navBubble.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1, 1)`;
        }, 110);
    } else {
        navBubble.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1, 1)`;
        navBubble.style.width = `${width}px`;
        navBubble.style.height = `${height}px`;
        navBubble.classList.add('is-visible');
    }
}

function moveBubbleToActiveLink(isInstant = false) {
    const activeLink = document.querySelector('.navbar-nav .nav-link.is-active') || navLinks[0];
    if (activeLink) {
        moveBubbleTo(activeLink, isInstant);
    }
}

function getCollapsedNavOffset() {
    const navbarWrapper = document.querySelector('.navbar-wrapper');
    if (!navbarWrapper) return 60;
    if (window.matchMedia('(max-width: 700px)').matches) {
        const wrapperTop = parseFloat(getComputedStyle(navbarWrapper).top) || 0;
        const barHeight = (mobileMenuToggle?.offsetHeight || 42) + 8;
        return Math.ceil(wrapperTop + barHeight);
    }
    return navbarWrapper.offsetHeight || 60;
}

function getSectionScrollTarget(sectionId) {
    if (sectionId === 'home') return 0;
    if (sectionId === 'about') return window.innerHeight;
    if (sectionId === 'instagram' || sectionId === 'content-section') {
        const coverBottomScrollY = getCoverBottomScrollY();
        return coverBottomScrollY + window.innerHeight;
    }

    if (sectionId === 'contact') {
        return getMaxScrollY();
    }

    const navHeight = getCollapsedNavOffset();

    const targetEl = document.getElementById(sectionId);
    if (!targetEl) return 0;

    const targetDocY = window.scrollY + targetEl.getBoundingClientRect().top;

    return Math.max(0, Math.round(targetDocY - navHeight - 16));
}

function setActiveNavLink(sectionId) {
    currentSectionId = sectionId;
    let matchedLink = null;
    navLinks.forEach((link) => {
        const href = link.getAttribute('href');
        if (href === `#${sectionId}`) {
            link.classList.add('is-active');
            matchedLink = link;
        } else {
            link.classList.remove('is-active');
        }
    });

    if (!isHoveringNavbar && matchedLink) {
        moveBubbleTo(matchedLink);
    }
    updateMobileNavigation(sectionId);
}

function updateNavbarOnScroll() {
    if (!navLinks.length || isPullingTransition) return;
    const scrollY = window.scrollY;
    const coverTop = coverSection ? coverSection.offsetTop : window.innerHeight;

    if (scrollY < coverTop * 0.5) {
        setActiveNavLink('home');
        return;
    }

    const sectionThreshold = window.innerHeight * 0.35;
    const coverBottom = coverSection?.getBoundingClientRect().bottom ?? 0;
    if (coverBottom <= sectionThreshold) {
        const contactTitle = document.getElementById('contact-title');
        const contactIsCurrent = contactTitle && contactTitle.getBoundingClientRect().top <= sectionThreshold;
        setActiveNavLink(contactIsCurrent ? 'contact' : 'instagram');
        return;
    }

    const toolsTitle = document.getElementById('editing-tools-title');
    const clientTitle = document.getElementById('client-work-title');

    if (clientTitle && clientTitle.getBoundingClientRect().top <= sectionThreshold) {
        setActiveNavLink('work');
    } else if (toolsTitle && toolsTitle.getBoundingClientRect().top <= sectionThreshold) {
        setActiveNavLink('tools');
    } else {
        setActiveNavLink('about');
    }
}

function navigateToSection(targetId, options = {}) {
    if (!targetId || !mobileSectionOrder.includes(targetId)) return;

    setMobileMenuOpen(false);

    if (targetId === 'instagram' || targetId === 'contact') {
        const maxHScroll = getMaxHorizontalScroll();
        if (clientWorkGrid && maxHScroll > 0) {
            clientWorkGrid.scrollLeft = maxHScroll;
            horizontalScrollTarget = maxHScroll;
            updateClientGridMask();
        }
    } else if (targetId === 'home' || targetId === 'about') {
        if (clientWorkGrid) {
            clientWorkGrid.scrollLeft = 0;
            horizontalScrollTarget = 0;
            updateClientGridMask();
        }
    }

    const targetY = getSectionScrollTarget(targetId);
    targetScrollY = targetY;
    setActiveNavLink(targetId);

    const desktopLink = document.querySelector(`.navbar-nav .nav-link[href="#${targetId}"]`);
    if (desktopLink) {
        moveBubbleTo(desktopLink);
    }

    const distance = Math.abs(targetY - window.scrollY);
    const duration = options.duration || Math.min(720, Math.max(420, Math.round(350 + Math.sqrt(distance) * 6.5)));

    transitionTo(targetY, duration, targetId === 'contact' ? { bottomOverscrollPx: 48 } : {});
}

// Navigation uses the same smooth scrolling behavior for desktop, mobile, and menu links.
allNavLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
        event.preventDefault();
        if (suppressNavClick) return;

        const targetId = link.getAttribute('href')?.replace('#', '');
        if (!targetId) return;

        navigateToSection(targetId);
    });
});

// Navbar Horizontal Swipe Navigation (Forward / Backward through sections)
const navbarGestureTarget = siteNavbar || document.querySelector('.navbar-wrapper');

if (navbarGestureTarget) {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    let isNavbarSwiping = false;

    navbarGestureTarget.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        // Do not intercept taps/swipes on hamburger toggle button or inside opened dropdown menu
        if (e.target.closest('.mobile-menu-toggle, .mobile-nav-menu')) return;

        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        touchStartTime = performance.now();
        isNavbarSwiping = true;
    }, { passive: true });

    navbarGestureTarget.addEventListener('touchmove', (e) => {
        if (!isNavbarSwiping || e.touches.length !== 1) return;

        const touch = e.touches[0];
        const dx = touch.clientX - touchStartX;
        const dy = touch.clientY - touchStartY;

        // If swipe is predominantly horizontal, prevent browser vertical page scroll during gesture
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 6) {
            if (e.cancelable) {
                e.preventDefault();
            }
        }
    }, { passive: false });

    const handleNavbarTouchEnd = (e) => {
        if (!isNavbarSwiping) return;
        isNavbarSwiping = false;

        const touch = e.changedTouches ? e.changedTouches[0] : null;
        if (!touch) return;

        const diffX = touch.clientX - touchStartX;
        const diffY = touch.clientY - touchStartY;
        const elapsed = performance.now() - touchStartTime;

        const absX = Math.abs(diffX);
        const absY = Math.abs(diffY);

        const isQuickFlick = absX > 22 && elapsed < 320;
        const isDeliberateSwipe = absX >= 30;

        if ((isDeliberateSwipe || isQuickFlick) && absX > absY * 1.1) {
            suppressNavClick = true;
            setTimeout(() => {
                suppressNavClick = false;
            }, 300);

            const currentIndex = mobileSectionOrder.indexOf(currentSectionId);
            const validIndex = currentIndex >= 0 ? currentIndex : 0;

            if (diffX < 0) {
                // Swipe Left -> Next Section (Forward)
                if (validIndex < mobileSectionOrder.length - 1) {
                    navigateToSection(mobileSectionOrder[validIndex + 1]);
                } else if (mobileNavTrack) {
                    const slotWidth = mobileNavLinks[0]?.offsetWidth || 80;
                    const baseTranslate = -(mobileSectionOrder.length - 2) * slotWidth;
                    mobileNavTrack.style.transition = 'transform 180ms ease-out';
                    mobileNavTrack.style.transform = `translateX(${baseTranslate - 14}px)`;
                    setTimeout(() => {
                        mobileNavTrack.style.transition = '';
                        mobileNavTrack.style.transform = `translateX(${baseTranslate}px)`;
                    }, 180);
                }
            } else {
                // Swipe Right -> Previous Section (Backward)
                if (validIndex > 0) {
                    navigateToSection(mobileSectionOrder[validIndex - 1]);
                } else if (mobileNavTrack) {
                    mobileNavTrack.style.transition = 'transform 180ms ease-out';
                    mobileNavTrack.style.transform = 'translateX(14px)';
                    setTimeout(() => {
                        mobileNavTrack.style.transition = '';
                        mobileNavTrack.style.transform = 'translateX(0px)';
                    }, 180);
                }
            }
        }
    };

    navbarGestureTarget.addEventListener('touchend', handleNavbarTouchEnd, { passive: true });
    navbarGestureTarget.addEventListener('touchcancel', () => {
        isNavbarSwiping = false;
    }, { passive: true });
}

if (siteNavbar) {
    siteNavbar.addEventListener('pointerenter', () => {
        isHoveringNavbar = true;
    });

    siteNavbar.addEventListener('pointermove', (event) => {
        isHoveringNavbar = true;
        const link = event.target.closest('.nav-link');
        if (link) {
            moveBubbleTo(link);
        }
    });

    siteNavbar.addEventListener('pointerleave', () => {
        isHoveringNavbar = false;
        moveBubbleToActiveLink();
    });
}

window.addEventListener('scroll', updateNavbarOnScroll, { passive: true });
window.addEventListener('resize', () => {
    moveBubbleToActiveLink(true);
    updateNavbarOnScroll();
});

// Initial positioning once styles and fonts are ready
requestAnimationFrame(() => moveBubbleToActiveLink(true));
if (document.fonts) {
    document.fonts.ready.then(() => moveBubbleToActiveLink(true));
}
updateNavbarOnScroll();

// ==========================================
// Instagram Screenshot 3D Tilt Effect (Proximity Driven with Dynamic Shine Rotation)
// ==========================================
const instaScreenCard = document.querySelector('.insta-screen-card');
const heroSectionEl = document.querySelector('.hero-section');

if (instaScreenCard) {
    let tiltFrameId = null;
    let wasExitRevealed = false;

    // Target values
    let targetRx = 0;
    let targetRy = 0;
    let targetTy = 0;
    let targetScale = 1;
    let targetGlareOpacity = 0;
    let targetGlareX = 50;
    let targetGlareY = 50;
    let targetProximity = 0;
    let targetShineAngle = 165;

    // Current animated values (lerped)
    let currentRx = 0;
    let currentRy = 0;
    let currentTy = 0;
    let currentScale = 1;
    let currentGlareOpacity = 0;
    let currentGlareX = 50;
    let currentGlareY = 50;
    let currentProximity = 0;
    let currentShineAngle = 165;

    const MAX_TILT_DEG = 12; // Maximum tilt angle in degrees
    const HOVER_LIFT_PX = -6; // Elevate card towards viewer
    const HOVER_SCALE = 1.025; // Subtle scale pop
    const PROXIMITY_RADIUS = 300; // Distance in px outside card perimeter where effect activates
    const LERP_FACTOR = 0.10; // Silky fluid spring dampening
    const MAX_SHINE_CW_DEG = 30; // +30deg clockwise shift on top-right (195deg)
    const MAX_SHINE_CCW_DEG = 126; // -126deg anticlockwise shift on bottom-left: top-left shine slides down to bottom-left, bottom-right shine slides up to top-right (39deg)

    function applyCurrentCSSVars() {
        const shadowX = currentRy * 1.5;
        const shadowY = -currentRx * 1.5;
        const rad = currentShineAngle * (Math.PI / 180);
        const flare1X = 50 - 50 * Math.sin(rad);
        const flare1Y = 50 + 50 * Math.cos(rad);
        const flare2X = 50 + 50 * Math.sin(rad);
        const flare2Y = 50 - 50 * Math.cos(rad);

        instaScreenCard.style.setProperty('--tilt-rx', `${currentRx.toFixed(3)}deg`);
        instaScreenCard.style.setProperty('--tilt-ry', `${currentRy.toFixed(3)}deg`);
        instaScreenCard.style.setProperty('--tilt-ty', `${currentTy.toFixed(2)}px`);
        instaScreenCard.style.setProperty('--tilt-scale', currentScale.toFixed(4));
        instaScreenCard.style.setProperty('--tilt-shadow-x', `${shadowX.toFixed(2)}px`);
        instaScreenCard.style.setProperty('--tilt-shadow-y', `${shadowY.toFixed(2)}px`);
        instaScreenCard.style.setProperty('--tilt-proximity', currentProximity.toFixed(3));
        instaScreenCard.style.setProperty('--shine-angle', `${currentShineAngle.toFixed(2)}deg`);
        instaScreenCard.style.setProperty('--corner-flare-1-x', `${flare1X.toFixed(1)}%`);
        instaScreenCard.style.setProperty('--corner-flare-1-y', `${flare1Y.toFixed(1)}%`);
        instaScreenCard.style.setProperty('--corner-flare-2-x', `${flare2X.toFixed(1)}%`);
        instaScreenCard.style.setProperty('--corner-flare-2-y', `${flare2Y.toFixed(1)}%`);
        instaScreenCard.style.setProperty('--glare-x', `${currentGlareX.toFixed(2)}%`);
        instaScreenCard.style.setProperty('--glare-y', `${currentGlareY.toFixed(2)}%`);
        instaScreenCard.style.setProperty('--glare-opacity', currentGlareOpacity.toFixed(3));
    }

    function updateTiltPhysics() {
        currentRx += (targetRx - currentRx) * LERP_FACTOR;
        currentRy += (targetRy - currentRy) * LERP_FACTOR;
        currentTy += (targetTy - currentTy) * LERP_FACTOR;
        currentScale += (targetScale - currentScale) * LERP_FACTOR;
        currentGlareOpacity += (targetGlareOpacity - currentGlareOpacity) * LERP_FACTOR;
        currentGlareX += (targetGlareX - currentGlareX) * LERP_FACTOR;
        currentGlareY += (targetGlareY - currentGlareY) * LERP_FACTOR;
        currentProximity += (targetProximity - currentProximity) * LERP_FACTOR;
        currentShineAngle += (targetShineAngle - currentShineAngle) * LERP_FACTOR;

        applyCurrentCSSVars();

        // When resting and close to zero, stop loop and clean up
        const isSettled = targetProximity === 0 &&
            Math.abs(currentRx) < 0.02 &&
            Math.abs(currentRy) < 0.02 &&
            Math.abs(currentTy) < 0.02 &&
            Math.abs(currentScale - 1) < 0.001 &&
            Math.abs(currentGlareOpacity) < 0.005 &&
            Math.abs(currentProximity) < 0.005 &&
            Math.abs(currentShineAngle - 165) < 0.1;

        if (isSettled) {
            instaScreenCard.classList.remove('is-tilt-active');
            instaScreenCard.style.removeProperty('--tilt-rx');
            instaScreenCard.style.removeProperty('--tilt-ry');
            instaScreenCard.style.removeProperty('--tilt-ty');
            instaScreenCard.style.removeProperty('--tilt-scale');
            instaScreenCard.style.removeProperty('--tilt-shadow-x');
            instaScreenCard.style.removeProperty('--tilt-shadow-y');
            instaScreenCard.style.removeProperty('--tilt-proximity');
            instaScreenCard.style.removeProperty('--shine-angle');
            instaScreenCard.style.removeProperty('--corner-flare-1-x');
            instaScreenCard.style.removeProperty('--corner-flare-1-y');
            instaScreenCard.style.removeProperty('--corner-flare-2-x');
            instaScreenCard.style.removeProperty('--corner-flare-2-y');
            instaScreenCard.style.removeProperty('--glare-opacity');
            tiltFrameId = null;
            return;
        }

        tiltFrameId = requestAnimationFrame(updateTiltPhysics);
    }

    function ensureTiltLoop() {
        instaScreenCard.classList.add('is-tilt-active');
        if (!tiltFrameId) {
            tiltFrameId = requestAnimationFrame(updateTiltPhysics);
        }
    }

    function resetTiltTargets() {
        targetRx = 0;
        targetRy = 0;
        targetTy = 0;
        targetScale = 1;
        targetGlareOpacity = 0;
        targetProximity = 0;
        targetShineAngle = 165;
        if (tiltFrameId || currentProximity > 0.005 || Math.abs(currentShineAngle - 165) > 0.1) {
            ensureTiltLoop();
        }
    }

    function handlePointerPosition(clientX, clientY, isInitialPrime = false) {
        // Only suppress if at top near hero (scrollY < window.innerHeight)
        if (heroSectionEl && heroSectionEl.classList.contains('is-near-hero')) {
            wasExitRevealed = false;
            resetTiltTargets();
            return;
        }

        const rect = instaScreenCard.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        // Card is completely offscreen vertically
        if (rect.bottom < -100 || rect.top > window.innerHeight + 100) {
            wasExitRevealed = false;
            resetTiltTargets();
            return;
        }

        const cardLeft = rect.left;
        const cardRight = rect.right;
        const cardTop = rect.top;
        const cardBottom = rect.bottom;
        const centerX = (cardLeft + cardRight) / 2;
        const centerY = (cardTop + cardBottom) / 2;
        const halfW = rect.width / 2;
        const halfH = rect.height / 2;

        // Normalized cursor direction relative to screen and card center [-1, 1]
        const normX = Math.max(-1, Math.min(1, (clientX - centerX) / Math.max(halfW, window.innerWidth * 0.38)));
        const normY = Math.max(-1, Math.min(1, (clientY - centerY) / Math.max(halfH, window.innerHeight * 0.38)));

        // Dynamic shine rotation rules:
        // - Top-Left (-1, -1) & Bottom-Right (+1, +1): 0deg shift (165deg)
        // - Top-Right (+1, -1): +30deg clockwise shift (195deg)
        // - Bottom-Left (-1, +1): -126deg anticlockwise shift (39deg)
        const diagonalFactor = (normX - normY) / 2;
        const maxShift = diagonalFactor >= 0 ? MAX_SHINE_CW_DEG : MAX_SHINE_CCW_DEG;

        // Calculate distance from cursor to closest point on card
        const distX = clientX < cardLeft ? cardLeft - clientX : clientX > cardRight ? clientX - cardRight : 0;
        const distY = clientY < cardTop ? cardTop - clientY : clientY > cardBottom ? clientY - cardBottom : 0;
        const outsideDist = Math.hypot(distX, distY);

        // When revealing the card initially: immediately prime tilt to match cursor anywhere on screen
        if (isInitialPrime || !wasExitRevealed) {
            wasExitRevealed = true;
            targetRx = normY * MAX_TILT_DEG;
            targetRy = -normX * MAX_TILT_DEG;
            targetShineAngle = 165 + (diagonalFactor * maxShift);
            targetProximity = 0.5;
            targetScale = 1;
            targetTy = 0;
            targetGlareOpacity = 0.12;
            targetGlareX = Math.max(0, Math.min(100, ((clientX - cardLeft) / rect.width) * 100));
            targetGlareY = Math.max(0, Math.min(100, ((clientY - cardTop) / rect.height) * 100));

            currentRx = targetRx;
            currentRy = targetRy;
            currentShineAngle = targetShineAngle;
            currentProximity = targetProximity;
            currentScale = targetScale;
            currentTy = targetTy;
            currentGlareOpacity = targetGlareOpacity;
            currentGlareX = targetGlareX;
            currentGlareY = targetGlareY;

            applyCurrentCSSVars();
            ensureTiltLoop();
            return;
        }

        // Broad viewport-aware falloff so cursor movement smoothly influences tilt across screen
        const maxRadius = Math.max(window.innerWidth, window.innerHeight) * 0.75;
        if (outsideDist > maxRadius) {
            resetTiltTargets();
            return;
        }

        const rawProximity = Math.max(0, 1 - (outsideDist / maxRadius));
        const smoothProximity = rawProximity * rawProximity * (3 - 2 * rawProximity);
        const proximity = Math.min(1, 0.28 + smoothProximity * 0.72);
        targetProximity = proximity;

        // Tilts: angle scales with proximity and direction
        targetRx = normY * MAX_TILT_DEG * proximity;
        targetRy = -normX * MAX_TILT_DEG * proximity;
        targetShineAngle = 165 + (diagonalFactor * maxShift * proximity);

        // Elevation and scale scale smoothly with proximity
        targetTy = HOVER_LIFT_PX * smoothProximity;
        targetScale = 1 + (HOVER_SCALE - 1) * smoothProximity;

        // Glare coordinates
        const relX = (clientX - cardLeft) / rect.width;
        const relY = (clientY - cardTop) / rect.height;
        targetGlareX = Math.max(0, Math.min(100, relX * 100));
        targetGlareY = Math.max(0, Math.min(100, relY * 100));
        targetGlareOpacity = Math.pow(smoothProximity, 1.4);

        ensureTiltLoop();
    }

    let lastPointerTime = 0;
    let lastGyroTime = 0;
    let gyroBaseX = null;
    let gyroBaseY = null;
    let orientationListenerAttached = false;
    let orientationPermissionRequested = false;

    function isInstaCardVisibleForTilt() {
        if (heroSectionEl && heroSectionEl.classList.contains('is-near-hero')) {
            return false;
        }
        const rect = instaScreenCard.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;
        if (rect.bottom < -100 || rect.top > window.innerHeight + 100) return false;
        return rect;
    }

    function normalizeAngleDelta(delta) {
        let d = delta;
        while (d > 180) d -= 360;
        while (d < -180) d += 360;
        return d;
    }

    function handleDeviceOrientation(event) {
        if (!Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) return;
        const now = performance.now();
        if (now - lastPointerTime < 3000) return;

        if (!isInstaCardVisibleForTilt()) {
            wasExitRevealed = false;
            gyroBaseX = null;
            gyroBaseY = null;
            resetTiltTargets();
            return;
        }

        const screenAngle = (window.screen && window.screen.orientation && Number.isFinite(window.screen.orientation.angle))
            ? window.screen.orientation.angle
            : (Number.isFinite(window.orientation) ? window.orientation : 0);
        const normalizedOrientation = ((screenAngle % 360) + 360) % 360;

        let tiltX = event.gamma;
        let tiltY = event.beta;
        if (normalizedOrientation === 90) {
            tiltX = event.beta;
            tiltY = -event.gamma;
        } else if (normalizedOrientation === 270) {
            tiltX = -event.beta;
            tiltY = event.gamma;
        } else if (normalizedOrientation === 180) {
            tiltX = -event.gamma;
            tiltY = -event.beta;
        }

        if (gyroBaseX === null || gyroBaseY === null) {
            gyroBaseX = tiltX;
            gyroBaseY = tiltY;
        }

        const MAX_GYRO_ANGLE = 25;
        const deltaX = normalizeAngleDelta(tiltX - gyroBaseX);
        const deltaY = normalizeAngleDelta(tiltY - gyroBaseY);
        const normX = Math.max(-1, Math.min(1, deltaX / MAX_GYRO_ANGLE));
        const normY = Math.max(-1, Math.min(1, deltaY / MAX_GYRO_ANGLE));
        const tiltMag = Math.min(1, Math.hypot(normX, normY));

        const diagonalFactor = (normX - normY) / 2;
        const maxShift = diagonalFactor >= 0 ? MAX_SHINE_CW_DEG : MAX_SHINE_CCW_DEG;
        const proximity = Math.min(1, 0.35 + tiltMag * 0.65);

        wasExitRevealed = true;
        lastGyroTime = now;
        targetProximity = proximity;
        targetRx = normY * MAX_TILT_DEG;
        targetRy = -normX * MAX_TILT_DEG;
        targetShineAngle = 165 + (diagonalFactor * maxShift);
        targetTy = HOVER_LIFT_PX * tiltMag;
        targetScale = 1 + (HOVER_SCALE - 1) * tiltMag;
        targetGlareX = 50 + normX * 45;
        targetGlareY = 50 + normY * 45;
        targetGlareOpacity = Math.min(0.85, tiltMag * 0.85);

        ensureTiltLoop();
    }

    function attachDeviceOrientation() {
        if (orientationListenerAttached) return;
        orientationListenerAttached = true;
        window.addEventListener('deviceorientation', handleDeviceOrientation, { passive: true });
        window.addEventListener('orientationchange', () => {
            gyroBaseX = null;
            gyroBaseY = null;
        }, { passive: true });
    }

    if (typeof DeviceOrientationEvent !== 'undefined') {
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            const requestOrientationOnGesture = () => {
                if (orientationPermissionRequested || orientationListenerAttached) return;
                if (!isInstaCardVisibleForTilt()) return;
                orientationPermissionRequested = true;
                DeviceOrientationEvent.requestPermission()
                    .then((state) => {
                        if (state === 'granted') {
                            attachDeviceOrientation();
                        }
                    })
                    .catch(() => {
                        orientationPermissionRequested = false;
                    });
            };
            window.addEventListener('touchend', requestOrientationOnGesture, { passive: true });
            window.addEventListener('click', requestOrientationOnGesture, { passive: true });
        } else {
            attachDeviceOrientation();
        }
    }

    primeInitialTiltForCursor = function () {
        if (performance.now() - lastGyroTime < 1500) {
            wasExitRevealed = true;
            return;
        }
        handlePointerPosition(lastKnownCursorX, lastKnownCursorY, !wasExitRevealed);
    };

    window.addEventListener('pointermove', (event) => {
        if (event.pointerType === 'touch') return;
        lastPointerTime = performance.now();
        lastKnownCursorX = event.clientX;
        lastKnownCursorY = event.clientY;
        handlePointerPosition(event.clientX, event.clientY);
    }, { passive: true });

    window.addEventListener('pointerleave', () => {
        resetTiltTargets();
    });

    document.addEventListener('mouseleave', () => {
        resetTiltTargets();
    });

    // Reset when scrolling away so card returns to flat rest
    window.addEventListener('scroll', () => {
        if (targetProximity > 0 || gyroBaseX !== null) {
            const rect = instaScreenCard.getBoundingClientRect();
            if (rect.bottom < 0 || rect.top > window.innerHeight || (heroSectionEl && heroSectionEl.classList.contains('is-near-hero'))) {
                gyroBaseX = null;
                gyroBaseY = null;
                resetTiltTargets();
            }
        }
    }, { passive: true });
}

// ==========================================
// Contact Section Interactive Logic
// ==========================================
const copyEmailBtn = document.getElementById('copy-email-btn');
const copyTooltip = document.getElementById('copy-tooltip');
const contactForm = document.getElementById('contact-form');
const contactFeedback = document.getElementById('contact-feedback');

if (copyEmailBtn) {
    copyEmailBtn.addEventListener('click', () => {
        const email = 'rupaksainemalipuri@gmail.com';
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(email).then(() => {
                copyEmailBtn.classList.add('is-copied');
                if (copyTooltip) copyTooltip.textContent = 'Copied!';
                setTimeout(() => {
                    copyEmailBtn.classList.remove('is-copied');
                    if (copyTooltip) copyTooltip.textContent = 'Copy';
                }, 2200);
            }).catch(() => {
                fallbackCopyText(email);
            });
        } else {
            fallbackCopyText(email);
        }
    });
}

function fallbackCopyText(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        document.execCommand('copy');
        if (copyEmailBtn) copyEmailBtn.classList.add('is-copied');
        if (copyTooltip) copyTooltip.textContent = 'Copied!';
        setTimeout(() => {
            if (copyEmailBtn) copyEmailBtn.classList.remove('is-copied');
            if (copyTooltip) copyTooltip.textContent = 'Copy';
        }, 2200);
    } catch (err) {
        if (copyTooltip) copyTooltip.textContent = 'rupaksainemalipuri@gmail.com';
    }
    document.body.removeChild(textArea);
}

if (contactForm) {
    const sendBtn = document.getElementById('contact-send-btn');
    const sendBtnText = sendBtn ? sendBtn.querySelector('span') : null;

    contactForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const nameInput = document.getElementById('client-name');
        const emailInput = document.getElementById('client-email');
        const messageInput = document.getElementById('client-message');

        const name = nameInput?.value.trim() || '';
        const email = emailInput?.value.trim() || '';
        const message = messageInput?.value.trim() || '';

        if (!name || !email || !message) {
            if (contactFeedback) {
                contactFeedback.textContent = 'Please fill out your name, email, and message.';
                contactFeedback.className = 'contact-feedback is-error';
            }
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            if (contactFeedback) {
                contactFeedback.textContent = 'Please enter a valid email address.';
                contactFeedback.className = 'contact-feedback is-error';
            }
            return;
        }

        // Show sending state on button
        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.classList.add('is-loading');
            if (sendBtnText) sendBtnText.textContent = 'Sending Message...';
        }
        if (contactFeedback) {
            contactFeedback.textContent = 'Sending your message directly to Rupak...';
            contactFeedback.className = 'contact-feedback';
        }

        try {
            const response = await fetch('https://formsubmit.co/ajax/rupaksainemalipuri@gmail.com', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    name: name,
                    email: email,
                    _replyto: email,
                    message: message,
                    _subject: `New Freelance Inquiry from ${name}`,
                    _template: 'table'
                })
            });

            const data = await response.json();

            if (response.ok && (data.success === 'true' || data.success === true || data.message)) {
                if (contactFeedback) {
                    contactFeedback.textContent = '✓ Message sent successfully to Rupak! Looking forward to working together.';
                    contactFeedback.className = 'contact-feedback is-success';
                }
                if (sendBtn) {
                    sendBtn.classList.remove('is-loading');
                    sendBtn.classList.add('is-success');
                    if (sendBtnText) sendBtnText.textContent = 'Message Sent! ✓';
                }
                contactForm.reset();

                setTimeout(() => {
                    if (sendBtn) {
                        sendBtn.disabled = false;
                        sendBtn.classList.remove('is-success');
                        if (sendBtnText) sendBtnText.textContent = 'Send Message';
                    }
                }, 4000);
            } else {
                throw new Error(data.message || 'Direct submission failed');
            }
        } catch (err) {
            console.error('Direct submission error:', err);
            if (contactFeedback) {
                contactFeedback.innerHTML = 'Direct send error. <a href="#" id="fallback-mail-link" style="color: #9cd1e1; text-decoration: underline;">Click here to open email draft</a> instead.';
                contactFeedback.className = 'contact-feedback is-error';

                const fallbackLink = document.getElementById('fallback-mail-link');
                if (fallbackLink) {
                    fallbackLink.addEventListener('click', (e) => {
                        e.preventDefault();
                        const subject = encodeURIComponent(`Project Inquiry: ${project} - from ${name}`);
                        const body = encodeURIComponent(
                            `Hi Rupak,\n\n` +
                            `My name is ${name} (${email}).\n\n` +
                            `Project Type: ${project}\n\n` +
                            `Project Details / Message:\n${message}\n\n` +
                            `Looking forward to collaborating with you!`
                        );
                        window.location.href = `mailto:rupaksainemalipuri@gmail.com?subject=${subject}&body=${body}`;
                    });
                }
            }
            if (sendBtn) {
                sendBtn.disabled = false;
                sendBtn.classList.remove('is-loading');
                if (sendBtnText) sendBtnText.textContent = 'Send Message';
            }
        }
    });
}

// Prevent text selection across the website (excluding contact form inputs)
document.addEventListener('selectstart', (e) => {
    if (e.target.closest('input, textarea, [contenteditable="true"]')) return;
    e.preventDefault();
});

// Prevent long-press context menu on images and UI elements
document.addEventListener('contextmenu', (e) => {
    if (e.target.closest('input, textarea, [contenteditable="true"]')) return;
    e.preventDefault();
});

// Prevent ghost dragging of images
document.addEventListener('dragstart', (e) => {
    e.preventDefault();
});

