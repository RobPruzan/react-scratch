type AnyProps = Record<string, unknown>;

type ReactFiber<T extends Record<string, unknown>> = {
  props: T;

  // null tells u when u hit a leaf and u can stop traversing
  renderFn:
    | null
    | ((props: T) => Array<ReactFiber<AnyProps> | keyof HTMLElementTagNameMap>);
  state: Array<unknown>;
};

type ReactNode = {
  id: string;
  children: Array<ReactNode>;
  fiber: ReactFiber<AnyProps>;
};

type ReactInternals = {
  root: ReactNode;
  currentHookCallOrder: number;
};
type CreateElementArgs<T extends Record<string, any>> = {
  nodeFnOrLeaf:
    | ((props: T) => Array<ReactFiber<AnyProps>>)
    | keyof HTMLElementTagNameMap;
  props: T;
};

// const reactInternals: ReactInternals = {
//   currentHookCallOrder: 0,
//   currentlyRendering: null,
//   root: null,
// };

// const dfsFind = ({
//   searchId,
//   node,
// }: {
//   searchId: string;
//   node: ReactNode<AnyProps> | null;
// }): ReactNode<AnyProps> | null => {
//   if (node === null) {
//     return null;
//   }

//   node.children.forEach((childNode) => {
//     const node = dfsFind({
//       node: childNode,
//       searchId,
//     });

//     if (node?.id === searchId) {
//       return node;
//     }
//   });

//   return null;
// };

// const mapTagToReactNode = <T extends Record<string, unknown>>(
//   tagName: keyof HTMLElementTagNameMap
// ): ReactFiber<T> => ({
//   props: {} as T,
//   renderFn: null,
//   state: [],
// });

// const mapLeafOrApplyNodeFn = <TProps extends Record<string, unknown>, TMap>({
//   fn,
//   nodeFnOrLeaf,
//   props,
// }: {
//   nodeFnOrLeaf: CreateElementArgs<TProps>["nodeFnOrLeaf"];
//   fn: (leaf: keyof HTMLElementTagNameMap) => TMap;
//   props: TProps;
// }) => {
//   if (typeof nodeFnOrLeaf === "string") {
//     return fn(nodeFnOrLeaf);
//   }

//   return nodeFnOrLeaf(props);
// };

const mapLeafOverNodeFn = <TProps extends Record<string, unknown>, TMap>({
  fn,
  nodeFnOrLeaf,
}: {
  nodeFnOrLeaf: CreateElementArgs<TProps>["nodeFnOrLeaf"];
  fn: (leaf: keyof HTMLElementTagNameMap) => TMap;
}): ((props: TProps) => Array<ReactFiber<AnyProps>>) | TMap => {
  if (typeof nodeFnOrLeaf === "string") {
    return fn(nodeFnOrLeaf);
  }

  return nodeFnOrLeaf;
};

const mapLeafOverFiber = <TProps extends Record<string, unknown>, TMap>({
  fn,
  fiber,
}: {
  fiber: ReactFiber<AnyProps> | keyof HTMLElementTagNameMap;
  fn: (leaf: keyof HTMLElementTagNameMap) => TMap;
}): ReactFiber<AnyProps> | TMap => {
  if (typeof fiber === "string") {
    return fn(fiber);
  }

  return fiber;
};

const createFiber = <T extends Record<string, unknown>>({
  nodeFnOrLeaf,
  props,
}: CreateElementArgs<T>): ReactFiber<T> => ({
  props,
  state: [],
  renderFn: mapLeafOverNodeFn({
    nodeFnOrLeaf,
    fn: () => null,
  }),
});

const buildInternals = ({
  internals,
  fiber,
  parentNode,
}: {
  internals: ReactInternals;
  fiber: ReactFiber<AnyProps>;
  parentNode: ReactNode;
}) => {
  if (fiber.renderFn == null) {
    return;
  }

  const node: ReactNode = {
    id: crypto.randomUUID(),
    children: [],
    fiber,
  };
  parentNode.children.push(node);

  const children = fiber.renderFn(fiber.props);

  for (const fiberOrLeaf of children) {
    const fiber = mapLeafOverFiber({
      fn: (leaf) => createFiber({ nodeFnOrLeaf: leaf, props: {} }),
      fiber: fiberOrLeaf,
    });

    buildInternals({
      fiber,
      internals,
      parentNode: node,
    });
  }
};
const generateVirtualDom = (rootFiber: ReactFiber<AnyProps>) => {
  const root = {
    children: [],
    fiber: rootFiber,

    id: crypto.randomUUID(),
  };
  const reactInternals: ReactInternals = {
    root,
    currentHookCallOrder: 0,
  };

  buildInternals({
    fiber: rootFiber,
    internals: reactInternals,
    parentNode: root,
  });

  console.log(JSON.stringify(reactInternals));
};

const SomeComponent = () => {
  return [
    createFiber({
      nodeFnOrLeaf: "div",
      props: {},
    }),
    createFiber({
      nodeFnOrLeaf: () => [
        {
          renderFn: () => ["div"],
          props: {},
          state: [],
        },
      ],
      props: {},
    }),
  ];
};

generateVirtualDom({
  props: {},
  renderFn: SomeComponent,
  state: [],
});

// const reactTree: ReactTree = {

// }

// const createElementFromNode = (node: ReactNode) => {
//   const newEl = document.createElement(node.tagName);
//   return newEl;
// };

// const render = (node: ReactNode, domElement: HTMLElement) => {
//   console.log("rendering root");
//   const el = createElementFromNode(node);
//   domElement.appendChild(el);
// };

// window.onload = () => {
//   render(
//     {
//       tagName: "div",
//     },
//     document.getElementById("root")!
//   );
// };
