/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Probot} app
 */

module.exports = (app) => {
  let monitoredRepoIssueNumber;

  const getMonitoredReposFromIssue = async (context) => {
    if (!monitoredRepoIssueNumber) return [];

    const issue = await context.octokit.issues.get({
      repo: context.payload.repository.name,
      owner: context.payload.repository.owner.login,
      issue_number: monitoredRepoIssueNumber,
    });

    const issueBody = (await issue).data.body;
    const monitoredRepos = issueBody
      .split("\n")
      .slice(1)
      .map((repo) => repo.trim());

    const filteredRepos = monitoredRepos.filter((repo) => repo !== "");

    return filteredRepos;
  };

  const sendNotification = async (issue) => {
    console.log("New bounty issue:", issue.title);
    console.log("Bounty creator:", issue.user.login);
    console.log("Bounty amount (USD):", getBountyAmount(issue));
    console.log("Attempt users:", getAttemptingUsers(issue));
  };

  const getBountyAmount = (issue) => {
    const comments = issue.comment;

    for (const comment of comments) {
      if (comment.body.includes("/bounty")) {
        const bountyPriceMatch = comment.body.match(/\/bounty (\d+)/i);

        if (bountyPriceMatch && bountyPriceMatch[1]) {
          return parseInt(bountyPriceMatch[1]);
        }
      }
    }

    return null;
  };

  const getAttemptingUsers = (issue) => {
    const comments = issue.comments;
    const attemptUsers = [];
    for (const comment of comments) {
      if (comment.body.includes("/attempt")) {
        attemptUsers.push(comment.user.login);
      }
    }
    return attemptUsers;
  };

  app.on("issue_comment.created", async (context) => {
    const comment = context.payload.comment;
    const repoFullName = context.payload.repository.full_name;

    if (comment.body.includes("/monitor-repos")) {
      // match the series of texts after a whitespace following the "/monitor-repos" command with RegEx.
      // The `i` at the end makes it case-insentitive to acommodate various inputs
      const repositoryLinks = comment.body.match(/\/monitor-repos\s+(.+)/i);

      if (repositoryLinks && repositoryLinks[0]) {
        if (!monitoredRepoIssueNumber) {
          const issue = await context.octokit.issues.create({
            labels: ["oss-bounties"],
            title: "OSS Projects with Bounties",
            repo: context.payload.repository.name,
            owner: context.payload.repository.owner.login,
            body: "This issue was created (because you triggered **bounti-hunter**) to help you monitor some OSS repositories for Bounties.",
          });

          monitoredRepoIssueNumber = issue.data.number;
        }

        console.log(`current issue number is: ${monitoredRepoIssueNumber}`);

        const formattedLinks =
          repositoryLinks.length === 1
            ? repositoryLinks[0].split(",").map((link) => link.trim())
            : repositoryLinks[0]
                .split(",")
                .map((link) =>
                  link
                    .trim()
                    .split("//")
                    .slice(1)
                    .toString()
                    .split("/")
                    .slice(1)
                    .join("/")
                );

        const monitoredRepositories = await getMonitoredReposFromIssue(context);
        const updatedRepoList = [
          // ...monitoredRepositories.map((repos) => repos.split("-").join("")), // remove the "-" from body when it is updated.
          ...monitoredRepositories,
          ...formattedLinks,
        ];

        const confirmationMessage = `Way to go! 🚀🎉 \n\n You are now monitoring bounties in${
          updatedRepoList.length > 1 ? " the following repositories:" : ":"
        }\n\n ${updatedRepoList
          .map((repo) => `- **${repo}**`)
          .slice(1)
          .join("\n")} \n\n Whenever a bounty is created in ${
          updatedRepoList.length > 1 ? "these repos" : "this repo"
        }, you'll be the first to know. How awesome! 🤯`;

        await context.octokit.issues.createComment({
          body: confirmationMessage,
          owner: context.payload.repository.owner.login,
          repo: context.payload.repository.name,
          issue_number: context.payload.issue.number,
        });

        // update the issue with the repository list if there is any.
        const updatedIssueBody = updatedRepoList
          .map((repo) => `- **${repo}**`)
          .splice(1)
          .join("\n");

        await context.octokit.issues.update({
          repo: context.payload.repository.name,
          issue_number: monitoredRepoIssueNumber,
          owner: context.payload.repository.owner.login,
          body: `Below are the repositories you're monitoring for bounties\n\n${updatedIssueBody
            .split("-")
            .map((repo, index) => (index === 0 ? repo : `-${repo}`))
            .join("")}`,
        });
      } else {
        const user = context.payload.sender.login;

        const message = `${
          user === "bounti-hunter[bot]" ? "" : `@${user}`
        } Please reply with a repository link or a comma separated list of repositories you'd like to monitor, if you have more than one`;

        await context.octokit.issues.createComment({
          body: message,
          owner: context.payload.repository.owner.login,
          repo: context.payload.repository.name,
          issue_number: context.payload.issue.number,
        });
      }

      try {
        const monitoredRepos = await getMonitoredReposFromIssue(context);
        const cleanRepoName = (repo) =>
          repo.replace(/^\s*-\s*\*\*|\*\*\s*$/g, "").trim();

        const cleanedRepos = monitoredRepos.map((repo) => cleanRepoName(repo));

        for (const repositoryName of cleanedRepos) {
          const [owner, repo] = repositoryName.split("/");

          await context.octokit.repos.get({
            owner,
            repo,
          });
        }
      } catch (error) {
        const user = context.payload.sender.login;
        // const message = `@${user} The repository "${error.repo}" does not exist or it could be that bounti-hunter does not have access to it.`;
        const message = `@${user}, this is the error: ${error}`;

        await context.octokit.issues.createComment({
          body: message,
          ...context.issue(),
        });

        return;
      }

      const webhookConfig = {
        config: {
          content_type: "json",
          secret: "development",
          url: "https://smee.io/1O47KZUc6vqvEBwm",
        },
      };

      try {
        await context.octokit.repos.createWebhook({
          owner: context.payload.repository.owner.login,
          repo: repositoryName,
          ...webhookConfig,
        });
      } catch (error) {
        const user = context.payload.sender.login;
        const message = `@${user} An error occurred while trying to subscribe to "${repositoryName}".`;

        await context.octokit.issues.createComment({
          body: message,
          ...context.issue(),
        });
      }
    }

    if (comment.body.includes("/list-repos")) {
      const monitoredRepos = await getMonitoredReposFromIssue(context);
      const repoListSuccess = `Here you go, Champ! 🍷 \n\n ${monitoredRepos
        .map((repo) => `**${repo}**`)
        .slice(1)
        .join("\n")}`;
      const repoListError =
        "You have not set any repositories to monitor. Use the `/monitor-repos` command to add repositories.";

      await context.octokit.issues.createComment({
        repo: context.payload.repository.name,
        issue_number: context.payload.issue.number,
        owner: context.payload.repository.owner.login,
        body: monitoredRepos.length > 0 ? repoListSuccess : repoListError,
      });
    }
  });

  app.on("issues.opened", async (context) => {
    const { payload } = context;
    const { issue } = payload;

    const hasBountyLabel = issue.labels.some(
      (label) => label.name === "💎 Bounty"
    );

    if (hasBountyLabel) {
      await sendNotification(issue);
    }
  });
};
