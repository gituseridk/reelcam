import { runInNewContext } from 'node:vm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COLLECT, parseCollected } from '../src/record/collect.js';
import { elementPath } from '../src/record/nodes.js';
import { item, takeSchema } from '../src/take.js';
import { rect, shot, take } from './helpers.js';

interface NodeStub {
  parentElement: NodeStub | null;
}

const node = (parentElement: NodeStub | null = null): NodeStub => ({ parentElement });
const pathOf = (el: NodeStub): number[] => elementPath(el as unknown as Element);

beforeEach(() => vi.stubGlobal('window', {}));
afterEach(() => vi.unstubAllGlobals());

describe('in-page element paths', () => {
  it('keeps identity stable across repeated samples without changing elements', () => {
    const root = node();
    const child = node(root);
    const path = pathOf(child);
    expect(pathOf(child)).toEqual(path);
    expect(path).toHaveLength(2);
    expect(path.every((id) => Number.isInteger(id) && id > 0)).toBe(true);
    expect(Object.keys(child)).toEqual(['parentElement']);
  });

  it('gives ancestors a shared prefix and siblings separate identities', () => {
    const root = node();
    const subject = node(root);
    const child = node(subject);
    const sibling = node(root);
    expect(pathOf(child).slice(0, -1)).toEqual(pathOf(subject));
    expect(pathOf(subject).slice(0, -1)).toEqual(pathOf(root));
    expect(pathOf(sibling).slice(0, -1)).toEqual(pathOf(root));
    expect(new Set([root, subject, child, sibling].map((el) => pathOf(el).at(-1))).size).toBe(4);
  });

  it('retains element identity when a node moves to a different parent', () => {
    const first = node();
    const second = node();
    const child = node(first);
    const before = pathOf(child);
    child.parentElement = second;
    const after = pathOf(child);
    expect(after.at(-1)).toBe(before.at(-1));
    expect(after.slice(0, -1)).toEqual(pathOf(second));
    expect(after[0]).not.toBe(before[0]);
  });
});

describe('browser function serialization', () => {
  it('runs as a serialized browser function with no module dependencies', () => {
    const child = node(node());
    const actual: unknown = runInNewContext(`(${String(elementPath)})(child)`, { window: {}, child });
    expect(actual).toEqual(pathOf(child));
  });

  it('shares identity between serialized scenery collection and subject evaluation', () => {
    const child = {
      ...node(node()), tagName: 'BUTTON', id: '', childNodes: [], children: [],
      getBoundingClientRect: () => ({ left: 10, top: 10, right: 30, bottom: 30 }),
      contains: () => true,
    };
    const context = {
      window: {}, child, innerWidth: 100, innerHeight: 100,
      document: { body: { children: [child] }, createRange: () => ({ selectNodeContents: () => undefined }), elementFromPoint: () => child },
      getComputedStyle: () => ({
        display: 'block', contentVisibility: 'visible', opacity: '1', position: 'static',
        clipPath: 'none', contain: 'none', maskImage: 'none', overflowX: 'visible', overflowY: 'visible',
        transform: 'none', filter: 'none', visibility: 'visible',
      }),
    };
    const raw: unknown = runInNewContext(COLLECT, context);
    const collected = parseCollected(raw);
    const subject: unknown = runInNewContext(`(${String(elementPath)})(child)`, context);
    expect(collected.items).toHaveLength(1);
    expect(collected.items[0]?.domPath).toEqual(subject);
  });
});

describe('take ancestry metadata', () => {
  const box = rect(0, 0, 20, 20);

  it('reads existing takes and collected items without paths', () => {
    const oldItem = { kind: 'box', label: 'button', rect: box };
    expect(parseCollected({ items: [oldItem], truncated: false }).items[0]?.domPath).toBeUndefined();
    const oldTake = take([shot(0, box)], { scenery: [[0, [item.parse(oldItem)]]] });
    expect(takeSchema.parse(oldTake)).toEqual(oldTake);
  });

  it('keeps paths for shots and scenery when parsing a take', () => {
    const withPaths = take([shot(0, box, { domPath: [1, 2] })], { scenery: [[0, [{ kind: 'box', label: 'button', rect: box, domPath: [1, 3] }]]] });
    expect(takeSchema.parse(withPaths)).toEqual(withPaths);
  });

  it.each([{ invalid: [] }, { invalid: [0] }, { invalid: [-1] }, { invalid: [1.5] }, { invalid: ['1'] }])('rejects invalid paths $invalid', ({ invalid }) => {
    expect(() => item.parse({ kind: 'box', label: 'button', rect: box, domPath: invalid })).toThrow();
    expect(() => takeSchema.parse({ ...take([shot(0, box)]), shots: [{ ...shot(0, box), domPath: invalid }] })).toThrow();
  });
});
