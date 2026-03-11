// helpers/medicalDictionary.js
// small starter medical dictionary & helpers
const dictionary = {
  "heamorrhage": "haemorrhage",
  "hemorrhage": "haemorrhage",
  "osteophyte": "osteophyte",
  "atelectasis": "atelectasis",
  "pneumothorax": "pneumothorax",
  // add more clinical terms here...
};

// naive correction: replace whole-word approximate matches (case-insensitive)
function correctMedicalTerms(text) {
  if (!text || typeof text !== "string") return text;
  let out = text;
  Object.keys(dictionary).forEach((wrong) => {
    const right = dictionary[wrong];
    const re = new RegExp(`\\b${escapeRegExp(wrong)}\\b`, "gi");
    out = out.replace(re, (m) => matchCase(right, m));
  });
  return out;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchCase(target, sample) {
  if (sample === sample.toUpperCase()) return target.toUpperCase();
  if (sample[0] === sample[0].toUpperCase()) return target[0].toUpperCase() + target.slice(1);
  return target;
}

module.exports = { correctMedicalTerms, dictionary };
