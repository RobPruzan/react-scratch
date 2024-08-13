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
var Utils;
(function (Utils) {
    Utils.deepEqual = function (a, b) {
        if (a === b)
            return true;
        if (a && b && typeof a === "object" && typeof b === "object") {
            if (Array.isArray(a) && Array.isArray(b)) {
                if (a.length !== b.length)
                    return false;
                for (var i = 0; i < a.length; i++) {
                    if (!Utils.deepEqual(a[i], b[i])) {
                        return false;
                    }
                }
                return true;
            }
            if (a.constructor !== b.constructor) {
                return false;
            }
            var keysA = Object.keys(a);
            var keysB = Object.keys(b);
            if (keysA.length !== keysB.length) {
                return false;
            }
            for (var _i = 0, keysA_1 = keysA; _i < keysA_1.length; _i++) {
                var key = keysA_1[_i];
                if (!keysB.includes(key)) {
                    return false;
                }
                if (!Utils.deepEqual(a[key], b[key])) {
                    return false;
                }
            }
            return true;
        }
        return false;
    };
    Utils.deepCloneTree = function (obj) {
        if (obj === null || typeof obj !== "object") {
            return obj;
        }
        if (obj instanceof HTMLElement) {
            return obj;
        }
        if (typeof obj === "function") {
            return obj.bind({});
        }
        var copy = Array.isArray(obj) ? [] : {};
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                copy[key] = obj[key];
            }
        }
        return copy;
    };
    Utils.findNodeOrThrow = function (eq, tree) {
        var aux = function (viewNode) {
            for (var _i = 0, _a = viewNode.childNodes; _i < _a.length; _i++) {
                var node = _a[_i];
                if (eq(node)) {
                    return node;
                }
                var res = aux(node);
                if (res) {
                    return res;
                }
            }
        };
        if (eq(tree)) {
            return tree;
        }
        var result = aux(tree);
        if (!result) {
            throw new Error("detached node or wrong id:" + "\n\n" + JSON.stringify(tree));
        }
        return result;
    };
    Utils.findNode = function (eq, tree) {
        try {
            return Utils.findNodeOrThrow(eq, tree);
        }
        catch (_a) {
            return null;
        }
    };
    Utils.findParentNodeOrThrow = function (eq, tree) {
        var aux = function (viewNode) {
            for (var _i = 0, _a = viewNode.childNodes; _i < _a.length; _i++) {
                var node = _a[_i];
                if (eq(node)) {
                    return viewNode;
                }
                var res = aux(node);
                if (res) {
                    return res;
                }
            }
        };
        if (eq(tree)) {
            return tree;
        }
        var result = aux(tree);
        if (!result) {
            throw new Error("detached node or wrong id:" + "\n\n" + JSON.stringify(tree));
        }
        return result;
    };
    Utils.findParentNode = function (eq, tree) {
        try {
            return Utils.findParentNodeOrThrow(eq, tree);
        }
        catch (_a) {
            return null;
        }
    };
})(Utils || (Utils = {}));
var React;
(function (React) {
    var run = function (f) { return f(); };
    var getKey = function (renderNode) {
        return (getComponentName(renderNode.internalMetadata) +
            "-" +
            renderNode.localRenderOrder);
    };
    var mapChildNodes = function (_a) {
        var leftNodes = _a.leftNodes, rightNodes = _a.rightNodes;
        // one determines if we immediately delete nodes
        // one determines if we immediately add nodes
        var leftToRight = {};
        var rightToLeft = {};
        var associate = function (_a) {
            var a = _a.a, b = _a.b, aMap = _a.aMap;
            a.forEach(function (leftNode) {
                var associatedRightNode = b.find(function (rightNode) { return rightNode.key === leftNode.key; });
                aMap[leftNode.id] = associatedRightNode !== null && associatedRightNode !== void 0 ? associatedRightNode : null;
            });
        };
        associate({
            a: leftNodes,
            b: rightNodes,
            aMap: leftToRight,
        });
        associate({
            a: rightNodes,
            b: leftNodes,
            aMap: rightToLeft,
        });
        return [leftToRight, rightToLeft];
    };
    var updateDom = function (_a) {
        var props = _a.props, tagComponent = _a.tagComponent, previousDomRef = _a.previousDomRef, lastParent = _a.lastParent, insertedBefore = _a.insertedBefore;
        if (previousDomRef) {
            Object.assign(previousDomRef, props);
            tagComponent.domRef = previousDomRef;
            return previousDomRef;
        }
        var newEl = document.createElement(tagComponent.tagName);
        Object.assign(newEl, props);
        if (insertedBefore) {
            // will append if 2nd arg is null
            lastParent.insertBefore(newEl, insertedBefore.nextSibling);
            tagComponent.domRef = newEl;
            return newEl;
        }
        lastParent.appendChild(newEl);
        tagComponent.domRef = newEl;
        return newEl;
    };
    var findFirstTagNode = function (viewNode) {
        if (viewNode.metadata.component.kind === "tag") {
            return {
                component: viewNode.metadata.component,
                node: viewNode,
            };
        }
        // either returns or the program crashes (:shrug)
        return findFirstTagNode(viewNode.childNodes[0]); // traverse directly down since a functional component will only have one child, should discriminately union this...
    };
    var reconcileDom = function (_a) {
        var newViewTree = _a.newViewTree, oldViewTree = _a.oldViewTree, startingDomNode = _a.startingDomNode;
        var aux = function (_a) {
            var localNewViewTree = _a.localNewViewTree, localOldViewTree = _a.localOldViewTree, lastParent = _a.lastParent, localInsertedBefore = _a.localInsertedBefore;
            // reconciles the parent then moves to children
            var reconcileTags = function (_a) {
                var newNode = _a.newNode, oldNode = _a.oldNode;
                if (Utils.deepEqual(oldNode.node.metadata.props, newNode.node.metadata.props)) {
                    if (!oldNode.component.domRef) {
                        throw new Error("Invariant error, already rendered tree must have dom nodes for every view node");
                    }
                    newNode.component.domRef = oldNode.component.domRef;
                    // i think its a flaw in the logic we handle this takedown twice
                    // but what can u do this has to handle this base case or it will reconcile forever
                    // just because how aux is structured...
                    if (newNode.node.childNodes.length === 0) {
                        oldNode.node.childNodes.forEach(function (childNode) {
                            var _a, _b;
                            var tag = findFirstTagNode(childNode);
                            (_b = (_a = tag.component.domRef) === null || _a === void 0 ? void 0 : _a.parentElement) === null || _b === void 0 ? void 0 : _b.removeChild(tag.component.domRef);
                            return newNode.component.domRef;
                        });
                    }
                    aux({
                        localNewViewTree: newNode.node,
                        localOldViewTree: oldNode.node,
                        lastParent: newNode.component.domRef, // maybe this breaks stuff?
                        localInsertedBefore: localInsertedBefore,
                    });
                    return { updatedOrAppendedDomElement: newNode.component.domRef };
                }
                else {
                    var newEl_1 = updateDom({
                        lastParent: lastParent,
                        previousDomRef: oldNode.component.domRef,
                        props: newNode.node.metadata.props,
                        tagComponent: newNode.component,
                        insertedBefore: localInsertedBefore,
                    });
                    if (newNode.node.childNodes.length === 0) {
                        oldNode.node.childNodes.forEach(function (childNode) {
                            var _a, _b;
                            var tag = findFirstTagNode(childNode);
                            (_b = (_a = tag.component.domRef) === null || _a === void 0 ? void 0 : _a.parentElement) === null || _b === void 0 ? void 0 : _b.removeChild(tag.component.domRef);
                            return newEl_1;
                        });
                    }
                    aux({
                        localNewViewTree: newNode.node, // a function should only ever one child. If it returns a null it should never be rendered in the first place
                        localOldViewTree: oldNode.node, // very naive check, but it will fail quickly once they start comparing tags
                        lastParent: newEl_1,
                        localInsertedBefore: localInsertedBefore, // how do u know??
                    });
                    return { updatedOrAppendedDomElement: newEl_1 };
                }
            };
            switch (localNewViewTree.metadata.component.kind) {
                case "function": {
                    var oldNode = localOldViewTree
                        ? findFirstTagNode(localOldViewTree)
                        : null;
                    var newNode = findFirstTagNode(localNewViewTree);
                    if (!oldNode) {
                        return aux({
                            localNewViewTree: newNode.node,
                            localOldViewTree: null,
                            lastParent: lastParent,
                            localInsertedBefore: localInsertedBefore,
                        });
                    }
                    return reconcileTags({ newNode: newNode, oldNode: oldNode });
                }
                case "tag": {
                    if (!localOldViewTree) {
                        var newEl = updateDom({
                            lastParent: lastParent,
                            tagComponent: localNewViewTree.metadata.component,
                            previousDomRef: null,
                            props: localNewViewTree.metadata.props,
                            insertedBefore: localInsertedBefore,
                        });
                        var lastInserted_1 = newEl;
                        for (var index = 0; index < localNewViewTree.childNodes.length; index++) {
                            var childNode = localNewViewTree.childNodes[index];
                            var insertBeforeViewNode = localNewViewTree.childNodes.at(index - 1);
                            lastInserted_1 = aux({
                                localNewViewTree: findFirstTagNode(childNode).node,
                                localOldViewTree: null,
                                lastParent: newEl,
                                localInsertedBefore: insertBeforeViewNode
                                    ? findFirstTagNode(insertBeforeViewNode).component.domRef
                                    : null,
                            }).updatedOrAppendedDomElement;
                        }
                        return { updatedOrAppendedDomElement: lastInserted_1 };
                    }
                    var _b = mapChildNodes({
                        leftNodes: localOldViewTree.childNodes,
                        rightNodes: localNewViewTree.childNodes,
                    }), oldToNew_1 = _b[0], newToOld_1 = _b[1];
                    // to remove
                    localOldViewTree.childNodes.forEach(function (oldNode) {
                        var _a, _b;
                        var associatedWith = oldToNew_1[oldNode.id];
                        if (!associatedWith) {
                            var tag = findFirstTagNode(oldNode);
                            (_b = (_a = tag.component.domRef) === null || _a === void 0 ? void 0 : _a.parentElement) === null || _b === void 0 ? void 0 : _b.removeChild(tag.component.domRef);
                            return;
                        }
                    });
                    var lastInserted_2;
                    // to add
                    localNewViewTree.childNodes.forEach(function (newNode) {
                        var associatedWith = newToOld_1[newNode.id];
                        if (!associatedWith) {
                            var output = aux({
                                lastParent: lastParent,
                                localNewViewTree: findFirstTagNode(newNode).node,
                                localOldViewTree: null,
                                localInsertedBefore: lastInserted_2,
                            });
                            lastInserted_2 = output.updatedOrAppendedDomElement;
                            return;
                        }
                        switch (newNode.metadata.component.kind) {
                            case "function": {
                                var output = aux({
                                    lastParent: lastParent,
                                    localNewViewTree: findFirstTagNode(newNode).node,
                                    localOldViewTree: findFirstTagNode(associatedWith).node,
                                    localInsertedBefore: lastInserted_2,
                                });
                                lastInserted_2 = output.updatedOrAppendedDomElement;
                                return;
                            }
                            case "tag": {
                                if (!(associatedWith.metadata.component.kind === "tag")) {
                                    throw new Error("Invariant error, this comparison should never happen");
                                }
                                var existingDomRef = associatedWith.metadata.component.domRef;
                                if (!existingDomRef) {
                                    throw new Error("Invariant error, never should have an old view tree that doesn't have a created dom node");
                                }
                                if (Utils.deepEqual(newNode.metadata.props, associatedWith.metadata.props)) {
                                    newNode.metadata.component.domRef = existingDomRef;
                                    var output = aux({
                                        lastParent: existingDomRef,
                                        localNewViewTree: newNode,
                                        localOldViewTree: associatedWith,
                                        localInsertedBefore: lastInserted_2,
                                    });
                                    lastInserted_2 = output.updatedOrAppendedDomElement;
                                    return;
                                }
                                var newEl = updateDom({
                                    lastParent: lastParent,
                                    props: newNode.metadata.props,
                                    tagComponent: newNode.metadata.component,
                                    previousDomRef: existingDomRef,
                                    insertedBefore: lastInserted_2,
                                });
                                aux({
                                    lastParent: newEl,
                                    localNewViewTree: newNode,
                                    localOldViewTree: associatedWith,
                                    localInsertedBefore: lastInserted_2, // no way to know yet
                                });
                                lastInserted_2 = newEl;
                                return;
                            }
                        }
                    });
                    var ref = findFirstTagNode(localNewViewTree).component.domRef;
                    if (ref) {
                        return {
                            updatedOrAppendedDomElement: ref,
                        };
                    }
                    /**
                     * Case has no child nodes
                     * Has an old node to comp against
                     * Should deep equal them + update dom accordingly
                     *
                     * Note: not tested
                     */
                    var firstOldTag = findFirstTagNode(localOldViewTree);
                    return reconcileTags({
                        newNode: {
                            component: localNewViewTree.metadata.component,
                            node: localNewViewTree,
                        },
                        oldNode: firstOldTag,
                    });
                }
            }
        };
        return aux({
            lastParent: startingDomNode,
            localNewViewTree: newViewTree,
            localOldViewTree: oldViewTree,
            localInsertedBefore: null,
        });
    };
    var mapComponentToTaggedUnion = function (component) {
        return typeof component === "string"
            ? { kind: "tag", tagName: component, domRef: null }
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
    var getComponentRepr = function (internalMetadata) {
        return getComponentName(internalMetadata) +
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
        //
        if (!((_a = currentTreeRef.renderTree) === null || _a === void 0 ? void 0 : _a.currentlyRendering)) {
            var rootRenderNode = {
                internalMetadata: internalMetadata,
                id: crypto.randomUUID(),
                childNodes: [],
                computedViewTreeNodeId: null,
                hooks: [],
                localRenderOrder: 0,
                hasRendered: false,
            };
            currentTreeRef.renderTree = {
                localCurrentHookOrder: 0,
                currentlyRendering: null,
                root: rootRenderNode,
                localComponentRenderMap: {},
                lastRenderChildNodes: [],
            };
            return rootRenderNode;
        }
        var newLocalRenderOrder = ((_b = currentTreeRef.renderTree.localComponentRenderMap[getComponentName(internalMetadata)]) !== null && _b !== void 0 ? _b : 0) + 1;
        currentTreeRef.renderTree.localComponentRenderMap[getComponentName(internalMetadata)] = newLocalRenderOrder;
        var existingNode = currentTreeRef.renderTree.lastRenderChildNodes.find(function (childNode) {
            var name = getComponentName(childNode.internalMetadata);
            if (name === getComponentName(internalMetadata) &&
                childNode.localRenderOrder === newLocalRenderOrder) {
                return true;
            }
        });
        // order doesn't matter, but doesn't hurt to maintain it for the future incase we do care
        if (existingNode) {
            existingNode.internalMetadata = internalMetadata;
            if (children.length === 0) {
                // if its a leaf node append to the end (guaranteed order is right)
                currentTreeRef.renderTree.currentlyRendering.childNodes.push(existingNode);
                return existingNode;
            }
            // else prepend since this is the new root for all the children just appended (must execute before since they are arguments)
            currentTreeRef.renderTree.currentlyRendering.childNodes.push(existingNode);
            return existingNode;
        }
        var newRenderTreeNode = {
            id: crypto.randomUUID(),
            childNodes: [],
            computedViewTreeNodeId: null,
            internalMetadata: internalMetadata,
            hooks: [],
            localRenderOrder: newLocalRenderOrder,
            hasRendered: false,
        };
        if (children.length === 0) {
            currentTreeRef.renderTree.currentlyRendering.childNodes.push(newRenderTreeNode);
            return newRenderTreeNode;
        }
        currentTreeRef.renderTree.currentlyRendering.childNodes.push(newRenderTreeNode);
        return newRenderTreeNode;
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
    function calculateJsonBytes(jsonString) {
        return new Blob([jsonString]).size;
    }
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
        });
    };
    var generateViewTreeHelper = function (_a) {
        var renderTreeNode = _a.renderTreeNode, startingFromRenderNodeId = _a.startingFromRenderNodeId;
        if (!currentTreeRef.renderTree) {
            throw new Error("Cannot render component outside of react tree");
        }
        // console.log(
        //   "bytes of render tree",
        //   calculateJsonBytes(JSON.stringify(currentTreeRef.renderTree))
        // );
        var newNode = {
            id: crypto.randomUUID(),
            metadata: renderTreeNode.internalMetadata,
            childNodes: [],
            key: getKey(renderTreeNode),
        };
        renderTreeNode.computedViewTreeNodeId = newNode.id;
        switch (renderTreeNode.internalMetadata.component.kind) {
            case "tag": {
                var fullyComputedChildren = renderTreeNode.internalMetadata.children.map(function (child) {
                    var reRenderChild = function () {
                        var viewNode = generateViewTreeHelper({
                            renderTreeNode: child,
                            startingFromRenderNodeId: startingFromRenderNodeId,
                        });
                        if (viewNode.childNodes.length > 1) {
                            throw new Error("Invariant error, should never have more than one child");
                        }
                        return { viewNode: viewNode, renderNode: child };
                    };
                    if (!child.computedViewTreeNodeId) {
                    }
                    if (!currentTreeRef.viewTree) {
                        return reRenderChild();
                    }
                    var computedNode = Utils.findNode(function (node) { return node.id === child.computedViewTreeNodeId; }, currentTreeRef.viewTree.root);
                    if (!computedNode) {
                        return reRenderChild();
                    }
                    var shouldReRender = isChildOf({
                        potentialChildId: child.id,
                        potentialParentId: startingFromRenderNodeId,
                    });
                    // const parentRenderNode = findNodeOrThrow(
                    //   (node) => node.id === startingFromRenderNodeId,
                    //   currentTreeRef.renderTree?.root!
                    // );
                    if (!shouldReRender) {
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
                currentTreeRef.renderTree.lastRenderChildNodes =
                    renderTreeNode.childNodes;
                renderTreeNode.childNodes = [];
                currentTreeRef.renderTree.currentlyRendering = renderTreeNode;
                console.log("Running:", getComponentRepr(renderTreeNode.internalMetadata));
                // this output is the root "render node" generated by createElement of the fn
                // the render tree is built out internally every time createElement is called
                var computedRenderTreeNode = renderTreeNode.internalMetadata.component.function(__assign(__assign({}, renderTreeNode.internalMetadata.props), childrenSpreadProps));
                renderTreeNode.hasRendered = true;
                // NOTE: Below is untested, but should be close to working considering state correctly persists/ is taken down
                var newRenderNodes = renderTreeNode.childNodes
                    .filter(function (node) {
                    return !currentTreeRef.renderTree.lastRenderChildNodes.some(function (prevNode) { return getKey(prevNode) === getKey(node); });
                })
                    .forEach(function (node) {
                    // console.log(
                    //   "added to render tree:",
                    //   node,
                    //   // renderTreeNode.childNodes.at(-1),
                    //   "new",
                    //   renderTreeNode.childNodes.map(getKey),
                    //   renderTreeNode.childNodes,
                    //   "old",
                    //   currentTreeRef.renderTree!.lastRenderChildNodes.map(getKey),
                    //   currentTreeRef.renderTree!.lastRenderChildNodes
                    // );
                    // future mounting logic;
                });
                var removedRenderNodes = currentTreeRef.renderTree.lastRenderChildNodes
                    .filter(function (node) {
                    return !renderTreeNode.childNodes.some(function (newNode) { return getKey(newNode) === getKey(node); });
                })
                    .forEach(function (node) {
                    // console.log("removed from render tree", node);
                });
                currentTreeRef.renderTree.lastRenderChildNodes = [];
                var viewNode = generateViewTreeHelper({
                    renderTreeNode: computedRenderTreeNode,
                    startingFromRenderNodeId: renderTreeNode.id,
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
        });
        console.log("RENDER END----------------------------------------------\n\n");
        var reactViewTree = {
            root: output,
        };
        currentTreeRef.viewTree = reactViewTree;
        currentTreeRef.renderTree.currentlyRendering = null;
        return {
            reactRenderTree: currentTreeRef.renderTree,
            reactViewTree: currentTreeRef.viewTree,
        };
    };
    React.useState = function (initialValue) {
        var _a;
        if (!((_a = currentTreeRef.renderTree) === null || _a === void 0 ? void 0 : _a.currentlyRendering)) {
            throw new Error("Cannot call use state outside of a react component");
        }
        var currentStateOrder = currentTreeRef.renderTree.localCurrentHookOrder;
        currentTreeRef.renderTree.localCurrentHookOrder += 1;
        var capturedCurrentlyRenderingRenderNode = currentTreeRef.renderTree.currentlyRendering;
        // const hasNode = findNode(
        //   (node) => node.id === capturedCurrentlyRenderingRenderNode.id,
        //   currentTreeRef.renderTree.root
        // );
        if (!capturedCurrentlyRenderingRenderNode.hasRendered) {
            capturedCurrentlyRenderingRenderNode.hooks[currentStateOrder] = {
                kind: "state",
                value: initialValue,
            };
        }
        var hookMetadata = capturedCurrentlyRenderingRenderNode.hooks[currentStateOrder];
        return [
            hookMetadata.value,
            function (value) {
                if (!capturedCurrentlyRenderingRenderNode.computedViewTreeNodeId) {
                    throw new Error("Invariant: set state trying to re-render unmounted component");
                }
                if (!currentTreeRef.viewTree || !currentTreeRef.renderTree) {
                    throw new Error("Invariant error, no view tree or no render tree");
                }
                hookMetadata.value = value;
                var parentNode = findParentViewNode(capturedCurrentlyRenderingRenderNode.computedViewTreeNodeId);
                console.log("\n\nRENDER START----------------------------------------------");
                var previousViewTree = Utils.deepCloneTree(Utils.findNodeOrThrow(function (node) {
                    return node.id ===
                        capturedCurrentlyRenderingRenderNode.computedViewTreeNodeId;
                }, currentTreeRef.viewTree.root));
                var reGeneratedViewTree = generateViewTree({
                    renderTreeNode: capturedCurrentlyRenderingRenderNode,
                });
                // console.log("the regenerated view tree", reGeneratedViewTree);
                console.log("RENDER END----------------------------------------------\n\n");
                // its a detached node and because of that we set it as the root
                var index = parentNode === null || parentNode === void 0 ? void 0 : parentNode.childNodes.findIndex(function (node) { return getKey(capturedCurrentlyRenderingRenderNode) === node.key; });
                // this will always be in the parent nodes children (or is root)
                // because we re-rendered at capturedCurrentlyRenderingRenderNode,
                // so the previous parent must contain it
                // we can now update the view tree by replacing by component
                // equality (lets go keys)
                if (!parentNode || index === undefined || index === -1) {
                    currentTreeRef.viewTree.root = reGeneratedViewTree;
                    currentTreeRef.renderTree.root.computedViewTreeNodeId =
                        reGeneratedViewTree.id;
                }
                else {
                    parentNode.childNodes[index] = reGeneratedViewTree;
                }
                reconcileDom({
                    newViewTree: reGeneratedViewTree,
                    oldViewTree: previousViewTree,
                    startingDomNode: run(function () {
                        switch (previousViewTree.metadata.component.kind) {
                            case "function": {
                                var tagNode = findFirstTagNode(previousViewTree.childNodes[0]);
                                if (!tagNode.component.domRef) {
                                    throw new Error("Invariant error, an already reconciled tree should have dom elements on every element");
                                }
                                return tagNode.component.domRef;
                            }
                            case "tag": {
                                var el = previousViewTree.metadata.component.domRef;
                                if (!el) {
                                    throw new Error("Invariant error, an already reconciled tree should have dom elements on every element");
                                }
                                return el;
                            }
                        }
                    }),
                });
            },
        ];
    };
    React.render = function (rootElement, domEl) {
        var reactViewTree = React.buildReactTrees(rootElement).reactViewTree;
        reconcileDom({
            oldViewTree: null,
            newViewTree: reactViewTree.root,
            startingDomNode: domEl,
        });
    };
})(React || (React = {}));
var Debug;
(function (Debug) {
    Debug.Bar = function () {
        var _a = React.useState(false), isRenderingSpan = _a[0], setIsRenderingSpan = _a[1];
        var _b = React.useState(2), x = _b[0], setX = _b[1];
        return React.createElement("area", {}, React.createElement(Debug.Foo, null), React.createElement("button", {
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
    Debug.ConditionalRender = function () {
        var _a = React.useState(false), isRenderingSpan = _a[0], setIsRenderingSpan = _a[1];
        return React.createElement("div", null, React.createElement("button", {
            innerText: "conditional render",
            onclick: function () {
                setIsRenderingSpan(!isRenderingSpan);
            },
        }), isRenderingSpan &&
            React.createElement("span", {
                style: "display:flex; height:50px; width:50px; background-color: white;",
            }));
    };
    Debug.Foo = function () {
        var _a = React.useState(2), x = _a[0], setX = _a[1];
        var foo = React.createElement("div", {}, React.createElement("article", null), React.createElement("button", {
            innerText: "another counter, a little deeper: ".concat(x),
            onclick: function () {
                setX(x + 1);
            },
        }));
        return foo;
    };
    Debug.PropsTest = function (props) {
        var _a = React.useState(false), update = _a[0], setUpdate = _a[1];
        return React.createElement.apply(React, __spreadArray(["div",
            { innerText: "hi" },
            React.createElement("button", {
                innerText: "trigger update",
                onclick: function () {
                    // console.log('el', );
                    setUpdate(!update);
                },
            })], props.children, false));
    };
    Debug.IsAChild = function () {
        return React.createElement("div", { innerText: "im a child!" });
    };
    Debug.Component = function (props) {
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
        }), React.createElement(Debug.Bar, null), React.createElement("span", {
            innerText: "im a span!",
        }));
    };
    Debug.SimpleParent = function (props) {
        var _a = React.useState(2), x = _a[0], setX = _a[1];
        return React.createElement.apply(React, __spreadArray(["div",
            null,
            React.createElement("button", {
                onclick: function () {
                    setTimeout(function () {
                        console.log("doing it!!");
                        document.getElementById("nest-this").id = "test";
                    }, 1500);
                    setX(x + 1);
                },
                innerText: "trigger update",
            }),
            React.createElement("div", {
                innerText: "parent of the simple parent",
            })], props.children, false));
    };
    Debug.NestThis = function () {
        var _a = React.useState(2), x = _a[0], setX = _a[1];
        return React.createElement("div", {
            id: "nest-this",
        }, React.createElement(Debug.SimpleChild, null), React.createElement(Debug.SimpleParent, null, React.createElement(Debug.SimpleChild, null)), 
        // React.createElement("div", {
        //   innerText: "part of the simple child",
        // }),
        // this breaks current reconciliation, it obviously can't correctly map
        React.createElement(Debug.Increment, null), React.createElement(Debug.Increment, null), React.createElement(Debug.Component, null), React.createElement("div", {
            style: "color:blue",
        }, React.createElement("button", {
            innerText: "RERENDER IT ALLL" + x,
            onclick: function () {
                setX(x + 1);
            },
            style: "color: orange",
        })));
    };
    Debug.AnotherLevel = function () {
        return React.createElement("div", null, React.createElement(Debug.Increment, null), React.createElement(Debug.Increment, null));
    };
    Debug.Increment = function () {
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
    Debug.SimpleChild = function () {
        return React.createElement("h2", {
            innerText: "Im a simple child!!",
        });
    };
    Debug.OuterWrapper = function () {
        var _a = React.useState(0), counter = _a[0], setCounter = _a[1];
        var _b = React.useState(true), toggleInner = _b[0], setToggleInner = _b[1];
        var _c = React.useState([1, 2, 3, 4]), items = _c[0], setItems = _c[1];
        return React.createElement.apply(React, __spreadArray(["div",
            {
                id: "outer-wrapper",
                style: "border: 2px solid black; padding: 10px; margin: 10px;",
            },
            React.createElement("div", {
                innerText: "Counter: " + counter,
            }),
            React.createElement("button", {
                onclick: function () { return setCounter(counter + 1); },
                innerText: "Increase Counter",
            }),
            React.createElement("button", {
                onclick: function () { return setToggleInner(!toggleInner); },
                innerText: toggleInner ? "Hide Inner" : "Show Inner",
            }),
            React.createElement("button", {
                onclick: function () {
                    setItems(__spreadArray(__spreadArray([], items, true), [Math.random()], false));
                },
                innerText: "Add a random value",
            }),
            React.createElement("button", {
                onclick: function () {
                    setItems(items.slice(0, -1));
                },
                innerText: "Remove last value",
            }),
            toggleInner && React.createElement(Debug.InnerWrapper, { counter: counter }),
            React.createElement(Debug.DualIncrementer, null)], items.map(function (i) {
            return React.createElement("div", {
                innerText: i,
            });
        })
        // React.createElement(DualIncrementer, null)
        , false));
    };
    Debug.InnerWrapper = function (_a) {
        var counter = _a.counter;
        var _b = React.useState(0), innerCounter = _b[0], setInnerCounter = _b[1];
        // this evaluates in the wrong order for our logic to work
        // it will push it last
        // but why does that matter ,we initially had the sassumption all that wuld matter was the view tree
        // because we traverse the lrender node to generate the view tree, so of course that order would matter
        // we may need a temp ds to keep track of this tree so we can properly reconstruct it
        // the children could be useful? Using the return values instead of over complicating it
        return React.createElement("div", {
            id: "IM AN INNER",
            style: "border: 1px solid gray; padding: 10px; margin: 10px;",
        }, React.createElement("div", {
            innerText: "Inner Counter: " + innerCounter,
        }), React.createElement("button", {
            onclick: function () { return setInnerCounter(innerCounter + 1); },
            innerText: "Increase Inner Counter",
        }), React.createElement("div", {
            innerText: "Outer Counter Value: " + counter,
        }), React.createElement(Debug.LeafComponent, null), React.createElement(Debug.ContainerComponent, null));
    };
    Debug.LeafComponent = function () {
        return React.createElement("div", {
            id: "leaf-component",
            style: "padding: 5px; margin: 5px; background-color: lightgray;",
            innerText: "Leaf Component Content",
        });
    };
    Debug.ContainerComponent = function () {
        return React.createElement("div", {
            id: "container-component",
            style: "padding: 5px; margin: 5px; background-color: lightblue;",
        }, React.createElement(Debug.LeafComponent, null)
        // React.createElement(LeafComponent, null)
        );
    };
    Debug.DualIncrementer = function () {
        var _a = React.useState(0), value = _a[0], setValue = _a[1];
        return React.createElement("div", {
            id: "dual-incrementer",
            style: "padding: 5px; margin: 5px; border: 1px solid red;",
        }, React.createElement("div", {
            innerText: "Current Value: " + value,
        }), React.createElement("button", {
            onclick: function () { return setValue(value + 1); },
            innerText: "Increase Value",
        }));
    };
    var ActionButton = function () {
        return React.createElement("div", {
            id: "action-button",
            style: "padding: 5px; margin: 5px; border: 1px solid green;",
        }, React.createElement("button", {
            onclick: function () { return alert("Action performed!"); },
            innerText: "Perform Action",
        }));
    };
    Debug.MainComponent = function (_a) {
        var children = _a.children;
        var _b = React.useState(2), x = _b[0], setX = _b[1];
        return React.createElement.apply(React, __spreadArray(["div",
            {
                id: "main-component",
            },
            React.createElement(Debug.LeafComponent, null),
            // React.createElement(
            //   ContainerComponent,
            //   null,
            //   React.createElement(LeafComponent, null)
            // ),
            React.createElement(Debug.DualIncrementer, null),
            // React.createElement(DualIncrementer, null),
            React.createElement(ActionButton, null),
            React.createElement(Debug.OuterWrapper, null),
            React.createElement("div", {
                style: "color:blue",
            }, React.createElement("button", {
                onclick: function () { return setX(x + 1); },
                innerText: "RERENDER EVERYTHING " + x,
                style: "color: orange",
            }))], children, false));
    };
    Debug.MegaChild = function () {
        return React.createElement("div", {
            innerText: "ima mega child",
        });
    };
})(Debug || (Debug = {}));
if (typeof window === "undefined") {
    var _a = React.buildReactTrees(React.createElement(Debug.Increment, null)), reactViewTree = _a.reactViewTree, reactRenderTree = _a.reactRenderTree;
    console.log(JSON.stringify(React.deepTraverseAndModify(reactViewTree)));
}
else {
    window.onload = function () {
        React.render(React.createElement(Debug.MainComponent, null, React.createElement(Debug.MegaChild, null)), document.getElementById("root"));
    };
}
