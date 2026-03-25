/**
 * HU Preflop Range Quiz - Constants
 */

// Use CONFIG.BINARY_BASE_URL from config.js (loaded first)
const RANGES_PATH = (typeof CONFIG !== 'undefined' && CONFIG.BINARY_BASE_URL) || 'binary';
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
const RANK_ORDER = 'AKQJT98765432';
const SUIT_SYMBOLS = { 's': '♠', 'h': '♥', 'd': '♦', 'c': '♣' };

const RAINBOW_END = 1819;
const SINGLE_SUITED_START = 1820;
const SINGLE_SUITED_END = 8917;
const DOUBLE_SUITED_START = 8918;
const DOUBLE_SUITED_END = 11998;
const TRIP_SUITED_START = 11999;
const TRIP_SUITED_END = 15716;
const MONOTON_START = 15717;

const POSITIONS = ['SB', 'BB'];

const SCENARIOS = [
    { key: 'RFI', name: 'SB Open', desc: 'SB open raise' },
    { key: 'vsRFI', name: 'BB vs Raise', desc: 'BB facing SB raise' },
    { key: 'vs3BetAsRaiser', name: 'SB vs 3-Bet', desc: 'SB opened, facing BB 3-bet' },
    { key: 'vs4Bet', name: 'BB vs 4-Bet', desc: 'BB 3-bet, facing SB 4-bet' },
    { key: 'vs5Bet+', name: 'SB vs 5-Bet', desc: 'SB 4-bet, facing BB 5-bet' }
];

const HEATMAP_Y_CATEGORIES = [
    { key: 'total', name: 'Total', filter: '', level: 0 },
    // Paired hands
    { key: 'paired', name: 'Paired', filter: 'RR', level: 1 },
    { key: 'AA', name: '  AA', filter: 'AA', level: 2 },
    { key: 'KK', name: '  KK', filter: 'KK', level: 2 },
    { key: 'QQ-TT', name: '  QQ-TT', filter: 'QQ,JJ,TT', level: 2 },
    { key: '99-', name: '  99-', filter: 'RR', level: 2 },
    // Unpaired hands
    { key: 'unpaired', name: 'Unpaired', filter: '$np', level: 1 },
    // A-high
    { key: 'A-high', name: '  A-high', filter: 'A:$np', level: 2 },
    { key: 'AK', name: '    AK', filter: 'AK:$np', level: 3 },
    { key: 'AQ', name: '    AQ', filter: 'AQ:$np', level: 3 },
    { key: 'AJ', name: '    AJ', filter: 'AJ:$np', level: 3 },
    { key: 'AT-', name: '    AT-', filter: 'A:$np', level: 3 },
    { key: 'A-run', name: '    A-Run', filter: 'A:$np:$run', level: 3 },
    // K-high (no A)
    { key: 'K-high', name: '  K-high', filter: 'K:!A:$np', level: 2 },
    { key: 'KQ', name: '    KQ', filter: 'KQ:!A:$np', level: 3 },
    { key: 'KJ', name: '    KJ', filter: 'KJ:!A:$np', level: 3 },
    { key: 'KT-', name: '    KT-', filter: 'K:!A:$np', level: 3 },
    { key: 'K-run', name: '    K-Run', filter: 'K:!A:$np:$run', level: 3 },
    // Q-high (no A, K)
    { key: 'Q-high', name: '  Q-high', filter: 'Q:!A:!K:$np', level: 2 },
    { key: 'QJ', name: '    QJ', filter: 'QJ:!A:!K:$np', level: 3 },
    { key: 'QT-', name: '    QT-', filter: 'Q:!A:!K:$np', level: 3 },
    { key: 'Q-run', name: '    Q-Run', filter: 'Q:!A:!K:$np:$run', level: 3 },
    // J-high (no A, K, Q)
    { key: 'J-high', name: '  J-high', filter: 'J:!A:!K:!Q:$np', level: 2 },
    { key: 'JT', name: '    JT', filter: 'JT:!A:!K:!Q:$np', level: 3 },
    { key: 'J9-', name: '    J9-', filter: 'J:!A:!K:!Q:$np', level: 3 },
    { key: 'J-run', name: '    J-Run', filter: 'J:!A:!K:!Q:$np:$run', level: 3 },
    // T-low
    { key: 'T-low', name: '  T-low', filter: '!A:!K:!Q:!J:$np', level: 2 },
    { key: 'T-run', name: '    Run', filter: '!A:!K:!Q:!J:$np:$run', level: 3 }
];

// Filtering rules for scenarios
const SCENARIO_FILTERS = {
    // Show all HU scenarios
};

// Helper for filter - get opener from action path
function getOpenerFromPathForFilter(actionPath) {
    if (!actionPath) return null;
    const parts = actionPath.split('-');
    for (const part of parts) {
        const match = part.match(/^(SB|BB)(100%|AI)$/);
        if (match) return match[1];
    }
    return null;
}

/**
 * Check if a spot is a cold 3-bet scenario (not applicable in HU)
 */
function isCold3Bet(spot) {
    return false;
}

// Human-readable action translations
const ACTION_NAMES = {
    'F': 'fold', 'C': 'call', '100%': 'raise', 'AI': 'all-in', '50%': 'raise50'
};

const POSITION_NAMES = {
    'SB': 'SB', 'BB': 'BB'
};

// Position colors for action path display
const POSITION_COLORS = {
    'SB': '#22c55e',  // green
    'BB': '#fde047'   // yellow
};

/**
 * Convert action path to human-readable format
 */
function humanizeActionPath(actionPath, maxActions = 99) {
    if (!actionPath) return "Open";

    const parts = actionPath.split('-');
    const actions = [];

    for (let i = 0; i < Math.min(parts.length, maxActions); i++) {
        const part = parts[i];
        const match = part.match(/^(SB|BB)(100%|50%|AI|F|C)$/);

        if (match) {
            const pos = match[1];
            const action = ACTION_NAMES[match[2]] || match[2];
            actions.push(`${pos} ${action}`);
        }
    }

    let result = actions.join(' \u2192 ');

    if (parts.length > maxActions) {
        result += ` (+${parts.length - maxActions})`;
    }

    return result;
}

/**
 * Convert action path to colored HTML
 */
function humanizeActionPathColored(actionPath, maxActions = 99) {
    if (!actionPath) return "Open";

    const parts = actionPath.split('-');
    const actions = [];

    for (let i = 0; i < Math.min(parts.length, maxActions); i++) {
        const part = parts[i];
        const match = part.match(/^(SB|BB)(100%|50%|AI|F|C)$/);

        if (match) {
            const pos = match[1];
            const action = ACTION_NAMES[match[2]] || match[2];
            const color = POSITION_COLORS[pos] || '#fff';
            actions.push(`<span style="color:${color}">${pos}</span> ${action}`);
        }
    }

    let result = actions.join(' \u2192 ');

    if (parts.length > maxActions) {
        result += ` (+${parts.length - maxActions})`;
    }

    return result;
}

/**
 * Get short display name for a spot
 */
function getSpotDisplayName(spot) {
    if (!spot) return "Unknown";

    const pos = spot.position;
    const scenario = spot.scenario;

    const scenarioNames = {
        'RFI': 'Open',
        'vsRFI': 'vs Raise',
        'vs3BetAsRaiser': 'vs 3-Bet',
        'vs4Bet': 'vs 4-Bet',
        'vs5Bet+': 'vs 5-Bet+'
    };

    return `${pos} ${scenarioNames[scenario] || scenario}`;
}

/**
 * Check if a spot should be shown based on filter rules
 */
function shouldShowSpot(spot) {
    const filter = SCENARIO_FILTERS[spot.scenario];
    if (filter === false) return false;
    if (typeof filter === 'function') return filter(spot);
    return true;
}

const HEATMAP_X_CATEGORIES = [
    { key: 'total', name: 'Total', filter: '', level: 0 },
    { key: 'ss_nonnut', name: 'SS-', filter: '$sspnn', level: 1 },
    { key: 'ss_nut', name: 'SS+', filter: '$sspn', level: 1 },
    { key: 'ts_nonnut', name: 'Trip-', filter: '$tsnn', level: 1 },
    { key: 'ts_nut', name: 'Trip+', filter: '$tsn', level: 1 },
    { key: 'ds_nonnut', name: 'DS-', filter: '$dsnn', level: 1 },
    { key: 'ds_nut', name: 'DS+', filter: '$dsn', level: 1 },
    { key: 'monotone', name: 'Mono', filter: '$ms', level: 1 },
    { key: 'rainbow', name: 'RB', filter: '$rb', level: 1 }
];
