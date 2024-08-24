This codebase attempts to implement React, including:

- internal view hierarchy (normally known as the virtual dom)
- application of view hierarchy to dom
- a subset of hooks (useState, useEffect, useContext, useMemo, useCallback, useRef)

While adhering to the existing API and external behavior:

- Same render behaviors
- Same API (other than minor differences that weren't important to implement)

If you are interested in how this was developed, I made an article going through the internal architecture: https://www.rob.directory/blog/react-from-scratch

To run the project for development:

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
- Optimized DOM updates


![Screen-2024-08-23-182000-ezgif com-optimize](https://github.com/user-attachments/assets/0004b129-eed0-4706-94b2-a94e22470ec4)
