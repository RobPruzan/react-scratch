export const run = <T>(f: () => T) => f();
export const deepEqual = (a: any, b: any): boolean => {
  if (a === b) return true;

  if (a && b && typeof a === "object" && typeof b === "object") {
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!deepEqual(a[i], b[i])) {
          return false;
        }
      }
      return true;
    }

    if (a.constructor !== b.constructor) {
      return false;
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) {
      return false;
    }

    for (const key of keysA) {
      if (!keysB.includes(key)) {
        return false;
      }
      if (!deepEqual(a[key], b[key])) {
        return false;
      }
    }

    return true;
  }
  return false;
};

export const deepCloneTree = <T>(obj: T, seen = new WeakSet()): T => {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (obj instanceof HTMLElement) {
    return obj;
  }

  if (typeof obj === "function") {
    return (obj as any).bind({});
  }

  if (seen.has(obj)) {
    return obj as T; //
  }

  seen.add(obj);

  const copy: any = Array.isArray(obj) ? [] : {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      copy[key] = deepCloneTree(obj[key], seen);
    }
  }

  
  seen.delete(obj);

  return copy;
};


export const findNodeOrThrow = <T extends { id: string; childNodes: Array<T> }>(
  eq: (node: T) => boolean,
  tree: T
): T => {
  const aux = (viewNode: T): T | undefined => {
    for (const node of viewNode.childNodes) {
      if (eq(node)) {
        return node;
      }

      const res = aux(node);

      if (res) {
        return res;
      }
    }
  };

  if (eq(tree)) {
    return tree;
  }

  const result = aux(tree);

  if (!result) {
    throw new Error(
      "detached node or wrong id:" + "\n\n" + JSON.stringify(tree)
    );
  }
  return result;
};

export const findNode = <T extends { id: string; childNodes: Array<T> }, R>(
  eq: (node: T) => boolean,
  tree: T
): T | null => {
  try {
    return findNodeOrThrow(eq, tree);
  } catch {
    return null;
  }
};

export const findParentNodeOrThrow = <
  T extends { id: string; childNodes: Array<T> }
>(
  eq: (node: T) => boolean,
  tree: T
): T => {
  const aux = (viewNode: T): T | undefined => {
    for (const node of viewNode.childNodes) {
      if (eq(node)) {
        return viewNode;
      }

      const res = aux(node);

      if (res) {
        return res;
      }
    }
  };

  if (eq(tree)) {
    return tree;
  }

  const result = aux(tree);

  if (!result) {
    throw new Error(
      "detached node or wrong id:" + "\n\n" + JSON.stringify(tree)
    );
  }
  return result;
};

export const findParentNode = <T extends { id: string; childNodes: Array<T> }>(
  eq: (node: T) => boolean,
  tree: T
): T | null => {
  try {
    return findParentNodeOrThrow(eq, tree);
  } catch {
    return null;
  }
};
