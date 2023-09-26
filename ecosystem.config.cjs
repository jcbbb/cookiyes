module.exports = {
  apps: [
    {
      name: "cookiyes",
      script: "bun",
      args: "run ./server.js",
      env: {
        PORT: 6996
      }
    },
  ],
};
