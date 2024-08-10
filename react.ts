/**
 *
 *
 * End state im too tired
 *
 *
 * i do want the tree lazily evaluated how its currently happening so we can control the renderings more
 *
 *
 * I want a component to return an "element" object. I don't care what the internal representation is
 *
 * the element object should take the tag | component, props and children
 *
 * we can than enhance that into a fiber which includes state and effects
 *
 *
 * and the actual tree that holds all that is just an abstraction on top of the fiber
 *
 *
 * so something like:
 *
 *
 * returns -> ReactElement
 *
 *
 * ReactElement immediately lifted to -> ReactFiber
 *
 *
 * ReactFiber rendered to generate -> ReactInternalTree
 *
 *
 * we are currently pretty close to that, we just need the ReactElement -> ReactFiber lifting intermediary step
 *
 *
 *
 * late night thought, have Internal types and External types, we immediately lift external types to internal types to make it easier to process
 */

type AnyProps = Record<string, unknown>;
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

// const renderComponent = ({
//   component,
//   parentNode,
// }: {
//   parentNode: ReactTreeNode;
//   component: ReactComponentInternalMetadata["component"];
//   }): ReactTreeNode => {
//   if (!currentTreeRef.tree) {
//     throw new Error("Cannot render component outside of react tree")
//   }
//   switch (component.kind) {
//     case "tag": {
//       // its a leaf node
//       const newNode = makeTagNode(component.tagName);
//       parentNode.childNodes.push(newNode);
//       return newNode;
//     }

//     case "function": {

//       const returnedInternalMetadata = component.function(
//         parentNode.metadata.props
//       );

//       const newNode: ReactTreeNode = {
//         id: crypto.randomUUID(),
//         metadata: returnedInternalMetadata,
//         childNodes: [],
//       };
//       returnedInternalMetadata.children.forEach((childComponent) => {
//         const childNode = renderComponent({
//           component: childComponent,
//           parentNode: newNode,
//         });
//         // avoid appending the leaf twice
//         if (childNode.metadata.component.kind === "function") {
//           newNode.childNodes.push(childNode);
//         }
//       });

//       parentNode.childNodes.push(newNode);

//       return newNode;
//     }
//   }
//   component satisfies never;
// };

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

  const newNode: ReactTreeNode = {
    id: crypto.randomUUID(),
    metadata: internalMetadata,
    childNodes: [],
  };
  // if (parentNode)
  parentNode.childNodes.push(newNode);
  switch (internalMetadata.component.kind) {
    case "tag": {
      // const tagNode = makeTagNode(
      //   internalMetadata.component.tagName,
      //   internalMetadata.id
      // );
      // parentNode.childNodes.push(tagNode);
      break;
      // return tagNode;
    }
    case "function": {
      currentTreeRef.tree.currentlyRendering = internalMetadata;
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
  ];
};

const Bar = () => {
  return createElement("div", {}, createElement("div", {}));
};
const Foo = () => {
  const foo = createElement(
    "div",
    {},
    createElement("div", {}),
    createElement(Bar, {})
  );
  return foo;
};

const Component = () => {
  // const [x, setX] = useState(2);
  return createElement(
    "div",
    {},
    createElement(Foo, {}),
    createElement("div", {}),
    createElement("span", {})
  );
};

buildReactTree(Component());
