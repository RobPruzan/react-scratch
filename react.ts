type AnyProps = Record<string, unknown> | null;
type run = <T>(f: () => T) => T;

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
  parentNode.childNodes.push(newNode);
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

const useState = <T>(initialValue: T) => {
  if (!currentTreeRef.tree?.currentlyRendering) {
    throw new Error("Cannot call use state outside of a react component");
  }

  const currentStateOrder = currentTreeRef.tree.currentHookOrderInsideComponent;
  currentTreeRef.tree.currentHookOrderInsideComponent += 1;

  if (currentTreeRef.firstRender) {
    currentTreeRef.tree.currentlyRendering.hooks[currentStateOrder] = {
      kind: "state",
      value: initialValue,
    };
  }

  const hookMetadata =
    currentTreeRef.tree.currentlyRendering.hooks[currentStateOrder];

  return [
    hookMetadata.value as T,
    (value: T) => {
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
