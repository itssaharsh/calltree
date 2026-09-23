import test from 'node:test';
import assert from 'node:assert/strict';
import { decide, STATUS, findPhrase } from '../src/lib/decide.mjs';

const fine = (q, transcript, intent, confidence = 0.9, sentiment = 'POSITIVE') => ({ q, transcript, intent, confidence, sentiment });
const threeGood = [
  fine(1, "I'm doing fine, thank you", 'FeelingFine'),
  fine(2, 'Yes, the air conditioning is on and I have water', 'HasCooling'),
  fine(3, "No, I don't need anything", 'NeedsNothing'),
];

test('three affirmatives is OK', () => {
  const d = decide(threeGood);
  assert.equal(d.status, STATUS.OK);
  assert.equal(d.rule, 'three-affirmatives');
});

test('"fine, just a bit light-headed" is URGENT even though it starts with fine', () => {
  const d = decide([fine(1, "I'm fine, just a bit light-headed", 'FeelingFine', 0.92), threeGood[1], threeGood[2]]);
  assert.equal(d.status, STATUS.URGENT);
  assert.equal(d.evidencePhrase, 'light-headed');
  assert.match(d.evidenceQuote, /light-headed/);
});

test('never-OK phrase in any question wins', () => {
  const d = decide([threeGood[0], fine(2, 'The AC is on but I fell this morning', 'HasCooling'), threeGood[2]]);
  assert.equal(d.status, STATUS.URGENT);
  assert.equal(d.evidenceQ, 2);
});

test('unclear answer goes to a person, never guessed', () => {
  const d = decide([threeGood[0], fine(2, 'hello? who is this', 'FallbackIntent', 0.2, 'NEUTRAL'), threeGood[2]]);
  assert.equal(d.status, STATUS.UNSURE);
  assert.equal(d.rule, 'low-confidence');
});

test('empty transcript is UNSURE', () => {
  const d = decide([threeGood[0], threeGood[1], fine(3, '', 'FallbackIntent', 0)]);
  assert.equal(d.status, STATUS.UNSURE);
});

test('incomplete call is UNSURE', () => {
  assert.equal(decide([threeGood[0]]).status, STATUS.UNSURE);
});

test('broken AC is NEEDS with the quote', () => {
  const d = decide([threeGood[0], fine(2, 'The AC has been broken since Tuesday', 'NoCooling', 0.88, 'NEGATIVE'), threeGood[2]]);
  assert.equal(d.status, STATUS.NEEDS);
  assert.equal(d.rule, 'no-cooling');
  assert.match(d.evidenceQuote, /broken/);
});

test('a request is NEEDS', () => {
  const d = decide([threeGood[0], threeGood[1], fine(3, 'Some ice would help if possible', 'NeedsSomething', 0.8)]);
  assert.equal(d.status, STATUS.NEEDS);
});

test('low confidence on the fine answer is not OK', () => {
  const d = decide([fine(1, 'yeah', 'FeelingFine', 0.58), threeGood[1], threeGood[2]]);
  assert.equal(d.status, STATUS.UNSURE);
});

test('"not feeling well" is URGENT', () => {
  const d = decide([fine(1, "I'm not feeling well today", 'FeelingFine', 0.7, 'NEGATIVE'), threeGood[1], threeGood[2]]);
  assert.equal(d.status, STATUS.URGENT);
});

test('findPhrase respects word boundaries', () => {
  assert.equal(findPhrase('that is fantastic', ['fan']), null);
  assert.equal(findPhrase('the fan is on', ['fan']), 'fan');
  assert.equal(findPhrase('I fell', ['fell']), 'fell');
});

test('"I\'m okay, thank you" filed under NeedsNothing on question 1 still counts as affirmative', () => {
  const d = decide([fine(1, "I'm okay, thank you.", 'NeedsNothing', 0.82), threeGood[1], threeGood[2]]);
  assert.equal(d.status, STATUS.OK);
});
test('"No, nothing" on question 1 is not an affirmative', () => {
  const d = decide([fine(1, 'No, nothing.', 'NeedsNothing', 0.9), threeGood[1], threeGood[2]]);
  assert.equal(d.status, STATUS.UNSURE);
});
