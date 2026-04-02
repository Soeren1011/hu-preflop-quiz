/**
 * PLO4 Range Quiz - Quiz Mode Selector
 * Manages Single/Multi/NextStreet mode selection and state
 */

const QUIZ_MODES = {
    single: { id: 'single', name: 'Single', desc: 'Focus on one spot', icon: '🎯' },
    multi: { id: 'multi', name: 'Multi', desc: 'Compare ranges', icon: '📊' },
    nextstreet: { id: 'nextstreet', name: 'Next Street', desc: 'Flop/Turn/River Quiz', icon: '🃏' }
};

const MODE_STORAGE_KEY = 'plo4quiz_mode_v1';

let currentMode = localStorage.getItem(MODE_STORAGE_KEY) || 'single';
// Fallback if stored mode no longer exists (e.g. removed 'training')
if (!QUIZ_MODES[currentMode]) currentMode = 'single';

function getQuizAppMode() {
    return currentMode;
}

function setQuizAppMode(mode) {
    if (!QUIZ_MODES[mode]) return;
    currentMode = mode;
    localStorage.setItem(MODE_STORAGE_KEY, mode);
    applyModeToUI(mode);
}

function renderModeSelector() {
    const container = document.getElementById('modeSelectorContainer');
    if (!container) return;

    container.innerHTML = `
        <div class="mode-selector">
            <div class="mode-tab-bar">
                ${Object.values(QUIZ_MODES).map(m => `
                    <button class="mode-tab ${currentMode === m.id ? 'active' : ''}"
                            data-mode="${m.id}"
                            aria-pressed="${currentMode === m.id}">
                        <span class="mode-tab-icon">${m.icon}</span>
                        <span class="mode-tab-name">${m.name}</span>
                    </button>
                `).join('')}
            </div>
        </div>
    `;

    container.querySelectorAll('.mode-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            setQuizAppMode(mode);
            container.querySelectorAll('.mode-tab').forEach(b => {
                b.classList.toggle('active', b.dataset.mode === mode);
                b.setAttribute('aria-pressed', b.dataset.mode === mode);
            });
        });
    });

    applyModeToUI(currentMode);
}

let singleModeSelectedScenario = null;

function applyModeToUI(mode) {
    const spotSelector = document.getElementById('spotSelector');
    const standardSteps = document.getElementById('standardQuizSteps');
    const cutoffMode = document.getElementById('cutoffQuizMode');
    const addRangeBtn = document.getElementById('addRangeBtn');
    const quizModeTabs = document.querySelector('.quiz-mode-tabs');
    const singleModeGrid = document.getElementById('singleModeSpotGrid');
    const selectorTitle = document.querySelector('.selector-title');
    const nextStreetEl = document.getElementById('nextStreetPlaceholder');

    // Hide next street placeholder by default (shown only in nextstreet mode)
    if (nextStreetEl && mode !== 'nextstreet') nextStreetEl.style.display = 'none';

    // Hide multi-mode elements by default
    const multiToggle = document.getElementById('multiModeToggle');
    const presetSection = document.getElementById('presetCategoriesSection');
    if (multiToggle) multiToggle.style.display = 'none';
    if (presetSection) presetSection.style.display = 'none';

    if (mode === 'single') {
        // Single mode: clean, focused - spot grid first, dashboard collapsed below
        if (standardSteps) standardSteps.style.display = 'none';
        if (cutoffMode) cutoffMode.style.display = 'none';
        if (addRangeBtn) addRangeBtn.style.display = 'none';
        if (quizModeTabs) quizModeTabs.style.display = 'none';
        if (singleModeGrid) singleModeGrid.style.display = 'block';
        if (spotSelector) spotSelector.style.display = 'block';
        if (selectorTitle) selectorTitle.style.display = 'none';
        renderSingleModeUI();
    } else if (mode === 'multi') {
        // Multi mode: preset categories + custom wizard
        if (standardSteps) standardSteps.style.display = 'block';
        if (cutoffMode) cutoffMode.style.display = 'none';
        if (addRangeBtn) addRangeBtn.style.display = '';
        if (quizModeTabs) quizModeTabs.style.display = 'flex';
        if (singleModeGrid) singleModeGrid.style.display = 'none';
        if (spotSelector) spotSelector.style.display = 'block';
        if (selectorTitle) selectorTitle.style.display = 'none';
        // Show multi mode toggle and apply current tab
        if (multiToggle) multiToggle.style.display = 'flex';
        if (typeof initMultiModeToggle === 'function') initMultiModeToggle();
        if (typeof applyMultiModeTab === 'function') applyMultiModeTab();
    } else if (mode === 'nextstreet') {
        // Next Street mode: placeholder - coming soon
        if (standardSteps) standardSteps.style.display = 'none';
        if (cutoffMode) cutoffMode.style.display = 'none';
        if (addRangeBtn) addRangeBtn.style.display = 'none';
        if (quizModeTabs) quizModeTabs.style.display = 'none';
        if (singleModeGrid) singleModeGrid.style.display = 'none';
        if (spotSelector) spotSelector.style.display = 'block';
        if (selectorTitle) selectorTitle.style.display = 'none';
        renderNextStreetPlaceholder();
    }
}

/**
 * Render placeholder for Next Street mode (coming soon)
 */
function renderNextStreetPlaceholder() {
    let container = document.getElementById('nextStreetPlaceholder');
    if (!container) {
        container = document.createElement('div');
        container.id = 'nextStreetPlaceholder';
        const spotSelector = document.getElementById('spotSelector');
        if (spotSelector) {
            spotSelector.appendChild(container);
        }
    }
    container.style.display = 'block';
    container.innerHTML = `
        <div class="next-street-placeholder">
            <div class="placeholder-icon">🃏</div>
            <h3>Next Street Quiz</h3>
            <p>Practice Flop, Turn & River decisions.</p>
            <span class="placeholder-badge">Coming Soon</span>
        </div>
    `;
}

/**
 * Render the Single Mode UI: Scenario tabs + spot grid for direct quiz start
 */
function renderSingleModeUI() {
    const container = document.getElementById('singleModeSpotGrid');
    if (!container || !allSpots || allSpots.length === 0) return;

    // Group spots by effective scenario
    const grouped = {};
    for (const spot of allSpots) {
        const eff = getEffectiveScenario(spot);
        if (!grouped[eff]) grouped[eff] = [];
        grouped[eff].push(spot);
    }

    // Determine which scenarios have spots
    const scenarioOrder = ['RFI', 'vsRFI', 'vsRFIMulti', 'vs3BetAsRaiser', 'vs3BetAsCaller', 'vs4Bet'];
    const availableScenarios = scenarioOrder.filter(s => grouped[s] && grouped[s].length > 0);
    if (availableScenarios.length === 0) return;

    // Default to first available or previously selected
    if (!singleModeSelectedScenario || !availableScenarios.includes(singleModeSelectedScenario)) {
        singleModeSelectedScenario = availableScenarios[0];
    }

    const scenarioLabels = {
        'RFI': 'RFI',
        'vsRFI': 'Facing Open',
        'vsRFIMulti': 'vs Open MW',
        'vs3BetAsRaiser': 'vs 3Bet (Raiser)',
        'vs3BetAsCaller': 'vs 3Bet (Caller)',
        'vs4Bet': 'vs 4Bet'
    };

    // Build tabs HTML
    const tabsHtml = availableScenarios.map(s => `
        <button class="single-mode-tab ${s === singleModeSelectedScenario ? 'active' : ''}"
                data-scenario="${s}">${scenarioLabels[s] || s}</button>
    `).join('');

    // Build spot buttons for selected scenario
    const spots = grouped[singleModeSelectedScenario] || [];
    const spotsHtml = buildSpotButtons(spots, singleModeSelectedScenario);

    container.innerHTML = `
        <div class="single-mode-tabs">${tabsHtml}</div>
        <div class="single-mode-spots">${spotsHtml}</div>
    `;

    // Tab click handlers
    container.querySelectorAll('.single-mode-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            singleModeSelectedScenario = tab.dataset.scenario;
            renderSingleModeUI();
        });
    });

    // Overflow toggle handlers
    container.querySelectorAll('.overflow-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const row = btn.dataset.row;
            const overflow = document.getElementById('overflow-' + row);
            if (overflow) {
                const isHidden = overflow.style.display === 'none';
                overflow.style.display = isHidden ? 'grid' : 'none';
                btn.querySelector('.spot-btn-info').textContent = isHidden ? 'less' : 'more';
            }
        });
    });

    // Spot click handlers (exclude overflow toggles)
    container.querySelectorAll('.single-mode-spot-btn:not(.overflow-toggle)').forEach(btn => {
        btn.addEventListener('click', () => {
            const filename = btn.dataset.filename;
            const spot = allSpots.find(s => s.filename === filename);
            if (spot && typeof autoStartSpot === 'function') {
                autoStartSpot(spot);
            }
        });
    });
}

/**
 * Build spot button HTML for a given scenario
 */
function buildSpotButtons(spots, scenario) {
    if (scenario === 'RFI') {
        // Simple: one button per position
        const posOrder = ['UTG', 'MP', 'CO', 'BTN', 'SB'];
        return `<div class="single-mode-spot-grid">${posOrder.map(pos => {
            const spot = spots.find(s => s.position === pos);
            if (!spot) return '';
            return `<button class="single-mode-spot-btn" data-filename="${spot.filename}">
                <div class="spot-btn-position">${pos}</div>
                <div class="spot-btn-info">Open</div>
            </button>`;
        }).join('')}</div>`;
    }

    if (scenario === 'vsRFI') {
        // Group by hero position in rows: BB, SB, BTN, CO, MP
        const heroOrder = ['BB', 'SB', 'BTN', 'CO', 'MP'];
        const openerOrder = ['SB', 'BTN', 'CO', 'MP', 'UTG'];
        const grouped = {};
        for (const spot of spots) {
            const pos = spot.position;
            if (!grouped[pos]) grouped[pos] = [];
            grouped[pos].push(spot);
        }
        // Sort each group's spots by opener order
        for (const pos of Object.keys(grouped)) {
            grouped[pos].sort((a, b) => {
                const oA = getOpenerFromPath(a.actionPath);
                const oB = getOpenerFromPath(b.actionPath);
                return openerOrder.indexOf(oA) - openerOrder.indexOf(oB);
            });
        }
        let html = '';
        for (const pos of heroOrder) {
            const group = grouped[pos];
            if (!group || group.length === 0) continue;
            const buttons = group.map(spot => {
                const opener = getOpenerFromPath(spot.actionPath);
                return `<button class="single-mode-spot-btn" data-filename="${spot.filename}">
                    <div class="spot-btn-position">${pos}</div>
                    <div class="spot-btn-info">vs ${opener || '?'}</div>
                </button>`;
            }).join('');
            html += `<div class="single-mode-spot-row"><div class="spot-row-label">${pos}</div><div class="single-mode-spot-grid">${buttons}</div></div>`;
        }
        return html;
    }

    if (scenario === 'vsRFIMulti') {
        return buildRowGroupedButtons(spots, spot => {
            const opener = getOpenerFromPath(spot.actionPath);
            const callers = getCallersFromPath(spot.actionPath);
            const callerStr = callers.length > 0 ? ` +${callers.join(',')}` : '';
            return `vs ${opener || '?'}${callerStr}`;
        }, 'mw');
    }

    if (scenario === 'vs3BetAsRaiser') {
        return buildRowGroupedButtons(spots, spot => {
            const parts = spot.actionPath.split('-');
            let threeBettor = '?';
            let raiseCount = 0;
            for (const p of parts) {
                if (p.match(/(100%|AI)$/)) {
                    raiseCount++;
                    if (raiseCount === 2) {
                        const m = p.match(/^(UTG|MP|CO|BTN|SB|BB)/);
                        if (m) threeBettor = m[1];
                    }
                }
            }
            return `vs ${threeBettor} 3B`;
        }, '3br');
    }

    if (scenario === 'vs3BetAsCaller') {
        return buildRowGroupedButtons(spots, spot => {
            const opener = getOpenerFromPath(spot.actionPath);
            const parts = spot.actionPath.split('-');
            let squeezer = '?';
            let raiseCount = 0;
            for (const p of parts) {
                if (p.match(/(100%|AI)$/)) {
                    raiseCount++;
                    if (raiseCount === 2) {
                        const m = p.match(/^(UTG|MP|CO|BTN|SB|BB)/);
                        if (m) squeezer = m[1];
                    }
                }
            }
            return `${opener}r ${squeezer}3B`;
        }, '3bc');
    }

    if (scenario === 'vs4Bet') {
        return buildGroupedSpotButtons(spots, spot => {
            return { line1: spot.position, line2: 'vs 4Bet' };
        });
    }

    // Fallback
    return buildGroupedSpotButtons(spots, spot => {
        return { line1: spot.position, line2: getSpotDisplayName(spot) };
    });
}

/**
 * Build row-grouped spot buttons with overflow, grouped by hero position
 * @param {Array} spots - All spots for this scenario
 * @param {Function} infoFn - (spot) => string for the info line
 * @param {string} prefix - Unique prefix for overflow IDs
 * @param {number} maxVisible - Max buttons per row before overflow
 */
function buildRowGroupedButtons(spots, infoFn, prefix, maxVisible = 5) {
    const heroOrder = ['BB', 'SB', 'BTN', 'CO', 'MP', 'UTG'];
    const grouped = {};
    for (const spot of spots) {
        const pos = spot.position;
        if (!grouped[pos]) grouped[pos] = [];
        grouped[pos].push(spot);
    }
    let html = '';
    for (const pos of heroOrder) {
        const group = grouped[pos];
        if (!group || group.length === 0) continue;
        const allButtons = group.map(spot => {
            return `<button class="single-mode-spot-btn" data-filename="${spot.filename}">
                <div class="spot-btn-position">${pos}</div>
                <div class="spot-btn-info">${infoFn(spot)}</div>
            </button>`;
        });
        const visible = allButtons.slice(0, maxVisible).join('');
        const overflowCount = allButtons.length - maxVisible;
        const rowId = `${prefix}-${pos}`;
        let gridHtml = `<div class="single-mode-spot-grid">${visible}`;
        if (overflowCount > 0) {
            gridHtml += `<button class="single-mode-spot-btn overflow-toggle" data-row="${rowId}">
                <div class="spot-btn-position">+${overflowCount}</div>
                <div class="spot-btn-info">more</div>
            </button>`;
        }
        gridHtml += `</div>`;
        if (overflowCount > 0) {
            const overflow = allButtons.slice(maxVisible).join('');
            gridHtml += `<div class="single-mode-spot-grid spot-overflow" id="overflow-${rowId}" style="display:none;margin-top:8px;">${overflow}</div>`;
        }
        html += `<div class="single-mode-spot-row"><div class="spot-row-label">${pos}</div><div class="spot-row-content">${gridHtml}</div></div>`;
    }
    return html;
}

/**
 * Build grouped spot buttons with a label generator
 */
function buildGroupedSpotButtons(spots, labelFn) {
    const buttons = spots.map(spot => {
        const label = labelFn(spot);
        return `<button class="single-mode-spot-btn" data-filename="${spot.filename}">
            <div class="spot-btn-position">${label.line1}</div>
            <div class="spot-btn-info">${label.line2}</div>
        </button>`;
    }).join('');
    return `<div class="single-mode-spot-grid">${buttons}</div>`;
}

/**
 * Apply mode constraints when starting a quiz
 * Called from quiz-core.js startQuiz()
 */
function applyModeToQuiz() {
    const savePresetBtn = document.getElementById('savePresetBtn');
    if (currentMode === 'single') {
        const addRangeBtn = document.getElementById('addRangeBtn');
        if (addRangeBtn) addRangeBtn.style.display = 'none';
        if (savePresetBtn) savePresetBtn.style.display = 'none';
    } else if (currentMode === 'multi') {
        if (savePresetBtn) savePresetBtn.style.display = '';
    }
}

/**
 * Restore mode selector when ending quiz
 * Called from quiz-core.js endQuiz()
 */
function restoreModeOnEndQuiz() {
    applyModeToUI(currentMode);
}

/**
 * Check if adding secondary modules is allowed
 * Returns false in single mode (only 1 module allowed)
 */
function canAddSecondaryModule() {
    return currentMode !== 'single';
}
