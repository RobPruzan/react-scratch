import * as React from "./react/core";

export const Bar = () => {
  const [isRenderingSpan, setIsRenderingSpan] = React.useState(false);
  const [x, setX] = React.useState(2);
  return React.createElement(
    "area",
    {},
    React.createElement(Foo, null),
    React.createElement("button", {
      innerText: "conditional render",
      onclick: () => {
        setIsRenderingSpan(!isRenderingSpan);
      },
    }),
    React.createElement("button", {
      innerText: `Count: ${x}`,
      onclick: () => {
        setX(x + 1);
      },
    }),
    isRenderingSpan &&
      React.createElement("span", {
        style:
          "display:flex; height:50px; width:50px; background-color: white;",
      })
  );
};

export const ConditionalRender = () => {
  const [isRenderingSpan, setIsRenderingSpan] = React.useState(false);
  return React.createElement(
    "div",
    null,
    React.createElement("button", {
      innerText: "conditional render",
      onclick: () => {
        setIsRenderingSpan(!isRenderingSpan);
      },
    }),
    isRenderingSpan &&
      React.createElement("span", {
        style:
          "display:flex; height:50px; width:50px; background-color: white;",
      })
  );
};
export const Foo = () => {
  const [x, setX] = React.useState(2);
  const foo = React.createElement(
    "div",
    {},
    React.createElement("article", null),
    React.createElement("button", {
      innerText: `another counter, a little deeper: ${x}`,
      onclick: () => {
        setX(x + 1);
      },
    })
  );
  return foo;
};

export const PropsTest = (props: any) => {
  const [update, setUpdate] = React.useState(false);
  return React.createElement(
    "div",
    { innerText: "hi" },
    React.createElement("button", {
      innerText: "trigger update",
      onclick: () => {
        // console.log('el', );

        setUpdate(!update);
      },
    }),
    ...props.children
  );
};

export const IsAChild = () => {
  return React.createElement("div", { innerText: "im a child!" });
};
export const Component = (props: any) => {
  const [x, setX] = React.useState(2);
  return React.createElement(
    "div",
    {
      lol: "ok",
    },
    React.createElement("button", {
      innerText: "so many counters me",
      onclick: () => {
        setX(x + 1);
      },
    }),
    React.createElement("div", {
      innerText: `look at this count?: ${x}`,
      style: "color:white;",
    }),
    React.createElement(Bar, null),

    React.createElement("span", {
      innerText: "im a span!",
    })
  );
};

export const SimpleParent = (props: any) => {
  const [x, setX] = React.useState(2);
  return React.createElement(
    "div",
    null,
    React.createElement("button", {
      onclick: () => {
        // setTimeout(() => {
        //   console.log("doing it!!");
        //   document.getElementById("nest-this")!.id = "test";
        // }, 1500);
        setX(x + 1);
      },
      innerText: "trigger update",
    }),
    React.createElement("div", {
      innerText: "parent of the simple parent",
    }),
    ...props.children
  );
};
export const NestThis = () => {
  const [x, setX] = React.useState(2);
  return React.createElement(
    "div",
    {
      id: "nest-this",
    },
    React.createElement(SimpleChild, null),
    React.createElement(
      SimpleParent,
      null,
      React.createElement(SimpleChild, null)
    ),
    // React.createElement("div", {
    //   innerText: "part of the simple child",
    // }),
    // this breaks current reconciliation, it obviously can't correctly map
    React.createElement(Increment, null),
    React.createElement(Increment, null),
    React.createElement(Component, null),
    React.createElement(
      "div",
      {
        style: "color:blue",
      },
      React.createElement("button", {
        innerText: "RERENDER IT ALLL" + x,
        onclick: () => {
          setX(x + 1);
        },
        style: "color: orange",
      })
    )
  );
};
export const AnotherLevel = () => {
  return React.createElement(
    "div",
    null,

    React.createElement(Increment, null),
    React.createElement(Increment, null)
  );
};
export const Increment = () => {
  const [x, setX] = React.useState(2);
  console.log("re-running and reading", x);
  return React.createElement(
    "div",
    {
      style: "color:blue",
    },
    React.createElement("button", {
      innerText: "so many counters me:" + x,
      onclick: () => {
        setX(x + 1);
      },
      style: "color: orange",
    })
  );
};
export const SimpleChild = () => {
  return React.createElement("h2", {
    innerText: "Im a simple child!!",
  });
};
export const RandomElement = () => {
  const [random] = React.useState(Math.random());
  const ref = React.useRef(0);

  React.useEffect(() => {
    // console.log("mounting!", random);
    return () => {
      // console.log("cleanup");
    };
  }, []);

  return React.createElement("div", {
    innerText: random,
  });
};
export const OuterWrapper = () => {
  const [counter, setCounter] = React.useState(0);
  const [toggleInner, setToggleInner] = React.useState(true);
  const [items, setItems] = React.useState([1, 2, 3, 4]);

  return React.createElement(
    "div",
    {
      id: "outer-wrapper",
      style: "border: 2px solid black; padding: 10px; margin: 10px;",
    },
    React.createElement("div", {
      innerText: "Counter: " + counter,
    }),
    React.createElement("button", {
      onclick: () => setCounter(counter + 1),
      innerText: "Increase Counter",
    }),
    React.createElement("button", {
      onclick: () => setToggleInner(!toggleInner),
      innerText: toggleInner ? "Hide Inner" : "Show Inner",
    }),
    React.createElement("button", {
      onclick: () => {
        setItems([...items, Math.random()]);
      },
      innerText: "Add a random value",
    }),
    React.createElement("button", {
      onclick: () => {
        setItems(items.slice(0, -1));
      },
      innerText: "Remove last value",
    }),
    toggleInner && React.createElement(InnerWrapper, { counter }),
    React.createElement(DualIncrementer, null),
    ...items.map((i) =>
      React.createElement("div", null, React.createElement(RandomElement, null))
    ),
    // need to do some light debugging on this
    React.createElement(DualIncrementer, null),
    React.createElement(DualIncrementer, null)
    // React.createElement(DualIncrementer, null)
  );
};

export const InnerWrapper = ({ counter }: any) => {
  const [innerCounter, setInnerCounter] = React.useState(0);

  // this evaluates in the wrong order for our logic to work
  // it will push it last
  // but why does that matter ,we initially had the sassumption all that wuld matter was the view tree
  // because we traverse the lrender node to generate the view tree, so of course that order would matter
  // we may need a temp ds to keep track of this tree so we can properly reconstruct it
  // the children could be useful? Using the return values instead of over complicating it
  return React.createElement(
    "div",
    {
      id: "IM AN INNER",
      style: "border: 1px solid gray; padding: 10px; margin: 10px;",
    },
    React.createElement("div", {
      innerText: "Inner Counter: " + innerCounter,
    }),
    React.createElement("button", {
      onclick: () => setInnerCounter(innerCounter + 1),
      innerText: "Increase Inner Counter",
    }),
    React.createElement("div", {
      innerText: "Outer Counter Value: " + counter,
    }),
    React.createElement(LeafComponent, null),
    React.createElement(ContainerComponent, null)
  );
};

export const LeafComponent = () => {
  return React.createElement("div", {
    id: "leaf-component",
    style: "padding: 5px; margin: 5px; background-color: lightgray;",
    innerText: "Leaf Component Content",
  });
};

export const ContainerComponent = () => {
  return React.createElement(
    "div",
    {
      id: "container-component",
      style: "padding: 5px; margin: 5px; background-color: lightblue;",
    },
    React.createElement(LeafComponent, null)
    // React.createElement(LeafComponent, null)
  );
};

export const DualIncrementer = () => {
  const [value, setValue] = React.useState(0);

  return React.createElement(
    "div",
    {
      id: "dual-incrementer",
      style: "padding: 5px; margin: 5px; border: 1px solid red;",
    },
    React.createElement("div", {
      innerText: "Current Value: " + value,
    }),
    React.createElement("button", {
      onclick: () => setValue(value + 1),
      innerText: "Increase Value",
    })
  );
};

const ActionButton = () => {
  const testReadContext = React.useContext(TestContext);
  console.log({ testReadContext });
  return React.createElement(
    "div",
    {
      id: "action-button",
      style: "padding: 5px; margin: 5px; border: 1px solid green;",
    },
    React.createElement("button", {
      onclick: () => alert("Action performed!"),
      innerText: "Perform Action, reading value of: " + testReadContext.hello,
    })
  );
};

export const MainComponent = ({ children }: any) => {
  const [x, setX] = React.useState(2);
  const memoXPlusOne = React.useMemo(() => x + 1, [x]);

  return React.createElement(
    // @ts-ignore
    TestContext.Provider,
    { value: { hello: x } },
    React.createElement(LeafComponent, null),
    // React.createElement(
    //   ContainerComponent,
    //   null,
    //   React.createElement(LeafComponent, null)
    // ),
    React.createElement(DualIncrementer, null),
    // React.createElement(DualIncrementer, null),
    React.createElement(ActionButton, null),
    React.createElement(OuterWrapper, null),
    React.createElement("div", { innerText: "memo'd x + 1: " + memoXPlusOne }),
    React.createElement(
      "div",
      {
        style: "color:blue",
      },
      React.createElement("button", {
        onclick: () => setX(x + 1),
        innerText: "RERENDER EVERYTHING " + x,
        style: "color: orange",
      })
    ),

    ...children
  );
};

export const MegaChild = () => {
  console.log("megachild re-render");
  return React.createElement("div", {
    innerText: "ima mega child",
  });
};

const ConditionalTest = () => {
  const [cond, setCond] = React.useState(false);

  return React.createElement(
    "div",
    null,
    React.createElement("button", {
      innerText: "toggle",
      onclick: () => {
        setCond(!cond);
      },
    }),
    cond &&
      React.createElement("div", {
        innerText: "look at me!!",
      })
  );
};

const AddItemsTest = () => {
  const [items, setItems] = React.useState([3]);

  return React.createElement(
    "div",
    null,
    React.createElement("button", {
      innerText: "Add random num",
      onclick: () => {
        setItems([...items, Math.random()]);
      },
    }),
    React.createElement("button", {
      innerText: "Remove random num",
      onclick: () => {
        setItems(items.slice(0, -1));
      },
    }),
    React.createElement(ConditionalTest, null),
    ...items.map((item) =>
      React.createElement("div", {
        innerText: item,
      })
    )
  );
};

const ListTest = () => {
  const [prev, trigger] = React.useState(false);
  const x = Array.from({ length: 10 }).map(() =>
    React.createElement(RandomElement, null)
  );
  return React.createElement(
    "span",
    { root: "me" },
    React.createElement("button", {
      innerText: "re-render",
      onclick: () => {
        trigger(!prev);
      },
    }),
    React.createElement("div", { innerText: "what" }),
    ...x
  );
};

const Wrapper = () => {
  return React.createElement(ListTest, {});
};

const ListAndItemUnder = () => {
  const [items, setItems] = React.useState([1, 2, 3]);

  return React.createElement(
    "div",
    { style: "display:flex; flex-direction: column" },
    React.createElement("button", {
      innerText: "add item",
      onclick: () => setItems([...items, items.length + 1]),
    }),
    React.createElement("button", {
      innerText: "remove item",
      onclick: () => setItems([...items.slice(0, -1)]),
    }),
    React.createElement("span", { innerText: "above probably bugged" }),
    // React.createElement(
    //   "div",
    //   { style: "display:flex; flex-direction: column" },
    ...items.map((item) => React.createElement("span", { innerText: item })),
    // ),
    React.createElement("div", {
      style: "border: 2px solid black",
      innerText: "im bugged",
    })
  );
};

if (typeof window === "undefined") {
  const { reactViewTree, reactRenderTree } = React.buildReactTrees(
    React.createElement(Increment, null)
  );
  console.log(JSON.stringify(React.deepTraverseAndModify(reactViewTree)));
} else {
  window.onload = () => {
    React.render(
      // DeadParent,
      // React.createElement(DeadParent, null),
      // React.createElement(ListAndItemUnder, null),
      React.createElement(
        MainComponent,
        null,
        React.createElement(DataFetcher, null)
      ),
      // React.createElement(
      //   SimpleParent,
      //   null,
      //   React.createElement(SimpleChild, null)
      // ),
      // React.createElement(IsItARootTHing, null),
      // React.createElement(Repro, null),
      // OuterWrapper
      // React.createElement(Wrapper, null),
      // React.createElement(OuterWrapper, null),
      // React.createElement(AddItemsTest, null),
      // React.createElement(Increment, null),
      // React.createElement(ConditionalTest, null),
      document.getElementById("root")!
    );
  };
}

const IsItARootTHing = () => {
  return React.createElement(
    "div",
    null,
    React.createElement(
      SimpleParent,
      null,
      React.createElement(SimpleChild, null)
    )
  );
};
const DeadParent = () => {
  const [x, setX] = React.useState(0);
  return React.createElement(
    "div",
    {
      style: "color:blue",
    },
    React.createElement("button", {
      innerText: "parent dies" + x,
      onclick: () => {
        setX(x + 1);
      },
      style: "color: orange",
    }),
    React.createElement(ConditionalTest, null),
    React.createElement(RenrenderedChild, null)
  );
};

const RenrenderedChild = () => {
  const [x, setX] = React.useState(10);
  return React.createElement(
    "div",
    {
      style: "color:blue",
    },
    React.createElement("button", {
      innerText: "re-render child" + x,
      onclick: () => {
        setX(x + 1);
      },
      // style: "color: orange",
    })
  );
};

const Repro = () => {
  const [toggleInner, setToggleInner] = React.useState(true);

  return React.createElement(
    "div",
    {
      id: "outer-wrapper",
      style: "border: 2px solid black; padding: 10px; margin: 10px;",
    },
    React.createElement("button", {
      onclick: () => setToggleInner(!toggleInner),
      innerText: toggleInner ? "Hide Inner" : "Show Inner",
    }),

    toggleInner && React.createElement("div", { innerText: "pls break" }),
    React.createElement("div", null)
  );
};

const TestContext = React.createContext({ hello: 2 });
const ContextTest = () => {
  const readContext = React.useContext(TestContext);

  console.log("being rendered");
  console.log(readContext);

  return React.createElement(
    "span",
    { innerText: "test" + readContext.hello },
    React.createElement(EvenLower, null)
  );
};

const EvenLower = () => {
  const readContext = React.useContext(TestContext);

  console.log("being rendered lower");
  console.log(readContext);

  return React.createElement("span", {
    innerText: "test lower" + readContext.hello,
  });
};

const ParentContextTest = () => {
  return React.createElement(
    // @ts-ignore
    TestContext.Provider,
    { value: { hello: 10 } },
    React.createElement(ContextTest, null)
  );
};

const DataFetcher = () => {
  const [data, setData] = React.useState<Array<any>>([]);

  React.useEffect(() => {
    console.log("fetching");
    fetch("https://jsonplaceholder.typicode.com/posts")
      .then((response) => response.json())
      .then((data) => {
        setData(data);
      });

    return () => {
      setData([]);
    };
  }, []);

  return React.createElement(
    "div",
    null,
    ...data.map((item) => React.createElement("div", { innerText: item.title }))
  );
};
