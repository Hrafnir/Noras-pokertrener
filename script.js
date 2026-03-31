/* Version: #3 */

// === DATAKONFIGURASJON ===
const POSITIONS = ["UTG", "UTG+1", "UTG+2", "LJ", "HJ", "CO", "BTN", "SB", "BB"];
const SUITS = [
    { name: 'spades', symbol: '♠', color: 'black' },
    { name: 'hearts', symbol: '♥', color: 'red' },
    { name: 'diamonds', symbol: '♦', color: 'red' },
    { name: 'clubs', symbol: '♣', color: 'black' }
];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

// Forenklet RFI-tabell (Raise First In) for 40BB
// Basert på standard MTT GTO-ranges
const RFI_RANGES = {
    "UTG":   ["22+", "AJs+", "KQs", "AQo+"], 
    "UTG+1": ["22+", "ATs+", "KJs+", "AQo+"],
    "UTG+2": ["22+", "ATs+", "KJs+", "QJs", "AJo+"],
    "LJ":    ["22+", "A8s+", "KJs+", "QJs", "JTs", "AJo+", "KQo"],
    "HJ":    ["22+", "A5s+", "KTs+", "QTs+", "JTs", "T9s", "ATo+", "KQo"],
    "CO":    ["22+", "A2s+", "K8s+", "Q9s+", "J9s+", "T9s", "98s", "87s", "ATo+", "KTo+", "QJo"],
    "BTN":   ["22+", "A2s+", "K2s+", "Q5s+", "J7s+", "T7s+", "97s+", "86s+", "76s", "65s", "54s", "A2o+", "K9o+", "Q9o+", "J9o+", "T9o"],
    "SB":    ["22+", "A2s+", "K2s+", "Q2s+", "J4s+", "T6s+", "96s+", "85s+", "75s+", "64s+", "53s+", "A2o+", "K5o+", "Q8o+", "J8o+", "T8o+", "98o"]
};

// === APP TILSTAND ===
let state = {
    currentPositionIndex: 0, // Starter på UTG
    currentHand: [],
    isSuited: false,
    handString: "", // f.eks "AKs" eller "75o"
    evaluation: ""
};

// === HJELPEFUNKSJONER ===
function log(msg) {
    console.log(`[POKER-LOG] ${msg}`);
}

function getRandomCard() {
    const value = VALUES[Math.floor(Math.random() * VALUES.length)];
    const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
    return { value, suit };
}

function getHandRankValue(val) {
    if (val === 'T') return 10;
    if (val === 'J') return 11;
    if (val === 'Q') return 12;
    if (val === 'K') return 13;
    if (val === 'A') return 14;
    return parseInt(val);
}

// === KJERNEFUNKSJONALITET ===

function dealNewHand() {
    log("Deler ut ny hånd...");
    
    // 1. Trekk to unike kort
    let card1 = getRandomCard();
    let card2 = getRandomCard();
    while (card1.value === card2.value && card1.suit.name === card2.suit.name) {
        card2 = getRandomCard();
    }
    
    state.currentHand = [card1, card2];
    state.isSuited = card1.suit.name === card2.suit.name;
    
    // 2. Formater hånd-streng (høyeste kort først)
    const v1 = getHandRankValue(card1.value);
    const v2 = getHandRankValue(card2.value);
    
    if (v1 === v2) {
        state.handString = card1.value + card1.value + "+"; // Par
    } else {
        const high = v1 > v2 ? card1.value : card2.value;
        const low = v1 > v2 ? card2.value : card1.value;
        state.handString = high + low + (state.isSuited ? "s" : "o");
    }

    // 3. Roter posisjon (Hopp over BB da man ikke kan RFI derfra)
    state.currentPositionIndex = (state.currentPositionIndex + 1) % 8; 
    
    updateUI();
    hideFeedback();
}

function updateUI() {
    const pos = POSITIONS[state.currentPositionIndex];
    document.getElementById('current-position').textContent = pos;
    document.getElementById('current-hand').textContent = state.handString.replace('+', '');
    
    // Oppdater visuelle kort
    const cardContainer = document.getElementById('hole-cards');
    cardContainer.innerHTML = '';
    
    state.currentHand.forEach(card => {
        const cardDiv = document.createElement('div');
        cardDiv.className = `card ${card.suit.color}`;
        cardDiv.innerHTML = `${card.value}<br>${card.suit.symbol}`;
        cardContainer.appendChild(cardDiv);
    });

    // Marker aktivt sete på bordet
    document.querySelectorAll('.seat').forEach(s => s.classList.remove('active-hero'));
    const seatId = `seat-${pos.toLowerCase().replace('+', '')}`;
    const activeSeat = document.getElementById(seatId);
    if (activeSeat) activeSeat.classList.add('active-hero');

    log(`Situasjon: ${pos} med ${state.handString}`);
}

function checkAction(action) {
    const pos = POSITIONS[state.currentPositionIndex];
    const range = RFI_RANGES[pos] || [];
    
    // Enkel sjekk: Er handString i range-listen? 
    // (Merk: I en full versjon ville vi sjekket mot matriser, her bruker vi forenklet logikk)
    const shouldRaise = range.some(hand => {
        if (hand.endsWith('+')) {
            // Håndterer par-logikk (f.eks 22+)
            if (state.handString.includes('+')) {
                return getHandRankValue(state.handString[0]) >= getHandRankValue(hand[0]);
            }
            return false;
        }
        return hand === state.handString;
    });

    let result = "";
    let statusClass = "";
    let explanation = "";

    if (action === 'LIMP') {
        result = "FEIL!";
        statusClass = "wrong";
        explanation = "Du bør ALDRI limpe (bare syne) når du er den første som går inn i potten. Enten høyner du for å ta kontroll, eller så kaster du. Limping gir motspillerne dine en billig sjanse til å se floppen.";
    } else if (action === 'RAISE') {
        if (shouldRaise) {
            result = "RIKTIG!";
            statusClass = "correct";
            explanation = `Solid spill! ${state.handString} er en sterk nok hånd til å åpne med fra ${pos}. Du bygger pott og legger press på spillerne bak deg.`;
        } else {
            result = "MARGINALT / FEIL";
            statusClass = "marginal";
            explanation = `Dette er litt for aggressivt. Fra ${pos} bør du kaste ${state.handString}. Husk at det sitter mange spillere bak deg som kan ha en bedre hånd.`;
        }
    } else if (action === 'FOLD') {
        if (!shouldRaise) {
            result = "RIKTIG!";
            statusClass = "correct";
            explanation = `God kast! ${state.handString} er for svakt til å åpne fra ${pos}. Det er viktig å være disiplinert i tidlige og midtre posisjoner.`;
        } else {
            result = "FEIL!";
            statusClass = "wrong";
            explanation = `Her kaster du en vinnerhånd! ${state.handString} er mer enn sterk nok til å åpne med fra ${pos}. Ikke vær redd for å spille dine gode hender.`;
        }
    }

    showFeedback(result, explanation, statusClass);
}

function showFeedback(title, text, statusClass) {
    const panel = document.getElementById('feedback-panel');
    panel.className = `feedback-panel ${statusClass}`;
    document.getElementById('feedback-title').textContent = title;
    document.getElementById('feedback-text').textContent = text;
    panel.classList.remove('hidden');
    
    // Deaktiver knapper midlertidig
    document.querySelectorAll('.action-btn').forEach(b => b.disabled = true);
}

function hideFeedback() {
    document.getElementById('feedback-panel').classList.add('hidden');
    document.querySelectorAll('.action-btn').forEach(b => b.disabled = false);
}

// === EVENT LISTENERS ===
document.getElementById('btn-fold').addEventListener('click', () => checkAction('FOLD'));
document.getElementById('btn-call').addEventListener('click', () => checkAction('LIMP'));
document.getElementById('btn-raise').addEventListener('click', () => checkAction('RAISE'));
document.getElementById('btn-next-hand').addEventListener('click', dealNewHand);

// Start spillet
window.onload = () => {
    log("Applikasjon startet.");
    dealNewHand();
};

/* Version: #3 */
