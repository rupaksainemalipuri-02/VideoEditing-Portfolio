const editingToolsPanel = document.querySelector('.editing-tools-panel');
const editingToolIcons = document.querySelectorAll('.editing-tool-icon');
const editingToolItems = document.querySelectorAll('.editing-tool');

let initialAeHoverTimer = null;
let hasUnhoveredAe = false;
let watchCursorForUnhover = false;
let startCursorX = null;
let startCursorY = null;

function applyAeDefaultHover() {
    if (hasUnhoveredAe || !editingToolItems.length) return;
    const activeIndex = 0; // Ae icon
    editingToolItems.forEach((element, elementIndex) => {
        const distance = Math.abs(elementIndex - activeIndex);
        const iconScale = distance === 0 ? 1.5 : distance === 1 ? 1.07 : 1;
        const shiftAmount = distance === 1 ? 12 : distance === 2 ? 14 : 0;
        const iconShift = Math.sign(elementIndex - activeIndex) * shiftAmount;

        element.style.setProperty('--icon-scale', iconScale);
        element.style.setProperty('--icon-shift', `${iconShift}px`);
        if (elementIndex === 0) {
            element.classList.add('is-hovered');
        } else {
            element.classList.remove('is-hovered');
        }
    });
}

function unhoverAe() {
    if (hasUnhoveredAe) return;
    hasUnhoveredAe = true;
    if (initialAeHoverTimer) {
        clearTimeout(initialAeHoverTimer);
        initialAeHoverTimer = null;
    }
    window.removeEventListener('pointermove', onWindowPointerMove);
    editingToolIcons.forEach((icon) => {
        icon.style.setProperty('--icon-scale', '1');
        icon.style.setProperty('--icon-shift', '0px');
    });
    editingToolItems.forEach((item) => {
        item.style.setProperty('--icon-scale', '1');
        item.style.setProperty('--icon-shift', '0px');
        item.classList.remove('is-hovered');
    });
}

function onWindowPointerMove(event) {
    if (hasUnhoveredAe) {
        window.removeEventListener('pointermove', onWindowPointerMove);
        return;
    }
    if (!watchCursorForUnhover) return;

    if (startCursorX === null) {
        startCursorX = event.clientX;
        startCursorY = event.clientY;
        return;
    }

    const dist = Math.hypot(event.clientX - startCursorX, event.clientY - startCursorY);
    if (dist > 3) {
        unhoverAe();
    }
}

window.addEventListener('pointermove', onWindowPointerMove);

// Apply initial default hover on Ae
applyAeDefaultHover();

// Listen for cursor movement once editing tools panel enters view
if (editingToolsPanel) {
    const aeHoverObserver = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting && !hasUnhoveredAe) {
            setTimeout(() => {
                startCursorX = null;
                startCursorY = null;
                watchCursorForUnhover = true;
            }, 100);

            // Fallback timeout in case the cursor remains completely stationary
            initialAeHoverTimer = setTimeout(() => {
                unhoverAe();
            }, 3500);

            aeHoverObserver.disconnect();
        }
    }, {
        threshold: 0.25
    });
    aeHoverObserver.observe(editingToolsPanel);
}

editingToolsPanel.addEventListener('pointermove', (event) => {
    if (!hasUnhoveredAe) {
        unhoverAe();
    }
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
    editingToolIcons.forEach((icon) => {
        icon.style.setProperty('--icon-scale', '1');
        icon.style.setProperty('--icon-shift', '0px');
    });
    editingToolItems.forEach((item) => {
        item.style.setProperty('--icon-scale', '1');
        item.style.setProperty('--icon-shift', '0px');
        item.classList.remove('is-hovered');
    });
});

editingToolItems.forEach((item, activeIndex) => {
    item.addEventListener('pointerenter', () => {
        if (!hasUnhoveredAe) {
            unhoverAe();
        }
        editingToolItems.forEach((element, elementIndex) => {
            const distance = Math.abs(elementIndex - activeIndex);
            const iconScale = distance === 0 ? 1.5 : distance === 1 ? 1.07 : 1;
            const shiftAmount = distance === 1 ? 12 : distance === 2 ? 14 : 0;
            const iconShift = Math.sign(elementIndex - activeIndex) * shiftAmount;

            element.style.setProperty('--icon-scale', iconScale);
            element.style.setProperty('--icon-shift', `${iconShift}px`);
        });
    });

    item.addEventListener('click', () => {
        if (!hasUnhoveredAe) {
            unhoverAe();
        }
        const icon = item.querySelector('.editing-tool-icon');
        if (!icon) return;

        icon.classList.remove('is-bouncing');
        void icon.offsetWidth; // force reflow
        icon.classList.add('is-bouncing');
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
    if (entry.isIntersecting) {
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
let heroRawPull = 0;
let heroOverscrollAnimId = null;
let heroOverscrollDecayTimer = null;

const heroSectionElement = document.querySelector('.hero-section');
const HERO_MAX_STRETCH = 140;

function updateHeroOverscroll() {
    const diff = heroOverscrollTarget - heroOverscroll;
    const springRate = (heroOverscrollTarget === 0) ? 0.25 : 0.15;
    heroOverscroll += diff * springRate;

    const progress = Math.min(1, Math.max(0, heroOverscroll / 125));
    const val = progress.toFixed(4);
    document.documentElement.style.setProperty('--hero-overscroll', val);
    if (heroSectionElement) {
        heroSectionElement.style.setProperty('--hero-overscroll', val);
    }

    if (Math.abs(diff) > 0.001 || heroOverscroll > 0.001) {
        heroOverscrollAnimId = requestAnimationFrame(updateHeroOverscroll);
    } else {
        heroOverscroll = 0;
        heroOverscrollTarget = 0;
        heroRawPull = 0;
        document.documentElement.style.setProperty('--hero-overscroll', '0');
        if (heroSectionElement) {
            heroSectionElement.style.setProperty('--hero-overscroll', '0');
        }
        heroOverscrollAnimId = null;
    }
}

function startHeroOverscrollSpring() {
    if (!heroOverscrollAnimId) {
        heroOverscrollAnimId = requestAnimationFrame(updateHeroOverscroll);
    }
}

let touchStartY = 0;
window.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
        touchStartY = e.touches[0].clientY;
    }
}, { passive: true });

window.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1 && window.scrollY <= 2) {
        const delta = e.touches[0].clientY - touchStartY;
        if (delta > 0) {
            heroRawPull = delta * 0.35;
            heroOverscrollTarget = (heroRawPull * HERO_MAX_STRETCH) / (heroRawPull + HERO_MAX_STRETCH);
            startHeroOverscrollSpring();
        }
    }
}, { passive: true });

window.addEventListener('touchend', () => {
    heroRawPull = 0;
    heroOverscrollTarget = 0;
    startHeroOverscrollSpring();
}, { passive: true });

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

function updateCoverExitTransform() {
    if (!coverSection) return;
    const coverBottomScrollY = getCoverBottomScrollY();
    const maxScrollY = getMaxScrollY();
    const exitDistance = maxScrollY - coverBottomScrollY;
    const currentY = window.scrollY;

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
        } else {
            if (heroSectionElement.classList.contains('is-exit-revealed')) {
                heroSectionElement.classList.remove('is-exit-revealed');
            }
        }
    }

    if (exitDistance > 10 && currentY > coverBottomScrollY) {
        if (typeof primeInitialTiltForCursor === 'function') {
            primeInitialTiltForCursor();
        }
        const progress = Math.min(1, Math.max(0, (currentY - coverBottomScrollY) / exitDistance));
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

        if (currentY <= coverBottomScrollY) {
            document.documentElement.style.setProperty('--insta-reveal-scale', '1.15');
            if (instaScreenContainer) {
                instaScreenContainer.style.setProperty('--insta-reveal-scale', '1.15');
            }
        } else {
            document.documentElement.style.setProperty('--insta-reveal-scale', '1');
            if (instaScreenContainer) {
                instaScreenContainer.style.setProperty('--insta-reveal-scale', '1');
            }
        }
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
    const maxScrollY = getMaxScrollY();

    if (coverBottomScrollY > 0 && window.scrollY > coverBottomScrollY && window.scrollY < maxScrollY) {
        if (coverBottomDist <= window.innerHeight * 0.50) {
            transitionTo(maxScrollY, 1300);
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

function transitionTo(targetY, duration = 500) {
    if (transitionAnimId) cancelAnimationFrame(transitionAnimId);
    clearTimeout(heroPullTimer);
    heroPullTimer = null;
    clearTimeout(heroPullDownTimer);
    heroPullDownTimer = null;
    if (isVerticalScrolling) {
        isVerticalScrolling = false;
    }
    isPullingTransition = true;
    const startY = window.scrollY;
    const distance = targetY - startY;
    lastTransitionDirection = distance >= 0 ? 'down' : 'up';

    if (Math.abs(distance) < 1) {
        window.scrollTo(0, targetY);
        targetScrollY = targetY;
        isPullingTransition = false;
        updateCoverExitTransform();
        return;
    }

    const startTime = performance.now();

    // Smooth ease-out (quartic) for a natural, cushioned deceleration
    function easeOutQuart(t) {
        return 1 - Math.pow(1 - t, 4);
    }

    function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const eased = easeOutQuart(progress);

        window.scrollTo(0, startY + distance * eased);
        targetScrollY = window.scrollY;
        updateCoverExitTransform();

        if (progress < 1) {
            transitionAnimId = requestAnimationFrame(step);
        } else {
            window.scrollTo(0, targetY);
            targetScrollY = targetY;
            isPullingTransition = false;
            transitionAnimId = null;
            updateCoverExitTransform();
        }
    }

    transitionAnimId = requestAnimationFrame(step);
}

// Keep target in sync when user scrolls natively or by drag
window.addEventListener('scroll', () => {
    if (!isVerticalScrolling && !isPullingTransition) {
        targetScrollY = window.scrollY;
    }
    updateCoverExitTransform();
}, { passive: true });

window.addEventListener('resize', () => {
    updateCoverExitTransform();
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

    // If currently overscrolled and user scrolls DOWN, instantly release overscroll and flow directly into downward scroll
    if ((heroOverscroll > 0.001 || heroRawPull > 0) && event.deltaY > 0) {
        heroRawPull = 0;
        heroOverscrollTarget = 0;
        startHeroOverscrollSpring();
        // Do NOT return: allows immediate downward scrolling of the cover section with zero pause!
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
    if (cardsAreAtEnd && event.deltaY > 0 && coverBottomDist <= window.innerHeight * 0.50 && window.scrollY < maxScrollY - 4) {
        transitionTo(maxScrollY, 1350);
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
const navLinks = document.querySelectorAll('.site-navbar .nav-link');
let isHoveringNavbar = false;
let isNavClickInProgress = false;
let navClickTimeout = null;

function moveBubbleTo(targetElement, isInstant = false) {
    if (!navBubble || !siteNavbar || !targetElement) return;

    const targetRect = targetElement.getBoundingClientRect();
    const navRect = siteNavbar.getBoundingClientRect();

    const x = Math.round(targetRect.left - navRect.left);
    const y = Math.round(targetRect.top - navRect.top);
    const width = Math.round(targetRect.width);
    const height = Math.round(targetRect.height);

    if (isInstant) {
        const prevTransition = navBubble.style.transition;
        navBubble.style.transition = 'none';
        navBubble.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        navBubble.style.width = `${width}px`;
        navBubble.style.height = `${height}px`;
        navBubble.classList.add('is-visible');
        void navBubble.offsetWidth; // Force reflow
        navBubble.style.transition = prevTransition;
        return;
    }

    navBubble.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    navBubble.style.width = `${width}px`;
    navBubble.style.height = `${height}px`;
    navBubble.classList.add('is-visible');
}

function moveBubbleToActiveLink(isInstant = false) {
    const activeLink = document.querySelector('.site-navbar .nav-link.is-active') || navLinks[0];
    if (activeLink) {
        moveBubbleTo(activeLink, isInstant);
    }
}

function getSectionScrollTarget(sectionId) {
    if (sectionId === 'home') return 0;
    if (sectionId === 'about') return window.innerHeight;
    if (sectionId === 'instagram' || sectionId === 'content-section') {
        return getMaxScrollY();
    }

    const targetEl = document.getElementById(sectionId);
    if (!targetEl) return 0;

    const navHeight = document.querySelector('.navbar-wrapper')?.offsetHeight || 60;
    const coverOffsetTop = coverSection ? coverSection.offsetTop : window.innerHeight;
    const targetDocY = coverOffsetTop + targetEl.offsetTop;

    return Math.max(0, Math.round(targetDocY - navHeight - 16));
}

function setActiveNavLink(sectionId) {
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
}

function updateNavbarOnScroll() {
    if (!navLinks.length || isNavClickInProgress) return;
    const scrollY = window.scrollY;
    const coverTop = coverSection ? coverSection.offsetTop : window.innerHeight;

    if (scrollY < coverTop * 0.5) {
        setActiveNavLink('home');
        return;
    }

    const coverBottomScrollY = getCoverBottomScrollY();
    if (coverBottomScrollY > 0 && scrollY >= coverBottomScrollY + 20) {
        setActiveNavLink('instagram');
        return;
    }

    const toolsEl = document.getElementById('tools');
    const workEl = document.getElementById('work');
    const threshold = window.innerHeight * 0.45;

    if (workEl && workEl.getBoundingClientRect().top <= threshold) {
        setActiveNavLink('work');
    } else if (toolsEl && toolsEl.getBoundingClientRect().top <= threshold) {
        setActiveNavLink('tools');
    } else {
        setActiveNavLink('about');
    }
}

// Hover event listeners for single moving bubble
navLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
        event.preventDefault();
        const targetId = link.getAttribute('href')?.replace('#', '');
        if (!targetId) return;

        if (targetId === 'instagram') {
            const maxHScroll = getMaxHorizontalScroll();
            if (clientWorkGrid && maxHScroll > 0) {
                clientWorkGrid.scrollLeft = maxHScroll;
                horizontalScrollTarget = maxHScroll;
            }
        } else if (targetId === 'home' || targetId === 'about') {
            if (clientWorkGrid) {
                clientWorkGrid.scrollLeft = 0;
                horizontalScrollTarget = 0;
            }
        }

        const targetY = getSectionScrollTarget(targetId);
        targetScrollY = targetY;
        setActiveNavLink(targetId);
        moveBubbleTo(link);

        isNavClickInProgress = true;
        clearTimeout(navClickTimeout);
        navClickTimeout = setTimeout(() => {
            isNavClickInProgress = false;
        }, 750);

        transitionTo(targetY, 650);
    });
});

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
window.addEventListener('resize', () => moveBubbleToActiveLink(true));

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

    primeInitialTiltForCursor = function () {
        handlePointerPosition(lastKnownCursorX, lastKnownCursorY, !wasExitRevealed);
    };

    window.addEventListener('pointermove', (event) => {
        if (event.pointerType === 'touch') return;
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
        if (targetProximity > 0) {
            const rect = instaScreenCard.getBoundingClientRect();
            if (rect.bottom < 0 || rect.top > window.innerHeight) {
                resetTiltTargets();
            }
        }
    }, { passive: true });
}
