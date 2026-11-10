// Unicode-aware matching: Arabic diacritics, tatweel, common letter forms,
// whitespace and Latin accents are normalized only for comparison, never storage.
export function normalizeSearch(value) {
  return String(value ?? '').normalize('NFKC').toLocaleLowerCase()
    .replace(/[\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/gu, ' ').trim();
}
export function matchesSearch(value, query) {
  const tokens = normalizeSearch(query).split(' ').filter(Boolean);
  const haystack = normalizeSearch(value);
  return tokens.every(token => haystack.includes(token));
}
