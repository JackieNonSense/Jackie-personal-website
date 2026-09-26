/** The two languages of the machine. File names and commands stay in English in both. */
export type Lang = 'en' | 'zh';

/** Words in both languages; a plain string reads the same in either. */
export type Text = string | { en: string; zh: string };

export function tr(lang: Lang, text: Text): string {
  return typeof text === 'string' ? text : text[lang];
}

/** The language a first-time visitor gets: the browser's, if it is Chinese. */
export function defaultLang(languages: readonly string[]): Lang {
  return languages.some(l => l.toLowerCase().startsWith('zh')) ? 'zh' : 'en';
}
