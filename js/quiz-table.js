/**
 * HU Preflop Range Quiz - Mini Table Rendering
 */

// Visual seat positions for HU (2 players: villain top, hero bottom)
const VISUAL_SEATS_HU = [
    { id: 0, top: '-5%', left: '50%' },   // Top-center (villain)
    { id: 1, top: '105%', left: '50%' },  // Bottom-center (hero)
];

// Keep 6-max seats for compatibility if POSITIONS has more than 2
const VISUAL_SEATS = POSITIONS.length <= 2 ? VISUAL_SEATS_HU : [
    { id: 0, top: '-5%', left: '50%' },
    { id: 1, top: '15%', left: '90%' },
    { id: 2, top: '75%', left: '95%' },
    { id: 3, top: '105%', left: '50%' },
    { id: 4, top: '75%', left: '5%' },
    { id: 5, top: '15%', left: '10%' },
];

function renderMiniTable(moduleId) {
    const module = quizModules.find(m => m.id === moduleId);
    if (!module || !module.spotInfo) return;

    const tableEl = document.getElementById(`miniTable${moduleId}`);
    if (!tableEl) return;

    const heroPos = module.spotInfo.position;
    const actionPath = module.spotInfo.actionPath || '';
    const scenario = module.spotInfo.scenario;
    const parsed = parseActionPath(heroPos, actionPath, scenario);

    const numPos = POSITIONS.length;
    const heroIdx = POSITIONS.indexOf(heroPos);

    // For HU: hero at seat 1 (bottom), villain at seat 0 (top)
    // For 6-max: hero at seat 3 (bottom-center)
    const heroSeat = numPos <= 2 ? 1 : 3;
    const rotation = (heroSeat - heroIdx + numPos) % numPos;

    let html = '<div class="mini-table-inner"></div>';

    const seats = numPos <= 2 ? VISUAL_SEATS_HU : VISUAL_SEATS;

    POSITIONS.forEach((pos, idx) => {
        const seatIdx = (idx + rotation) % numPos;
        const visualSeat = seats[seatIdx];
        const data = parsed.positions[pos];

        let classes = `table-position ${data.state}`;
        if (data.isOriginalRaiser) classes += ' original-raiser';

        const isActiveOpponent = data.state !== 'folder' && pos !== heroPos;
        const cardBacks = isActiveOpponent
            ? '<div class="pos-cards"><span></span><span></span><span></span><span></span></div>'
            : '';

        const playerName = module.players && module.players[pos] ? module.players[pos] : '';
        const posClass = seatIdx === 0 ? 'pos-top' : 'pos-bottom';
        const playerNameHtml = playerName ? `<span class="player-name ${posClass}" title="${playerName}">${playerName}</span>` : '';

        html += `<div class="${classes}" style="top:${visualSeat.top};left:${visualSeat.left}">
            ${cardBacks}
            <span class="pos-name">${pos}</span>
            ${playerNameHtml}
            ${data.betSize ? `<span class="pos-bet">${data.betSize}</span>` : ''}
        </div>`;
    });

    // Dealer Button next to SB (SB has the button in HU)
    const btnPos = POSITIONS.indexOf('SB');
    if (btnPos >= 0) {
        const btnSeatIdx = (btnPos + rotation) % numPos;
        const btnSeat = seats[btnSeatIdx];
        html += `<div class="dealer-button" style="top:calc(${btnSeat.top} + 15%);left:calc(${btnSeat.left} - 8%)">D</div>`;
    }

    // Show pot/action info in center
    const actionFlow = parsed.actionFlow.join(' \u2192 ');
    html += `<div class="table-action-label">${actionFlow || 'Open'}</div>`;
    tableEl.innerHTML = html;
}

function parseActionPath(heroPos, actionPath, scenario) {
    const positions = {};
    let actionFlow = [];
    let originalRaiser = null;
    let raiseCount = 0;

    POSITIONS.forEach(p => {
        positions[p] = { state: 'inactive', betSize: '', isOriginalRaiser: false };
    });
    positions[heroPos].state = 'hero';

    if (scenario === 'RFI') {
        // Hero is opening - mark folders before hero
        const heroIdx = POSITIONS.indexOf(heroPos);
        for (let i = 0; i < heroIdx; i++) {
            positions[POSITIONS[i]].state = 'folder';
        }
        // Hero is the raiser (opening)
        positions[heroPos].betSize = 'Open';
        positions[heroPos].isOriginalRaiser = true;
        raiseCount = 1;
        actionFlow.push(`${heroPos} opens`);
    } else {
        // Parse the action path for raises and calls
        // Format: "UTGF-MP100%-COC" = UTG fold, MP raise 100%, CO call
        const parts = actionPath.split('-');
        parts.forEach((part) => {
            const match = part.match(/^(UTG|MP|CO|BTN|SB|BB)(100%|50%|AI|F|C)$/);
            if (!match) return;

            const pos = match[1];
            const action = match[2];

            if (action === 'F') {
                positions[pos].state = 'folder';
            } else if (action === 'C') {
                positions[pos].state = 'caller';
                positions[pos].betSize = 'Call';
                actionFlow.push(`${pos} calls`);
            } else if (action === '100%' || action === '50%' || action === 'AI') {
                raiseCount++;
                positions[pos].state = 'raiser';

                // Determine raise type label
                if (raiseCount === 1) {
                    positions[pos].betSize = 'Raise';
                    positions[pos].isOriginalRaiser = true;
                    originalRaiser = pos;
                    actionFlow.push(`${pos} raises`);
                } else if (raiseCount === 2) {
                    positions[pos].betSize = '3-Bet';
                    actionFlow.push(`${pos} 3-bets`);
                } else if (raiseCount === 3) {
                    positions[pos].betSize = '4-Bet';
                    actionFlow.push(`${pos} 4-bets`);
                } else {
                    positions[pos].betSize = `${raiseCount + 1}-Bet`;
                    actionFlow.push(`${pos} ${raiseCount + 1}-bets`);
                }

                // Add sizing indicator
                if (action === 'AI') {
                    positions[pos].betSize += ' AI';
                } else if (action === '50%') {
                    positions[pos].betSize += ' ½';
                }
            }
        });

        // Mark folders (positions before hero that didn't act)
        const heroIdx = POSITIONS.indexOf(heroPos);
        for (let i = 0; i < heroIdx; i++) {
            if (positions[POSITIONS[i]].state === 'inactive') {
                positions[POSITIONS[i]].state = 'folder';
            }
        }

        // Set hero's raise label
        if (scenario === 'vsRFI' || scenario === 'vsRFIMulti' || scenario === 'vs3Bet' || scenario === 'vs4Bet' || scenario === 'vs5Bet+') {
            positions[heroPos].betSize = '?';
        }
    }

    return { positions, actionFlow, originalRaiser, raiseCount };
}

function getScenarioLabel(scenario) {
    switch (scenario) {
        case 'RFI': return 'Open';
        case 'vsRFI': return 'vs Raise';
        case 'vsRFIMulti': return 'vs Raise\n(Multi)';
        case 'vs3Bet': return 'vs 3-Bet';
        case 'vs4Bet': return 'vs 4-Bet';
        case 'vs5Bet+': return 'vs 5-Bet+';
        default: return scenario;
    }
}
