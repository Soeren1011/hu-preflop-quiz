/**
 * PLO Range Quiz - Core Quiz Logic
 */

function startQuiz() {
    document.getElementById('spotSelector').style.display = 'none';
    document.getElementById('quizArea').classList.add('active');
    document.getElementById('globalStats').style.display = 'flex';
    // Apply mode constraints (single mode hides add-range)
    if (typeof applyModeToQuiz === 'function') applyModeToQuiz();
    rebuildHandIndices();
    currentQuestionIndex = 0;
    showQuestion();

    // Track session start for persistent stats
    if (typeof StatsTracker !== 'undefined') {
        StatsTracker.recordSessionStart();
    }
}

function endQuiz() {
    // Guest mode: redirect back to landing page
    if (window._guestMode) {
        window.location.href = window.location.origin || '/';
        return;
    }
    document.getElementById('quizArea').classList.remove('active');
    document.getElementById('globalStats').style.display = 'none';
    document.getElementById('spotSelector').style.display = 'block';
    quizModules.forEach(m => {
        const el = document.getElementById(`quizModule${m.id}`);
        if (el) el.remove();
    });
    quizModules = [];
    nextModuleId = 0;
    globalStats = { correct: 0, wrong: 0, streak: 0, bestStreak: 0 };
    document.getElementById('globalStreak').textContent = '0';
    const streakStat = document.querySelector('.streak-stat');
    if (streakStat) streakStat.classList.remove('on-fire');
    // Clear mistakes queue and hide UI
    if (typeof mistakesQueue !== 'undefined') {
        mistakesQueue = [];
        currentMistakeIndex = 0;
        mistakesStats = { correct: 0, total: 0 };
    }
    if (typeof showMistakeUI === 'function') showMistakeUI(false);
    // Restore mode selector UI
    if (typeof restoreModeOnEndQuiz === 'function') restoreModeOnEndQuiz();
    goToStep(1);
}

function rebuildHandIndices() {
    const primaryModule = quizModules.find(m => m.isPrimary);
    if (!primaryModule || !primaryModule.rangeData.length) {
        currentHandIndices = [];
        return;
    }

    let indices = [];
    primaryModule.rangeData.forEach((h, i) => {
        if (!isValidHand(h.notation)) return;

        // For follow-up spots (vs3Bet, vs4Bet): only include hands hero played before
        if (primaryModule.parentRangeData && primaryModule.parentRangeData[i]) {
            const parentHand = primaryModule.parentRangeData[i];
            const heroAction = primaryModule.heroActionType;

            // Check if hero would have played this hand in the parent spot
            if (heroAction === 'raise') {
                if ((parentHand.raise || 0) < 0.02) return; // Hero wouldn't have raised
            } else if (heroAction === 'call') {
                if ((parentHand.call || 0) < 0.02) return; // Hero wouldn't have called
            } else {
                // Unknown action type - check if played at all
                const parentWeight = (parentHand.call || 0) + (parentHand.raise || 0);
                if (parentWeight < 0.02) return;
            }
        }

        // Check if hand has any action in current range
        const totalWeight = (h.fold || 0) + (h.call || 0) + (h.raise || 0);
        if (totalWeight < 0.02) return;

        // EV filter: check if best EV is within range for primary module
        if (primaryModule.evFilterMin !== null || primaryModule.evFilterMax !== null) {
            const bestEv = getBestEvBB(h);
            if (primaryModule.evFilterMin !== null && bestEv < primaryModule.evFilterMin) return;
            if (primaryModule.evFilterMax !== null && bestEv > primaryModule.evFilterMax) return;
        }

        if (currentFilterExpr) {
            try {
                const tokens = tokenizeFilter(currentFilterExpr);
                const ast = parseFilterAST(tokens);
                if (matchFilterAST(analyzeHandForFilter(h.notation), ast)) indices.push(i);
            } catch (e) { indices.push(i); }
        } else {
            indices.push(i);
        }
    });

    currentHandIndices = shuffleArray(indices);
}

function showQuestion() {
    if (currentHandIndices.length === 0) {
        quizModules.forEach(module => {
            const handEl = document.getElementById(`moduleHand${module.id}`);
            if (handEl) handEl.innerHTML = '<div style="color:#888; font-size: 12px;">No hands match filter</div>';
        });
        return;
    }

    Object.keys(moduleExpandState).forEach(k => delete moduleExpandState[k]);

    allAnswered = false;
    const handIndex = currentHandIndices[currentQuestionIndex % currentHandIndices.length];
    const primaryModule = quizModules.find(m => m.isPrimary);
    const notation = primaryModule && primaryModule.rangeData[handIndex] ? primaryModule.rangeData[handIndex].notation : null;

    quizModules.forEach(module => {
        module.answered = false;
        if (notation) renderModuleHandCards(module.id, notation);

        const actionsEl = document.getElementById(`moduleActions${module.id}`);
        if (actionsEl) actionsEl.querySelectorAll('.module-action-btn').forEach(btn => btn.disabled = false);

        const resultEl = document.getElementById(`moduleResult${module.id}`);
        if (resultEl) resultEl.className = 'quiz-module-result';

        const heatmapEl = document.getElementById(`moduleHeatmap${module.id}`);
        if (heatmapEl) heatmapEl.classList.remove('visible');
        
        // Reset range info (will be shown after answer)
        if (typeof resetRangeInfo === 'function') {
            resetRangeInfo(module.id);
        }
    });

    document.getElementById('nextBtn').classList.remove('visible');

    // Preload heatmap data in background while user thinks
    preloadHeatmaps();
}

function renderModuleHandCards(moduleId, notation) {
    const container = document.getElementById(`moduleHand${moduleId}`);
    if (!container) return;

    const cards = [];
    for (let i = 0; i < notation.length; i += 2) {
        cards.push({ rank: notation[i], suit: notation[i + 1].toLowerCase() });
    }

    cards.sort((a, b) => RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank));

    let html = '';
    cards.forEach(card => {
        html += `<div class="module-card suit-${card.suit}"><span>${card.rank}</span><span class="suit-symbol">${SUIT_SYMBOLS[card.suit]}</span></div>`;
    });
    container.innerHTML = html;
}

function nextQuestion() {
    currentQuestionIndex = (currentQuestionIndex + 1) % currentHandIndices.length;
    showQuestion();
}

function setQuizMode(mode) {
    quizMode = mode;
    document.querySelectorAll('.quiz-mode-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.mode === mode));
}

// Apply or clear filter and reset quiz state
function setFilter(filterExpr = '') {
    const filterInput = document.getElementById('filterInput');
    if (filterInput) filterInput.value = filterExpr;
    currentFilterExpr = filterExpr;
    rebuildHandIndices();
    currentQuestionIndex = 0;
    quizModules.forEach(m => { m.stats = { correct: 0, wrong: 0 }; updateModuleStats(m.id); });
    updateGlobalStats();
    showQuestion();
}

function applyFilter() {
    setFilter(document.getElementById('filterInput')?.value || '');
}

function clearFilter() {
    setFilter('');
}
