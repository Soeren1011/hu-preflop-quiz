/**
 * PLO Range Quiz - Filter System
 */

// Pre-allocated empty result for invalid inputs (avoid object creation)
const EMPTY_ANALYSIS = Object.freeze({
    cards: [], ranks: [], suits: [], rankCounts: {}, suitCounts: {},
    hasPair: false, hasDoublePair: false, suitedPairCount: 0, suitedPairs: [],
    hasNutSuit: false, nutSuitCount: 0, suitednessCategory: 'rainbow', maxSuitCount: 0, uniqueSuits: 0,
    isRundown: false
});

function analyzeHandForFilter(notation) {
    if (!notation || notation.length < 8) return EMPTY_ANALYSIS;

    // Single pass: extract all info at once
    const rankCounts = {};
    const suitCounts = {};
    const suitHasAce = {};  // Track if each suit has an ace
    const ranks = [];

    for (let i = 0; i < 8; i += 2) {
        const rank = notation.charCodeAt(i);
        const rankUpper = rank >= 97 ? String.fromCharCode(rank - 32) : notation[i]; // Fast toUpperCase
        const suit = notation[i + 1];

        rankCounts[rankUpper] = (rankCounts[rankUpper] || 0) + 1;
        suitCounts[suit] = (suitCounts[suit] || 0) + 1;
        ranks.push(rankUpper);

        if (rankUpper === 'A') suitHasAce[suit] = true;
    }

    // Calculate pair info in single pass over rankCounts
    let hasPair = false;
    let pairCount = 0;
    for (const r in rankCounts) {
        if (rankCounts[r] >= 2) {
            hasPair = true;
            if (rankCounts[r] === 2) pairCount++;
        }
    }
    const hasDoublePair = pairCount >= 2;

    // Calculate suit info in single pass over suitCounts
    let maxSuitCount = 0;
    let uniqueSuits = 0;
    let suitedPairCount = 0;
    let hasNutSuit = false;
    let nutSuitCount = 0;

    for (const s in suitCounts) {
        const count = suitCounts[s];
        uniqueSuits++;
        if (count > maxSuitCount) maxSuitCount = count;
        if (count >= 2) {
            suitedPairCount++;
            if (suitHasAce[s]) {
                hasNutSuit = true;
                nutSuitCount++;
            }
        }
    }

    // Determine suitedness category
    let suitednessCategory = 'rainbow';
    if (maxSuitCount === 4) suitednessCategory = 'monotone';
    else if (maxSuitCount === 3) suitednessCategory = 'tripleSuited';
    else if (maxSuitCount === 2 && uniqueSuits === 2) suitednessCategory = 'doubleSuited';
    else if (maxSuitCount === 2 && uniqueSuits === 3) suitednessCategory = 'singleSuited';

    // Detect rundowns (4 cards within 5-rank span, no pair)
    let isRundown = false;
    if (!hasPair) {
        const uniqueRanks = Object.keys(rankCounts);
        if (uniqueRanks.length === 4) {
            const indices = uniqueRanks.map(r => RANK_ORDER.indexOf(r)).sort((a, b) => a - b);
            const span = indices[3] - indices[0];
            isRundown = span <= 4; // 4 cards within 5 ranks (e.g., KQJT, JT98)
        }
    }

    return {
        rankCounts, suitCounts, ranks, hasPair, hasDoublePair,
        suitedPairCount, hasNutSuit, nutSuitCount,
        suitednessCategory, maxSuitCount, uniqueSuits, isRundown
    };
}

function tokenizeFilter(expr) {
    const tokens = [];
    let i = 0;
    while (i < expr.length) {
        const char = expr[i];
        if (/\s/.test(char)) { i++; continue; }
        if (char === ':') { tokens.push({ type: 'AND' }); i++; }
        else if (char === ',') { tokens.push({ type: 'OR' }); i++; }
        else if (char === '!') { tokens.push({ type: 'NOT' }); i++; }
        else if (char === '$') {
            let mod = '$';
            i++;
            while (i < expr.length && /[a-z0-9]/i.test(expr[i])) { mod += expr[i]; i++; }
            tokens.push({ type: 'MODIFIER', value: mod.toLowerCase() });
        }
        else if (/[AKQJT2-9R]/i.test(char)) {
            let pattern = char.toUpperCase();
            i++;
            while (i < expr.length && /[AKQJTcdhs2-9RO0]/i.test(expr[i])) {
                pattern += expr[i].toUpperCase() === '0' ? 'O' : expr[i].toUpperCase();
                i++;
            }
            if (pattern === 'RR') tokens.push({ type: 'PAIR' });
            else if (pattern === 'RROO') tokens.push({ type: 'DOUBLE_PAIR' });
            else tokens.push({ type: 'RANK_PATTERN', value: pattern });
        }
        else { i++; }
    }
    return tokens;
}

function parseFilterAST(tokens) {
    let pos = 0;
    function parseOr() {
        let left = parseAnd();
        while (pos < tokens.length && tokens[pos].type === 'OR') { pos++; left = { type: 'OR', left, right: parseAnd() }; }
        return left;
    }
    function parseAnd() {
        let left = parseUnary();
        while (pos < tokens.length && (tokens[pos].type === 'AND' || tokens[pos].type === 'NOT' || tokens[pos].type === 'MODIFIER' || tokens[pos].type === 'RANK_PATTERN' || tokens[pos].type === 'PAIR' || tokens[pos].type === 'DOUBLE_PAIR')) {
            if (tokens[pos].type === 'AND') { pos++; }
            left = { type: 'AND', left, right: parseUnary() };
        }
        return left;
    }
    function parseUnary() {
        if (pos < tokens.length && tokens[pos].type === 'NOT') { pos++; return { type: 'NOT', operand: parseUnary() }; }
        return parsePrimary();
    }
    function parsePrimary() {
        if (pos >= tokens.length) return { type: 'TRUE' };
        const t = tokens[pos];
        if (t.type === 'MODIFIER') { pos++; return { type: 'MODIFIER', value: t.value }; }
        if (t.type === 'RANK_PATTERN') { pos++; return { type: 'RANK_PATTERN', value: t.value }; }
        if (t.type === 'PAIR') { pos++; return { type: 'PAIR' }; }
        if (t.type === 'DOUBLE_PAIR') { pos++; return { type: 'DOUBLE_PAIR' }; }
        return { type: 'TRUE' };
    }
    return tokens.length === 0 ? { type: 'TRUE' } : parseOr();
}

function matchFilterAST(analysis, ast) {
    if (!ast) return true;
    switch (ast.type) {
        case 'TRUE': return true;
        case 'AND': return matchFilterAST(analysis, ast.left) && matchFilterAST(analysis, ast.right);
        case 'OR': return matchFilterAST(analysis, ast.left) || matchFilterAST(analysis, ast.right);
        case 'NOT': return !matchFilterAST(analysis, ast.operand);
        case 'MODIFIER': return matchModifier(analysis, ast.value);
        case 'RANK_PATTERN': return matchRankPattern(analysis, ast.value);
        case 'PAIR': return analysis.hasPair;
        case 'DOUBLE_PAIR': return analysis.hasDoublePair;
        default: return true;
    }
}

function matchModifier(analysis, mod) {
    switch (mod) {
        case '$np': return !analysis.hasPair;
        case '$ss': return analysis.suitedPairCount === 1;
        case '$ssn': return analysis.suitedPairCount === 1 && analysis.hasNutSuit;
        case '$ssnn': return analysis.suitedPairCount === 1 && !analysis.hasNutSuit;
        case '$ssp': return analysis.suitedPairCount === 1 && analysis.maxSuitCount === 2;
        case '$sspn': return analysis.suitedPairCount === 1 && analysis.maxSuitCount === 2 && analysis.hasNutSuit;
        case '$sspnn': return analysis.suitedPairCount === 1 && analysis.maxSuitCount === 2 && !analysis.hasNutSuit;
        case '$ds': return analysis.suitedPairCount >= 2 && analysis.maxSuitCount === 2;
        case '$dsn': return analysis.suitedPairCount >= 2 && analysis.maxSuitCount === 2 && analysis.nutSuitCount >= 1;
        case '$dsnn': return analysis.suitedPairCount >= 2 && analysis.maxSuitCount === 2 && analysis.nutSuitCount === 0;
        case '$ts': return analysis.maxSuitCount === 3;
        case '$tsn': return analysis.maxSuitCount === 3 && analysis.hasNutSuit;
        case '$tsnn': return analysis.maxSuitCount === 3 && !analysis.hasNutSuit;
        case '$ms': case '$qs': return analysis.maxSuitCount === 4;
        case '$rb': return analysis.suitednessCategory === 'rainbow';
        case '$run': case '$wrap': return analysis.isRundown;
        default: return false;
    }
}

function matchRankPattern(analysis, pattern) {
    const requiredRankCounts = {};
    for (let i = 0; i < pattern.length; i++) {
        const c = pattern[i];
        if (/[AKQJT2-9]/.test(c)) {
            requiredRankCounts[c] = (requiredRankCounts[c] || 0) + 1;
        }
    }
    for (const [rank, count] of Object.entries(requiredRankCounts)) {
        if ((analysis.rankCounts[rank] || 0) < count) return false;
    }
    return true;
}
