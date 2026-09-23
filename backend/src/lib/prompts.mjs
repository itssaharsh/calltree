// Every word Calltree says. Short sentences, one question at a time, no jargon.
export const QUESTIONS = [
  { q: 1, key: 'feeling', text: 'First question. How are you feeling right now? Any dizziness, or feeling unwell?' },
  { q: 2, key: 'cooling', text: 'Thank you. Is your air conditioning or a fan working, and do you have enough water to drink?' },
  { q: 3, key: 'needs', text: 'Last question. Is there anything you need today, like water, ice, or your medication?' },
];
export const greeting = (name) => `Hello ${firstName(name)}, this is Calltree, calling for the city's heat check-in service. There is a heat warning today, so I am checking that you are alright. This takes one minute.`;
export const retryLine = (name) => `Sorry, I did not catch that. ${QUESTIONS[0].text}`;
export function closing(status, resident = {}) {
  const name = firstName(resident.name);
  const backup = resident.backupName ? `${resident.backupName}, your ${resident.backupRelation || 'contact'},` : 'your emergency contact';
  switch (status) {
    case 'OK': return `Thank you, ${name}. Everything sounds fine. Please stay indoors during the hottest hours and keep drinking water. We will check again if the warning continues. Goodbye.`;
    case 'URGENT': return `Thank you for telling me, ${name}. I am asking ${backup} to check on you right now, and a member of staff will call you back within a few minutes. If you feel worse, call 911. Goodbye for now.`;
    case 'NEEDS': return `Understood, ${name}. I have logged a request, and someone from the city will bring what you need today. Stay in the coolest room and keep drinking water. Goodbye.`;
    default: return `I did not quite catch that, ${name}. A member of staff will call you back shortly to make sure you are alright. Goodbye.`;
  }
}
export function firstName(name) { return String(name || 'there').trim().split(/\s+/)[0]; }
