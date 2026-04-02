/**
 * HU Preflop Range Quiz - Preset Categories
 * Categorized multi-module presets for HU poker
 */

// ============================================
// PRESET CATEGORY DEFINITIONS
// ============================================

const PRESET_CATEGORIES = [
    {
        id: 'sb',
        name: 'SB',
        desc: 'SB opens & facing 3bet/5bet',
        groups: [
            {
                name: 'SB Spots',
                presets: [
                    {
                        id: 'sb-complete', name: 'SB Complete',
                        modules: [
                            { position: 'SB', scenario: 'RFI', label: 'SB Open' },
                            { position: 'SB', scenario: 'vs3BetAsRaiser', label: 'SB vs 3-Bet' },
                            { position: 'SB', scenario: 'vs5Bet+', label: 'SB vs 5-Bet' }
                        ]
                    },
                    {
                        id: 'sb-open', name: 'SB Open',
                        modules: [
                            { position: 'SB', scenario: 'RFI', label: 'SB Open' }
                        ]
                    },
                    {
                        id: 'sb-vs-3bet', name: 'SB vs 3-Bet',
                        modules: [
                            { position: 'SB', scenario: 'vs3BetAsRaiser', label: 'SB vs 3-Bet' }
                        ]
                    },
                    {
                        id: 'sb-vs-5bet', name: 'SB vs 5-Bet',
                        modules: [
                            { position: 'SB', scenario: 'vs5Bet+', label: 'SB vs 5-Bet' }
                        ]
                    }
                ]
            }
        ]
    },
    {
        id: 'bb',
        name: 'BB',
        desc: 'BB facing raise & 4bet',
        groups: [
            {
                name: 'BB Spots',
                presets: [
                    {
                        id: 'bb-complete', name: 'BB Complete',
                        modules: [
                            { position: 'BB', scenario: 'vsRFI', label: 'BB vs SB Raise' },
                            { position: 'BB', scenario: 'vs4Bet', label: 'BB vs 4-Bet' }
                        ]
                    },
                    {
                        id: 'bb-vs-raise', name: 'BB vs Raise',
                        modules: [
                            { position: 'BB', scenario: 'vsRFI', label: 'BB vs SB Raise' }
                        ]
                    },
                    {
                        id: 'bb-vs-4bet', name: 'BB vs 4-Bet',
                        modules: [
                            { position: 'BB', scenario: 'vs4Bet', label: 'BB vs 4-Bet' }
                        ]
                    }
                ]
            }
        ]
    },
    {
        id: 'full',
        name: 'Full Tree',
        desc: 'All decision points',
        groups: [
            {
                name: 'Complete',
                presets: [
                    {
                        id: 'full-tree', name: 'Full HU Tree',
                        modules: [
                            { position: 'SB', scenario: 'RFI', label: 'SB Open' },
                            { position: 'BB', scenario: 'vsRFI', label: 'BB vs Raise' },
                            { position: 'SB', scenario: 'vs3BetAsRaiser', label: 'SB vs 3-Bet' },
                            { position: 'BB', scenario: 'vs4Bet', label: 'BB vs 4-Bet' },
                            { position: 'SB', scenario: 'vs5Bet+', label: 'SB vs 5-Bet' }
                        ]
                    }
                ]
            }
        ]
    }
];

// ============================================
// HELPER FUNCTIONS
// ============================================

function get3BettorFromPathQL(actionPath) {
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

function get4BettorFromPathQL(actionPath) {
    if (!actionPath) return null;
    const parts = actionPath.split('-');
    let raiseCount = 0;
    for (const part of parts) {
        const match = part.match(/^(UTG|MP|CO|BTN|SB|BB)(100%|AI)$/);
        if (match) {
            raiseCount++;
            if (raiseCount === 3) return match[1];
        }
    }
    return null;
}

function getCallersFromPathQL(actionPath) {
    if (!actionPath) return [];
    const parts = actionPath.split('-');
    const callers = [];
    for (const part of parts) {
        const match = part.match(/^(UTG|MP|CO|BTN|SB|BB)C$/);
        if (match) callers.push(match[1]);
    }
    return callers;
}

function findSpotByCriteria(criteria) {
    return allSpots.find(spot => {
        if (criteria.position && spot.position !== criteria.position) return false;
        if (criteria.scenario) {
            const effectiveScenario = getEffectiveScenario(spot);
            if (effectiveScenario !== criteria.scenario) return false;
        }
        if (criteria.opener) {
            const opener = getOpenerFromPath(spot.actionPath);
            if (opener !== criteria.opener) return false;
        }
        if (criteria.threeBettor) {
            const threeBettor = get3BettorFromPathQL(spot.actionPath);
            if (threeBettor !== criteria.threeBettor) return false;
        }
        if (criteria.callers) {
            const actualCallers = getCallersFromPathQL(spot.actionPath);
            if (actualCallers.length !== criteria.callers.length) return false;
            for (const c of criteria.callers) {
                if (!actualCallers.includes(c)) return false;
            }
        }
        if (criteria.callerCount !== undefined && (spot.callerCount || 0) !== criteria.callerCount) return false;
        if (criteria.fourBettorIsOpener) {
            const opener = getOpenerFromPath(spot.actionPath);
            const fourBettor = get4BettorFromPathQL(spot.actionPath);
            if (fourBettor !== opener) return false;
        }
        return true;
    });
}

// ============================================
// PRESET LOADING
// ============================================

async function loadQuicklink(presetId) {
    // Search all categories for this preset
    let preset = null;
    for (const cat of PRESET_CATEGORIES) {
        for (const group of cat.groups) {
            preset = group.presets.find(p => p.id === presetId);
            if (preset) break;
        }
        if (preset) break;
    }
    if (!preset) return;

    const spots = [];
    for (const moduleCriteria of preset.modules) {
        const spot = findSpotByCriteria(moduleCriteria);
        if (spot) spots.push({ spot, label: moduleCriteria.label });
    }

    if (spots.length === 0) {
        alert('No matching spots found for this preset');
        return;
    }

    await addQuizModule(spots[0].spot.filename, true);
    for (let i = 1; i < spots.length; i++) {
        await addQuizModule(spots[i].spot.filename, false);
    }
    startQuiz();
}

// ============================================
// PRESET CATEGORIES UI
// ============================================

let activePresetCategory = 'sb';

function renderPresetCategories() {
    const container = document.getElementById('presetCategoriesGrid');
    if (!container) return;

    // Filter to categories that have at least one available preset
    const availableCategories = PRESET_CATEGORIES.filter(cat =>
        cat.groups.some(group =>
            group.presets.some(preset =>
                findSpotByCriteria(preset.modules[0]) !== null
            )
        )
    );

    if (availableCategories.length === 0) return;

    if (!availableCategories.find(c => c.id === activePresetCategory)) {
        activePresetCategory = availableCategories[0].id;
    }

    const activeCat = availableCategories.find(c => c.id === activePresetCategory);

    // Build category tabs
    const tabsHtml = availableCategories.map(cat => `
        <button class="preset-cat-tab ${cat.id === activePresetCategory ? 'active' : ''}"
                data-cat="${cat.id}">
            <span class="preset-cat-name">${cat.name}</span>
            <span class="preset-cat-desc">${cat.desc}</span>
        </button>
    `).join('');

    // Build groups & presets for active category
    let groupsHtml = '';
    if (activeCat) {
        activeCat.groups.forEach(group => {
            const availablePresets = group.presets.filter(p =>
                findSpotByCriteria(p.modules[0]) !== null
            );
            if (availablePresets.length === 0) return;

            groupsHtml += `<div class="preset-group">`;
            groupsHtml += `<div class="preset-group-header">`;
            groupsHtml += `<span class="preset-group-name">${group.name}</span>`;
            if (group.desc) groupsHtml += `<span class="preset-group-desc">${group.desc}</span>`;
            groupsHtml += `</div>`;
            groupsHtml += `<div class="preset-group-grid">`;

            availablePresets.forEach(preset => {
                const moduleCount = preset.modules.length;
                const moduleLabels = preset.modules
                    .map(m => m.label)
                    .join(' | ');

                groupsHtml += `
                    <button class="preset-btn" data-preset="${preset.id}" title="${moduleLabels}">
                        <span class="preset-name">${preset.name}</span>
                        <span class="preset-count">${moduleCount} ranges</span>
                    </button>
                `;
            });

            groupsHtml += `</div></div>`;
        });
    }

    // User presets section
    const userPresetsHtml = renderUserPresetsSection();

    container.innerHTML = `
        ${userPresetsHtml}
        <div class="preset-cat-tabs">${tabsHtml}</div>
        <div class="preset-groups">${groupsHtml}</div>
    `;

    // Event listeners: category tabs
    container.querySelectorAll('.preset-cat-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            activePresetCategory = tab.dataset.cat;
            renderPresetCategories();
        });
    });

    // Event listeners: built-in presets
    container.querySelectorAll('.preset-btn:not(.user-preset)').forEach(btn => {
        btn.addEventListener('click', () => {
            loadQuicklink(btn.dataset.preset);
        });
    });

    // Event listeners: user presets
    container.querySelectorAll('.user-preset').forEach(el => {
        el.addEventListener('click', (e) => {
            if (e.target.classList.contains('user-preset-delete') || e.target.classList.contains('user-preset-export')) return;
            loadUserPreset(parseInt(el.dataset.idx));
        });
    });
    container.querySelectorAll('.user-preset-export').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            exportUserPreset(parseInt(btn.dataset.idx));
        });
    });
    container.querySelectorAll('.user-preset-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteUserPreset(parseInt(btn.dataset.idx));
        });
    });
}

// ============================================
// MULTI MODE TOGGLE (Presets vs Custom)
// ============================================

let multiModeTab = 'presets';

function initMultiModeToggle() {
    const toggle = document.getElementById('multiModeToggle');
    if (!toggle) return;

    toggle.querySelectorAll('.multi-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            multiModeTab = btn.dataset.tab;
            toggle.querySelectorAll('.multi-toggle-btn').forEach(b =>
                b.classList.toggle('active', b.dataset.tab === multiModeTab)
            );
            applyMultiModeTab();
        });
    });
}

function applyMultiModeTab() {
    const presetsSection = document.getElementById('presetCategoriesSection');
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const step3 = document.getElementById('step3');
    const step4 = document.getElementById('step4');

    if (multiModeTab === 'presets') {
        if (presetsSection) presetsSection.style.display = 'block';
        if (step1) step1.style.display = 'none';
        if (step2) step2.style.display = 'none';
        if (step3) step3.style.display = 'none';
        if (step4) step4.style.display = 'none';
        renderPresetCategories();
    } else {
        if (presetsSection) presetsSection.style.display = 'none';
        if (step1) step1.style.display = 'block';
        // Reset wizard to step 1
        goToStep(1);
    }
}

// ============================================
// USER PRESETS (localStorage)
// ============================================

const USER_PRESETS_KEY = 'plo4quiz_user_presets_v1';

function getUserPresets() {
    try {
        return JSON.parse(localStorage.getItem(USER_PRESETS_KEY) || '[]');
    } catch { return []; }
}

function saveUserPreset(name, filenames, labels) {
    const presets = getUserPresets();
    presets.push({ name, filenames, labels, createdAt: Date.now() });
    localStorage.setItem(USER_PRESETS_KEY, JSON.stringify(presets));
}

function deleteUserPreset(idx) {
    const presets = getUserPresets();
    presets.splice(idx, 1);
    localStorage.setItem(USER_PRESETS_KEY, JSON.stringify(presets));
    renderPresetCategories();
}

function exportUserPreset(idx) {
    const presets = getUserPresets();
    const preset = presets[idx];
    if (!preset) return;

    const enriched = {
        name: preset.name,
        modules: preset.filenames.map((f, i) => {
            const spot = allSpots.find(s => s.filename === f);
            return {
                filename: f,
                label: preset.labels[i] || '',
                position: spot?.position,
                scenario: spot?.scenario,
                actionPath: spot?.actionPath
            };
        })
    };
    const json = JSON.stringify(enriched, null, 2);
    navigator.clipboard.writeText(json).then(() => {
        const btn = document.querySelector(`.user-preset-export[data-idx="${idx}"]`);
        if (btn) { btn.textContent = 'Copied!'; setTimeout(() => { btn.textContent = 'Export'; }, 1500); }
    });
}

async function loadUserPreset(idx) {
    const presets = getUserPresets();
    const preset = presets[idx];
    if (!preset || !preset.filenames.length) return;

    await addQuizModule(preset.filenames[0], true);
    for (let i = 1; i < preset.filenames.length; i++) {
        await addQuizModule(preset.filenames[i], false);
    }
    startQuiz();
}

function promptSavePreset() {
    if (!quizModules || quizModules.length === 0) return;

    const filenames = quizModules.map(m => m.spotFile);
    const labels = quizModules.map(m => m.title || '');
    const defaultName = labels.join(' + ');
    const name = prompt('Preset name:', defaultName);
    if (!name) return;

    saveUserPreset(name, filenames, labels);

    // If we're in multi/presets view, re-render
    if (typeof renderPresetCategories === 'function') renderPresetCategories();
}

function renderUserPresetsSection() {
    const presets = getUserPresets();
    if (presets.length === 0) return '';

    let html = '<div class="preset-group user-presets-group">';
    html += '<div class="preset-group-header"><span class="preset-group-name">My Presets</span></div>';
    html += '<div class="preset-group-grid">';

    presets.forEach((p, i) => {
        const count = p.filenames.length;
        const tooltip = p.labels.join(' | ');
        html += `
            <div class="preset-btn user-preset" data-idx="${i}" title="${tooltip}">
                <span class="preset-name">${p.name}</span>
                <span class="preset-count">${count}</span>
                <span class="user-preset-actions">
                    <button class="user-preset-export" data-idx="${i}" title="Copy JSON">Export</button>
                    <button class="user-preset-delete" data-idx="${i}" title="Delete">&times;</button>
                </span>
            </div>
        `;
    });

    html += '</div></div>';
    return html;
}

// Legacy compatibility - renderQuicklinks is called from app init
function renderQuicklinks() {
    // No-op - replaced by renderPresetCategories
}
