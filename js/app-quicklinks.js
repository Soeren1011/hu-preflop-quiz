/**
 * HU Preflop Range Quiz - Quicklinks
 * Preset multi-module configurations for common training scenarios
 */

// Quicklink groups
const QUICKLINK_GROUPS = [
    { id: 'sb', name: 'SB Spots' },
    { id: 'bb', name: 'BB Spots' },
    { id: 'full', name: 'Full Tree' }
];

// Quicklink definitions
const QUICKLINKS = [
    {
        id: 'sb-complete',
        name: 'SB Complete',
        group: 'sb',
        description: 'SB Open + vs 3bet + vs 5bet',
        modules: [
            { position: 'SB', scenario: 'RFI', label: 'SB Open' },
            { position: 'SB', scenario: 'vs3BetAsRaiser', label: 'SB vs 3-Bet' },
            { position: 'SB', scenario: 'vs5Bet+', label: 'SB vs 5-Bet' }
        ]
    },
    {
        id: 'bb-complete',
        name: 'BB Complete',
        group: 'bb',
        description: 'BB vs Raise + vs 4bet',
        modules: [
            { position: 'BB', scenario: 'vsRFI', label: 'BB vs SB Raise' },
            { position: 'BB', scenario: 'vs4Bet', label: 'BB vs 4-Bet' }
        ]
    },
    {
        id: 'sb-open',
        name: 'SB Open',
        group: 'sb',
        description: 'SB open raise',
        modules: [
            { position: 'SB', scenario: 'RFI', label: 'SB Open' }
        ]
    },
    {
        id: 'bb-vs-raise',
        name: 'BB vs Raise',
        group: 'bb',
        description: 'BB facing SB raise',
        modules: [
            { position: 'BB', scenario: 'vsRFI', label: 'BB vs SB Raise' }
        ]
    },
    {
        id: 'full-tree',
        name: 'Full HU Tree',
        group: 'full',
        description: 'All 5 decision points',
        modules: [
            { position: 'SB', scenario: 'RFI', label: 'SB Open' },
            { position: 'BB', scenario: 'vsRFI', label: 'BB vs Raise' },
            { position: 'SB', scenario: 'vs3BetAsRaiser', label: 'SB vs 3-Bet' },
            { position: 'BB', scenario: 'vs4Bet', label: 'BB vs 4-Bet' },
            { position: 'SB', scenario: 'vs5Bet+', label: 'SB vs 5-Bet' }
        ]
    }
];

/**
 * Render quicklinks section
 */
function renderQuicklinks() {
    const grid = document.getElementById('quicklinksGrid');
    if (!grid) return;

    let html = '';

    QUICKLINK_GROUPS.forEach(group => {
        const groupLinks = QUICKLINKS.filter(q => q.group === group.id);
        if (groupLinks.length === 0) return;

        html += `<div class="quicklinks-group-label">${group.name}</div>`;
        groupLinks.forEach(link => {
            html += `<button class="quicklink-btn" data-quicklink="${link.id}" title="${link.description}">
                <span class="quicklink-name">${link.name}</span>
                <span class="quicklink-count">${link.modules.length} range${link.modules.length > 1 ? 's' : ''}</span>
            </button>`;
        });
    });

    grid.innerHTML = html;

    // Attach click handlers
    grid.querySelectorAll('.quicklink-btn').forEach(btn => {
        btn.addEventListener('click', () => activateQuicklink(btn.dataset.quicklink));
    });
}

/**
 * Activate a quicklink - load its modules and start quiz
 */
async function activateQuicklink(quicklinkId) {
    const link = QUICKLINKS.find(q => q.id === quicklinkId);
    if (!link) return;

    // Reset quiz state
    quizModules.forEach(m => {
        const el = document.getElementById(`quizModule${m.id}`);
        if (el) el.remove();
    });
    quizModules = [];
    nextModuleId = 0;

    // Set selection state from first module
    selectedScenario = link.modules[0].scenario;
    selectedPosition = link.modules[0].position;

    // Load each module
    let isFirst = true;
    for (const mod of link.modules) {
        // Find matching spot
        const spot = allSpotsUnfiltered.find(s =>
            s.position === mod.position &&
            getEffectiveScenario(s) === mod.scenario
        );

        if (spot) {
            await addQuizModule(spot.filename, isFirst);
            isFirst = false;
        }
    }

    startQuiz();
}
