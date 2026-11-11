/** Stable in-page DOM identity shared by subject shots and scenery samples. The function is
 *  serialized into the browser, so all of its state and dependencies must live inside it. */
export function elementPath(el: Element): number[] {
  const page = window as Window & { __reelcamNodePaths?: { ids: WeakMap<Element, number>; next: number } };
  const state = page.__reelcamNodePaths ??= { ids: new WeakMap<Element, number>(), next: 1 };
  const chain: Element[] = [];
  for (let node: Element | null = el; node !== null; node = node.parentElement) chain.push(node);
  return chain.reverse().map((node) => {
    let id = state.ids.get(node);
    if (id === undefined) {
      id = state.next++;
      state.ids.set(node, id);
    }
    return id;
  });
}
