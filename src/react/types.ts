export type AnyProps = Record<string, unknown> | null;

export type ReactComponentFunction<T extends AnyProps> = (
  props: AnyProps
) => ReactComponentInternalMetadata;

export type ReactComponentExternalMetadata<T extends AnyProps> = {
  component: keyof HTMLElementTagNameMap | ReactComponentFunction<T>;
  props: T;
  children: Array<ReactComponentInternalMetadata | null | false | undefined>;
};

export type UseStateMetadata = {
  kind: "state";
  value: unknown;
};
export type UseEffectMetadata = {
  kind: "effect";
  deps: Array<unknown>;
  cb: () => void;
  cleanup: (() => void) | null;
};
export type UseRefMetadata = {
  kind: "ref";
  refTo: { current: unknown };
};

export type TagComponent = {
  kind: "tag";
  tagName: keyof HTMLElementTagNameMap;
  domRef: HTMLElement | null;
};

export type FunctionalComponent = {
  kind: "function";
  name: string;
  function: ReactComponentFunction<AnyProps>;
};

export type RealElementReactComponentInternalMetadata = {
  kind: "real-element";
  component: TagComponent | FunctionalComponent;

  props: AnyProps;
  children: Array<ReactComponentInternalMetadata>;
  // hooks: Array<ReactHookMetadata>;
  id: string;
};

export type EmptySlotReactComponentInternalMetadata = {
  kind: "empty-slot";
};
export type ReactComponentInternalMetadata =
  | RealElementReactComponentInternalMetadata
  | EmptySlotReactComponentInternalMetadata;

export type ReactViewTreeNodeRealElement = {
  kind: "real-element";
  id: string;
  childNodes: Array<ReactViewTreeNode>;
  metadata: ReactComponentInternalMetadata;
  // key: string;
  indexPath: Array<number>; // allows for optimized diffs to know what to map with
};

export type ReactViewTreeNodeEmptySlot = { kind: "empty-slot"; id: string };
export type ReactViewTreeNode =
  | ReactViewTreeNodeRealElement
  | ReactViewTreeNodeEmptySlot;

export type ReactViewTree = {
  root: ReactViewTreeNode | null;
};

export type CreateElementCallTreeNode = {
  order: number;
  childNodes: Array<CreateElementCallTreeNode>;
};
export type ReactRenderTree = {
  currentLastRenderChildNodes: Array<ReactRenderTreeNode>;
  currentlyRendering: ReactRenderTreeNode | null;
  currentLocalCurrentHookOrder: number;
  // i think this needs to be a tree, not a flat map
  // our logic doesn't work amazing for dynamic items
  // it works but is rough with lists in bigger components determining how to assign ordering keys
  // localComponentRenderMap: {
  //   [componentName: string]: number;
  // };
  root: ReactRenderTreeNode;
};
export type RealElement = {
  kind: "real-element";
  id: string;
  childNodes: Array<ReactRenderTreeNode>;
  computedViewTreeNodeId: string | null;
  internalMetadata: ReactComponentInternalMetadata;
  hooks: Array<UseStateMetadata | UseRefMetadata | UseEffectMetadata>;
  indexPath: Array<number>;
  hasRendered: boolean; // im confident we don't need ths and can just derive this from existing info on the trees
};

export type EmptySlot = {
  kind: "empty-slot";
};
// render tree node has a direct link to view tree node
export type ReactRenderTreeNode = RealElement | EmptySlot;

// export type CreateElementMetadataNode = {
//   id: string;
//   childNodes: Array<CreateElementMetadataNode>;
//   metadata:
//     | {
//         kind: "real-element";
//         componentInternalMetadata: ReactComponentInternalMetadata;
//       }
//     | { kind: "empty-slot" };
// };
