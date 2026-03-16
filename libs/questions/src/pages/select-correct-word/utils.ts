import type { QuestionChoice } from '../../components/QuestionsTable';
import type { DecodedGroup, ParsedPart } from './types';

export function decodeGroups(choices: QuestionChoice[] | undefined): Record<string, DecodedGroup> {
  const groups: Record<string, DecodedGroup> = {};
  (choices ?? []).forEach((choice) => {
    const match = choice.answer.match(/^\[([^\]]+)\]\s*(.+)$/);
    if (!match) return;
    const key = match[1].trim();
    const text = match[2].trim();
    if (!groups[key]) {
      groups[key] = { key, options: [] };
    }
    groups[key].options.push({
      id: choice.id,
      text,
      isCorrect: choice.fraction === '1',
    });
  });
  return groups;
}

export function sanitizeKeyHtml(html: string): string {
  if (typeof window === 'undefined') return html;
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  doc.querySelectorAll('.key-actions').forEach((el) => el.remove());
  doc.querySelectorAll('.key-wrapper').forEach((wrapper) => {
    const keySpan = wrapper.querySelector('.fill-in-blank-key');
    const text = keySpan?.textContent ?? '';
    wrapper.parentNode?.replaceChild(doc.createTextNode(text), wrapper);
  });
  return doc.body.innerHTML;
}

export function parseQuestionText(text: string): ParsedPart[] {
  const parts: ParsedPart[] = [];
  const pattern = /\[\[([^\]]+)\]\]/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > lastIndex) {
      parts.push({ type: 'text', content: text.substring(lastIndex, m.index) });
    }
    parts.push({ type: 'key', key: m[1].trim() });
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.substring(lastIndex) });
  }
  return parts;
}
