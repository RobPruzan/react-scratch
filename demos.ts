import type { ReactComponentInternalMetadata } from "./src/react/types";

type AnyProps = Record<string, unknown> | null
export type ReactComponentFunction = (
  props: AnyProps
) => ReactComponentInternalMetadata;
// what createElement will accept as input
export type ReactComponentExternalMetadata<T extends AnyProps> = {
  component: keyof HTMLElementTagNameMap | ReactComponentFunction;
  props: T;
  children: Array<ReactComponentInternalMetadata>; 
};


// internal representation of component metadata for easier processing
export type TagComponent = {
  kind: "tag";
  tagName: keyof HTMLElementTagNameMap;
};

export type FunctionalComponent = {
  kind: "function";
  name: string;
  function: ReactComponentFunction;
};



const generateViewTree= (metadata: ReactComponentInternalMetadata) => {
 
 
}