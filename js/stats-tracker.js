/**
 * PLO Range Quiz - Stats Tracker
 * Persistent statistics with localStorage
 * Features: Session stats, per-spot stats, weak spots analysis
 */

const _STATS_PREFIX = (new URLSearchParams(window.location.search)).get('guest') ? 'plo4quiz_guest_' : 'plo4quiz_';
const STATS_KEY = _STATS_PREFIX + 'stats_v1';
const HISTORY_KEY = _STATS_PREFIX + 'history_v1';
const MAX_HISTORY = 500; // Keep last 500 answers for analysis

/**
 * Stats structure:
 * {
 *   global: { correct, wrong, bestStreak, totalSessions },
 *   spots: { [spotKey]: { correct, wrong, lastPlayed } },
 *   hands: { [spotKey]: { [handKey]: { correct, wrong, lastAnswer, evLoss } } }
 * }
 */

let statsData = null;
let historyData = [];

/**
 * Initialize stats from localStorage
 */
function initStats() {
    try {
        const saved = localStorage.getItem(STATS_KEY);
        statsData = saved ? JSON.parse(saved) : createEmptyStats();
        
        const history = localStorage.getItem(HISTORY_KEY);
        historyData = history ? JSON.parse(history) : [];
    } catch (e) {
        console.warn('Stats load failed, starting fresh:', e);
        statsData = createEmptyStats();
        historyData = [];
    }
}

function createEmptyStats() {
    return {
        global: { correct: 0, wrong: 0, bestStreak: 0, totalSessions: 0 },
        spots: {},
        hands: {}
    };
}

/**
 * Save stats to localStorage
 */
function saveStats() {
    try {
        localStorage.setItem(STATS_KEY, JSON.stringify(statsData));
        localStorage.setItem(HISTORY_KEY, JSON.stringify(historyData));
    } catch (e) {
        console.warn('Stats save failed:', e);
    }
}

/**
 * Generate spot key from module info
 */
function getSpotKey(module) {
    if (!module || !module.spotInfo) return 'unknown';
    const spot = module.spotInfo;
    return `${spot.scenario}_${spot.position}_${spot.actionPath || 'default'}`;
}

/**
 * Generate hand key (simplified representation)
 */
function getHandKey(hand) {
    if (!hand) return null;
    // Try different properties that might hold the hand notation
    return hand.notation || hand.combo || hand.hand || null;
}

/**
 * Record an answer
 * @param {Object} module - Quiz module
 * @param {string} action - User's action (fold/call/raise)
 * @param {boolean} isCorrect - Was answer correct
 * @param {string} bestAction - GTO best action
 * @param {number} evLoss - EV loss in BB (0 if correct)
 * @param {Object} hand - Hand data
 */
function recordAnswer(module, action, isCorrect, bestAction, evLoss, hand) {
    if (!statsData) initStats();
    
    const spotKey = getSpotKey(module);
    const handKey = getHandKey(hand);
    const now = Date.now();
    
    // Update global stats
    if (isCorrect) {
        statsData.global.correct++;
    } else {
        statsData.global.wrong++;
    }
    
    // Update spot stats
    if (!statsData.spots[spotKey]) {
        statsData.spots[spotKey] = { correct: 0, wrong: 0, lastPlayed: now, name: module.title || spotKey };
    }
    const spotStats = statsData.spots[spotKey];
    spotStats.lastPlayed = now;
    if (isCorrect) {
        spotStats.correct++;
    } else {
        spotStats.wrong++;
    }
    
    // Update hand stats (only track mistakes for weak spots analysis)
    if (!isCorrect && handKey) {
        if (!statsData.hands[spotKey]) {
            statsData.hands[spotKey] = {};
        }
        if (!statsData.hands[spotKey][handKey]) {
            statsData.hands[spotKey][handKey] = { correct: 0, wrong: 0, totalEvLoss: 0 };
        }
        const handStats = statsData.hands[spotKey][handKey];
        handStats.wrong++;
        handStats.totalEvLoss += evLoss || 0;
        handStats.lastWrongAction = action;
        handStats.correctAction = bestAction;
    } else if (isCorrect && handKey && statsData.hands[spotKey]?.[handKey]) {
        // Track correct answers for previously missed hands
        statsData.hands[spotKey][handKey].correct++;
    }
    
    // Add to history
    historyData.push({
        t: now,
        spot: spotKey,
        hand: handKey,
        action,
        best: bestAction,
        ok: isCorrect,
        evLoss: evLoss || 0
    });
    
    // Trim history if too long
    if (historyData.length > MAX_HISTORY) {
        historyData = historyData.slice(-MAX_HISTORY);
    }
    
    saveStats();
}

/**
 * Update best streak
 */
function updateBestStreak(currentStreak) {
    if (!statsData) initStats();
    if (currentStreak > statsData.global.bestStreak) {
        statsData.global.bestStreak = currentStreak;
        saveStats();
    }
}

/**
 * Increment session count
 */
function recordSessionStart() {
    if (!statsData) initStats();
    statsData.global.totalSessions++;
    saveStats();
}

/**
 * Get stats aggregated by scenario
 */
function getStatsForScenario(scenario) {
    if (!statsData) initStats();
    
    let correct = 0;
    let wrong = 0;
    let spotsPlayed = 0;
    
    Object.entries(statsData.spots).forEach(([key, stats]) => {
        // spotKey format: scenario_position_actionPath
        if (key.startsWith(scenario + '_')) {
            correct += stats.correct || 0;
            wrong += stats.wrong || 0;
            if (stats.correct > 0 || stats.wrong > 0) spotsPlayed++;
        }
    });
    
    const total = correct + wrong;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    
    return { correct, wrong, total, accuracy, spotsPlayed };
}

/**
 * Get stats for a specific spot
 */
function getStatsForSpot(spotKey) {
    if (!statsData) initStats();
    const stats = statsData.spots[spotKey];
    if (!stats) return { correct: 0, wrong: 0, total: 0, accuracy: 0 };
    
    const total = (stats.correct || 0) + (stats.wrong || 0);
    const accuracy = total > 0 ? Math.round((stats.correct / total) * 100) : 0;
    
    return { ...stats, total, accuracy };
}

/**
 * Get global stats
 */
function getGlobalStats() {
    if (!statsData) initStats();
    const g = statsData.global;
    const total = g.correct + g.wrong;
    return {
        ...g,
        total,
        accuracy: total > 0 ? Math.round((g.correct / total) * 100) : 0
    };
}

/**
 * Get all spot stats sorted by various criteria
 */
function getSpotStats(sortBy = 'wrong') {
    if (!statsData) initStats();
    
    const spots = Object.entries(statsData.spots).map(([key, data]) => {
        const total = data.correct + data.wrong;
        return {
            key,
            name: data.name || key,
            correct: data.correct,
            wrong: data.wrong,
            total,
            accuracy: total > 0 ? Math.round((data.correct / total) * 100) : 0,
            lastPlayed: data.lastPlayed
        };
    });
    
    // Sort
    switch (sortBy) {
        case 'wrong':
            spots.sort((a, b) => b.wrong - a.wrong);
            break;
        case 'accuracy':
            spots.sort((a, b) => a.accuracy - b.accuracy); // Lowest first
            break;
        case 'total':
            spots.sort((a, b) => b.total - a.total);
            break;
        case 'recent':
            spots.sort((a, b) => b.lastPlayed - a.lastPlayed);
            break;
    }
    
    return spots;
}

/**
 * Get weak spots (spots with worst accuracy, min 5 attempts)
 */
function getWeakSpots(limit = 5) {
    const spots = getSpotStats('accuracy');
    return spots.filter(s => s.total >= 5).slice(0, limit);
}

/**
 * Get problem hands for a spot (hands with most mistakes)
 */
function getProblemHands(spotKey, limit = 10) {
    if (!statsData) initStats();
    
    const spotHands = statsData.hands[spotKey];
    if (!spotHands) return [];
    
    return Object.entries(spotHands)
        .map(([hand, data]) => ({
            hand,
            wrong: data.wrong,
            correct: data.correct,
            totalEvLoss: data.totalEvLoss,
            avgEvLoss: data.wrong > 0 ? (data.totalEvLoss / data.wrong).toFixed(2) : 0,
            lastWrongAction: data.lastWrongAction,
            correctAction: data.correctAction
        }))
        .sort((a, b) => b.totalEvLoss - a.totalEvLoss)
        .slice(0, limit);
}

/**
 * Get overall weak hands across all spots
 */
function getWeakestHands(limit = 10) {
    if (!statsData) initStats();
    
    const allHands = [];
    for (const [spotKey, hands] of Object.entries(statsData.hands)) {
        const spotName = statsData.spots[spotKey]?.name || spotKey;
        for (const [hand, data] of Object.entries(hands)) {
            if (data.wrong > 0) {
                allHands.push({
                    hand,
                    spot: spotName,
                    spotKey,
                    wrong: data.wrong,
                    totalEvLoss: data.totalEvLoss,
                    avgEvLoss: (data.totalEvLoss / data.wrong).toFixed(2),
                    correctAction: data.correctAction
                });
            }
        }
    }
    
    return allHands.sort((a, b) => b.totalEvLoss - a.totalEvLoss).slice(0, limit);
}

/**
 * Get recent session stats (last N answers)
 */
function getRecentStats(count = 50) {
    if (!historyData.length) return { correct: 0, wrong: 0, accuracy: 0, totalEvLoss: 0 };
    
    const recent = historyData.slice(-count);
    const correct = recent.filter(h => h.ok).length;
    const wrong = recent.length - correct;
    const totalEvLoss = recent.reduce((sum, h) => sum + (h.evLoss || 0), 0);
    
    return {
        correct,
        wrong,
        total: recent.length,
        accuracy: Math.round((correct / recent.length) * 100),
        totalEvLoss: totalEvLoss.toFixed(2)
    };
}

/**
 * Clear all stats (with confirmation)
 */
function clearAllStats() {
    statsData = createEmptyStats();
    historyData = [];
    saveStats();
}

// Initialize on load
initStats();

// Export for use in other files
window.StatsTracker = {
    recordAnswer,
    updateBestStreak,
    recordSessionStart,
    getGlobalStats,
    getSpotStats,
    getWeakSpots,
    getProblemHands,
    getWeakestHands,
    getRecentStats,
    clearAllStats
};
