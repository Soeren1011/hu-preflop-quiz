/**
 * PLO Range Quiz - Stats UI
 * Modal for displaying detailed statistics and weak spots
 */

/**
 * Create and show stats modal
 */
function showStatsModal() {
    // Remove existing modal if any
    const existing = document.getElementById('statsModal');
    if (existing) existing.remove();
    
    const global = StatsTracker.getGlobalStats();
    const weakSpots = StatsTracker.getWeakSpots(5);
    const weakHands = StatsTracker.getWeakestHands(8);
    const recent = StatsTracker.getRecentStats(50);
    
    const modal = document.createElement('div');
    modal.id = 'statsModal';
    modal.className = 'stats-modal-overlay';
    modal.innerHTML = `
        <div class="stats-modal">
            <div class="stats-modal-header">
                <h2>📊 Statistics</h2>
                <button class="stats-close-btn" onclick="closeStatsModal()">×</button>
            </div>
            
            <div class="stats-tabs">
                <button class="stats-tab active" data-tab="overview">Overview</button>
                <button class="stats-tab" data-tab="spots">Per Spot</button>
                <button class="stats-tab" data-tab="weak">Weak Spots</button>
            </div>
            
            <div class="stats-content">
                <!-- Overview Tab -->
                <div class="stats-tab-content active" id="tab-overview">
                    <div class="stats-cards">
                        <div class="stat-card">
                            <div class="stat-card-value">${global.total}</div>
                            <div class="stat-card-label">Total Hands</div>
                        </div>
                        <div class="stat-card correct">
                            <div class="stat-card-value">${global.correct}</div>
                            <div class="stat-card-label">Correct</div>
                        </div>
                        <div class="stat-card wrong">
                            <div class="stat-card-value">${global.wrong}</div>
                            <div class="stat-card-label">Wrong</div>
                        </div>
                        <div class="stat-card accent">
                            <div class="stat-card-value">${global.accuracy}%</div>
                            <div class="stat-card-label">Accuracy</div>
                        </div>
                    </div>
                    
                    <div class="stats-section">
                        <h3>🔥 Streaks</h3>
                        <div class="stats-row">
                            <span>Best Streak:</span>
                            <strong>${global.bestStreak}</strong>
                        </div>
                        <div class="stats-row">
                            <span>Sessions Played:</span>
                            <strong>${global.totalSessions}</strong>
                        </div>
                    </div>
                    
                    <div class="stats-section">
                        <h3>📈 Last 50 Hands</h3>
                        <div class="stats-row">
                            <span>Accuracy:</span>
                            <strong>${recent.accuracy}%</strong>
                        </div>
                        <div class="stats-row">
                            <span>EV Lost:</span>
                            <strong class="ev-loss">${recent.totalEvLoss} BB</strong>
                        </div>
                    </div>
                </div>
                
                <!-- Spots Tab -->
                <div class="stats-tab-content" id="tab-spots">
                    <div class="stats-sort">
                        Sort by:
                        <select id="spotSortSelect" onchange="updateSpotsList()">
                            <option value="wrong">Most Mistakes</option>
                            <option value="accuracy">Lowest Accuracy</option>
                            <option value="total">Most Played</option>
                            <option value="recent">Recent</option>
                        </select>
                    </div>
                    <div class="spots-list" id="spotsList">
                        ${renderSpotsList('wrong')}
                    </div>
                </div>
                
                <!-- Weak Spots Tab -->
                <div class="stats-tab-content" id="tab-weak">
                    ${weakSpots.length === 0 ? 
                        '<p class="stats-empty">Play at least 5 hands in a spot to see weak spots analysis.</p>' :
                        `
                        <div class="stats-section">
                            <h3>🎯 Spots Needing Work</h3>
                            <p class="stats-hint">Spots where you make the most mistakes (min 5 hands)</p>
                            <div class="weak-spots-list">
                                ${weakSpots.map((s, i) => `
                                    <div class="weak-spot-item">
                                        <span class="weak-rank">#${i + 1}</span>
                                        <span class="weak-name">${s.name}</span>
                                        <span class="weak-accuracy ${s.accuracy < 50 ? 'bad' : s.accuracy < 70 ? 'okay' : 'good'}">${s.accuracy}%</span>
                                        <span class="weak-count">${s.wrong}/${s.total}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        `
                    }
                    
                    ${weakHands.length === 0 ? '' : `
                        <div class="stats-section">
                            <h3>🃏 Problem Hands</h3>
                            <p class="stats-hint">Hands costing you the most EV</p>
                            <div class="weak-hands-list">
                                ${weakHands.map(h => `
                                    <div class="weak-hand-item">
                                        <span class="hand-cards-mini">${formatHandMini(h.hand)}</span>
                                        <span class="weak-spot-name">${h.spot}</span>
                                        <span class="weak-ev-loss">-${h.totalEvLoss.toFixed(1)} BB</span>
                                        <span class="weak-action">Should: ${h.correctAction?.toUpperCase() || '?'}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `}
                </div>
            </div>
            
            <div class="stats-modal-footer">
                <button class="stats-btn secondary" onclick="confirmClearStats()">Clear All Stats</button>
                <button class="stats-btn primary" onclick="closeStatsModal()">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Setup tab switching
    modal.querySelectorAll('.stats-tab').forEach(tab => {
        tab.addEventListener('click', () => switchStatsTab(tab.dataset.tab));
    });
    
    // Close on overlay click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeStatsModal();
    });
}

function closeStatsModal() {
    const modal = document.getElementById('statsModal');
    if (modal) modal.remove();
}

function switchStatsTab(tabId) {
    document.querySelectorAll('.stats-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.stats-tab-content').forEach(c => c.classList.remove('active'));
    
    document.querySelector(`.stats-tab[data-tab="${tabId}"]`)?.classList.add('active');
    document.getElementById(`tab-${tabId}`)?.classList.add('active');
}

function renderSpotsList(sortBy) {
    const spots = StatsTracker.getSpotStats(sortBy);
    
    if (spots.length === 0) {
        return '<p class="stats-empty">No spot data yet. Start playing!</p>';
    }
    
    return spots.slice(0, 20).map(s => `
        <div class="spot-stat-item">
            <div class="spot-stat-name">${s.name}</div>
            <div class="spot-stat-bar">
                <div class="spot-stat-bar-fill correct" style="width: ${s.accuracy}%"></div>
            </div>
            <div class="spot-stat-numbers">
                <span class="correct">${s.correct}</span>/<span class="wrong">${s.wrong}</span>
                <span class="accuracy">(${s.accuracy}%)</span>
            </div>
        </div>
    `).join('');
}

function updateSpotsList() {
    const sortBy = document.getElementById('spotSortSelect')?.value || 'wrong';
    const container = document.getElementById('spotsList');
    if (container) {
        container.innerHTML = renderSpotsList(sortBy);
    }
}

function formatHandMini(combo) {
    if (!combo) return '????';
    // Simple format - just show the combo text
    return combo.length > 8 ? combo.substring(0, 8) : combo;
}

function confirmClearStats() {
    if (confirm('Are you sure you want to clear ALL statistics? This cannot be undone.')) {
        StatsTracker.clearAllStats();
        closeStatsModal();
        showStatsModal(); // Reopen with fresh data
    }
}

// Add stats button to header
function addStatsButton() {
    const header = document.querySelector('.app-header');
    if (!header || document.getElementById('statsBtn')) return;
    
    const btn = document.createElement('button');
    btn.id = 'statsBtn';
    btn.className = 'stats-header-btn';
    btn.innerHTML = '📊';
    btn.title = 'View Statistics';
    btn.onclick = showStatsModal;
    
    header.appendChild(btn);
}

// Initialize when DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addStatsButton);
} else {
    addStatsButton();
}

// Export
window.showStatsModal = showStatsModal;
window.closeStatsModal = closeStatsModal;
