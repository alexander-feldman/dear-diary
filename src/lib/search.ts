export function searchExcerpt(text: string, terms: string[]) {
  if (!text || !terms.length) return null;
  const sentences = text.match(/[^.!?\n]+(?:[.!?]+(?=\s|$)|\n+|$)/g)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [text];
  const matches = sentences.flatMap((sentence, index) => terms.some((term) => sentence.toLowerCase().includes(term)) ? [index] : []);
  if (!matches.length) return null;
  const included = new Set(matches.flatMap((index) => [index - 1, index, index + 1]).filter((index) => index >= 0 && index < sentences.length));
  const excerpt = sentences.reduce<string[]>((parts, sentence, index) => {
    if (!included.has(index)) return parts;
    if (parts.length && !included.has(index - 1)) parts.push("…");
    parts.push(sentence);
    return parts;
  }, []);
  if (!included.has(0)) excerpt.unshift("…");
  if (!included.has(sentences.length - 1)) excerpt.push("…");
  return excerpt.join(" ");
}
