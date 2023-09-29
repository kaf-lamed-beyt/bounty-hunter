const { createMiddleware, createProbot } = require("probot");
const app = require("../../../index");

module.exports = createMiddleware(app, {
  probot: createProbot(),
  webhooksPath: "/api/github/webhooks",
});
