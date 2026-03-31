/**
 * VERSION #6 - COMPLETE PROFESSIONAL GTO TRAINER ENGINE
 * Optimalisert for 40BB MTT RFI (Raise First In)
 */

// 1. KONFIGURASJON OG DATAGRUNNLAG
const POSITIONS = ["UTG", "UTG1", "UTG2", "LJ", "HJ", "CO", "BTN", "SB"];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
const SUITS = [
    { name: 'spades', symbol: '♠', color: 'black' },
    { name: 'hearts', symbol: '♥', color: 'red' },
    { name: 'diamonds', symbol: '♦', color: 'red' },
    { name: 'clubs', symbol: '♣', color: 'black' }
];

/**
 * GTO RANGES (40BB Perimeters)
 * Formatet definerer minimumskravene for hver kategori per posisjon.
 */
const GTO_RANGES = {
    "UTG":  { pairs: '77', suitedA: 'AT', offsuitA: 'AK', suitedK: 'KQ', extras: ['QJs', 'JTs'] },
    "UTG1": { pairs: '66', suitedA: 'A9', offsuitA: 'AQ', suitedK: 'KJ', extras: ['QJs', 'JTs'] },
    "UTG2": { pairs: '55', suitedA: 'A8', offsuitA: 'AJ', suitedK: 'KT', extras: ['QJs', 'JTs', 'T9s'] },
    "LJ":   { pairs: '44', suitedA: 'A2', offsuitA: 'AJ', suitedK: 'K9', extras: ['Q9s', 'J9s', 'T9s', '98s', 'KQo'] },
    "HJ":   { pairs: '22', suitedA: 'A2', offsuitA: 'AT', suitedK: 'K8', extras: ['Q9s', 'J9s', 'T9s', '98s', '87s', 'KQo', 'KJo'] },
    "CO":   { pairs: '22', suitedA: 'A2', offsuitA: 'AT', suitedK: 'K5', extras: ['Q8s', 'J8s', 'T8s', '97s', '87s', '76s', 'KTo', 'QJo'] },
    "BTN":  { pairs: '22', suitedA: 'A2', offsuitA: 'A2', suitedK: 'K2', extras: ['Q5s', 'J7s', 'T7s', '97s', '86s', '76s', '65s', '54s', 'K9o', 'Q9o', 'J9o', 'T9o'] },
    "SB":   { pairs: '22', suitedA: 'A2', offsuitA: 'A2', suitedK: 'K2', extras: ['Q2s', 'J4s', 'T6s', '96s', '85s', '75s', '64s', '53s', '43s', 'K5o', 'Q8o', 'J8o', 'T8o', '98o'] }
};

// 2. APP-TILSTAND
let gameState = {
    currentPosIdx: 0,
    hand: [],
    handString: "", // F.eks "AJs" eller "77"
    isSuited: false
};

// 3. HJELPEFUNKSJONER
function getCardValue(v) {
    return VALUES.indexOf(v) + 2;
}

/**
 * Kjernen i logikken: Sjekker om en hånd er i RFI-range for gitt posisjon.
 */
function isHandInRfiRange(handStr, pos) {
    // REGEL: AKs er alltid en raise (fra alle posisjoner)
    if (handStr === "AKs" || handStr === "AA" || handStr === "KK" || handStr === "QQ") return true;

    const range = GTO_RANGES[pos];
    const val1 = handStr[0];
    const val2 = handStr[1];
    const type = handStr.endsWith('s') ? 'suited' : (handStr.endsWith('o') ? 'offsuit' : 'pair');

    const v1 = getCardValue(val1);
    const v2 = getCardValue(val2);
    const high = Math.max(v1, v2);
    const low = Math.min(v1, v2);

    // Sjekk Par
    if (type === 'pair') {
        return high >= getCardValue(range.pairs[0]);
    }

    // Sjekk Ess (Suited/Offsuit)
    if (high === 14) {
        const minLow = (type === 'suited') ? getCardValue(range.suitedA[1]) : getCardValue(range.offsuitA[1]);
        if (low >= minLow) return true;
    }

    // Sjekk Konger (Suited)
    if (high === 13 && type === 'suited') {
        if (low >= getCardValue(range.suitedK[1])) return true;
    }

    // Sjekk Extras (Suited connectors, gappers og spesifikke offsuit hender)
    // Denne fanger opp ting som "T9s", "KQo" etc.
    return range.extras.some(extra => {
        const eVal1 = getCardValue(extra[0]);
        const eVal2 = getCardValue(extra[1]);
        const eType = extra.endsWith('s') ? 'suited' : 'offsuit';
        
        if (type === eType && high === eVal1 && low >= eVal2) return true;
        return false;
    });
}

// 4. GAMEPLAY LOGIKK
function dealNewHand() {
    // 1. Roter posisjon (tilfeldig eller sekvensielt)
    gameState.currentPosIdx = Math.floor(Math.random() * POSITIONS.length);
    const pos = POSITIONS[gameState.currentPosIdx];

    // 2. Generer to unike kort
    let card1Idx = Math.floor(Math.random() * 13);
    let suit1Idx = Math.floor(Math.random() * 4);
    let card2Idx = Math.floor(Math.random() * 13);
    let suit2Idx = Math.floor(Math.random() * 4);

    // Sikre at vi ikke får to identiske kort (f.eks. Spar Ess to ganger)
    while (card1Idx === card2Idx && suit1Idx === suit2Idx) {
        card2Idx = Math.floor(Math.random() * 13);
        suit2Idx = Math.floor(Math.random() * 4);
    }

    const c1 = { v: VALUES[card1Idx], s: SUITS[suit1Idx] };
    const c2 = { v: VALUES[card2Idx], s: SUITS[suit2Idx] };
    gameState.hand = [c1, c2];
    gameState.isSuited = c1.s.name === c2.s.name;

    // 3. Lag handString (f.eks "KQs", "A2o", "JJ")
    const v1 = getCardValue(c1.v);
    const v2 = getCardValue(c2.v);
    
    if (v1 === v2) {
        gameState.handString = c1.v + c2.v;
    } else {
        const higher = v1 > v2 ? c1.v : c2.v;
        const lower = v1 > v2 ? c2.v : c1.v;
        gameState.handString = higher + lower + (gameState.isSuited ? "s" : "o");
    }

    updateUI();
}

// 5. UI OPPDATERING
function updateUI() {
    const pos = POSITIONS[gameState.currentPosIdx];
    
    // Oppdater tekst
    document.getElementById('current-pos-display').textContent = pos;
    
    // Oppdater bordet (visuelt sete)
    document.querySelectorAll('.seat').forEach(s => s.classList.remove('active-hero'));
    const seatId = "seat-" + pos.toLowerCase();
    const seatElem = document.getElementById(seatId);
    if (seatElem) seatElem.classList.add('active-hero');

    // Vis kortene
    const cardContainer = document.getElementById('hole-cards');
    cardContainer.innerHTML = '';
    gameState.hand.forEach(card => {
        const cardDiv = document.createElement('div');
        cardDiv.className = `card ${card.s.color}`;
        cardDiv.innerHTML = `<div>${card.v}</div><div style="font-size: 0.8em">${card.s.symbol}</div>`;
        cardContainer.appendChild(cardDiv);
    });

    // Skjul feedback
    document.getElementById('feedback-panel').classList.add('hidden');
}

function checkAction(userAction) {
    const pos = POSITIONS[gameState.currentPosIdx];
    const shouldRaise = isHandInRfiRange(gameState.handString, pos);
    
    let result = "";
    let explanation = "";
    let statusClass = "";

    if (userAction === 'LIMP') {
        result = "FEIL!";
        statusClass = "wrong";
        explanation = "I GTO skal du aldri limpe (med mindre det er spesielle SB-strategier). Raise eller fold.";
    } else if (userAction === 'RAISE') {
        if (shouldRaise) {
            result = "RIKTIG!";
            statusClass = "correct";
            explanation = `${gameState.handString} er en standard åpning fra ${pos}.`;
        } else {
            result = "FOR AGGRESSIVT!";
            statusClass = "marginal";
            explanation = `${gameState.handString} er for svakt til å åpne fra ${pos}.`;
        }
    } else if (userAction === 'FOLD') {
        if (!shouldRaise) {
            result = "RIKTIG!";
            statusClass = "correct";
            explanation = `Bra kast. ${gameState.handString} spiller dårlig fra ${pos}.`;
        } else {
            result = "FOR TIGHT!";
            statusClass = "wrong";
            explanation = `Her må du høyne! ${gameState.handString} er for god til å kastes her.`;
        }
    }

    displayFeedback(result, explanation, statusClass);
}

function displayFeedback(title, text, status) {
    const panel = document.getElementById('feedback-panel');
    panel.className = `feedback-panel ${status}`;
    document.getElementById('feedback-title').textContent = title;
    document.getElementById('feedback-text').textContent = text;
    panel.classList.remove('hidden');
}

// 6. EVENT LISTENERS
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-fold').onclick = () => checkAction('FOLD');
    document.getElementById('btn-call').onclick = () => checkAction('LIMP');
    document.getElementById('btn-raise').onclick = () => checkAction('RAISE');
    document.getElementById('btn-next').onclick = dealNewHand;

    // Start spillet
    dealNewHand();
});
