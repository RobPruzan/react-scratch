This codebase attempts to implement React, including:

- internal view hierarchy (normally known as the virtual dom)
- application of view hierarchy to dom
- a subset of hooks (useState, useEffect, useContext, useMemo, useCallback, useRef)

While adhering to the existing API and external behavior:

- Same render behaviors
- Same API (other than minor differences that weren't important to implement)

To run the project for development run:

```
bun run react
bun run dev
```

This will compile all the TS code in src/, which then a bun server will serve a website at http://localhost:3000

The demo website is supposed to be an example of all the different features implemented. It includes

- Rendering components as children
- Hooks
  - useState
  - useMemo
  - useCallback
  - useContext
  - useRef
- Fetching data
- Conditional components
- Rendering components in lists, with removing + adding items
