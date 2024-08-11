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
var toChild = function (child) {
    return Boolean(child);
};
var getComponentName = function (internalMetadata) {
    return internalMetadata.component.kind === "function"
        ? internalMetadata.component.function.name
        : internalMetadata.component.tagName;
};
// how do you know if it was the same component called?
// well i guess the order it was called and the name of the component? sheesh
var createElement = function (component, props) {
    var _a, _b;
    var children = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        children[_i - 2] = arguments[_i];
    }
    var internalMetadata = mapExternalMetadataToInternalMetadata({
        internalMetadata: { children: children.filter(toChild), component: component, props: props },
    });
    if (!((_a = currentTreeRef.renderTree) === null || _a === void 0 ? void 0 : _a.currentlyRendering)) {
        var rootRenderNode = {
            internalMetadata: internalMetadata,
            id: crypto.randomUUID(),
            childNodes: [],
            computedViewTreeNode: null,
            hooks: [],
            localRenderOrder: 0,
        };
        currentTreeRef.renderTree = {
            localCurrentHookOrder: 0,
            currentlyRendering: null,
            root: rootRenderNode,
            isFirstRender: true, // this needs to be updated when we start re-rendering components,
            localComponentRenderMap: {},
        };
        return rootRenderNode;
    }
    // console.log("calling create element on ", getComponentName(internalMetadata));
    // console.log(
    //   "this render map ",
    //   JSON.stringify(currentTreeRef.renderTree.localComponentRenderMap),
    //   "before on this element",
    //   getComponentName(internalMetadata),
    //   "fetching this value",
    //   currentTreeRef.renderTree.localComponentRenderMap[
    //     getComponentName(internalMetadata)
    //   ]
    // );
    var newLocalRenderOrder = ((_b = currentTreeRef.renderTree.localComponentRenderMap[getComponentName(internalMetadata)]) !== null && _b !== void 0 ? _b : 0) + 1;
    currentTreeRef.renderTree.localComponentRenderMap[getComponentName(internalMetadata)] = newLocalRenderOrder;
    // see if theres an existing render tree node for this metadata instance
    // how? How do i determine equality
    // lets read the currently rendering and do some diffs
    var existingNode = currentTreeRef.renderTree.currentlyRendering.childNodes.find(function (childNode) {
        var name = getComponentName(childNode.internalMetadata);
        if (name === getComponentName(internalMetadata) &&
            childNode.localRenderOrder === newLocalRenderOrder) {
            return true;
        }
    });
    if (existingNode) {
        existingNode.internalMetadata = internalMetadata;
        // console.log(
        //   "returning existing node",
        //   existingNode,
        //   getComponentName(internalMetadata),
        //   currentTreeRef.renderTree.localComponentRenderMap
        // );
        return existingNode;
    }
    var newRenderTreeNode = {
        id: crypto.randomUUID(),
        childNodes: [],
        computedViewTreeNode: null,
        internalMetadata: internalMetadata,
        hooks: [],
        localRenderOrder: newLocalRenderOrder,
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
var findParentViewNode = function (renderNode) {
    var _a, _b;
    console.log("searchign for", renderNode.metadata.id);
    var aux = function (viewNode) {
        if (viewNode.childNodes.some(function (n) { return n.id === renderNode.id; })) {
            console.log("for sure found it", viewNode);
            return viewNode;
        }
        return viewNode.childNodes.find(aux);
    };
    var result = aux((_a = currentTreeRef.viewTree) === null || _a === void 0 ? void 0 : _a.root);
    if (!result) {
        if (!((_b = currentTreeRef.viewTree) === null || _b === void 0 ? void 0 : _b.root)) {
            throw new Error("no node found");
        }
        console.log("the bad case");
        return currentTreeRef.viewTree.root;
    }
    console.log("what?????", result);
    return result;
    // currentTreeRef.renderTree.root.childNodes;
};
var findParentRenderNode = function (renderNode) {
    if (!currentTreeRef.renderTree) {
        throw new Error("No render tree");
    }
    var aux = function (viewNode) {
        if (viewNode.childNodes.some(function (n) { return n.id === renderNode.id; })) {
            return viewNode;
        }
        return viewNode.childNodes.find(aux);
    };
    var result = aux(currentTreeRef.renderTree.root);
    if (!result) {
        return null;
        // throw new Error("Invariant error, node not found,");
    }
    return result;
    // currentTreeRef.renderTree.root.childNodes;
};
var renderComponent = function (_a) {
    var renderTreeNode = _a.renderTreeNode, parentViewNode = _a.parentViewNode;
    if (!currentTreeRef.renderTree || !currentTreeRef.viewTree) {
        throw new Error("Cannot render component outside of react tree");
    }
    currentTreeRef.renderTree.currentlyRendering = renderTreeNode;
    // const existingNode =
    //   if (renderTreeNode.computedViewTreeNode) {
    //   renderTreeNode.
    // }
    // const parentOfRenderNode = findParentRenderNode(renderTreeNode)
    // create a new render node, need to update the parent
    var newNode = {
        id: crypto.randomUUID(),
        metadata: renderTreeNode.internalMetadata, // now making a new div node
        childNodes: [],
    };
    // if (parentOfRenderNode === null) {
    //   currentTreeRef.renderTree.root.computedViewTreeNode = newNode
    // }
    // parentViewNode.childNodes.push(newNode);
    // const associatedRenderNodes = findAssociatedRenderNode(internalMetadata);
    renderTreeNode.computedViewTreeNode = newNode;
    // findParentViewNode()
    // at first computes button and span
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
            currentTreeRef.renderTree.localCurrentHookOrder = 0;
            currentTreeRef.renderTree.localComponentRenderMap = {};
            var computedRenderTreeNode = renderTreeNode.internalMetadata.component.function(__assign(__assign({}, renderTreeNode.internalMetadata.props), childrenSpreadProps)); // Component outputs a div
            console.log("output of function named", renderTreeNode.internalMetadata.component.function.name, computedRenderTreeNode);
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
// const findParentRenderNode = () =
var buildReactTrees = function (rootRenderTreeNode) {
    var rootViewNode = {
        id: crypto.randomUUID(),
        childNodes: [],
        metadata: rootRenderTreeNode.internalMetadata,
    };
    // rootRenderTreeNode.computedViewTreeNode = rootViewNode;
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
    console.log("root view id", rootViewNode.id);
    rootRenderTreeNode.computedViewTreeNode = rootViewNode;
    currentTreeRef.renderTree.currentlyRendering = null;
    currentTreeRef.renderTree.isFirstRender = false;
    // console.log(JSON.stringify(deepTraverseAndModify(currentTreeRef.renderTree)));
    return {
        reactRenderTree: currentTreeRef.renderTree,
        reactViewTree: currentTreeRef.viewTree,
    };
};
function deepEqual(a, b) {
    if (a === b)
        return true;
    if (a && b && typeof a === "object" && typeof b === "object") {
        if (Array.isArray(a) && Array.isArray(b)) {
            if (a.length !== b.length)
                return false;
            for (var i = 0; i < a.length; i++) {
                if (!deepEqual(a[i], b[i]))
                    return false;
            }
            return true;
        }
        if (a.constructor !== b.constructor)
            return false;
        var keysA = Object.keys(a);
        var keysB = Object.keys(b);
        if (keysA.length !== keysB.length)
            return false;
        for (var _i = 0, keysA_1 = keysA; _i < keysA_1.length; _i++) {
            var key = keysA_1[_i];
            if (!keysB.includes(key))
                return false;
            if (!deepEqual(a[key], b[key]))
                return false;
        }
        return true;
    }
    return false;
}
var isInViewTree = function (viewNode) {
    if (!currentTreeRef.viewTree) {
        throw new Error("invariant");
    }
    var aux = function (node) {
        if (node.id === viewNode.id) {
            return true;
        }
        return node.childNodes.some(aux);
    };
    return aux(currentTreeRef.viewTree.root);
};
var useState = function (initialValue) {
    var _a;
    if (!((_a = currentTreeRef.renderTree) === null || _a === void 0 ? void 0 : _a.currentlyRendering)) {
        throw new Error("Cannot call use state outside of a react component");
    }
    var currentStateOrder = currentTreeRef.renderTree.localCurrentHookOrder;
    currentTreeRef.renderTree.localCurrentHookOrder += 1;
    var capturedCurrentlyRenderingRenderNode = currentTreeRef.renderTree.currentlyRendering;
    // const capturedCurrentlyRendering = currentTreeRef.tree.
    if (currentTreeRef.renderTree.isFirstRender) {
        capturedCurrentlyRenderingRenderNode.hooks[currentStateOrder] = {
            kind: "state",
            value: initialValue,
        };
    }
    var hookMetadata = capturedCurrentlyRenderingRenderNode.hooks[currentStateOrder];
    return [
        hookMetadata.value,
        function (value) {
            var _a, _b;
            // console.log("fn id", crypto.randomUUID());
            // console.log("being passed", value);
            hookMetadata.value = value;
            // console.log("setting the hook metadata to", hookMetadata.value);
            // what does it mean to re-render here
            // we should be able to apply the renderComponent, just with a deeper root
            // the different is that we shouldn't always push, i will think about this later
            // but we should have all the information and references setup to do this correct
            // i would like it so we define which component to renderer by passing renderComponent a node to re-render
            // then it will output a view sub-tree which we just replace on the view tree based on what the node maps to
            // then we can generate inefficiently re-generate the dom
            var rootSubTreeNode = {
                childNodes: [],
                id: crypto.randomUUID(),
                metadata: capturedCurrentlyRenderingRenderNode.internalMetadata,
            };
            var captureNode = capturedCurrentlyRenderingRenderNode.computedViewTreeNode;
            var reGeneratedViewTree = renderComponent({
                renderTreeNode: capturedCurrentlyRenderingRenderNode,
                parentViewNode: rootSubTreeNode, // this node needs to be added to the tree
            });
            // this updates the render tree to be in sync, but the view tree is still out of sync
            /**
             * I see so the current setup is:
             *
             * u regenerate the view tree at the render node
             *
             * the render tree is all up to date with that information
             *
             *
             * the view tree now needs to be updated
             *
             * we need the view node of the component so we can update all of its children
             *
             * that should just be the view node before we update it?
             */
            var capturedString = JSON.stringify(captureNode.childNodes);
            var parentNode = findParentViewNode(captureNode);
            console.log("is in view tree:", isInViewTree(captureNode), captureNode, "and parent view node", findParentViewNode(captureNode));
            // captureNode.childNodes = reGeneratedViewTree.childNodes;
            var index = parentNode.childNodes.findIndex(function (node) { return captureNode.id === node.id; });
            parentNode.childNodes[index] = reGeneratedViewTree;
            // findParentViewNode
            // we want to find the existing node, which should be captured?
            // console.log("what am i", JSON.stringify(captureNode));
            // const parentNode = findParentViewNode(captureNode);
            // reGeneratedViewTree.childNodes.forEach(newNode => {
            //   parentNode.childNodes.forEach(oldNode => {
            //     if (newNode.metadata.id === oldNode.metadata.id) {
            //     }
            //   })
            // } )
            // console.log("what are you", JSON.stringify(parentNode));
            // // we are incorrectly updating the tag node, we should be updating the component node which should be there?
            // console.log("parent node im updating", JSON.stringify(parentNode));
            // // console.log('child we used', JSON.stringify());
            // parentNode.childNodes.map((existingNode) => {
            //   if (existingNode.metadata.id === )
            // })
            // this makes no sense, we should be updating the render nodes element
            // captureNode.childNodes = reGeneratedViewTree
            console.log("what is the rengenerated view representing", JSON.stringify(reGeneratedViewTree));
            // parentNode.childNodes = reGeneratedViewTree.childNodes;
            // const index = parentNode.childNodes.findIndex(
            //   (childNode) => childNode.id === rootSubTreeNode.id
            // );
            // parentNode.childNodes[index] = reGeneratedViewTree;
            if (!capturedCurrentlyRenderingRenderNode.computedViewTreeNode) {
                throw new Error("Invariant: set state trying to re-render unmounted component");
            }
            if (!currentTreeRef.viewTree) {
                throw new Error("Invariant error, no view tree");
            }
            // capturedCurrentlyRenderingRenderNode.internalMetadata.
            console.log("name:".concat(getComponentName(capturedCurrentlyRenderingRenderNode.computedViewTreeNode.metadata)), "\n\n", "assigning:\n", JSON.stringify(reGeneratedViewTree.childNodes), "\n\n", "But what im replacing is: \n\n", capturedString);
            var root = document.getElementById("root");
            while (root.firstChild) {
                root.removeChild(root.firstChild);
            }
            console.log("the view tree", (_a = currentTreeRef.viewTree) === null || _a === void 0 ? void 0 : _a.root);
            // so hacky clean up later
            applyViewTreeToDomEl({
                parentDomNode: root,
                reactViewNode: (_b = currentTreeRef.viewTree) === null || _b === void 0 ? void 0 : _b.root,
            });
        },
    ];
};
var Bar = function () {
    var _a = useState(false), isRenderingSpan = _a[0], setIsRenderingSpan = _a[1];
    var _b = useState(2), x = _b[0], setX = _b[1];
    return createElement("area", {}, createElement("button", {
        innerText: "conditional render",
        onclick: function () {
            setIsRenderingSpan(!isRenderingSpan);
        },
    }), createElement("button", {
        innerText: "Count: ".concat(x),
        onclick: function () {
            console.log("clicked");
            setX(x + 1);
        },
    }), isRenderingSpan &&
        createElement("span", {
            style: "display:flex; height:50px; width:50px; background-color: white;",
        }));
};
// const Foo = () => {
//   const foo = createElement(
//     "div", // view parent of Bar, so need to replace the instance with the recomputed instance
//     {},
//     createElement("article", null),
//     createElement(Bar, null),
//     createElement(Bar, null)
//   );
//   return foo;
// };
var Component = function () {
    // console.log("am i running?");
    // const [x, setX] = useState(2);
    // console.log("value being read", x);
    return createElement("div", {}, 
    // createElement(Foo, null),
    createElement(Bar, null)
    // createElement("div", {
    //   innerText: `Count: ${x}`,
    //   style: "color:white;",
    // })
    // createElement("span", null)
    );
};
var NestThis = function () {
    return createElement(Component, null);
};
var applyViewTreeToDomEl = function (_a) {
    var reactViewNode = _a.reactViewNode, parentDomNode = _a.parentDomNode;
    reactViewNode.childNodes.forEach(function (childViewNode) {
        // console.log("traversing through", childViewNode);
        switch (childViewNode.metadata.component.kind) {
            case "tag": {
                var newEl = document.createElement(childViewNode.metadata.component.tagName);
                Object.assign(newEl, childViewNode.metadata.props);
                parentDomNode.appendChild(newEl);
                applyViewTreeToDomEl({
                    parentDomNode: newEl,
                    reactViewNode: childViewNode,
                });
                break;
            }
            case "function":
                {
                    // nothing to add to the dom, just skip
                    // cant skip in the view tree to keep the binds between the 2 trees, i think?
                    applyViewTreeToDomEl({
                        parentDomNode: parentDomNode,
                        reactViewNode: childViewNode,
                    });
                }
                break;
        }
    });
};
var render = function (rootElement, domEl) {
    var reactViewTree = buildReactTrees(rootElement).reactViewTree;
    applyViewTreeToDomEl({
        parentDomNode: domEl,
        reactViewNode: reactViewTree.root,
    });
};
var main = function () { };
if (typeof window === "undefined") {
    var _a = buildReactTrees(createElement(Component, null)), reactViewTree = _a.reactViewTree, reactRenderTree = _a.reactRenderTree;
    console.log(JSON.stringify(deepTraverseAndModify(reactRenderTree)));
}
else {
    window.onload = function () {
        // console.log("loaded");
        render(createElement(NestThis, null), document.getElementById("root"));
    };
}
