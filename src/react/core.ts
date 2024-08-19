import * as Utils from "../utils";
import type {
  ReactRenderTreeNode,
  ReactViewTreeNode,
  TagComponent,
  AnyProps,
  ReactComponentExternalMetadata,
  ReactComponentInternalMetadata,
  ReactViewTree,
  ReactRenderTree,
  RealElement,
  RealElementReactComponentInternalMetadata,
} from "./types";

const getComponentProps = (meta: ReactComponentInternalMetadata) => {
  if (meta.kind === "empty-slot") {
    return null;
  }
  return meta.props;
};

// this function is not really doing anything, at this point is just to help clarity, no point to remove it now
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
    a.forEach((leftNode, index) => {
      const associatedRightNode = null;
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

  let definedAssociation = Object.entries(leftToRight)
    .map(([left, right]) => ({
      left: leftNodes.find((ln) => ln.id === left),
      right,
    }))
    .filter(({ left, right }) => left && right)
    .map(({ left, right }) => ({ left: left!, right: right! }));

  return [leftToRight, rightToLeft, definedAssociation] as const;
};

const updateElement = ({
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
  if (previousDomRef) {
    Object.assign(previousDomRef, props);
    tagComponent.domRef = previousDomRef;
    return previousDomRef;
  }
  const newEl = document.createElement(tagComponent.tagName);
  // tagComponent.domRef = newEl;
  Object.assign(newEl, props);

  if (insertedBefore && !lastParent.contains(insertedBefore)) {
    throw new Error(
      "Invariant, cannot ask update dom to place a node before a non-sibling"
    );
  }

  if (insertedBefore) {
    // will append if 2nd arg is null
    lastParent.insertBefore(newEl, insertedBefore.nextSibling);
    tagComponent.domRef = newEl;

    return newEl;
  }
  console.log("appending", newEl);
  lastParent.appendChild(newEl);

  tagComponent.domRef = newEl;

  return newEl;
};

const findFirstTagNode = (viewNode: ReactViewTreeNode) => {
  if (viewNode.kind === "empty-slot") {
    return null;
  }
  if (viewNode.metadata.kind === "empty-slot") {
    return null;
  }
  switch (viewNode.metadata.component.kind) {
    case "function": {
      return findFirstTagNode(viewNode.childNodes[0]); // will only ever have one child
    }
    case "tag": {
      return {
        component: viewNode.metadata.component,
        viewNode,
      };
    }
  }
  viewNode.metadata.component satisfies never;
};

const updateDom = (args: {
  oldViewTree: ReactViewTreeNode | null;
  newViewTree: ReactViewTreeNode | null;
  insertInfo:
    | {
        kind: "root";
        root: HTMLElement;
      }
    | {
        kind: "child";
        previousViewTreeParent: ReactViewTreeNode;
      };
}) => {
  const aux = ({
    lastUpdatedSibling,
    newViewTree,
    oldViewTree,
    parentDomNode,
  }: {
    oldViewTree: ReactViewTreeNode | null;
    newViewTree: ReactViewTreeNode | null;
    parentDomNode: HTMLElement;
    lastUpdatedSibling: HTMLElement | null;
  }): { lastUpdated: HTMLElement | null } => {
    let x = 2;
    if (
      !newViewTree ||
      newViewTree.kind === "empty-slot" ||
      newViewTree.metadata.kind === "empty-slot"
    ) {
      if (!oldViewTree) {
        // then there's nothing to do
        return { lastUpdated: null };
      }
      // then we have to delete the old view tree node
      const tagNode = findFirstTagNode(oldViewTree);
      if (!tagNode) {
        // nothing to delete, its an empty slot
        return { lastUpdated: null };
      }
      console.log("removing", tagNode);
      tagNode.component.domRef?.parentElement?.removeChild(
        tagNode.component.domRef
      );
      return { lastUpdated: null };
    }
    if (
      !oldViewTree ||
      oldViewTree.kind === "empty-slot" ||
      oldViewTree.metadata.kind === "empty-slot"
    ) {
      // add case
      switch (newViewTree.metadata.component.kind) {
        case "function": {
          const auxResult = aux({
            lastUpdatedSibling: lastUpdatedSibling,
            newViewTree: findFirstTagNode(newViewTree)?.viewNode ?? null,
            oldViewTree: null,
            parentDomNode: parentDomNode,
          });
          // take the aux result as it represents the dom node to be placed before the next sibling
          // the caller has to be responsible for not losing the original lastUpdated ref
          return { lastUpdated: auxResult.lastUpdated };
        }

        case "tag": {
          // then we can trivially add a node to the dom before the last updated sibling (it must be a sibling)

          const updatedElement = updateElement({
            insertedBefore: lastUpdatedSibling,
            lastParent: parentDomNode,
            previousDomRef: null,
            props: newViewTree.metadata.props,
            tagComponent: newViewTree.metadata.component,
          });

          // second time we do this which is a little annoying
          // could abstract to a fn but would like aux to be that fn
          let trackedLastUpdatedSibling: HTMLElement | null = null;
          // we make calls to add every child since there is no view tree to diff against
          newViewTree.childNodes.forEach((newChildNode) => {
            aux({
              lastUpdatedSibling: trackedLastUpdatedSibling,
              newViewTree: newChildNode,
              oldViewTree: null,
              parentDomNode: updatedElement,
            });
          });

          return { lastUpdated: updatedElement };
        }
      }
      newViewTree.metadata.component satisfies never;
    }

    switch (newViewTree.metadata.component.kind) {
      // pass through case
      case "function": {
        const auxResult = aux({
          lastUpdatedSibling: lastUpdatedSibling,
          newViewTree: findFirstTagNode(newViewTree)?.viewNode ?? null,
          oldViewTree: findFirstTagNode(oldViewTree)?.viewNode ?? null,
          parentDomNode: parentDomNode,
        });
        // because we pass through, this result is important and we should forward it
        return {
          lastUpdated: auxResult.lastUpdated,
        };
      }

      case "tag":
        {
          switch (oldViewTree.metadata.component.kind) {
            case "function": {
              // re-apply the function with the next child of the function
              const auxResult = aux({
                lastUpdatedSibling: lastUpdatedSibling,
                newViewTree: newViewTree,
                oldViewTree: oldViewTree.childNodes[0], // will always have one child
                parentDomNode: parentDomNode,
              });
              return { lastUpdated: auxResult.lastUpdated };
            }

            case "tag": {
              const lastUpdated = Utils.run(() => {
                if (
                  !(oldViewTree.metadata.kind === "real-element") ||
                  !(newViewTree.metadata.kind === "real-element")
                ) {
                  throw new Error("No longer a non escaping function");
                }
                if (
                  !(oldViewTree.metadata.component.kind === "tag") ||
                  !(newViewTree.metadata.component.kind === "tag")
                ) {
                  throw new Error("No longer a non-escaping closure");
                }
                if (
                  !Utils.deepEqual(
                    oldViewTree.metadata.props,
                    newViewTree.metadata.props
                  ) ||
                  oldViewTree.metadata.component.tagName !==
                    newViewTree.metadata.component.tagName
                ) {
                  return updateElement({
                    insertedBefore: lastUpdatedSibling,
                    lastParent: parentDomNode,
                    previousDomRef: oldViewTree.metadata.component.domRef,
                    props: newViewTree.metadata.props,
                    tagComponent: newViewTree.metadata.component,
                  });
                }
                newViewTree.metadata.component.domRef =
                  oldViewTree.metadata.component.domRef;

                // const findParenTag = (node: ReactViewTreeNode) => {
                //   // if (node.kind === 'empty-slot')
                // }
                return oldViewTree.metadata.component.domRef!;
              });
              // then there's an associated existing dom node and we just update its props

              // now we recursively apply aux to the children nodes
              // const [oldToNew, newToOld, definedAssociation] = mapChildNodes({
              //   leftNodes: oldViewTree.childNodes,
              //   rightNodes: newViewTree.childNodes,
              // });

              let trackedLastUpdatedSibling: HTMLElement | null = null;

              // handles deleting any extra nodes from the previous tree not associated with a new view tree node
              oldViewTree.childNodes.forEach((oldNode, index) => {
                // const associatedWith = newViewTree.childNodes.at(index);

                if (index < newViewTree.childNodes.length) {
                  return;
                }
                // if (!associatedWith) {
                // we don't care about the return result since it wont update or add anything
                aux({
                  parentDomNode: lastUpdated,
                  lastUpdatedSibling: trackedLastUpdatedSibling,
                  newViewTree: null,
                  oldViewTree: oldNode,
                });
                // trackedLastUpdatedChild = auxResult.lastUpdated;
                // }
              });
              // handles adding any extra nodes that appeared in the new view tree
              newViewTree.childNodes.forEach((newNode, index) => {
                const associatedWith = oldViewTree.childNodes.at(index);

                // we do care about the return result since it may add to the dom
                const auxResult = aux({
                  lastUpdatedSibling: trackedLastUpdatedSibling,
                  newViewTree: newNode,
                  oldViewTree: associatedWith ?? null,
                  parentDomNode: lastUpdated,
                });
                // incase it didn't add anything (e.g. the new node was a slot), we want to not destroy the last sibling
                trackedLastUpdatedSibling =
                  auxResult.lastUpdated ?? trackedLastUpdatedSibling;
              });

              // definedAssociation.forEach(
              //   ({ left: oldChildNode, right: newChildNode }) => {
              //     const auxResult = aux({
              //       lastUpdatedSibling: trackedLastUpdatedSibling,
              //       newViewTree: newChildNode,
              //       oldViewTree: oldChildNode,
              //       parentDomNode: lastUpdated,
              //     });
              //     // same reasoning when updating trackedLastUpdatedSibling in the add loop
              //     trackedLastUpdatedSibling =
              //       auxResult.lastUpdated ?? trackedLastUpdatedSibling;
              //   }
              // );
              return { lastUpdated: lastUpdated };
            }
          }
        }
        oldViewTree.metadata.component satisfies never;
    }
    newViewTree.metadata.component satisfies never;
  };

  switch (args.insertInfo.kind) {
    case "root": {
      aux({
        lastUpdatedSibling: null,
        newViewTree: args.newViewTree,
        oldViewTree: args.oldViewTree,
        parentDomNode: args.insertInfo.root,
      });
      return;
    }
    case "child":
      {
        if (!currentTreeRef.viewTree) {
          throw new Error(
            "Invariant error, cannot reconcile child without a view tree setup"
          );
        }

        const previousChild =
          args.insertInfo.previousViewTreeParent.kind === "empty-slot"
            ? null
            : args.insertInfo.previousViewTreeParent?.childNodes.reduce<null | ReactViewTreeNode>(
                (prev, _, index) => {
                  if (
                    !(args.insertInfo.kind === "child") ||
                    args.insertInfo.previousViewTreeParent.kind === "empty-slot"
                  ) {
                    throw new Error(
                      "No longer a non escaping closure, unsafe access"
                    );
                  }
                  const nextSibling =
                    args.insertInfo.previousViewTreeParent.childNodes.at(
                      index + 1
                    );
                  if (nextSibling) {
                    return nextSibling;
                  }
                  return prev;
                },
                null
              );

        const tagNode = previousChild ? findFirstTagNode(previousChild) : null;

        if (tagNode && !tagNode.component.domRef) {
          throw new Error(
            "Invariant Error: Previous view tree must always have dom nodes on tags"
          );
        }
        if (tagNode && !tagNode.component.domRef!.parentElement) {
          throw new Error(
            "Invariant Error: Attempting to update a detached dom node"
          );
        }

        const parentTagNode = findFirstTagNode(
          args.insertInfo.previousViewTreeParent
        );

        if (!parentTagNode) {
          throw new Error(
            "Invariant Error: A parent node could not have been an empty slot since we know it has view node children"
          );
        }
        if (!parentTagNode.component.domRef) {
          console.log(JSON.stringify(args.insertInfo.previousViewTreeParent));
          throw new Error(
            "Invariant Error: Previous view tree must always have dom nodes on tags"
          );
        }
        aux({
          lastUpdatedSibling: tagNode?.component.domRef ?? null,
          newViewTree: args.newViewTree,
          oldViewTree: args.oldViewTree,
          parentDomNode: parentTagNode.component.domRef,
        });
      }
      return;
  }
  args.insertInfo satisfies never;
};

const mapComponentToTaggedUnion = (
  component: ReactComponentExternalMetadata<AnyProps>["component"]
): RealElementReactComponentInternalMetadata["component"] =>
  typeof component === "string"
    ? { kind: "tag", tagName: component, domRef: null }
    : { kind: "function", function: component, name: component.name };

const mapExternalMetadataToInternalMetadata = ({
  externalMetadata,
}: {
  externalMetadata: ReactComponentExternalMetadata<AnyProps>;
}): ReactComponentInternalMetadata => ({
  kind: "real-element",
  component: mapComponentToTaggedUnion(externalMetadata.component),
  children: externalMetadata.children.map(
    (child): ReactComponentInternalMetadata => {
      const slotNode: ReactComponentInternalMetadata = {
        kind: "empty-slot",
      };
      if (!child) {
        return slotNode;
      }

      if (child.kind === "empty-slot") {
        return slotNode;
      }

      return child;
    }
  ),
  props: externalMetadata.props,
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
  Utils.run(() => {
    if (internalMetadata.kind === "empty-slot") {
      return "empty-slot";
    }
    switch (internalMetadata.component.kind) {
      case "function": {
        return internalMetadata.component.function.name;
      }
      case "tag": {
        return internalMetadata.component.tagName;
      }
    }
    internalMetadata.component satisfies never;
  });

const getComponentRepr = (internalMetadata: ReactComponentInternalMetadata) =>
  getComponentName(internalMetadata) +
  "-" +
  (internalMetadata.kind === "real-element"
    ? JSON.stringify(internalMetadata.props)
    : "empty-slot");

export const createElement = <T extends AnyProps>(
  component: ReactComponentExternalMetadata<T>["component"],
  props: T,
  ...children: Array<ReactComponentInternalMetadata | null | false | undefined>
): ReactComponentInternalMetadata => {
  const internalMetadata = mapExternalMetadataToInternalMetadata({
    externalMetadata: {
      children: children,
      component,
      props,
    },
  });

  return internalMetadata;
};

const findParentViewNode = (id: string): ReactViewTreeNode => {
  const aux = (viewNode: ReactViewTreeNode): ReactViewTreeNode | undefined => {
    if (viewNode.kind === "empty-slot") {
      return;
    }
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

  if (currentTreeRef.viewTree?.root?.id === id) {
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
    if (viewNode.kind === "empty-slot") {
      return null;
    }
    if (
      viewNode.childNodes.some(
        (n) =>
          n.kind === "real-element" &&
          renderNode.kind === "real-element" &&
          n.id === renderNode.id
      )
    ) {
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
    if (node.kind === "empty-slot") {
      return;
    }
    if (node.internalMetadata.kind === "empty-slot") {
      return;
    }
    if (node.internalMetadata.id === searchId) {
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

const compareIndexPaths = (
  leftIndexPath: Array<number>,
  rightIndexPath: Array<number>
) => {
  if (leftIndexPath.length !== rightIndexPath.length) {
    return false;
  }
  for (let i = 0; i < leftIndexPath.length; i++) {
    const leftIndex = leftIndexPath[i];
    const rightIndex = rightIndexPath[i];

    if (leftIndex !== rightIndex) {
      return false;
    }
  }

  return true;
};

export const findViewNodeOrThrow = (
  eq: (node: ReactViewTreeNode) => boolean,
  tree: ReactViewTreeNode
): ReactViewTreeNode => {
  const aux = (viewNode: ReactViewTreeNode): ReactViewTreeNode | undefined => {
    if (viewNode.kind === "empty-slot") {
      return;
    }
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

const findRenderNode = (
  eq: (node: ReactRenderTreeNode) => boolean,
  tree: ReactRenderTreeNode
) => {
  try {
    return findRenderNodeOrThrow(eq, tree);
  } catch {
    return null;
  }
};

export const findRenderNodeOrThrow = (
  eq: (node: ReactRenderTreeNode) => boolean,
  tree: ReactRenderTreeNode
): ReactRenderTreeNode => {
  const aux = (
    viewNode: ReactRenderTreeNode
  ): ReactRenderTreeNode | undefined => {
    if (viewNode.kind === "empty-slot") {
      return;
    }
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

const reconcileRenderNodeChildNodes = ({
  oldRenderTreeNodes,
  newRenderTreeNodes,
}: {
  oldRenderTreeNodes: Array<ReactRenderTreeNode>;
  newRenderTreeNodes: Array<ReactRenderTreeNode>;
}) => {
  const reconciledChildNodes: Array<ReactRenderTreeNode> = [];
  newRenderTreeNodes.forEach((newChildNode, index) => {
    const oldChildNode = oldRenderTreeNodes.at(index);
    if (!oldChildNode) {
      reconciledChildNodes.push(newChildNode);
      return;
    }
    // we want the newer node in both cases since we don't track empty slot equality
    if (
      oldChildNode.kind === "empty-slot" ||
      newChildNode.kind === "empty-slot"
    ) {
      reconciledChildNodes.push(newChildNode);
      return;
    }
    // lets test this later to see if it would of broke, i want to make sure it is doing something (with that left == left bug)
    if (!compareIndexPaths(oldChildNode.indexPath, newChildNode.indexPath)) {
      reconciledChildNodes.push(newChildNode);
      return;
    }
    oldChildNode.internalMetadata = newChildNode.internalMetadata;
    oldChildNode.computedViewTreeNodeId = null;

    reconciledChildNodes.push(oldChildNode);
  });
  return reconciledChildNodes;
};

const generateRenderNodeChildNodes = ({
  internalMetadata,
}: {
  internalMetadata: ReactComponentInternalMetadata;
}) => {
  const accumulatedSiblings: Array<ReactRenderTreeNode> = [];
  const aux = ({
    internalMetadata,
    indexPath,
  }: {
    internalMetadata: ReactComponentInternalMetadata;

    indexPath: Array<number>;
  }) => {
    if (!currentTreeRef.renderTree) {
      throw new Error("invariant error");
    }
    // extremely inefficient, but it works :P
    const existingNode =
      internalMetadata.kind === "empty-slot"
        ? null
        : findRenderNode((node) => {
            if (node.kind === "empty-slot") {
              return false;
            }
            if (node.internalMetadata.kind === "empty-slot") {
              return false;
            }

            return node.internalMetadata.id === internalMetadata.id;
          }, currentTreeRef.renderTree.root);

    if (existingNode) {
      return;
    }
    const newNode: ReactRenderTreeNode = {
      indexPath,
      childNodes: [],
      computedViewTreeNodeId: null,
      hasRendered: false,
      hooks: [],
      id: crypto.randomUUID(),
      internalMetadata: internalMetadata,
      kind: internalMetadata.kind,
    };

    accumulatedSiblings.push(newNode);
    if (internalMetadata.kind === "empty-slot") {
      return newNode;
    }
    internalMetadata.children.map((child, index) => {
      aux({
        internalMetadata: child,
        indexPath: [...indexPath, index],
      });
    });
  };

  aux({
    indexPath: [],
    internalMetadata,
  });

  return accumulatedSiblings;
};

/**
 *
 * Outputs a new view tree based on the provided render node
 *
 */
const generateViewTree = ({
  renderNode,
}: {
  renderNode: ReactRenderTreeNode;
}): ReturnType<typeof generateViewTreeHelper> => {
  console.log(calculateJsonBytes(JSON.stringify(currentTreeRef.renderTree)));
  if (renderNode.kind === "empty-slot") {
    return {
      kind: "empty-slot",
      id: crypto.randomUUID(),
    };
  }

  return generateViewTreeHelper({
    renderNode: renderNode,
    startingFromRenderNodeId: renderNode.id,
  });
};

const generateViewTreeHelper = ({
  renderNode,
  startingFromRenderNodeId,
}: {
  renderNode: ReactRenderTreeNode;
  startingFromRenderNodeId: string;
}): ReactViewTreeNode => {
  if (!currentTreeRef.renderTree) {
    throw new Error("Cannot render component outside of react tree");
  }
  // if the node itself represents nothing, don't traverse
  if (renderNode.kind === "empty-slot") {
    const newId = crypto.randomUUID();
    // renderNode.computedViewTreeNodeId = newId;
    return {
      kind: "empty-slot",
      id: newId,
    };
  }

  // console.log(
  //   "bytes of render tree",
  //   calculateJsonBytes(JSON.stringify(currentTreeRef.renderTree))
  // );
  // if the component directly outputs an empty slot, nothing to generate so don't traverse
  if (renderNode.internalMetadata.kind === "empty-slot") {
    const newId = crypto.randomUUID();
    renderNode.computedViewTreeNodeId = newId;
    return {
      id: newId,
      metadata: renderNode.internalMetadata,
      childNodes: [{ kind: "empty-slot", id: crypto.randomUUID() }],
      indexPath: renderNode.indexPath,
      kind: "real-element",
    };
  }

  const newNode: ReactViewTreeNode = {
    id: crypto.randomUUID(),
    metadata: renderNode.internalMetadata,
    childNodes: [],
    indexPath: renderNode.indexPath,
    kind: "real-element",
    // key: getKey(renderNode), // i probably don't want this...
  };

  renderNode.computedViewTreeNodeId = newNode.id;

  switch (renderNode.internalMetadata.component.kind) {
    case "tag": {
      const fullyComputedChildren = renderNode.internalMetadata.children.map(
        (
          child
        ): {
          viewNode: ReactViewTreeNode;
          renderNode: ReactRenderTreeNode;
        } => {
          if (child.kind === "empty-slot") {
            return {
              renderNode: { kind: "empty-slot" },
              viewNode: {
                kind: "empty-slot",
                id: crypto.randomUUID(), // no idea what to put for these ideas if im being real
              },
            };
          }
          if (!currentTreeRef.renderTree?.root) {
            throw new Error("determine the invariant error type later");
          }

          const existingRenderTreeNode = findRenderNodeOrThrow((node) => {
            if (node.kind === "empty-slot") {
              return false;
            }
            if (node.internalMetadata.kind === "empty-slot") {
              return false;
            }
            return node.internalMetadata.id === child.id;
          }, currentTreeRef.renderTree.root);

          const parentRenderTreeNode = findRenderNodeOrThrow((node) => {
            if (node.kind === "empty-slot") {
              return false;
            }
            if (node.internalMetadata.kind === "empty-slot") {
              return false;
            }

            return node.id === startingFromRenderNodeId;
          }, currentTreeRef.renderTree.root);
          if (
            parentRenderTreeNode.kind === "empty-slot" ||
            parentRenderTreeNode.internalMetadata.kind === "empty-slot"
          ) {
            throw new Error("Invariant Error: Parent cannot be an empty slot");
          }

          const reRenderChild = () => {
            const viewNode = generateViewTreeHelper({
              renderNode: existingRenderTreeNode,
              startingFromRenderNodeId: startingFromRenderNodeId,
            });

            if (viewNode.kind === "empty-slot") {
              return {
                viewNode: viewNode,
                renderNode: existingRenderTreeNode,
              };
            }

            return { viewNode, renderNode: existingRenderTreeNode };
          };

          if (!currentTreeRef.viewTree) {
            return reRenderChild();
          }

          if (existingRenderTreeNode.kind === "empty-slot") {
            return {
              viewNode: { kind: "empty-slot", id: crypto.randomUUID() },
              renderNode: existingRenderTreeNode,
            };
          }

          const computedNode =
            currentTreeRef.viewTree.root &&
            existingRenderTreeNode.computedViewTreeNodeId
              ? findViewNodeOrThrow(
                  (node) =>
                    node.id === existingRenderTreeNode.computedViewTreeNodeId,
                  currentTreeRef.viewTree.root
                )
              : null;

          if (!computedNode) {
            return reRenderChild();
          }

          const shouldReRender =
            existingRenderTreeNode.internalMetadata.kind === "empty-slot"
              ? false
              : isChildOf({
                  potentialChildId: child.id,
                  potentialParentId: parentRenderTreeNode.internalMetadata.id,
                });

          if (!shouldReRender) {
            console.log("Skipping re-render of", getComponentName(child));
            return {
              viewNode: computedNode,
              renderNode: existingRenderTreeNode,
            };
          }
          return reRenderChild();
        }
      );

      newNode.childNodes = fullyComputedChildren
        .map(({ viewNode }) => viewNode)
        .filter((viewNode) => viewNode !== null);

      break;
    }
    case "function": {
      const childrenSpreadProps =
        renderNode.internalMetadata.children.length > 0
          ? {
              children: renderNode.internalMetadata.children,
            }
          : false;
      currentTreeRef.renderTree.currentLocalCurrentHookOrder = 0;
      currentTreeRef.renderTree.currentlyRendering = renderNode;
      const previousRenderEffects = renderNode.hooks
        .filter((hook) => hook.kind === "effect")
        .map((hook) => hook.deps);
      const hasRendered = renderNode.hasRendered;
      console.log(
        "Rendering:",
        renderNode.internalMetadata.component.function.name
      );
      const outputInternalMetadata =
        renderNode.internalMetadata.component.function({
          ...renderNode.internalMetadata.props,
          ...childrenSpreadProps,
        });

      const currentRenderEffects = renderNode.hooks
        .filter((hook) => hook.kind === "effect")
        .map((hook) => hook.deps);

      const didDepsChange = Utils.run(() => {
        if (!hasRendered) {
          return true;
        }

        previousRenderEffects.forEach((deps, index) => {
          const currentDeps = currentRenderEffects[index]; // will always be a safe access

          if (deps.length !== currentDeps.length) {
            return true;
          }

          return !deps.every((dep, index) => {
            const currentDep = currentDeps[index];
            return dep === currentDep;
          });
        });
      });

      if (didDepsChange) {
        renderNode.hooks.forEach((hook) => {
          if (hook.kind !== "effect") {
            return;
          }
          if (hook.cleanup) {
            hook.cleanup();
          }

          const cleanup = hook.cb();

          if (typeof cleanup === "function") {
            hook.cleanup = cleanup;
          }
        });
      }
      const generatedRenderChildNodes = generateRenderNodeChildNodes({
        internalMetadata: outputInternalMetadata,
      });

      const reconciledRenderChildNodes = reconcileRenderNodeChildNodes({
        newRenderTreeNodes: generatedRenderChildNodes,
        oldRenderTreeNodes: renderNode.childNodes,
      });

      const nextNodeToProcess = reconciledRenderChildNodes.find((node) => {
        if (node.kind === "empty-slot") {
          return false;
        }
        return node.indexPath.length === 0;
      }) ?? { kind: "empty-slot" };

      const removedRenderNodes = renderNode.childNodes.filter(
        (node) =>
          !generatedRenderChildNodes.some(
            (newNode) =>
              newNode.kind !== "empty-slot" &&
              node.kind !== "empty-slot" &&
              compareIndexPaths(newNode.indexPath, node.indexPath)
          )
      );

      removedRenderNodes.forEach((node) => {
        if (node.kind === "empty-slot") {
          return;
        }

        node.hooks.forEach((hook) => {
          if (hook.kind !== "effect") {
            return;
          }

          if (hook.cleanup) {
            hook.cleanup();
          }
        });
      });

      renderNode.childNodes = reconciledRenderChildNodes;

      renderNode.hasRendered = true;

      const viewNode = generateViewTreeHelper({
        renderNode: nextNodeToProcess,
        startingFromRenderNodeId: renderNode.id,
      });

      if (!viewNode) {
        break;
      }

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

export const buildReactTrees = (
  rootComponentInternalMetadata: ReactComponentInternalMetadata
) => {
  const rootRenderTreeNode: ReactRenderTreeNode =
    rootComponentInternalMetadata.kind === "empty-slot"
      ? {
          kind: "empty-slot",
        }
      : // this looks super weird, but we transform the root metadata into an implicit
        // component that returns the provided internal metadata
        {
          kind: "real-element",
          childNodes: [],
          computedViewTreeNodeId: null,
          hasRendered: false,
          hooks: [],
          id: crypto.randomUUID(),
          indexPath: [],
          internalMetadata: {
            component: {
              kind: "function",
              function: () => rootComponentInternalMetadata,
              name: "root",
            },
            children: [],
            id: crypto.randomUUID(),
            kind: "real-element",
            props: null,
          },
        };

  currentTreeRef.renderTree = {
    root: rootRenderTreeNode,
    currentLastRenderChildNodes: [],
    currentLocalCurrentHookOrder: 0,
    currentlyRendering: null,
  };

  console.log("\n\nRENDER START----------------------------------------------");
  const output = generateViewTree({
    renderNode: rootRenderTreeNode,
  });

  console.log("RENDER END----------------------------------------------\n\n");
  const reactViewTree: ReactViewTree = {
    root: output,
  };

  currentTreeRef.viewTree = reactViewTree;
  currentTreeRef.renderTree.currentlyRendering = null;

  return {
    reactRenderTree: currentTreeRef.renderTree,
    reactViewTree: currentTreeRef.viewTree,
  };
};

export const useRef = <T>(initialValue: T) => {
  if (!currentTreeRef.renderTree) {
    throw new Error("Cannot call use state outside of a react component");
  }
  if (!currentTreeRef.renderTree.currentlyRendering) {
    throw new Error("Component being called outside of react internals");
  }
  const currentlyRendering = currentTreeRef.renderTree?.currentlyRendering;

  if (!currentlyRendering) {
    throw new Error("Cannot call use state outside of a react component");
  }

  if (currentlyRendering.kind === "empty-slot") {
    throw new Error("A slot will never call a hook");
  }

  if (!currentlyRendering.hasRendered) {
    const refTo = {
      current: initialValue,
    };
    currentlyRendering.hooks.push({
      kind: "ref",
      refTo,
    });
    return refTo;
  }

  const hookValue =
    currentlyRendering.hooks[
      currentTreeRef.renderTree.currentLocalCurrentHookOrder
    ];
  if (hookValue.kind !== "ref") {
    throw new Error("Different hooks called compared previous render");
  }

  return hookValue.refTo as { current: T };
};

export const useEffect = (cb: () => void, deps: Array<unknown>) => {
  if (!currentTreeRef.renderTree) {
    throw new Error("Cannot call use state outside of a react component");
  }
  if (!currentTreeRef.renderTree.currentlyRendering) {
    throw new Error("Component being called outside of react internals");
  }
  const currentlyRendering = currentTreeRef.renderTree?.currentlyRendering;

  if (!currentlyRendering) {
    throw new Error("Cannot call use state outside of a react component");
  }

  if (currentlyRendering.kind === "empty-slot") {
    throw new Error("A slot will never call a hook");
  }

  if (!currentlyRendering.hasRendered) {
    currentlyRendering.hooks.push({
      kind: "effect",
      cb,
      deps,
      cleanup: null,
    });
  }

  // const hookValue =
  //   currentlyRendering.hooks[
  //     currentTreeRef.renderTree.currentLocalCurrentHookOrder
  //   ];
  // if (hookValue.kind !== "ref") {
  //   throw new Error("Different hooks called compared previous render");
  // }
};

export const useState = <T>(initialValue: T) => {
  if (!currentTreeRef.renderTree?.currentlyRendering) {
    throw new Error("Cannot call use state outside of a react component");
  }

  const currentStateOrder =
    currentTreeRef.renderTree.currentLocalCurrentHookOrder;
  currentTreeRef.renderTree.currentLocalCurrentHookOrder += 1;

  const capturedCurrentlyRenderingRenderNode =
    currentTreeRef.renderTree.currentlyRendering;

  if (capturedCurrentlyRenderingRenderNode.kind === "empty-slot") {
    throw new Error(
      "Invariant Error: A node that triggered a set state cannot be an empty slot"
    );
  }

  if (!capturedCurrentlyRenderingRenderNode.hasRendered) {
    // capturedCurrentlyRenderingRenderNode.hooks[currentStateOrder] = {
    //   kind: "state",
    //   value: initialValue,
    // };
    capturedCurrentlyRenderingRenderNode.hooks.push({
      kind: "state",
      value: initialValue,
    });
  }

  const hookMetadata =
    capturedCurrentlyRenderingRenderNode.hooks[currentStateOrder];

  if (hookMetadata.kind !== "state") {
    throw new Error("Different number of hooks rendered between render");
  }

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

      if (parentNode.kind === "empty-slot") {
        throw new Error(
          "Invariant Error: An empty slot cannot have any children"
        );
      }

      const clonedParentNode = Utils.deepCloneTree(parentNode);

      console.log(
        "\n\nRENDER START----------------------------------------------"
      );

      const previousViewTree =
        clonedParentNode?.childNodes.find(
          (node) =>
            node.id ===
            capturedCurrentlyRenderingRenderNode.computedViewTreeNodeId
        ) ?? currentTreeRef.viewTree.root;

      const reGeneratedViewTree = generateViewTree({
        renderNode: capturedCurrentlyRenderingRenderNode,
      });
      console.log(
        "RENDER END----------------------------------------------\n\n"
      );

      // its a detached node and because of that we set it as the root
      const index = parentNode?.childNodes.findIndex(
        (node) =>
          capturedCurrentlyRenderingRenderNode.internalMetadata.kind ===
            "empty-slot" ||
          node.kind === "empty-slot" ||
          node.metadata.kind === "empty-slot"
            ? false
            : capturedCurrentlyRenderingRenderNode.internalMetadata.id ===
              node.metadata.id // changes this might be dangerous, but no idea why we used the key before
      );
      // this will always be in the parent nodes children (or is root)
      // because we re-rendered at capturedCurrentlyRenderingRenderNode,
      // so the previous parent must contain it
      // we can now update the view tree by replacing by component
      // equality (lets go keys)
      if (!parentNode || index === undefined || index === -1) {
        if (
          currentTreeRef.renderTree.root.kind === "empty-slot" &&
          reGeneratedViewTree
        ) {
          throw new Error(
            "Invariant Error: This implies an empty slot generated a not null view tree"
          );
        }
        // should not do an upper mutate here...

        currentTreeRef.viewTree.root = reGeneratedViewTree;
        if (currentTreeRef.renderTree.root.kind === "real-element") {
          currentTreeRef.renderTree.root.computedViewTreeNodeId =
            reGeneratedViewTree?.id ?? null;
        }
      } else {
        parentNode.childNodes[index] = reGeneratedViewTree;
      }

      updateDom({
        newViewTree: reGeneratedViewTree,
        oldViewTree: previousViewTree,
        insertInfo: {
          kind: "child",
          previousViewTreeParent: clonedParentNode, // the root has no parent, so this is the only valid case, but may cause weird bugs if something was calculated weirdly
        },
      });
    },
  ] as const;
};

export const render = (
  rootElement: ReturnType<typeof createElement>,
  domEl: HTMLElement
) => {
  const { reactViewTree } = buildReactTrees(rootElement);
  updateDom({
    oldViewTree: null,
    newViewTree: reactViewTree.root,

    insertInfo: {
      kind: "root",
      root: domEl,
    },
  });
};
