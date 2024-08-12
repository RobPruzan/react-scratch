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

  type TagComponent = {
    kind: "tag";
    tagName: keyof HTMLElementTagNameMap;
    domRef: HTMLElement | null;
  };

  type FunctionalComponent = {
    kind: "function";
    name: string;
    function: ReactComponentFunction<AnyProps>;
  };

  type ReactComponentInternalMetadata = {
    component: TagComponent | FunctionalComponent;

    props: AnyProps;
    children: Array<ReactRenderTreeNode>;
    hooks: Array<ReactHookMetadata>;
    id: string;
  };

  type ReactViewTreeNode = {
    id: string;
    childNodes: Array<ReactViewTreeNode>;
    metadata: ReactComponentInternalMetadata;
    key: string;
  };

  type ReactViewTree = {
    root: ReactViewTreeNode;
  };
  type ReactRenderTree = {
    currentlyRendering: ReactRenderTreeNode | null;
    localCurrentHookOrder: number;
    localComponentRenderMap: {
      [componentName: string]: number;
    };
    root: ReactRenderTreeNode;
  };

  // render tree node has a direct link to view tree node
  type ReactRenderTreeNode = {
    id: string;
    childNodes: Array<ReactRenderTreeNode>;
    computedViewTreeNodeId: string | null;
    internalMetadata: ReactComponentInternalMetadata;
    hooks: Array<ReactHookMetadata>;
    localRenderOrder: number;
    isFirstRender: boolean;
  };

  const getKey = (renderNode: ReactRenderTreeNode) => {
    return (
      getComponentName(renderNode.internalMetadata) +
      "-" +
      renderNode.localRenderOrder
    );
  };

  const mapChildNodes = ({
    leftNodes,
    rightNodes,
  }: {
    leftNodes: Array<ReactViewTreeNode>;
    rightNodes: Array<ReactViewTreeNode>;
  }) => {
    // one determines if we immediately delete nodes
    // one determines if we immediately add nodes
    const leftToRight: Record<string, ReactViewTreeNode | null> = {};
    const rightToLeft: Record<string, ReactViewTreeNode | null> = {};

    const associate = ({
      a,
      b,
      aMap,
    }: {
      a: Array<ReactViewTreeNode>;
      b: Array<ReactViewTreeNode>;
      aMap: Record<string, ReactViewTreeNode | null>;
    }) => {
      a.forEach((leftNode) => {
        const associatedRightNode = b.find(
          (rightNode) => rightNode.key === leftNode.key
        );

        aMap[leftNode.id] = associatedRightNode ?? null;
      });
    };

    associate({
      a: leftNodes,
      b: rightNodes,
      aMap: leftToRight,
    });
    associate({
      a: rightNodes,
      b: leftNodes,
      aMap: rightToLeft,
    });

    return [leftToRight, rightToLeft];
  };

  const areViewNodesDeepEqual = ({
    left,
    right,
  }: {
    left: ReactViewTreeNode;
    right: ReactViewTreeNode;
  }) => {
    return deepEqual(left.metadata.props, right.metadata.props);
  };

  const updateDom = ({
    props,
    tagComponent,
    previousDomRef,
    lastParent,
  }: {
    tagComponent: TagComponent;
    previousDomRef: HTMLElement | null;
    props: AnyProps;
    lastParent: HTMLElement;
  }) => {
    const newEl = document.createElement(tagComponent.tagName);
    Object.assign(newEl, props);

    if (previousDomRef) {
      const parent = previousDomRef.parentNode;
      // const clonedEl = newEl.cloneNode();
      // console.log("the new cloned el", clonedEl, "passed props", props);
      // Array.from(previousDomRef.childNodes).forEach((child) =>
      //   clonedEl.appendChild(child)
      // );
      parent?.replaceChild(newEl, previousDomRef);
      // parent?.removeChild(previousDomRef);
    } else {
      lastParent.appendChild(newEl);
    }

    tagComponent.domRef = newEl;

    return newEl;
  };

  const findFirstTagNode = (viewNode: ReactViewTreeNode) => {
    if (viewNode.metadata.component.kind === "tag") {
      return {
        component: viewNode.metadata.component,
        node: viewNode,
      };
    }
    // either returns or the program crashes (:shrug)
    return findFirstTagNode(viewNode.childNodes[0]); // traverse directly down since a functional component will only have one child, should discriminately union this...
  };

  const reconcileDom = ({
    newViewTree,
    oldViewTree,
    startingDomNode,
  }: {
    oldViewTree: ReactViewTreeNode | null;
    newViewTree: ReactViewTreeNode;
    startingDomNode: HTMLElement;
  }) => {
    const aux = ({
      localNewViewTree,
      localOldViewTree,
      lastParent,
    }: {
      localOldViewTree: ReactViewTreeNode | null;
      localNewViewTree: ReactViewTreeNode;
      lastParent: HTMLElement;
    }) => {
      // if (localNewViewTree.)
      console.log("reconciling", localOldViewTree, localNewViewTree);
      switch (localNewViewTree.metadata.component.kind) {
        case "function": {
          console.log("simple return", localOldViewTree, localNewViewTree);
          // we should be doing a comp here because we will never do it again for this...
          const oldNode = localOldViewTree
            ? findFirstTagNode(localOldViewTree)
            : null;
          const newNode = findFirstTagNode(localNewViewTree);
          if (!oldNode) {
            return aux({
              localNewViewTree: localNewViewTree.childNodes[0],
              localOldViewTree: null,
              lastParent,
            });
          }

          if (
            deepEqual(oldNode.node.metadata.props, newNode.node.metadata.props)
          ) {
            console.log(
              "is deep equal, passing on the dom node",
              oldNode.node,
              newNode.node
            );
            // newNode.metadata.component.
            newNode.component.domRef = oldNode.component.domRef;
            return aux({
              localNewViewTree: newNode.node,
              localOldViewTree: oldNode.node,
              lastParent,
            });
          }

          return aux({
            localNewViewTree: localNewViewTree.childNodes[0], // a function should only ever one child. If it returns a null it should never be rendered in the first place
            localOldViewTree: localOldViewTree?.childNodes[0] ?? null, // very naive check, but it will fail quickly once they start comparing tags
            lastParent,
          });
        }

        case "tag": {
          if (!localOldViewTree) {
            const newEl = updateDom({
              lastParent,
              tagComponent: localNewViewTree.metadata.component,
              previousDomRef: null,
              props: localNewViewTree.metadata.props,
            });
            console.log(
              "update dom node early",
              localOldViewTree,
              localNewViewTree
            );

            for (const childNode of localNewViewTree.childNodes) {
              aux({
                localNewViewTree: childNode,
                localOldViewTree: null,
                lastParent: newEl,
              });
            }

            return;
          }
          const [oldToNew, newToOld] = mapChildNodes({
            leftNodes: localOldViewTree.childNodes,
            rightNodes: localNewViewTree.childNodes,
          });

          // to remove
          localOldViewTree.childNodes.forEach((oldNode) => {
            const associatedWith = oldToNew[oldNode.id];

            if (!associatedWith) {
              switch (oldNode.metadata.component.kind) {
                case "function": {
                  const firstTag = findFirstTagNode(oldNode);
                  firstTag.component.domRef?.remove();
                  return;
                }
                case "tag": {
                  console.log("a remove for the tag", oldNode);
                  oldNode.metadata.component.domRef?.remove();
                  return;
                }
              }
            }
          });

          // to add
          localNewViewTree.childNodes.forEach((newNode) => {
            const associatedWith = newToOld[newNode.id];

            console.log("comping", newNode, associatedWith);

            if (!associatedWith) {
              switch (newNode.metadata.component.kind) {
                case "function": {
                  console.log("nothing associated", newNode);
                  return aux({
                    lastParent,
                    localNewViewTree: newNode,
                    localOldViewTree: null,
                  });
                }
                case "tag": {
                  const newEl = updateDom({
                    lastParent,
                    tagComponent: newNode.metadata.component,
                    props: newNode.metadata.props,
                    previousDomRef: null,
                  });
                  console.log("new el for the comp", associatedWith, newNode);

                  return aux({
                    lastParent: newEl,
                    localNewViewTree: newNode,
                    localOldViewTree: null,
                  });
                }
              }
            }

            switch (newNode.metadata.component.kind) {
              case "function": {
                return aux({
                  lastParent,
                  localNewViewTree: newNode,
                  localOldViewTree: associatedWith,
                });
              }

              case "tag": {
                if (!(associatedWith.metadata.component.kind === "tag")) {
                  throw new Error(
                    "Invariant error, this comparison should never happen"
                  );
                }

                const existingDomRef = associatedWith.metadata.component.domRef;
                if (!existingDomRef) {
                  throw new Error(
                    "Invariant error, never should have an old view tree that doesn't have a created dom node"
                  );
                }
                if (
                  deepEqual(
                    newNode.metadata.props,
                    associatedWith.metadata.props
                  )
                ) {
                  // if (!existingDomRef) {
                  //   const newEl = updateDom({
                  //     lastParent,
                  //     props: newNode.metadata.props,
                  //     tagComponent: newNode.metadata.component,
                  //   });

                  //   return aux({
                  //     lastParent: newEl,
                  //     localNewViewTree: newNode,
                  //     localOldViewTree: associatedWith
                  //   })
                  // }
                  console.log(
                    "nodes are deep equal, passing on existing dom ref",
                    newNode,
                    existingDomRef
                  );
                  newNode.metadata.component.domRef = existingDomRef;
                  return aux({
                    lastParent: existingDomRef,
                    localNewViewTree: newNode,
                    localOldViewTree: associatedWith,
                  });
                }

                const newEl = updateDom({
                  lastParent,
                  props: newNode.metadata.props,
                  tagComponent: newNode.metadata.component,
                  previousDomRef: existingDomRef,
                });
                console.log("ending update", associatedWith, newNode);

                return aux({
                  lastParent: newEl,
                  localNewViewTree: newNode,
                  localOldViewTree: associatedWith,
                });
              }
            }
          });
          console.log("not covered branch?");
          return;
        }
        // }
        //  localNewViewTree.metadata.component.kind satisfies never

        // return;
      }
    };
    // console.log('last ');
    return aux({
      lastParent: startingDomNode,
      localNewViewTree: newViewTree,
      localOldViewTree: oldViewTree,
    });
  };

  const mapComponentToTaggedUnion = (
    component: ReactComponentExternalMetadata<AnyProps>["component"]
  ): ReactComponentInternalMetadata["component"] =>
    typeof component === "string"
      ? { kind: "tag", tagName: component, domRef: null }
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
    internalMetadata.component.kind === "function"
      ? internalMetadata.component.function.name
      : internalMetadata.component.tagName;

  const getComponentRepr = (internalMetadata: ReactComponentInternalMetadata) =>
    getComponentName(internalMetadata) +
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
        isFirstRender: true,
      };
      currentTreeRef.renderTree = {
        localCurrentHookOrder: 0,
        currentlyRendering: null,
        root: rootRenderNode,
        localComponentRenderMap: {},
      };
      return rootRenderNode;
    }

    const newLocalRenderOrder =
      (currentTreeRef.renderTree.localComponentRenderMap[
        getComponentRepr(internalMetadata)
      ] ?? 0) + 1;

    currentTreeRef.renderTree.localComponentRenderMap[
      getComponentRepr(internalMetadata)
    ] = newLocalRenderOrder;
    const existingNode =
      currentTreeRef.renderTree.currentlyRendering.childNodes.find(
        (childNode) => {
          const name = getComponentRepr(childNode.internalMetadata);

          if (
            name === getComponentRepr(internalMetadata) &&
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
      isFirstRender: true,
    };
    currentTreeRef.renderTree.currentlyRendering.childNodes.push(
      newRenderTreeNode
    );

    return newRenderTreeNode;
  };

  const findNode = <T extends { id: string; childNodes: Array<T> }>(
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
  function deepCloneTree<T>(obj: T): T {
    if (obj === null || typeof obj !== "object") {
      return obj;
    }

    if (obj instanceof HTMLElement) {
      return obj;
    }

    if (typeof obj === "function") {
      return (obj as any).bind({});
    }

    const copy: any = Array.isArray(obj) ? [] : {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        copy[key] = obj[key];
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
   * Outputs a new view tree based on the provided render node
   *
   */
  const generateViewTree = ({
    renderTreeNode,
  }: {
    renderTreeNode: ReactRenderTreeNode;
  }) => {
    return generateViewTreeHelper({
      renderTreeNode,
      startingFromRenderNodeId: renderTreeNode.id,
      viewNodePool: [],
    });
  };

  const generateViewTreeHelper = ({
    renderTreeNode,
    startingFromRenderNodeId,
    viewNodePool,
  }: {
    renderTreeNode: ReactRenderTreeNode;
    startingFromRenderNodeId: string;
    viewNodePool: Array<ReactViewTreeNode>;
  }): ReactViewTreeNode => {
    if (!currentTreeRef.renderTree) {
      throw new Error("Cannot render component outside of react tree");
    }

    const newNode: ReactViewTreeNode = {
      id: crypto.randomUUID(),
      metadata: renderTreeNode.internalMetadata,
      childNodes: [],
      key: getKey(renderTreeNode),
    };

    renderTreeNode.computedViewTreeNodeId = newNode.id;
    // the idea is we immediately execute the children before running the parent
    // then later when attempting to access its children it will check if its already computed
    // but the current problem is it seems the computed view node is not on the tree before we attempt to access it
    // so we should make a pool of view nodes that we can access during render

    switch (renderTreeNode.internalMetadata.component.kind) {
      case "tag": {
        const fullyComputedChildren =
          renderTreeNode.internalMetadata.children.map(
            (
              child
            ): {
              viewNode: ReactViewTreeNode;
              renderNode: ReactRenderTreeNode;
            } => {
              const reRenderChild = () => {
                const viewNode = generateViewTreeHelper({
                  renderTreeNode: child,
                  startingFromRenderNodeId,
                  viewNodePool,
                });
                if (viewNode.childNodes.length > 1) {
                  throw new Error(
                    "Invariant error, should never have more than one child"
                  );
                }
                return { viewNode, renderNode: child };
              };
              const computedNode = viewNodePool.find(
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
                (node) => node.id === startingFromRenderNodeId,
                currentTreeRef.renderTree?.root!
              );

              if (!shouldReRender) {
                console.log(
                  `skipping re-rendering, ${getComponentRepr(
                    child.internalMetadata
                  )} not a child of ${getComponentRepr(
                    parentRenderNode.internalMetadata
                  )}`
                );
                // skip re-rendering if not a child in the render tree
                return { viewNode: computedNode, renderNode: child };
              }
              return reRenderChild();
            }
          );

        newNode.childNodes = fullyComputedChildren.map(
          ({ viewNode }) => viewNode
        );
        break;
      }
      case "function": {
        const childrenSpreadProps =
          renderTreeNode.internalMetadata.children.length > 0
            ? {
                children: renderTreeNode.internalMetadata.children,
              }
            : false;
        currentTreeRef.renderTree.localCurrentHookOrder = 0;
        currentTreeRef.renderTree.localComponentRenderMap = {};
        currentTreeRef.renderTree.currentlyRendering = renderTreeNode;
        console.log(
          "Running:",
          getComponentRepr(renderTreeNode.internalMetadata)
        );
        const computedRenderTreeNode =
          renderTreeNode.internalMetadata.component.function({
            ...renderTreeNode.internalMetadata.props,
            ...childrenSpreadProps,
          });

        renderTreeNode.isFirstRender = false;

        const viewNode = generateViewTreeHelper({
          renderTreeNode: computedRenderTreeNode,
          startingFromRenderNodeId: renderTreeNode.id,
          viewNodePool,
        });

        newNode.childNodes.push(viewNode);
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
    if (!currentTreeRef.renderTree) {
      throw new Error("Root node passed is not apart of any react render tree");
    }

    console.log(
      "\n\nRENDER START----------------------------------------------"
    );
    const output = generateViewTree({
      renderTreeNode: rootRenderTreeNode,
      // startingFromRenderNodeId: rootRenderTreeNode.id,
    });

    console.log("RENDER END----------------------------------------------\n\n");
    const reactViewTree: ReactViewTree = {
      root: output,
    };

    currentTreeRef.viewTree = reactViewTree;
    currentTreeRef.renderTree.currentlyRendering = null;
    // currentTreeRef.renderTree.isFirstRender = false;

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

    if (capturedCurrentlyRenderingRenderNode.isFirstRender) {
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

        const parentNode = findParentViewNode(
          capturedCurrentlyRenderingRenderNode.computedViewTreeNodeId
        );
        console.log(
          "\n\nRENDER START----------------------------------------------"
        );

        const previousViewTree = deepCloneTree(
          findNode(
            (node) =>
              node.id ===
              capturedCurrentlyRenderingRenderNode.computedViewTreeNodeId,
            currentTreeRef.viewTree.root
          )
        );
        // const previousViewTree = deepCloneTree(capturedCurrentlyRenderingRenderNode)
        const reGeneratedViewTree = generateViewTree({
          renderTreeNode: capturedCurrentlyRenderingRenderNode,
          // startingFromRenderNodeId: capturedCurrentlyRenderingRenderNode.id,
        });

        console.log(
          "RENDER END----------------------------------------------\n\n"
        );
        // its a detached node and because of that we set it as the root
        const index = parentNode?.childNodes.findIndex(
          (node) =>
            capturedCurrentlyRenderingRenderNode.computedViewTreeNodeId ===
            node.id
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
        // const root = document.getElementById("root")!;
        // while (root.firstChild) {
        //   root.removeChild(root.firstChild);
        // }

        reconcileDom({
          newViewTree: reGeneratedViewTree,
          oldViewTree: previousViewTree,
          startingDomNode: run(() => {
            switch (previousViewTree.metadata.component.kind) {
              case "function": {
                const tagNode = findFirstTagNode(
                  previousViewTree.childNodes[0]
                );

                console.log("what does this return", tagNode);
                if (!tagNode.component.domRef) {
                  throw new Error(
                    "Invariant error, an already reconciled tree should have dom elements on every element"
                  );
                }
                return tagNode.component.domRef;
              }
              case "tag": {
                const el = previousViewTree.metadata.component.domRef;
                if (!el) {
                  throw new Error(
                    "Invariant error, an already reconciled tree should have dom elements on every element"
                  );
                }
                return el;
              }
            }
          }),
        });
        // applyViewTreeToDomEl({
        //   parentDomNode: root,
        //   reactViewNode: currentTreeRef.viewTree?.root!,
        // });
      },
    ] as const;
  };
  // const applyViewTreeToDomEl = ({
  //   reactViewNode,
  //   parentDomNode,
  // }: {
  //   reactViewNode: ReactViewTreeNode;
  //   parentDomNode: HTMLElement;
  // }) => {
  //   reactViewNode.childNodes.forEach((childViewNode) => {
  //     switch (childViewNode.metadata.component.kind) {
  //       case "tag": {
  //         const newEl = document.createElement(
  //           childViewNode.metadata.component.tagName
  //         );
  //         Object.assign(newEl, childViewNode.metadata.props);

  //         parentDomNode.appendChild(newEl);
  //         applyViewTreeToDomEl({
  //           parentDomNode: newEl,
  //           reactViewNode: childViewNode,
  //         });
  //         break;
  //       }
  //       case "function":
  //         {
  //           // nothing to add to the dom, just skip
  //           // cant skip in the view tree to keep the binds between the 2 trees, i think?
  //           applyViewTreeToDomEl({
  //             parentDomNode,
  //             reactViewNode: childViewNode,
  //           });
  //         }
  //         break;
  //     }
  //   });
  // };

  export const render = (
    rootElement: ReturnType<typeof createElement>,
    domEl: HTMLElement
  ) => {
    const { reactViewTree } = buildReactTrees(rootElement);

    reconcileDom({
      oldViewTree: null,
      newViewTree: reactViewTree.root,
      startingDomNode: domEl,
    });
    // applyViewTreeToDomEl({
    //   parentDomNode: domEl,
    //   reactViewNode: reactViewTree.root,
    // });
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
const Increment = () => {
  const [x, setX] = React.useState(2);
  return React.createElement(
    "div",
    {
      style: "color:blue",
    },
    React.createElement("button", {
      innerText: "so many counters me:" + x,
      onclick: () => {
        setX(x + 1);
      },
      style: "color: orange",
    })
  );
};
const SimpleChild = () => {
  return React.createElement("h2", {
    innerText: "Im a simple child!!",
  });
};
if (typeof window === "undefined") {
  const { reactViewTree, reactRenderTree } = React.buildReactTrees(
    React.createElement(Increment, null)
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
