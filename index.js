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

    return (await issue).data.body.split("\n").map((repo) => repo.trim());
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
            title: "OSS Projects with Bounties",
            repo: context.payload.repository.name,
            owner: context.payload.repository.owner.login,
            body: "This issue was created (because you triggered **bounti-hunter**) to help you monitor some OSS repositories for Bounties.",
          });

          monitoredRepoIssueNumber = issue.data.number;
        }

        const formattedLinks =
          repositoryLinks.length === 1
            ? repositoryLinks[0]
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
        const updatedRepoList = [...monitoredRepositories, ...formattedLinks];

        // update the issue with the repository list if there is any.
        await context.octokit.issues.update({
          repo: context.payload.repository.name,
          issue_number: monitoredRepoIssueNumber,
          owner: context.payload.repository.owner.login,
          body: `Below are the repositories you're monitoring for bounties \n\n ${updatedRepoList
            .map((repo) => `**${repo}**`)
            .join("\n")}`,
        });

        const confirmationMessage = `Way to go! 🚀🎉 \n\n You are now monitoring bounties in${
          updatedRepoList.length > 1 ? " the following repositories:" : ":"
        }\n\n ${updatedRepoList
          .map((repo) => `**${repo}**`)
          .join(
            "\n"
          )} \n\n Whenever a bounty is created in these repos, you'll be the first to know. How awesome! 🤯`;

        await context.octokit.issues.createComment({
          body: confirmationMessage,
          owner: context.payload.repository.owner.login,
          repo: context.payload.repository.name,
          issue_number: context.payload.issue.number,
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
    }

    if (comment.body.includes("/list-repos")) {
      const monitoredRepos = await getMonitoredReposFromIssue(context);
      const repoListSuccess = `Here you go, Champ! 🍷 \n\n ${monitoredRepos
        .map((repo) => `**${repo}**`)
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
};
