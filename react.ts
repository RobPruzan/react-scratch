type AnyProps = Record<string, unknown> | null;
const run = <T>(f: () => T) => f();

type ReactComponentFunction<T extends AnyProps> = (
  props: AnyProps
) => ReactRenderTreeNode;

type ReactComponentExternalMetadata<T extends AnyProps> = {
  component: keyof HTMLElementTagNameMap | ReactComponentFunction<T>;
  props: T;
  children: Array<ReactRenderTreeNode>;
};

type ReactHookMetadata = {
  kind: "state";
  value: unknown;
};

type ReactComponentInternalMetadata = {
  component:
    | {
        kind: "tag";
        tagName: keyof HTMLElementTagNameMap;
      }
    | {
        kind: "function";
        name: string;
        function: ReactComponentFunction<AnyProps>;
      };

  props: AnyProps;
  children: Array<ReactRenderTreeNode>;
  hooks: Array<ReactHookMetadata>;
  id: string;
};

type ReactViewTreeNode = {
  id: string;
  childNodes: Array<ReactViewTreeNode>;
  metadata: ReactComponentInternalMetadata;
  renderedById: string;
};

type ReactViewTree = {
  root: ReactViewTreeNode;
  viewNodePool: Array<ReactViewTreeNode>;
  // currentlyRendering: ReactComponentInternalMetadata | null;
  // currentHookOrderInsideComponent: number;
  // would hold component being rendered, current hook being called, info for the hooks basically, but don't need this yet
};
type ReactRenderTree = {
  currentlyRendering: ReactRenderTreeNode | null;
  localCurrentHookOrder: number;
  localComponentRenderMap: {
    [componentName: string]: number;
  };
  root: ReactRenderTreeNode;
  isFirstRender: boolean;
};

type ReactRenderTreeNode = {
  id: string;
  childNodes: Array<ReactRenderTreeNode>;
  computedViewTreeNodeId: string | null;
  internalMetadata: ReactComponentInternalMetadata;
  hooks: Array<ReactHookMetadata>;
  localRenderOrder: number;
};

const mapComponentToTaggedUnion = (
  component: ReactComponentExternalMetadata<AnyProps>["component"]
): ReactComponentInternalMetadata["component"] =>
  typeof component === "string"
    ? { kind: "tag", tagName: component }
    : { kind: "function", function: component, name: component.name };

const mapExternalMetadataToInternalMetadata = ({
  internalMetadata,
}: {
  internalMetadata: ReactComponentExternalMetadata<AnyProps>;
}): ReactComponentInternalMetadata => ({
  component: mapComponentToTaggedUnion(internalMetadata.component),
  children: internalMetadata.children,
  props: internalMetadata.props,
  hooks: [],
  id: crypto.randomUUID(),
});

const toChild = (
  child:
    | ReactComponentExternalMetadata<AnyProps>["children"][number]
    | null
    | false
): child is ReactComponentExternalMetadata<AnyProps>["children"][number] =>
  Boolean(child);

const getComponentName = (internalMetadata: ReactComponentInternalMetadata) =>
  (internalMetadata.component.kind === "function"
    ? internalMetadata.component.function.name
    : internalMetadata.component.tagName) +
  "-" +
  JSON.stringify(internalMetadata.props);
// how do you know if it was the same component called?
// well i guess the order it was called and the name of the component? sheesh
const createElement = <T extends AnyProps>(
  component: ReactComponentExternalMetadata<T>["component"],
  props: ReactComponentExternalMetadata<T>["props"],
  ...children: Array<null | false | ReactRenderTreeNode>
): ReactRenderTreeNode => {
  const internalMetadata = mapExternalMetadataToInternalMetadata({
    internalMetadata: { children: children.filter(toChild), component, props },
  });
  // console.log("called for", getComponentName(internalMetadata));
  if (!currentTreeRef.renderTree?.currentlyRendering) {
    const rootRenderNode: ReactRenderTreeNode = {
      internalMetadata: internalMetadata,
      id: crypto.randomUUID(),
      childNodes: [],
      computedViewTreeNodeId: null,
      hooks: [],
      localRenderOrder: 0,
    };
    currentTreeRef.renderTree = {
      localCurrentHookOrder: 0,
      currentlyRendering: null,
      root: rootRenderNode,
      isFirstRender: true, // this needs to be updated when we start re-rendering components,
      localComponentRenderMap: {},
    };
    return rootRenderNode;
  }

  const newLocalRenderOrder =
    (currentTreeRef.renderTree.localComponentRenderMap[
      getComponentName(internalMetadata)
    ] ?? 0) + 1;

  currentTreeRef.renderTree.localComponentRenderMap[
    getComponentName(internalMetadata)
  ] = newLocalRenderOrder;
  const existingNode =
    currentTreeRef.renderTree.currentlyRendering.childNodes.find(
      (childNode) => {
        const name = getComponentName(childNode.internalMetadata);

        if (
          name === getComponentName(internalMetadata) &&
          childNode.localRenderOrder === newLocalRenderOrder
        ) {
          return true;
        }
      }
    );

  if (existingNode) {
    existingNode.internalMetadata = internalMetadata;

    return existingNode;
  }

  const newRenderTreeNode: ReactRenderTreeNode = {
    id: crypto.randomUUID(),
    childNodes: [],
    computedViewTreeNodeId: null,
    internalMetadata: internalMetadata,
    hooks: [],
    localRenderOrder: newLocalRenderOrder,
  };
  currentTreeRef.renderTree.currentlyRendering.childNodes.push(
    newRenderTreeNode
  );

  return newRenderTreeNode;
};

const findNode = <T extends { id: string; childNodes: Array<T> }>(
  id: string,
  tree: T
): T => {
  const aux = (viewNode: T): T | undefined => {
    for (const node of viewNode.childNodes) {
      if (node.id === id) {
        return node;
      }

      const res = aux(node);

      if (res) {
        return res;
      }
    }
  };

  if (tree.id === id) {
    return tree;
  }

  const result = aux(tree);

  if (!result) {
    throw new Error(
      "detached node or wrong id:" + id + "\n\n" + JSON.stringify(tree)
    );
  }
  return result;
};

const findViewNode = (
  id: string,
  tree: ReactViewTreeNode
): ReactViewTreeNode => {
  const aux = (viewNode: ReactViewTreeNode): ReactViewTreeNode | undefined => {
    for (const node of viewNode.childNodes) {
      if (node.id === id) {
        return node;
      }

      const res = aux(node);

      if (res) {
        return res;
      }
    }
  };

  if (tree.id === id) {
    return tree;
  }

  const result = aux(tree);

  if (!result) {
    throw new Error(
      "detached node or wrong id:" + id + "\n\n" + JSON.stringify(tree)
    );
  }
  return result;
};

const findParentViewNode = (id: string): ReactViewTreeNode => {
  const aux = (viewNode: ReactViewTreeNode): ReactViewTreeNode | undefined => {
    for (const node of viewNode.childNodes) {
      if (node.id === id) {
        return viewNode;
      }

      const res = aux(node);

      if (res) {
        return res;
      }
    }
  };

  if (currentTreeRef.viewTree?.root.id === id) {
    return currentTreeRef.viewTree.root;
  }

  const result = aux(currentTreeRef.viewTree?.root!);

  if (!result) {
    throw new Error(
      "detached node or wrong id:" +
        id +
        "\n\n" +
        JSON.stringify(currentTreeRef.viewTree)
    );
  }
  return result;
};

const findParentRenderNode = (renderNode: ReactRenderTreeNode) => {
  if (!currentTreeRef.renderTree) {
    throw new Error("No render tree");
  }

  const aux = (viewNode: ReactRenderTreeNode) => {
    if (viewNode.childNodes.some((n) => n.id === renderNode.id)) {
      return viewNode;
    }

    return viewNode.childNodes.find(aux);
  };

  const result = aux(currentTreeRef.renderTree.root);

  if (!result) {
    return null;
  }

  return result;
};
function deepClone(obj: any) {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (typeof obj === "function") {
    return obj.bind({});
  }

  const copy: any = Array.isArray(obj) ? [] : {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      copy[key] = deepClone(obj[key]);
    }
  }

  return copy;
}

const isChildOf = ({
  potentialChildId,
  potentialParentId,
}: {
  potentialParentId: string;
  potentialChildId: string;
}): boolean => {
  const aux = ({
    node,
    searchId,
  }: {
    node: ReactRenderTreeNode;
    searchId: string;
  }): ReactRenderTreeNode | undefined => {
    if (node.id === searchId) {
      return node;
    }

    for (const child of node.childNodes) {
      const res = aux({
        node: child,
        searchId,
      });
      if (res) {
        return res;
      }
    }
  };

  if (!currentTreeRef.renderTree) {
    throw new Error("Invariant error must have render tree");
  }

  const start = aux({
    node: currentTreeRef.renderTree.root,
    searchId: potentialParentId,
  });

  if (!start) {
    throw new Error("Invariant error can't start from a detached node");
  }

  return !!aux({
    node: start,
    searchId: potentialChildId,
  });
};
/**
 *
 * Outputs the fist child generated by the root component
 *
 *
 * see if i can refactor so we only have to pass the metadata and it will generate the root of the view tree
 * would need an aux function but I think i can do it
 */
const renderComponent = ({
  renderTreeNode,
  parentViewNode,
  startingFromRenderNodeId,
}: {
  parentViewNode: ReactViewTreeNode;

  renderTreeNode: ReactRenderTreeNode;
  startingFromRenderNodeId: string;
}): ReactViewTreeNode => {
  if (!currentTreeRef.renderTree || !currentTreeRef.viewTree) {
    throw new Error("Cannot render component outside of react tree");
  }

  const newNode: ReactViewTreeNode = {
    id: crypto.randomUUID(),
    metadata: renderTreeNode.internalMetadata, // now making a new div node
    childNodes: [],
    renderedById: renderTreeNode.id,
  };

  currentTreeRef.viewTree.viewNodePool.push(newNode);

  renderTreeNode.computedViewTreeNodeId = newNode.id;
  // the idea is we immediately execute the children before running the parent
  // then later when attempting to access its children it will check if its already computed
  // but the current problem is it seems the computed view node is not on the tree before we attempt to access it
  // so we should make a pool of view nodes that we can access during render
  const fullyComputedChildren = renderTreeNode.internalMetadata.children.map(
    (
      child
    ): { viewNode: ReactViewTreeNode; renderNode: ReactRenderTreeNode } => {
      const reRenderChild = () => {
        // root of the new tree, we can safely ignore it
        const accumulatingNode: ReactViewTreeNode = {
          id: crypto.randomUUID(),
          metadata: child.internalMetadata,
          childNodes: [],
          renderedById: child.id,
        };

        const viewNode = renderComponent({
          renderTreeNode: child,
          parentViewNode: accumulatingNode,
          startingFromRenderNodeId,
        });
        if (accumulatingNode.childNodes.length > 1) {
          throw new Error(
            "Invariant error, should never have more than one child"
          );
        }
        return { viewNode, renderNode: child };
      };
      // this check isn't good because it means we will never re-compute
      // what we need to do is check the render tree if we need to re-render this child
      // we can do this by checking if this associated tree node is a child of the rendered component
      // maybe each view node should have a parent component id
      // every time we render (call the function) we pass that function render node down
      const computedNode = currentTreeRef.viewTree?.viewNodePool.find(
        (node) => node.id === child.computedViewTreeNodeId
      );
      if (!child.computedViewTreeNodeId) {
        // console.log(
        //   `Never computed view ndoe for ${getComponentName(
        //     child.internalMetadata
        //   )}, rendering for the first time`
        // );
      }

      if (!computedNode) {
        // console.log(
        //   `no computed node for ${getComponentName(
        //     child.internalMetadata
        //   )}, rendering for the first time`
        // );
        // console.log(!);
        // if (child.computedViewTreeNodeId) {
        //   console.log("something weird is happening here");
        // }
        return reRenderChild();
      }
      // console.log("render tree node", JSON.stringify(renderTreeNode));
      // console.log("the render tree", JSON.stringify(currentTreeRef.renderTree));
      const shouldReRender = isChildOf({
        potentialChildId: child.id,
        potentialParentId: startingFromRenderNodeId, // this doesn't make sense, we are rendering x, first we render the children, and it will never be the case the children
        // have a parent of what they are a child of
      });
      const parentRenderNode = findNode(
        startingFromRenderNodeId,
        currentTreeRef.renderTree?.root!
      );

      if (!shouldReRender) {
        console.log(
          `skipping re-rendering, ${getComponentName(
            child.internalMetadata
          )} not a child of ${getComponentName(
            parentRenderNode.internalMetadata
          )}`
        );
        // skip re-rendering if not a child in the render tree
        return { viewNode: computedNode, renderNode: child };
      }
      // small problem, when rendering the entire tree it will inefficiently double render children since the condition
      // that they are child's will always be true, maybe we should update that based on the function call?
      // console.log(
      //   `Re-rendering ${getComponentName(
      //     child.internalMetadata
      //   )}, is a child of re-rendered component`
      // );
      // console.log('part of ');
      return reRenderChild();
      // const parent =
      // computedNode?.renderedById

      // if (child.computedViewTreeNodeId) {
      //   const node = currentTreeRef.viewTree?.viewNodePool.find(
      //     (node) => node.id === child.computedViewTreeNodeId
      //   );
      //   if (!node) {
      //     throw new Error("Invariant, this must exist");
      //   }
      //   // const node = findParentViewNode(child.computedViewTreeNodeId);
      //   return { viewNode: node, renderNode: child };
      // }
      // we want to build up the child temporarily detached from the tree
      // then when the consumer decides to render it we add it to the tree

      // const viewNode = renderComponent({
      //   renderTreeNode: child,
      //   parentViewNode: accumulatingNode,
      // });
      // console.log("accumulated nodes", JSON.stringify(accumulatingNode));
      // console.log("the view node output", JSON.stringify(viewNode));
    }
  );

  switch (renderTreeNode.internalMetadata.component.kind) {
    case "tag": {
      // not sure if it makes sense to handle the tag case here... maybe it does? All it means
      // is its a child element, so may as well..
      newNode.childNodes = fullyComputedChildren.map(
        ({ viewNode }) => viewNode
      );
      // currentTreeRef.viewTree.viewNodePool =
      //   currentTreeRef.viewTree.viewNodePool.filter((n) => n.id !== newNode.id);
      parentViewNode.childNodes.push(newNode);
      break;
    }
    case "function": {
      const childrenSpreadProps =
        renderTreeNode.internalMetadata.children.length > 0
          ? {
              children: fullyComputedChildren.map(
                ({ renderNode }) => renderNode
              ),
            }
          : false;
      // a component can only output one computed metadata, hence the reason for fragments
      currentTreeRef.renderTree.localCurrentHookOrder = 0;
      currentTreeRef.renderTree.localComponentRenderMap = {};
      currentTreeRef.renderTree.currentlyRendering = renderTreeNode;
      console.log(
        "re-rendering",
        getComponentName(renderTreeNode.internalMetadata)
      );
      const computedRenderTreeNode =
        renderTreeNode.internalMetadata.component.function({
          ...renderTreeNode.internalMetadata.props,
          ...childrenSpreadProps,
        }); // Component outputs a div

      // the problem is the root and the rendered
      const viewNode = renderComponent({
        renderTreeNode: computedRenderTreeNode,
        parentViewNode: newNode,
        startingFromRenderNodeId: renderTreeNode.id,
      });

      // currentTreeRef.viewTree.viewNodePool =
      //   currentTreeRef.viewTree.viewNodePool.filter((n) => n.id !== newNode.id);
      parentViewNode.childNodes.push(viewNode);
      break;
    }
  }
  return newNode;
};
const currentTreeRef: {
  viewTree: ReactViewTree | null;
  renderTree: ReactRenderTree | null;
} = {
  viewTree: null,
  renderTree: null,
};

function deepTraverseAndModify(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(deepTraverseAndModify);
  } else if (typeof obj === "object" && obj !== null) {
    const newObj: any = {};

    for (const [key, value] of Object.entries(obj)) {
      if (
        key === "computedViewTreeNode" &&
        value &&
        typeof value === "object" &&
        "id" in value
      ) {
        newObj["computedViewTreeNodeId"] = value.id;
      } else if (
        key === "internalMetadata" &&
        value &&
        typeof value === "object" &&
        "id" in value
      ) {
        let x = value as unknown as { component: any; id: string };
        newObj["internalMetadataName+Id"] = (
          x.component.tagName +
          x.component.name +
          "-" +
          x.id.slice(0, 4)
        ).replace("undefined", "");
      } else {
        newObj[key] = deepTraverseAndModify(value);
      }
    }

    return newObj;
  }

  return obj;
}

const buildReactTrees = (rootRenderTreeNode: ReactRenderTreeNode) => {
  const rootViewNode: ReactViewTreeNode = {
    id: crypto.randomUUID(),
    metadata: rootRenderTreeNode.internalMetadata,
    childNodes: [],
    renderedById: rootRenderTreeNode.id,
  };
  // rootRenderTreeNode.computedViewTreeNode = rootViewNode;

  if (!currentTreeRef.renderTree) {
    throw new Error("Root node passed is not apart of any react render tree");
  }
  const reactViewTree: ReactViewTree = {
    root: rootViewNode,
    viewNodePool: [],
  };

  currentTreeRef.viewTree = reactViewTree;

  // theres clearly something wrong
  // it replaces what the behavior of the parent that was passed
  // but does not receive all the appends the root does
  // the root should be the correct one?
  console.log("\n\nRENDER START----------------------------------------------");
  // we ignore the output because its already appended to the root child nodes
  // we need to keep the root alive so we know how to regenerate the tree
  renderComponent({
    // i need to understand what this outputs
    renderTreeNode: rootRenderTreeNode,
    parentViewNode: rootViewNode,
    startingFromRenderNodeId: rootRenderTreeNode.id,
  });

  console.log("RENDER END----------------------------------------------\n\n");
  // currentTreeRef.viewTree.root = output;
  // console.log("output", JSON.stringify(output));
  // console.log("root", JSON.stringify(rootViewNode));
  currentTreeRef.renderTree.currentlyRendering = null;
  currentTreeRef.renderTree.isFirstRender = false;

  return {
    reactRenderTree: currentTreeRef.renderTree,
    reactViewTree: currentTreeRef.viewTree,
  };
};
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;

  if (a && b && typeof a === "object" && typeof b === "object") {
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!deepEqual(a[i], b[i])) return false;
      }
      return true;
    }

    if (a.constructor !== b.constructor) return false;

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }

    return true;
  }

  return false;
}

const isInViewTree = (viewNode: ReactViewTreeNode) => {
  if (!currentTreeRef.viewTree) {
    throw new Error("invariant");
  }
  const aux = (node: ReactViewTreeNode) => {
    if (node.id === viewNode.id) {
      return true;
    }

    return node.childNodes.some(aux);
  };

  return aux(currentTreeRef.viewTree.root);
};
const useState = <T>(initialValue: T) => {
  if (!currentTreeRef.renderTree?.currentlyRendering) {
    throw new Error("Cannot call use state outside of a react component");
  }

  const currentStateOrder = currentTreeRef.renderTree.localCurrentHookOrder;
  currentTreeRef.renderTree.localCurrentHookOrder += 1;

  const capturedCurrentlyRenderingRenderNode =
    currentTreeRef.renderTree.currentlyRendering;

  if (currentTreeRef.renderTree.isFirstRender) {
    capturedCurrentlyRenderingRenderNode.hooks[currentStateOrder] = {
      kind: "state",
      value: initialValue,
    };
  }

  const hookMetadata =
    capturedCurrentlyRenderingRenderNode.hooks[currentStateOrder];

  return [
    hookMetadata.value as T,
    (value: T) => {
      if (!capturedCurrentlyRenderingRenderNode.computedViewTreeNodeId) {
        throw new Error(
          "Invariant: set state trying to re-render unmounted component"
        );
      }

      if (!currentTreeRef.viewTree || !currentTreeRef.renderTree) {
        throw new Error("Invariant error, no view tree or no render tree");
      }

      hookMetadata.value = value;
      // we don't use this node after, we only care about using it to generate the sub view tree
      // and ideal refactor would be just passing the metadata and generating the root of the tree
      const detachedViewTreeNode: ReactViewTreeNode = {
        childNodes: [],
        id: crypto.randomUUID(),
        metadata: capturedCurrentlyRenderingRenderNode.internalMetadata,
        renderedById: capturedCurrentlyRenderingRenderNode.id,
      };

      const captureNodeId =
        capturedCurrentlyRenderingRenderNode.computedViewTreeNodeId!;

      const parentNode = findParentViewNode(captureNodeId);
      // console.log("before (parent): \n\n", JSON.stringify(parentNode));
      console.log(
        "\n\nRENDER START----------------------------------------------"
      );
      const reGeneratedViewTree = renderComponent({
        renderTreeNode: capturedCurrentlyRenderingRenderNode,
        parentViewNode: detachedViewTreeNode, // this node needs to be added to the tree
        startingFromRenderNodeId: capturedCurrentlyRenderingRenderNode.id,
      });

      console.log(
        "RENDER END----------------------------------------------\n\n"
      );
      // its a detached node and because of that we set it as the root
      const index = parentNode?.childNodes.findIndex(
        (node) => captureNodeId === node.id
      );
      // so bad lol clean this
      // and it ends up being my downfall...
      if (!parentNode || index === undefined || index == -1) {
        currentTreeRef.viewTree.root = reGeneratedViewTree;
        currentTreeRef.renderTree.root.computedViewTreeNodeId =
          reGeneratedViewTree.id;
      } else {
        parentNode.childNodes[index] = reGeneratedViewTree;
      }

      const root = document.getElementById("root")!;
      while (root.firstChild) {
        root.removeChild(root.firstChild);
      }

      // so hacky clean up later
      applyViewTreeToDomEl({
        parentDomNode: root,
        reactViewNode: currentTreeRef.viewTree?.root!,
      });
      // console.log(
    },
  ] as const;
};

const Bar = () => {
  // console.log("Bar");
  const [isRenderingSpan, setIsRenderingSpan] = useState(false);
  const [x, setX] = useState(2);
  return createElement(
    "area",
    {},
    createElement(Foo, null),
    createElement("button", {
      innerText: "conditional render",
      onclick: () => {
        setIsRenderingSpan(!isRenderingSpan);
      },
    }),
    createElement("button", {
      innerText: `Count: ${x}`,
      onclick: () => {
        setX(x + 1);
      },
    }),
    isRenderingSpan &&
      createElement("span", {
        style:
          "display:flex; height:50px; width:50px; background-color: white;",
      })
  );
};
const Foo = () => {
  // console.log("Foo");
  const [x, setX] = useState(2);
  const foo = createElement(
    "div", // view parent of Bar, so need to replace the instance with the recomputed instance
    {},
    createElement("article", null),
    createElement("button", {
      innerText: `another counter, a little deeper: ${x}`,
      onclick: () => {
        setX(x + 1);
      },
    })
  );
  return foo;
};

const PropsTest = (props: any) => {
  // console.log("PropsTest");
  const [update, setUpdate] = useState(false);
  // console.log("props test", props, props.children);
  const isPropsSomething = !!props.children;
  // console.log('am i being re-rendered');

  return createElement(
    "div",
    { innerText: "hi" },
    createElement("button", {
      innerText: "trigger update",
      onclick: () => {
        // console.log("click", update);
        setUpdate(!update);
      },
    }),
    ...props.children
  );
};

const IsAChild = () => {
  // console.log("IsAChild");
  return createElement("div", { innerText: "im a child!" });
};
// thats why, for whatever reason the root doesn't have a node in the render tree??
// const NestThis = () => {
//   console.log("NestThis");
//   const [x, setX] = useState(2);
//   const childHere = createElement(IsAChild, null);
//   return createElement(
//     "div",
//     null,
//     createElement("button", {
//       innerText: "clicka me",
//       onclick: () => {
//         setX(x + 1);
//       },
//     }),
//     createElement("div", {
//       innerText: `Count: ${x}`,
//       style: "color:white;",
//     }),
//     createElement(Component, null),
//     createElement(PropsTest, null, childHere)
//   );
// };
const Component = (props: any) => {
  // console.log("Component");
  // console.log("am i running?");
  const [x, setX] = useState(2);
  // console.log("value being read", x);
  return createElement(
    "div",
    {
      lol: "ok",
    },
    createElement("button", {
      innerText: "so many counters me",
      onclick: () => {
        setX(x + 1);
      },
    }),
    createElement("div", {
      innerText: `look at this count?: ${x}`,
      style: "color:white;",
    }),
    createElement(Bar, null),

    createElement("span", {
      innerText: "im a span!",
    })
  );
};

const NestThis = () => {
  return createElement(
    SimpleParent,
    null,
    createElement(SimpleChild, null),
    createElement("div", {
      innerText: "part of the simple child",
    }),
    createElement(Component, null)
  );
};

const SimpleParent = (props: any) => {
  // console.log("rendering simple parent");
  const [x, setX] = useState(2);
  return createElement(
    "div",
    null,
    createElement("button", {
      onclick: () => {
        setX(x + 1);
      },
      innerText: "trigger update",
    }),
    createElement("div", {
      innerText: "parent of the simple parent",
    }),
    // incorrectly re-rendering computed values
    ...props.children
  );
};

const SimpleChild = () => {
  // console.log("rendering simple child");

  return createElement("h2", {
    innerText: "Im a simple child!!",
  });
};

const applyViewTreeToDomEl = ({
  reactViewNode,
  parentDomNode,
}: {
  reactViewNode: ReactViewTreeNode;
  parentDomNode: HTMLElement;
}) => {
  // reactViewNode.metadata
  // switch (reactViewNode.metadata)
  reactViewNode.childNodes.forEach((childViewNode) => {
    switch (childViewNode.metadata.component.kind) {
      case "tag": {
        const newEl = document.createElement(
          childViewNode.metadata.component.tagName
        );
        Object.assign(newEl, childViewNode.metadata.props);

        parentDomNode.appendChild(newEl);
        applyViewTreeToDomEl({
          parentDomNode: newEl,
          reactViewNode: childViewNode,
        });
        break;
      }
      case "function":
        {
          // nothing to add to the dom, just skip
          // cant skip in the view tree to keep the binds between the 2 trees, i think?
          applyViewTreeToDomEl({
            parentDomNode,
            reactViewNode: childViewNode,
          });
        }
        break;
    }
  });
};

const render = (
  rootElement: ReturnType<typeof createElement>,
  domEl: HTMLElement
) => {
  const { reactViewTree } = buildReactTrees(rootElement);
  // console.log(JSON.stringify(reactViewTree));
  applyViewTreeToDomEl({
    parentDomNode: domEl,
    reactViewNode: reactViewTree.root,
  });
};
const main = () => {};
if (typeof window === "undefined") {
  const { reactViewTree, reactRenderTree } = buildReactTrees(
    createElement(NestThis, null)
  );
  console.log(JSON.stringify(deepTraverseAndModify(reactViewTree)));
} else {
  window.onload = () => {
    // console.log("loaded");
    render(createElement(NestThis, null), document.getElementById("root")!);
  };
}
