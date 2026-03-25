/**
 * PLO Range Quiz - Hand Utilities
 * Hand index system, validation, and combo counting
 */

function isValidHand(notation) {
    if (!notation || notation.length !== 8) return false;
    const cards = new Set();
    for (let i = 0; i < 8; i += 2) {
        const card = notation.substring(i, i + 2).toLowerCase();
        if (cards.has(card)) return false;
        cards.add(card);
    }
    return true;
}

function indexToHand(idx) {
    if (idx <= RAINBOW_END) return indexToRainbow(idx);
    if (idx <= SINGLE_SUITED_END) return indexToSingleSuited(idx - SINGLE_SUITED_START);
    if (idx <= DOUBLE_SUITED_END) return indexToDoubleSuited(idx - DOUBLE_SUITED_START);
    if (idx <= TRIP_SUITED_END) return indexToTripSuited(idx - TRIP_SUITED_START);
    return indexToMonoton(idx - MONOTON_START);
}

function indexToRainbow(idx) {
    let current = 0;
    for (let s = 0; s < 13; s++) {
        for (let h = s; h < 13; h++) {
            for (let d = h; d < 13; d++) {
                const count = 13 - d;
                if (current + count > idx) {
                    const c = d + (idx - current);
                    return `${RANKS[c]}c${RANKS[d]}d${RANKS[h]}h${RANKS[s]}s`;
                }
                current += count;
            }
        }
    }
    return null;
}

function indexToSingleSuited(offset) {
    let current = 0;
    for (let s_low = 0; s_low < 13; s_low++) {
        for (let s_high = s_low + 1; s_high < 13; s_high++) {
            const pairSize = 91;
            if (current + pairSize > offset) {
                const innerOffset = offset - current;
                let innerCurrent = 0;
                for (let h = 0; h < 13; h++) {
                    const hCount = 13 - h;
                    if (innerCurrent + hCount > innerOffset) {
                        const d = h + (innerOffset - innerCurrent);
                        return `${RANKS[d]}d${RANKS[h]}h${RANKS[s_high]}s${RANKS[s_low]}s`;
                    }
                    innerCurrent += hCount;
                }
            }
            current += pairSize;
        }
    }
    return null;
}

function indexToDoubleSuited(offset) {
    let current = 0;
    for (let h_low = 0; h_low < 13; h_low++) {
        for (let h_high = h_low + 1; h_high < 13; h_high++) {
            for (let s_low = 0; s_low < 13; s_low++) {
                for (let s_high = s_low + 1; s_high < 13; s_high++) {
                    if (s_low > h_low || (s_low === h_low && s_high >= h_high)) {
                        if (current === offset) {
                            return `${RANKS[h_high]}h${RANKS[h_low]}h${RANKS[s_high]}s${RANKS[s_low]}s`;
                        }
                        current++;
                    }
                }
            }
        }
    }
    return null;
}

function indexToTripSuited(offset) {
    let current = 0;
    for (let s_low = 0; s_low < 13; s_low++) {
        for (let s_mid = s_low + 1; s_mid < 13; s_mid++) {
            for (let s_high = s_mid + 1; s_high < 13; s_high++) {
                for (let h = 0; h < 13; h++) {
                    if (current === offset) {
                        return `${RANKS[h]}h${RANKS[s_high]}s${RANKS[s_mid]}s${RANKS[s_low]}s`;
                    }
                    current++;
                }
            }
        }
    }
    return null;
}

function indexToMonoton(offset) {
    let current = 0;
    for (let r1 = 0; r1 < 13; r1++) {
        for (let r2 = r1 + 1; r2 < 13; r2++) {
            for (let r3 = r2 + 1; r3 < 13; r3++) {
                for (let r4 = r3 + 1; r4 < 13; r4++) {
                    if (current === offset) {
                        return `${RANKS[r4]}s${RANKS[r3]}s${RANKS[r2]}s${RANKS[r1]}s`;
                    }
                    current++;
                }
            }
        }
    }
    return null;
}

function getComboCount(notation) {
    if (!notation || notation.length !== 8) return 1;
    const suits = [];
    for (let i = 1; i < 8; i += 2) suits.push(notation[i]);
    const suitCounts = {};
    suits.forEach(s => { suitCounts[s] = (suitCounts[s] || 0) + 1; });
    const suitFreqs = Object.values(suitCounts).sort((a, b) => b - a);
    const pattern = suitFreqs.join('');
    switch (pattern) {
        case '1111': return 24;
        case '211': return 12;
        case '22': return 6;
        case '31': return 12;
        case '4': return 4;
        default: return 1;
    }
}

const comboCountCache = new Map();
function getCachedComboCount(notation) {
    if (!comboCountCache.has(notation)) {
        comboCountCache.set(notation, getComboCount(notation));
    }
    return comboCountCache.get(notation);
}

function readInt32BE(data, offset) {
    const val = (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];
    return val | 0;
}

async function loadBinaryRange(filename) {
    const encodedFilename = encodeURIComponent(filename);
    // Handle both absolute URLs (https://...) and relative paths
    const url = RANGES_PATH.startsWith('http')
        ? `${RANGES_PATH}/${encodedFilename}`
        : `/${RANGES_PATH}/${encodedFilename}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load ${filename}`);

    const compressed = await response.arrayBuffer();
    const data = pako.inflate(new Uint8Array(compressed));

    const nActions = data[0];
    const hands = [];

    if (nActions === 1) {
        for (let i = 0; i < 16432; i++) {
            const o = 1 + i * 5;
            hands.push({
                index: i,
                notation: indexToHand(i),
                fold: 0, call: 0,
                raise: data[o] / 200,
                ev_raise: readInt32BE(data, o + 1)
            });
        }
    } else if (nActions === 2) {
        for (let i = 0; i < 16432; i++) {
            const o = 1 + i * 10;
            hands.push({
                index: i,
                notation: indexToHand(i),
                fold: data[o] / 200,
                call: 0,
                raise: data[o + 1] / 200,
                ev_fold: readInt32BE(data, o + 2),
                ev_raise: readInt32BE(data, o + 6)
            });
        }
    } else if (nActions === 3) {
        for (let i = 0; i < 16432; i++) {
            const o = 1 + i * 15;
            hands.push({
                index: i,
                notation: indexToHand(i),
                call: data[o] / 200,
                fold: data[o + 1] / 200,
                raise: data[o + 2] / 200,
                ev_call: readInt32BE(data, o + 3),
                ev_fold: readInt32BE(data, o + 7),
                ev_raise: readInt32BE(data, o + 11)
            });
        }
    }

    return { nActions, hands };
}
