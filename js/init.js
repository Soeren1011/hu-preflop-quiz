/**
 * PLO Range Quiz - Initialization & Event Handlers
 *
 * This module handles:
 * - Attaching event listeners (replacing inline onclick handlers)
 * - Keyboard navigation and shortcuts
 * - Modal focus management for accessibility
 * - ARIA state updates
 */

/**
 * Attach all event listeners to DOM elements.
 * Called once on DOMContentLoaded.
 */
function initEventListeners() {
    // Selection wizard: back navigation buttons
    document.getElementById('backToStep1')?.addEventListener('click', () => goToStep(1));
    document.getElementById('backToStep2')?.addEventListener('click', () => goToStep(2));
    document.getElementById('backToStep3')?.addEventListener('click', () => goToStep(3));

    // Quiz control buttons
    document.getElementById('endQuizBtn')?.addEventListener('click', endQuiz);
    document.getElementById('nextBtn')?.addEventListener('click', nextQuestion);
    document.getElementById('nextMistakeBtn')?.addEventListener('click', nextMistake);
    document.getElementById('addRangeBtn')?.addEventListener('click', openRangeSelector);

    // Quiz mode toggle (GTO vs Mixed strategy)
    document.getElementById('gtoModeBtn')?.addEventListener('click', () => {
        setQuizMode('gto');
        updateModeButtonsAria('gto');
    });
    document.getElementById('mixedModeBtn')?.addEventListener('click', () => {
        setQuizMode('mixed');
        updateModeButtonsAria('mixed');
    });

    // Display toggle buttons (H = Heatmap, M = Matching hands, EV = EV values)
    document.getElementById('toggleHeatmap')?.addEventListener('click', () => {
        toggleHeatmapDisplay();
        const btn = document.getElementById('toggleHeatmap');
        btn.setAttribute('aria-pressed', btn.classList.contains('active'));
    });
    document.getElementById('toggleMatching')?.addEventListener('click', () => {
        toggleMatchingDisplay();
        const btn = document.getElementById('toggleMatching');
        btn.setAttribute('aria-pressed', btn.classList.contains('active'));
    });
    document.getElementById('toggleEV')?.addEventListener('click', () => {
        toggleEVDisplay();
        const btn = document.getElementById('toggleEV');
        btn.setAttribute('aria-pressed', btn.classList.contains('active'));
    });

    // Modal: close button and backdrop click
    document.getElementById('closeRangeSelectorBtn')?.addEventListener('click', closeRangeSelector);
    document.getElementById('rangeSelectorModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'rangeSelectorModal') closeRangeSelector();
    });

    // Quiz mode tabs (Standard vs Cutoff)
    initQuizModeTabs();

    // Global keyboard navigation
    document.addEventListener('keydown', handleKeyboardNavigation);
}

/**
 * Initialize quiz mode tabs (Standard vs Cutoff quiz)
 */
function initQuizModeTabs() {
    const tabs = document.querySelectorAll('.quiz-mode-tab');
    const standardSteps = document.getElementById('standardQuizSteps');
    const cutoffMode = document.getElementById('cutoffQuizMode');
    
    if (!tabs.length) return;
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
            
            const mode = tab.dataset.mode;
            
            if (mode === 'standard') {
                standardSteps?.style.setProperty('display', 'block');
                cutoffMode?.style.setProperty('display', 'none');
            } else if (mode === 'cutoff') {
                standardSteps?.style.setProperty('display', 'none');
                cutoffMode?.style.setProperty('display', 'block');
                // Initialize cutoff spot selector
                initCutoffSpotSelector();
            }
        });
    });
}

// Cutoff quiz state
let cutoffSelectedScenario = null;
let cutoffSelectedSpot = null;

/**
 * Initialize the cutoff quiz spot selector
 */
async function initCutoffSpotSelector() {
    // Load cutoff data if not loaded
    if (typeof loadCutoffData === 'function') {
        await loadCutoffData();
    }
    
    const scenarioGrid = document.getElementById('cutoffScenarioGrid');
    if (!scenarioGrid || scenarioGrid.children.length > 0) return; // Already initialized
    
    // Get available scenarios from cutoff data
    const scenarios = getCutoffScenarios();
    
    scenarios.forEach(s => {
        const btn = document.createElement('button');
        btn.className = 'cutoff-scenario-btn';
        btn.innerHTML = `
            <div class="scenario-name">${s.name}</div>
            <div class="scenario-count">${s.spotCount} Spots</div>
        `;
        btn.addEventListener('click', () => selectCutoffScenario(s.key));
        scenarioGrid.appendChild(btn);
    });
    
    // Back button handlers
    document.getElementById('cutoffBackToStep1')?.addEventListener('click', () => {
        document.getElementById('cutoffStep1').style.display = 'block';
        document.getElementById('cutoffStep2').style.display = 'none';
    });
    
    document.getElementById('cutoffBackToStep2')?.addEventListener('click', () => {
        document.getElementById('cutoffStep2').style.display = 'block';
        document.getElementById('cutoffStep3').style.display = 'none';
    });
}

function getCutoffScenarios() {
    if (!cutoffData) return [];
    
    const scenarioCounts = {};
    Object.values(cutoffData).forEach(data => {
        const s = data.spot?.scenario;
        if (s) scenarioCounts[s] = (scenarioCounts[s] || 0) + 1;
    });
    
    const scenarioNames = {
        'RFI': 'RFI (Open)',
        'vsRFI': 'vs Raise',
        'vs3Bet': 'vs 3-Bet',
        'vsRFIMulti': 'vs Raise (MW)'
    };
    
    return Object.entries(scenarioCounts)
        .filter(([key]) => scenarioNames[key])
        .map(([key, count]) => ({
            key,
            name: scenarioNames[key],
            spotCount: count
        }));
}

function selectCutoffScenario(scenario) {
    cutoffSelectedScenario = scenario;
    
    // Hide step 1, show step 2
    document.getElementById('cutoffStep1').style.display = 'none';
    document.getElementById('cutoffStep2').style.display = 'block';
    
    // Populate spot grid
    const spotGrid = document.getElementById('cutoffSpotGrid');
    spotGrid.innerHTML = '';
    
    const spots = getCutoffSpotsForScenario(scenario);
    
    spots.forEach(spot => {
        const btn = document.createElement('button');
        btn.className = 'cutoff-spot-btn';
        btn.innerHTML = `
            <div class="spot-name">${spot.position}</div>
            <div class="spot-stats">${spot.context}</div>
        `;
        btn.addEventListener('click', () => selectCutoffSpot(spot));
        spotGrid.appendChild(btn);
    });
}

function getCutoffSpotsForScenario(scenario) {
    if (!cutoffData) return [];
    
    const spots = [];
    const seen = new Set();
    
    Object.entries(cutoffData).forEach(([key, data]) => {
        if (data.spot?.scenario !== scenario) return;
        
        const pos = data.spot.position;
        const path = data.spot.actionPath || '';
        const uniqueKey = `${pos}_${path}`;
        
        if (seen.has(uniqueKey)) return;
        seen.add(uniqueKey);
        
        let context = '';
        if (scenario === 'RFI') {
            context = 'Open Raise';
        } else if (scenario === 'vsRFI') {
            const opener = path.match(/(UTG|MP|CO|BTN|SB)100%/);
            context = opener ? `vs ${opener[1]}` : 'vs Raise';
        } else if (scenario === 'vs3Bet') {
            context = 'Facing 3-Bet';
        }
        
        spots.push({
            key,
            position: pos,
            context,
            actionPath: path,
            data
        });
    });
    
    // Sort by position
    const posOrder = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'];
    return spots.sort((a, b) => posOrder.indexOf(a.position) - posOrder.indexOf(b.position));
}

function selectCutoffSpot(spot) {
    cutoffSelectedSpot = spot;
    
    // Hide step 2, show step 3
    document.getElementById('cutoffStep2').style.display = 'none';
    document.getElementById('cutoffStep3').style.display = 'block';
    
    // Add mode button handlers
    document.querySelectorAll('.cutoff-mode-btn').forEach(btn => {
        btn.onclick = () => startCutoffQuizForSpot(btn.dataset.mode);
    });
}

async function startCutoffQuizForSpot(mode) {
    const cutoffIntro = document.querySelector('.cutoff-quiz-intro');
    const cutoffContainer = document.getElementById('cutoffQuizContainer');
    
    cutoffIntro.style.display = 'none';
    cutoffContainer.style.display = 'block';
    
    cutoffContainer.innerHTML = `
        <div id="cutoffQuizArea"></div>
        <button class="end-cutoff-quiz-btn" id="endCutoffQuizBtn">← Quiz beenden</button>
    `;
    
    document.getElementById('endCutoffQuizBtn')?.addEventListener('click', () => {
        cutoffContainer.style.display = 'none';
        cutoffIntro.style.display = 'block';
        // Reset to step 1
        document.getElementById('cutoffStep1').style.display = 'block';
        document.getElementById('cutoffStep2').style.display = 'none';
        document.getElementById('cutoffStep3').style.display = 'none';
        // Reset state
        if (typeof cutoffQuizState !== 'undefined') {
            cutoffQuizState.score = 0;
            cutoffQuizState.total = 0;
        }
    });
    
    // Initialize quiz for this specific spot
    if (typeof initCutoffQuiz === 'function') {
        await initCutoffQuiz('cutoffQuizArea', {
            spotKey: cutoffSelectedSpot.key,
            questionType: mode
        });
    }
}

/**
 * Update ARIA checked states for radio button group.
 * @param {string} mode - 'gto' or 'mixed'
 */
function updateModeButtonsAria(mode) {
    document.getElementById('gtoModeBtn')?.setAttribute('aria-checked', mode === 'gto');
    document.getElementById('mixedModeBtn')?.setAttribute('aria-checked', mode === 'mixed');
}

/**
 * Handle keyboard shortcuts for accessibility and power users.
 *
 * Shortcuts:
 * - Escape: Close modal
 * - F: Fold (in quiz)
 * - C: Call (in quiz, if available)
 * - R: Raise (in quiz)
 * - Enter/Space: Next hand (after answering)
 * - Tab: Focus navigation (trapped in modal when open)
 */
function handleKeyboardNavigation(e) {
    const modal = document.getElementById('rangeSelectorModal');
    const isModalOpen = modal?.classList.contains('active');

    // Escape key - close modal or go back
    if (e.key === 'Escape') {
        if (isModalOpen) {
            closeRangeSelector();
            e.preventDefault();
        } else if (document.getElementById('quizArea')?.classList.contains('active')) {
            // In quiz mode, could show confirmation or do nothing
        }
        return;
    }

    // Only handle these shortcuts when not in modal
    if (isModalOpen) {
        // Trap focus in modal
        if (e.key === 'Tab') {
            trapFocusInModal(e, modal);
        }
        return;
    }

    // Quiz mode keyboard shortcuts
    if (document.getElementById('quizArea')?.classList.contains('active')) {
        const primaryModule = quizModules.find(m => m.isPrimary);
        if (!primaryModule || primaryModule.answered) {
            // After answering, Enter/Space for next question
            if ((e.key === 'Enter' || e.key === ' ') && document.getElementById('nextBtn')?.classList.contains('visible')) {
                nextQuestion();
                e.preventDefault();
            }
            return;
        }

        // Answer shortcuts: F = Fold, C = Call, R = Raise
        if (e.key === 'f' || e.key === 'F') {
            submitModuleAnswer(primaryModule.id, 'fold');
            e.preventDefault();
        } else if ((e.key === 'c' || e.key === 'C') && primaryModule.hasCallAction) {
            submitModuleAnswer(primaryModule.id, 'call');
            e.preventDefault();
        } else if (e.key === 'r' || e.key === 'R') {
            submitModuleAnswer(primaryModule.id, 'raise');
            e.preventDefault();
        }
    }
}

/**
 * Trap focus within modal for accessibility.
 * Prevents Tab from leaving the modal dialog.
 */
function trapFocusInModal(e, modal) {
    const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
            lastFocusable.focus();
            e.preventDefault();
        }
    } else {
        if (document.activeElement === lastFocusable) {
            firstFocusable.focus();
            e.preventDefault();
        }
    }
}

// Enhanced openRangeSelector with focus management
const originalOpenRangeSelector = typeof openRangeSelector !== 'undefined' ? openRangeSelector : null;
if (originalOpenRangeSelector) {
    window.openRangeSelectorOriginal = originalOpenRangeSelector;
    window.openRangeSelector = function() {
        openRangeSelectorOriginal();
        // Focus first element in modal after opening
        setTimeout(() => {
            const modal = document.getElementById('rangeSelectorModal');
            const firstBtn = modal?.querySelector('button, [tabindex="0"]');
            if (firstBtn) firstBtn.focus();
        }, 100);
    };
}

// Enhanced closeRangeSelector with focus restoration
const originalCloseRangeSelector = typeof closeRangeSelector !== 'undefined' ? closeRangeSelector : null;
let lastFocusedElement = null;
if (originalCloseRangeSelector) {
    window.closeRangeSelectorOriginal = originalCloseRangeSelector;
    window.closeRangeSelector = function() {
        closeRangeSelectorOriginal();
        // Restore focus to trigger element
        if (lastFocusedElement) {
            lastFocusedElement.focus();
        }
    };
    // Track last focused element before opening modal
    document.getElementById('addRangeBtn')?.addEventListener('focus', (e) => {
        lastFocusedElement = e.target;
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
});

// Check for URL parameters to auto-start a specific spot
function checkUrlParams() {
    const params = new URLSearchParams(window.location.search);

    // Guest mode: only UTG RFI, minimal UI
    const guestParam = params.get('guest');
    if (guestParam === 'utg-rfi') {
        startGuestMode();
        return true;
    }

    // New format: mistakesList=spot:hand,spot:hand,... (preserves order)
    const mistakesListParam = params.get('mistakesList');
    const playersParam = params.get('players');
    if (mistakesListParam && allSpotsUnfiltered && allSpotsUnfiltered.length > 0) {
        startMistakesQuizOrdered(mistakesListParam, playersParam);
        return true;
    }
    // Legacy format: mistakes=spot1,spot2&hands=h1,h2;h3,h4
    const mistakesParam = params.get('mistakes');
    const handsParam = params.get('hands');
    if (mistakesParam && handsParam && allSpotsUnfiltered && allSpotsUnfiltered.length > 0) {
        startMistakesQuiz(mistakesParam, handsParam);
        return true;
    }
    const spotFile = params.get('spot');
    const handParam = params.get('hand');
    if (spotFile && allSpotsUnfiltered && allSpotsUnfiltered.length > 0) {
        const spot = allSpotsUnfiltered.find(s => s.filename === spotFile || s.filename === spotFile + '.bin.gz');
        if (spot) {
            autoStartSpot(spot, handParam);
            return true;
        }
    }
    return false;
}

// Start quiz with ordered mistakes list (new format: spot:hand,spot:hand,...)
async function startMistakesQuizOrdered(listStr, playersStr) {
    const items = listStr.split(',');
    // Parse players: "UTG:Name1,MP:Name2;UTG:Name3,BB:Name4" (semicolon per hand)
    const playersPerHand = playersStr ? playersStr.split(';') : [];

    mistakesQueue = [];
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const colonIdx = item.indexOf(':');
        if (colonIdx === -1) continue;
        const spotFile = item.substring(0, colonIdx);
        const hand = item.substring(colonIdx + 1);
        // Try exact match, then with .bin.gz suffix
        let spot = allSpotsUnfiltered.find(s => s.filename === spotFile);
        if (!spot) spot = allSpotsUnfiltered.find(s => s.filename === spotFile + '.bin.gz');

        // Parse players for this hand: "UTG:Name1,MP:Name2" -> { UTG: "Name1", MP: "Name2" }
        const players = {};
        if (playersPerHand[i]) {
            playersPerHand[i].split(',').forEach(pair => {
                const [pos, name] = pair.split(':');
                if (pos && name) players[pos] = name;
            });
        }

        if (spot && hand) {
            mistakesQueue.push({ spot, hand, players, answered: false, correct: false });
        }
    }
    if (mistakesQueue.length === 0) return;
    currentMistakeIndex = 0;
    mistakesStats = { correct: 0, total: 0 };
    showMistakeUI(true);
    updateMistakeCounter();
    await loadMistake(mistakesQueue[0]);
}

// Global mistakes queue for multi-spot quiz
let mistakesQueue = [];
let currentMistakeIndex = 0;
let mistakesStats = { correct: 0, total: 0 };

// Start quiz with multiple mistake spots and hands
async function startMistakesQuiz(spotsStr, handsStr) {
    const spotFiles = spotsStr.split(',');
    const handGroups = handsStr.split(';');
    mistakesQueue = [];
    for (let i = 0; i < spotFiles.length; i++) {
        const spotFile = spotFiles[i];
        const hands = handGroups[i] ? handGroups[i].split(',') : [];
        const spot = allSpotsUnfiltered.find(s => s.filename === spotFile);
        if (spot) {
            hands.forEach(h => mistakesQueue.push({ spot, hand: h, answered: false, correct: false }));
        }
    }
    if (mistakesQueue.length === 0) return;
    currentMistakeIndex = 0;
    mistakesStats = { correct: 0, total: 0 };
    showMistakeUI(true);
    updateMistakeCounter();
    await loadMistake(mistakesQueue[0]);
}

function showMistakeUI(show) {
    const btn = document.getElementById('nextMistakeBtn');
    const counter = document.getElementById('mistakeCounter');
    if (btn) btn.style.display = show ? 'inline-block' : 'none';
    if (counter) counter.style.display = show ? 'inline' : 'none';
}

function updateMistakeCounter() {
    const counter = document.getElementById('mistakeCounter');
    if (counter && mistakesQueue.length > 0) {
        const pct = mistakesStats.total > 0
            ? Math.round((mistakesStats.correct / mistakesStats.total) * 100)
            : 0;
        const pctText = mistakesStats.total > 0 ? ` | ${pct}% correct` : '';
        counter.textContent = `Mistake ${currentMistakeIndex + 1} / ${mistakesQueue.length}${pctText}`;
    }
}

// Called from quiz-answers.js when answer is submitted in mistakes mode
function updateMistakeResult(isCorrect) {
    if (mistakesQueue.length === 0) return;
    const current = mistakesQueue[currentMistakeIndex];
    if (current && !current.answered) {
        current.answered = true;
        current.correct = isCorrect;
        mistakesStats.total++;
        if (isCorrect) mistakesStats.correct++;
        updateMistakeCounter();
    }
}

async function nextMistake() {
    if (mistakesQueue.length === 0) return;
    currentMistakeIndex = (currentMistakeIndex + 1) % mistakesQueue.length;
    updateMistakeCounter();
    await loadMistake(mistakesQueue[currentMistakeIndex]);
}

async function loadMistake(mistake) {
    quizModules.forEach(m => {
        const el = document.getElementById(`quizModule${m.id}`);
        if (el) el.remove();
    });
    quizModules = [];
    nextModuleId = 0;
    selectedScenario = mistake.spot.scenario;
    selectedPosition = mistake.spot.position;
    selectedOpener = getOpenerFromPath(mistake.spot.actionPath);
    selectedCallers = getCallersFromPath(mistake.spot.actionPath);
    const module = await addQuizModule(mistake.spot.filename, true);
    // Attach player names for mistakes mode and re-render table
    if (mistake.players && Object.keys(mistake.players).length > 0) {
        module.players = mistake.players;
        renderMiniTable(module.id);
    }
    startQuiz();
    if (mistake.hand) jumpToHand(mistake.hand);
}

// Auto-start quiz with a specific spot and optionally a specific hand
async function autoStartSpot(spot, handNotation) {
    selectedScenario = spot.scenario;
    selectedPosition = spot.position;
    selectedOpener = getOpenerFromPath(spot.actionPath);
    selectedCallers = getCallersFromPath(spot.actionPath);
    await addQuizModule(spot.filename, true);
    startQuiz();
    if (handNotation) {
        jumpToHand(handNotation);
    }
}

// Guest mode: lock to UTG RFI, minimal UI, separate stats
async function startGuestMode() {
    window._guestMode = true;
    // Find UTG RFI spot
    const spot = allSpotsUnfiltered.find(s => s.scenario === 'RFI' && s.position === 'UTG');
    if (!spot) return;
    // Hide mode selector, dashboard, spot selector UI
    var modeContainer = document.getElementById('modeSelectorContainer');
    if (modeContainer) modeContainer.style.display = 'none';
    var selectorTitle = document.querySelector('.selector-title');
    if (selectorTitle) selectorTitle.textContent = 'UTG Open Raise Quiz (Free)';
    // Hide spot selection steps
    ['step1','step2','step3','step4','standardQuizSteps','cutoffQuizMode','singleModeSpotGrid','trainingPlanSection'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    // Hide quiz mode tabs
    var tabs = document.querySelector('.quiz-mode-tabs');
    if (tabs) tabs.style.display = 'none';
    // Hide add range button in quiz
    var addBtn = document.getElementById('addRangeBtn');
    if (addBtn) addBtn.style.display = 'none';
    // Auto-start the quiz
    await autoStartSpot(spot);
}

// Jump to a specific hand in the quiz by notation
function jumpToHand(notation) {
    const primaryModule = quizModules.find(m => m.isPrimary);
    if (!primaryModule || !primaryModule.rangeData) return;
    const targetInfo = parseHandInfo(notation);
    if (!targetInfo) return;
    const handIndex = primaryModule.rangeData.findIndex(h => {
        const hInfo = parseHandInfo(h.notation);
        return hInfo && hInfo.ranks === targetInfo.ranks && hInfo.suitPattern === targetInfo.suitPattern;
    });
    if (handIndex >= 0) {
        const posInShuffled = currentHandIndices.indexOf(handIndex);
        if (posInShuffled >= 0) {
            currentQuestionIndex = posInShuffled;
        } else {
            currentHandIndices.unshift(handIndex);
            currentQuestionIndex = 0;
        }
        showQuestion();
    }
}

// Parse hand into canonical ranks + suit pattern
function parseHandInfo(notation) {
    if (!notation) return null;
    const clean = notation.replace(/\s+/g, '');
    if (clean.length !== 8) return null;
    const cards = [];
    for (let i = 0; i < 8; i += 2) {
        cards.push({ rank: clean[i].toUpperCase(), suit: clean[i + 1].toLowerCase() });
    }
    const rankOrder = '23456789TJQKA';
    cards.sort((a, b) => rankOrder.indexOf(b.rank) - rankOrder.indexOf(a.rank));
    const ranks = cards.map(c => c.rank).join('');
    const suitMap = {};
    let suitNum = 1;
    const suitPattern = cards.map(c => {
        if (!suitMap[c.suit]) suitMap[c.suit] = suitNum++;
        return suitMap[c.suit];
    }).join('');
    return { ranks, suitPattern };
}

// Initialize app
init();
