/**
 * PLO Range Quiz - Unified Selection System
 * Shared logic for both main selection and range selector modal
 * Flow: Scenario → (Subcategory) → Hero → Opener → Spots
 */

// Selection state factory - creates independent state for each selector instance
function createSelectionState() {
    return {
        scenario: null,
        subcategory: null,
        position: null,
        opener: null,
        callers: null,
        step: 1
    };
}

// Main selection state
let mainSelectionState = createSelectionState();

// Range selector state
let rangeSelectorState = createSelectionState();

// ============================================
// SHARED HELPER FUNCTIONS
// ============================================

// Get position color
function getPosColor(pos) {
    return POSITION_COLORS[pos] || '#fff';
}

// Create colored position span
function coloredPos(pos) {
    return `<span style="color:${getPosColor(pos)}">${pos}</span>`;
}

// Check if hero is IP vs 3-bettor (postflop position)
// Postflop order: SB acts first (OOP), BTN acts last (IP)
function isHeroIPvs3Bet(spot) {
    if (!spot.actionPath) return false;

    // Postflop position order: SB=0 (most OOP) to BTN=5 (most IP)
    const postflopOrder = ['SB', 'BB', 'UTG', 'MP', 'CO', 'BTN'];
    const heroIdx = postflopOrder.indexOf(spot.position);

    const parts = spot.actionPath.split('-');
    let raiseCount = 0;
    let threeBettor = null;

    for (const part of parts) {
        const match = part.match(/^(UTG|MP|CO|BTN|SB|BB)(100%|AI)$/);
        if (match) {
            raiseCount++;
            if (raiseCount === 2) {
                threeBettor = match[1];
                break;
            }
        }
    }

    if (!threeBettor) return false;
    const threeBettorIdx = postflopOrder.indexOf(threeBettor);

    // Hero is IP if they act AFTER villain postflop (higher index)
    return heroIdx > threeBettorIdx;
}

// Filter spots by scenario and subcategory
function filterSpotsBySelection(spots, state) {
    if (!state.scenario) return spots;

    let filtered = spots.filter(s => getEffectiveScenario(s) === state.scenario);

    if (state.subcategory) {
        if (state.subcategory === 'callers:1') {
            filtered = filtered.filter(s => (s.callerCount || 1) === 1);
        } else if (state.subcategory === 'callers:2') {
            filtered = filtered.filter(s => (s.callerCount || 1) === 2);
        } else if (state.subcategory === 'callers:3+') {
            filtered = filtered.filter(s => (s.callerCount || 1) >= 3);
        } else if (state.subcategory === 'position:ip') {
            filtered = filtered.filter(s => isHeroIPvs3Bet(s));
        } else if (state.subcategory === 'position:oop') {
            filtered = filtered.filter(s => !isHeroIPvs3Bet(s));
        }
    }

    return filtered;
}

// Get available villains/openers for current selection
function getAvailableOpeners(state) {
    let spots = filterSpotsBySelection(allSpots, state);
    if (state.position) {
        spots = spots.filter(s => s.position === state.position);
    }

    const openers = {};
    spots.forEach(spot => {
        const opener = getOpenerFromPath(spot.actionPath);
        if (opener) {
            if (!openers[opener]) openers[opener] = { hu: 0, multi: 0, total: 0 };
            openers[opener].total++;
            if ((spot.callerCount || 0) === 0) openers[opener].hu++;
            else openers[opener].multi++;
        }
    });

    const posOrder = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'];
    return Object.entries(openers)
        .sort((a, b) => posOrder.indexOf(a[0]) - posOrder.indexOf(b[0]))
        .map(([pos, counts]) => ({ pos, ...counts }));
}

// Get final filtered spots
function getFinalSpots(state) {
    let spots = filterSpotsBySelection(allSpots, state);

    if (state.position) {
        spots = spots.filter(s => s.position === state.position);
    }

    if (state.opener) {
        spots = spots.filter(s => getOpenerFromPath(s.actionPath) === state.opener);
    }

    if (state.callers === 'hu') {
        spots = spots.filter(s => (s.callerCount || 0) === 0);
    } else if (state.callers && state.callers.startsWith('count:')) {
        const targetCount = parseInt(state.callers.substring(6));
        spots = spots.filter(s => (s.callerCount || 0) === targetCount);
    }

    // Sort: HU first, then by caller count, then by action depth
    spots.sort((a, b) => {
        const aCallers = a.callerCount || 0;
        const bCallers = b.callerCount || 0;
        if (aCallers !== bCallers) return aCallers - bCallers;
        return (a.actionDepth || 0) - (b.actionDepth || 0);
    });

    return spots;
}

// ============================================
// SHARED RENDERING FUNCTIONS
// ============================================

// Render scenario grid
function renderScenarioSelection(container, state, callbacks) {
    let html = '';

    // Count spots per scenario
    SCENARIOS.forEach(sc => {
        const count = allSpots.filter(s => getEffectiveScenario(s) === sc.key).length;
        if (count === 0) return;
        const hasFolder = sc.hasSubcategories ? ' ▶' : '';
        html += `<button class="${callbacks.btnClass}" onclick="${callbacks.onScenario}('${sc.key}')">
            ${sc.name}${hasFolder}
            <span class="count">${count}</span>
        </button>`;
    });

    container.innerHTML = html;
}

// Render caller count subcategories (for vs Open MW)
function renderCallerSubcategories(container, state, callbacks) {
    const spots = allSpots.filter(s => getEffectiveScenario(s) === 'vsRFIMulti');

    const groups = { 1: [], 2: [], '3+': [] };
    spots.forEach(spot => {
        const count = spot.callerCount || 1;
        if (count === 1) groups[1].push(spot);
        else if (count === 2) groups[2].push(spot);
        else groups['3+'].push(spot);
    });

    let html = callbacks.backButton ?
        `<button class="${callbacks.backBtnClass}" onclick="${callbacks.onBack}(1)">← Back</button>` : '';
    html += `<div style="margin: 15px 0 10px 0; color: #888; font-size: 13px;">vs Open MW - Caller Count</div>`;

    html += `<button class="${callbacks.btnClass}" onclick="${callbacks.onSubcategory}(null)">
        All<span class="count">${spots.length}</span>
    </button>`;

    if (groups[1].length > 0) {
        html += `<button class="${callbacks.btnClass}" onclick="${callbacks.onSubcategory}('callers:1')">
            vs Open +1<span class="count">${groups[1].length}</span>
        </button>`;
    }
    if (groups[2].length > 0) {
        html += `<button class="${callbacks.btnClass}" onclick="${callbacks.onSubcategory}('callers:2')">
            vs Open +2<span class="count">${groups[2].length}</span>
        </button>`;
    }
    if (groups['3+'].length > 0) {
        html += `<button class="${callbacks.btnClass}" onclick="${callbacks.onSubcategory}('callers:3+')">
            vs Open +3+<span class="count">${groups['3+'].length}</span>
        </button>`;
    }

    container.innerHTML = html;
}

// Render IP/OOP subcategories (for vs 3Bet)
function render3BetSubcategories(container, state, callbacks) {
    const spots = allSpots.filter(s => getEffectiveScenario(s) === 'vs3BetAsRaiser');

    const ipSpots = spots.filter(s => isHeroIPvs3Bet(s));
    const oopSpots = spots.filter(s => !isHeroIPvs3Bet(s));

    let html = callbacks.backButton ?
        `<button class="${callbacks.backBtnClass}" onclick="${callbacks.onBack}(1)">← Back</button>` : '';
    html += `<div style="margin: 15px 0 10px 0; color: #888; font-size: 13px;">vs 3Bet - Position</div>`;

    html += `<button class="${callbacks.btnClass}" onclick="${callbacks.onSubcategory}(null)">
        All<span class="count">${spots.length}</span>
    </button>`;

    if (ipSpots.length > 0) {
        html += `<button class="${callbacks.btnClass}" onclick="${callbacks.onSubcategory}('position:ip')">
            IP<span class="count">${ipSpots.length}</span>
        </button>`;
    }
    if (oopSpots.length > 0) {
        html += `<button class="${callbacks.btnClass}" onclick="${callbacks.onSubcategory}('position:oop')">
            OOP<span class="count">${oopSpots.length}</span>
        </button>`;
    }

    container.innerHTML = html;
}

// Render position selection grid
function renderPositionSelection(container, state, callbacks) {
    const scenarioSpots = filterSpotsBySelection(allSpots, state);

    // Position order depends on scenario
    const posOrder = state.scenario === 'RFI'
        ? ['UTG', 'MP', 'CO', 'BTN', 'SB']
        : ['BB', 'SB', 'BTN', 'CO', 'MP', 'UTG'];

    let html = callbacks.backButton ?
        `<button class="${callbacks.backBtnClass}" onclick="${callbacks.onBack}">← Back</button>` : '';
    html += `<div style="margin: 15px 0 10px 0; color: #888; font-size: 13px;">Select Position</div>`;

    posOrder.forEach(pos => {
        const count = scenarioSpots.filter(s => s.position === pos).length;
        if (count === 0) return;
        html += `<button class="${callbacks.btnClass}" onclick="${callbacks.onPosition}('${pos}')">
            ${coloredPos(pos)}
            <span class="count">${count}</span>
        </button>`;
    });

    container.innerHTML = html;
}

// Render opener/villain selection grid
function renderOpenerSelection(container, state, callbacks) {
    const openers = getAvailableOpeners(state);

    if (openers.length === 0) {
        // No opener distinction - skip to next step
        callbacks.onSkip();
        return;
    }

    let html = callbacks.backButton ?
        `<button class="${callbacks.backBtnClass}" onclick="${callbacks.onBack}">← Back</button>` : '';
    html += `<div style="margin: 15px 0 10px 0; color: #888; font-size: 13px;">vs Opener</div>`;

    // "All" option if multiple openers
    if (openers.length > 1) {
        const totalCount = openers.reduce((sum, o) => sum + o.total, 0);
        html += `<button class="${callbacks.btnClass}" onclick="${callbacks.onOpener}(null)">
            All<span class="count">${totalCount}</span>
        </button>`;
    }

    openers.forEach(({ pos, total }) => {
        html += `<button class="${callbacks.btnClass}" onclick="${callbacks.onOpener}('${pos}')">
            vs ${coloredPos(pos)}
            <span class="count">${total}</span>
        </button>`;
    });

    container.innerHTML = html;
}

// Render caller count selection (HU vs multiway)
function renderCallerCountSelection(container, state, callbacks) {
    let filteredSpots = filterSpotsBySelection(allSpots, state);

    if (state.position) {
        filteredSpots = filteredSpots.filter(s => s.position === state.position);
    }
    if (state.opener) {
        filteredSpots = filteredSpots.filter(s => getOpenerFromPath(s.actionPath) === state.opener);
    }

    const huSpots = filteredSpots.filter(s => (s.callerCount || 0) === 0);
    const callerSpots = filteredSpots.filter(s => (s.callerCount || 0) > 0);

    // Group by caller count
    const callerCountGroups = {};
    callerSpots.forEach(spot => {
        const count = spot.callerCount || 0;
        if (!callerCountGroups[count]) callerCountGroups[count] = [];
        callerCountGroups[count].push(spot);
    });

    const sortedCounts = Object.keys(callerCountGroups).map(Number).sort((a, b) => a - b);

    // If only HU spots exist, skip to spots
    if (callerSpots.length === 0) {
        callbacks.onSkip('hu');
        return;
    }

    // If only one option, skip
    if (huSpots.length === 0 && sortedCounts.length === 1) {
        callbacks.onSkip(`count:${sortedCounts[0]}`);
        return;
    }

    let html = callbacks.backButton ?
        `<button class="${callbacks.backBtnClass}" onclick="${callbacks.onBack}">← Back</button>` : '';
    html += `<div style="margin: 15px 0 10px 0; color: #888; font-size: 13px;">Caller Count</div>`;

    // "All" option if multiple choices
    if ((huSpots.length > 0 && callerSpots.length > 0) || sortedCounts.length > 1) {
        html += `<button class="${callbacks.btnClass}" onclick="${callbacks.onCallers}(null)">
            All<span class="count">${filteredSpots.length}</span>
        </button>`;
    }

    if (huSpots.length > 0) {
        html += `<button class="${callbacks.btnClass}" onclick="${callbacks.onCallers}('hu')">
            Heads-Up<span class="count">${huSpots.length}</span>
        </button>`;
    }

    sortedCounts.forEach(count => {
        const label = count === 1 ? '1c' : `${count}c`;
        html += `<button class="${callbacks.btnClass}" onclick="${callbacks.onCallers}('count:${count}')">
            ${label}<span class="count">${callerCountGroups[count].length}</span>
        </button>`;
    });

    container.innerHTML = html;
}

// Render final spot list
function renderSpotList(container, state, callbacks) {
    const spots = getFinalSpots(state);

    let html = callbacks.backButton ?
        `<button class="${callbacks.backBtnClass}" onclick="${callbacks.onBack}">← Back</button>` : '';

    if (spots.length === 0) {
        html += '<div style="color:#888; padding:10px;">No spots found for this selection.</div>';
        container.innerHTML = html;
        return;
    }

    // Auto-select if only one spot
    if (spots.length === 1 && callbacks.autoSelect) {
        callbacks.onSpot(spots[0].filename);
        return;
    }

    html += `<div class="${callbacks.listClass || 'spot-list'}">`;
    spots.forEach(spot => {
        const humanNameColored = humanizeActionPathColored(spot.actionPath);
        const fullPath = humanizeActionPath(spot.actionPath, 99);
        const heroPos = spot.position;
        const heroColor = POSITION_COLORS[heroPos] || '#fff';
        const heroSuffix = ` → <span style="color:${heroColor};font-weight:700">${heroPos}?</span>`;
        const callerCount = spot.callerCount || 0;
        const callerInfo = callerCount > 0
            ? ` <span style="color:#888">(${callerCount}c)</span>`
            : '';
        html += `<div class="${callbacks.itemClass}" onclick="${callbacks.onSpot}('${spot.filename}')" title="${fullPath} → ${heroPos}?">
            ${humanNameColored}${heroSuffix}${callerInfo}
        </div>`;
    });
    html += '</div>';

    container.innerHTML = html;
}
