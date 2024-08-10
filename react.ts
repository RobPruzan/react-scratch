type AnyProps = Record<string, unknown> | null;
const run = <T>(f: () => T) => f();

type ReactComponentFunction<T extends AnyProps> = (
  props: AnyProps
) => ReactComponentInternalMetadata;

type ReactComponentExternalMetadata<T extends AnyProps> = {
  component: keyof HTMLElementTagNameMap | ReactComponentFunction<T>;
  props: T;
  children: Array<ReactComponentInternalMetadata>;
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
  children: Array<ReactComponentInternalMetadata>;
  hooks: Array<ReactHookMetadata>;
  id: string;
};

type ReactTreeNode = {
  id: string;
  childNodes: Array<ReactTreeNode>;
  metadata: ReactComponentInternalMetadata;
};

type ReactTree = {
  root: ReactTreeNode;
  currentlyRendering: ReactComponentInternalMetadata | null;
  currentHookOrderInsideComponent: number;
  // would hold component being rendered, current hook being called, info for the hooks basically, but don't need this yet
};

const mapComponentToTaggedUnion = (
  component: ReactComponentExternalMetadata<AnyProps>["component"]
): ReactComponentInternalMetadata["component"] =>
  typeof component === "string"
    ? { kind: "tag", tagName: component }
    : { kind: "function", function: component, name: component.name };

const mapExternalMetadataToInternalMetadata = (
  internalMetadata: ReactComponentExternalMetadata<AnyProps>
): ReactComponentInternalMetadata => ({
  component: mapComponentToTaggedUnion(internalMetadata.component),
  children: internalMetadata.children,
  props: internalMetadata.props,
  hooks: [],
  id: crypto.randomUUID(),
});

const createElement = <T extends AnyProps>(
  component: ReactComponentExternalMetadata<T>["component"],
  props: ReactComponentExternalMetadata<T>["props"],
  ...children: ReactComponentExternalMetadata<T>["children"]
): ReactComponentInternalMetadata =>
  mapExternalMetadataToInternalMetadata({
    children,
    component,
    props,
  });

const makeTagNode = (
  tagName: keyof HTMLElementTagNameMap,
  id: string
): ReactTreeNode => ({
  id: crypto.randomUUID(),
  childNodes: [],
  metadata: {
    component: {
      kind: "tag",
      tagName,
    },
    children: [],
    props: {},
    hooks: [],
    id,
  },
});

const renderComponent = ({
  internalMetadata,
  parentNode,
}: {
  parentNode: ReactTreeNode;
  internalMetadata: ReactComponentInternalMetadata;
}): ReactTreeNode => {
  if (!currentTreeRef.tree) {
    throw new Error("Cannot render component outside of react tree");
  }
  currentTreeRef.tree.currentlyRendering = internalMetadata;

  const newNode: ReactTreeNode = {
    id: crypto.randomUUID(),
    metadata: internalMetadata,
    childNodes: [],
  };
  const existingMetadataNode = parentNode.childNodes.find(
    ({ metadata }) => metadata.id === internalMetadata.id
  );

  if (existingMetadataNode) {
    existingMetadataNode.metadata = internalMetadata; // update the existing metadata to the latest as it used the updated state value to generate it
  } else {
    parentNode.childNodes.push(newNode);
  }
  switch (internalMetadata.component.kind) {
    case "tag": {
      break;
    }
    case "function": {
      const childMetadata = internalMetadata.component.function(
        internalMetadata.props
      );

      renderComponent({
        internalMetadata: childMetadata,
        parentNode: newNode,
      });
      break;
    }
  }

  // then render the children as siblings...
  internalMetadata.children.forEach((childMetadata) => {
    renderComponent({
      internalMetadata: childMetadata,
      parentNode: newNode,
    });
  });

  return newNode;
};
let currentTreeRef: { tree: ReactTree | null; firstRender: boolean } = {
  firstRender: true,
  tree: null,
};
const buildReactTree = (
  rootComponentMetadata: ReactComponentInternalMetadata
): ReactTree => {
  const rootNode: ReactTreeNode = {
    id: crypto.randomUUID(),
    childNodes: [],
    metadata: rootComponentMetadata,
  };
  const reactTree: ReactTree = {
    root: rootNode,
    currentlyRendering: null,
    currentHookOrderInsideComponent: 0,
  };
  currentTreeRef.tree = reactTree;

  renderComponent({
    internalMetadata: rootComponentMetadata,
    parentNode: rootNode,
  });

  currentTreeRef.tree.currentlyRendering = null;
  currentTreeRef.firstRender = false;

  console.log(JSON.stringify(reactTree));

  return reactTree;
};

const findAssociatedNode = (
  internalMetadata: ReactComponentInternalMetadata
) => {
  if (!currentTreeRef.tree) {
    throw new Error("Initialized tree");
  }
  const aux = (node: ReactTreeNode) => {
    for (const childNode of node.childNodes) {
      if (childNode.metadata.id === internalMetadata.id) {
        return { node: childNode, parentNode: node };
      }

      return aux(childNode);
    }
    return null;
  };

  return aux(currentTreeRef.tree.root);
};

const useState = <T>(initialValue: T) => {
  if (!currentTreeRef.tree?.currentlyRendering) {
    throw new Error("Cannot call use state outside of a react component");
  }

  const currentStateOrder = currentTreeRef.tree.currentHookOrderInsideComponent;
  currentTreeRef.tree.currentHookOrderInsideComponent += 1;

  const capturedCurrentlyRendering = currentTreeRef.tree.currentlyRendering;
  // const capturedCurrentlyRendering = currentTreeRef.tree.

  if (currentTreeRef.firstRender) {
    capturedCurrentlyRendering.hooks[currentStateOrder] = {
      kind: "state",
      value: initialValue,
    };
  }

  const hookMetadata = capturedCurrentlyRendering.hooks[currentStateOrder];

  return [
    hookMetadata.value as T,
    (value: T) => {
      const maybeNode = findAssociatedNode(capturedCurrentlyRendering);
      if (!maybeNode) {
        throw new Error("Stale callback, this should never happen");
      }

      const { node, parentNode } = maybeNode;

      const currentIndex = parentNode.childNodes.findIndex(
        (childNode) => childNode.id === node.id
      );

      const newNode: ReactTreeNode = {
        childNodes: [],
        id: crypto.randomUUID(),
        metadata: capturedCurrentlyRendering,
      };

      hookMetadata.value = value;

      parentNode.childNodes[currentIndex] = renderComponent({
        parentNode: newNode,
        internalMetadata: capturedCurrentlyRendering,
      });

      // associatedNode.
      hookMetadata.value = value;
    },
  ] as const;
};

const Bar = () => {
  return createElement("div", {}, createElement("div", {}));
};
const Foo = () => {
  const foo = createElement(
    "div",
    {},
    createElement("div", null),
    createElement(Bar, null)
  );
  return foo;
};

const Component = () => {
  const [x, setX] = useState(2);
  return createElement(
    "div",
    {},
    createElement(Foo, null),
    createElement("button", {
      innerText: x,
      onClick: () => {
        setX(x + 1);
      },
    }),
    createElement("span", null)
  );
};

buildReactTree(createElement(Component, null));
