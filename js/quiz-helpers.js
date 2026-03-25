/**
 * PLO Range Quiz - Helper Functions
 */

function getSortedRanks(notation) {
    const ranks = [];
    for (let i = 0; i < notation.length; i += 2) ranks.push(notation[i]);
    ranks.sort((a, b) => RANK_ORDER.indexOf(a) - RANK_ORDER.indexOf(b));
    return ranks.join('');
}

function getSortedRanksArray(notation) {
    const ranks = [];
    for (let i = 0; i < notation.length; i += 2) ranks.push(notation[i]);
    ranks.sort((a, b) => RANK_ORDER.indexOf(a) - RANK_ORDER.indexOf(b));
    return ranks;
}

function formatCardNotation(notation) {
    const cards = [];
    for (let i = 0; i < notation.length; i += 2) {
        cards.push({ rank: notation[i], suit: notation[i + 1].toLowerCase() });
    }
    cards.sort((a, b) => RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank));
    let html = '';
    cards.forEach(card => { html += `<span class="card card-${card.suit}">${card.rank}</span>`; });
    return html;
}

function formatEV(ev) {
    if (ev === undefined || ev === null) return '';
    const evBB = ev / 2000;
    return (evBB >= 0 ? '+' : '') + evBB.toFixed(2);
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        const temp = array[i]; array[i] = array[j]; array[j] = temp;
    }
    return array;
}
