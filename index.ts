
const server = Bun.serve({
  port: 3000,
  fetch: async (request) => {
    console.log();
    const url = (new URL(request.url))

    if (url.pathname === "/") {

    const html = await Bun.file("index.html").text()
      const response = new Response(html, {
        status: 200,
        headers: {
        ['Content-Type']: 'text/html'
      }
    });
    return response
    }

    const js = await Bun.file("react.js").text()
    const response = new Response(js, {
      status: 200,
      headers: {
        ['Content-Type']: "application/json"
      }
    });


    // 
    return response
  },
});

console.log('Server listening on port:', server.port);