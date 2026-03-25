/**
 * PLO4 Range Quiz - Training Plan UI & Progress Tracking
 * Renders plan selection, session progress, and persists state
 */

const TRAINING_STORAGE_KEY = 'plo4quiz_training_plans_v1';

let trainingState = loadTrainingState();

function loadTrainingState() {
    try {
        const stored = localStorage.getItem(TRAINING_STORAGE_KEY);
        if (stored) return JSON.parse(stored);
    } catch (e) { /* ignore parse errors */ }
    return { activePlanId: null, activeSessionIndex: 0, plans: {} };
}

function saveTrainingState() {
    localStorage.setItem(TRAINING_STORAGE_KEY, JSON.stringify(trainingState));
}

function getTrainingProgress(planId) {
    return trainingState.plans[planId] || null;
}

function initPlanProgress(planId) {
    const plan = getTrainingPlan(planId);
    if (!plan) return;
    if (!trainingState.plans[planId]) {
        trainingState.plans[planId] = {
            startedAt: Date.now(),
            sessions: plan.sessions.map(() => ({
                handsPlayed: 0, correct: 0, completed: false
            }))
        };
        saveTrainingState();
    }
}

/**
 * Record an answer in the active training session
 */
function recordTrainingAnswer(isCorrect) {
    if (getQuizAppMode() !== 'training') return;
    if (!trainingState.activePlanId) return;

    const progress = trainingState.plans[trainingState.activePlanId];
    if (!progress) return;

    const sessionIdx = trainingState.activeSessionIndex;
    const session = progress.sessions[sessionIdx];
    if (!session) return;

    session.handsPlayed++;
    if (isCorrect) session.correct++;

    // Check if session target reached
    const plan = getTrainingPlan(trainingState.activePlanId);
    if (plan && plan.sessions[sessionIdx]) {
        const target = plan.sessions[sessionIdx].targetHands;
        if (session.handsPlayed >= target) {
            session.completed = true;
        }
    }

    saveTrainingState();
    updateSessionProgressBar();
}

// ============================================
// UI RENDERING
// ============================================

function renderTrainingPlanUI() {
    const container = document.getElementById('trainingPlanSection');
    if (!container) return;

    // If a plan is active, show session view
    if (trainingState.activePlanId) {
        const plan = getTrainingPlan(trainingState.activePlanId);
        if (plan) {
            renderActivePlan(container, plan);
            return;
        }
    }

    // Otherwise show plan selection
    renderPlanSelection(container);
}

function renderPlanSelection(container) {
    const categories = TRAINING_PLAN_CATEGORIES;

    let html = '<div class="training-plan-selector">';
    html += '<h3 class="training-title">Trainingsplan waehlen</h3>';

    categories.forEach(cat => {
        const plans = getAvailablePlans(cat.id);
        if (plans.length === 0) return;

        html += `<div class="training-category">`;
        html += `<div class="training-category-header">${cat.name}</div>`;
        html += `<div class="training-category-desc">${cat.desc}</div>`;
        html += `<div class="training-plan-grid">`;

        plans.forEach(plan => {
            const progress = getTrainingProgress(plan.id);
            const completedCount = progress
                ? progress.sessions.filter(s => s.completed).length
                : 0;
            const totalSessions = plan.sessions.length;
            const progressPct = progress
                ? Math.round((completedCount / totalSessions) * 100)
                : 0;
            const hasProgress = progress && completedCount > 0;

            html += `
                <button class="training-plan-card ${hasProgress ? 'has-progress' : ''}"
                        onclick="selectTrainingPlan('${plan.id}')">
                    <div class="plan-card-name">${plan.name}</div>
                    <div class="plan-card-desc">${plan.description}</div>
                    <div class="plan-card-meta">
                        <span>${totalSessions} Sessions</span>
                        ${hasProgress ? `<span class="plan-progress">${completedCount}/${totalSessions}</span>` : ''}
                    </div>
                    ${hasProgress ? `<div class="plan-progress-bar"><div class="plan-progress-fill" style="width:${progressPct}%"></div></div>` : ''}
                </button>
            `;
        });

        html += `</div></div>`;
    });

    html += '</div>';
    container.innerHTML = html;
}

function selectTrainingPlan(planId) {
    const plan = getTrainingPlan(planId);
    if (!plan) return;

    initPlanProgress(planId);
    trainingState.activePlanId = planId;

    // Find first incomplete session
    const progress = trainingState.plans[planId];
    const firstIncomplete = progress.sessions.findIndex(s => !s.completed);
    trainingState.activeSessionIndex = firstIncomplete >= 0 ? firstIncomplete : 0;

    saveTrainingState();
    renderTrainingPlanUI();
}

function renderActivePlan(container, plan) {
    const progress = trainingState.plans[plan.id];
    if (!progress) return;

    const sessionIdx = trainingState.activeSessionIndex;
    const currentSession = plan.sessions[sessionIdx];
    const sessionProgress = progress.sessions[sessionIdx];

    let html = '<div class="training-active-plan">';

    // Header with plan name and back button
    html += `
        <div class="training-plan-header">
            <button class="back-btn" onclick="exitTrainingPlan()">← Zurueck</button>
            <div class="training-plan-name">${plan.name}</div>
        </div>
    `;

    // Session list (horizontal)
    html += '<div class="training-sessions">';
    plan.sessions.forEach((session, idx) => {
        const sp = progress.sessions[idx];
        const isActive = idx === sessionIdx;
        const isCompleted = sp?.completed;
        const accuracy = sp && sp.handsPlayed > 0
            ? Math.round((sp.correct / sp.handsPlayed) * 100)
            : null;

        html += `
            <button class="training-session-btn ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}"
                    onclick="switchTrainingSession(${idx})">
                <div class="session-btn-name">${session.name}</div>
                <div class="session-btn-status">
                    ${isCompleted ? '✓' : `${sp?.handsPlayed || 0}/${session.targetHands}`}
                    ${accuracy !== null ? ` (${accuracy}%)` : ''}
                </div>
            </button>
        `;
    });
    html += '</div>';

    // Current session detail
    if (currentSession) {
        const played = sessionProgress?.handsPlayed || 0;
        const correct = sessionProgress?.correct || 0;
        const target = currentSession.targetHands;
        const pct = Math.min(100, Math.round((played / target) * 100));
        const accuracy = played > 0 ? Math.round((correct / played) * 100) : 0;

        html += `
            <div class="training-current-session">
                <div class="session-detail-name">${currentSession.name}</div>
                <div class="session-progress-container" id="sessionProgressContainer">
                    <div class="session-progress-bar">
                        <div class="session-progress-fill" id="sessionProgressFill" style="width:${pct}%"></div>
                    </div>
                    <div class="session-progress-text">
                        ${played}/${target} Haende | ${accuracy}% korrekt
                    </div>
                </div>
                <button class="training-start-btn" onclick="startTrainingSession()">
                    ${played > 0 ? 'Fortsetzen' : 'Session starten'}
                </button>
                ${sessionProgress?.completed ? `
                    <button class="training-reset-btn" onclick="resetTrainingSession(${sessionIdx})">
                        Session zuruecksetzen
                    </button>
                ` : ''}
            </div>
        `;
    }

    // Overall plan progress
    const completedSessions = progress.sessions.filter(s => s.completed).length;
    const totalSessions = plan.sessions.length;
    const overallPct = Math.round((completedSessions / totalSessions) * 100);

    html += `
        <div class="training-overall-progress">
            <div class="overall-progress-text">
                Gesamtfortschritt: ${completedSessions}/${totalSessions} Sessions (${overallPct}%)
            </div>
            <div class="overall-progress-bar">
                <div class="overall-progress-fill" style="width:${overallPct}%"></div>
            </div>
        </div>
    `;

    html += '</div>';

    // Reset plan button
    html += `
        <div class="training-plan-actions">
            <button class="training-reset-plan-btn" onclick="resetTrainingPlan('${plan.id}')">
                Plan zuruecksetzen
            </button>
        </div>
    `;

    container.innerHTML = html;
}

function switchTrainingSession(idx) {
    trainingState.activeSessionIndex = idx;
    saveTrainingState();
    renderTrainingPlanUI();
}

function exitTrainingPlan() {
    trainingState.activePlanId = null;
    trainingState.activeSessionIndex = 0;
    saveTrainingState();
    renderTrainingPlanUI();
}

async function startTrainingSession() {
    const plan = getTrainingPlan(trainingState.activePlanId);
    if (!plan) return;

    const sessionIdx = trainingState.activeSessionIndex;
    const session = plan.sessions[sessionIdx];
    if (!session) return;

    // Resolve spots for this session
    const spots = resolveSessionSpots(session);
    if (spots.length === 0) {
        alert('Keine passenden Spots fuer diese Session gefunden.');
        return;
    }

    // Clear existing modules
    quizModules.forEach(m => {
        const el = document.getElementById(`quizModule${m.id}`);
        if (el) el.remove();
    });
    quizModules = [];
    nextModuleId = 0;

    // Set selection state from first spot
    const firstSpot = spots[0];
    selectedScenario = firstSpot.scenario;
    selectedPosition = firstSpot.position;
    selectedOpener = getOpenerFromPath(firstSpot.actionPath);
    selectedCallers = getCallersFromPath(firstSpot.actionPath);

    // Add primary module
    await addQuizModule(firstSpot.filename, true);

    // Add secondary modules if multiple spots in session
    for (let i = 1; i < spots.length; i++) {
        await addQuizModule(spots[i].filename, false);
    }

    startQuiz();
}

function resetTrainingSession(sessionIdx) {
    if (!trainingState.activePlanId) return;
    const progress = trainingState.plans[trainingState.activePlanId];
    if (!progress || !progress.sessions[sessionIdx]) return;

    progress.sessions[sessionIdx] = {
        handsPlayed: 0, correct: 0, completed: false
    };
    saveTrainingState();
    renderTrainingPlanUI();
}

function resetTrainingPlan(planId) {
    if (!confirm('Plan-Fortschritt wirklich zuruecksetzen?')) return;
    delete trainingState.plans[planId];
    if (trainingState.activePlanId === planId) {
        trainingState.activePlanId = null;
        trainingState.activeSessionIndex = 0;
    }
    saveTrainingState();
    renderTrainingPlanUI();
}

function updateSessionProgressBar() {
    if (!trainingState.activePlanId) return;
    const plan = getTrainingPlan(trainingState.activePlanId);
    if (!plan) return;

    const sessionIdx = trainingState.activeSessionIndex;
    const session = plan.sessions[sessionIdx];
    const progress = trainingState.plans[trainingState.activePlanId];
    if (!session || !progress) return;

    const sp = progress.sessions[sessionIdx];
    if (!sp) return;

    const pct = Math.min(100, Math.round((sp.handsPlayed / session.targetHands) * 100));
    const fill = document.getElementById('sessionProgressFill');
    if (fill) fill.style.width = pct + '%';

    // Check if session just completed
    if (sp.completed) {
        const nextIncomplete = progress.sessions.findIndex((s, i) => i > sessionIdx && !s.completed);
        if (nextIncomplete >= 0) {
            setTimeout(() => {
                if (confirm(`Session abgeschlossen! Naechste Session starten?`)) {
                    endQuiz();
                    trainingState.activeSessionIndex = nextIncomplete;
                    saveTrainingState();
                    renderTrainingPlanUI();
                    applyModeToUI('training');
                }
            }, 1500);
        }
    }
}
