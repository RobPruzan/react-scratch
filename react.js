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
var React;
(function (React) {
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
    React.createElement = function (component, props) {
        var _a, _b;
        var children = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            children[_i - 2] = arguments[_i];
        }
        var internalMetadata = mapExternalMetadataToInternalMetadata({
            internalMetadata: {
                children: children.filter(toChild),
                component: component,
                props: props,
            },
        });
        if (!((_a = currentTreeRef.renderTree) === null || _a === void 0 ? void 0 : _a.currentlyRendering)) {
            var rootRenderNode = {
                internalMetadata: internalMetadata,
                id: crypto.randomUUID(),
                childNodes: [],
                computedViewTreeNodeId: null,
                hooks: [],
                localRenderOrder: 0,
                isFirstRender: true,
            };
            currentTreeRef.renderTree = {
                localCurrentHookOrder: 0,
                currentlyRendering: null,
                root: rootRenderNode,
                // isFirstRender: true, // i don't think we actually want this
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
            isFirstRender: true,
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
     * Outputs a new view tree based on the provided render node
     *
     */
    var generateViewTree = function (_a) {
        var renderTreeNode = _a.renderTreeNode;
        return generateViewTreeHelper({
            renderTreeNode: renderTreeNode,
            startingFromRenderNodeId: renderTreeNode.id,
            viewNodePool: [],
        });
    };
    var generateViewTreeHelper = function (_a) {
        var renderTreeNode = _a.renderTreeNode, startingFromRenderNodeId = _a.startingFromRenderNodeId, viewNodePool = _a.viewNodePool;
        if (!currentTreeRef.renderTree) {
            throw new Error("Cannot render component outside of react tree");
        }
        var newNode = {
            id: crypto.randomUUID(),
            metadata: renderTreeNode.internalMetadata,
            childNodes: [],
        };
        // currentTreeRef.viewTree.viewNodePool.push(newNode);
        renderTreeNode.computedViewTreeNodeId = newNode.id;
        // the idea is we immediately execute the children before running the parent
        // then later when attempting to access its children it will check if its already computed
        // but the current problem is it seems the computed view node is not on the tree before we attempt to access it
        // so we should make a pool of view nodes that we can access during render
        switch (renderTreeNode.internalMetadata.component.kind) {
            case "tag": {
                var fullyComputedChildren = renderTreeNode.internalMetadata.children.map(function (child) {
                    var _a;
                    var reRenderChild = function () {
                        var viewNode = generateViewTreeHelper({
                            renderTreeNode: child,
                            startingFromRenderNodeId: startingFromRenderNodeId,
                            viewNodePool: viewNodePool,
                        });
                        if (viewNode.childNodes.length > 1) {
                            throw new Error("Invariant error, should never have more than one child");
                        }
                        return { viewNode: viewNode, renderNode: child };
                    };
                    var computedNode = viewNodePool.find(function (node) { return node.id === child.computedViewTreeNodeId; });
                    if (!child.computedViewTreeNodeId) {
                        // logging only
                    }
                    if (!computedNode) {
                        return reRenderChild();
                    }
                    var shouldReRender = isChildOf({
                        potentialChildId: child.id,
                        potentialParentId: startingFromRenderNodeId,
                    });
                    var parentRenderNode = findNode(startingFromRenderNodeId, (_a = currentTreeRef.renderTree) === null || _a === void 0 ? void 0 : _a.root);
                    if (!shouldReRender) {
                        console.log("skipping re-rendering, ".concat(getComponentName(child.internalMetadata), " not a child of ").concat(getComponentName(parentRenderNode.internalMetadata)));
                        // skip re-rendering if not a child in the render tree
                        return { viewNode: computedNode, renderNode: child };
                    }
                    return reRenderChild();
                });
                newNode.childNodes = fullyComputedChildren.map(function (_a) {
                    var viewNode = _a.viewNode;
                    return viewNode;
                });
                break;
            }
            case "function": {
                var childrenSpreadProps = renderTreeNode.internalMetadata.children.length > 0
                    ? {
                        children: renderTreeNode.internalMetadata.children,
                    }
                    : false;
                currentTreeRef.renderTree.localCurrentHookOrder = 0;
                currentTreeRef.renderTree.localComponentRenderMap = {};
                currentTreeRef.renderTree.currentlyRendering = renderTreeNode;
                console.log("Running:", getComponentName(renderTreeNode.internalMetadata));
                var computedRenderTreeNode = renderTreeNode.internalMetadata.component.function(__assign(__assign({}, renderTreeNode.internalMetadata.props), childrenSpreadProps));
                renderTreeNode.isFirstRender = false;
                var viewNode = generateViewTreeHelper({
                    renderTreeNode: computedRenderTreeNode,
                    startingFromRenderNodeId: renderTreeNode.id,
                    viewNodePool: viewNodePool,
                });
                newNode.childNodes.push(viewNode);
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
    React.deepTraverseAndModify = deepTraverseAndModify;
    React.buildReactTrees = function (rootRenderTreeNode) {
        if (!currentTreeRef.renderTree) {
            throw new Error("Root node passed is not apart of any react render tree");
        }
        console.log("\n\nRENDER START----------------------------------------------");
        var output = generateViewTree({
            renderTreeNode: rootRenderTreeNode,
            // startingFromRenderNodeId: rootRenderTreeNode.id,
        });
        console.log("RENDER END----------------------------------------------\n\n");
        var reactViewTree = {
            root: output,
        };
        currentTreeRef.viewTree = reactViewTree;
        currentTreeRef.renderTree.currentlyRendering = null;
        // currentTreeRef.renderTree.isFirstRender = false;
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
    React.useState = function (initialValue) {
        var _a;
        if (!((_a = currentTreeRef.renderTree) === null || _a === void 0 ? void 0 : _a.currentlyRendering)) {
            throw new Error("Cannot call use state outside of a react component");
        }
        var currentStateOrder = currentTreeRef.renderTree.localCurrentHookOrder;
        currentTreeRef.renderTree.localCurrentHookOrder += 1;
        var capturedCurrentlyRenderingRenderNode = currentTreeRef.renderTree.currentlyRendering;
        if (capturedCurrentlyRenderingRenderNode.isFirstRender) {
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
                };
                var captureNodeId = capturedCurrentlyRenderingRenderNode.computedViewTreeNodeId;
                // console.log('previ');
                // err here
                var parentNode = findParentViewNode(captureNodeId);
                console.log("\n\nRENDER START----------------------------------------------");
                var reGeneratedViewTree = generateViewTree({
                    renderTreeNode: capturedCurrentlyRenderingRenderNode,
                    // startingFromRenderNodeId: capturedCurrentlyRenderingRenderNode.id,
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
                // next step is to diff the previous tree and current tree to determine set of updates needed to apply
                var root = document.getElementById("root");
                while (root.firstChild) {
                    root.removeChild(root.firstChild);
                }
                applyViewTreeToDomEl({
                    parentDomNode: root,
                    reactViewNode: (_a = currentTreeRef.viewTree) === null || _a === void 0 ? void 0 : _a.root,
                });
            },
        ];
    };
    var applyViewTreeToDomEl = function (_a) {
        var reactViewNode = _a.reactViewNode, parentDomNode = _a.parentDomNode;
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
    React.render = function (rootElement, domEl) {
        var reactViewTree = React.buildReactTrees(rootElement).reactViewTree;
        applyViewTreeToDomEl({
            parentDomNode: domEl,
            reactViewNode: reactViewTree.root,
        });
    };
})(React || (React = {}));
var Bar = function () {
    var _a = React.useState(false), isRenderingSpan = _a[0], setIsRenderingSpan = _a[1];
    var _b = React.useState(2), x = _b[0], setX = _b[1];
    return React.createElement("area", {}, React.createElement(Foo, null), React.createElement("button", {
        innerText: "conditional render",
        onclick: function () {
            setIsRenderingSpan(!isRenderingSpan);
        },
    }), React.createElement("button", {
        innerText: "Count: ".concat(x),
        onclick: function () {
            setX(x + 1);
        },
    }), isRenderingSpan &&
        React.createElement("span", {
            style: "display:flex; height:50px; width:50px; background-color: white;",
        }));
};
var Foo = function () {
    var _a = React.useState(2), x = _a[0], setX = _a[1];
    var foo = React.createElement("div", {}, React.createElement("article", null), React.createElement("button", {
        innerText: "another counter, a little deeper: ".concat(x),
        onclick: function () {
            setX(x + 1);
        },
    }));
    return foo;
};
var PropsTest = function (props) {
    var _a = React.useState(false), update = _a[0], setUpdate = _a[1];
    return React.createElement.apply(React, __spreadArray(["div",
        { innerText: "hi" },
        React.createElement("button", {
            innerText: "trigger update",
            onclick: function () {
                setUpdate(!update);
            },
        })], props.children, false));
};
var IsAChild = function () {
    return React.createElement("div", { innerText: "im a child!" });
};
var Component = function (props) {
    var _a = React.useState(2), x = _a[0], setX = _a[1];
    return React.createElement("div", {
        lol: "ok",
    }, React.createElement("button", {
        innerText: "so many counters me",
        onclick: function () {
            setX(x + 1);
        },
    }), React.createElement("div", {
        innerText: "look at this count?: ".concat(x),
        style: "color:white;",
    }), React.createElement(Bar, null), React.createElement("span", {
        innerText: "im a span!",
    }));
};
var SimpleParent = function (props) {
    var _a = React.useState(2), x = _a[0], setX = _a[1];
    return React.createElement.apply(React, __spreadArray(["div",
        null,
        React.createElement("button", {
            onclick: function () {
                setX(x + 1);
            },
            innerText: "trigger update",
        }),
        React.createElement("div", {
            innerText: "parent of the simple parent",
        })], props.children, false));
};
var NestThis = function () {
    return React.createElement(SimpleParent, null, React.createElement(SimpleChild, null), React.createElement("div", {
        innerText: "part of the simple child",
    }), React.createElement(Component, null));
};
var Increment = function () {
    var _a = React.useState(2), x = _a[0], setX = _a[1];
    return React.createElement("div", {
        style: "color:blue",
    }, React.createElement("button", {
        innerText: "so many counters me:" + x,
        onclick: function () {
            setX(x + 1);
        },
        style: "color: orange",
    }));
};
var SimpleChild = function () {
    return React.createElement("h2", {
        innerText: "Im a simple child!!",
    });
};
var main = function () { };
if (typeof window === "undefined") {
    var _a = React.buildReactTrees(React.createElement(Increment, null)), reactViewTree = _a.reactViewTree, reactRenderTree = _a.reactRenderTree;
    console.log(JSON.stringify(React.deepTraverseAndModify(reactViewTree)));
}
else {
    window.onload = function () {
        React.render(React.createElement(NestThis, null), document.getElementById("root"));
    };
}
