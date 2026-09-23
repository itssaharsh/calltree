// Deterministic demo world: 100 residents on the vulnerable-persons register of a real heat
// neighbourhood (Maryvale, Phoenix, Maricopa County), each with a scripted persona. Every name is
// synthetic. Run: node scripts/gen_seed.mjs > seed/residents.json
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry32(20260923);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const first = ['Rosa', 'Manuel', 'Dolores', 'Harold', 'Gloria', 'Ernesto', 'Beatriz', 'Walter', 'Carmen', 'Alfredo', 'Irene', 'Ramon', 'Lupe', 'Clarence', 'Teresa', 'Ignacio', 'Norma', 'Vernon', 'Consuelo', 'Eugene', 'Yolanda', 'Reynaldo', 'Marjorie', 'Hector', 'Esperanza', 'Leonard', 'Josefina', 'Arturo', 'Phyllis', 'Guadalupe', 'Raul', 'Betty', 'Salvador', 'Ruth', 'Enrique', 'Loretta', 'Francisco', 'June', 'Refugio', 'Eleanor', 'Pedro', 'Bernice', 'Ofelia', 'Roy', 'Blanca', 'Duane', 'Alicia', 'Herbert', 'Socorro', 'Wilma'];
const last = ['Mendoza', 'Alvarez', 'Whitfield', 'Castillo', 'Okafor', 'Delgado', 'Brennan', 'Ramirez', 'Nakamura', 'Cordova', 'Pruitt', 'Salazar', 'Hollis', 'Villanueva', 'Yazzie', 'Esparza', 'Kowalski', 'Ochoa', 'Begay', 'Trujillo', 'Fenwick', 'Padilla', 'Larkin', 'Quintero', 'Marsh', 'Zamora', 'Dietrich', 'Cervantes', 'Ashby', 'Montoya'];
const streets = ['W Indian School Rd', 'N 51st Ave', 'W Thomas Rd', 'W Osborn Rd', 'N 59th Ave', 'W Camelback Rd', 'N 43rd Ave', 'W Clarendon Ave', 'W Campbell Ave', 'N 47th Ave', 'W Earll Dr', 'N 55th Ave', 'W Turney Ave', 'W Roma Ave', 'N 63rd Ave'];
const personas = [...Array(70).fill('fine'), ...Array(12).fill('needs'), ...Array(8).fill('urgent'), ...Array(6).fill('noanswer'), ...Array(4).fill('unclear')];
for (let i = personas.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [personas[i], personas[j]] = [personas[j], personas[i]]; }
const answers = {
  fine: [
    ["I'm doing fine, thank you.", 'Yes, the air conditioning is on and I have water.', "No, I don't need anything."],
    ["Oh, I'm okay. A little tired but okay.", 'The swamp cooler is running and I have a jug of water in the fridge.', 'Nothing, thank you for calling.'],
    ["I'm alright, dear.", 'Yes, the AC works fine and I keep the blinds closed.', "No, I'm fine, my daughter is coming later."],
    ['Doing good, doing good.', 'Fan is on, and I have plenty of water.', 'No thank you.'],
    ["I'm well, just staying inside.", 'My AC is working, it is cool in here.', "I don't need a thing."],
    ['Feeling fine today.', 'Yes, the air is on and I have cold water.', 'No, nothing at all.'],
  ],
  needs: [
    ["I'm alright, I suppose.", 'The AC has been broken since Tuesday, it is very hot in here.', 'Some ice or a fan would help if possible.'],
    ["I'm okay.", 'The power went out this morning so nothing is running.', 'I could use some water, I ran out yesterday.'],
    ['Fine, fine.', 'My fan works but it is still too hot in the apartment.', 'Could someone bring my medication? I cannot get to the pharmacy.'],
    ["I'm doing okay.", "The air conditioner isn't working, the landlord hasn't come.", 'A fan would be nice.'],
  ],
  urgent: [
    ["I'm fine, just a bit light-headed.", 'The AC is on.', "No, I don't think so."],
    ['Not so good, I feel dizzy when I stand up.', 'The fan is on.', 'Maybe someone should come by.'],
    ["I'm okay but I fell in the kitchen this morning.", 'Yes the AC works.', "No, I don't need anything."],
    ['I have a headache and my chest feels tight.', 'It is very hot, the AC is weak.', 'I need help.'],
    ["I'm alright, a little nauseous.", 'The air is on.', 'No.'],
  ],
  unclear: [
    ['Hello? Who is this?', 'What? I cannot hear you, the dog is barking.', ''],
    ['', 'Sorry?', 'Hmm.'],
    ['Que? No entiendo.', 'Si, si.', 'Gracias.'],
  ],
  noanswer: [[null, null, null]],
};
const secondAttempt = ['answers', 'answers', 'answers', 'silent', 'silent', 'silent'];
let noanswerIdx = 0;
const center = { lat: 33.492, lon: -112.19 };
const residents = personas.map((persona, i) => {
  const id = `r${String(i + 1).padStart(3, '0')}`;
  const name = `${pick(first)} ${pick(last)}`;
  const age = 66 + Math.floor(rnd() * 29);
  const lat = +(center.lat + (rnd() - 0.5) * 0.026).toFixed(5);
  const lon = +(center.lon + (rnd() - 0.5) * 0.034).toFixed(5);
  const address = `${1000 + Math.floor(rnd() * 6000)} ${pick(streets)}`;
  const script = pick(answers[persona]);
  const lang = rnd() < 0.35 ? 'es' : 'en';
  return {
    id, name, age, lang, lat, lon, address, kind: 'seed', consent: true,
    phone: `+1602555${String(1000 + i).slice(-4)}`,
    backupName: `${pick(first)} ${pick(last)}`, backupRelation: pick(['daughter', 'son', 'neighbour', 'niece', 'friend', 'nephew']),
    backupPhone: `+1602555${String(2000 + i).slice(-4)}`,
    livesAlone: rnd() < 0.85, conditions: pick([[], ['diabetes'], ['heart condition'], ['COPD'], ['mobility'], ['dementia, early'], ['kidney disease']]),
    persona: { kind: persona, answers: script, secondAttempt: persona === 'noanswer' ? secondAttempt[noanswerIdx++ % 6] : null },
  };
});
process.stdout.write(JSON.stringify({ town: 'Maryvale, Phoenix AZ', nwsZone: 'AZZ544', county: 'Maricopa', center, residents }, null, 1));
