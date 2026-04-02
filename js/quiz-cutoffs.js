/**
 * PLO4 Cutoff Quiz Module
 * Quiz mode focused on category cutoffs (lowest raise/call for each category)
 */

// Cutoff quiz state
let cutoffData = null;
let cutoffQuizState = {
    currentQuestion: null,
    score: 0,
    total: 0,
    history: []
};

// Load cutoff data
async function loadCutoffData() {
    if (cutoffData) return cutoffData;
    
    try {
        const response = await fetch('cutoffs-data.json');
        cutoffData = await response.json();
        console.log('Loaded cutoff data:', Object.keys(cutoffData).length, 'spots');
        return cutoffData;
    } catch (err) {
        console.error('Failed to load cutoff data:', err);
        return null;
    }
}

// Get available spots for quiz based on scenario filter
function getAvailableCutoffSpots(scenarioFilter = null) {
    if (!cutoffData) return [];
    
    return Object.entries(cutoffData).filter(([key, data]) => {
        if (!data.spot || !data.categories) return false;
        if (scenarioFilter && data.spot.scenario !== scenarioFilter) return false;
        // Must have at least one category with cutoff data
        return Object.values(data.categories).some(cat => cat.lowestRaise || cat.lowestCall);
    });
}

// Track which categories have been asked for the current spot
let askedCategories = [];

// Generate a cutoff quiz question
function generateCutoffQuestion(options = {}) {
    const { scenario, category, questionType, spotKey } = options;
    
    let spotData;
    
    // If specific spot is provided, use it
    if (spotKey && cutoffData[spotKey]) {
        spotData = cutoffData[spotKey];
    } else {
        // Get available spots
        const spots = getAvailableCutoffSpots(scenario);
        if (spots.length === 0) {
            console.error('No cutoff spots available');
            return null;
        }
        
        // Pick random spot
        const [, data] = spots[Math.floor(Math.random() * spots.length)];
        spotData = data;
    }
    
    // Get categories with cutoff data (that haven't been asked yet)
    const availableCategories = Object.entries(spotData.categories).filter(([key, cat]) => {
        if (category && key !== category) return false;
        if (spotKey && askedCategories.includes(key)) return false; // Skip already asked
        return cat.lowestRaise || cat.lowestCall;
    });
    
    // If all categories asked, reset and show completion
    if (availableCategories.length === 0) {
        if (spotKey && askedCategories.length > 0) {
            askedCategories = []; // Reset for next round
            return {
                type: 'complete',
                message: 'All categories for this spot completed!',
                stats: cutoffQuizState
            };
        }
        return null;
    }
    
    // Pick random category from remaining
    const [catKey, catData] = availableCategories[Math.floor(Math.random() * availableCategories.length)];
    
    // Track this category as asked
    if (spotKey) {
        askedCategories.push(catKey);
    }
    
    // Decide question type: 'threshold' or 'identify'
    const type = questionType || (Math.random() > 0.5 ? 'threshold' : 'identify');
    
    if (type === 'threshold') {
        return generateThresholdQuestion(spotData, catKey, catData);
    } else {
        return generateIdentifyQuestion(spotData, catKey, catData);
    }
}

// Generate "Is this hand a raise/call/fold?" question
function generateThresholdQuestion(spotData, catKey, catData) {
    const { spot } = spotData;
    const isRFI = spot.scenario === 'RFI';
    
    // Pick the cutoff hand
    const cutoff = catData.lowestRaise || catData.lowestCall;
    if (!cutoff) return null;
    
    const isCutoffRaise = !!catData.lowestRaise && cutoff === catData.lowestRaise;
    const correctAction = isCutoffRaise ? 'raise' : 'call';
    
    // Format the question
    const positionText = spot.position;
    const scenarioText = formatScenario(spot.scenario, spot.actionPath);
    const handDisplay = formatHandForDisplay(cutoff.notation);
    
    // Generate options
    const options = isRFI 
        ? ['raise', 'fold']
        : ['raise', 'call', 'fold'];
    
    return {
        type: 'threshold',
        question: `${positionText} ${scenarioText}`,
        subQuestion: `Ist ${handDisplay} (${cutoff.suitedness}) ein...`,
        hand: cutoff,
        category: catData.name,
        categoryStats: catData.stats,
        options: options,
        correct: correctAction,
        explanation: buildExplanation(catData, cutoff, correctAction)
    };
}

// Generate "What is the lowest raise/call for category X?" question
function generateIdentifyQuestion(spotData, catKey, catData) {
    const { spot } = spotData;
    
    // Decide if asking for lowest raise or call
    const askingForRaise = catData.lowestRaise && (Math.random() > 0.3 || !catData.lowestCall);
    const correctCutoff = askingForRaise ? catData.lowestRaise : catData.lowestCall;
    if (!correctCutoff) return null;
    
    const actionType = askingForRaise ? 'Raise' : 'Call';
    
    // Generate wrong answers (similar hands)
    const wrongAnswers = generateSimilarHands(correctCutoff, 3);
    const allAnswers = [correctCutoff.ranks, ...wrongAnswers].sort(() => Math.random() - 0.5);
    
    const positionText = spot.position;
    const scenarioText = formatScenario(spot.scenario, spot.actionPath);
    
    // Sort the correct answer ranks
    const correctRanksSorted = getRanksSorted(correctCutoff.notation);
    
    return {
        type: 'identify',
        question: `${positionText} ${scenarioText}`,
        subQuestion: `${catData.name}: Was ist der niedrigste ${actionType}?`,
        category: catData.name,
        categoryStats: catData.stats,
        options: allAnswers.map(r => sortRanksString(r)),
        correct: correctRanksSorted,
        correctFull: correctCutoff,
        explanation: buildExplanation(catData, correctCutoff, askingForRaise ? 'raise' : 'call')
    };
}

// Sort a ranks string (e.g. "K7K5" -> "KK75")
function sortRanksString(ranks) {
    const rankOrder = 'AKQJT98765432';
    return ranks.split('').sort((a, b) => rankOrder.indexOf(a) - rankOrder.indexOf(b)).join('');
}

// Generate similar hands as wrong answers
function generateSimilarHands(cutoff, count) {
    const rankOrder = 'AKQJT98765432';
    // Get sorted ranks from notation
    const sortedRanks = getRanksSorted(cutoff.notation);
    const wrong = [];
    
    // Parse the hand ranks (already sorted)
    const handRanks = sortedRanks.split('').map(r => rankOrder.indexOf(r));
    
    // Generate variations by shifting kickers
    for (let i = 0; i < count * 3 && wrong.length < count; i++) {
        const newRanks = [...handRanks];
        // Randomly adjust one of the kickers (3rd or 4th card)
        const kickerIdx = 2 + Math.floor(Math.random() * 2);
        const shift = Math.random() > 0.5 ? 1 : -1;
        newRanks[kickerIdx] = Math.max(0, Math.min(12, newRanks[kickerIdx] + shift));
        
        // Sort and create string
        newRanks.sort((a, b) => a - b);
        const newHand = newRanks.map(r => rankOrder[r]).join('');
        
        if (newHand !== sortedRanks && !wrong.includes(newHand)) {
            wrong.push(newHand);
        }
    }
    
    return wrong.slice(0, count);
}

// Format scenario for display
function formatScenario(scenario, actionPath) {
    switch (scenario) {
        case 'RFI': return 'Open';
        case 'vsRFI': return `vs ${getOpenerFromPath(actionPath)} Raise`;
        case 'vs3Bet': return `vs 3-Bet`;
        case 'vsRFIMulti': return 'vs Raise (MW)';
        default: return scenario;
    }
}

function getOpenerFromPath(actionPath) {
    if (!actionPath) return '';
    const match = actionPath.match(/(UTG|MP|CO|BTN|SB|BB)100%/);
    return match ? match[1] : '';
}

// Sort cards by rank (highest first)
function sortCardsByRank(notation) {
    if (!notation) return [];
    const rankOrder = 'AKQJT98765432';
    const cards = [];
    for (let i = 0; i < notation.length; i += 2) {
        cards.push({ rank: notation[i].toUpperCase(), suit: notation[i + 1] });
    }
    return cards.sort((a, b) => rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank));
}

// Get ranks string sorted by rank
function getRanksSorted(notation) {
    return sortCardsByRank(notation).map(c => c.rank).join('');
}

// Format hand for display with suit symbols (sorted by rank)
function formatHandForDisplay(notation) {
    if (!notation) return '';
    const suitSymbols = { 's': '♠', 'h': '♥', 'd': '♦', 'c': '♣' };
    const suitColors = { 's': '#000', 'h': '#dc2626', 'd': '#3b82f6', 'c': '#22c55e' };
    
    const cards = sortCardsByRank(notation);
    
    let html = '';
    for (const card of cards) {
        const color = suitColors[card.suit] || '#000';
        const symbol = suitSymbols[card.suit] || card.suit;
        html += `<span style="color:${color}">${card.rank}${symbol}</span>`;
    }
    return html;
}

// Build explanation text
function buildExplanation(catData, cutoff, correctAction) {
    const { stats, name } = catData;
    const ranksSorted = getRanksSorted(cutoff.notation);
    
    let text = `<strong>${name}</strong> in this spot:\n`;
    text += `• ${stats.raise.toFixed(1)}% Raise`;
    if (stats.call > 0) text += ` / ${stats.call.toFixed(1)}% Call`;
    text += ` / ${stats.fold.toFixed(1)}% Fold\n\n`;
    
    text += `<strong>${ranksSorted}</strong> (${cutoff.suitedness}) is the cutoff for ${correctAction}.\n`;
    text += `Frequency: ${cutoff.freq}% | EV: ${cutoff.ev}`;
    
    return text;
}

// Render cutoff quiz UI
function renderCutoffQuiz(container, question) {
    if (!question) {
        container.innerHTML = '<div class="error">No quiz question available</div>';
        return;
    }
    
    // Handle completion
    if (question.type === 'complete') {
        const accuracy = question.stats.total > 0 
            ? Math.round(question.stats.score / question.stats.total * 100) 
            : 0;
        container.innerHTML = `
            <div class="cutoff-quiz-complete">
                <div class="complete-icon">🎉</div>
                <div class="complete-message">${question.message}</div>
                <div class="complete-stats">
                    <div class="stat">${question.stats.score}/${question.stats.total} richtig (${accuracy}%)</div>
                </div>
                <button class="restart-quiz-btn" id="restartCutoffBtn">Nochmal spielen →</button>
            </div>
        `;
        document.getElementById('restartCutoffBtn')?.addEventListener('click', () => {
            askedCategories = [];
            cutoffQuizState.score = 0;
            cutoffQuizState.total = 0;
            const nextQ = generateCutoffQuestion(cutoffQuizOptions);
            renderCutoffQuiz(container, nextQ);
        });
        return;
    }
    
    cutoffQuizState.currentQuestion = question;
    
    const html = `
        <div class="cutoff-quiz">
            <div class="quiz-header">
                <span class="quiz-score">Score: ${cutoffQuizState.score}/${cutoffQuizState.total}</span>
                <span class="quiz-category">${question.category}</span>
            </div>
            
            <div class="quiz-question">
                <div class="spot-info">${question.question}</div>
                <div class="hand-question">${question.subQuestion}</div>
            </div>
            
            <div class="quiz-options">
                ${question.options.map(opt => `
                    <button class="quiz-option" data-answer="${opt}">
                        ${opt === 'raise' ? '🔼 Raise' : opt === 'call' ? '📞 Call' : opt === 'fold' ? '❌ Fold' : opt}
                    </button>
                `).join('')}
            </div>
            
            <div class="quiz-feedback hidden"></div>
            
            <div class="quiz-stats">
                <div class="stat-item">
                    <span class="stat-label">Raise</span>
                    <span class="stat-value">${question.categoryStats.raise.toFixed(1)}%</span>
                </div>
                ${question.categoryStats.call > 0 ? `
                <div class="stat-item">
                    <span class="stat-label">Call</span>
                    <span class="stat-value">${question.categoryStats.call.toFixed(1)}%</span>
                </div>
                ` : ''}
                <div class="stat-item">
                    <span class="stat-label">Fold</span>
                    <span class="stat-value">${question.categoryStats.fold.toFixed(1)}%</span>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Add click handlers
    container.querySelectorAll('.quiz-option').forEach(btn => {
        btn.addEventListener('click', () => handleCutoffAnswer(container, btn.dataset.answer));
    });
}

// Handle answer selection
function handleCutoffAnswer(container, answer) {
    const question = cutoffQuizState.currentQuestion;
    if (!question) return;
    
    const isCorrect = answer === question.correct;
    cutoffQuizState.total++;
    if (isCorrect) cutoffQuizState.score++;
    
    // Disable buttons
    container.querySelectorAll('.quiz-option').forEach(btn => {
        btn.disabled = true;
        if (btn.dataset.answer === question.correct) {
            btn.classList.add('correct');
        } else if (btn.dataset.answer === answer && !isCorrect) {
            btn.classList.add('incorrect');
        }
    });
    
    // Show feedback
    const feedback = container.querySelector('.quiz-feedback');
    feedback.classList.remove('hidden');
    feedback.innerHTML = `
        <div class="feedback-result ${isCorrect ? 'correct' : 'incorrect'}">
            ${isCorrect ? '✓ Correct!' : `✗ Wrong - Correct was: ${question.correct}`}
        </div>
        <div class="feedback-explanation">${question.explanation}</div>
        <button class="next-question-btn">Next Question →</button>
    `;
    
    // Add next question handler
    feedback.querySelector('.next-question-btn').addEventListener('click', () => {
        const nextQ = generateCutoffQuestion(cutoffQuizOptions);
        renderCutoffQuiz(container, nextQ);
    });
    
    // Update score
    container.querySelector('.quiz-score').textContent = `Score: ${cutoffQuizState.score}/${cutoffQuizState.total}`;
}

// Store quiz options globally for next question generation
let cutoffQuizOptions = {};

// Initialize cutoff quiz
async function initCutoffQuiz(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error('Container not found:', containerId);
        return;
    }
    
    // Store options for next question generation
    cutoffQuizOptions = options;
    
    // Reset state for new quiz
    askedCategories = [];
    cutoffQuizState.score = 0;
    cutoffQuizState.total = 0;
    
    container.innerHTML = '<div class="loading">Loading cutoff data...</div>';
    
    await loadCutoffData();
    
    if (!cutoffData) {
        container.innerHTML = '<div class="error">Failed to load cutoff data</div>';
        return;
    }
    
    const question = generateCutoffQuestion(options);
    renderCutoffQuiz(container, question);
}

// CSS for cutoff quiz
const cutoffQuizStyles = `
<style>
.cutoff-quiz {
    max-width: 500px;
    margin: 0 auto;
    padding: 20px;
    background: #1a1a2e;
    border-radius: 12px;
}

.quiz-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 20px;
    font-size: 14px;
    color: #888;
}

.quiz-question {
    text-align: center;
    margin-bottom: 24px;
}

.spot-info {
    font-size: 18px;
    color: #fbbf24;
    margin-bottom: 8px;
}

.hand-question {
    font-size: 22px;
    color: #fff;
}

.quiz-options {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 20px;
}

.quiz-option {
    padding: 16px;
    font-size: 18px;
    border: 2px solid #333;
    border-radius: 8px;
    background: #252540;
    color: #fff;
    cursor: pointer;
    transition: all 0.2s;
}

.quiz-option:hover:not(:disabled) {
    border-color: #fbbf24;
    background: #2a2a4a;
}

.quiz-option:disabled {
    cursor: default;
}

.quiz-option.correct {
    border-color: #22c55e;
    background: rgba(34, 197, 94, 0.2);
}

.quiz-option.incorrect {
    border-color: #ef4444;
    background: rgba(239, 68, 68, 0.2);
}

.quiz-feedback {
    padding: 16px;
    background: #252540;
    border-radius: 8px;
    margin-bottom: 20px;
}

.quiz-feedback.hidden {
    display: none;
}

.feedback-result {
    font-size: 20px;
    font-weight: bold;
    margin-bottom: 12px;
}

.feedback-result.correct {
    color: #22c55e;
}

.feedback-result.incorrect {
    color: #ef4444;
}

.feedback-explanation {
    color: #ccc;
    line-height: 1.6;
    white-space: pre-line;
    margin-bottom: 16px;
}

.next-question-btn {
    width: 100%;
    padding: 12px;
    font-size: 16px;
    background: #fbbf24;
    color: #000;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: bold;
}

.next-question-btn:hover {
    background: #f59e0b;
}

.quiz-stats {
    display: flex;
    justify-content: center;
    gap: 24px;
    padding-top: 16px;
    border-top: 1px solid #333;
}

.stat-item {
    text-align: center;
}

.stat-label {
    display: block;
    font-size: 12px;
    color: #888;
    margin-bottom: 4px;
}

.stat-value {
    font-size: 16px;
    font-weight: bold;
    color: #fff;
}

.loading, .error {
    text-align: center;
    padding: 40px;
    color: #888;
}

.error {
    color: #ef4444;
}
</style>
`;

// Inject styles
if (typeof document !== 'undefined') {
    document.head.insertAdjacentHTML('beforeend', cutoffQuizStyles);
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initCutoffQuiz, loadCutoffData, generateCutoffQuestion };
}
