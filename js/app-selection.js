/**
 * PLO Range Quiz - Main Selection Flow
 * Uses shared selection-core.js
 * Flow: Scenario → (Subcategory) → Hero → Opener → Callers → Spots
 */

// Step 1: Render Scenario Grid
function renderScenarioGrid() {
    const grid = document.getElementById('scenarioGrid');
    mainSelectionState.step = 1;

    // Count spots per scenario
    const scenarioCounts = {};
    SCENARIOS.forEach(sc => {
        scenarioCounts[sc.key] = allSpots.filter(s => getEffectiveScenario(s) === sc.key).length;
    });

    grid.innerHTML = SCENARIOS.map(sc => {
        const count = scenarioCounts[sc.key];
        if (count === 0) return '';
        
        // Get stats for this scenario
        const stats = typeof getStatsForScenario === 'function' ? getStatsForScenario(sc.key) : null;
        const hasStats = stats && stats.total > 0;
        
        // Color based on accuracy: red < 50%, yellow 50-75%, green > 75%
        const barColor = !hasStats ? '#333' : 
            stats.accuracy < 50 ? '#ef4444' : 
            stats.accuracy < 75 ? '#fbbf24' : '#22c55e';
        
        const statsBar = hasStats ? `
            <div class="scenario-stats">
                <div class="stats-bar">
                    <div class="stats-bar-fill" style="width: ${stats.accuracy}%; background: ${barColor}"></div>
                </div>
                <span class="stats-text">${stats.accuracy}% (${stats.total})</span>
            </div>
        ` : `<div class="scenario-stats"><span class="stats-text stats-empty">Noch keine Daten</span></div>`;
        
        return `<button class="selector-btn scenario-card" onclick="selectScenario('${sc.key}')">
            <div class="scenario-name">${sc.name}</div>
            <div class="scenario-desc">${sc.desc || ''}</div>
            ${statsBar}
        </button>`;
    }).join('');
}

function selectScenario(scenario) {
    mainSelectionState.scenario = scenario;
    mainSelectionState.subcategory = null;
    selectedScenario = scenario; // Legacy compatibility

    const scenarioConfig = SCENARIOS.find(s => s.key === scenario);

    if (scenario === 'RFI') {
        goToStep(2);
        renderHeroGridForRFI();
    } else if (scenario === 'vsRFIMulti' && scenarioConfig?.hasSubcategories) {
        goToStep(2);
        renderCallerCountSubcategories();
    } else if (scenario === 'vs3BetAsRaiser') {
        // RFI + vs 3Bet: Hero raised → 3Bettor → Spots
        goToStep(2);
        renderHeroGridFor3Bet();
    } else if (scenario === 'vs3BetAsCaller') {
        // C + vs 3Bet: Hero called → Raiser → 3Bettor → Spots
        goToStep(2);
        renderHeroGridForSqueeze();
    } else {
        goToStep(2);
        renderHeroGrid();
    }
}

// Subcategory: Caller count for vs Open MW
function renderCallerCountSubcategories() {
    const grid = document.getElementById('heroGrid');
    const spots = allSpots.filter(s => getEffectiveScenario(s) === 'vsRFIMulti');

    const groups = { 1: [], 2: [], '3+': [] };
    spots.forEach(spot => {
        const count = spot.callerCount || 1;
        if (count === 1) groups[1].push(spot);
        else if (count === 2) groups[2].push(spot);
        else groups['3+'].push(spot);
    });

    let html = `<button class="back-btn" onclick="goToStep(1); renderScenarioGrid();">← Back</button>
                <div style="margin: 15px 0 10px 0; color: #888; font-size: 13px;">vs Open MW - Caller Count</div>`;

    html += `<button class="selector-btn" onclick="selectCallerCountSubcategory(null)">
        All<span class="count">${spots.length}</span>
    </button>`;

    if (groups[1].length > 0) {
        html += `<button class="selector-btn" onclick="selectCallerCountSubcategory('1')">
            vs Open +1<span class="count">${groups[1].length}</span>
        </button>`;
    }
    if (groups[2].length > 0) {
        html += `<button class="selector-btn" onclick="selectCallerCountSubcategory('2')">
            vs Open +2<span class="count">${groups[2].length}</span>
        </button>`;
    }
    if (groups['3+'].length > 0) {
        html += `<button class="selector-btn" onclick="selectCallerCountSubcategory('3+')">
            vs Open +3+<span class="count">${groups['3+'].length}</span>
        </button>`;
    }

    grid.innerHTML = html;
}

function selectCallerCountSubcategory(countStr) {
    mainSelectionState.subcategory = countStr !== null ? `callers:${countStr}` : null;
    selectedSubcategory = mainSelectionState.subcategory; // Legacy
    renderHeroGrid();
}

// vs 3Bet Flow: Hero Position → 3Bettor Position → Spots
// Hero is the original raiser who faces a 3bet
function renderHeroGridFor3Bet() {
    const grid = document.getElementById('heroGrid');
    const posOrder = ['UTG', 'MP', 'CO', 'BTN', 'SB']; // Positions that can open-raise

    // Get vs3Bet spots where Hero is the original raiser
    const vs3BetSpots = allSpots.filter(s => getEffectiveScenario(s) === 'vs3BetAsRaiser');

    const heroCounts = {};
    posOrder.forEach(pos => {
        heroCounts[pos] = vs3BetSpots.filter(s => s.position === pos).length;
    });

    let html = `<button class="back-btn" onclick="goToStep(1); renderScenarioGrid();">← Back</button>
                <div style="margin: 15px 0 10px 0; color: #888; font-size: 13px;">Your Position</div>`;

    html += posOrder.map(pos => {
        const count = heroCounts[pos];
        if (count === 0) return '';
        return `<button class="selector-btn" onclick="selectHeroFor3Bet('${pos}')">
            ${coloredPos(pos)}<span class="count">${count}</span>
        </button>`;
    }).join('');

    grid.innerHTML = html;
}

function selectHeroFor3Bet(pos) {
    mainSelectionState.position = pos;
    selectedPosition = pos;
    goToStep(3);
    render3BettorGrid();
}

function render3BettorGrid() {
    const grid = document.getElementById('openerGrid');
    const posOrder = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'];
    const heroPos = mainSelectionState.position;

    // Get vs3Bet spots where Hero is the raiser
    const heroSpots = allSpots.filter(s => getEffectiveScenario(s) === 'vs3BetAsRaiser' && s.position === heroPos);

    // Group by 3bettor
    const threeBettorCounts = {};
    posOrder.forEach(pos => {
        threeBettorCounts[pos] = heroSpots.filter(s => get3BettorFromPath(s.actionPath) === pos).length;
    });

    let html = `<button class="back-btn" onclick="goToStep(2); renderHeroGridFor3Bet();">← Back</button>
                <div style="margin: 15px 0 10px 0; color: #888; font-size: 13px;">3-Bettor Position</div>`;

    html += posOrder.map(pos => {
        const count = threeBettorCounts[pos];
        if (count === 0) return '';
        return `<button class="selector-btn" onclick="select3Bettor('${pos}')">
            ${coloredPos(pos)}<span class="count">${count}</span>
        </button>`;
    }).join('');

    grid.innerHTML = html;
}

function select3Bettor(threeBettorPos) {
    mainSelectionState.threeBettor = threeBettorPos;
    // Skip caller selection - go directly to spot list
    goToStep(4);
    renderSpotListFor3Bet();
}

function renderSpotListFor3Bet() {
    const heroPos = mainSelectionState.position;
    const threeBettorPos = mainSelectionState.threeBettor;

    // Get all spots matching hero (as raiser) and 3bettor
    const spots = allSpots.filter(s => 
        getEffectiveScenario(s) === 'vs3BetAsRaiser' && 
        s.position === heroPos && 
        get3BettorFromPath(s.actionPath) === threeBettorPos
    );

    if (spots.length === 1) {
        selectInitialSpot(spots[0].filename);
        return;
    }

    // Hide callerGrid, show spotList with back button
    const callerGrid = document.getElementById('callerGrid');
    const list = document.getElementById('spotList');
    if (callerGrid) callerGrid.innerHTML = `<button class="back-btn" onclick="goToStep(3); render3BettorGrid();">← Back</button>
        <div style="margin: 15px 0 10px 0; color: #888; font-size: 13px;">Select Spot (${spots.length})</div>`;

    if (spots.length === 0) {
        list.innerHTML = '<div style="color:#888; padding:10px;">No spots found.</div>';
        return;
    }

    list.innerHTML = spots.map(spot => {
        const humanNameColored = humanizeActionPathColored(spot.actionPath);
        const fullPath = humanizeActionPath(spot.actionPath, 99);
        const heroColor = POSITION_COLORS[heroPos] || '#fff';
        const heroSuffix = ` → <span style="color:${heroColor};font-weight:700">${heroPos}?</span>`;
        const callerCount = spot.callerCount || 0;
        const callerInfo = callerCount > 0
            ? ` <span style="color:#888">(${callerCount}c)</span>`
            : '';
        return `<div class="spot-item" onclick="selectInitialSpot('${spot.filename}')" title="${fullPath} → ${heroPos}?">
            ${humanNameColored}${heroSuffix}${callerInfo}
        </div>`;
    }).join('');
}

// Helper: Get 3-bettor from action path
function get3BettorFromPath(actionPath) {
    if (!actionPath) return null;
    const parts = actionPath.split('-');
    let raiseCount = 0;
    for (const part of parts) {
        const match = part.match(/^(UTG|MP|CO|BTN|SB|BB)(100%|AI)$/);
        if (match) {
            raiseCount++;
            if (raiseCount === 2) return match[1];
        }
    }
    return null;
}

// ============================================
// C + vs 3Bet (Squeeze Defense) Flow
// Hero called RFI → Raiser → 3Bettor → Spots
// ============================================

function renderHeroGridForSqueeze() {
    const grid = document.getElementById('heroGrid');
    const posOrder = ['BB', 'SB', 'BTN', 'CO', 'MP', 'UTG'];

    // Get squeeze spots where Hero is a caller
    const squeezeSpots = allSpots.filter(s => getEffectiveScenario(s) === 'vs3BetAsCaller');
    console.log('Squeeze spots found:', squeezeSpots.length);
    if (squeezeSpots.length === 0) {
        console.log('All vs3Bet spots:', allSpots.filter(s => s.scenario === 'vs3Bet').length);
    }

    const heroCounts = {};
    posOrder.forEach(pos => {
        heroCounts[pos] = squeezeSpots.filter(s => s.position === pos).length;
    });

    let html = `<button class="back-btn" onclick="goToStep(1); renderScenarioGrid();">← Back</button>
                <div style="margin: 15px 0 10px 0; color: #888; font-size: 13px;">Your Position (Caller)</div>`;

    html += posOrder.map(pos => {
        const count = heroCounts[pos];
        if (count === 0) return '';
        return `<button class="selector-btn" onclick="selectHeroForSqueeze('${pos}')">
            ${coloredPos(pos)}<span class="count">${count}</span>
        </button>`;
    }).join('');

    grid.innerHTML = html;
}

function selectHeroForSqueeze(pos) {
    mainSelectionState.position = pos;
    selectedPosition = pos;
    goToStep(3);
    renderRaiserGridForSqueeze();
}

function renderRaiserGridForSqueeze() {
    const grid = document.getElementById('openerGrid');
    const posOrder = ['UTG', 'MP', 'CO', 'BTN', 'SB'];
    const heroPos = mainSelectionState.position;

    // Get squeeze spots for this hero position
    const heroSpots = allSpots.filter(s => 
        getEffectiveScenario(s) === 'vs3BetAsCaller' && s.position === heroPos
    );

    // Group by raiser (opener)
    const raiserCounts = {};
    posOrder.forEach(pos => {
        raiserCounts[pos] = heroSpots.filter(s => getOpenerFromPath(s.actionPath) === pos).length;
    });

    let html = `<button class="back-btn" onclick="goToStep(2); renderHeroGridForSqueeze();">← Back</button>
                <div style="margin: 15px 0 10px 0; color: #888; font-size: 13px;">Original Raiser</div>`;

    html += posOrder.map(pos => {
        const count = raiserCounts[pos];
        if (count === 0) return '';
        return `<button class="selector-btn" onclick="selectRaiserForSqueeze('${pos}')">
            ${coloredPos(pos)}<span class="count">${count}</span>
        </button>`;
    }).join('');

    grid.innerHTML = html;
}

function selectRaiserForSqueeze(raiserPos) {
    mainSelectionState.opener = raiserPos;
    goToStep(4);
    render3BettorGridForSqueeze();
}

function render3BettorGridForSqueeze() {
    const grid = document.getElementById('callerGrid');
    const posOrder = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'];
    const heroPos = mainSelectionState.position;
    const raiserPos = mainSelectionState.opener;

    // Get squeeze spots matching hero and raiser
    const matchingSpots = allSpots.filter(s => 
        getEffectiveScenario(s) === 'vs3BetAsCaller' && 
        s.position === heroPos && 
        getOpenerFromPath(s.actionPath) === raiserPos
    );

    // Group by 3bettor (squeezer)
    const threeBettorCounts = {};
    posOrder.forEach(pos => {
        threeBettorCounts[pos] = matchingSpots.filter(s => get3BettorFromPath(s.actionPath) === pos).length;
    });

    let html = `<button class="back-btn" onclick="goToStep(3); renderRaiserGridForSqueeze();">← Back</button>
                <div style="margin: 15px 0 10px 0; color: #888; font-size: 13px;">Squeezer (3Bettor)</div>`;

    html += posOrder.map(pos => {
        const count = threeBettorCounts[pos];
        if (count === 0) return '';
        return `<button class="selector-btn" onclick="select3BettorForSqueeze('${pos}')">
            ${coloredPos(pos)}<span class="count">${count}</span>
        </button>`;
    }).join('');

    grid.innerHTML = html;
}

function select3BettorForSqueeze(threeBettorPos) {
    mainSelectionState.threeBettor = threeBettorPos;
    renderSpotListForSqueeze();
}

function renderSpotListForSqueeze() {
    const heroPos = mainSelectionState.position;
    const raiserPos = mainSelectionState.opener;
    const threeBettorPos = mainSelectionState.threeBettor;

    // Get all matching spots
    const spots = allSpots.filter(s => 
        getEffectiveScenario(s) === 'vs3BetAsCaller' && 
        s.position === heroPos && 
        getOpenerFromPath(s.actionPath) === raiserPos &&
        get3BettorFromPath(s.actionPath) === threeBettorPos
    );

    if (spots.length === 1) {
        selectInitialSpot(spots[0].filename);
        return;
    }

    const list = document.getElementById('spotList');
    const callerGrid = document.getElementById('callerGrid');
    
    if (callerGrid) callerGrid.innerHTML = `<button class="back-btn" onclick="render3BettorGridForSqueeze();">← Back</button>
        <div style="margin: 15px 0 10px 0; color: #888; font-size: 13px;">Select Spot (${spots.length})</div>`;

    if (spots.length === 0) {
        list.innerHTML = '<div style="color:#888; padding:10px;">No spots found.</div>';
        return;
    }

    list.innerHTML = spots.map(spot => {
        const humanNameColored = humanizeActionPathColored(spot.actionPath);
        const fullPath = humanizeActionPath(spot.actionPath, 99);
        const heroColor = POSITION_COLORS[heroPos] || '#fff';
        const heroSuffix = ` → <span style="color:${heroColor};font-weight:700">${heroPos}?</span>`;
        const callerCount = spot.callerCount || 0;
        const callerInfo = callerCount > 0
            ? ` <span style="color:#888">(${callerCount}c)</span>`
            : '';
        return `<div class="spot-item" onclick="selectInitialSpot('${spot.filename}')" title="${fullPath} → ${heroPos}?">
            ${humanNameColored}${heroSuffix}${callerInfo}
        </div>`;
    }).join('');
}

// Step 2: Hero Position Grid
function renderHeroGrid() {
    const grid = document.getElementById('heroGrid');
    const posOrder = ['BB', 'SB', 'BTN', 'CO', 'MP', 'UTG'];

    const scenarioSpots = filterSpotsBySelection(allSpots, mainSelectionState);

    const heroCounts = {};
    posOrder.forEach(pos => {
        heroCounts[pos] = scenarioSpots.filter(s => s.position === pos).length;
    });

    const scenarioConfig = SCENARIOS.find(s => s.key === mainSelectionState.scenario);
    const backTarget = scenarioConfig?.hasSubcategories
        ? `selectScenario('${mainSelectionState.scenario}')`
        : 'goToStep(1); renderScenarioGrid();';

    let html = `<button class="back-btn" onclick="${backTarget}">← Back</button>
                <div style="margin: 15px 0 10px 0; color: #888; font-size: 13px;">Select Position</div>`;

    html += posOrder.map(pos => {
        const count = heroCounts[pos];
        if (count === 0) return '';
        return `<button class="selector-btn" onclick="selectHero('${pos}')">
            ${coloredPos(pos)}
        </button>`;
    }).join('');

    grid.innerHTML = html;
}

function renderHeroGridForRFI() {
    const grid = document.getElementById('heroGrid');
    const posOrder = ['UTG', 'MP', 'CO', 'BTN', 'SB'];

    const rfiSpots = allSpots.filter(s => s.scenario === 'RFI');

    let html = `<button class="back-btn" onclick="goToStep(1); renderScenarioGrid();">← Back</button>
                <div style="margin: 15px 0 10px 0; color: #888; font-size: 13px;">Select Position</div>`;

    html += posOrder.map(pos => {
        const count = rfiSpots.filter(s => s.position === pos).length;
        if (count === 0) return '';
        return `<button class="selector-btn" onclick="selectHeroRFI('${pos}')">
            ${coloredPos(pos)}
        </button>`;
    }).join('');

    grid.innerHTML = html;
}

function selectHero(pos) {
    mainSelectionState.position = pos;
    selectedPosition = pos; // Legacy
    goToStep(3);
    renderOpenerGrid();
}

function selectHeroRFI(pos) {
    mainSelectionState.position = pos;
    selectedPosition = pos; // Legacy
    const spots = allSpots.filter(s => s.scenario === 'RFI' && s.position === pos);
    if (spots.length === 1) {
        selectInitialSpot(spots[0].filename);
    } else {
        goToStep(4);
        renderSpotList();
    }
}

// Step 3: Opener (Villain Raiser) Grid
function renderOpenerGrid() {
    const grid = document.getElementById('openerGrid');
    const posOrder = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'];

    const openers = getAvailableOpeners(mainSelectionState);

    if (openers.length === 0) {
        mainSelectionState.opener = null;
        selectedOpener = null;
        goToStep(4);
        renderCallerGrid();
        return;
    }

    let html = `<button class="back-btn" onclick="goToStep(2); renderHeroGrid();">← Back</button>
                <div style="margin: 15px 0 10px 0; color: #888; font-size: 13px;">vs Opener</div>`;

    if (openers.length > 1) {
        const totalCount = openers.reduce((sum, o) => sum + o.total, 0);
        html += `<button class="selector-btn" onclick="selectOpener(null)">
            All<span class="count">${totalCount}</span>
        </button>`;
    }

    openers.forEach(({ pos, total }) => {
        html += `<button class="selector-btn" onclick="selectOpener('${pos}')">
            vs ${coloredPos(pos)}
        </button>`;
    });

    grid.innerHTML = html;
}

function selectOpener(opener) {
    mainSelectionState.opener = opener;
    selectedOpener = opener; // Legacy
    selectedVillain = opener; // Legacy
    goToStep(4);
    renderCallerGrid();
}

// Step 4: Cold Caller Selection Grid
function renderCallerGrid() {
    const grid = document.getElementById('callerGrid');

    let filteredSpots = filterSpotsBySelection(allSpots, mainSelectionState);

    if (mainSelectionState.position) {
        filteredSpots = filteredSpots.filter(s => s.position === mainSelectionState.position);
    }
    if (mainSelectionState.opener) {
        filteredSpots = filteredSpots.filter(s => getOpenerFromPath(s.actionPath) === mainSelectionState.opener);
    }

    const huSpots = filteredSpots.filter(s => (s.callerCount || 0) === 0);
    const callerSpots = filteredSpots.filter(s => (s.callerCount || 0) > 0);

    const callerCountGroups = {};
    callerSpots.forEach(spot => {
        const count = spot.callerCount || 0;
        if (!callerCountGroups[count]) callerCountGroups[count] = [];
        callerCountGroups[count].push(spot);
    });

    const sortedCounts = Object.keys(callerCountGroups).map(Number).sort((a, b) => a - b);

    if (callerSpots.length === 0) {
        mainSelectionState.callers = 'hu';
        selectedCallers = 'hu';
        renderSpotList();
        return;
    }

    if (huSpots.length === 0 && sortedCounts.length === 1) {
        mainSelectionState.callers = `count:${sortedCounts[0]}`;
        selectedCallers = mainSelectionState.callers;
        renderSpotList();
        return;
    }

    let html = `<button class="back-btn" onclick="goToStep(3); renderOpenerGrid();">← Back</button>
                <div style="margin: 15px 0 10px 0; color: #888; font-size: 13px;">Caller Count</div>`;

    if ((huSpots.length > 0 && callerSpots.length > 0) || sortedCounts.length > 1) {
        html += `<button class="selector-btn" onclick="selectCallers(null)">
            All<span class="count">${filteredSpots.length}</span>
        </button>`;
    }

    if (huSpots.length > 0) {
        html += `<button class="selector-btn" onclick="selectCallers('hu')">
            Heads-Up<span class="count">${huSpots.length}</span>
        </button>`;
    }

    sortedCounts.forEach(count => {
        const label = count === 1 ? '1c' : `${count}c`;
        html += `<button class="selector-btn" onclick="selectCallers('count:${count}')">
            ${label}<span class="count">${callerCountGroups[count].length}</span>
        </button>`;
    });

    grid.innerHTML = html;
}

function selectCallers(callerConfig) {
    mainSelectionState.callers = callerConfig;
    selectedCallers = callerConfig; // Legacy
    renderSpotList();
}

// Final Step: Render Spot List
function renderSpotList() {
    const list = document.getElementById('spotList');
    const spots = getFinalSpots(mainSelectionState);

    if (spots.length === 0) {
        list.innerHTML = '<div style="color:#888; padding:10px;">No spots found for this selection.</div>';
        return;
    }

    if (spots.length === 1) {
        selectInitialSpot(spots[0].filename);
        return;
    }

    list.innerHTML = spots.map(spot => {
        const humanNameColored = humanizeActionPathColored(spot.actionPath);
        const fullPath = humanizeActionPath(spot.actionPath, 99);
        const heroPos = spot.position;
        const heroColor = POSITION_COLORS[heroPos] || '#fff';
        const heroSuffix = ` → <span style="color:${heroColor};font-weight:700">${heroPos}?</span>`;
        const callerCount = spot.callerCount || 0;
        const callerInfo = callerCount > 0
            ? ` <span style="color:#888">(${callerCount}c)</span>`
            : '';
        return `<div class="spot-item" onclick="selectInitialSpot('${spot.filename}')" title="${fullPath} → ${heroPos}?">
            ${humanNameColored}${heroSuffix}${callerInfo}
        </div>`;
    }).join('');
}

async function selectInitialSpot(filename) {
    await addQuizModule(filename, true);
    startQuiz();
}

// Reset main selection state
function resetMainSelectionState() {
    mainSelectionState = createSelectionState();
}

// Legacy functions for compatibility
function renderPositionGrid() {
    renderScenarioGrid();
}

function renderVillainGrid() {
    renderOpenerGrid();
}

function renderVillainGridFiltered(huOnly) {
    if (huOnly) {
        mainSelectionState.callers = 'hu';
        selectedCallers = 'hu';
    }
    renderOpenerGrid();
}

function selectPosition(pos) {
    selectHero(pos);
}

function selectVillain(villain) {
    selectOpener(villain);
}

// Keep old selectedSubcategory for any legacy code
let selectedSubcategory = null;
