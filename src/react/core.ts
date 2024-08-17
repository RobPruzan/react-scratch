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

// const getKey = (renderNode: RealElement) => {
//   return (
//     getComponentName(renderNode.internalMetadata) +
//     "-" +
//     renderNode.indexPath +
//     "-" +
//     renderNode.localRenderOrder
//   );
// };

const getComponentProps = (meta: ReactComponentInternalMetadata) => {
  if (meta.kind === "empty-slot") {
    return null;
  }
  return meta.props;
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
    a.forEach((leftNode, index) => {
      // const associatedRightNode = b.find((rightNode) =>
      //   Utils.deepEqual(
      //     getComponentProps(leftNode.metadata),
      //     getComponentProps(rightNode.metadata)
      //   )
      // );

      const associatedRightNode = b.at(index);

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
  if (viewNode.kind === "empty-slot") {
    return null;
  }
  if (viewNode.metadata.kind === "empty-slot") {
    return null;
  }
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
  // current status is i need to handle internal metadata maybe being an empty slot and just skipping
  // should be simple but I'm too tired for this
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
        // case "empty-slot": {
        //   // then nothing needs to be done, they both represent nothing
        //   console.log(
        //     "then nothing needs to be done, they both represent nothing"
        //   );
        //   return { lastUpdated: null };
        // }
        //
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
                  )
                ) {
                  return updateDom({
                    insertedBefore: lastUpdatedSibling,
                    lastParent: parentDomNode,
                    previousDomRef: oldViewTree.metadata.component.domRef,
                    props: newViewTree.metadata.props,
                    tagComponent: newViewTree.metadata.component,
                  });
                }
                newViewTree.metadata.component.domRef =
                  oldViewTree.metadata.component.domRef;
                return oldViewTree.metadata.component.domRef!;
              });
              // then there's an associated existing dom node and we just update its props
              // const lastUpdated = updateDom({
              //   insertedBefore: lastUpdatedSibling,
              //   lastParent: parentDomNode,
              //   previousDomRef: oldViewTree.metadata.component.domRef,
              //   props: newViewTree.metadata.props,
              //   tagComponent: newViewTree.metadata.component,
              // });

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
        // kind: "empty-slot" as const,
        kind: "empty-slot",
      };
      if (!child) {
        return slotNode;
      }

      if (child.kind === "empty-slot") {
        return slotNode;
      }
      // what do we put as child nodes?
      // does that make sense? need to reason about this at a high level, im sure i will make a mistake though
      // not a big deal

      // heres the idea, the child nodes here is what we actually map over to render
      // and we know once its turned into internal metadata the children are transformed to element nodes
      // a little weird, but it should be sound logic
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
// const getComponentName = (internalMetadata: ReactComponentInternalMetadata) =>
//   internalMetadata.component.kind === "function"
//     ? internalMetadata.component.function.name
//     : internalMetadata.component.tagName;

const getComponentName = (internalMetadata: ReactComponentInternalMetadata) =>
  Utils.run(() => {
    if (internalMetadata.kind === "empty-slot") {
      return "empty-slot";
    }
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
  // internalMetadata.

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
    const rightIndex = leftIndexPath[i];

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

    if (!compareIndexPaths(oldChildNode.indexPath, newChildNode.indexPath)) {
      reconciledChildNodes.push(newChildNode);
      return;
    }
    oldChildNode.internalMetadata = newChildNode.internalMetadata;
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
              // console.log("early return");
              return false;
            }
            if (node.internalMetadata.kind === "empty-slot") {
              // console.log("early return");
              return false;
            }

            return node.internalMetadata.id === internalMetadata.id;
          }, currentTreeRef.renderTree.root);

    if (existingNode) {
      return;
    }
    // console.log({ existingNode });
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
              // console.log("early return");
              return false;
            }
            if (node.internalMetadata.kind === "empty-slot") {
              // console.log("early return");
              return false;
            }
            return node.internalMetadata.id === child.id;
          }, currentTreeRef.renderTree.root);

          const parentRenderTreeNode = findRenderNodeOrThrow((node) => {
            if (node.kind === "empty-slot") {
              // console.log("early return");
              return false;
            }
            if (node.internalMetadata.kind === "empty-slot") {
              // console.log("early return");
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
          // const existingRenderTreeNode = Utils.run(() => {
          //   const aux = (
          //     viewNode: ReactRenderTreeNode
          //   ): ReactRenderTreeNode | undefined => {
          //     if (viewNode.kind === "empty-slot") {
          //       throw new Error(
          //         "Invariant Error: a root that is an empty slot can never have children in its tree"
          //       );
          //     }

          //     for (const node of viewNode.childNodes) {
          // if (node.kind === "empty-slot") {
          //   // console.log("early return");
          //   continue;
          // }
          // if (node.internalMetadata.kind === "empty-slot") {
          //   // console.log("early return");
          //   continue;
          // }
          //       // console.log("existing node", node.internalMetadata);
          //       if (node.internalMetadata.id === child.id) {
          //         return node;
          //       }

          //       const res = aux(node);

          //       if (res) {
          //         return res;
          //       }
          //     }
          //   };

          //   if (!currentTreeRef.renderTree?.root) {
          //     throw new Error(
          //       "Invariant Error: Cannot search for a node when the tree isn't initialized"
          //     );
          //   }
          //   if (
          //     currentTreeRef.renderTree?.root.kind === "real-element" &&
          //     currentTreeRef.renderTree.root.internalMetadata.kind ===
          //       "real-element" &&
          //     currentTreeRef.renderTree.root.internalMetadata.id === child.id
          //   ) {
          //     return currentTreeRef.renderTree.root;
          //   }

          //   const result = aux(currentTreeRef.renderTree.root);

          //   if (!result) {
          //     throw new Error("detached node or wrong id:" + "\n\n");
          //   }
          //   return result;
          // });
          // const existingRenderTreeNode = Utils.findNodeOrThrow<ReactRenderTreeNode>((node) => node.internalMetadata.id === child.id , currentTreeRef.renderTree.root)
          const reRenderChild = () => {
            // need to find the generated render node for that child
            // may need to call the child and then generate a render node for it here...
            // i think create if not exists is probably the right strategy...

            const viewNode = generateViewTreeHelper({
              renderNode: existingRenderTreeNode,
              startingFromRenderNodeId: startingFromRenderNodeId,
            });
            // if (!viewNode) {
            //   console.log("no view node");
            //   return {
            //     viewNode: {kind: 'empty-slot' as const, id: viewNod},
            //     renderNode: existingRenderTreeNode,
            //   };
            // }

            if (viewNode.kind === "empty-slot") {
              // if (!(existingRenderTreeNode.kind === "empty-slot")) {
              //   existingRenderTreeNode.computedViewTreeNodeId = viewNode.id;
              // }

              return {
                viewNode: viewNode,
                renderNode: existingRenderTreeNode,
              };
            }

            if (viewNode.childNodes.length > 1) {
              throw new Error(
                "Invariant error, should never have more than one child"
              );
            }
            return { viewNode, renderNode: existingRenderTreeNode };
          };

          // if (!child.computedViewTreeNodeId) {
          // }
          if (!currentTreeRef.viewTree) {
            return reRenderChild();
          }

          if (existingRenderTreeNode.kind === "empty-slot") {
            return {
              viewNode: { kind: "empty-slot", id: crypto.randomUUID() },
              renderNode: existingRenderTreeNode,
            };
          }
          // the problem is this is a new view node with no integrity compared to the old
          // throws here

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

          // console.log(
          //   "should re-render",
          //   shouldReRender,
          //   child.component,
          //   existingRenderTreeNode,
          //   parentRenderTreeNode,
          //   currentTreeRef.renderTree
          // );
          if (!shouldReRender) {
            // rahh why does it skip
            console.log("Skipping re-render of", getComponentName(child));
            // skip re-rendering if not a child in the render tree
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
      // currentTreeRef.renderTree.localComponentRenderMap = {};
      // currentTreeRef.renderTree.currentLocalComponentCreateElementCallTree = {
      //   childNodes: [],
      //   order: 0,
      // };
      // currentTreeRef.renderTree.currentLocalComponentCreateElementCallTree = {
      //   childNodes: [],
      //   order: 0,
      // };
      // currentTreeRef.renderTree.currentLastRenderChildNodes =
      //   internalMetadata.childNodes;
      // renderNode.childNodes = [];
      currentTreeRef.renderTree.currentlyRendering = renderNode;
      // currentTreeRef.renderTree.currentLocalBranchCount = 0;

      // this output is the root "render node" generated by createElement of the fn
      // the render tree is built out internally every time createElement is called

      // where do we fetch if exists to get the render node?
      console.log(
        "Rendering:",
        renderNode.internalMetadata.component.function.name
      );
      const outputInternalMetadata =
        renderNode.internalMetadata.component.function({
          ...renderNode.internalMetadata.props,
          ...childrenSpreadProps,
        });
      // do we want the root output by the internal metadata?

      //       const outputAssociatedRenderNode: ReactRenderTreeNode = renderNode.childNodes.find((prevChildNode) => {
      //         if (prevChildNode.kind === 'empty-slot') {
      //           return false
      //         }
      //         if (outputInternalMetadata.kind === 'empty-slot') {
      //   return false
      // }

      // return compareIndexPaths(prevChildNode, outputInternalMetadata)
      // })

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
        // console.log(node);
      }) ?? { kind: "empty-slot" };

      renderNode.childNodes = reconciledRenderChildNodes;

      renderNode.hasRendered = true;
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

      // currentTreeRef.renderTree.currentLastRenderChildNodes = [];

      // why did i think passing the same render node every time would work?

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
  // if (!currentTreeRef.renderTree) {
  //   throw new Error("Root node passed is not apart of any react render tree");
  // }

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
          indexPath: [], // I don't think this really matters since it has no parent, and this is only relevant for the parent
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

      if (parentNode.kind === "empty-slot") {
        throw new Error(
          "Invariant Error: An empty slot cannot have any children"
        );
      }

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

      const previousViewTree =
        clonedParentNode?.childNodes.find(
          (node) =>
            node.id ===
            capturedCurrentlyRenderingRenderNode.computedViewTreeNodeId
        ) ?? currentTreeRef.viewTree.root;

      // if (!previousViewTree) {
      //   console.log(parentNode);
      //   throw new Error(
      //     "Invariant: Parent was found using child, so must be a child of parent"
      //   );
      // }

      // const previousEntireViewTree =

      const reGeneratedViewTree = generateViewTree({
        renderNode: capturedCurrentlyRenderingRenderNode,
      });

      // console.log("the regenerated view tree", reGeneratedViewTree);

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
