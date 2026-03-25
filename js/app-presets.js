/**
 * PLO Range Quiz - Recent Spots
 */

// Recent spots (stored in localStorage)
function getRecentSpots() {
    try {
        return JSON.parse(localStorage.getItem('recentSpots') || '[]');
    } catch { return []; }
}

function addRecentSpot(filename) {
    let recent = getRecentSpots();
    recent = recent.filter(f => f !== filename);
    recent.unshift(filename);
    recent = recent.slice(0, 5);
    localStorage.setItem('recentSpots', JSON.stringify(recent));
}

function renderRecentSpots() {
    const section = document.getElementById('recentSection');
    const grid = document.getElementById('recentSpots');
    if (!section || !grid) return;

    const recent = getRecentSpots();
    const recentWithData = recent.map(f => allSpots.find(s => s.filename === f)).filter(Boolean);

    if (recentWithData.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    grid.innerHTML = recentWithData.map(spot => {
        const humanName = humanizeActionPath(spot.actionPath);
        const callerCount = spot.callerCount || 0;
        const callerLabel = callerCount === 0 ? 'Heads-Up' : `${callerCount} caller${callerCount > 1 ? 's' : ''}`;
        return `<button class="selector-btn" onclick="selectInitialSpot('${spot.filename}')" title="${humanName}">
            ${spot.position} ${spot.scenario.replace('vs', '')}
            <span class="count">${callerLabel}</span>
        </button>`;
    }).join('');
}
