/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Probot} app
 */
module.exports = (app) => {
  app.on("issue_comment.created", async (context) => {
    const comment = context.payload.comment;
    const repoFullName = context.payload.repository.full_name;

    if (comment.body.includes("/monitor-repos")) {
      const message =
        "Please reply with a comma separated list of repositories you'd like to monitor";

      await context.octokit.issues.createComment({
        body: message,
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        issue_number: context.payload.issue.number,
      });
    }
  });
};
