var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var run = function (f) { return f(); };
var mapComponentToTaggedUnion = function (component) {
    return typeof component === "string"
        ? { kind: "tag", tagName: component }
        : { kind: "function", function: component, name: component.name };
};
var mapExternalMetadataToInternalMetadata = function (_a) {
    var internalMetadata = _a.internalMetadata;
    return ({
        component: mapComponentToTaggedUnion(internalMetadata.component),
        children: internalMetadata.children,
        props: internalMetadata.props,
        hooks: [],
        id: crypto.randomUUID(),
    });
};
// how do you know if it was the same component called?
// well i guess the order it was called and the name of the component? sheesh
var createElement = function (component, props) {
    var _a;
    var children = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        children[_i - 2] = arguments[_i];
    }
    var internalMetadata = mapExternalMetadataToInternalMetadata({
        internalMetadata: { children: children, component: component, props: props },
    });
    if (!((_a = currentTreeRef.renderTree) === null || _a === void 0 ? void 0 : _a.currentlyRendering)) {
        var rootRenderNode = {
            internalMetadata: internalMetadata,
            id: crypto.randomUUID(),
            childNodes: [],
            computedViewTreeNode: null,
            hooks: [],
        };
        currentTreeRef.renderTree = {
            currentHookOrderInsideComponent: 0,
            currentlyRendering: null,
            root: rootRenderNode,
            isFirstRender: true, // this needs to be updated when we start re-rendering components
        };
        return rootRenderNode;
    }
    var newRenderTreeNode = {
        id: crypto.randomUUID(),
        childNodes: [],
        computedViewTreeNode: null,
        internalMetadata: internalMetadata,
        hooks: [],
    };
    currentTreeRef.renderTree.currentlyRendering.childNodes.push(newRenderTreeNode);
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
var renderComponent = function (_a) {
    var renderTreeNode = _a.renderTreeNode, parentViewNode = _a.parentViewNode;
    if (!currentTreeRef.renderTree || !currentTreeRef.viewTree) {
        throw new Error("Cannot render component outside of react tree");
    }
    currentTreeRef.renderTree.currentlyRendering = renderTreeNode;
    currentTreeRef.renderTree.currentHookOrderInsideComponent = 0;
    var newNode = {
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
    var fullyComputedChildren = renderTreeNode.internalMetadata.children.map(
    // now we have all the div's computed children
    function (child) {
        return renderComponent({
            renderTreeNode: child,
            parentViewNode: newNode,
        });
    });
    switch (renderTreeNode.internalMetadata.component.kind) {
        case "tag": {
            newNode.childNodes = fullyComputedChildren;
            parentViewNode.childNodes.push(newNode);
            break;
        }
        case "function": {
            var childrenSpreadProps = fullyComputedChildren.length > 0
                ? { children: fullyComputedChildren }
                : false;
            // a component can only output one computed metadata, hence the reason for fragments
            var computedRenderTreeNode = renderTreeNode.internalMetadata.component.function(__assign(__assign({}, renderTreeNode.internalMetadata.props), childrenSpreadProps)); // Component outputs a div
            var viewNode = renderComponent({
                renderTreeNode: computedRenderTreeNode,
                parentViewNode: newNode,
            });
            parentViewNode.childNodes.push(viewNode);
            break;
        }
    }
    return newNode;
};
var currentTreeRef = {
    viewTree: null,
    renderTree: null,
};
function deepTraverseAndModify(obj) {
    if (Array.isArray(obj)) {
        return obj.map(deepTraverseAndModify);
    }
    else if (typeof obj === "object" && obj !== null) {
        var newObj = {};
        for (var _i = 0, _a = Object.entries(obj); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], value = _b[1];
            if (key === "computedViewTreeNode" &&
                value &&
                typeof value === "object" &&
                "id" in value) {
                newObj["computedViewTreeNodeId"] = value.id;
            }
            else if (key === "internalMetadata" &&
                value &&
                typeof value === "object" &&
                "id" in value) {
                var x = value;
                newObj["internalMetadataName+Id"] = (x.component.tagName +
                    x.component.name +
                    "-" +
                    x.id.slice(0, 4)).replace("undefined", "");
            }
            else {
                newObj[key] = deepTraverseAndModify(value);
            }
        }
        return newObj;
    }
    return obj;
}
var buildReactTrees = function (rootRenderTreeNode) {
    var rootViewNode = {
        id: crypto.randomUUID(),
        childNodes: [],
        metadata: rootRenderTreeNode.internalMetadata,
    };
    if (!currentTreeRef.renderTree) {
        throw new Error("Root node passed is not apart of any react render tree");
    }
    var reactViewTree = {
        root: rootViewNode,
    };
    currentTreeRef.viewTree = reactViewTree;
    currentTreeRef.viewTree.root = renderComponent({
        renderTreeNode: rootRenderTreeNode,
        parentViewNode: rootViewNode,
        // parentViewNode: rootNode,
    });
    currentTreeRef.renderTree.currentlyRendering = null;
    currentTreeRef.renderTree.isFirstRender = false;
    console.log(JSON.stringify(deepTraverseAndModify(currentTreeRef.renderTree)));
    return {
        reactRenderTree: currentTreeRef.renderTree,
        reactViewTree: currentTreeRef.viewTree,
    };
};
var useState = function (initialValue) {
    var _a;
    if (!((_a = currentTreeRef.renderTree) === null || _a === void 0 ? void 0 : _a.currentlyRendering)) {
        throw new Error("Cannot call use state outside of a react component");
    }
    var currentStateOrder = currentTreeRef.renderTree.currentHookOrderInsideComponent;
    currentTreeRef.renderTree.currentHookOrderInsideComponent += 1;
    var capturedCurrentlyRendering = currentTreeRef.renderTree.currentlyRendering;
    // const capturedCurrentlyRendering = currentTreeRef.tree.
    if (currentTreeRef.renderTree.isFirstRender) {
        capturedCurrentlyRendering.hooks[currentStateOrder] = {
            kind: "state",
            value: initialValue,
        };
    }
    var hookMetadata = capturedCurrentlyRendering.hooks[currentStateOrder];
    return [
        hookMetadata.value,
        function (value) {
            // what does it mean to re-render here
            // we should be able to apply the renderComponent, just with a deeper root
            // the different is that we shouldn't always push, i will think about this later
            // but we should have all the information and references setup to do this correct
            hookMetadata.value = value;
        },
    ];
};
var Bar = function () {
    return createElement("area", {}, createElement("bdo", {}));
};
var Foo = function () {
    var foo = createElement("br", {}, createElement("article", null), createElement(Bar, null));
    return foo;
};
var Component = function () {
    var _a = useState(2), x = _a[0], setX = _a[1];
    return createElement("div", {}, createElement(Foo, null), createElement("button", {
        innerText: "hello i have an inner text" + x,
        onClick: function () {
            setX(x + 1);
        },
    }), createElement("span", null));
};
var render = function (rootElement, domEl) {
    var _a = buildReactTrees(rootElement), reactRenderTree = _a.reactRenderTree, reactViewTree = _a.reactViewTree;
    var aux = function (_a) {
        // switch (reactViewNode.metadata.component.kind) {
        //   case "tag": {
        //     const newEl = document.createElement(
        //       reactViewNode.metadata.component.tagName
        //     );
        //     Object.assign(newEl, reactViewNode.metadata.props);
        //     parentDomNode.appendChild(newEl);
        var reactViewNode = _a.reactViewNode, parentDomNode = _a.parentDomNode;
        //     reactViewNode.childNodes.map((childViewNode) => {
        //       aux({
        //         parentDomNode: newEl,
        //         reactViewNode: childViewNode,
        //       });
        //     });
        //    break
        //   }
        //   case 'function': {
        //     reactViewNode.childNodes.
        //   }
        // }
        reactViewNode.childNodes.forEach(function (childViewNode) {
            console.log("traversing through", childViewNode);
            switch (childViewNode.metadata.component.kind) {
                case "tag": {
                    var newEl = document.createElement(childViewNode.metadata.component.tagName);
                    Object.assign(newEl, childViewNode.metadata.props);
                    parentDomNode.appendChild(newEl);
                    aux({
                        parentDomNode: newEl,
                        reactViewNode: childViewNode,
                    });
                    break;
                }
                case "function":
                    {
                        // nothing to add to the dom, just skip
                        // cant skip in the view tree to keep the binds between the 2 trees, i think?
                        aux({
                            parentDomNode: parentDomNode,
                            reactViewNode: childViewNode,
                        });
                    }
                    break;
            }
        });
    };
    aux({
        parentDomNode: domEl,
        reactViewNode: reactViewTree.root,
    });
};
window.onload = function () {
    console.log("loaded");
    render(createElement(Component, null), document.getElementById("root"));
};
