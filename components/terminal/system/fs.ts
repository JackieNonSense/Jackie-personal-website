import type { Machine } from './machine';
import type { Text } from './i18n';

/**
 * Jackie Random's disk: a small DOS-style tree. Names are case-insensitive, paths
 * use backslashes (forward slashes are accepted), and deleted files stay on disk
 * with the first letter of their name lost, as they did under DOS.
 */
export type FileNode = {
  kind: 'file';
  name: string;
  date: string;
  /**
   * Readable text; its length is the file size unless `size` is given. A function is
   * read afresh each time, for files that know what the visitor has done.
   */
  text?: Text | ((m: Machine) => Text);
  /** A program the shell can run: the id of a registered program. */
  program?: string;
  /** A photo PICVIEW shows: its id in the photo album (content/photos.ts). */
  photo?: string;
  /** A drawing the visitor made in PAINT: its name among the saved drawings (content/paint.ts). */
  drawing?: string;
  size?: number;
  hidden?: boolean;
  deleted?: boolean;
  /** The file exists only once this holds (usually: once something else was seen). */
  when?: (m: Machine) => boolean;
};
export type DirNode = { kind: 'dir'; name: string; date: string; children: Node[]; hidden?: boolean };
export type Node = FileNode | DirNode;

export const file = (name: string, date: string, props: Omit<FileNode, 'kind' | 'name' | 'date'> = {}): FileNode =>
  ({ kind: 'file', name: name.toUpperCase(), date, ...props });
export const dir = (name: string, date: string, children: Node[], hidden = false): DirNode =>
  ({ kind: 'dir', name: name.toUpperCase(), date, children, hidden });

export function sizeOf(node: Node): number {
  if (node.kind === 'dir') return 0;
  if (node.size !== undefined) return node.size;
  const text = typeof node.text === 'function' ? '' : node.text ?? '';
  return typeof text === 'string' ? text.length : text.en.length;
}

/** A file's text in the machine's language. */
export function readText(m: Machine, node: FileNode): string {
  const text = typeof node.text === 'function' ? node.text(m) : node.text ?? '';
  return m.t(text);
}

/** The key that marks a file as read: `file:DIARY/0012.TXT`. */
export function fileFlag(parts: string[]): string { return 'file:' + parts.join('/'); }

/** How a deleted file is listed: its first letter is gone. */
export function deletedName(name: string): string { return '?' + name.slice(1); }

export class FileSystem {
  cwd: string[] = [];
  /** Whether a file exists yet; the machine sets this so files can appear as the story moves. */
  exists: (node: Node) => boolean = () => true;

  constructor(readonly root: DirNode) {}

  get prompt(): string { return 'C:\\' + this.cwd.join('\\') + '>'; }

  private split(path: string): { absolute: boolean; parts: string[] } {
    let p = path.trim().replace(/\//g, '\\');
    if (/^c:/i.test(p)) p = p.slice(2);
    const absolute = p.startsWith('\\');
    return { absolute, parts: p.split('\\').filter(Boolean).map(s => s.toUpperCase()) };
  }

  /** Resolves a path to its node and absolute location; deleted files are not found. */
  resolve(path: string): { node: Node; parts: string[] } | null {
    const { absolute, parts } = this.split(path);
    const at = absolute ? [] : [...this.cwd];
    for (const part of parts) {
      if (part === '.') continue;
      if (part === '..') { at.pop(); continue; }
      at.push(part);
    }
    let node: Node = this.root;
    for (const part of at) {
      if (node.kind !== 'dir') return null;
      const next: Node | undefined = node.children.find(c => c.name === part && !(c.kind === 'file' && c.deleted) && this.exists(c));
      if (!next) return null;
      node = next;
    }
    return { node, parts: at };
  }

  cd(path: string): boolean {
    const found = this.resolve(path);
    if (!found || found.node.kind !== 'dir') return false;
    this.cwd = found.parts;
    return true;
  }

  /** Visible entries of a directory, directories first. */
  list(node: DirNode, all = false): Node[] {
    return node.children
      .filter(c => this.exists(c) && (all || (!c.hidden && !(c.kind === 'file' && c.deleted))))
      .sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'dir' ? -1 : 1));
  }

  deleted(node: DirNode): FileNode[] {
    return node.children.filter((c): c is FileNode => c.kind === 'file' && !!c.deleted && this.exists(c));
  }

  /**
   * DOS UNDELETE: the name must be typed with the lost first letter restored.
   * Returns the restored file, or null when nothing matches.
   */
  undelete(node: DirNode, name: string): FileNode | null {
    const wanted = name.trim().toUpperCase();
    const match = this.deleted(node).find(f => f.name === wanted);
    if (!match) return null;
    match.deleted = false;
    return match;
  }

  /** Tab completion within the current directory, or the directory named by the path. */
  complete(partial: string): string[] {
    const cut = Math.max(partial.lastIndexOf('\\'), partial.lastIndexOf('/'));
    const base = cut >= 0 ? partial.slice(0, cut + 1) : '';
    const stem = partial.slice(cut + 1).toUpperCase();
    const where = base ? this.resolve(base) : { node: this.resolve('.')!.node };
    if (!where || where.node.kind !== 'dir') return [];
    return this.list(where.node).filter(c => c.name.startsWith(stem)).map(c => base + c.name + (c.kind === 'dir' ? '\\' : ''));
  }
}
