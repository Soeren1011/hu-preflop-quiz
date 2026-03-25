/**
 * PLO4 Range Quiz - Training Plan Definitions
 * Predefined training sessions with spot matching
 */

const TRAINING_PLAN_CATEGORIES = [
    { id: 'position', name: 'Nach Position', desc: 'Eine Position meistern' },
    { id: 'scenario', name: 'Nach Szenario', desc: 'Ein Szenario durcharbeiten' },
    { id: 'curriculum', name: 'Curriculum', desc: '4-Wochen Trainingsplan' }
];

const TRAINING_PLANS = [
    // ========== Position Plans ==========
    {
        id: 'utg-mastery', name: 'UTG Mastery', category: 'position',
        description: 'Alle UTG Szenarien meistern',
        sessions: [
            { name: 'UTG RFI', spots: [{ position: 'UTG', scenario: 'RFI' }], targetHands: 50 },
            { name: 'UTG vs MP 3Bet', spots: [{ position: 'UTG', scenario: 'vs3BetAsRaiser', threeBettor: 'MP' }], targetHands: 50 },
            { name: 'UTG vs CO 3Bet', spots: [{ position: 'UTG', scenario: 'vs3BetAsRaiser', threeBettor: 'CO' }], targetHands: 50 },
            { name: 'UTG vs BB 3Bet', spots: [{ position: 'UTG', scenario: 'vs3BetAsRaiser', threeBettor: 'BB' }], targetHands: 50 }
        ]
    },
    {
        id: 'mp-mastery', name: 'MP Mastery', category: 'position',
        description: 'Alle MP Szenarien meistern',
        sessions: [
            { name: 'MP RFI', spots: [{ position: 'MP', scenario: 'RFI' }], targetHands: 50 },
            { name: 'MP vs UTG', spots: [{ position: 'MP', scenario: 'vsRFI', opener: 'UTG', callerCount: 0 }], targetHands: 50 },
            { name: 'MP vs CO 3Bet', spots: [{ position: 'MP', scenario: 'vs3BetAsRaiser', threeBettor: 'CO' }], targetHands: 50 },
            { name: 'MP vs BB 3Bet', spots: [{ position: 'MP', scenario: 'vs3BetAsRaiser', threeBettor: 'BB' }], targetHands: 50 }
        ]
    },
    {
        id: 'co-mastery', name: 'CO Mastery', category: 'position',
        description: 'Alle CO Szenarien meistern',
        sessions: [
            { name: 'CO RFI', spots: [{ position: 'CO', scenario: 'RFI' }], targetHands: 50 },
            { name: 'CO vs UTG', spots: [{ position: 'CO', scenario: 'vsRFI', opener: 'UTG', callerCount: 0 }], targetHands: 50 },
            { name: 'CO vs MP', spots: [{ position: 'CO', scenario: 'vsRFI', opener: 'MP', callerCount: 0 }], targetHands: 50 },
            { name: 'CO vs BTN 3Bet', spots: [{ position: 'CO', scenario: 'vs3BetAsRaiser', threeBettor: 'BTN' }], targetHands: 50 },
            { name: 'CO vs SB 3Bet', spots: [{ position: 'CO', scenario: 'vs3BetAsRaiser', threeBettor: 'SB' }], targetHands: 50 }
        ]
    },
    {
        id: 'btn-mastery', name: 'BTN Mastery', category: 'position',
        description: 'Alle BTN Szenarien meistern',
        sessions: [
            { name: 'BTN RFI', spots: [{ position: 'BTN', scenario: 'RFI' }], targetHands: 50 },
            { name: 'BTN vs UTG', spots: [{ position: 'BTN', scenario: 'vsRFI', opener: 'UTG', callerCount: 0 }], targetHands: 50 },
            { name: 'BTN vs CO', spots: [{ position: 'BTN', scenario: 'vsRFI', opener: 'CO', callerCount: 0 }], targetHands: 50 },
            { name: 'BTN vs SB 3Bet', spots: [{ position: 'BTN', scenario: 'vs3BetAsRaiser', threeBettor: 'SB' }], targetHands: 50 },
            { name: 'BTN vs BB 3Bet', spots: [{ position: 'BTN', scenario: 'vs3BetAsRaiser', threeBettor: 'BB' }], targetHands: 50 }
        ]
    },
    {
        id: 'sb-mastery', name: 'SB Mastery', category: 'position',
        description: 'Alle SB Szenarien meistern',
        sessions: [
            { name: 'SB RFI', spots: [{ position: 'SB', scenario: 'RFI' }], targetHands: 50 },
            { name: 'SB vs UTG', spots: [{ position: 'SB', scenario: 'vsRFI', opener: 'UTG', callerCount: 0 }], targetHands: 50 },
            { name: 'SB vs CO', spots: [{ position: 'SB', scenario: 'vsRFI', opener: 'CO', callerCount: 0 }], targetHands: 50 },
            { name: 'SB vs BTN', spots: [{ position: 'SB', scenario: 'vsRFI', opener: 'BTN', callerCount: 0 }], targetHands: 50 },
            { name: 'SB vs BB 3Bet', spots: [{ position: 'SB', scenario: 'vs3BetAsRaiser', threeBettor: 'BB' }], targetHands: 50 }
        ]
    },
    {
        id: 'bb-mastery', name: 'BB Mastery', category: 'position',
        description: 'Alle BB Szenarien meistern',
        sessions: [
            { name: 'BB vs UTG', spots: [{ position: 'BB', scenario: 'vsRFI', opener: 'UTG', callerCount: 0 }], targetHands: 50 },
            { name: 'BB vs MP', spots: [{ position: 'BB', scenario: 'vsRFI', opener: 'MP', callerCount: 0 }], targetHands: 50 },
            { name: 'BB vs CO', spots: [{ position: 'BB', scenario: 'vsRFI', opener: 'CO', callerCount: 0 }], targetHands: 50 },
            { name: 'BB vs BTN', spots: [{ position: 'BB', scenario: 'vsRFI', opener: 'BTN', callerCount: 0 }], targetHands: 50 },
            { name: 'BB vs SB', spots: [{ position: 'BB', scenario: 'vsRFI', opener: 'SB', callerCount: 0 }], targetHands: 50 }
        ]
    },

    // ========== Scenario Plans ==========
    {
        id: 'rfi-all', name: 'Alle RFI', category: 'scenario',
        description: 'Open Raise von jeder Position',
        sessions: [
            { name: 'UTG RFI', spots: [{ position: 'UTG', scenario: 'RFI' }], targetHands: 40 },
            { name: 'MP RFI', spots: [{ position: 'MP', scenario: 'RFI' }], targetHands: 40 },
            { name: 'CO RFI', spots: [{ position: 'CO', scenario: 'RFI' }], targetHands: 40 },
            { name: 'BTN RFI', spots: [{ position: 'BTN', scenario: 'RFI' }], targetHands: 40 },
            { name: 'SB RFI', spots: [{ position: 'SB', scenario: 'RFI' }], targetHands: 40 }
        ]
    },
    {
        id: 'bb-defense', name: 'BB Defense', category: 'scenario',
        description: 'BB vs alle Opener',
        sessions: [
            { name: 'BB vs UTG', spots: [{ position: 'BB', scenario: 'vsRFI', opener: 'UTG', callerCount: 0 }], targetHands: 50 },
            { name: 'BB vs MP', spots: [{ position: 'BB', scenario: 'vsRFI', opener: 'MP', callerCount: 0 }], targetHands: 50 },
            { name: 'BB vs CO', spots: [{ position: 'BB', scenario: 'vsRFI', opener: 'CO', callerCount: 0 }], targetHands: 50 },
            { name: 'BB vs BTN', spots: [{ position: 'BB', scenario: 'vsRFI', opener: 'BTN', callerCount: 0 }], targetHands: 50 },
            { name: 'BB vs SB', spots: [{ position: 'BB', scenario: 'vsRFI', opener: 'SB', callerCount: 0 }], targetHands: 50 }
        ]
    },
    {
        id: '3bet-training', name: '3-Bet Training', category: 'scenario',
        description: 'Facing 3-Bets als Raiser',
        sessions: [
            { name: 'UTG vs 3Bet', spots: [{ position: 'UTG', scenario: 'vs3BetAsRaiser', threeBettor: 'MP' }], targetHands: 50 },
            { name: 'CO vs BTN 3Bet', spots: [{ position: 'CO', scenario: 'vs3BetAsRaiser', threeBettor: 'BTN' }], targetHands: 50 },
            { name: 'BTN vs SB 3Bet', spots: [{ position: 'BTN', scenario: 'vs3BetAsRaiser', threeBettor: 'SB' }], targetHands: 50 },
            { name: 'BTN vs BB 3Bet', spots: [{ position: 'BTN', scenario: 'vs3BetAsRaiser', threeBettor: 'BB' }], targetHands: 50 }
        ]
    },
    {
        id: 'multiway-training', name: 'Multiway Training', category: 'scenario',
        description: 'Spots mit Cold Callern',
        sessions: [
            { name: 'BB +1 Caller', spots: [{ position: 'BB', scenario: 'vsRFIMulti' }], targetHands: 50 },
            { name: 'SB +1 Caller', spots: [{ position: 'SB', scenario: 'vsRFIMulti' }], targetHands: 50 },
            { name: 'BTN Overcall', spots: [{ position: 'BTN', scenario: 'vsRFIMulti' }], targetHands: 50 }
        ]
    },

    // ========== 4-Week Curriculum ==========
    {
        id: 'curriculum-w1', name: 'Woche 1: RFI', category: 'curriculum',
        description: 'RFI alle Positionen',
        sessions: [
            { name: 'Tag 1: UTG + MP', spots: [{ position: 'UTG', scenario: 'RFI' }, { position: 'MP', scenario: 'RFI' }], targetHands: 60 },
            { name: 'Tag 2: CO + BTN', spots: [{ position: 'CO', scenario: 'RFI' }, { position: 'BTN', scenario: 'RFI' }], targetHands: 60 },
            { name: 'Tag 3: SB + Review', spots: [{ position: 'SB', scenario: 'RFI' }], targetHands: 60 },
            { name: 'Tag 4: EP Wiederholung', spots: [{ position: 'UTG', scenario: 'RFI' }, { position: 'MP', scenario: 'RFI' }], targetHands: 80 },
            { name: 'Tag 5: LP Wiederholung', spots: [{ position: 'CO', scenario: 'RFI' }, { position: 'BTN', scenario: 'RFI' }], targetHands: 80 }
        ]
    },
    {
        id: 'curriculum-w2', name: 'Woche 2: Facing Opens', category: 'curriculum',
        description: 'Facing Opens Heads-Up',
        sessions: [
            { name: 'Tag 1: BB vs EP/MP', spots: [{ position: 'BB', scenario: 'vsRFI', opener: 'UTG', callerCount: 0 }, { position: 'BB', scenario: 'vsRFI', opener: 'MP', callerCount: 0 }], targetHands: 60 },
            { name: 'Tag 2: BB vs CO/BTN', spots: [{ position: 'BB', scenario: 'vsRFI', opener: 'CO', callerCount: 0 }, { position: 'BB', scenario: 'vsRFI', opener: 'BTN', callerCount: 0 }], targetHands: 60 },
            { name: 'Tag 3: SB vs Alle', spots: [{ position: 'SB', scenario: 'vsRFI', opener: 'UTG', callerCount: 0 }, { position: 'SB', scenario: 'vsRFI', opener: 'BTN', callerCount: 0 }], targetHands: 60 },
            { name: 'Tag 4: IP vs EP', spots: [{ position: 'CO', scenario: 'vsRFI', opener: 'UTG', callerCount: 0 }, { position: 'BTN', scenario: 'vsRFI', opener: 'UTG', callerCount: 0 }], targetHands: 60 },
            { name: 'Tag 5: IP vs LP', spots: [{ position: 'BTN', scenario: 'vsRFI', opener: 'CO', callerCount: 0 }], targetHands: 80 }
        ]
    },
    {
        id: 'curriculum-w3', name: 'Woche 3: 3-Bet Szenarien', category: 'curriculum',
        description: '3-Bet Pots meistern',
        sessions: [
            { name: 'Tag 1: EP vs 3Bet', spots: [{ position: 'UTG', scenario: 'vs3BetAsRaiser', threeBettor: 'MP' }, { position: 'UTG', scenario: 'vs3BetAsRaiser', threeBettor: 'BB' }], targetHands: 60 },
            { name: 'Tag 2: CO vs 3Bet', spots: [{ position: 'CO', scenario: 'vs3BetAsRaiser', threeBettor: 'BTN' }, { position: 'CO', scenario: 'vs3BetAsRaiser', threeBettor: 'SB' }], targetHands: 60 },
            { name: 'Tag 3: BTN vs 3Bet', spots: [{ position: 'BTN', scenario: 'vs3BetAsRaiser', threeBettor: 'SB' }, { position: 'BTN', scenario: 'vs3BetAsRaiser', threeBettor: 'BB' }], targetHands: 60 },
            { name: 'Tag 4: SB vs BB 3Bet', spots: [{ position: 'SB', scenario: 'vs3BetAsRaiser', threeBettor: 'BB' }], targetHands: 60 },
            { name: 'Tag 5: Mix Review', spots: [{ position: 'UTG', scenario: 'vs3BetAsRaiser', threeBettor: 'BB' }, { position: 'BTN', scenario: 'vs3BetAsRaiser', threeBettor: 'SB' }], targetHands: 80 }
        ]
    },
    {
        id: 'curriculum-w4', name: 'Woche 4: Multiway', category: 'curriculum',
        description: 'Multiway Szenarien',
        sessions: [
            { name: 'Tag 1: BB Multiway', spots: [{ position: 'BB', scenario: 'vsRFIMulti' }], targetHands: 50 },
            { name: 'Tag 2: SB Multiway', spots: [{ position: 'SB', scenario: 'vsRFIMulti' }], targetHands: 50 },
            { name: 'Tag 3: BTN Overcall', spots: [{ position: 'BTN', scenario: 'vsRFIMulti' }], targetHands: 50 },
            { name: 'Tag 4: RFI Review', spots: [{ position: 'UTG', scenario: 'RFI' }, { position: 'BTN', scenario: 'RFI' }], targetHands: 60 },
            { name: 'Tag 5: Final Mix', spots: [{ position: 'BB', scenario: 'vsRFI', opener: 'BTN', callerCount: 0 }, { position: 'BTN', scenario: 'vs3BetAsRaiser', threeBettor: 'SB' }], targetHands: 80 }
        ]
    }
];

/**
 * Match a spot criteria object against the available spots
 * Uses the same matching logic as quicklinks (findSpotByCriteria)
 */
function matchTrainingSpot(criteria) {
    if (typeof findSpotByCriteria === 'function') {
        return findSpotByCriteria(criteria);
    }
    // Fallback: manual matching
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
        if (criteria.callerCount !== undefined && (spot.callerCount || 0) !== criteria.callerCount) {
            return false;
        }
        return true;
    });
}

/**
 * Get all plans for a category, filtered by available spots
 */
function getAvailablePlans(category) {
    return TRAINING_PLANS
        .filter(p => !category || p.category === category)
        .filter(p => {
            // Plan is available if at least one session has matching spots
            return p.sessions.some(session =>
                session.spots.some(criteria => matchTrainingSpot(criteria))
            );
        });
}

/**
 * Get a specific plan by ID
 */
function getTrainingPlan(planId) {
    return TRAINING_PLANS.find(p => p.id === planId);
}

/**
 * Resolve all spots for a session, returning filenames
 */
function resolveSessionSpots(session) {
    const resolved = [];
    for (const criteria of session.spots) {
        const spot = matchTrainingSpot(criteria);
        if (spot) {
            resolved.push(spot);
        }
    }
    return resolved;
}
