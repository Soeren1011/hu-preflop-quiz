/**
 * PLO Range Quiz - Range Selector Modal
 * Uses shared selection-core.js
 * Flow: Scenario → (Subcategory) → Hero → Opener → Spots
 */

function openRangeSelector() {
    rangeSelectorTargetModuleId = null;
    rangeSelectorState = createSelectionState();
    document.getElementById('rangeSelectorTitle').textContent = 'Add Range to Compare';
    renderRangeSelectorContent();
    document.getElementById('rangeSelectorModal').classList.add('active');
}

function openRangeSelectorForModule(moduleId) {
    rangeSelectorTargetModuleId = moduleId;
    rangeSelectorState = createSelectionState();
    document.getElementById('rangeSelectorTitle').textContent = 'Change Range';
    renderRangeSelectorContent();
    document.getElementById('rangeSelectorModal').classList.add('active');
}

function closeRangeSelector() {
    document.getElementById('rangeSelectorModal').classList.remove('active');
}

// Get similar spots to the primary module for quick comparison
function getSimilarSpots() {
    const primaryModule = quizModules.find(m => m.isPrimary);
    if (!primaryModule || !primaryModule.spotInfo) return [];

    const current = primaryModule.spotInfo;
    const currentVillain = getOpenerFromPath(current.actionPath);
    const similar = [];

    // 1. Same position + scenario, different villain
    allSpots.forEach(spot => {
        if (spot.filename === current.filename) return;
        if (spot.position === current.position && spot.scenario === current.scenario) {
            const villain = getOpenerFromPath(spot.actionPath);
            if (villain !== currentVillain && spot.callerCount === current.callerCount) {
                similar.push({ spot, reason: `vs ${villain}`, priority: 1 });
            }
        }
    });

    // 2. Same villain + scenario, different position
    if (currentVillain) {
        allSpots.forEach(spot => {
            if (spot.filename === current.filename) return;
            if (spot.position !== current.position && spot.scenario === current.scenario) {
                const villain = getOpenerFromPath(spot.actionPath);
                if (villain === currentVillain && spot.callerCount === current.callerCount) {
                    similar.push({ spot, reason: `${spot.position}`, priority: 2 });
                }
            }
        });
    }

    // 3. Same position, adjacent scenario
    const scenarioOrder = ['RFI', 'vsRFI', 'vs3BetAsRaiser', 'vs3BetAsCaller', 'vs4Bet'];
    const currentIdx = scenarioOrder.indexOf(current.scenario);
    if (currentIdx >= 0) {
        const adjacentScenarios = [];
        if (currentIdx > 0) adjacentScenarios.push(scenarioOrder[currentIdx - 1]);
        if (currentIdx < scenarioOrder.length - 1) adjacentScenarios.push(scenarioOrder[currentIdx + 1]);

        adjacentScenarios.forEach(adj => {
            const adjSpot = allSpots.find(s =>
                s.position === current.position && s.scenario === adj && s.callerCount === 0
            );
            if (adjSpot && !similar.find(s => s.spot.filename === adjSpot.filename)) {
                const scenarioNames = { 'RFI': 'Open', 'vsRFI': 'vs RFI', 'vs3BetAsRaiser': 'RFI+vs3B', 'vs3BetAsCaller': 'C+vs3B', 'vs4Bet': 'vs 4B' };
                similar.push({ spot: adjSpot, reason: scenarioNames[adj] || adj, priority: 3 });
            }
        });
    }

    return similar.sort((a, b) => a.priority - b.priority).slice(0, 6);
}

function renderRangeSelectorContent() {
    const container = document.getElementById('rangeSelectorList');
    const state = rangeSelectorState;

    // Step 1: Scenario Selection
    if (state.step === 1) {
        let html = '';

        // Quick Compare section
        const similar = getSimilarSpots();
        if (similar.length > 0 && rangeSelectorTargetModuleId === null) {
            html += '<div class="range-selector-step-label similar-label">Quick Compare</div>';
            html += '<div class="range-selector-grid similar-grid">';
            similar.forEach(({ spot, reason }) => {
                html += `<button class="range-selector-btn similar-btn" onclick="selectRangeFromModal('${spot.filename}')" title="${humanizeActionPath(spot.actionPath)}">
                    <span class="similar-pos" style="color:${getPosColor(spot.position)}">${spot.position}</span>
                    <span class="similar-reason">${reason}</span>
                </button>`;
            });
            html += '</div>';
            html += '<div class="range-selector-divider">Or choose manually:</div>';
        }

        // Scenario selection
        html += '<div class="range-selector-step-label">Step 1: Choose Scenario</div><div class="range-selector-grid">';

        SCENARIOS.forEach(sc => {
            const count = allSpots.filter(s => getEffectiveScenario(s) === sc.key).length;
            if (count === 0) return;
            const hasFolder = sc.hasSubcategories ? ' ▶' : '';
            html += `<button class="range-selector-btn" onclick="rsSelectScenario('${sc.key}')">
                ${sc.name}${hasFolder}
                <span class="count">${count}</span>
            </button>`;
        });
        html += '</div>';
        container.innerHTML = html;
    }
    // Step 2: Subcategory OR Position
    else if (state.step === 2) {
        const scenarioConfig = SCENARIOS.find(s => s.key === state.scenario);

        if (scenarioConfig?.hasSubcategories && state.subcategory === null) {
            if (state.scenario === 'vsRFIMulti') {
                renderRsCallerSubcategories(container);
            } else if (state.scenario === 'vs3BetAsRaiser') {
                // Skip IP/OOP subcategory, go directly to hero position
                renderRsPositionGrid(container);
            }
        } else {
            renderRsPositionGrid(container);
        }
    }
    // Step 3: Villain Selection
    else if (state.step === 3) {
        const openers = getAvailableOpeners(state);

        if (openers.length === 0 || state.scenario === 'RFI') {
            state.opener = null;
            state.step = 4;
            renderRangeSelectorContent();
            return;
        }

        let html = `<button class="range-selector-back" onclick="rsGoBack(2)">← Back</button>`;
        html += `<div class="range-selector-step-label">Step 3: vs Opener</div><div class="range-selector-grid">`;

        const totalCount = openers.reduce((sum, o) => sum + o.total, 0);
        html += `<button class="range-selector-btn" onclick="rsSelectOpener(null)">All<span class="count">${totalCount}</span></button>`;

        openers.forEach(({ pos, total }) => {
            html += `<button class="range-selector-btn" onclick="rsSelectOpener('${pos}')">
                vs ${coloredPos(pos)}
                <span class="count">${total}</span>
            </button>`;
        });
        html += '</div>';
        container.innerHTML = html;
    }
    // Step 4: Spot List
    else if (state.step === 4) {
        let backStep = 3;
        if (state.scenario === 'RFI') backStep = 2;

        let html = `<button class="range-selector-back" onclick="rsGoBack(${backStep})">← Back</button>`;
        html += `<div class="range-selector-step-label">Step 4: Choose Spot</div><div class="range-selector-spots">`;

        const spots = getFinalSpots(state);

        if (spots.length === 0) {
            html += '<div style="color:#888; padding:10px;">No spots found.</div>';
        } else {
            spots.forEach(spot => {
                const humanNameColored = humanizeActionPathColored(spot.actionPath);
                const callerCount = spot.callerCount || 0;
                const callerInfo = callerCount > 0
                    ? ` <span style="color:#888">(${callerCount} caller${callerCount > 1 ? 's' : ''})</span>`
                    : ' <span style="color:#4a4">Heads-Up</span>';
                html += `<div class="range-selector-spot" onclick="selectRangeFromModal('${spot.filename}')">${humanNameColored}${callerInfo}</div>`;
            });
        }
        html += '</div>';
        container.innerHTML = html;
    }
}

// Subcategory: Caller Count for vs Open MW
function renderRsCallerSubcategories(container) {
    const spots = allSpots.filter(s => getEffectiveScenario(s) === 'vsRFIMulti');

    const groups = { 1: [], 2: [], '3+': [] };
    spots.forEach(spot => {
        const count = spot.callerCount || 1;
        if (count === 1) groups[1].push(spot);
        else if (count === 2) groups[2].push(spot);
        else groups['3+'].push(spot);
    });

    let html = `<button class="range-selector-back" onclick="rsGoBack(1)">← Back</button>`;
    html += `<div class="range-selector-step-label">vs Open MW - Caller Count</div><div class="range-selector-grid">`;

    html += `<button class="range-selector-btn" onclick="rsSelectSubcategory(null)">
        All<span class="count">${spots.length}</span>
    </button>`;

    if (groups[1].length > 0) {
        html += `<button class="range-selector-btn" onclick="rsSelectSubcategory('callers:1')">
            vs Open +1<span class="count">${groups[1].length}</span>
        </button>`;
    }
    if (groups[2].length > 0) {
        html += `<button class="range-selector-btn" onclick="rsSelectSubcategory('callers:2')">
            vs Open +2<span class="count">${groups[2].length}</span>
        </button>`;
    }
    if (groups['3+'].length > 0) {
        html += `<button class="range-selector-btn" onclick="rsSelectSubcategory('callers:3+')">
            vs Open +3+<span class="count">${groups['3+'].length}</span>
        </button>`;
    }

    html += '</div>';
    container.innerHTML = html;
}

// Subcategory: IP/OOP for vs 3Bet
function renderRs3BetSubcategories(container) {
    const spots = allSpots.filter(s => getEffectiveScenario(s) === 'vs3BetAsRaiser');

    const ipSpots = spots.filter(s => isHeroIPvs3Bet(s));
    const oopSpots = spots.filter(s => !isHeroIPvs3Bet(s));

    let html = `<button class="range-selector-back" onclick="rsGoBack(1)">← Back</button>`;
    html += `<div class="range-selector-step-label">vs 3Bet - Position</div><div class="range-selector-grid">`;

    html += `<button class="range-selector-btn" onclick="rsSelectSubcategory(null)">
        All<span class="count">${spots.length}</span>
    </button>`;

    if (ipSpots.length > 0) {
        html += `<button class="range-selector-btn" onclick="rsSelectSubcategory('position:ip')">
            IP<span class="count">${ipSpots.length}</span>
        </button>`;
    }
    if (oopSpots.length > 0) {
        html += `<button class="range-selector-btn" onclick="rsSelectSubcategory('position:oop')">
            OOP<span class="count">${oopSpots.length}</span>
        </button>`;
    }

    html += '</div>';
    container.innerHTML = html;
}

// Position Grid
function renderRsPositionGrid(container) {
    const state = rangeSelectorState;
    const scenarioConfig = SCENARIOS.find(s => s.key === state.scenario);
    const hasSubcats = scenarioConfig?.hasSubcategories;

    let backTarget;
    if (hasSubcats && state.subcategory !== null) {
        backTarget = `rsSelectScenario('${state.scenario}')`;
    } else {
        backTarget = `rsGoBack(1)`;
    }

    let html = `<button class="range-selector-back" onclick="${backTarget}">← Back</button>`;
    html += `<div class="range-selector-step-label">Step 2: Select Position</div><div class="range-selector-grid">`;

    const scenarioSpots = filterSpotsBySelection(allSpots, state);

    const posOrder = state.scenario === 'RFI'
        ? ['UTG', 'MP', 'CO', 'BTN', 'SB']
        : ['BB', 'SB', 'BTN', 'CO', 'MP', 'UTG'];

    posOrder.forEach(pos => {
        const count = scenarioSpots.filter(s => s.position === pos).length;
        if (count === 0) return;
        html += `<button class="range-selector-btn" onclick="rsSelectPosition('${pos}')">
            ${coloredPos(pos)}
            <span class="count">${count}</span>
        </button>`;
    });

    html += '</div>';
    container.innerHTML = html;
}

// Navigation functions (prefixed with rs to avoid conflicts)
function rsSelectScenario(scenario) {
    rangeSelectorState.scenario = scenario;
    rangeSelectorState.subcategory = null;
    rangeSelectorState.position = null;
    rangeSelectorState.opener = null;
    rangeSelectorState.step = 2;
    renderRangeSelectorContent();
}

function rsSelectSubcategory(subcat) {
    rangeSelectorState.subcategory = subcat;
    renderRangeSelectorContent();
}

function rsSelectPosition(pos) {
    rangeSelectorState.position = pos;

    if (rangeSelectorState.scenario === 'RFI') {
        rangeSelectorState.step = 4;
    } else {
        rangeSelectorState.step = 3;
    }

    renderRangeSelectorContent();
}

function rsSelectOpener(opener) {
    rangeSelectorState.opener = opener;
    rangeSelectorState.step = 4;
    renderRangeSelectorContent();
}

function rsGoBack(step) {
    rangeSelectorState.step = step;

    if (step === 1) {
        rangeSelectorState.scenario = null;
        rangeSelectorState.subcategory = null;
        rangeSelectorState.position = null;
        rangeSelectorState.opener = null;
    } else if (step === 2) {
        rangeSelectorState.position = null;
        rangeSelectorState.opener = null;
        if (!SCENARIOS.find(s => s.key === rangeSelectorState.scenario)?.hasSubcategories) {
            rangeSelectorState.subcategory = null;
        }
    } else if (step === 3) {
        rangeSelectorState.opener = null;
    }

    renderRangeSelectorContent();
}

async function selectRangeFromModal(filename) {
    closeRangeSelector();
    if (rangeSelectorTargetModuleId !== null) {
        await changeModuleRange(rangeSelectorTargetModuleId, filename);
    } else {
        await addQuizModule(filename, false);
        showQuestion();
    }
}

// Legacy compatibility - variables declared in app-state.js:
// rangeSelectorStep, rangeSelectorPosition, rangeSelectorScenario, rangeSelectorVillain
