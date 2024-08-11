namespace React {
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
    viewNodePool: Array<ReactViewTreeNode>;
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
  export const createElement = <T extends AnyProps>(
    component: ReactComponentExternalMetadata<T>["component"],
    props: ReactComponentExternalMetadata<T>["props"],
    ...children: Array<null | false | ReactRenderTreeNode>
  ): ReactRenderTreeNode => {
    const internalMetadata = mapExternalMetadataToInternalMetadata({
      internalMetadata: {
        children: children.filter(toChild),
        component,
        props,
      },
    });
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
        isFirstRender: true, // i don't think we actually want this
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
    const aux = (
      viewNode: ReactViewTreeNode
    ): ReactViewTreeNode | undefined => {
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
    const aux = (
      viewNode: ReactViewTreeNode
    ): ReactViewTreeNode | undefined => {
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
      metadata: renderTreeNode.internalMetadata,
      childNodes: [],
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
        const computedNode = currentTreeRef.viewTree?.viewNodePool.find(
          (node) => node.id === child.computedViewTreeNodeId
        );
        if (!child.computedViewTreeNodeId) {
          // logging only
        }

        if (!computedNode) {
          return reRenderChild();
        }
        const shouldReRender = isChildOf({
          potentialChildId: child.id,
          potentialParentId: startingFromRenderNodeId,
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
        return reRenderChild();
      }
    );

    switch (renderTreeNode.internalMetadata.component.kind) {
      case "tag": {
        newNode.childNodes = fullyComputedChildren.map(
          ({ viewNode }) => viewNode
        );
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
        currentTreeRef.renderTree.localCurrentHookOrder = 0;
        currentTreeRef.renderTree.localComponentRenderMap = {};
        currentTreeRef.renderTree.currentlyRendering = renderTreeNode;
        const computedRenderTreeNode =
          renderTreeNode.internalMetadata.component.function({
            ...renderTreeNode.internalMetadata.props,
            ...childrenSpreadProps,
          });

        const viewNode = renderComponent({
          renderTreeNode: computedRenderTreeNode,
          parentViewNode: newNode,
          startingFromRenderNodeId: renderTreeNode.id,
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

  export function deepTraverseAndModify(obj: any): any {
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

  export const buildReactTrees = (rootRenderTreeNode: ReactRenderTreeNode) => {
    const rootViewNode: ReactViewTreeNode = {
      id: crypto.randomUUID(),
      metadata: rootRenderTreeNode.internalMetadata,
      childNodes: [],
    };

    if (!currentTreeRef.renderTree) {
      throw new Error("Root node passed is not apart of any react render tree");
    }
    const reactViewTree: ReactViewTree = {
      root: rootViewNode,
      viewNodePool: [],
    };

    currentTreeRef.viewTree = reactViewTree;

    console.log(
      "\n\nRENDER START----------------------------------------------"
    );
    // we ignore the output because its already appended to the root child nodes
    // we need to keep the root alive so we know how to regenerate the tree
    renderComponent({
      renderTreeNode: rootRenderTreeNode,
      parentViewNode: rootViewNode,
      startingFromRenderNodeId: rootRenderTreeNode.id,
    });

    console.log("RENDER END----------------------------------------------\n\n");
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
  export const useState = <T>(initialValue: T) => {
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
        };

        const captureNodeId =
          capturedCurrentlyRenderingRenderNode.computedViewTreeNodeId!;

        const parentNode = findParentViewNode(captureNodeId);
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

        // next step is to diff the previous tree and current tree to determine set of updates needed to apply
        const root = document.getElementById("root")!;
        while (root.firstChild) {
          root.removeChild(root.firstChild);
        }

        applyViewTreeToDomEl({
          parentDomNode: root,
          reactViewNode: currentTreeRef.viewTree?.root!,
        });
      },
    ] as const;
  };
  const applyViewTreeToDomEl = ({
    reactViewNode,
    parentDomNode,
  }: {
    reactViewNode: ReactViewTreeNode;
    parentDomNode: HTMLElement;
  }) => {
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

  export const render = (
    rootElement: ReturnType<typeof createElement>,
    domEl: HTMLElement
  ) => {
    const { reactViewTree } = buildReactTrees(rootElement);
    applyViewTreeToDomEl({
      parentDomNode: domEl,
      reactViewNode: reactViewTree.root,
    });
  };
}

const Bar = () => {
  const [isRenderingSpan, setIsRenderingSpan] = React.useState(false);
  const [x, setX] = React.useState(2);
  return React.createElement(
    "area",
    {},
    React.createElement(Foo, null),
    React.createElement("button", {
      innerText: "conditional render",
      onclick: () => {
        setIsRenderingSpan(!isRenderingSpan);
      },
    }),
    React.createElement("button", {
      innerText: `Count: ${x}`,
      onclick: () => {
        setX(x + 1);
      },
    }),
    isRenderingSpan &&
      React.createElement("span", {
        style:
          "display:flex; height:50px; width:50px; background-color: white;",
      })
  );
};
const Foo = () => {
  const [x, setX] = React.useState(2);
  const foo = React.createElement(
    "div",
    {},
    React.createElement("article", null),
    React.createElement("button", {
      innerText: `another counter, a little deeper: ${x}`,
      onclick: () => {
        setX(x + 1);
      },
    })
  );
  return foo;
};

const PropsTest = (props: any) => {
  const [update, setUpdate] = React.useState(false);
  return React.createElement(
    "div",
    { innerText: "hi" },
    React.createElement("button", {
      innerText: "trigger update",
      onclick: () => {
        setUpdate(!update);
      },
    }),
    ...props.children
  );
};

const IsAChild = () => {
  return React.createElement("div", { innerText: "im a child!" });
};
const Component = (props: any) => {
  const [x, setX] = React.useState(2);
  return React.createElement(
    "div",
    {
      lol: "ok",
    },
    React.createElement("button", {
      innerText: "so many counters me",
      onclick: () => {
        setX(x + 1);
      },
    }),
    React.createElement("div", {
      innerText: `look at this count?: ${x}`,
      style: "color:white;",
    }),
    React.createElement(Bar, null),

    React.createElement("span", {
      innerText: "im a span!",
    })
  );
};

const SimpleParent = (props: any) => {
  const [x, setX] = React.useState(2);
  return React.createElement(
    "div",
    null,
    React.createElement("button", {
      onclick: () => {
        setX(x + 1);
      },
      innerText: "trigger update",
    }),
    React.createElement("div", {
      innerText: "parent of the simple parent",
    }),
    ...props.children
  );
};
const NestThis = () => {
  return React.createElement(
    SimpleParent,
    null,
    React.createElement(SimpleChild, null),
    React.createElement("div", {
      innerText: "part of the simple child",
    }),
    React.createElement(Component, null)
  );
};
const SimpleChild = () => {
  return React.createElement("h2", {
    innerText: "Im a simple child!!",
  });
};
const main = () => {};
if (typeof window === "undefined") {
  const { reactViewTree, reactRenderTree } = React.buildReactTrees(
    React.createElement(NestThis, null)
  );
  console.log(JSON.stringify(React.deepTraverseAndModify(reactViewTree)));
} else {
  window.onload = () => {
    React.render(
      React.createElement(NestThis, null),
      document.getElementById("root")!
    );
  };
}
