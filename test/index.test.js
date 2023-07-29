const nock = require("nock");
// Requiring our app implementation
const myProbotApp = require("..");
const { Probot, ProbotOctokit } = require("probot");
const fs = require("fs");
const path = require("path");

// Requiring our fixtures
/** @type import('@octokit/webhooks-types').IssuesOpenedEvent */
const payloadWithBountyWithComments = require("./fixtures/issue.opened.withBounty.withComments.json");
/** @type import('@octokit/webhooks-types').IssuesOpenedEvent */
const payloadWithBountyWihtoutComments = require("./fixtures/issue.opened.withBounty.withoutComments.json");
/** @type import('@octokit/webhooks-types').IssuesOpenedEvent */
const payloadWithoutBounty = require("./fixtures/issue.opened.withoutBounty.json");

const privateKey = fs.readFileSync(
  path.join(__dirname, "fixtures/mock-cert.pem"),
  "utf-8"
);

describe("My Probot app", () => {
  /** @type Probot | undefined */
  let probot;

  beforeEach(() => {
    nock.disableNetConnect();
    probot = new Probot({
      appId: 123,
      privateKey,
      // disable request throttling and retries for testing
      Octokit: ProbotOctokit.defaults({
        retry: { enabled: false },
        throttle: { enabled: false },
      }),
    });
    // Load our app into probot
    probot.load(myProbotApp);
  });

  describe("when an issue is opened if it contains 'Bounty' label", () => {
    test("creates a comment if it has comments", async () => {
      const mock = nock("https://api.github.com")
        // Test that a comment is posted
        .get("/repos/Codertocat/Hello-World/issues/1/comments")
        .reply(200, [
          {
            id: 1,
            body: "/bounty 100",
          },
        ]);

      // Receive a webhook event
      await probot?.receive({
        name: "issues",
        payload: payloadWithBountyWithComments,
      });

      expect(mock.pendingMocks()).toStrictEqual([]);
    });

    test("DOES NOT create a comment if it has NOT comments", async () => {
      const mock = nock("https://api.github.com")
        .get("/repos/Codertocat/Hello-World/issues/1/comments")
        .reply(200);

      // Receive a webhook event
      await probot?.receive({
        name: "issues",
        payload: payloadWithBountyWihtoutComments,
      });

      expect(mock.pendingMocks()).toStrictEqual([
        "GET https://api.github.com:443/repos/Codertocat/Hello-World/issues/1/comments",
      ]);
    });
  });

  test("DOES NOT create a comment when an issue is opened if it DOES NOT contain 'Bounty' label", async () => {
    const mock = nock("https://api.github.com")
      .get("/repos/hiimbex/testing-things/issues/1/comments")
      .reply(200);

    // Receive a webhook event
    await probot?.receive({ name: "issues", payload: payloadWithoutBounty });

    expect(mock.pendingMocks()).toStrictEqual([
      "GET https://api.github.com:443/repos/hiimbex/testing-things/issues/1/comments",
    ]);
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });
});

// For more information about testing with Jest see:
// https://facebook.github.io/jest/

// For more information about testing with Nock see:
// https://github.com/nock/nock
