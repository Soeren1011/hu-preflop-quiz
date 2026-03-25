/**
 * PLO Range Quiz - Stats Dashboard v8
 * Complete spot coverage matching cutoff quiz categories
 */

(function() {
    'use strict';

    var SPOT_CATEGORIES = [
        // RFI
        {
            id: 'rfi',
            name: 'RFI',
            spots: [
                { name: 'EP RFI', criteria: { scenario: 'RFI', position: 'UTG' } },
                { name: 'MP RFI', criteria: { scenario: 'RFI', position: 'MP' } },
                { name: 'CO RFI', criteria: { scenario: 'RFI', position: 'CO' } },
                { name: 'BTN RFI', criteria: { scenario: 'RFI', position: 'BTN' } },
                { name: 'SB RFI', criteria: { scenario: 'RFI', position: 'SB' } },
            ]
        },
        // Facing EP RFI
        {
            id: 'vs-ep-rfi',
            name: 'Facing EP RFI',
            spots: [
                { name: 'MP vs EP', criteria: { scenario: 'vsRFI', position: 'MP', opener: 'UTG' } },
                { name: 'CO vs EP', criteria: { scenario: 'vsRFI', position: 'CO', opener: 'UTG' } },
                { name: 'BTN vs EP', criteria: { scenario: 'vsRFI', position: 'BTN', opener: 'UTG' } },
                { name: 'SB vs EP', criteria: { scenario: 'vsRFI', position: 'SB', opener: 'UTG' } },
                { name: 'BB vs EP', criteria: { scenario: 'vsRFI', position: 'BB', opener: 'UTG' } },
            ]
        },
        // Facing MP RFI
        {
            id: 'vs-mp-rfi',
            name: 'Facing MP RFI',
            spots: [
                { name: 'CO vs MP', criteria: { scenario: 'vsRFI', position: 'CO', opener: 'MP' } },
                { name: 'BTN vs MP', criteria: { scenario: 'vsRFI', position: 'BTN', opener: 'MP' } },
                { name: 'SB vs MP', criteria: { scenario: 'vsRFI', position: 'SB', opener: 'MP' } },
                { name: 'BB vs MP', criteria: { scenario: 'vsRFI', position: 'BB', opener: 'MP' } },
            ]
        },
        // Facing CO RFI
        {
            id: 'vs-co-rfi',
            name: 'Facing CO RFI',
            spots: [
                { name: 'BTN vs CO', criteria: { scenario: 'vsRFI', position: 'BTN', opener: 'CO' } },
                { name: 'SB vs CO', criteria: { scenario: 'vsRFI', position: 'SB', opener: 'CO' } },
                { name: 'BB vs CO', criteria: { scenario: 'vsRFI', position: 'BB', opener: 'CO' } },
            ]
        },
        // Facing BTN RFI
        {
            id: 'vs-btn-rfi',
            name: 'Facing BTN RFI',
            spots: [
                { name: 'SB vs BTN', criteria: { scenario: 'vsRFI', position: 'SB', opener: 'BTN' } },
                { name: 'BB vs BTN', criteria: { scenario: 'vsRFI', position: 'BB', opener: 'BTN' } },
            ]
        },
        // Facing SB RFI
        {
            id: 'vs-sb-rfi',
            name: 'Facing SB RFI',
            spots: [
                { name: 'BB vs SB', criteria: { scenario: 'vsRFI', position: 'BB', opener: 'SB' } },
            ]
        },
        // Multiway: BB Defence +1 Caller
        {
            id: 'bb-mw-1cc',
            name: 'BB Defence +1 CC',
            spots: [
                { name: 'BB vs EP +BTN', criteria: { scenario: 'vsRFIMulti', position: 'BB', opener: 'UTG', callers: ['BTN'] } },
                { name: 'BB vs CO +BTN', criteria: { scenario: 'vsRFIMulti', position: 'BB', opener: 'CO', callers: ['BTN'] } },
                { name: 'BB vs BTN +SB', criteria: { scenario: 'vsRFIMulti', position: 'BB', opener: 'BTN', callers: ['SB'] } },
            ]
        },
        // Multiway: OOP +1 Caller
        {
            id: 'oop-mw-1cc',
            name: 'OOP Facing +1 CC',
            spots: [
                { name: 'SB vs EP +BTN', criteria: { scenario: 'vsRFIMulti', position: 'SB', opener: 'UTG', callers: ['BTN'] } },
                { name: 'SB vs CO +BTN', criteria: { scenario: 'vsRFIMulti', position: 'SB', opener: 'CO', callers: ['BTN'] } },
            ]
        },
        // Multiway: IP +1 Caller
        {
            id: 'ip-mw-1cc',
            name: 'IP Facing +1 CC',
            spots: [
                { name: 'BTN vs EP +CO', criteria: { scenario: 'vsRFIMulti', position: 'BTN', opener: 'UTG', callers: ['CO'] } },
            ]
        },
        // Multiway: +2 Callers
        {
            id: 'mw-2cc',
            name: 'Facing +2 CC',
            spots: [
                { name: 'BB vs EP +CO&BTN', criteria: { scenario: 'vsRFIMulti', position: 'BB', opener: 'UTG', callers: ['CO', 'BTN'] } },
                { name: 'SB vs EP +CO&BTN', criteria: { scenario: 'vsRFIMulti', position: 'SB', opener: 'UTG', callers: ['CO', 'BTN'] } },
                { name: 'BTN vs EP +MP&CO', criteria: { scenario: 'vsRFIMulti', position: 'BTN', opener: 'UTG', callers: ['MP', 'CO'] } },
            ]
        },
        // Facing 3bet OOP
        {
            id: '3bet-oop',
            name: 'Facing 3bet OOP',
            spots: [
                { name: 'EP vs MP 3b', criteria: { scenario: 'vs3BetAsRaiser', position: 'UTG', threeBettor: 'MP' } },
                { name: 'CO vs BTN 3b', criteria: { scenario: 'vs3BetAsRaiser', position: 'CO', threeBettor: 'BTN' } },
                { name: 'SB vs BB 3b', criteria: { scenario: 'vs3BetAsRaiser', position: 'SB', threeBettor: 'BB' } },
            ]
        },
        // Facing 3bet IP
        {
            id: '3bet-ip',
            name: 'Facing 3bet IP',
            spots: [
                { name: 'EP vs BB 3b', criteria: { scenario: 'vs3BetAsRaiser', position: 'UTG', threeBettor: 'BB' } },
                { name: 'BTN vs SB 3b', criteria: { scenario: 'vs3BetAsRaiser', position: 'BTN', threeBettor: 'SB' } },
            ]
        },
    ];

    var spotKeyCache = {};

    function getActualSpotKey(criteria) {
        var cacheKey = JSON.stringify(criteria);
        if (spotKeyCache[cacheKey]) return spotKeyCache[cacheKey];
        
        try {
            if (typeof findSpotByCriteria === 'function') {
                var spot = findSpotByCriteria(criteria);
                if (spot) {
                    var key = spot.scenario + '_' + spot.position + '_' + (spot.actionPath || 'default');
                    spotKeyCache[cacheKey] = key;
                    return key;
                }
            }
        } catch(e) {}
        return null;
    }

    function getSpotData(key) {
        if (!key) return { correct: 0, wrong: 0, total: 0, accuracy: null };
        try {
            if (window.StatsTracker) {
                var all = window.StatsTracker.getSpotStats('total');
                var found = all.find(function(s) { return s.key === key; });
                if (found) return found;
            }
        } catch(e) {}
        return { correct: 0, wrong: 0, total: 0, accuracy: null };
    }

    function getCategoryStats(cat) {
        var totalCorrect = 0, totalWrong = 0;
        var spotsWithStats = cat.spots.map(function(spot) {
            var key = getActualSpotKey(spot.criteria);
            var data = getSpotData(key);
            totalCorrect += data.correct || 0;
            totalWrong += data.wrong || 0;
            return Object.assign({}, spot, { key: key, correct: data.correct||0, wrong: data.wrong||0, total: data.total||0, accuracy: data.accuracy });
        });
        var total = totalCorrect + totalWrong;
        return Object.assign({}, cat, {
            correct: totalCorrect, wrong: totalWrong, total: total,
            accuracy: total > 0 ? Math.round((totalCorrect / total) * 100) : null,
            spots: spotsWithStats
        });
    }

    function statusClass(acc, total) {
        if (!total || acc === null) return 'unplayed';
        if (acc >= 80) return 'good';
        if (acc >= 60) return 'medium';
        return 'bad';
    }

    function toggleCat(id) {
        var det = document.getElementById('details-' + id);
        var ico = document.getElementById('icon-' + id);
        if (det && ico) {
            var exp = det.classList.toggle('expanded');
            ico.textContent = exp ? '▼' : '▶';
        }
    }

    function trainCat(id) {
        var cat = SPOT_CATEGORIES.find(function(c) { return c.id === id; });
        if (!cat) return;
        var spot = cat.spots[Math.floor(Math.random() * cat.spots.length)];
        trainSpot(spot.criteria);
    }

    // Default EV range for training (focus on marginal hands)
    var DEFAULT_EV_MIN = -2;  // -2 BB
    var DEFAULT_EV_MAX = 2;   // +2 BB
    var useEvFilter = true;   // Toggle for EV filter

    function trainSpot(criteria) {
        console.log('Train:', criteria);
        try {
            if (typeof findSpotByCriteria === 'function') {
                var spot = findSpotByCriteria(criteria);
                if (spot && spot.filename) {
                    if (typeof quizModules !== 'undefined') quizModules.length = 0;
                    addQuizModule(spot.filename, true).then(function() {
                        // Apply EV filter if enabled
                        if (useEvFilter && quizModules.length > 0) {
                            var mod = quizModules[0];
                            mod.evFilterMin = DEFAULT_EV_MIN;
                            mod.evFilterMax = DEFAULT_EV_MAX;
                            // Update UI inputs
                            var minInput = document.getElementById('evMin' + mod.id);
                            var maxInput = document.getElementById('evMax' + mod.id);
                            if (minInput) minInput.value = DEFAULT_EV_MIN;
                            if (maxInput) maxInput.value = DEFAULT_EV_MAX;
                            // Rebuild indices with filter
                            if (typeof rebuildHandIndices === 'function') {
                                rebuildHandIndices();
                            }
                        }
                        startQuiz();
                    }).catch(function(e) { console.error(e); });
                    return;
                }
            }
        } catch(e) { console.error(e); }
        alert('Spot nicht gefunden');
    }
    
    function toggleEvFilter() {
        useEvFilter = !useEvFilter;
        var btn = document.getElementById('evFilterToggle');
        if (btn) {
            btn.textContent = useEvFilter ? 'EV: -2/+2' : 'EV: All';
            btn.classList.toggle('active', useEvFilter);
        }
    }

    function render() {
        var container = document.getElementById('dashboardCategories');
        if (!container) return;

        var html = '';
        SPOT_CATEGORIES.forEach(function(cat) {
            var stats = getCategoryStats(cat);
            var sc = statusClass(stats.accuracy, stats.total);
            var cPct = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
            var wPct = stats.total > 0 ? (stats.wrong / stats.total) * 100 : 0;

            html += '<div class="category-row ' + sc + '">';
            html += '<div class="category-header">';
            html += '<div class="category-left" onclick="window._dashToggle(\'' + cat.id + '\')">';
            html += '<span class="expand-icon" id="icon-' + cat.id + '">▶</span>';
            html += '<span class="category-name-text">' + cat.name + '</span>';
            html += '</div>';
            html += '<div class="category-bar-container">';
            if (stats.total > 0) {
                html += '<div class="category-bar correct" style="width:' + cPct + '%"></div>';
                html += '<div class="category-bar wrong" style="width:' + wPct + '%"></div>';
            } else {
                html += '<div class="category-bar unplayed" style="width:100%"></div>';
            }
            html += '</div>';
            html += '<div class="category-stats">';
            html += stats.total > 0 ? '<span class="accuracy-value ' + sc + '">' + stats.accuracy + '%</span>' : '<span class="not-played">—</span>';
            html += '</div>';
            html += '<button class="train-btn" onclick="window._dashTrainCat(\'' + cat.id + '\')">▶</button>';
            html += '</div>';
            html += '<div class="category-details" id="details-' + cat.id + '">';
            
            stats.spots.forEach(function(spot) {
                var ssc = statusClass(spot.accuracy, spot.total);
                var sPct = spot.total > 0 ? (spot.correct / spot.total) * 100 : 0;
                var wsPct = spot.total > 0 ? (spot.wrong / spot.total) * 100 : 0;
                var cj = encodeURIComponent(JSON.stringify(spot.criteria));
                
                html += '<div class="spot-detail ' + ssc + '" onclick="window._dashTrainSpot(\'' + cj + '\')">';
                html += '<div class="spot-detail-name">' + spot.name + '</div>';
                html += '<div class="spot-detail-bar-container">';
                if (spot.total > 0) {
                    html += '<div class="spot-detail-bar correct" style="width:' + sPct + '%"></div>';
                    html += '<div class="spot-detail-bar wrong" style="width:' + wsPct + '%"></div>';
                } else {
                    html += '<div class="spot-detail-bar unplayed" style="width:100%"></div>';
                }
                html += '</div>';
                html += '<div class="spot-detail-stats">';
                html += spot.total > 0 ? spot.accuracy + '%' : '—';
                html += '</div>';
                html += '</div>';
            });
            
            html += '</div></div>';
        });
        
        container.innerHTML = html;
    }

    function init() {
        if (typeof allSpots === 'undefined' || !allSpots || allSpots.length === 0) {
            setTimeout(init, 500);
            return;
        }

        var sel = document.getElementById('spotSelector');
        if (!sel) {
            setTimeout(init, 500);
            return;
        }

        if (document.getElementById('startpageDashboard')) {
            render();
            return;
        }

        var dash = document.createElement('div');
        dash.id = 'startpageDashboard';
        dash.className = 'startpage-dashboard';
        dash.innerHTML = '<div class="dashboard-title" onclick="window._dashToggleCollapse()"><span class="dashboard-icon">📊</span><span>Training Progress</span><button id="evFilterToggle" class="ev-toggle-btn active" onclick="event.stopPropagation();window._dashToggleEv()">EV: -2/+2</button></div><div class="dashboard-categories" id="dashboardCategories"></div>';

        // In single mode: place dashboard after spot grid and start collapsed
        var singleGrid = document.getElementById('singleModeSpotGrid');
        var isSingle = typeof getQuizAppMode === 'function' && getQuizAppMode() === 'single';

        if (isSingle && singleGrid) {
            // Insert after the spot grid
            singleGrid.parentNode.insertBefore(dash, singleGrid.nextSibling);
            dash.classList.add('collapsed');
        } else {
            var title = sel.querySelector('.selector-title');
            if (title) title.parentNode.insertBefore(dash, title.nextSibling);
            else sel.insertBefore(dash, sel.firstChild);
        }

        render();
    }

    function toggleCollapse() {
        var dash = document.getElementById('startpageDashboard');
        if (dash && dash.classList.contains('collapsed')) {
            dash.classList.toggle('expanded');
        }
    }

    window._dashToggle = toggleCat;
    window._dashTrainCat = trainCat;
    window._dashTrainSpot = function(enc) {
        trainSpot(JSON.parse(decodeURIComponent(enc)));
    };
    window._dashToggleEv = toggleEvFilter;
    window._dashToggleCollapse = toggleCollapse;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(init, 500); });
    } else {
        setTimeout(init, 500);
    }
})();
