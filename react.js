var createElementFromNode = function (node) {
    var newEl = document.createElement(node.tagName);
    return newEl;
};
var render = function (node, domElement) {
    console.log("rendering root");
    var el = createElementFromNode(node);
    domElement.appendChild(el);
};
window.onload = function () {
    render({
        tagName: "div",
    }, document.getElementById("root"));
};
