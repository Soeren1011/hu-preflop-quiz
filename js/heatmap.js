/**
 * PLO Range Quiz - Heatmap Rendering
 */

const moduleExpandState = {};

// Precomputed heatmap data cache (computed in background before user answers)
const precomputedHeatmaps = {};

/**
 * Precompute heatmap data for a module in the background.
 * Called from showQuestion() to prepare data before user answers.
 */
function precomputeModuleHeatmap(moduleId, handIndex) {
    const module = quizModules.find(m => m.id === moduleId);
    if (!module || !module.rangeData[handIndex]) return;

    const currentHand = module.rangeData[handIndex];
    const currentAnalysis = analyzeHandForFilter(currentHand.notation);

    // Compute heatmap data in chunks to avoid blocking UI
    const heatmapData = {};
    HEATMAP_Y_CATEGORIES.forEach(ycat => {
        heatmapData[ycat.key] = {};
        HEATMAP_X_CATEGORIES.forEach(xcat => {
            heatmapData[ycat.key][xcat.key] = { total: 0, fold: 0, call: 0, raise: 0, ev: 0, handCount: 0, combos: 0 };
        });
    });

    // Process range data
    module.rangeData.forEach(h => {
        if (h.fold === 0 && h.call === 0 && h.raise === 0) return;
        if (!isValidHand(h.notation)) return;
        const analysis = analyzeHandForFilter(h.notation);
        const best = getBestAction(h);
        const ev = h[`ev_${best}`] || 0;

        HEATMAP_Y_CATEGORIES.forEach(ycat => {
            if (!ycat.filter || matchFilterAST(analysis, parseFilterAST(tokenizeFilter(ycat.filter)))) {
                HEATMAP_X_CATEGORIES.forEach(xcat => {
                    if (!xcat.filter || matchFilterAST(analysis, parseFilterAST(tokenizeFilter(xcat.filter)))) {
                        const cell = heatmapData[ycat.key][xcat.key];
                        const combos = getCachedComboCount(h.notation);
                        cell.total += (h.fold + h.call + h.raise) * combos;
                        cell.fold += h.fold * combos;
                        cell.call += h.call * combos;
                        cell.raise += h.raise * combos;
                        cell.ev += ev * combos;
                        cell.handCount++;
                        cell.combos += combos;
                    }
                });
            }
        });
    });

    // Store precomputed data
    precomputedHeatmaps[moduleId] = {
        handIndex,
        heatmapData,
        currentHand,
        currentAnalysis,
        currentYKey: getHandYCategory(currentAnalysis),
        currentXKey: getHandXCategory(currentAnalysis)
    };
}

/**
 * Start preloading heatmaps for all modules.
 * Uses requestIdleCallback for non-blocking execution.
 */
function preloadHeatmaps() {
    if (currentHandIndices.length === 0) return;
    const handIndex = currentHandIndices[currentQuestionIndex % currentHandIndices.length];

    quizModules.forEach(module => {
        // Clear old precomputed data
        delete precomputedHeatmaps[module.id];

        // Schedule precomputation (use requestIdleCallback if available, else setTimeout)
        if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback(() => precomputeModuleHeatmap(module.id, handIndex), { timeout: 500 });
        } else {
            setTimeout(() => precomputeModuleHeatmap(module.id, handIndex), 50);
        }
    });
}

function getHandYCategory(analysis) {
    if (!analysis) return 'total';
    const rankCounts = analysis.rankCounts || {};
    const isRundown = analysis.isRundown || false;

    const pairs = Object.entries(rankCounts)
        .filter(([r, c]) => c >= 2)
        .map(([r]) => r)
        .sort((a, b) => RANK_ORDER.indexOf(a) - RANK_ORDER.indexOf(b));

    // Paired hands
    if (pairs.length > 0) {
        const highPair = pairs[0];
        if (highPair === 'A') return 'AA';
        if (highPair === 'K') return 'KK';
        if (highPair === 'Q' || highPair === 'J' || highPair === 'T') return 'QQ-TT';
        return '99-';
    }

    // Unpaired - get sorted ranks
    const sortedRanks = Object.keys(rankCounts)
        .sort((a, b) => RANK_ORDER.indexOf(a) - RANK_ORDER.indexOf(b));
    const high1 = sortedRanks[0] || '';
    const high2 = sortedRanks[1] || '';

    // A-high
    if (high1 === 'A') {
        if (isRundown) return 'A-run';
        if (high2 === 'K') return 'AK';
        if (high2 === 'Q') return 'AQ';
        if (high2 === 'J') return 'AJ';
        return 'AT-';
    }
    // K-high
    if (high1 === 'K') {
        if (isRundown) return 'K-run';
        if (high2 === 'Q') return 'KQ';
        if (high2 === 'J') return 'KJ';
        return 'KT-';
    }
    // Q-high
    if (high1 === 'Q') {
        if (isRundown) return 'Q-run';
        if (high2 === 'J') return 'QJ';
        return 'QT-';
    }
    // J-high
    if (high1 === 'J') {
        if (isRundown) return 'J-run';
        if (high2 === 'T') return 'JT';
        return 'J9-';
    }
    // T-low
    if (isRundown) return 'T-run';
    return 'T-low';
}

function getHandXCategory(analysis) {
    if (!analysis) return 'total';
    const suitedPairCount = analysis.suitedPairCount || 0;
    const hasNutSuit = analysis.hasNutSuit || false;
    const maxSuitCount = analysis.maxSuitCount || 0;

    if (maxSuitCount === 4) return 'monotone';
    if (suitedPairCount >= 2 && maxSuitCount === 2) {
        return hasNutSuit ? 'ds_nut' : 'ds_nonnut';
    }
    if (maxSuitCount === 3) {
        return hasNutSuit ? 'ts_nut' : 'ts_nonnut';
    }
    if (suitedPairCount === 1 && maxSuitCount === 2) {
        return hasNutSuit ? 'ss_nut' : 'ss_nonnut';
    }
    if (maxSuitCount === 1) return 'rainbow';
    return 'total';
}

function getExpandedCategoriesForHand(currentYKey) {
    const expanded = new Set();
    const currentIdx = HEATMAP_Y_CATEGORIES.findIndex(c => c.key === currentYKey);
    if (currentIdx === -1) return expanded;

    const currentLevel = HEATMAP_Y_CATEGORIES[currentIdx].level || 0;
    let targetLevel = currentLevel - 1;
    for (let i = currentIdx - 1; i >= 0 && targetLevel >= 0; i--) {
        const cat = HEATMAP_Y_CATEGORIES[i];
        const level = cat.level || 0;
        if (level === targetLevel) {
            expanded.add(cat.key);
            targetLevel--;
        }
    }
    expanded.add(currentYKey);
    return expanded;
}

function isDirectChild(parent, child, categories, parentIdx) {
    const parentLevel = parent.level || 0;
    const childLevel = child.level || 0;
    if (childLevel !== parentLevel + 1) return false;
    const childIdx = categories.indexOf(child);
    for (let i = parentIdx + 1; i < childIdx; i++) {
        if ((categories[i].level || 0) <= parentLevel) return false;
    }
    return true;
}

function isCategoryVisible(category, idx, expandedCategories, categories) {
    const level = category.level || 0;
    if (level === 0) return true;
    if (level === 1) return true;
    for (let i = idx - 1; i >= 0; i--) {
        const parentLevel = categories[i].level || 0;
        if (parentLevel === level - 1) {
            return expandedCategories.has(categories[i].key);
        }
        if (parentLevel < level - 1) return false;
    }
    return false;
}

function getHandPattern(analysis) {
    if (!analysis) return '';
    const rankCounts = analysis.rankCounts || {};
    const pairs = Object.entries(rankCounts)
        .filter(([r, c]) => c >= 2)
        .map(([r]) => r)
        .sort((a, b) => RANK_ORDER.indexOf(a) - RANK_ORDER.indexOf(b));

    if (pairs.length > 0) return pairs[0] + pairs[0];
    const sortedRanks = (analysis.ranks || [])
        .slice()
        .sort((a, b) => RANK_ORDER.indexOf(a) - RANK_ORDER.indexOf(b));
    return sortedRanks[0] + sortedRanks[1];
}

function renderModuleHeatmap(moduleId, currentHand, customExpandState = null) {
    const module = quizModules.find(m => m.id === moduleId);
    if (!module) return;

    const heatmapEl = document.getElementById(`moduleHeatmap${moduleId}`);
    heatmapEl.classList.add('visible');

    const table = document.getElementById(`moduleHeatmapTable${moduleId}`);
    const handIndex = currentHandIndices[currentQuestionIndex % currentHandIndices.length];

    // Check if we have precomputed data for this exact hand
    const precomputed = precomputedHeatmaps[moduleId];
    let heatmapData, currentAnalysis, currentYKey, currentXKey;

    if (precomputed && precomputed.handIndex === handIndex) {
        // Use precomputed data (fast path)
        heatmapData = precomputed.heatmapData;
        currentAnalysis = precomputed.currentAnalysis;
        currentYKey = precomputed.currentYKey;
        currentXKey = precomputed.currentXKey;
    } else {
        // Compute on-demand (fallback)
        currentAnalysis = analyzeHandForFilter(currentHand.notation);
        currentYKey = getHandYCategory(currentAnalysis);
        currentXKey = getHandXCategory(currentAnalysis);

        heatmapData = {};
        HEATMAP_Y_CATEGORIES.forEach(ycat => {
            heatmapData[ycat.key] = {};
            HEATMAP_X_CATEGORIES.forEach(xcat => {
                heatmapData[ycat.key][xcat.key] = { total: 0, fold: 0, call: 0, raise: 0, ev: 0, handCount: 0, combos: 0 };
            });
        });

        module.rangeData.forEach(h => {
            if (h.fold === 0 && h.call === 0 && h.raise === 0) return;
            if (!isValidHand(h.notation)) return;
            const analysis = analyzeHandForFilter(h.notation);
            const best = getBestAction(h);
            const ev = h[`ev_${best}`] || 0;

            HEATMAP_Y_CATEGORIES.forEach(ycat => {
                if (!ycat.filter || matchFilterAST(analysis, parseFilterAST(tokenizeFilter(ycat.filter)))) {
                    HEATMAP_X_CATEGORIES.forEach(xcat => {
                        if (!xcat.filter || matchFilterAST(analysis, parseFilterAST(tokenizeFilter(xcat.filter)))) {
                            const cell = heatmapData[ycat.key][xcat.key];
                            const combos = getCachedComboCount(h.notation);
                            cell.total += (h.fold + h.call + h.raise) * combos;
                            cell.fold += h.fold * combos;
                            cell.call += h.call * combos;
                            cell.raise += h.raise * combos;
                            cell.ev += ev * combos;
                            cell.handCount++;
                            cell.combos += combos;
                        }
                    });
                }
            });
        });
    }
    const expandedCategories = customExpandState || getExpandedCategoriesForHand(currentYKey);

    const tableDisplay = showHeatmap ? '' : 'none';
    table.style.display = tableDisplay;

    let html = '<thead><tr><th class="y-axis-header"></th>';
    HEATMAP_X_CATEGORIES.forEach(xcat => html += `<th class="x-axis-header">${xcat.name}</th>`);
    html += '</tr></thead><tbody>';

    HEATMAP_Y_CATEGORIES.forEach((ycat, idx) => {
        const level = ycat.level || 0;
        const hasChildren = HEATMAP_Y_CATEGORIES.some((c, i) => i > idx && (c.level || 0) > level && isDirectChild(ycat, c, HEATMAP_Y_CATEGORIES, idx));
        const isExpanded = expandedCategories.has(ycat.key);
        const isVisible = isCategoryVisible(ycat, idx, expandedCategories, HEATMAP_Y_CATEGORIES);

        const collapsedClass = !isVisible ? ' collapsed' : '';
        const levelClass = ` level-${level}`;

        const icon = hasChildren ? (isExpanded ? '▼' : '▶') : '';
        const expandClick = hasChildren ? `toggleHeatmapCategory('${moduleId}', '${ycat.key}');event.stopPropagation();` : '';

        html += `<tr class="heatmap-row${levelClass}${collapsedClass}" data-key="${ycat.key}" data-level="${level}">`;
        html += `<td class="y-axis-header">
            <span class="collapse-icon" onclick="${expandClick}">${icon}</span>${ycat.name.trim()}
        </td>`;

        HEATMAP_X_CATEGORIES.forEach(xcat => {
            const cell = heatmapData[ycat.key][xcat.key];
            const isCurrent = ycat.key === currentYKey && xcat.key === currentXKey;
            const cellClick = cell.total > 0 ? `onclick="showCategoryHands('${moduleId}', '${ycat.key}', '${xcat.key}')"` : '';
            const clickableClass = cell.total > 0 ? ' clickable' : '';
            if (cell.total === 0) {
                html += '<td><div class="heatmap-cell"></div></td>';
            } else {
                const foldPct = (cell.fold / cell.total * 100);
                const callPct = (cell.call / cell.total * 100);
                const raisePct = (cell.raise / cell.total * 100);
                const avgEv = formatEV(cell.ev / cell.total);
                html += `<td ${cellClick}><div class="heatmap-cell${isCurrent ? ' current' : ''}${clickableClass}" data-ykey="${ycat.key}" data-xkey="${xcat.key}">
                    <div class="heatmap-bar">
                        <div class="heatmap-bar-fold" style="width:${foldPct}%"></div>
                        <div class="heatmap-bar-call" style="width:${callPct}%"></div>
                        <div class="heatmap-bar-raise" style="width:${raisePct}%"></div>
                    </div>
                    <span class="heatmap-cell-ev">${avgEv}</span>
                </div></td>`;
            }
        });
        html += '</tr>';
    });

    html += '</tbody>';
    table.innerHTML = html;

    // Auto-select current hand's category and highlight it
    moduleSelectedCategory[moduleId] = { y: currentYKey, x: currentXKey };
    highlightCategoryCell(moduleId, currentYKey, currentXKey);
    renderModuleHandsGrid(moduleId, currentHand);
}

// Store selected category per module (now stores both Y and X)
const moduleSelectedCategory = {};

function showCategoryHands(moduleId, yCategory, xCategory) {
    moduleId = parseInt(moduleId); // Convert from string (from onclick)
    moduleSelectedCategory[moduleId] = { y: yCategory, x: xCategory };
    highlightCategoryCell(moduleId, yCategory, xCategory);

    const module = quizModules.find(m => m.id === moduleId);
    if (!module) return;

    const handIndex = currentHandIndices[currentQuestionIndex % currentHandIndices.length];
    const hand = module.rangeData[handIndex];
    if (hand) renderModuleHandsGrid(moduleId, hand, yCategory, xCategory);
}

function highlightCategoryCell(moduleId, yKey, xKey) {
    const table = document.getElementById(`moduleHeatmapTable${moduleId}`);
    if (!table) return;

    // Remove previous selection
    table.querySelectorAll('.heatmap-cell.selected').forEach(cell => cell.classList.remove('selected'));

    // Add selection to clicked cell
    const cell = table.querySelector(`.heatmap-cell[data-ykey="${yKey}"][data-xkey="${xKey}"]`);
    if (cell) cell.classList.add('selected');
}

function renderModuleHandsGrid(moduleId, currentHand, forcedYCategory = null, forcedXCategory = null) {
    const module = quizModules.find(m => m.id === moduleId);
    if (!module) return;

    const grid = document.getElementById(`moduleHandsGrid${moduleId}`);
    grid.style.display = showMatchingHands ? '' : 'none';
    if (!showMatchingHands) return;

    const currentAnalysis = analyzeHandForFilter(currentHand.notation);
    const currentYCategory = forcedYCategory || getHandYCategory(currentAnalysis);
    const currentXCategory = forcedXCategory || getHandXCategory(currentAnalysis);

    // Show hands matching both Y category (ranks) and X category (suits)
    let similarHands = module.rangeData.filter(h => {
        if (h.fold === 0 && h.call === 0 && h.raise === 0) return false;
        if (!isValidHand(h.notation)) return false;
        const hAnalysis = analyzeHandForFilter(h.notation);
        const matchesY = getHandYCategory(hAnalysis) === currentYCategory;
        const matchesX = getHandXCategory(hAnalysis) === currentXCategory;
        return matchesY && matchesX;
    });

    similarHands.sort((a, b) => {
        const ranksA = getSortedRanksArray(a.notation);
        const ranksB = getSortedRanksArray(b.notation);
        for (let i = 0; i < 4; i++) {
            const diff = RANK_ORDER.indexOf(ranksA[i]) - RANK_ORDER.indexOf(ranksB[i]);
            if (diff !== 0) return diff;
        }
        return 0;
    });

    // Get category display names
    const yCatInfo = HEATMAP_Y_CATEGORIES.find(c => c.key === currentYCategory);
    const xCatInfo = HEATMAP_X_CATEGORIES.find(c => c.key === currentXCategory);
    const yName = yCatInfo ? yCatInfo.name.trim() : currentYCategory;
    const xName = xCatInfo ? xCatInfo.name.trim() : currentXCategory;
    const catName = `${yName} / ${xName}`;

    let html = `<div class="hands-grid-label">${catName} <span class="hands-count">(${similarHands.length})</span></div>`;
    similarHands.forEach(h => {
        const best = getBestAction(h);
        const isCurrent = h.index === currentHand.index;
        const ev = formatEV(h[`ev_${best}`]);
        const foldPct = (h.fold * 100).toFixed(0);
        const callPct = (h.call * 100).toFixed(0);
        const raisePct = (h.raise * 100).toFixed(0);
        const tooltip = `F:${foldPct}% C:${callPct}% R:${raisePct}% EV:${ev}`;
        html += `<div class="hand-cell ${best}${isCurrent ? ' current' : ''}" title="${tooltip}">
            ${formatCardNotation(h.notation)}
            <span class="hand-ev">${ev}</span>
        </div>`;
    });

    grid.innerHTML = html;
}

function toggleHeatmapCategory(moduleId, categoryKey) {
    moduleId = parseInt(moduleId);
    const table = document.getElementById(`moduleHeatmapTable${moduleId}`);
    if (!table) return;

    // Find category index and level
    const catIdx = HEATMAP_Y_CATEGORIES.findIndex(c => c.key === categoryKey);
    if (catIdx === -1) return;
    const parentLevel = HEATMAP_Y_CATEGORIES[catIdx].level || 0;

    // Find all direct children rows
    const childRows = [];
    for (let i = catIdx + 1; i < HEATMAP_Y_CATEGORIES.length; i++) {
        const childLevel = HEATMAP_Y_CATEGORIES[i].level || 0;
        if (childLevel <= parentLevel) break;
        if (childLevel === parentLevel + 1) {
            const row = table.querySelector(`.heatmap-row[data-key="${HEATMAP_Y_CATEGORIES[i].key}"]`);
            if (row) childRows.push({ row, key: HEATMAP_Y_CATEGORIES[i].key, idx: i });
        }
    }

    if (childRows.length === 0) return;

    // Check if expanding or collapsing
    const isExpanding = childRows[0].row.classList.contains('collapsed');

    // Update expand state
    if (!moduleExpandState[moduleId]) moduleExpandState[moduleId] = {};
    moduleExpandState[moduleId][categoryKey] = isExpanding;

    // Update collapse icon
    const parentRow = table.querySelector(`.heatmap-row[data-key="${categoryKey}"]`);
    const icon = parentRow?.querySelector('.collapse-icon');
    if (icon) icon.textContent = isExpanding ? '▼' : '▶';

    if (isExpanding) {
        // Expanding: remove collapsed, add expanding animation
        childRows.forEach(({ row }) => {
            row.classList.remove('collapsed');
            row.classList.add('expanding');
            setTimeout(() => row.classList.remove('expanding'), 150);
        });
    } else {
        // Collapsing: add collapsing class, then collapsed after animation
        const allDescendants = getDescendantRows(table, catIdx, parentLevel);
        allDescendants.forEach(row => {
            row.classList.add('collapsing');
            setTimeout(() => {
                row.classList.remove('collapsing');
                row.classList.add('collapsed');
            }, 150);
        });
    }
}

function getDescendantRows(table, parentIdx, parentLevel) {
    const rows = [];
    for (let i = parentIdx + 1; i < HEATMAP_Y_CATEGORIES.length; i++) {
        const childLevel = HEATMAP_Y_CATEGORIES[i].level || 0;
        if (childLevel <= parentLevel) break;
        const row = table.querySelector(`.heatmap-row[data-key="${HEATMAP_Y_CATEGORIES[i].key}"]`);
        if (row) rows.push(row);
    }
    return rows;
}
