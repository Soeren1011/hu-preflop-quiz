/**
 * PLO Range Quiz - Answer Submission & Stats
 */

function submitModuleAnswer(moduleId, action) {
    const module = quizModules.find(m => m.id === moduleId);
    if (!module || module.answered) return;

    module.answered = true;
    const handIndex = currentHandIndices[currentQuestionIndex % currentHandIndices.length];
    const hand = module.rangeData[handIndex];

    if (!hand) {
        showModuleResult(moduleId, null, action);
        return;
    }

    const best = getBestAction(hand);
    const isCorrect = quizMode === 'gto' ? (action === best) : (hand[action] > 0);

    // Calculate EV loss for stats tracking
    let evLoss = 0;
    if (!isCorrect && hand[`ev_${best}`] !== undefined && hand[`ev_${action}`] !== undefined) {
        evLoss = (hand[`ev_${best}`] - hand[`ev_${action}`]) / 2000; // Convert to BB
    }

    if (isCorrect) {
        module.stats.correct++;
        globalStats.correct++;
        globalStats.streak++;
        if (globalStats.streak > globalStats.bestStreak) {
            globalStats.bestStreak = globalStats.streak;
        }
    } else {
        module.stats.wrong++;
        globalStats.wrong++;
        globalStats.streak = 0;
    }

    // Track in persistent stats
    if (typeof StatsTracker !== 'undefined') {
        StatsTracker.recordAnswer(module, action, isCorrect, best, evLoss, hand);
        StatsTracker.updateBestStreak(globalStats.bestStreak);
    }

    showModuleResult(moduleId, hand, action, isCorrect, best);
    updateModuleStats(moduleId);
    updateGlobalStats();
    
    // Update range info with best action's ranking
    if (typeof updateRangeInfo === 'function') {
        updateRangeInfo(moduleId, handIndex, best);
    }

    // Update mistakes progress if in mistakes mode
    if (typeof updateMistakeResult === 'function') {
        updateMistakeResult(isCorrect);
    }

    const actionsEl = document.getElementById(`moduleActions${moduleId}`);
    if (actionsEl) actionsEl.querySelectorAll('.module-action-btn').forEach(btn => btn.disabled = true);

    renderModuleHeatmap(moduleId, hand);
    checkAllAnswered();
}

function showModuleResult(moduleId, hand, action, isCorrect, best) {
    const resultEl = document.getElementById(`moduleResult${moduleId}`);

    if (!hand || (hand.fold === 0 && hand.call === 0 && hand.raise === 0)) {
        resultEl.className = 'quiz-module-result wrong';
        resultEl.innerHTML = 'Not in range';
        return;
    }

    // Build EV display for all available actions
    const evHtml = buildEvDisplay(hand, best, action, isCorrect);

    resultEl.className = `quiz-module-result ${isCorrect ? 'correct' : 'wrong'}`;
    resultEl.innerHTML = `
        ${isCorrect ? '✓ Correct!' : `✗ Wrong! Best: ${best.toUpperCase()}`}
        <div class="frequencies">F: ${(hand.fold * 100).toFixed(0)}% | C: ${(hand.call * 100).toFixed(0)}% | R: ${(hand.raise * 100).toFixed(0)}%</div>
        ${evHtml}`;
}

function buildEvDisplay(hand, best, chosenAction, isCorrect) {
    const actions = [];

    // Determine which actions exist (based on EV availability)
    if (hand.ev_fold !== undefined) actions.push({ key: 'fold', label: 'F', ev: hand.ev_fold });
    if (hand.ev_call !== undefined) actions.push({ key: 'call', label: 'C', ev: hand.ev_call });
    if (hand.ev_raise !== undefined) actions.push({ key: 'raise', label: 'R', ev: hand.ev_raise });

    if (actions.length === 0) return '';

    // Find best EV
    const bestEv = Math.max(...actions.map(a => a.ev));

    // Build HTML for each action's EV
    const evItems = actions.map(a => {
        const evBB = (a.ev / 2000).toFixed(2);
        const isBest = a.key === best;
        const isChosen = a.key === chosenAction;

        let classes = 'ev-item';
        if (isBest) classes += ' ev-best';
        if (isChosen && isCorrect) classes += ' ev-chosen-correct';
        if (isChosen && !isCorrect) classes += ' ev-chosen-wrong';

        return `<span class="${classes}">${a.label}: ${evBB}</span>`;
    }).join('');

    // Calculate loss if wrong
    let lossHtml = '';
    if (!isCorrect && hand[`ev_${best}`] !== undefined && hand[`ev_${chosenAction}`] !== undefined) {
        const evBestVal = hand[`ev_${best}`];
        const evChosenVal = hand[`ev_${chosenAction}`];
        const loss = (evBestVal - evChosenVal) / 2000;
        lossHtml = `<span class="ev-loss">Loss: -${loss.toFixed(2)} BB</span>`;
    }

    return `<div class="ev-values">${evItems}${lossHtml}</div>`;
}

function getBestAction(hand) {
    if (hand.raise >= hand.fold && hand.raise >= hand.call) return 'raise';
    if (hand.call >= hand.fold && hand.call >= hand.raise) return 'call';
    return 'fold';
}

function checkAllAnswered() {
    allAnswered = quizModules.every(m => m.answered);
    if (allAnswered) document.getElementById('nextBtn').classList.add('visible');
}

function updateModuleStats(moduleId) {
    const module = quizModules.find(m => m.id === moduleId);
    if (!module) return;

    document.getElementById(`moduleCorrect${moduleId}`).textContent = module.stats.correct;
    document.getElementById(`moduleWrong${moduleId}`).textContent = module.stats.wrong;

    const total = module.stats.correct + module.stats.wrong;
    const pct = total > 0 ? Math.round((module.stats.correct / total) * 100) : 0;
    document.getElementById(`moduleAccuracy${moduleId}`).textContent = pct + '%';
}

function updateGlobalStats() {
    // Preserve streak values while recalculating totals
    const streak = globalStats.streak || 0;
    const bestStreak = globalStats.bestStreak || 0;

    globalStats = { correct: 0, wrong: 0, streak: streak, bestStreak: bestStreak };
    quizModules.forEach(m => {
        globalStats.correct += m.stats.correct;
        globalStats.wrong += m.stats.wrong;
    });

    document.getElementById('globalCorrect').textContent = globalStats.correct;
    document.getElementById('globalWrong').textContent = globalStats.wrong;

    const total = globalStats.correct + globalStats.wrong;
    const pct = total > 0 ? Math.round((globalStats.correct / total) * 100) : 0;
    document.getElementById('globalAccuracy').textContent = pct + '%';

    // Update streak display
    const streakEl = document.getElementById('globalStreak');
    const streakStat = document.querySelector('.streak-stat');
    if (streakEl) {
        streakEl.textContent = globalStats.streak;
        // Fire animation for streaks >= 3
        if (streakStat) {
            if (globalStats.streak >= 3) {
                streakStat.classList.add('on-fire');
            } else {
                streakStat.classList.remove('on-fire');
            }
        }
    }
}
