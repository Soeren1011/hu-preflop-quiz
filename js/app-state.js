/**
 * PLO Range Quiz - Application State
 */

// Global State
let allSpots = [];
let allSpotsUnfiltered = [];
let selectedScenario = null;   // Step 1: vsRFI, vs3Bet, etc.
let selectedPosition = null;   // Step 2: Hero position (BB, SB, etc.)
let selectedOpener = null;     // Step 3: Who raised (UTG, MP, etc.)
let selectedCallers = null;    // Step 4: Callers (null=all, []=HU, ['MP']=with caller)
let selectedVillain = null;    // Legacy - kept for compatibility
let quizModules = [];
let nextModuleId = 0;
let currentHandIndices = [];
let currentQuestionIndex = 0;
let quizMode = 'gto';
let currentFilterExpr = '';
let allAnswered = false;
let globalStats = { correct: 0, wrong: 0, streak: 0, bestStreak: 0 };

// Display toggles (H = Heatmap, M = Matching hands, EV = EV values)
let showHeatmap = true;
let showMatchingHands = true;
let showEV = true;

function toggleHeatmapDisplay() {
    showHeatmap = !showHeatmap;
    document.getElementById('toggleHeatmap').classList.toggle('active', showHeatmap);
    updateHeatmapVisibility();
}

function toggleMatchingDisplay() {
    showMatchingHands = !showMatchingHands;
    document.getElementById('toggleMatching').classList.toggle('active', showMatchingHands);
    updateMatchingVisibility();
}

function updateHeatmapVisibility() {
    quizModules.forEach(m => {
        const table = document.getElementById(`moduleHeatmapTable${m.id}`);
        if (table) {
            table.style.display = showHeatmap ? '' : 'none';
            // Re-render if turning on and table is empty
            if (showHeatmap && m.answered && table.innerHTML === '') {
                const handIndex = currentHandIndices[currentQuestionIndex % currentHandIndices.length];
                const hand = m.rangeData[handIndex];
                if (hand) renderModuleHeatmap(m.id, hand);
            }
        }
    });
}

function updateMatchingVisibility() {
    quizModules.forEach(m => {
        const grid = document.getElementById(`moduleHandsGrid${m.id}`);
        if (grid) {
            grid.style.display = showMatchingHands ? '' : 'none';
            // Re-render if turning on and grid is empty
            if (showMatchingHands && m.answered && grid.innerHTML === '') {
                const handIndex = currentHandIndices[currentQuestionIndex % currentHandIndices.length];
                const hand = m.rangeData[handIndex];
                if (hand) renderModuleHandsGrid(m.id, hand);
            }
        }
    });
}

function toggleEVDisplay() {
    showEV = !showEV;
    document.getElementById('toggleEV').classList.toggle('active', showEV);
    updateEVVisibility();
}

function updateEVVisibility() {
    // Toggle visibility of all EV elements via CSS class on body
    document.body.classList.toggle('hide-ev', !showEV);
}

// moduleExpandState is declared in heatmap.js

// Range Selector State
let rangeSelectorTargetModuleId = null;
let rangeSelectorStep = 1;
let rangeSelectorPosition = null;
let rangeSelectorScenario = null;
let rangeSelectorVillain = null;

// Initialization
async function init() {
    try {
        const response = await fetch('ranges-manifest.json');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        if (data.success) {
            allSpotsUnfiltered = data.files;
            allSpots = data.files.filter(shouldShowSpot);
            renderScenarioGrid();
            if (typeof renderQuicklinks === 'function') {
                renderQuicklinks();
            }
            if (typeof renderModeSelector === 'function') {
                renderModeSelector();
            }
            if (typeof checkUrlParams === 'function') {
                checkUrlParams();
            }
            if (typeof renderSingleModeUI === 'function' && typeof getQuizAppMode === 'function' && getQuizAppMode() === 'single') {
                renderSingleModeUI();
            }
        } else {
            showInitError('Invalid data format from server');
        }
    } catch (error) {
        showInitError(`Failed to load quiz data: ${error.message}`);
    }
}

// Display initialization error to user
function showInitError(message) {
    const selector = document.getElementById('spotSelector');
    if (selector) {
        selector.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ef4444;">
                <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                <div style="font-size: 18px; font-weight: 600; margin-bottom: 10px;">Error Loading Quiz</div>
                <div style="font-size: 14px; color: #888;">${message}</div>
                <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #667eea; border: none; border-radius: 6px; color: #fff; cursor: pointer;">
                    Retry
                </button>
            </div>`;
    }
}

function goToStep(step) {
    document.getElementById('step1').style.display = step === 1 ? 'block' : 'none';
    document.getElementById('step2').style.display = step === 2 ? 'block' : 'none';
    document.getElementById('step3').style.display = step === 3 ? 'block' : 'none';
    document.getElementById('step4').style.display = step === 4 ? 'block' : 'none';

    // Reset downstream selections
    if (step <= 1) { selectedScenario = null; selectedPosition = null; selectedOpener = null; selectedCallers = null; }
    if (step <= 2) { selectedPosition = null; selectedOpener = null; selectedCallers = null; }
    if (step <= 3) { selectedOpener = null; selectedCallers = null; }
    if (step <= 4) { selectedCallers = null; }
}

// Extract the first raiser (opener) from action path
// Handles: UTG100%-... and UTGF-MP100%-... and UTGF-MPF-CO100%-...
function getOpenerFromPath(actionPath) {
    if (!actionPath) return null;
    // Split by dash and find first raise action
    const parts = actionPath.split('-');
    for (const part of parts) {
        const match = part.match(/^(UTG|MP|CO|BTN|SB|BB)(100%|AI)$/);
        if (match) return match[1];
    }
    return null;
}

// Get all callers from action path (positions that called before hero acts)
function getCallersFromPath(actionPath) {
    if (!actionPath) return [];
    const parts = actionPath.split('-');
    const callers = [];
    let foundRaise = false;
    for (const part of parts) {
        if (part.match(/(100%|AI)$/)) {
            if (!foundRaise) foundRaise = true;
            else break; // Stop at second raise (that's a 3-bet)
        }
        const callMatch = part.match(/^(UTG|MP|CO|BTN|SB|BB)C$/);
        if (callMatch && foundRaise) {
            callers.push(callMatch[1]);
        }
    }
    return callers;
}

// Legacy alias
function getVillainFromPath(actionPath) {
    return getOpenerFromPath(actionPath);
}

// Check if hero was the opener (raiser) in a 3-bet pot
// Returns true if hero opened and got 3-bet, false if hero called and got 3-bet
function isHeroOpenerIn3Bet(spot) {
    if (!spot || spot.scenario !== 'vs3Bet') return false;
    const opener = getOpenerFromPath(spot.actionPath);
    return opener === spot.position;
}

// Get effective scenario (splits vs3Bet into Raiser/Caller)
function getEffectiveScenario(spot) {
    if (!spot) return null;
    if (spot.scenario === 'vs3Bet') {
        return isHeroOpenerIn3Bet(spot) ? 'vs3BetAsRaiser' : 'vs3BetAsCaller';
    }
    return spot.scenario;
}
