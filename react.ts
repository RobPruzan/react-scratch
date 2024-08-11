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
};

type ReactViewTree = {
  root: ReactViewTreeNode;
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
  computedViewTreeNode: ReactViewTreeNode | null;
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

const getComponentName = (internalMetadata: ReactComponentInternalMetadata) =>
  internalMetadata.component.kind === "function"
    ? internalMetadata.component.function.name
    : internalMetadata.component.tagName;
// how do you know if it was the same component called?
// well i guess the order it was called and the name of the component? sheesh
const createElement = <T extends AnyProps>(
  component: ReactComponentExternalMetadata<T>["component"],
  props: ReactComponentExternalMetadata<T>["props"],
  ...children: ReactComponentExternalMetadata<T>["children"]
): ReactRenderTreeNode => {
  const internalMetadata = mapExternalMetadataToInternalMetadata({
    internalMetadata: { children, component, props },
  });

  if (!currentTreeRef.renderTree?.currentlyRendering) {
    const rootRenderNode: ReactRenderTreeNode = {
      internalMetadata: internalMetadata,
      id: crypto.randomUUID(),
      childNodes: [],
      computedViewTreeNode: null,
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

  // console.log("calling create element on ", getComponentName(internalMetadata));
  // console.log(
  //   "this render map ",
  //   JSON.stringify(currentTreeRef.renderTree.localComponentRenderMap),
  //   "before on this element",
  //   getComponentName(internalMetadata),
  //   "fetching this value",
  //   currentTreeRef.renderTree.localComponentRenderMap[
  //     getComponentName(internalMetadata)
  //   ]
  // );
  const newLocalRenderOrder =
    (currentTreeRef.renderTree.localComponentRenderMap[
      getComponentName(internalMetadata)
    ] ?? 0) + 1;

  currentTreeRef.renderTree.localComponentRenderMap[
    getComponentName(internalMetadata)
  ] = newLocalRenderOrder;

  // see if theres an existing render tree node for this metadata instance
  // how? How do i determine equality
  // lets read the currently rendering and do some diffs

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
    // console.log(
    //   "returning existing node",
    //   existingNode,
    //   getComponentName(internalMetadata),
    //   currentTreeRef.renderTree.localComponentRenderMap
    // );
    return existingNode;
  }

  const newRenderTreeNode: ReactRenderTreeNode = {
    id: crypto.randomUUID(),
    childNodes: [],
    computedViewTreeNode: null,
    internalMetadata: internalMetadata,
    hooks: [],
    localRenderOrder: newLocalRenderOrder,
  };
  currentTreeRef.renderTree.currentlyRendering.childNodes.push(
    newRenderTreeNode
  );

  // const parentRenderTreeNode =
  //   ??
  //   currentTreeRef.renderTree.root;

  return newRenderTreeNode;
};

// const makeTagNode = ({
//   id,
//   tagName,
// }: {
//   tagName: keyof HTMLElementTagNameMap;
//   id: string;
// }): ReactViewTreeNode => ({
//   id: crypto.randomUUID(),
//   childNodes: [],
//   metadata: {
//     component: {
//       kind: "tag",
//       tagName,
//     },
//     children: [],
//     props: {},
//     hooks: [],
//     id,
//   },
// });

const findParentViewNode = (renderNode: ReactViewTreeNode) => {
  console.log("searchign for", renderNode.metadata.id);
  const aux = (viewNode: ReactViewTreeNode) => {
    if (
      viewNode.childNodes.some((n) => n.metadata.id === renderNode.metadata.id)
    ) {
      return viewNode;
    }

    return viewNode.childNodes.find(aux);
  };
  if (currentTreeRef.viewTree?.root.metadata.id === renderNode.metadata.id) {
    return null;
  }
  const result = aux(currentTreeRef.viewTree?.root!);

  if (!result) {
    throw new Error("Invariant error, node not found,");
  }

  return result;

  // currentTreeRef.renderTree.root.childNodes;
};

// const findParentRenderNode = (renderNode: ReactRenderTreeNode) => {
//   if (!currentTreeRef.renderTree) {
//     throw new Error("No render tree");
//   }

//   const aux = (viewNode: ReactRenderTreeNode) => {
//     if (viewNode.childNodes.some((n) => n.id === renderNode.id)) {
//       return viewNode;
//     }

//     return viewNode.childNodes.find(aux);
//   };

//   const result = aux(currentTreeRef.renderTree.root);

//   if (!result) {
//     throw new Error("Invariant error, node not found,");
//   }

//   return result;

//   // currentTreeRef.renderTree.root.childNodes;
// };

const renderComponent = ({
  renderTreeNode,
  parentViewNode,
}: {
  parentViewNode: ReactViewTreeNode;

  renderTreeNode: ReactRenderTreeNode;
}): ReactViewTreeNode => {
  if (!currentTreeRef.renderTree || !currentTreeRef.viewTree) {
    throw new Error("Cannot render component outside of react tree");
  }

  currentTreeRef.renderTree.currentlyRendering = renderTreeNode;

  // const existingNode =

  //   if (renderTreeNode.computedViewTreeNode) {
  //   renderTreeNode.
  // }
  const newNode: ReactViewTreeNode = {
    id: crypto.randomUUID(),
    metadata: renderTreeNode.internalMetadata, // now making a new div node
    childNodes: [],
  };

  // parentViewNode.childNodes.push(newNode);

  // const associatedRenderNodes = findAssociatedRenderNode(internalMetadata);
  renderTreeNode.computedViewTreeNode = newNode;
  // at first computes button and span

  const fullyComputedChildren = renderTreeNode.internalMetadata.children.map(
    // now we have all the div's computed children
    (child) =>
      renderComponent({
        renderTreeNode: child,
        parentViewNode: newNode,
      })
  );

  switch (renderTreeNode.internalMetadata.component.kind) {
    case "tag": {
      newNode.childNodes = fullyComputedChildren;
      parentViewNode.childNodes.push(newNode);
      break;
    }
    case "function": {
      const childrenSpreadProps =
        fullyComputedChildren.length > 0
          ? { children: fullyComputedChildren }
          : false;
      // a component can only output one computed metadata, hence the reason for fragments
      currentTreeRef.renderTree.localCurrentHookOrder = 0;
      currentTreeRef.renderTree.localComponentRenderMap = {};
      const computedRenderTreeNode =
        renderTreeNode.internalMetadata.component.function({
          ...renderTreeNode.internalMetadata.props,
          ...childrenSpreadProps,
        }); // Component outputs a div

      console.log(
        "output of function named",
        renderTreeNode.internalMetadata.component.function.name,
        computedRenderTreeNode
      );
      const viewNode = renderComponent({
        renderTreeNode: computedRenderTreeNode,
        parentViewNode: newNode,
      });
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

// const findParentRenderNode = () =

const buildReactTrees = (rootRenderTreeNode: ReactRenderTreeNode) => {
  const rootViewNode: ReactViewTreeNode = {
    id: crypto.randomUUID(),
    childNodes: [],
    metadata: rootRenderTreeNode.internalMetadata,
  };

  if (!currentTreeRef.renderTree) {
    throw new Error("Root node passed is not apart of any react render tree");
  }
  const reactViewTree: ReactViewTree = {
    root: rootViewNode,
  };

  currentTreeRef.viewTree = reactViewTree;

  currentTreeRef.viewTree.root = renderComponent({
    renderTreeNode: rootRenderTreeNode,
    parentViewNode: rootViewNode,
    // parentViewNode: rootNode,
  });

  currentTreeRef.renderTree.currentlyRendering = null;
  currentTreeRef.renderTree.isFirstRender = false;

  // console.log(JSON.stringify(deepTraverseAndModify(currentTreeRef.renderTree)));

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
const useState = <T>(initialValue: T) => {
  if (!currentTreeRef.renderTree?.currentlyRendering) {
    throw new Error("Cannot call use state outside of a react component");
  }

  const currentStateOrder = currentTreeRef.renderTree.localCurrentHookOrder;
  currentTreeRef.renderTree.localCurrentHookOrder += 1;

  const capturedCurrentlyRenderingRenderNode =
    currentTreeRef.renderTree.currentlyRendering;
  // const capturedCurrentlyRendering = currentTreeRef.tree.

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
      console.log("being passed", value);
      hookMetadata.value = value;
      console.log("setting the hook metadata to", hookMetadata.value);
      // what does it mean to re-render here

      // we should be able to apply the renderComponent, just with a deeper root
      // the different is that we shouldn't always push, i will think about this later
      // but we should have all the information and references setup to do this correct

      // i would like it so we define which component to renderer by passing renderComponent a node to re-render
      // then it will output a view sub-tree which we just replace on the view tree based on what the node maps to
      // then we can generate inefficiently re-generate the dom
      const rootSubTreeNode: ReactViewTreeNode = {
        childNodes: [],
        id: crypto.randomUUID(),
        metadata: capturedCurrentlyRenderingRenderNode.internalMetadata,
      };

      const reGeneratedViewTree = renderComponent({
        renderTreeNode: capturedCurrentlyRenderingRenderNode,
        parentViewNode: rootSubTreeNode,
      });

      console.log("lets see the render tree", currentTreeRef.renderTree);

      if (!capturedCurrentlyRenderingRenderNode.computedViewTreeNode) {
        throw new Error(
          "Invariant: set state trying to re-render unmounted component"
        );
      }

      if (!currentTreeRef.viewTree) {
        throw new Error("Invariant error, no view tree");
      }

      console.log(
        "finding this in that",
        capturedCurrentlyRenderingRenderNode.computedViewTreeNode,
        `(${capturedCurrentlyRenderingRenderNode.computedViewTreeNode.metadata.id})`,
        currentTreeRef.viewTree?.root
      );
      const parentRenderNode = findParentViewNode(
        capturedCurrentlyRenderingRenderNode.computedViewTreeNode
      );

      if (!parentRenderNode) {
        currentTreeRef.viewTree.root = reGeneratedViewTree;
      } else {
        const index = parentRenderNode.childNodes.findIndex(
          (n) =>
            n.id ===
            capturedCurrentlyRenderingRenderNode.computedViewTreeNode?.id
        );
        if (index === -1) {
          throw new Error("Invariant error, not a parent of child");
        }

        parentRenderNode.childNodes[index] = reGeneratedViewTree;
      }

      const root = document.getElementById("root")!;
      while (root.firstChild) {
        root.removeChild(root.firstChild);
      }
      console.log("the view tree", currentTreeRef.viewTree?.root!);

      // so hacky clean up later
      applyViewTreeToDomEl({
        parentDomNode: root,
        reactViewNode: currentTreeRef.viewTree?.root!,
      });
    },
  ] as const;
};

const Bar = () => {
  return createElement("area", {}, createElement("bdo", {}));
};
const Foo = () => {
  const foo = createElement(
    "br",
    {},
    createElement("article", null),
    createElement(Bar, null),
    createElement(Bar, null)
  );
  return foo;
};

const Component = () => {
  console.log("am i running?");
  const [x, setX] = useState(2);
  console.log("value being read", x);
  return createElement(
    "div",
    {},
    createElement(Foo, null),
    createElement("button", {
      innerText: "Increment",
      onclick: () => {
        console.log("clicked");
        setX(x + 1);
      },
    }),
    createElement("div", {
      innerText: `Count: ${x}`,
      style: "color:white;",
    }),
    createElement("span", null)
  );
};

const applyViewTreeToDomEl = ({
  reactViewNode,
  parentDomNode,
}: {
  reactViewNode: ReactViewTreeNode;
  parentDomNode: HTMLElement;
}) => {
  reactViewNode.childNodes.forEach((childViewNode) => {
    // console.log("traversing through", childViewNode);
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

  applyViewTreeToDomEl({
    parentDomNode: domEl,
    reactViewNode: reactViewTree.root,
  });
};
const main = () => {};
if (typeof window === "undefined") {
  const { reactViewTree, reactRenderTree } = buildReactTrees(
    createElement(Component, null)
  );
  console.log(JSON.stringify(deepTraverseAndModify(reactRenderTree)));
} else {
  window.onload = () => {
    // console.log("loaded");
    render(createElement(Component, null), document.getElementById("root")!);
  };
}
