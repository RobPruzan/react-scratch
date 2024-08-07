type ReactNode = {
  tagName: keyof HTMLElementTagNameMap;
};

const createElementFromNode = (node: ReactNode) => {
  const newEl = document.createElement(node.tagName);
  return newEl;
};

const render = (node: ReactNode, domElement: HTMLElement) => {
  console.log("rendering root");
  const el = createElementFromNode(node);
  domElement.appendChild(el);
};

window.onload = () => {
  render(
    {
      tagName: "div",
    },
    document.getElementById("root")!
  );
};
