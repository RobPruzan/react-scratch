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
} from "./types";

const getKey = (renderNode: RealElement) => {
  return (
    getComponentName(renderNode.internalMetadata) +
    "-" +
    renderNode.localBranchCount +
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

  let definedAssociation = Object.entries(leftToRight)
    .map(([left, right]) => ({
      left: leftNodes.find((ln) => ln.id === left),
      right,
    }))
    .filter(({ left, right }) => left && right)
    .map(({ left, right }) => ({ left: left!, right: right! }));

  return [leftToRight, rightToLeft, definedAssociation] as const;
};

// const updateDom = ({
//   props,
//   tagComponent,
//   previousDomRef,
//   lastParent,
//   insertedBefore,
// }: {
//   tagComponent: TagComponent;
//   previousDomRef: HTMLElement | null;
//   props: AnyProps;
//   lastParent: HTMLElement;
//   insertedBefore: HTMLElement | null;
// }) => {
//   if (previousDomRef) {
//     Object.assign(previousDomRef, props);
//     tagComponent.domRef = previousDomRef;
//     return previousDomRef;
//   }
//   const newEl = document.createElement(tagComponent.tagName);
//   Object.assign(newEl, props);

//   if (insertedBefore) {
//     // will append if 2nd arg is null
//     lastParent.insertBefore(newEl, insertedBefore.nextSibling);
//     tagComponent.domRef = newEl;

//     return newEl;
//   }
//   lastParent.appendChild(newEl);

//   tagComponent.domRef = newEl;

//   return newEl;
// };

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
  if (previousDomRef) {
    Object.assign(previousDomRef, props);
    tagComponent.domRef = previousDomRef;
    return previousDomRef;
  }
  const newEl = document.createElement(tagComponent.tagName);
  // tagComponent.domRef = newEl;
  console.log("asdf", props, tagComponent);
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
  lastParent.appendChild(newEl);

  tagComponent.domRef = newEl;

  return newEl;
};

const findFirstTagNode = (viewNode: ReactViewTreeNode) => {
  switch (viewNode.metadata.component.kind) {
    // case "empty-slot": {
    //   return null;
    // }
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
  // if (viewNode.metadata.component.kind === "tag") {
  //   return {
  //     component: viewNode.metadata.component,
  //     node: viewNode,
  //   };
  // }
  // if (viewNode.metadata.component.kind === 'empty-slot') {

  // }
  // // either returns or the program crashes (:shrug)
  // return findFirstTagNode(viewNode.childNodes[0]); // traverse directly down since a functional component will only have one child, should discriminately union this...
};

// const reconcileDom = ({
//   newViewTree,
//   oldViewTree,
//   startingDomNode,
// }: {
//   oldViewTree: ReactViewTreeNode | null;
//   newViewTree: ReactViewTreeNode;
//   startingDomNode: HTMLElement;
// }) => {
//   const aux = ({
//     localNewViewTree,
//     localOldViewTree,
//     lastParent,
//     localInsertedBefore,
//   }: {
//     localOldViewTree: ReactViewTreeNode | null;
//     localNewViewTree: ReactViewTreeNode;
//     lastParent: HTMLElement;
//     localInsertedBefore: HTMLElement | null;
//   }): { updatedOrAppendedDomElement: HTMLElement } => {
//     // reconciles the parent then moves to children
//     const reconcileTags = ({
//       newNode,
//       oldNode,
//     }: {
//       oldNode: ReturnType<typeof findFirstTagNode>;
//       newNode: ReturnType<typeof findFirstTagNode>;
//     }): { updatedOrAppendedDomElement: HTMLElement } => {
//       if (
//         Utils.deepEqual(
//           oldNode.node.metadata.props,
//           newNode.node.metadata.props
//         )
//       ) {
//         if (!oldNode.component.domRef) {
//           throw new Error(
//             "Invariant error, already rendered tree must have dom nodes for every view node"
//           );
//         }
//         newNode.component.domRef = oldNode.component.domRef;
//         // i think its a flaw in the logic we handle this takedown twice
//         // but what can u do this has to handle this base case or it will reconcile forever
//         // just because how aux is structured...
//         if (newNode.node.childNodes.length === 0) {
//           oldNode.node.childNodes.forEach((childNode) => {
//             const tag = findFirstTagNode(childNode);
//             tag.component.domRef?.parentElement?.removeChild(
//               tag.component.domRef
//             );
//             return newNode.component.domRef;
//           });
//         }
//         aux({
//           localNewViewTree: newNode.node,
//           localOldViewTree: oldNode.node,
//           lastParent: newNode.component.domRef!, // maybe this breaks stuff?
//           localInsertedBefore: localInsertedBefore,
//         });
//         return { updatedOrAppendedDomElement: newNode.component.domRef };
//       } else {
//         const newEl = updateDom({
//           lastParent,
//           previousDomRef: oldNode.component.domRef,
//           props: newNode.node.metadata.props,
//           tagComponent: newNode.component,
//           insertedBefore: localInsertedBefore,
//         });
//         if (newNode.node.childNodes.length === 0) {
//           oldNode.node.childNodes.forEach((childNode) => {
//             const tag = findFirstTagNode(childNode);
//             tag.component.domRef?.parentElement?.removeChild(
//               tag.component.domRef
//             );
//             return newEl;
//           });
//         }
//         aux({
//           localNewViewTree: newNode.node, // a function should only ever one child. If it returns a null it should never be rendered in the first place
//           localOldViewTree: oldNode.node, // very naive check, but it will fail quickly once they start comparing tags
//           lastParent: newEl,
//           localInsertedBefore: localInsertedBefore, // how do u know??
//         });
//         return { updatedOrAppendedDomElement: newEl };
//       }
//     };
//     switch (localNewViewTree.metadata.component.kind) {
//       case "function": {
//         const oldNode = localOldViewTree
//           ? findFirstTagNode(localOldViewTree)
//           : null;
//         const newNode = findFirstTagNode(localNewViewTree);
//         if (!oldNode) {
//           return aux({
//             localNewViewTree: newNode.node,
//             localOldViewTree: null,
//             lastParent,
//             localInsertedBefore: localInsertedBefore,
//           });
//         }

//         return reconcileTags({ newNode, oldNode });
//       }

//       case "tag": {
//         if (!localOldViewTree) {
//           const newEl = updateDom({
//             lastParent,
//             tagComponent: localNewViewTree.metadata.component,
//             previousDomRef: null,
//             props: localNewViewTree.metadata.props,
//             insertedBefore: localInsertedBefore,
//           });
//           let lastInserted: HTMLElement = newEl;
//           for (
//             let index = 0;
//             index < localNewViewTree.childNodes.length;
//             index++
//           ) {
//             const childNode = localNewViewTree.childNodes[index];
//             const insertBeforeViewNode = localNewViewTree.childNodes.at(
//               index - 1
//             );
//             lastInserted = aux({
//               localNewViewTree: findFirstTagNode(childNode).node,
//               localOldViewTree: null,
//               lastParent: newEl,
//               localInsertedBefore: insertBeforeViewNode
//                 ? findFirstTagNode(insertBeforeViewNode).component.domRef
//                 : null,
//             }).updatedOrAppendedDomElement;
//           }

//           return { updatedOrAppendedDomElement: lastInserted };
//         }
//         const [oldToNew, newToOld] = mapChildNodes({
//           leftNodes: localOldViewTree.childNodes,
//           rightNodes: localNewViewTree.childNodes,
//         });

//         // to remove
// localOldViewTree.childNodes.forEach((oldNode) => {
//   const associatedWith = oldToNew[oldNode.id];

//   if (!associatedWith) {
//     const tag = findFirstTagNode(oldNode);
//     tag.component.domRef?.parentElement?.removeChild(
//       tag.component.domRef
//     );
//     return;
//   }
// });
//         let lastInserted: HTMLElement;
//         // to add
//         localNewViewTree.childNodes.forEach((newNode) => {
//           const associatedWith = newToOld[newNode.id];
//           if (!associatedWith) {
//             const output = aux({
//               lastParent,
//               localNewViewTree: findFirstTagNode(newNode).node,
//               localOldViewTree: null,
//               localInsertedBefore: lastInserted,
//             });
//             lastInserted = output.updatedOrAppendedDomElement;
//             return;
//           }
//           switch (newNode.metadata.component.kind) {
//             case "function": {
//               const output = aux({
//                 lastParent,
//                 localNewViewTree: findFirstTagNode(newNode).node,
//                 localOldViewTree: findFirstTagNode(associatedWith).node,
//                 localInsertedBefore: lastInserted,
//               });
//               lastInserted = output.updatedOrAppendedDomElement;
//               return;
//             }

//             case "tag": {
//               if (!(associatedWith.metadata.component.kind === "tag")) {
//                 throw new Error(
//                   "Invariant error, this comparison should never happen"
//                 );
//               }

//               const existingDomRef = associatedWith.metadata.component.domRef;
//               if (!existingDomRef) {
//                 throw new Error(
//                   "Invariant error, never should have an old view tree that doesn't have a created dom node"
//                 );
//               }
//               if (
//                 Utils.deepEqual(
//                   newNode.metadata.props,
//                   associatedWith.metadata.props
//                 )
//               ) {
//                 newNode.metadata.component.domRef = existingDomRef;
//                 const output = aux({
//                   lastParent: existingDomRef,
//                   localNewViewTree: newNode,
//                   localOldViewTree: associatedWith,
//                   localInsertedBefore: lastInserted,
//                 });
//                 lastInserted = output.updatedOrAppendedDomElement;
//                 return;
//               }
//               const newEl = updateDom({
//                 lastParent,
//                 props: newNode.metadata.props,
//                 tagComponent: newNode.metadata.component,
//                 previousDomRef: existingDomRef,
//                 insertedBefore: lastInserted,
//               });

//               aux({
//                 lastParent: newEl,
//                 localNewViewTree: newNode,
//                 localOldViewTree: associatedWith,
//                 localInsertedBefore: lastInserted, // no way to know yet
//               });
//               lastInserted = newEl;
//               return;
//             }
//           }
//         });
//         let ref = findFirstTagNode(localNewViewTree).component.domRef;
//         if (ref) {
//           return {
//             updatedOrAppendedDomElement: ref,
//           };
//         }
//         /**
//          * Case has no child nodes
//          * Has an old node to comp against
//          * Should deep equal them + update dom accordingly
//          *
//          * Note: not tested
//          */
//         const firstOldTag = findFirstTagNode(localOldViewTree);
//         return reconcileTags({
//           newNode: {
//             component: localNewViewTree.metadata.component,
//             node: localNewViewTree,
//           },
//           oldNode: firstOldTag,
//         });
//       }
//     }
//   };

//   return aux({
//     lastParent: startingDomNode,
//     localNewViewTree: newViewTree,
//     localOldViewTree: oldViewTree,
//     localInsertedBefore: null,
//   });
// };

const reconcileDom = (args: {
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
    // console.log("running");
    let x = 2;
    if (!newViewTree) {
      if (!oldViewTree) {
        // then there's nothing to do
        console.log("then theres nothing to do");
        return { lastUpdated: null };
      }
      // then we have to delete the old view tree node
      const tagNode = findFirstTagNode(oldViewTree);
      if (!tagNode) {
        // nothing to delete, its an empty slot
        console.log("nothing to delete, its an empty slot");
        return { lastUpdated: null };
      }
      tagNode.component.domRef?.parentElement?.removeChild(
        tagNode.component.domRef
      );
      console.log("removed something, didnt make anything");
      return { lastUpdated: null };
    }
    if (!oldViewTree) {
      // add case
      switch (newViewTree.metadata.component.kind) {
        // case "empty-slot": {
        //   // then nothing needs to be done, they both represent nothing
        //   console.log(
        //     "then nothing needs to be done, they both represent nothing"
        //   );
        //   return { lastUpdated: null };
        // }
        case "function": {
          // some fuck up
          const auxResult = aux({
            lastUpdatedSibling: lastUpdatedSibling,
            newViewTree: findFirstTagNode(newViewTree)?.viewNode ?? null,
            oldViewTree: null,
            parentDomNode: parentDomNode,
          });
          // take the aux result as it represents the dom node to be placed before the next sibling
          // the caller has to be responsible for not losing the original lastUpdated ref
          console.log(
            "pass forward on empty old view tree but functional new view tree"
          );
          return { lastUpdated: auxResult.lastUpdated };
        }

        case "tag": {
          // then we can trivially add a node to the dom before the last updated sibling (it must be a sibling)
          const updatedElement = updateDom({
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

          // aux({

          // })
          console.log("trivially add");
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
        console.log("another forward");
        return {
          lastUpdated: auxResult.lastUpdated,
        };
      }
      // case "empty-slot": {
      //   // then we let the recursive call handle the delete
      //   aux({
      //     lastUpdatedSibling: lastUpdatedSibling,
      //     newViewTree: null,
      //     oldViewTree: findFirstTagNode(oldViewTree)?.viewNode ?? null,
      //     parentDomNode,
      //   });
      //   console.log("trivial empty slot delete");
      //   return { lastUpdated: null };
      // }
      case "tag":
        {
          switch (oldViewTree.metadata.component.kind) {
            // case "empty-slot": {
            //   // then we can add this safely before the previous sibling
            //   const lastUpdated = updateDom({
            //     insertedBefore: lastUpdatedSibling,
            //     lastParent: parentDomNode,
            //     previousDomRef: null,
            //     props: newViewTree.metadata.props,
            //     tagComponent: newViewTree.metadata.component,
            //   });
            //   console.log("safely add this before previous");
            //   return { lastUpdated };
            // }
            case "function": {
              // re-apply the function with the next child of the function
              const auxResult = aux({
                lastUpdatedSibling: lastUpdatedSibling,
                newViewTree: newViewTree,
                oldViewTree: oldViewTree.childNodes[0], // will always have one child
                parentDomNode: parentDomNode,
              });
              console.log("re-apply time");
              return { lastUpdated: auxResult.lastUpdated };
            }

            case "tag": {
              // then there's an associated existing dom node and we just update its props
              const lastUpdated = updateDom({
                insertedBefore: lastUpdatedSibling,
                lastParent: parentDomNode,
                previousDomRef: oldViewTree.metadata.component.domRef,
                props: newViewTree.metadata.props,
                tagComponent: newViewTree.metadata.component,
              });

              // now we recursively apply aux to the children nodes
              const [oldToNew, newToOld, definedAssociation] = mapChildNodes({
                leftNodes: oldViewTree.childNodes,
                rightNodes: newViewTree.childNodes,
              });

              let trackedLastUpdatedSibling: HTMLElement | null = null;

              // handles deleting any extra nodes from the previous tree not associated with a new view tree node
              oldViewTree.childNodes.forEach((oldNode) => {
                const associatedWith = oldToNew[oldNode.id];

                if (!associatedWith) {
                  // we don't care about the return result since it wont update or add anything
                  aux({
                    parentDomNode: lastUpdated,
                    lastUpdatedSibling: trackedLastUpdatedSibling,
                    newViewTree: null,
                    oldViewTree: oldNode,
                  });
                  // trackedLastUpdatedChild = auxResult.lastUpdated;
                }
              });
              // handles adding any extra nodes that appeared in the new view tree
              newViewTree.childNodes.forEach((newNode) => {
                const associatedWith = newToOld[newNode.id];

                if (!associatedWith) {
                  // we do care about the return result since it may add to the dom
                  const auxResult = aux({
                    lastUpdatedSibling: trackedLastUpdatedSibling,
                    newViewTree: newNode,
                    oldViewTree: null,
                    parentDomNode: lastUpdated,
                  });
                  // incase it didn't add anything (e.g. the new node was a slot), we want to not destroy the last sibling
                  trackedLastUpdatedSibling =
                    auxResult.lastUpdated ?? trackedLastUpdatedSibling;
                }
              });

              definedAssociation.forEach(
                ({ left: oldChildNode, right: newChildNode }) => {
                  const auxResult = aux({
                    lastUpdatedSibling: trackedLastUpdatedSibling,
                    newViewTree: newChildNode,
                    oldViewTree: oldChildNode,
                    parentDomNode: lastUpdated,
                  });
                  // same reasoning when updating trackedLastUpdatedSibling in the add loop
                  trackedLastUpdatedSibling =
                    auxResult.lastUpdated ?? trackedLastUpdatedSibling;
                }
              );
              console.log("a lot of work finally done");
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
      console.log("running on root");
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
          args.insertInfo.previousViewTreeParent?.childNodes.reduce<null | ReactViewTreeNode>(
            (prev, _, index) => {
              if (!(args.insertInfo.kind === "child")) {
                throw new Error(
                  "No longer a non escaping closure, unsafe access"
                );
              }
              const nextSibling =
                args.insertInfo.previousViewTreeParent.childNodes.at(index + 1);
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
        console.log(
          "my tag node",
          args.insertInfo.previousViewTreeParent,
          parentTagNode
        );
        if (!parentTagNode) {
          throw new Error(
            "Invariant Error: A parent node could not have been an empty slot since we know it has view node children"
          );
        }
        console.log(parentTagNode);
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
  id: crypto.randomUUID(),
});

const toChild = (
  child:
    | ReactComponentExternalMetadata<AnyProps>["children"][number]
    | null
    | false
): child is ReactComponentExternalMetadata<AnyProps>["children"][number] =>
  Boolean(child);
// const getComponentName = (internalMetadata: ReactComponentInternalMetadata) =>
//   internalMetadata.component.kind === "function"
//     ? internalMetadata.component.function.name
//     : internalMetadata.component.tagName;

const getComponentName = (internalMetadata: ReactComponentInternalMetadata) =>
  Utils.run(() => {
    switch (internalMetadata.component.kind) {
      // case "empty-slot": {
      //   return "empty-slot";
      // }
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
  JSON.stringify(internalMetadata.props);

export const createElement = <T extends AnyProps>(
  component: ReactComponentExternalMetadata<T>["component"],
  props: T,
  ...children: Array<null | false | ReactRenderTreeNode>
): ReactRenderTreeNode => {
  if (currentTreeRef.renderTree?.currentlyRendering?.kind === "empty-slot") {
    throw new Error("Invariant Error: Cannot render an empty slot node");
  }
  const childrenWithoutFalsy = children.map((child) =>
    !child ? { kind: "empty-slot" as const } : child
  );
  const internalMetadata = mapExternalMetadataToInternalMetadata({
    internalMetadata: {
      children: childrenWithoutFalsy,
      component,
      props,
    },
  });

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
      kind: "real-element",
      localBranchCount: 0,
    };
    currentTreeRef.renderTree = {
      currentLocalCurrentHookOrder: 0,
      currentlyRendering: null,
      root: rootRenderNode,
      currentLocalComponentCreateElementCallTree: {
        order: 0,
        childNodes: [],
      },
      currentLastRenderChildNodes: [],
      currentLocalRenderNodeStack: [],
      currentLocalBranchCount: 0,
    };
    return rootRenderNode;
  }
  currentTreeRef.renderTree.currentLocalBranchCount += 1;

  const areStackChildrenCurrentElementChildren = Utils.run(() => {
    for (const stackNode of currentTreeRef.renderTree!
      .currentLocalRenderNodeStack) {
      for (const child of childrenWithoutFalsy) {
        if (stackNode.kind === "empty-slot") {
          continue;
        }

        if (child.kind === "empty-slot") {
          continue;
        }

        if (stackNode.id === child.id) {
          return true;
        }
      }
    }
    return false;
  });
  if (areStackChildrenCurrentElementChildren) {
    // then we re-start the accumulation because this element is the parent
    currentTreeRef.renderTree.currentLocalRenderNodeStack = [];
  }

  const existingNode =
    currentTreeRef.renderTree.currentLastRenderChildNodes.find(
      (lastRenderNode) => {
        if (lastRenderNode.kind === "empty-slot") {
          return;
        }

        if (
          lastRenderNode.localRenderOrder ===
            currentTreeRef.renderTree?.currentLocalRenderNodeStack.length &&
          lastRenderNode.localBranchCount ===
            currentTreeRef.renderTree.currentLocalBranchCount
        ) {
          return lastRenderNode;
        }
      }
    );
  if (existingNode?.kind === "empty-slot") {
    throw new Error(
      "Invariant Error: the find cb will never return an empty slot"
    );
  }

  // maybe i just need a branch number and order in that? But surely not... Actually yeah that probably works, the branch will be unique among all
  // and will be constant no matter how chaotic
  // then we can compare that branch (by branch i mean an instance of the stack) and the order inside that stack
  // then it should work beautifully

  // const newLocalRenderOrder =
  //   (currentTreeRef.renderTree.localComponentRenderMap[
  //     getComponentName(internalMetadata)
  //   ] ?? 0) + 1;

  // currentTreeRef.renderTree.localComponentRenderMap[
  //   getComponentName(internalMetadata)
  // ] = newLocalRenderOrder;
  // const existingNode = currentTreeRef.renderTree.lastRenderChildNodes.find(
  //   (childNode) => {
  //     const name = getComponentName(childNode.internalMetadata);

  //     if (
  //       name === getComponentName(internalMetadata) &&
  //       childNode.localRenderOrder === newLocalRenderOrder
  //     ) {
  //       return true;
  //     }
  //   }
  // );

  // order doesn't matter, but doesn't hurt to maintain it for the future incase we do care
  if (existingNode) {
    existingNode.internalMetadata = internalMetadata;
    if (children.length === 0) {
      // if its a leaf node append to the end (guaranteed order is right)
      currentTreeRef.renderTree.currentlyRendering.childNodes.push(
        existingNode
      );
      return existingNode;
    }
    // else prepend since this is the new root for all the children just appended (must execute before since they are arguments)
    currentTreeRef.renderTree.currentlyRendering.childNodes.unshift(
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
    localRenderOrder:
      currentTreeRef.renderTree.currentLocalRenderNodeStack.length,
    kind: "real-element",
    localBranchCount: currentTreeRef.renderTree.currentLocalBranchCount,
    hasRendered: false,
  };
  if (children.length === 0) {
    currentTreeRef.renderTree.currentlyRendering.childNodes.push(
      newRenderTreeNode
    );
    return newRenderTreeNode;
  }
  currentTreeRef.renderTree.currentlyRendering.childNodes.unshift(
    newRenderTreeNode
  );
  return newRenderTreeNode;
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
}): ReturnType<typeof generateViewTreeHelper> | null => {
  if (renderTreeNode.kind === "empty-slot") {
    return null;
  }
  return generateViewTreeHelper({
    renderTreeNode,
    startingFromRenderNodeId: renderTreeNode.id,
  });
};

const generateViewTreeHelper = ({
  renderTreeNode,
  startingFromRenderNodeId,
}: {
  renderTreeNode: ReactRenderTreeNode;
  startingFromRenderNodeId: string;
}): ReactViewTreeNode | null => {
  if (!currentTreeRef.renderTree) {
    throw new Error("Cannot render component outside of react tree");
  }

  // console.log(
  //   "bytes of render tree",
  //   calculateJsonBytes(JSON.stringify(currentTreeRef.renderTree))
  // );

  if (renderTreeNode.kind === "empty-slot") {
    return null;
  }

  const newNode: ReactViewTreeNode = {
    id: crypto.randomUUID(),
    metadata: renderTreeNode.internalMetadata,
    childNodes: [],
    key: getKey(renderTreeNode),
  };

  renderTreeNode.computedViewTreeNodeId = newNode.id;

  switch (renderTreeNode.internalMetadata.component.kind) {
    case "tag": {
      const fullyComputedChildren =
        renderTreeNode.internalMetadata.children.map(
          (
            child
          ): {
            viewNode: ReactViewTreeNode | null;
            renderNode: ReactRenderTreeNode;
          } => {
            if (child.kind === "empty-slot") {
              return {
                renderNode: { kind: "empty-slot" },
                viewNode: null,
              };
            }
            const reRenderChild = () => {
              const viewNode = generateViewTreeHelper({
                renderTreeNode: child,
                startingFromRenderNodeId,
              });
              if (!viewNode) {
                return {
                  viewNode: null,
                  renderNode: child,
                };
              }

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

            const computedNode = currentTreeRef.viewTree.root
              ? Utils.findNode(
                  (node) => node.id === child.computedViewTreeNodeId,
                  currentTreeRef.viewTree.root
                )
              : null;
            if (!computedNode) {
              return reRenderChild();
            }
            const shouldReRender = isChildOf({
              potentialChildId: child.id,
              potentialParentId: startingFromRenderNodeId,
            });
            // const parentRenderNode = findNodeOrThrow(
            //   (node) => node.id === startingFromRenderNodeId,
            //   currentTreeRef.renderTree?.root!
            // );

            if (!shouldReRender) {
              // skip re-rendering if not a child in the render tree
              return { viewNode: computedNode, renderNode: child };
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
        renderTreeNode.internalMetadata.children.length > 0
          ? {
              children: renderTreeNode.internalMetadata.children,
            }
          : false;
      currentTreeRef.renderTree.currentLocalCurrentHookOrder = 0;
      // currentTreeRef.renderTree.localComponentRenderMap = {};
      currentTreeRef.renderTree.currentLocalComponentCreateElementCallTree = {
        childNodes: [],
        order: 0,
      };
      currentTreeRef.renderTree.currentLocalComponentCreateElementCallTree = {
        childNodes: [],
        order: 0,
      };
      currentTreeRef.renderTree.currentLastRenderChildNodes =
        renderTreeNode.childNodes;
      renderTreeNode.childNodes = [];
      currentTreeRef.renderTree.currentlyRendering = renderTreeNode;

      // this output is the root "render node" generated by createElement of the fn
      // the render tree is built out internally every time createElement is called
      const computedRenderTreeNode =
        renderTreeNode.internalMetadata.component.function({
          ...renderTreeNode.internalMetadata.props,
          ...childrenSpreadProps,
        });
      renderTreeNode.hasRendered = true;
      // NOTE: Below is untested, but should be close to working considering state correctly persists/ is taken down
      // const newRenderNodes = renderTreeNode.childNodes
      //   .filter(
      //     (node) =>
      //       !currentTreeRef.renderTree!.currentLastRenderChildNodes.some(
      //         (prevNode) => getKey(prevNode) === getKey(node)
      //       )
      //   )
      //   .forEach((node) => {
      //     // console.log(
      //     //   "added to render tree:",
      //     //   node,
      //     //   // renderTreeNode.childNodes.at(-1),
      //     //   "new",
      //     //   renderTreeNode.childNodes.map(getKey),
      //     //   renderTreeNode.childNodes,
      //     //   "old",
      //     //   currentTreeRef.renderTree!.lastRenderChildNodes.map(getKey),
      //     //   currentTreeRef.renderTree!.lastRenderChildNodes
      //     // );
      //     // future mounting logic;
      //   });
      // const removedRenderNodes =
      //   currentTreeRef.renderTree.currentLastRenderChildNodes
      //     .filter(
      //       (node) =>
      //         !renderTreeNode.childNodes.some(
      //           (newNode) => getKey(newNode) === getKey(node)
      //         )
      //     )
      //     .forEach((node) => {
      //       // console.log("removed from render tree", node);
      //     });

      currentTreeRef.renderTree.currentLastRenderChildNodes = [];
      const viewNode = generateViewTreeHelper({
        renderTreeNode: computedRenderTreeNode,
        startingFromRenderNodeId: renderTreeNode.id,
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

export const buildReactTrees = (rootRenderTreeNode: ReactRenderTreeNode) => {
  if (!currentTreeRef.renderTree) {
    throw new Error("Root node passed is not apart of any react render tree");
  }

  console.log("\n\nRENDER START----------------------------------------------");
  const output = generateViewTree({
    renderTreeNode: rootRenderTreeNode,
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
  // const hasNode = findNode(
  //   (node) => node.id === capturedCurrentlyRenderingRenderNode.id,
  //   currentTreeRef.renderTree.root
  // );

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

      const clonedParentNode = Utils.deepCloneTree(parentNode);
      console.log(
        "\n\nRENDER START----------------------------------------------"
      );

      // const previousViewTreeParent = Utils.deepCloneTree(
      //   Utils.findParentNode(
      //     (node) => node.id === capturedCurrentlyRenderingRenderNode.id,
      //     currentTreeRef.viewTree.root
      //   )
      // );

      // if (!prev)

      // const previousViewTree = Utils.deepCloneTree(
      //   Utils.findNodeOrThrow(
      //     (node) =>
      //       node.id ===
      //       capturedCurrentlyRenderingRenderNode.computedViewTreeNodeId,
      //     currentTreeRef.viewTree.root
      //   )
      // );

      const previousViewTree = clonedParentNode?.childNodes.find(
        (node) =>
          node.id ===
          capturedCurrentlyRenderingRenderNode.computedViewTreeNodeId
      );

      console.log(JSON.stringify(previousViewTree));
      console.log("\n\n\n");
      console.log(JSON.stringify(clonedParentNode));
      if (!previousViewTree) {
        console.log(parentNode);
        throw new Error(
          "Invariant: Parent was found using child, so must be a child of parent"
        );
      }

      // const previousEntireViewTree =

      const reGeneratedViewTree = generateViewTree({
        renderTreeNode: capturedCurrentlyRenderingRenderNode,
      });
      // console.log("the regenerated view tree", reGeneratedViewTree);

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
        if (
          currentTreeRef.renderTree.root.kind === "empty-slot" &&
          reGeneratedViewTree
        ) {
          throw new Error(
            "Invariant Error: This implies an empty slot generated a not null view tree"
          );
        }
        currentTreeRef.viewTree.root = reGeneratedViewTree;
        if (currentTreeRef.renderTree.root.kind === "real-element") {
          currentTreeRef.renderTree.root.computedViewTreeNodeId =
            reGeneratedViewTree?.id ?? null;
        }
      } else {
        if (!reGeneratedViewTree) {
          parentNode.childNodes.splice(index, 1);
        } else {
          parentNode.childNodes[index] = reGeneratedViewTree;
        }
      }
      // const parentOfPreviousViewTree = Utils.findParentNode(
      //   (node) => node.id === previousViewTree.id,
      //   currentTreeRef.viewTree.root
      // );
      // const previousChild =
      //   parentOfPreviousViewTree?.childNodes.reduce<null | ReactViewTreeNode>(
      //     (prev, curr, index) => {
      //       const nextSibling = parentOfPreviousViewTree.childNodes.at(
      //         index + 1
      //       );
      //       if (nextSibling) {
      //         return nextSibling;
      //       }
      //       return prev;
      //     },
      //     null
      //   );
      reconcileDom({
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
  console.log("last v");
  const { reactViewTree } = buildReactTrees(rootElement);

  reconcileDom({
    oldViewTree: null,
    newViewTree: reactViewTree.root,
    // startingDomNode: domEl,
    insertInfo: {
      kind: "root",
      root: domEl,
    },
  });
};
