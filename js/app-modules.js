/**
 * PLO Range Quiz - Module Management
 */

/**
 * Find the parent spot for follow-up scenarios (vs3Bet, vs4Bet, etc.)
 * Returns the spot where hero made their previous decision
 * @param {Object} spot - Current spot
 * @returns {Object|null} Parent spot or null if RFI/no parent
 */
function findParentSpot(spot) {
    if (!spot || !spot.actionPath || spot.scenario === 'RFI') return null;

    const heroPos = spot.position;
    const parts = spot.actionPath.split('-');

    // Find hero's first action in the action path
    let heroFirstActionIdx = -1;
    for (let i = 0; i < parts.length; i++) {
        if (parts[i].startsWith(heroPos)) {
            heroFirstActionIdx = i;
            break;
        }
    }

    if (heroFirstActionIdx === -1) return null;

    // Get the action path before hero's first action
    const parentActionPath = parts.slice(0, heroFirstActionIdx).join('-');

    // Find the parent spot: same hero position, with parent action path
    const parentSpot = allSpotsUnfiltered.find(s =>
        s.position === heroPos &&
        s.actionPath === parentActionPath
    );

    return parentSpot || null;
}

/**
 * Get hero's action type from the action path
 * @param {Object} spot - Spot object
 * @returns {string} 'raise', 'call', or null
 */
function getHeroActionType(spot) {
    if (!spot || !spot.actionPath) return null;
    const heroPos = spot.position;
    const parts = spot.actionPath.split('-');

    for (const part of parts) {
        if (part.startsWith(heroPos)) {
            if (part.includes('100%') || part.includes('AI')) return 'raise';
            if (part.endsWith('C')) return 'call';
            return null;
        }
    }
    return null;
}

async function addQuizModule(filename, isPrimary = false) {
    // Single-mode guard: only allow 1 module
    if (!isPrimary && typeof canAddSecondaryModule === 'function' && !canAddSecondaryModule()) {
        return null;
    }
    const spot = allSpots.find(s => s.filename === filename) ||
                 (allSpotsUnfiltered && allSpotsUnfiltered.find(s => s.filename === filename));
    const moduleId = nextModuleId++;

    const fullPath = humanizeActionPath(spot.actionPath, 99); // Full path for tooltip
    // Find parent spot for filtering hands
    const parentSpot = findParentSpot(spot);
    const heroActionType = getHeroActionType(spot);

    const module = {
        id: moduleId, spotFile: filename, spotInfo: spot,
        title: `${spot.position}: ${humanizeActionPath(spot.actionPath)}`,
        fullTitle: `${spot.position}: ${fullPath}`,
        rangeData: [], hasCallAction: false,
        parentSpot: parentSpot,
        parentRangeData: null,
        heroActionType: heroActionType,
        evFilterMin: null, // EV filter: min BB (null = no filter)
        evFilterMax: null, // EV filter: max BB (null = no filter)
        stats: { correct: 0, wrong: 0 }, answered: false, isPrimary: isPrimary
    };

    quizModules.push(module);

    const container = document.getElementById('quizModulesContainer');
    const addBtn = container.querySelector('.add-module-btn');

    const moduleDiv = document.createElement('div');
    moduleDiv.className = `quiz-module${isPrimary ? ' primary' : ''}`;
    moduleDiv.id = `quizModule${moduleId}`;
    const heroColor = POSITION_COLORS[spot.position] || '#fff';
    const coloredTitle = `${humanizeActionPathColored(spot.actionPath, 99)} → <span style="color:${heroColor};font-weight:700">${spot.position}?</span>`;
    moduleDiv.innerHTML = `
        <div class="quiz-module-header">
            <div class="quiz-module-title" onclick="openRangeSelectorForModule(${moduleId})" title="${module.fullTitle} → ${spot.position}?">
                <span id="moduleTitle${moduleId}">${coloredTitle}</span>
                <span class="edit-icon">✎</span>
            </div>
            ${!isPrimary ? `<button class="quiz-module-close" onclick="removeQuizModule(${moduleId})">×</button>` : ''}
        </div>
        <div class="quiz-module-body">
            <div class="module-loading" id="moduleLoading${moduleId}">Loading range...</div>
            <div id="moduleContent${moduleId}" style="display:none;">
                <div class="mini-table" id="miniTable${moduleId}"><div class="mini-table-inner"></div></div>
                <div class="hand-stats-row">
                    <div class="module-hand" id="moduleHand${moduleId}"></div>
                    <div class="quiz-module-stats">
                        <div class="module-stat"><span class="module-stat-value correct" id="moduleCorrect${moduleId}">0</span><span style="color:#888;">✓</span></div>
                        <div class="module-stat"><span class="module-stat-value wrong" id="moduleWrong${moduleId}">0</span><span style="color:#888;">✗</span></div>
                        <div class="module-stat"><span class="module-stat-value accuracy" id="moduleAccuracy${moduleId}">0%</span></div>
                    </div>
                </div>
                <div class="range-info-row" id="rangeInfo${moduleId}">
                    <span class="range-info-item" title="Hand ranking in range (by EV)">Rank: <strong id="handRank${moduleId}">-</strong></span>
                </div>
                <div class="quiz-module-actions" id="moduleActions${moduleId}">
                    <button class="module-action-btn fold" onclick="submitModuleAnswer(${moduleId}, 'fold')">Fold</button>
                    <button class="module-action-btn call" id="moduleCallBtn${moduleId}" style="display:none;" onclick="submitModuleAnswer(${moduleId}, 'call')">Call</button>
                    <button class="module-action-btn raise" onclick="submitModuleAnswer(${moduleId}, 'raise')">Raise</button>
                </div>
                <div class="ev-filter-row" id="evFilter${moduleId}">
                    <span class="ev-filter-label">EV:</span>
                    <div class="ev-input-group">
                        <button class="ev-step-btn" onclick="stepEvValue(${moduleId}, 'min', -0.1)">−</button>
                        <input type="text" class="ev-filter-input" id="evMin${moduleId}" placeholder="min" inputmode="decimal" oninput="updateEvFilter(${moduleId})">
                        <button class="ev-step-btn" onclick="stepEvValue(${moduleId}, 'min', 0.1)">+</button>
                    </div>
                    <span class="ev-filter-sep">–</span>
                    <div class="ev-input-group">
                        <button class="ev-step-btn" onclick="stepEvValue(${moduleId}, 'max', -0.1)">−</button>
                        <input type="text" class="ev-filter-input" id="evMax${moduleId}" placeholder="max" inputmode="decimal" oninput="updateEvFilter(${moduleId})">
                        <button class="ev-step-btn" onclick="stepEvValue(${moduleId}, 'max', 0.1)">+</button>
                    </div>
                    <span class="ev-filter-unit">BB</span>
                    <button class="ev-filter-clear" onclick="clearEvFilter(${moduleId})" title="Clear filter">✕</button>
                    <button class="module-next-btn" onclick="nextQuestion()" title="Next hand">→</button>
                </div>
                <div class="quiz-module-result" id="moduleResult${moduleId}"></div>
                <div class="quiz-module-heatmap" id="moduleHeatmap${moduleId}">
                    <table class="heatmap-table" id="moduleHeatmapTable${moduleId}"></table>
                    <div class="hands-grid" id="moduleHandsGrid${moduleId}"></div>
                </div>
            </div>
        </div>`;

    container.insertBefore(moduleDiv, addBtn);

    try {
        const data = await loadBinaryRange(filename);
        module.rangeData = data.hands;
        module.hasCallAction = data.nActions === 3;

        // Load parent range if exists (for filtering hands in follow-up spots)
        if (parentSpot) {
            try {
                const parentData = await loadBinaryRange(parentSpot.filename);
                module.parentRangeData = parentData.hands;
            } catch (e) {
                module.parentRangeData = null;
            }
        }

        document.getElementById(`moduleCallBtn${moduleId}`).style.display = module.hasCallAction ? 'inline-block' : 'none';
        document.getElementById(`moduleLoading${moduleId}`).style.display = 'none';
        document.getElementById(`moduleContent${moduleId}`).style.display = 'block';
        renderMiniTable(moduleId);
    } catch (error) {
        document.getElementById(`moduleLoading${moduleId}`).textContent = 'Error loading range';
    }

    return module;
}

function removeQuizModule(moduleId) {
    const idx = quizModules.findIndex(m => m.id === moduleId);
    if (idx !== -1) quizModules.splice(idx, 1);
    const moduleDiv = document.getElementById(`quizModule${moduleId}`);
    if (moduleDiv) moduleDiv.remove();
    updateGlobalStats();
}

async function changeModuleRange(moduleId, filename) {
    const module = quizModules.find(m => m.id === moduleId);
    if (!module) return;

    const spot = allSpots.find(s => s.filename === filename);
    const fullPath = humanizeActionPath(spot.actionPath, 99);
    const parentSpot = findParentSpot(spot);
    const heroActionType = getHeroActionType(spot);

    module.spotFile = filename;
    module.spotInfo = spot;
    module.title = `${spot.position}: ${humanizeActionPath(spot.actionPath)}`;
    module.fullTitle = `${spot.position}: ${fullPath}`;
    module.parentSpot = parentSpot;
    module.parentRangeData = null;
    module.heroActionType = heroActionType;
    module.stats = { correct: 0, wrong: 0 };

    const heroColor2 = POSITION_COLORS[spot.position] || '#fff';
    const coloredTitle = `${humanizeActionPathColored(spot.actionPath, 99)} → <span style="color:${heroColor2};font-weight:700">${spot.position}?</span>`;
    document.getElementById(`moduleTitle${moduleId}`).innerHTML = coloredTitle;
    document.getElementById(`moduleTitle${moduleId}`).parentElement.title = `${module.fullTitle} → ${spot.position}?`;
    document.getElementById(`moduleLoading${moduleId}`).style.display = 'block';
    document.getElementById(`moduleContent${moduleId}`).style.display = 'none';

    try {
        const data = await loadBinaryRange(filename);
        module.rangeData = data.hands;
        module.hasCallAction = data.nActions === 3;

        // Load parent range if exists
        if (parentSpot) {
            try {
                const parentData = await loadBinaryRange(parentSpot.filename);
                module.parentRangeData = parentData.hands;
            } catch (e) {
                module.parentRangeData = null;
            }
        }

        document.getElementById(`moduleCallBtn${moduleId}`).style.display = module.hasCallAction ? 'inline-block' : 'none';
        document.getElementById(`moduleLoading${moduleId}`).style.display = 'none';
        document.getElementById(`moduleContent${moduleId}`).style.display = 'block';
        renderMiniTable(moduleId);
        updateModuleStats(moduleId);
        showQuestion();
    } catch (error) {
        document.getElementById(`moduleLoading${moduleId}`).textContent = 'Error loading range';
    }
}

/**
 * Update EV filter for a module
 * @param {number} moduleId - Module ID
 */
function updateEvFilter(moduleId) {
    const module = quizModules.find(m => m.id === moduleId);
    if (!module) return;

    const minInput = document.getElementById(`evMin${moduleId}`);
    const maxInput = document.getElementById(`evMax${moduleId}`);

    const minVal = minInput?.value ? parseFloat(minInput.value) : null;
    const maxVal = maxInput?.value ? parseFloat(maxInput.value) : null;

    module.evFilterMin = minVal;
    module.evFilterMax = maxVal;

    // Rebuild hand indices with new filter
    rebuildHandIndices();
    currentQuestionIndex = 0;
    module.stats = { correct: 0, wrong: 0 };
    updateModuleStats(moduleId);
    showQuestion();
}

/**
 * Clear EV filter for a module
 * @param {number} moduleId - Module ID
 */
function clearEvFilter(moduleId) {
    const module = quizModules.find(m => m.id === moduleId);
    if (!module) return;

    const minInput = document.getElementById(`evMin${moduleId}`);
    const maxInput = document.getElementById(`evMax${moduleId}`);

    if (minInput) minInput.value = '';
    if (maxInput) maxInput.value = '';

    module.evFilterMin = null;
    module.evFilterMax = null;

    rebuildHandIndices();
    currentQuestionIndex = 0;
    module.stats = { correct: 0, wrong: 0 };
    updateModuleStats(moduleId);
    showQuestion();
}

/**
 * Step EV filter value up or down
 * @param {number} moduleId - Module ID
 * @param {string} which - 'min' or 'max'
 * @param {number} delta - Amount to add (e.g., 0.1 or -0.1)
 */
function stepEvValue(moduleId, which, delta) {
    const input = document.getElementById(`ev${which.charAt(0).toUpperCase() + which.slice(1)}${moduleId}`);
    if (!input) return;
    
    const currentVal = parseFloat(input.value) || 0;
    const newVal = Math.round((currentVal + delta) * 10) / 10; // Avoid floating point issues
    input.value = newVal;
    updateEvFilter(moduleId);
}

/**
 * Get best non-fold EV for a hand in BB
 * Fold EV is static, so we look at call/raise EV for filtering
 * @param {Object} hand - Hand data
 * @returns {number} Best non-fold EV in BB
 */
function getBestEvBB(hand) {
    const evs = [];
    // Exclude fold EV - it's static and not interesting for filtering
    if (hand.ev_call !== undefined) evs.push(hand.ev_call);
    if (hand.ev_raise !== undefined) evs.push(hand.ev_raise);
    if (evs.length === 0) return 0;
    return Math.max(...evs) / 2000; // Convert to BB
}

/**
 * Reset range info display (before answer)
 * @param {number} moduleId - Module ID
 */
function resetRangeInfo(moduleId) {
    const rankEl = document.getElementById(`handRank${moduleId}`);
    const sizeEl = document.getElementById(`rangeSize${moduleId}`);
    if (rankEl) rankEl.textContent = '-';
    if (sizeEl) sizeEl.textContent = '-';
}

/**
 * Update range info display after answer (hand ranking & range size for specific action)
 * @param {number} moduleId - Module ID
 * @param {number} handIndex - Current hand index in rangeData
 * @param {string} bestAction - The GTO best action (fold/call/raise)
 */
function updateRangeInfo(moduleId, handIndex, bestAction) {
    const module = quizModules.find(m => m.id === moduleId);
    if (!module || !module.rangeData.length) return;
    
    const rankEl = document.getElementById(`handRank${moduleId}`);
    const sizeEl = document.getElementById(`rangeSize${moduleId}`);
    if (!rankEl || !sizeEl) return;
    
    const currentHand = module.rangeData[handIndex];
    if (!currentHand || !bestAction) {
        rankEl.textContent = '-';
        sizeEl.textContent = '-';
        return;
    }
    
    // Get EV key for the best action
    const evKey = `ev_${bestAction}`;
    const currentEV = currentHand[evKey] !== undefined ? currentHand[evKey] : 0;
    
    // Find all hands that take this action (frequency > 2%)
    const actionHands = [];
    for (const idx of currentHandIndices) {
        const h = module.rangeData[idx];
        if (h && (h[bestAction] || 0) >= 0.02) {
            actionHands.push({
                idx,
                ev: h[evKey] !== undefined ? h[evKey] : 0
            });
        }
    }
    
    // Calculate range size for this action (% of filtered range)
    const actionRangeSize = ((actionHands.length / currentHandIndices.length) * 100).toFixed(1);
    sizeEl.textContent = `${actionRangeSize}%`;
    
    // Count how many hands in action range have higher EV
    let betterCount = 0;
    for (const ah of actionHands) {
        if (ah.ev > currentEV) betterCount++;
    }
    
    // Ranking as percentile within action range (0% = best, 100% = worst)
    const rankPct = actionHands.length > 1 ? ((betterCount / (actionHands.length - 1)) * 100).toFixed(1) : 0;
    rankEl.textContent = `Top ${rankPct}%`;
}
