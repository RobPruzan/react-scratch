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
    lastRenderChildNodes: Array<ReactRenderTreeNode>;
    currentlyRendering: ReactRenderTreeNode | null;
    localCurrentHookOrder: number;
    // i think this needs to be a tree, not a flat map
    // our logic doesn't work amazing for dynamic items
    // it works but is rough with lists in bigger components determining how to assign ordering keys
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
    hasRendered: boolean; // im confident we don't need ths and can just derive this from existing info on the trees
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

  const updateDom = ({
    props,
    tagComponent,
    previousDomRef,
    lastParent,
    insertedBefore,
  }: {
    tagComponent: TagComponent;
    previousDomRef: HTMLElement | null;
    props: AnyProps;
    lastParent: HTMLElement;
    insertedBefore: HTMLElement | null;
  }) => {
    console.log("update dom passed", {
      props,
      tagComponent,
      previousDomRef,
      lastParent,
      insertedBefore,
    });
    if (previousDomRef) {
      Object.assign(previousDomRef, props);
      tagComponent.domRef = previousDomRef;
      return previousDomRef;
    }
    const newEl = document.createElement(tagComponent.tagName);
    Object.assign(newEl, props);

    if (insertedBefore) {
      // will append if 2nd arg is null
      lastParent.insertBefore(newEl, insertedBefore.nextSibling);
      tagComponent.domRef = newEl;

      return newEl;
    }
    lastParent.appendChild(newEl);

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
      localInsertedBefore,
    }: {
      localOldViewTree: ReactViewTreeNode | null;
      localNewViewTree: ReactViewTreeNode;
      lastParent: HTMLElement;
      localInsertedBefore: HTMLElement | null;
    }): { updatedOrAppendedDomElement: HTMLElement } => {
      console.log("calling aux");
      if (localNewViewTree.metadata.props?.id === "IM AN INNER") {
        console.log(
          "DEBUG!!",
          localOldViewTree,
          localNewViewTree,
          lastParent,
          localInsertedBefore
        );
      } else {
        console.log(
          "call marker",
          localOldViewTree,
          localNewViewTree,
          lastParent,
          localInsertedBefore
        );
      }
      // reconciles the parent then moves to children
      const reconcileTags = ({
        newNode,
        oldNode,
      }: {
        oldNode: ReturnType<typeof findFirstTagNode>;
        newNode: ReturnType<typeof findFirstTagNode>;
      }) => {
        if (
          deepEqual(oldNode.node.metadata.props, newNode.node.metadata.props)
        ) {
          if (!oldNode.component.domRef) {
            throw new Error(
              "Invariant error, already rendered tree must have dom nodes for every view node"
            );
          }
          newNode.component.domRef = oldNode.component.domRef;
          return aux({
            localNewViewTree: newNode.node,
            localOldViewTree: oldNode.node,
            lastParent: newNode.component.domRef!, // maybe this breaks stuff?
            localInsertedBefore: localInsertedBefore,
          });
        } else {
          console.log("3");
          const newEl = updateDom({
            lastParent,
            previousDomRef: oldNode.component.domRef,
            props: newNode.node.metadata.props,
            tagComponent: newNode.component,
            insertedBefore: localInsertedBefore,
          });
          return aux({
            localNewViewTree: newNode.node, // a function should only ever one child. If it returns a null it should never be rendered in the first place
            localOldViewTree: oldNode.node, // very naive check, but it will fail quickly once they start comparing tags
            lastParent: newEl,
            localInsertedBefore: localInsertedBefore, // how do u know??
          });
        }
      };
      switch (localNewViewTree.metadata.component.kind) {
        case "function": {
          // we should be doing a comp here because we will never do it again for this...
          const oldNode = localOldViewTree
            ? findFirstTagNode(localOldViewTree)
            : null;
          const newNode = findFirstTagNode(localNewViewTree);
          console.log(
            "sending this parent and insert before down",
            lastParent,
            localInsertedBefore
          );
          if (!oldNode) {
            // its this call to trigger the important render
            // insert before should be??
            return aux({
              localNewViewTree: newNode.node,
              localOldViewTree: null,
              lastParent,
              localInsertedBefore: localInsertedBefore,
            });
          }

          // the inner is literally before??
          console.log("reconcling tags", { newNode, oldNode });
          return reconcileTags({ newNode, oldNode });
          // return;
        }

        case "tag": {
          if (!localOldViewTree) {
            // but u cant do this twice on the element
            // if instead we had some way to pass down the index of the element that would be good
            console.log("1");
            const newEl = updateDom({
              lastParent,
              tagComponent: localNewViewTree.metadata.component,
              previousDomRef: null,
              props: localNewViewTree.metadata.props,
              insertedBefore: localInsertedBefore,
            });
            let lastInserted: HTMLElement = newEl;
            for (
              let index = 0;
              index < localNewViewTree.childNodes.length;
              index++
            ) {
              const childNode = localNewViewTree.childNodes[index];
              const insertBeforeViewNode = localNewViewTree.childNodes.at(
                index - 1
              );
              console.log(
                "sending before down wahoo it must be getting lost",
                insertBeforeViewNode
              );
              lastInserted = aux({
                localNewViewTree: childNode,
                localOldViewTree: null,
                lastParent: newEl,
                localInsertedBefore: insertBeforeViewNode
                  ? findFirstTagNode(insertBeforeViewNode).component.domRef
                  : null,
              }).updatedOrAppendedDomElement;
            }

            return { updatedOrAppendedDomElement: lastInserted };
          }
          const [oldToNew, newToOld] = mapChildNodes({
            leftNodes: localOldViewTree.childNodes,
            rightNodes: localNewViewTree.childNodes,
          });

          const isDebugNode = lastParent.id === "IM AN INNER";
          if (isDebugNode) {
            console.log(oldToNew, newToOld);
          }

          // to remove
          localOldViewTree.childNodes.forEach((oldNode) => {
            const associatedWith = oldToNew[oldNode.id];

            if (!associatedWith) {
              switch (oldNode.metadata.component.kind) {
                case "function": {
                  const firstTag = findFirstTagNode(oldNode);
                  firstTag.component.domRef?.parentElement?.removeChild(
                    firstTag.component.domRef
                  );
                  return;
                }
                case "tag": {
                  // for some reason the parent element is returning null?
                  oldNode.metadata.component.domRef?.parentElement?.removeChild(
                    oldNode.metadata.component.domRef
                  );
                  return;
                }
              }
            }
          });
          let lastInserted: HTMLElement;
          // to add
          localNewViewTree.childNodes.forEach((newNode, index) => {
            const associatedWith = newToOld[newNode.id];
            // const insertBeforeViewNode = localNewViewTree.childNodes.at(index);
            // const insertBeforeAddNode = insertBeforeViewNode
            //   ? findFirstTagNode(insertBeforeViewNode).component.domRef
            //   : null;
            // console.log("sending this insert beofre down", insertBeforeAddNode);
            if (!associatedWith) {
              // switch (newNode.metadata.component.kind) {
              //   case "function": {

              const output = aux({
                lastParent,
                localNewViewTree: newNode,
                localOldViewTree: null,
                localInsertedBefore: lastInserted,
              });
              lastInserted = output.updatedOrAppendedDomElement;
              return output;
              //   }
              //   case "tag": {
              //     // const newEl = updateDom({
              //     //   lastParent,
              //     //   tagComponent: newNode.metadata.component,
              //     //   props: newNode.metadata.props,
              //     //   previousDomRef: null,
              //     // });

              //     // okay of course it doesn't have anything associated
              //     // it didn't exist previously
              //     // and it has no child nodes, so it should just flop?

              //     // this must be wrong
              //     // so convoluted but another case will catch it.
              //     return aux({
              //       lastParent,
              //       localNewViewTree: newNode,
              //       localOldViewTree: null,
              //     });
              //   }
              // }
            }
            switch (newNode.metadata.component.kind) {
              case "function": {
                const output = aux({
                  lastParent,
                  localNewViewTree: newNode,
                  localOldViewTree: associatedWith,
                  localInsertedBefore: lastInserted,
                });
                lastInserted = output.updatedOrAppendedDomElement;
                return;
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
                if (isDebugNode) {
                  console.log(
                    "doing a deep equal",
                    deepEqual(
                      newNode.metadata.props,
                      associatedWith.metadata.props
                    ),
                    getComponentRepr(associatedWith.metadata),
                    "AND",
                    getComponentRepr(newNode.metadata)
                  );
                }
                if (
                  deepEqual(
                    newNode.metadata.props,
                    associatedWith.metadata.props
                  )
                ) {
                  newNode.metadata.component.domRef = existingDomRef;
                  const output = aux({
                    lastParent: existingDomRef,
                    localNewViewTree: newNode,
                    localOldViewTree: associatedWith,
                    localInsertedBefore: lastInserted,
                  });
                  lastInserted = output.updatedOrAppendedDomElement;
                  return;
                }
                console.log("2");
                const newEl = updateDom({
                  lastParent,
                  props: newNode.metadata.props,
                  tagComponent: newNode.metadata.component,
                  previousDomRef: existingDomRef,
                  insertedBefore: lastInserted,
                });

                aux({
                  lastParent: newEl,
                  localNewViewTree: newNode,
                  localOldViewTree: associatedWith,
                  localInsertedBefore: lastInserted, // no way to know yet
                });
                lastInserted = newEl;
                return;
              }
            }
          });
          // throw new Error("Impossible state all paths should be handled")
          /**
           * Case has no child nodes
           * Has an old node to comp against
           * just deep equal handle them
           */
          let ref = findFirstTagNode(localNewViewTree).component.domRef;
          if (!ref) {
            throw new Error(
              "Cannot end reconciliation without fully building subtree"
            );
          }
          return {
            updatedOrAppendedDomElement: ref,
          };
          // return reconcileTags({
          //   newNode: {
          //     node: localNewViewTree,
          //     component: localNewViewTree.metadata.component,
          //   },
          //   oldNode: findFirstTagNode(localOldViewTree),
          // });
          // return {
          //   /**
          //    * Has no nodes
          //    */
          //   updatedOrAppendedDomElement: updateDom({

          //   })
          // }
        }
      }
    };

    return aux({
      lastParent: startingDomNode,
      localNewViewTree: newViewTree,
      localOldViewTree: oldViewTree,
      localInsertedBefore: null,
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

  // this must be returnign the wrong node
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
    // we have the children why cant we just inspect that to determin order
    // should always be appended prior to the first child
    // wait should it just be preprended?
    //
    if (!currentTreeRef.renderTree?.currentlyRendering) {
      const rootRenderNode: ReactRenderTreeNode = {
        internalMetadata: internalMetadata,
        id: crypto.randomUUID(),
        childNodes: [],
        computedViewTreeNodeId: null,
        hooks: [],
        localRenderOrder: 0,
        hasRendered: false,
      };
      currentTreeRef.renderTree = {
        localCurrentHookOrder: 0,
        currentlyRendering: null,
        root: rootRenderNode,
        localComponentRenderMap: {},
        lastRenderChildNodes: [],
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
    const existingNode = currentTreeRef.renderTree.lastRenderChildNodes.find(
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

    // this doesn't make sense because its not executed yet
    if (existingNode) {
      existingNode.internalMetadata = internalMetadata;
      // this pushing needs to consider order which it seems not to?
      // assume the children need to be re-generated every time
      // console.log("pushing", getComponentRepr(existingNode.internalMetadata));
      if (children.length === 0) {
        // if its a leaf node append to the end (guaranteed order is right)
        currentTreeRef.renderTree.currentlyRendering.childNodes.push(
          existingNode
        );
        return existingNode;
      }
      console.log(
        "unshifting",
        getComponentRepr(existingNode.internalMetadata),
        "onto",
        JSON.stringify(currentTreeRef.renderTree.currentlyRendering.childNodes)
      );
      // else prepend since this is the new root for all the children just appended (must execute before since they are arguments)
      currentTreeRef.renderTree.currentlyRendering.childNodes.push(
        existingNode
      );
      return existingNode;
    }

    const newRenderTreeNode: ReactRenderTreeNode = {
      id: crypto.randomUUID(),
      childNodes: [],
      computedViewTreeNodeId: null,
      internalMetadata: internalMetadata,
      hooks: [],
      localRenderOrder: newLocalRenderOrder,
      hasRendered: false,
    };
    // it appears this order doesn't matter, but doesn't hurt to maintain it
    // i see it doesn't consider order it just pushes which it shouldn't...
    // it should insert at total order
    // console.log(
    //   "pushing (2nd)",
    //   getComponentRepr(newRenderTreeNode.internalMetadata)
    // );
    // what?? it should be this children
    if (children.length === 0) {
      currentTreeRef.renderTree.currentlyRendering.childNodes.push(
        newRenderTreeNode
      );
      console.log(
        "pushing",
        getComponentRepr(newRenderTreeNode.internalMetadata),
        currentTreeRef.renderTree.currentlyRendering.internalMetadata,
        children
      );
      return newRenderTreeNode;
    }
    console.log(
      "unshifting",
      getComponentRepr(newRenderTreeNode.internalMetadata),
      "onto",
      JSON.stringify(currentTreeRef.renderTree.currentlyRendering.childNodes)
    );
    currentTreeRef.renderTree.currentlyRendering.childNodes.push(
      newRenderTreeNode
    );
    console.log(
      "whic gets us",
      currentTreeRef.renderTree.currentlyRendering.childNodes
    );
    return newRenderTreeNode;
  };

  const findNodeOrThrow = <T extends { id: string; childNodes: Array<T> }>(
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

  const findNode = <T extends { id: string; childNodes: Array<T> }>(
    eq: (node: T) => boolean,
    tree: T
  ): T | null => {
    try {
      return findNodeOrThrow(eq, tree);
    } catch {
      return null;
    }
  };

  const findParentNodeOrThrow = <
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

  const findParentNode = <T extends { id: string; childNodes: Array<T> }>(
    eq: (node: T) => boolean,
    tree: T
  ): T | null => {
    try {
      return findParentNodeOrThrow(eq, tree);
    } catch {
      return null;
    }
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

  function calculateJsonBytes(jsonString: string): number {
    return new Blob([jsonString]).size;
  }

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
    });
  };

  const generateViewTreeHelper = ({
    renderTreeNode,
    startingFromRenderNodeId,
  }: // viewNodePool,
  {
    renderTreeNode: ReactRenderTreeNode;
    startingFromRenderNodeId: string;
    // viewNodePool: Array<ReactViewTreeNode>;
  }): ReactViewTreeNode => {
    if (!currentTreeRef.renderTree) {
      throw new Error("Cannot render component outside of react tree");
    }

    // console.log(
    //   "bytes of render tree",
    //   calculateJsonBytes(JSON.stringify(currentTreeRef.renderTree))
    // );
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
                });
                if (viewNode.childNodes.length > 1) {
                  throw new Error(
                    "Invariant error, should never have more than one child"
                  );
                }
                return { viewNode, renderNode: child };
              };

              if (!child.computedViewTreeNodeId) {
              }
              if (!currentTreeRef.viewTree) {
                return reRenderChild();
              }

              const computedNode = findNode(
                (node) => node.id === child.computedViewTreeNodeId,
                currentTreeRef.viewTree.root
              );
              if (!computedNode) {
                return reRenderChild();
              }
              const shouldReRender = isChildOf({
                potentialChildId: child.id,
                potentialParentId: startingFromRenderNodeId,
              });
              const parentRenderNode = findNodeOrThrow(
                (node) => node.id === startingFromRenderNodeId,
                currentTreeRef.renderTree?.root!
              );

              if (!shouldReRender) {
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
        currentTreeRef.renderTree.lastRenderChildNodes =
          renderTreeNode.childNodes;
        renderTreeNode.childNodes = [];
        currentTreeRef.renderTree.currentlyRendering = renderTreeNode;
        console.log(
          "Running:",
          getComponentRepr(renderTreeNode.internalMetadata)
        );

        // this output is the root "render node" generated by createElement of the fn
        // the render tree is built out internally every time createElement is called
        const computedRenderTreeNode =
          renderTreeNode.internalMetadata.component.function({
            ...renderTreeNode.internalMetadata.props,
            ...childrenSpreadProps,
          });
        renderTreeNode.hasRendered = true;
        // NOTE: Below is untested, but should be close to working considering state correctly persists/ is taken down
        const newRenderNodes = renderTreeNode.childNodes
          .filter(
            (node) =>
              !currentTreeRef.renderTree!.lastRenderChildNodes.some(
                (prevNode) => getKey(prevNode) === getKey(node)
              )
          )
          .forEach((node) => {
            console.log(
              "added to render tree:",
              node,
              // renderTreeNode.childNodes.at(-1),
              "new",
              renderTreeNode.childNodes.map(getKey),
              renderTreeNode.childNodes,
              "old",
              currentTreeRef.renderTree!.lastRenderChildNodes.map(getKey),
              currentTreeRef.renderTree!.lastRenderChildNodes
            );
            // future mounting logic;
          });
        const removedRenderNodes =
          currentTreeRef.renderTree.lastRenderChildNodes
            .filter(
              (node) =>
                !renderTreeNode.childNodes.some(
                  (newNode) => getKey(newNode) === getKey(node)
                )
            )
            .forEach((node) => {
              console.log("removed from render tree", node);
            });

        currentTreeRef.renderTree.lastRenderChildNodes = [];
        const viewNode = generateViewTreeHelper({
          renderTreeNode: computedRenderTreeNode,
          startingFromRenderNodeId: renderTreeNode.id,
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
  }

  export const useState = <T>(initialValue: T) => {
    if (!currentTreeRef.renderTree?.currentlyRendering) {
      throw new Error("Cannot call use state outside of a react component");
    }

    const currentStateOrder = currentTreeRef.renderTree.localCurrentHookOrder;
    currentTreeRef.renderTree.localCurrentHookOrder += 1;

    const capturedCurrentlyRenderingRenderNode =
      currentTreeRef.renderTree.currentlyRendering;
    const hasNode = findNode(
      (node) => node.id === capturedCurrentlyRenderingRenderNode.id,
      currentTreeRef.renderTree.root
    );

    if (!capturedCurrentlyRenderingRenderNode.hasRendered) {
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
          findNodeOrThrow(
            (node) =>
              node.id ===
              capturedCurrentlyRenderingRenderNode.computedViewTreeNodeId,
            currentTreeRef.viewTree.root
          )
        );

        const reGeneratedViewTree = generateViewTree({
          renderTreeNode: capturedCurrentlyRenderingRenderNode,
        });
        console.log("the regenerated view tree", reGeneratedViewTree);

        console.log(
          "RENDER END----------------------------------------------\n\n"
        );
        // its a detached node and because of that we set it as the root
        const index = parentNode?.childNodes.findIndex(
          (node) => getKey(capturedCurrentlyRenderingRenderNode) === node.key
        );
        // this will always be in the parent nodes children (or is root)
        // because we re-rendered at capturedCurrentlyRenderingRenderNode,
        // so the previous parent must contain it
        // we can now update the view tree by replacing by component
        // equality (lets go keys)
        if (!parentNode || index === undefined || index === -1) {
          currentTreeRef.viewTree.root = reGeneratedViewTree;
          currentTreeRef.renderTree.root.computedViewTreeNodeId =
            reGeneratedViewTree.id;
        } else {
          parentNode.childNodes[index] = reGeneratedViewTree;
        }

        reconcileDom({
          newViewTree: reGeneratedViewTree,
          oldViewTree: previousViewTree,
          startingDomNode: run(() => {
            switch (previousViewTree.metadata.component.kind) {
              case "function": {
                const tagNode = findFirstTagNode(
                  previousViewTree.childNodes[0]
                );

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
      },
    ] as const;
  };

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

const ConditionalRender = () => {
  const [isRenderingSpan, setIsRenderingSpan] = React.useState(false);
  return React.createElement(
    "div",
    null,
    React.createElement("button", {
      innerText: "conditional render",
      onclick: () => {
        setIsRenderingSpan(!isRenderingSpan);
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
        // console.log('el', );

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
        setTimeout(() => {
          console.log("doing it!!");
          document.getElementById("nest-this")!.id = "test";
        }, 1500);
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
  const [x, setX] = React.useState(2);
  return React.createElement(
    "div",
    {
      id: "nest-this",
    },
    React.createElement(SimpleChild, null),
    React.createElement(
      SimpleParent,
      null,
      React.createElement(SimpleChild, null)
    ),
    // React.createElement("div", {
    //   innerText: "part of the simple child",
    // }),
    // this breaks current reconciliation, it obviously can't correctly map
    React.createElement(Increment, null),
    React.createElement(Increment, null),
    React.createElement(Component, null),
    React.createElement(
      "div",
      {
        style: "color:blue",
      },
      React.createElement("button", {
        innerText: "RERENDER IT ALLL" + x,
        onclick: () => {
          setX(x + 1);
        },
        style: "color: orange",
      })
    )
  );
};
const AnotherLevel = () => {
  return React.createElement(
    "div",
    null,

    React.createElement(Increment, null),
    React.createElement(Increment, null)
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

const OuterWrapper = () => {
  const [counter, setCounter] = React.useState(0);
  const [toggleInner, setToggleInner] = React.useState(true);
  const [items, setItems] = React.useState([1, 2, 3, 4]);

  return React.createElement(
    "div",
    {
      id: "outer-wrapper",
      style: "border: 2px solid black; padding: 10px; margin: 10px;",
    },
    React.createElement("div", {
      innerText: "Counter: " + counter,
    }),
    React.createElement("button", {
      onclick: () => setCounter(counter + 1),
      innerText: "Increase Counter",
    }),
    React.createElement("button", {
      onclick: () => setToggleInner(!toggleInner),
      innerText: toggleInner ? "Hide Inner" : "Show Inner",
    }),
    React.createElement("button", {
      onclick: () => {
        setItems([...items, Math.random()]);
      },
      innerText: "Add a random value",
    }),
    React.createElement("button", {
      onclick: () => {
        setItems(items.slice(0, -1));
      },
      innerText: "Remove last value",
    }),
    toggleInner && React.createElement(InnerWrapper, { counter }),
    React.createElement(DualIncrementer, null),
    ...items.map((i) =>
      React.createElement("div", {
        innerText: i,
      })
    )
    // React.createElement(DualIncrementer, null)
  );
};

const InnerWrapper = ({ counter }) => {
  const [innerCounter, setInnerCounter] = React.useState(0);

  // this evaluates in the wrong order for our logic to work
  // it will push it last
  // but why does that matter ,we initially had the sassumption all that wuld matter was the view tree
  // because we traverse the lrender node to generate the view tree, so of course that order would matter
  // we may need a temp ds to keep track of this tree so we can properly reconstruct it
  // the children could be useful? Using the return values instead of over complicating it
  return React.createElement(
    "div",
    {
      id: "IM AN INNER",
      style: "border: 1px solid gray; padding: 10px; margin: 10px;",
    },
    React.createElement("div", {
      innerText: "Inner Counter: " + innerCounter,
    }),
    React.createElement("button", {
      onclick: () => setInnerCounter(innerCounter + 1),
      innerText: "Increase Inner Counter",
    }),
    React.createElement("div", {
      innerText: "Outer Counter Value: " + counter,
    }),
    React.createElement(LeafComponent, null),
    React.createElement(ContainerComponent, null)
  );
};

const LeafComponent = () => {
  return React.createElement("div", {
    id: "leaf-component",
    style: "padding: 5px; margin: 5px; background-color: lightgray;",
    innerText: "Leaf Component Content",
  });
};

const ContainerComponent = () => {
  return React.createElement(
    "div",
    {
      id: "container-component",
      style: "padding: 5px; margin: 5px; background-color: lightblue;",
    },
    React.createElement(LeafComponent, null)
    // React.createElement(LeafComponent, null)
  );
};

const DualIncrementer = () => {
  const [value, setValue] = React.useState(0);

  return React.createElement(
    "div",
    {
      id: "dual-incrementer",
      style: "padding: 5px; margin: 5px; border: 1px solid red;",
    },
    React.createElement("div", {
      innerText: "Current Value: " + value,
    }),
    React.createElement("button", {
      onclick: () => setValue(value + 1),
      innerText: "Increase Value",
    })
  );
};

const ActionButton = () => {
  return React.createElement(
    "div",
    {
      id: "action-button",
      style: "padding: 5px; margin: 5px; border: 1px solid green;",
    },
    React.createElement("button", {
      onclick: () => alert("Action performed!"),
      innerText: "Perform Action",
    })
  );
};

const MainComponent = () => {
  const [x, setX] = React.useState(2);

  return React.createElement(
    "div",
    {
      id: "main-component",
    },
    React.createElement(LeafComponent, null),
    // React.createElement(
    //   ContainerComponent,
    //   null,
    //   React.createElement(LeafComponent, null)
    // ),
    React.createElement(DualIncrementer, null),
    // React.createElement(DualIncrementer, null),
    React.createElement(ActionButton, null),
    React.createElement(OuterWrapper, null),
    React.createElement(
      "div",
      {
        style: "color:blue",
      },
      React.createElement("button", {
        onclick: () => setX(x + 1),
        innerText: "RERENDER EVERYTHING " + x,
        style: "color: orange",
      })
    )
  );
};

// Render the main component
// ReactDOM.render(
//   React.createElement(MainComponent, null),
//   document.getElementById('root')
// );

if (typeof window === "undefined") {
  const { reactViewTree, reactRenderTree } = React.buildReactTrees(
    React.createElement(Increment, null)
  );
  console.log(JSON.stringify(React.deepTraverseAndModify(reactViewTree)));
} else {
  window.onload = () => {
    React.render(
      React.createElement(MainComponent, null),
      document.getElementById("root")!
    );
  };
}
