module.exports = {
  apps: [
    {
      name: "cookiyes",
      script: "bun",
      args: "run ./index.js",
      env: {
        PORT: 6996
      }
    },
  ],
};
