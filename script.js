/* Version: #21 - The Ultimate Pro Trainer (Fixed BB Push/Fold Logic) */

// === 1. KONFIGURASJON OG DATA ===

const POSITIONS = ["UTG", "UTG1", "UTG2", "LJ", "HJ", "CO", "BTN", "SB", "BB"];
const VALUES = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
const SUITS = [
    { name: 'spades', symbol: '♠', color: 'black' },
    { name: 'hearts', symbol: '♥', color: 'red' },
    { name: 'diamonds', symbol: '♦', color: 'red' },
    { name: 'clubs', symbol: '♣', color: 'black' }
];

// --- 40BB RANGES (Standard MTT) ---
const RANGES_40 = {
    RFI: {
        "UTG":  ["77+", "ATs+", "A5s-A4s", "KQs", "QJs", "JTs", "AQo+"],
        "UTG1": ["66+", "A9s+", "A5s-A3s", "KJs+", "QJs", "JTs", "AQo+"],
        "UTG2": ["55+", "A8s+", "A5s-A2s", "KTs+", "QTs+", "JTs", "T9s", "AJo+"],
        "LJ":   ["44+", "A2s+", "K9s+", "Q9s+", "J9s+", "T9s", "98s", "AJo+", "KQo"],
        "HJ":   ["22+", "A2s+", "K8s+", "Q9s+", "J9s+", "T9s", "98s", "87s", "ATo+", "KJo+", "KQo"],
        "CO":   ["22+", "A2s+", "K5s+", "Q8s+", "J8s+", "T8s+", "97s+", "87s", "76s", "ATo+", "KTo+", "QJo"],
        "BTN":  ["22+", "A2s+", "K2s+", "Q2s+", "J5s+", "T6s+", "96s+", "85s+", "75s+", "64s+", "54s+", "A2o+", "K9o+", "Q9o+", "J9o+", "T9o+"],
        "SB_RAISE": ["55+", "A8s+", "A5s-A4s", "KJs+", "QJs", "AJo+", "KQo"],
        "SB_LIMP":  ["22+", "A2s+", "K2s+", "Q2s+", "J2s+", "T2s+", "95s+", "84s+", "74s+", "63s+", "53s+", "43s+", "A2o+", "K5o+", "Q8o+", "J8o+", "T8o+", "98o+"],
        "HU_BTN": ["22+", "A2s+", "K2s+", "Q2s+", "J2s+", "T2s+", "94s+", "84s+", "74s+", "64s+", "54s+", "A2o+", "K2o+", "Q4o+", "J6o+", "T7o+", "97o+", "87o+"]
    },
    CALL: {
        "UTG1": ["88", "99", "TT", "JJ", "AQs"],
        "LJ":   ["66", "77", "88", "99", "TT", "JJ", "AQs", "KQs", "JTs"],
        "HJ":   ["55", "66", "77", "88", "99", "TT", "JJ", "AJs+", "KQs", "QJs", "JTs", "T9s"],
        "CO":   ["44", "55", "66", "77", "88", "99", "TT", "JJ", "ATs+", "KTs+", "QTs+", "JTs", "T9s", "98s", "AQo"],
        "BTN":  ["22", "33", "44", "55", "66", "77", "88", "99", "TT", "JJ", "ATs+", "KTs+", "QTs+", "JTs", "T9s", "98s", "87s", "AQo"],
        "SB":   [], 
        "BB":   ["22+", "A2s+", "K8s+", "Q9s+", "J9s+", "T9s", "98s", "87s", "76s", "AJo+", "KQo", "KJo+"],
        "HU_BB": ["22+", "A2s+", "K2s+", "Q2s+", "J5s+", "T6s+", "95s+", "85s+", "75s+", "65s+", "A2o+", "K2o+", "Q7o+", "J8o+", "T8o+", "98o+"]
    },
    THREE_BET: {
        "UTG1": ["QQ+", "AKs", "AKo"],
        "LJ":   ["QQ+", "AKs", "AQs", "AKo", "A5s", "A4s"],
        "HJ":   ["QQ+", "AKs", "AQs", "AKo", "A5s", "A4s"],
        "CO":   ["QQ+", "AKs", "AQs", "AJs", "AKo", "A5s-A2s"],
        "BTN":  ["QQ+", "AKs", "AQs", "AJs", "AKo", "A5s-A2s"],
        "SB":   ["99+", "AJs+", "KQs", "AQo+", "A5s-A4s"], 
        "BB":   ["JJ+", "AQs+", "AKo", "A5s-A2s"],
        "HU_BB": ["88+", "A9s+", "KJs+", "QJs", "AJo+", "KQo", "A5s-A2s"]
    }
};

// --- 100BB RANGES (Deep Stack) ---
const RANGES_100 = {
    RFI: { ...RANGES_40.RFI, 
        "UTG":  ["77+", "ATs+", "A5s-A2s", "KQs", "KJs", "QJs", "JTs", "T9s", "AQo+"],
        "LJ":   ["44+", "A2s+", "K9s+", "Q9s+", "J9s+", "T9s", "98s", "87s", "AJo+", "KQo", "KJo"],
    },
    CALL: { ...RANGES_40.CALL,
        "BTN":  ["22", "33", "44", "55", "66", "77", "88", "99", "TT", "JJ", "ATs+", "KTs+", "QTs+", "JTs", "T9s", "98s", "87s", "76s", "65s", "AQo", "AJo", "KQo"], 
        "BB":   ["22+", "A2s+", "K2s+", "Q5s+", "J7s+", "T7s+", "97s+", "86s+", "75s+", "65s", "54s", "ATo+", "KTo+", "QTo+", "JTo"]
    },
    THREE_BET: { ...RANGES_40.THREE_BET,
        "BTN":  ["QQ+", "AKs", "AQs", "AJs", "AKo", "A5s-A2s", "K9s", "Q9s", "J9s", "T9s"], 
    }
};

// --- 15BB RANGES (Push/Fold) ---
const RANGES_15 = {
    RFI: {
        "UTG":  ["55+", "A8s+", "A5s", "KTs+", "QJs", "ATo+", "KQo"],
        "LJ":   ["22+", "A2s+", "K8s+", "Q9s+", "J9s+", "T9s", "A9o+", "KTo+", "QJo"],
        "HJ":   ["22+", "A2s+", "K5s+", "Q8s+", "J8s+", "T8s+", "98s", "A7o+", "KTo+", "QTo+", "JTo"],
        "CO":   ["22+", "A2s+", "K2s+", "Q5s+", "J7s+", "T7s+", "97s+", "87s", "76s", "A2o+", "K8o+", "Q9o+", "J9o+", "T9o"],
        "BTN":  ["22+", "A2s+", "K2s+", "Q2s+", "J2s+", "T5s+", "95s+", "85s+", "75s+", "65s", "A2o+", "K2o+", "Q5o+", "J8o+", "T8o+", "98o"],
        "SB_RAISE": ["22+", "A2s+", "K2s+", "Q2s+", "J2s+", "T2s+", "92s+", "84s+", "74s+", "64s+", "A2o+", "K2o+", "Q2o+", "J5o+", "T6o+", "96o+", "87o"], 
        "SB_LIMP": [], 
        "HU_BTN": ["22+", "A2s+", "K2s+", "Q2s+", "J2s+", "T2s+", "92s+", "82s+", "72s+", "62s+", "52s+", "42s+", "32s+", "A2o+", "K2o+", "Q2o+", "J2o+", "T2o+", "92o+", "84o+", "74o+", "64o+", "54o+"] 
    },
    CALL: {
        "BB": ["22+", "A2s+", "K5s+", "Q8s+", "J8s+", "T8s+", "98s", "A2o+", "K8o+", "Q9o+", "JTo"], 
        "HU_BB": ["22+", "A2s+", "K2s+", "Q2s+", "J5s+", "T6s+", "97s+", "87s", "A2o+", "K2o+", "Q8o+", "J8o+", "T8o+", "98o"]
    },
    THREE_BET: {
        "UTG1": ["99+", "AJs+", "AQo+"], 
        "LJ":   ["88+", "ATs+", "KQs", "AJo+", "KQo"],
        "HJ":   ["77+", "A9s+", "KJs+", "ATo+", "KJo+"],
        "CO":   ["66+", "A8s+", "A5s", "KTs+", "QTs+", "A9o+", "KTo+", "QJo"],
        "BTN":  ["55+", "A2s+", "K9s+", "Q9s+", "J9s+", "T9s", "A8o+", "KTo+", "QTo+", "JTo"],
        "SB":   ["55+", "A2s+", "K9s+", "Q9s+", "J9s+", "T9s", "A8o+", "KTo+", "QTo+", "JTo"],
        "BB":   ["88+", "A9s+", "A5s-A4s", "KJs+", "ATo+", "KQo"], // FIKSET: Reshoves for 15BB
        "HU_BB": ["66+", "A6s+", "KTs+", "QTs+", "JTs", "A8o+", "KTo+", "QJo"] // FIKSET: Reshoves for HU
    }
};

const MASTER_RANGES = { "100": RANGES_100, "40": RANGES_40, "15": RANGES_15 };

// === 2. APP-TILSTAND ===
let state = {
    stackSize: "40",
    tableSize: 9,
    activePositions: [],
    currentPosString: "",
    villainPosString: "",
    hand: [],
    handStr: "",
    isSuited: false,
    score: 0,
    streak: 0,
    expanded: { "100": {}, "40": {}, "15": {} }
};

// === 3. UTVIDELSE AV RANGES (MOTOR) ===

function expandRangeConfig(rangeArr) {
    if (!rangeArr) return new Set();
    if (rangeArr.includes("ANY")) return "ANY";
    let hands = new Set();
    rangeArr.forEach(item => {
        if (item.endsWith('+')) {
            let base = item.slice(0, -1);
            if (base.length === 2) { 
                let valIdx = VALUES.indexOf(base[0]);
                for (let i = 0; i <= valIdx; i++) hands.add(VALUES[i] + VALUES[i]);
            } else { 
                let c1 = base[0], c2 = base[1], type = base[2];
                let idx1 = VALUES.indexOf(c1), idx2 = VALUES.indexOf(c2);
                for (let i = idx1 + 1; i <= idx2; i++) hands.add(c1 + VALUES[i] + type);
            }
        } else if (item.includes('-')) { 
            let parts = item.split('-');
            let base1 = parts[0], base2 = parts[1];
            let c1 = base1[0], type = base1[2];
            let start = Math.min(VALUES.indexOf(base1[1]), VALUES.indexOf(base2[1]));
            let end = Math.max(VALUES.indexOf(base1[1]), VALUES.indexOf(base2[1]));
            for (let i = start; i <= end; i++) hands.add(c1 + VALUES[i] + type);
        } else hands.add(item);
    });
    if(!rangeArr.includes("ANY") && rangeArr.length > 0) {
        hands.add("AA"); hands.add("KK"); 
    }
    return hands;
}

function initializeRanges() {
    ["100", "40", "15"].forEach(stack => {
        state.expanded[stack] = { rfi: {}, call: {}, threeBet: {} };
        for (let pos in MASTER_RANGES[stack].RFI) state.expanded[stack].rfi[pos] = expandRangeConfig(MASTER_RANGES[stack].RFI[pos]);
        for (let pos in MASTER_RANGES[stack].CALL) state.expanded[stack].call[pos] = expandRangeConfig(MASTER_RANGES[stack].CALL[pos]);
        for (let pos in MASTER_RANGES[stack].THREE_BET) state.expanded[stack].threeBet[pos] = expandRangeConfig(MASTER_RANGES[stack].THREE_BET[pos]);
    });
}

function getActivePositions(size) {
    if (size === 9) return ["UTG", "UTG1", "UTG2", "LJ", "HJ", "CO", "BTN", "SB", "BB"];
    if (size === 8) return ["UTG", "UTG2", "LJ", "HJ", "CO", "BTN", "SB", "BB"]; 
    if (size === 6) return ["LJ", "HJ", "CO", "BTN", "SB", "BB"];
    if (size === 3) return ["BTN", "SB", "BB"];
    if (size === 2) return ["BTN", "BB"]; 
    return [];
}

function getCorrectRangeSet(stack, type, pos, tableSize) {
    let stateType = type === "RFI" ? "rfi" : (type === "CALL" ? "call" : "threeBet");
    let fallbackPos = pos;
    
    if (!state.expanded[stack][stateType][pos]) {
        fallbackPos = "HJ"; 
    }

    if (type === "RFI") {
        if (tableSize === 2 && pos === "BTN") return state.expanded[stack].rfi["HU_BTN"] || new Set();
        if (pos === "SB") return state.expanded[stack].rfi["SB_RAISE"] || new Set();
        return state.expanded[stack].rfi[pos] || state.expanded[stack].rfi[fallbackPos] || new Set();
    } else if (type === "CALL") {
        if (tableSize === 2 && pos === "BB") return state.expanded[stack].call["HU_BB"] || new Set();
        return state.expanded[stack].call[pos] || state.expanded[stack].call[fallbackPos] || new Set();
    } else if (type === "THREE_BET") {
        if (tableSize === 2 && pos === "BB") return state.expanded[stack].threeBet["HU_BB"] || new Set();
        return state.expanded[stack].threeBet[pos] || state.expanded[stack].threeBet[fallbackPos] || new Set();
    }
    return new Set();
}

// === 4. KONTEKST OG MARGINAL LOGIKK ===

function isMarginalOutside(handStr, rangeSet) {
    if(!rangeSet || rangeSet === "ANY" || rangeSet.has(handStr)) return false;
    let v1 = VALUES.indexOf(handStr[0]), v2 = VALUES.indexOf(handStr[1]);
    let type = handStr.length === 3 ? handStr[2] : "";

    if(handStr.length === 2 && v1 > 0) return rangeSet.has(VALUES[v1-1] + VALUES[v1-1]);
    if(v2 > 0 && v2 - 1 !== v1) if(rangeSet.has(VALUES[v1] + VALUES[v2-1] + type)) return true;
    if(v1 > 0) if(rangeSet.has(VALUES[v1-1] + VALUES[v2] + type)) return true;
    return false;
}

function isMarginalInside(handStr, rangeSet) {
    if(!rangeSet || rangeSet === "ANY" || !rangeSet.has(handStr)) return false;
    let v1 = VALUES.indexOf(handStr[0]), v2 = VALUES.indexOf(handStr[1]);
    let type = handStr.length === 3 ? handStr[2] : "";

    if(handStr.length === 2) return (v1 < 12) ? !rangeSet.has(VALUES[v1+1] + VALUES[v1+1]) : true;
    if(v2 < 12) return !rangeSet.has(VALUES[v1] + VALUES[v2+1] + type);
    return false;
}

function getExploitativeContext(handStr, isTightError) {
    if (isTightError) {
        return `💡 <strong>Utnyttende Tips:</strong> GTO sier du burde spilt denne. MEN, hvis motstanderne bak deg er ekstremt aggressive og 3-better mye, kan det faktisk være riktig å kaste slike marginale hender for å slippe vanskelige situasjoner postflop.`;
    } else {
        return `💡 <strong>Utnyttende Tips:</strong> GTO sier fold. MEN, hvis bordet er fullt av stramme spillere som 'over-folder' blindene sine, bør du absolutt utvide rangen din og åpne med denne for å stjele sjetonger!`;
    }
}

// === 5. KATEGORISERING & PEDAGOGIKK ===

function getHandCategory(handStr) {
    if (["AA", "KK", "QQ"].includes(handStr)) return "PREMIUM_PAIR";
    if (["JJ", "TT"].includes(handStr)) return "HIGH_PAIR";
    if (["99", "88", "77"].includes(handStr)) return "MID_PAIR";
    if (handStr.length === 2) return "LOW_PAIR"; 
    if (["AKs", "AKo", "AQs", "AQo"].includes(handStr)) return "PREMIUM_BROADWAY";
    if (["A5s", "A4s", "A3s", "A2s"].includes(handStr)) return "SUITED_WHEEL_ACE";
    
    const v1 = VALUES.indexOf(handStr[0]), v2 = VALUES.indexOf(handStr[1]);
    const isSuited = handStr.endsWith('s');
    
    if (handStr[0] === 'A' && isSuited && v2 >= 5 && v2 <= 8) return "MID_SUITED_ACE"; 
    if (v1 <= 4 && v2 <= 4) return isSuited ? "SUITED_BROADWAY" : "OFFSUIT_BROADWAY";
    if (isSuited) {
        if (v2 - v1 === 1) return "SUITED_CONNECTOR";
        if (v2 - v1 === 2) return "SUITED_GAPPER";
    }
    if (!isSuited && (v1 > 4 || v2 > 4) && (v2 - v1 > 1)) return "TRASH";
    return "GENERAL";
}

function getCategoryExplanation(handStr, category, tableSize, pos) {
    const isEarlyPos = ["UTG", "UTG1", "UTG2", "LJ"].includes(pos);
    const isLatePos = ["HJ", "CO", "BTN"].includes(pos);
    
    if (category === "OFFSUIT_BROADWAY") {
        if (tableSize > 6 && isEarlyPos) return `${handStr} ser pent ut, men fra tidlig posisjon er dette en klassisk felle-hånd. Får du syn her, er du ofte dominert.`;
        if (isLatePos || tableSize <= 6) return `I sen posisjon eller med færre spillere, øker verdien på høye kort dramatisk. Den blokkerer sterke hender.`;
    }
    if (category === "LOW_PAIR") {
        if (tableSize > 6 && isEarlyPos) return `Å spille små par som ${handStr} fra tidlig posisjon kan være et tapsprosjekt da du ofte møter høynelser og må treffe sett.`;
        return `Når bordet krymper eller du har posisjon, er ${handStr} ekstremt sterk. Favoritt mot nesten alle usammenkoblede hender.`;
    }
    if (category === "SUITED_WHEEL_ACE") return `${handStr} er et fantastisk våpen! Den blokkerer sterke ess, kan treffe nut-flush, og lage straight (wheel).`;
    if (category === "TRASH") return tableSize === 2 ? `Selv i Heads-Up må vi trekke en grense. ${handStr} er for svak. Fold!` : `Dette er åpenbart søppel. Hold deg unna.`;
    if (category === "SUITED_CONNECTOR") return `${handStr} spiller utrolig bra postflop fordi den lett kan treffe sterke trekk og realiserer equityen bra.`;
    if (category === "PREMIUM_PAIR" || category === "PREMIUM_BROADWAY") return `Monsterhånd! ${handStr} skal spilles aggressivt for å bygge en stor pott.`;

    return `Posisjon og spillere bak deg avgjør hvor profitabel denne hånden er.`;
}

// === 6. SPILLELOGIKK (TRENER) ===

function generateRandomHand() {
    let c1v = Math.floor(Math.random() * 13), c1s = Math.floor(Math.random() * 4);
    let c2v = Math.floor(Math.random() * 13), c2s = Math.floor(Math.random() * 4);
    while (c1v === c2v && c1s === c2s) { c2v = Math.floor(Math.random() * 13); c2s = Math.floor(Math.random() * 4); }

    let hand = [{ v: VALUES[c1v], s: SUITS[c1s], idx: c1v }, { v: VALUES[c2v], s: SUITS[c2s], idx: c2v }];
    hand.sort((a, b) => a.idx - b.idx);
    let isSuited = c1s === c2s;
    let handStr = (hand[0].v === hand[1].v) ? hand[0].v + hand[1].v : hand[0].v + hand[1].v + (isSuited ? "s" : "o");
    
    return { hand, isSuited, handStr };
}

function dealNewHand() {
    const mode = document.getElementById('mode-selector').value;
    const focusMode = document.getElementById('focus-mode-toggle').checked;
    state.stackSize = document.getElementById('stack-size-selector').value;
    state.tableSize = parseInt(document.getElementById('table-size-selector').value);
    state.activePositions = getActivePositions(state.tableSize);
    
    document.getElementById('game-area').className = (state.tableSize < 9) ? `table-${state.tableSize}max` : '';

    if (mode === "RFI") {
        let rfiOptions = state.activePositions.filter(p => p !== "BB");
        state.currentPosString = rfiOptions[Math.floor(Math.random() * rfiOptions.length)];
        state.villainPosString = "";
    } else { 
        let heroOptions = state.activePositions.slice(1); 
        state.currentPosString = heroOptions[Math.floor(Math.random() * heroOptions.length)];
        let heroIdx = state.activePositions.indexOf(state.currentPosString);
        let villainOptions = state.activePositions.slice(0, heroIdx);
        state.villainPosString = villainOptions[Math.floor(Math.random() * villainOptions.length)];
    }

    let generatedObj = generateRandomHand();
    if (focusMode) {
        let maxAttempts = 150; 
        let foundMarginal = false;
        
        while (maxAttempts > 0 && !foundMarginal) {
            let tempObj = generateRandomHand();
            let isMarginal = false;

            if (mode === "RFI") {
                let range = getCorrectRangeSet(state.stackSize, "RFI", state.currentPosString, state.tableSize);
                if (isMarginalInside(tempObj.handStr, range) || isMarginalOutside(tempObj.handStr, range)) isMarginal = true;
            } else {
                let callR = getCorrectRangeSet(state.stackSize, "CALL", state.currentPosString, state.tableSize);
                let betR = getCorrectRangeSet(state.stackSize, "THREE_BET", state.currentPosString, state.tableSize);
                if (isMarginalInside(tempObj.handStr, callR) || isMarginalOutside(tempObj.handStr, callR) ||
                    isMarginalInside(tempObj.handStr, betR) || isMarginalOutside(tempObj.handStr, betR)) {
                    isMarginal = true;
                }
            }

            if (isMarginal) { generatedObj = tempObj; foundMarginal = true; }
            maxAttempts--;
        }
    }

    state.hand = generatedObj.hand;
    state.isSuited = generatedObj.isSuited;
    state.handStr = generatedObj.handStr;
    
    updateUI();
}

function checkAction(userAction) {
    const pos = state.currentPosString;
    const mode = document.getElementById('mode-selector').value;
    const categoryExplanation = getCategoryExplanation(state.handStr, getHandCategory(state.handStr), state.tableSize, pos);
    
    let isCorrect = false;
    let title = "", text = "", statusClass = "", contextText = "";

    if (mode === "RFI") {
        const raiseRange = getCorrectRangeSet(state.stackSize, "RFI", pos, state.tableSize);
        const isRaise = raiseRange.has ? raiseRange.has(state.handStr) : false;
        const isMarginalAggro = isMarginalOutside(state.handStr, raiseRange);
        const isMarginalTight = isMarginalInside(state.handStr, raiseRange);

        if (userAction === "RAISE") { 
            if (isRaise) { isCorrect = true; text = `Riktig standard åpning fra ${pos}. ${categoryExplanation}`; }
            else if (isMarginalAggro) { title = "NESTEN RIKTIG!"; statusClass = "marginal"; text = `GTO kaster denne, men den er rett på grensen.`; contextText = getExploitativeContext(state.handStr, false); }
            else { text = `Altfor løst! Denne kastes fra ${pos}. ${categoryExplanation}`; }
        } else if (userAction === "CALL") {
            if (pos === "SB" && state.expanded[state.stackSize].rfi["SB_LIMP"]?.has(state.handStr)) { isCorrect = true; text = "Godkjent limp (complete) fra SB."; }
            else { text = "I en uåpnet pott skal du ALDRI limpe (med unntak av Small Blind). Raise eller fold!"; }
        } else { // FOLD
            if (!isRaise) { isCorrect = true; text = `Godt og disiplinert kast. ${categoryExplanation}`; }
            else if (isMarginalTight) { title = "NESTEN RIKTIG!"; statusClass = "marginal"; text = `Denne er akkurat sterk nok til å åpne med.`; contextText = getExploitativeContext(state.handStr, true); }
            else { text = `Feil! GTO sier Raise. Du går glipp av verdi. ${categoryExplanation}`; }
        }
    } else { // FACING RAISE
        const threeBetRange = getCorrectRangeSet(state.stackSize, "THREE_BET", pos, state.tableSize);
        const callRange = getCorrectRangeSet(state.stackSize, "CALL", pos, state.tableSize);
        const is3Bet = threeBetRange.has ? threeBetRange.has(state.handStr) : false;
        const isCall = callRange.has ? callRange.has(state.handStr) : false;

        if (userAction === "RAISE") {
            if (is3Bet) { isCorrect = true; text = `Solid aggressivt spill! ${categoryExplanation}`; }
            else if (isMarginalOutside(state.handStr, threeBetRange)) { title = "NESTEN RIKTIG!"; statusClass = "marginal"; text = `Rett under grensen for aggressivt re-raise her.`; contextText = getExploitativeContext(state.handStr, false); }
            else { text = `Overspill. Du bør ikke høyne denne. ${categoryExplanation}`; }
        } else if (userAction === "CALL") {
            // FIX: Vi sjekker is3Bet først, slik at Call-valg på AA straffes
            if (pos === "SB" && state.tableSize > 2) { text = "Fra SB spiller moderne GTO nesten utelukkende 3-bet eller fold mot en raise."; }
            else if (is3Bet) { text = `Feil! Denne er så sterk at den MÅ re-raises (All-in / 3-Bet). Ikke bare syn!`; }
            else if (isCall) { isCorrect = true; text = `Godt forsvar (flat-call). ${categoryExplanation}`; }
            else if (isMarginalOutside(state.handStr, callRange)) { title = "NESTEN RIKTIG!"; statusClass = "marginal"; text = `Akkurat for svak til å forsvare.`; contextText = getExploitativeContext(state.handStr, false); }
            else { text = `Hånden er altfor svak til å syne en raise med. Fold!`; }
        } else { // FOLD
            if (!is3Bet && !isCall) { isCorrect = true; text = `Disiplinert kast mot en raise.`; }
            else if (isMarginalInside(state.handStr, callRange) || isMarginalInside(state.handStr, threeBetRange)) {
                title = "NESTEN RIKTIG!"; statusClass = "marginal"; text = `Litt for forsiktig! Innafor å forsvare.`; contextText = getExploitativeContext(state.handStr, true);
            }
            else { text = `Feil! Denne hånden er altfor sterk til å kastes.`; }
        }
    }

    if(!statusClass) statusClass = isCorrect ? "correct" : "wrong";
    if(!title) title = isCorrect ? "RIKTIG!" : "FEIL!";

    if (isCorrect) { state.score += 10; state.streak += 1; } 
    else { state.streak = 0; if (document.getElementById('auto-range-toggle').checked) setTimeout(() => openModal(true), 600); }
    
    document.getElementById('score-display').textContent = state.score;
    document.getElementById('streak-display').textContent = state.streak;
    displayFeedback(title, text, statusClass, contextText);
}

function updateUI() {
    const pos = state.currentPosString;
    const mode = document.getElementById('mode-selector').value;
    
    document.getElementById('current-pos-display').textContent = pos + (state.tableSize === 2 && pos === "BTN" ? " (SB)" : "");
    document.getElementById('range-pos-label').textContent = pos;
    
    if (state.stackSize === "15") document.getElementById('btn-raise').textContent = "ALL-IN (PUSH)";
    else document.getElementById('btn-raise').textContent = mode === "RFI" ? "RAISE (RFI)" : "RAISE (3-BET)";

    if (mode === "FACING_RAISE") {
        document.getElementById('scenario-display').textContent = `Møter en Raise fra ${state.villainPosString}`;
        document.getElementById('btn-call').textContent = "CALL (FLAT)";
    } else {
        document.getElementById('scenario-display').textContent = state.tableSize === 2 ? "Heads-Up (Du handler først)" : "Åpen Pott (Ingen har høynet)";
        document.getElementById('btn-call').textContent = "LIMP / CHECK";
    }

    document.querySelectorAll('.seat').forEach(s => { s.classList.remove('active-hero'); s.classList.remove('active-villain'); });
    document.getElementById("seat-" + pos.toLowerCase()).classList.add('active-hero');
    if (mode === "FACING_RAISE") document.getElementById("seat-" + state.villainPosString.toLowerCase()).classList.add('active-villain');

    const cc = document.getElementById('hole-cards');
    cc.innerHTML = '';
    state.hand.forEach(c => {
        const div = document.createElement('div');
        div.className = `card ${c.s.color}`;
        div.innerHTML = `<span>${c.v}</span><span style="font-size: 0.6em; margin-top: 5px;">${c.s.symbol}</span>`;
        cc.appendChild(div);
    });

    document.getElementById('feedback-section').classList.add('hidden');
    document.getElementById('feedback-context').classList.add('hidden');
    document.querySelectorAll('.action-btn').forEach(btn => btn.disabled = false);
}

function displayFeedback(title, text, statusClass, contextText) {
    const panel = document.getElementById('feedback-section');
    panel.className = statusClass; 
    document.getElementById('feedback-title').textContent = title;
    document.getElementById('feedback-text').textContent = text;
    
    const contextBox = document.getElementById('feedback-context');
    if (contextText) {
        contextBox.innerHTML = contextText;
        contextBox.classList.remove('hidden');
    } else {
        contextBox.classList.add('hidden');
    }

    document.querySelectorAll('.action-btn').forEach(btn => btn.disabled = true);
    panel.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

// === 7. MODALER (TRENING & CHEAT SHEET) ===

function buildTrainingMatrix(highlightError = false) {
    const container = document.getElementById('matrix-container');
    container.innerHTML = '';
    const mode = document.getElementById('mode-selector').value;
    
    document.getElementById('modal-pos-title').textContent = state.currentPosString;

    let redRange, blueRange;
    if (mode === "FACING_RAISE") {
        redRange = getCorrectRangeSet(state.stackSize, "THREE_BET", state.currentPosString, state.tableSize) || new Set();
        blueRange = getCorrectRangeSet(state.stackSize, "CALL", state.currentPosString, state.tableSize) || new Set();
    } else {
        redRange = getCorrectRangeSet(state.stackSize, "RFI", state.currentPosString, state.tableSize) || new Set();
        blueRange = state.currentPosString === "SB" && state.tableSize > 2 ? state.expanded[state.stackSize].rfi["SB_LIMP"] : new Set();
    }

    for (let r = 0; r < 13; r++) {
        for (let c = 0; c < 13; c++) {
            const cell = document.createElement('div');
            let handName = (r === c) ? VALUES[r] + VALUES[c] : (c > r ? VALUES[r] + VALUES[c] + "s" : VALUES[c] + VALUES[r] + "o"); 

            cell.textContent = handName;
            cell.className = 'matrix-cell';

            if (redRange === "ANY" || (redRange.has && redRange.has(handName))) cell.classList.add('raise');
            else if (blueRange.has && blueRange.has(handName)) cell.classList.add('call');

            if (highlightError && handName === state.handStr) cell.classList.add('highlight-hand');
            container.appendChild(cell);
        }
    }
}

function openModal(isError = false) { buildTrainingMatrix(isError); document.getElementById('range-modal').classList.remove('hidden'); }
function closeModal() { document.getElementById('range-modal').classList.add('hidden'); }

function updateCheatSheetMatrix() {
    const stack = document.getElementById('cs-stack-selector').value;
    const tSize = parseInt(document.getElementById('cs-table-selector').value);
    const pos = document.getElementById('cs-pos-selector').value;
    const mode = document.getElementById('cs-mode-selector').value;

    const container = document.getElementById('cs-matrix-container');
    container.innerHTML = '';

    let redRange, blueRange;
    if (mode === "FACING_RAISE") {
        redRange = getCorrectRangeSet(stack, "THREE_BET", pos, tSize) || new Set();
        blueRange = getCorrectRangeSet(stack, "CALL", pos, tSize) || new Set();
    } else {
        redRange = getCorrectRangeSet(stack, "RFI", pos, tSize) || new Set();
        blueRange = pos === "SB" && tSize > 2 ? state.expanded[stack].rfi["SB_LIMP"] : new Set();
    }

    for (let r = 0; r < 13; r++) {
        for (let c = 0; c < 13; c++) {
            const cell = document.createElement('div');
            let handName = (r === c) ? VALUES[r] + VALUES[c] : (c > r ? VALUES[r] + VALUES[c] + "s" : VALUES[c] + VALUES[r] + "o"); 
            cell.textContent = handName;
            cell.className = 'matrix-cell';

            if (redRange === "ANY" || (redRange.has && redRange.has(handName))) cell.classList.add('raise');
            else if (blueRange.has && blueRange.has(handName)) cell.classList.add('call');

            container.appendChild(cell);
        }
    }
}

function populateCheatSheetPositions() {
    const tSize = parseInt(document.getElementById('cs-table-selector').value);
    const posSelect = document.getElementById('cs-pos-selector');
    posSelect.innerHTML = '';
    const positions = getActivePositions(tSize);
    positions.forEach(p => {
        let opt = document.createElement('option');
        opt.value = p; opt.textContent = p + (tSize === 2 && p === "BTN" ? " (SB)" : "");
        posSelect.appendChild(opt);
    });
    updateCheatSheetMatrix();
}

function openCheatSheet() {
    document.getElementById('cs-stack-selector').value = state.stackSize;
    document.getElementById('cs-table-selector').value = state.tableSize;
    populateCheatSheetPositions();
    document.getElementById('cs-pos-selector').value = state.currentPosString;
    document.getElementById('cs-mode-selector').value = document.getElementById('mode-selector').value;
    
    updateCheatSheetMatrix();
    document.getElementById('cheat-sheet-modal').classList.remove('hidden');
}

// === 8. INITIALISERING ===

document.addEventListener('DOMContentLoaded', () => {
    initializeRanges();
    document.getElementById('btn-fold').addEventListener('click', () => checkAction('FOLD'));
    document.getElementById('btn-call').addEventListener('click', () => checkAction('CALL'));
    document.getElementById('btn-raise').addEventListener('click', () => checkAction('RAISE'));
    document.getElementById('btn-next').addEventListener('click', dealNewHand);
    
    document.getElementById('btn-show-range').addEventListener('click', () => openModal(false));
    document.getElementById('close-modal').addEventListener('click', closeModal);
    document.getElementById('range-modal').addEventListener('click', (e) => { if (e.target.id === 'range-modal') closeModal(); });
    
    document.getElementById('btn-open-cheat-sheet').addEventListener('click', openCheatSheet);
    document.getElementById('close-cheat-sheet').addEventListener('click', () => document.getElementById('cheat-sheet-modal').classList.add('hidden'));
    
    document.getElementById('cs-stack-selector').addEventListener('change', updateCheatSheetMatrix);
    document.getElementById('cs-table-selector').addEventListener('change', populateCheatSheetPositions);
    document.getElementById('cs-pos-selector').addEventListener('change', updateCheatSheetMatrix);
    document.getElementById('cs-mode-selector').addEventListener('change', updateCheatSheetMatrix);

    document.getElementById('mode-selector').addEventListener('change', dealNewHand);
    document.getElementById('table-size-selector').addEventListener('change', dealNewHand);
    document.getElementById('stack-size-selector').addEventListener('change', dealNewHand);
    document.getElementById('focus-mode-toggle').addEventListener('change', dealNewHand);

    dealNewHand();
});
