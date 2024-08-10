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
  currentHookOrderInsideComponent: number;
  root: ReactRenderTreeNode;
};

type ReactRenderTreeNode = {
  id: string;
  childNodes: Array<ReactRenderTreeNode>;
  computedViewTreeNode: ReactViewTreeNode | null;
  internalMetadata: ReactComponentInternalMetadata;
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
    };
    currentTreeRef.renderTree = {
      currentHookOrderInsideComponent: 0,
      currentlyRendering: null,
      root: rootRenderNode,
    };
    return rootRenderNode;
  }
  const newRenderTreeNode: ReactRenderTreeNode = {
    id: crypto.randomUUID(),
    childNodes: [],
    computedViewTreeNode: null,
    internalMetadata: internalMetadata,
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
  const newNode: ReactViewTreeNode = {
    id: crypto.randomUUID(),
    metadata: renderTreeNode.internalMetadata, // now making a new div node
    childNodes: [],
  };

  // parentViewNode.childNodes.push(newNode);

  // const associatedRenderNodes = findAssociatedRenderNode(internalMetadata);
  renderTreeNode.computedViewTreeNode = newNode;
  // at first computes button and span

  // it should be appended to the new output of the function, not the parent
  // wait not even, it should just be passed we shouldn't be doing that
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

      const computedRenderTreeNode =
        renderTreeNode.internalMetadata.component.function({
          ...renderTreeNode.internalMetadata.props,
          ...childrenSpreadProps,
        }); // Component outputs a div

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

const buildReactTrees = (rootRenderTreeNode: ReactRenderTreeNode) => {
  const rootViewNode: ReactViewTreeNode = {
    id: crypto.randomUUID(),
    childNodes: [],
    metadata: rootRenderTreeNode.internalMetadata,
  };
  // const rootRenderNode: ReactRenderTreeNode = {
  //   id: crypto.randomUUID(),
  //   childNodes: [],
  //   computedViewTreeNode: null,
  //   internalMetadata: rootComponentMetadata,
  // };

  if (!currentTreeRef.renderTree) {
    throw new Error("Root node passed is not apart of any react render tree");
  }
  const reactViewTree: ReactViewTree = {
    root: rootViewNode,
  };

  // const reactRenderTree: ReactRenderTree = {
  //   currentHookOrderInsideComponent: 0,
  //   currentlyRendering: null,
  //   root: rootRenderNode,
  // };
  currentTreeRef.viewTree = reactViewTree;
  // currentTreeRef.renderTree = reactRenderTree;computedViewTreeNode

  const rootOfView = renderComponent({
    renderTreeNode: rootRenderTreeNode,
    parentViewNode: rootViewNode,
    // parentViewNode: rootNode,
  });

  currentTreeRef.viewTree.root = rootOfView;

  currentTreeRef.renderTree.currentlyRendering = null;
  // c.currentlyRendering = null;

  // console.log(JSON.stringify(currentTreeRef));
  console.log(JSON.stringify(deepTraverseAndModify(currentTreeRef.renderTree)));

  return {
    reactRenderTree: currentTreeRef.renderTree,
    reactViewTree: currentTreeRef.viewTree,
  };
};

const Bar = () => {
  return createElement("area", {}, createElement("bdo", {}));
};
const Foo = () => {
  const foo = createElement(
    "br",
    {},
    createElement("article", null),
    createElement(Bar, null)
  );
  return foo;
};

const Component = () => {
  // const [x, setX] = useState(2);
  return createElement(
    "div",
    {},
    createElement(Foo, null),
    createElement("button", {
      // innerText: x,
      // onClick: () => {
      //   setX(x + 1);
      // },
    }),
    createElement("span", null)
  );
};

const applyReactTreeToDom = (rootElement: ReturnType<typeof createElement>) => {
  const reactTree = buildReactTrees(rootElement);
};

applyReactTreeToDom(createElement(Component, null));
