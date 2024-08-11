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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
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
    return (internalMetadata.component.kind === "function"
        ? internalMetadata.component.function.name
        : internalMetadata.component.tagName) +
        "-" +
        JSON.stringify(internalMetadata.props);
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
    // console.log("called for", getComponentName(internalMetadata));
    if (!((_a = currentTreeRef.renderTree) === null || _a === void 0 ? void 0 : _a.currentlyRendering)) {
        var rootRenderNode = {
            internalMetadata: internalMetadata,
            id: crypto.randomUUID(),
            childNodes: [],
            computedViewTreeNodeId: null,
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
    var newLocalRenderOrder = ((_b = currentTreeRef.renderTree.localComponentRenderMap[getComponentName(internalMetadata)]) !== null && _b !== void 0 ? _b : 0) + 1;
    currentTreeRef.renderTree.localComponentRenderMap[getComponentName(internalMetadata)] = newLocalRenderOrder;
    var existingNode = currentTreeRef.renderTree.currentlyRendering.childNodes.find(function (childNode) {
        var name = getComponentName(childNode.internalMetadata);
        if (name === getComponentName(internalMetadata) &&
            childNode.localRenderOrder === newLocalRenderOrder) {
            return true;
        }
    });
    if (existingNode) {
        existingNode.internalMetadata = internalMetadata;
        return existingNode;
    }
    var newRenderTreeNode = {
        id: crypto.randomUUID(),
        childNodes: [],
        computedViewTreeNodeId: null,
        internalMetadata: internalMetadata,
        hooks: [],
        localRenderOrder: newLocalRenderOrder,
    };
    currentTreeRef.renderTree.currentlyRendering.childNodes.push(newRenderTreeNode);
    return newRenderTreeNode;
};
var findNode = function (id, tree) {
    var aux = function (viewNode) {
        for (var _i = 0, _a = viewNode.childNodes; _i < _a.length; _i++) {
            var node = _a[_i];
            if (node.id === id) {
                return node;
            }
            var res = aux(node);
            if (res) {
                return res;
            }
        }
    };
    if (tree.id === id) {
        return tree;
    }
    var result = aux(tree);
    if (!result) {
        throw new Error("detached node or wrong id:" + id + "\n\n" + JSON.stringify(tree));
    }
    return result;
};
var findViewNode = function (id, tree) {
    var aux = function (viewNode) {
        for (var _i = 0, _a = viewNode.childNodes; _i < _a.length; _i++) {
            var node = _a[_i];
            if (node.id === id) {
                return node;
            }
            var res = aux(node);
            if (res) {
                return res;
            }
        }
    };
    if (tree.id === id) {
        return tree;
    }
    var result = aux(tree);
    if (!result) {
        throw new Error("detached node or wrong id:" + id + "\n\n" + JSON.stringify(tree));
    }
    return result;
};
var findParentViewNode = function (id) {
    var _a, _b;
    var aux = function (viewNode) {
        for (var _i = 0, _a = viewNode.childNodes; _i < _a.length; _i++) {
            var node = _a[_i];
            if (node.id === id) {
                return viewNode;
            }
            var res = aux(node);
            if (res) {
                return res;
            }
        }
    };
    if (((_a = currentTreeRef.viewTree) === null || _a === void 0 ? void 0 : _a.root.id) === id) {
        return currentTreeRef.viewTree.root;
    }
    var result = aux((_b = currentTreeRef.viewTree) === null || _b === void 0 ? void 0 : _b.root);
    if (!result) {
        throw new Error("detached node or wrong id:" +
            id +
            "\n\n" +
            JSON.stringify(currentTreeRef.viewTree));
    }
    return result;
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
    }
    return result;
};
function deepClone(obj) {
    if (obj === null || typeof obj !== "object") {
        return obj;
    }
    if (typeof obj === "function") {
        return obj.bind({});
    }
    var copy = Array.isArray(obj) ? [] : {};
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            copy[key] = deepClone(obj[key]);
        }
    }
    return copy;
}
var isChildOf = function (_a) {
    var potentialChildId = _a.potentialChildId, potentialParentId = _a.potentialParentId;
    var aux = function (_a) {
        var node = _a.node, searchId = _a.searchId;
        if (node.id === searchId) {
            return node;
        }
        for (var _i = 0, _b = node.childNodes; _i < _b.length; _i++) {
            var child = _b[_i];
            var res = aux({
                node: child,
                searchId: searchId,
            });
            if (res) {
                return res;
            }
        }
    };
    if (!currentTreeRef.renderTree) {
        throw new Error("Invariant error must have render tree");
    }
    var start = aux({
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
/**
 *
 * Outputs the fist child generated by the root component
 *
 *
 * see if i can refactor so we only have to pass the metadata and it will generate the root of the view tree
 * would need an aux function but I think i can do it
 */
var renderComponent = function (_a) {
    var renderTreeNode = _a.renderTreeNode, parentViewNode = _a.parentViewNode, startingFromRenderNodeId = _a.startingFromRenderNodeId;
    if (!currentTreeRef.renderTree || !currentTreeRef.viewTree) {
        throw new Error("Cannot render component outside of react tree");
    }
    var newNode = {
        id: crypto.randomUUID(),
        metadata: renderTreeNode.internalMetadata, // now making a new div node
        childNodes: [],
        renderedById: renderTreeNode.id,
    };
    currentTreeRef.viewTree.viewNodePool.push(newNode);
    renderTreeNode.computedViewTreeNodeId = newNode.id;
    // the idea is we immediately execute the children before running the parent
    // then later when attempting to access its children it will check if its already computed
    // but the current problem is it seems the computed view node is not on the tree before we attempt to access it
    // so we should make a pool of view nodes that we can access during render
    var fullyComputedChildren = renderTreeNode.internalMetadata.children.map(function (child) {
        var _a, _b;
        var reRenderChild = function () {
            // root of the new tree, we can safely ignore it
            var accumulatingNode = {
                id: crypto.randomUUID(),
                metadata: child.internalMetadata,
                childNodes: [],
                renderedById: child.id,
            };
            var viewNode = renderComponent({
                renderTreeNode: child,
                parentViewNode: accumulatingNode,
                startingFromRenderNodeId: startingFromRenderNodeId,
            });
            if (accumulatingNode.childNodes.length > 1) {
                throw new Error("Invariant error, should never have more than one child");
            }
            return { viewNode: viewNode, renderNode: child };
        };
        // this check isn't good because it means we will never re-compute
        // what we need to do is check the render tree if we need to re-render this child
        // we can do this by checking if this associated tree node is a child of the rendered component
        // maybe each view node should have a parent component id
        // every time we render (call the function) we pass that function render node down
        var computedNode = (_a = currentTreeRef.viewTree) === null || _a === void 0 ? void 0 : _a.viewNodePool.find(function (node) { return node.id === child.computedViewTreeNodeId; });
        if (!child.computedViewTreeNodeId) {
            // console.log(
            //   `Never computed view ndoe for ${getComponentName(
            //     child.internalMetadata
            //   )}, rendering for the first time`
            // );
        }
        if (!computedNode) {
            // console.log(
            //   `no computed node for ${getComponentName(
            //     child.internalMetadata
            //   )}, rendering for the first time`
            // );
            // console.log(!);
            // if (child.computedViewTreeNodeId) {
            //   console.log("something weird is happening here");
            // }
            return reRenderChild();
        }
        // console.log("render tree node", JSON.stringify(renderTreeNode));
        // console.log("the render tree", JSON.stringify(currentTreeRef.renderTree));
        var shouldReRender = isChildOf({
            potentialChildId: child.id,
            potentialParentId: startingFromRenderNodeId, // this doesn't make sense, we are rendering x, first we render the children, and it will never be the case the children
            // have a parent of what they are a child of
        });
        var parentRenderNode = findNode(startingFromRenderNodeId, (_b = currentTreeRef.renderTree) === null || _b === void 0 ? void 0 : _b.root);
        if (!shouldReRender) {
            console.log("skipping re-rendering, ".concat(getComponentName(child.internalMetadata), " not a child of ").concat(getComponentName(parentRenderNode.internalMetadata)));
            // skip re-rendering if not a child in the render tree
            return { viewNode: computedNode, renderNode: child };
        }
        // small problem, when rendering the entire tree it will inefficiently double render children since the condition
        // that they are child's will always be true, maybe we should update that based on the function call?
        // console.log(
        //   `Re-rendering ${getComponentName(
        //     child.internalMetadata
        //   )}, is a child of re-rendered component`
        // );
        // console.log('part of ');
        return reRenderChild();
        // const parent =
        // computedNode?.renderedById
        // if (child.computedViewTreeNodeId) {
        //   const node = currentTreeRef.viewTree?.viewNodePool.find(
        //     (node) => node.id === child.computedViewTreeNodeId
        //   );
        //   if (!node) {
        //     throw new Error("Invariant, this must exist");
        //   }
        //   // const node = findParentViewNode(child.computedViewTreeNodeId);
        //   return { viewNode: node, renderNode: child };
        // }
        // we want to build up the child temporarily detached from the tree
        // then when the consumer decides to render it we add it to the tree
        // const viewNode = renderComponent({
        //   renderTreeNode: child,
        //   parentViewNode: accumulatingNode,
        // });
        // console.log("accumulated nodes", JSON.stringify(accumulatingNode));
        // console.log("the view node output", JSON.stringify(viewNode));
    });
    switch (renderTreeNode.internalMetadata.component.kind) {
        case "tag": {
            // not sure if it makes sense to handle the tag case here... maybe it does? All it means
            // is its a child element, so may as well..
            newNode.childNodes = fullyComputedChildren.map(function (_a) {
                var viewNode = _a.viewNode;
                return viewNode;
            });
            // currentTreeRef.viewTree.viewNodePool =
            //   currentTreeRef.viewTree.viewNodePool.filter((n) => n.id !== newNode.id);
            parentViewNode.childNodes.push(newNode);
            break;
        }
        case "function": {
            var childrenSpreadProps = renderTreeNode.internalMetadata.children.length > 0
                ? {
                    children: fullyComputedChildren.map(function (_a) {
                        var renderNode = _a.renderNode;
                        return renderNode;
                    }),
                }
                : false;
            // a component can only output one computed metadata, hence the reason for fragments
            currentTreeRef.renderTree.localCurrentHookOrder = 0;
            currentTreeRef.renderTree.localComponentRenderMap = {};
            currentTreeRef.renderTree.currentlyRendering = renderTreeNode;
            console.log("re-rendering", getComponentName(renderTreeNode.internalMetadata));
            var computedRenderTreeNode = renderTreeNode.internalMetadata.component.function(__assign(__assign({}, renderTreeNode.internalMetadata.props), childrenSpreadProps)); // Component outputs a div
            // the problem is the root and the rendered
            var viewNode = renderComponent({
                renderTreeNode: computedRenderTreeNode,
                parentViewNode: newNode,
                startingFromRenderNodeId: renderTreeNode.id,
            });
            // currentTreeRef.viewTree.viewNodePool =
            //   currentTreeRef.viewTree.viewNodePool.filter((n) => n.id !== newNode.id);
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
        metadata: rootRenderTreeNode.internalMetadata,
        childNodes: [],
        renderedById: rootRenderTreeNode.id,
    };
    // rootRenderTreeNode.computedViewTreeNode = rootViewNode;
    if (!currentTreeRef.renderTree) {
        throw new Error("Root node passed is not apart of any react render tree");
    }
    var reactViewTree = {
        root: rootViewNode,
        viewNodePool: [],
    };
    currentTreeRef.viewTree = reactViewTree;
    // theres clearly something wrong
    // it replaces what the behavior of the parent that was passed
    // but does not receive all the appends the root does
    // the root should be the correct one?
    console.log("\n\nRENDER START----------------------------------------------");
    // we ignore the output because its already appended to the root child nodes
    // we need to keep the root alive so we know how to regenerate the tree
    renderComponent({
        // i need to understand what this outputs
        renderTreeNode: rootRenderTreeNode,
        parentViewNode: rootViewNode,
        startingFromRenderNodeId: rootRenderTreeNode.id,
    });
    console.log("RENDER END----------------------------------------------\n\n");
    // currentTreeRef.viewTree.root = output;
    // console.log("output", JSON.stringify(output));
    // console.log("root", JSON.stringify(rootViewNode));
    currentTreeRef.renderTree.currentlyRendering = null;
    currentTreeRef.renderTree.isFirstRender = false;
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
            var _a;
            if (!capturedCurrentlyRenderingRenderNode.computedViewTreeNodeId) {
                throw new Error("Invariant: set state trying to re-render unmounted component");
            }
            if (!currentTreeRef.viewTree || !currentTreeRef.renderTree) {
                throw new Error("Invariant error, no view tree or no render tree");
            }
            hookMetadata.value = value;
            // we don't use this node after, we only care about using it to generate the sub view tree
            // and ideal refactor would be just passing the metadata and generating the root of the tree
            var detachedViewTreeNode = {
                childNodes: [],
                id: crypto.randomUUID(),
                metadata: capturedCurrentlyRenderingRenderNode.internalMetadata,
                renderedById: capturedCurrentlyRenderingRenderNode.id,
            };
            var captureNodeId = capturedCurrentlyRenderingRenderNode.computedViewTreeNodeId;
            var parentNode = findParentViewNode(captureNodeId);
            // console.log("before (parent): \n\n", JSON.stringify(parentNode));
            console.log("\n\nRENDER START----------------------------------------------");
            var reGeneratedViewTree = renderComponent({
                renderTreeNode: capturedCurrentlyRenderingRenderNode,
                parentViewNode: detachedViewTreeNode, // this node needs to be added to the tree
                startingFromRenderNodeId: capturedCurrentlyRenderingRenderNode.id,
            });
            console.log("RENDER END----------------------------------------------\n\n");
            // its a detached node and because of that we set it as the root
            var index = parentNode === null || parentNode === void 0 ? void 0 : parentNode.childNodes.findIndex(function (node) { return captureNodeId === node.id; });
            // so bad lol clean this
            // and it ends up being my downfall...
            if (!parentNode || index === undefined || index == -1) {
                currentTreeRef.viewTree.root = reGeneratedViewTree;
                currentTreeRef.renderTree.root.computedViewTreeNodeId =
                    reGeneratedViewTree.id;
            }
            else {
                parentNode.childNodes[index] = reGeneratedViewTree;
            }
            var root = document.getElementById("root");
            while (root.firstChild) {
                root.removeChild(root.firstChild);
            }
            // so hacky clean up later
            applyViewTreeToDomEl({
                parentDomNode: root,
                reactViewNode: (_a = currentTreeRef.viewTree) === null || _a === void 0 ? void 0 : _a.root,
            });
            // console.log(
        },
    ];
};
var Bar = function () {
    // console.log("Bar");
    var _a = useState(false), isRenderingSpan = _a[0], setIsRenderingSpan = _a[1];
    var _b = useState(2), x = _b[0], setX = _b[1];
    return createElement("area", {}, createElement(Foo, null), createElement("button", {
        innerText: "conditional render",
        onclick: function () {
            setIsRenderingSpan(!isRenderingSpan);
        },
    }), createElement("button", {
        innerText: "Count: ".concat(x),
        onclick: function () {
            setX(x + 1);
        },
    }), isRenderingSpan &&
        createElement("span", {
            style: "display:flex; height:50px; width:50px; background-color: white;",
        }));
};
var Foo = function () {
    // console.log("Foo");
    var _a = useState(2), x = _a[0], setX = _a[1];
    var foo = createElement("div", // view parent of Bar, so need to replace the instance with the recomputed instance
    {}, createElement("article", null), createElement("button", {
        innerText: "another counter, a little deeper: ".concat(x),
        onclick: function () {
            setX(x + 1);
        },
    }));
    return foo;
};
var PropsTest = function (props) {
    // console.log("PropsTest");
    var _a = useState(false), update = _a[0], setUpdate = _a[1];
    // console.log("props test", props, props.children);
    var isPropsSomething = !!props.children;
    // console.log('am i being re-rendered');
    return createElement.apply(void 0, __spreadArray(["div",
        { innerText: "hi" },
        createElement("button", {
            innerText: "trigger update",
            onclick: function () {
                // console.log("click", update);
                setUpdate(!update);
            },
        })], props.children, false));
};
var IsAChild = function () {
    // console.log("IsAChild");
    return createElement("div", { innerText: "im a child!" });
};
// thats why, for whatever reason the root doesn't have a node in the render tree??
// const NestThis = () => {
//   console.log("NestThis");
//   const [x, setX] = useState(2);
//   const childHere = createElement(IsAChild, null);
//   return createElement(
//     "div",
//     null,
//     createElement("button", {
//       innerText: "clicka me",
//       onclick: () => {
//         setX(x + 1);
//       },
//     }),
//     createElement("div", {
//       innerText: `Count: ${x}`,
//       style: "color:white;",
//     }),
//     createElement(Component, null),
//     createElement(PropsTest, null, childHere)
//   );
// };
var Component = function (props) {
    // console.log("Component");
    // console.log("am i running?");
    var _a = useState(2), x = _a[0], setX = _a[1];
    // console.log("value being read", x);
    return createElement("div", {
        lol: "ok",
    }, createElement("button", {
        innerText: "so many counters me",
        onclick: function () {
            setX(x + 1);
        },
    }), createElement("div", {
        innerText: "look at this count?: ".concat(x),
        style: "color:white;",
    }), createElement(Bar, null), createElement("span", {
        innerText: "im a span!",
    }));
};
var NestThis = function () {
    return createElement(SimpleParent, null, createElement(SimpleChild, null), createElement("div", {
        innerText: "part of the simple child",
    }), createElement(Component, null));
};
var SimpleParent = function (props) {
    // console.log("rendering simple parent");
    var _a = useState(2), x = _a[0], setX = _a[1];
    return createElement.apply(void 0, __spreadArray(["div",
        null,
        createElement("button", {
            onclick: function () {
                setX(x + 1);
            },
            innerText: "trigger update",
        }),
        createElement("div", {
            innerText: "parent of the simple parent",
        })], props.children, false));
};
var SimpleChild = function () {
    // console.log("rendering simple child");
    return createElement("h2", {
        innerText: "Im a simple child!!",
    });
};
var applyViewTreeToDomEl = function (_a) {
    var reactViewNode = _a.reactViewNode, parentDomNode = _a.parentDomNode;
    // reactViewNode.metadata
    // switch (reactViewNode.metadata)
    reactViewNode.childNodes.forEach(function (childViewNode) {
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
    // console.log(JSON.stringify(reactViewTree));
    applyViewTreeToDomEl({
        parentDomNode: domEl,
        reactViewNode: reactViewTree.root,
    });
};
var main = function () { };
if (typeof window === "undefined") {
    var _a = buildReactTrees(createElement(NestThis, null)), reactViewTree = _a.reactViewTree, reactRenderTree = _a.reactRenderTree;
    console.log(JSON.stringify(deepTraverseAndModify(reactViewTree)));
}
else {
    window.onload = function () {
        // console.log("loaded");
        render(createElement(NestThis, null), document.getElementById("root"));
    };
}
