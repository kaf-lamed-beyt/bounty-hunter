# bounty-hunter 💰

A sidekick for opensource contributors looking for bounties on [Algora.io](https://algora.io)

[install](https://github.com/apps/bounti-hunter)

| Tracker issue                                                                                                                  | List of OSS projects                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| ![track OSS bounties](https://res.cloudinary.com/meje/image/upload/v1696022719/Screenshot_from_2023-09-29_21-58-56_hph0ib.png) | ![OSS projects with bounties](https://res.cloudinary.com/meje/image/upload/v1696022719/Screenshot_from_2023-09-29_22-15-07_rkrniq.png) |

## Local Setup

```sh
# Install dependencies
npm install

# Run the bot
npm start
```

## Usage

When you've installed the app successfully, you need to create an issue in the repo **bounti-hunter** is installed.

Your next line of action will be to trigger **bounti-hunter** by listing the OSS projects &mdash; as an issue comment &mdash; you want to monitor for bounties. You should be up and running with the `/monitor-repos` command.

An example of how you might use this is shown below:

```shell
/monitor-repos https://github.com/facebook/react, https://github.com/remotion-dev/remotion, https://github.com/triggerdotdev/trigger.dev...
```

Make sure that the list is comma-separated.

## Limitations

For now, it returns the list of available bounties that an OSS repo has. So long as a contributor hasn't gotten a reward for solving it. It does not check periodically for bounties.

Although, as time goes on, it may be capable of that. So please, feel free to use it and suggest ways it can be improved.

## Contributing

If you have suggestions for how bounty-hunter could be improved, or want to report a bug, open an issue! We'd love all and any contributions.

For more, check out the [Contributing Guide](CONTRIBUTING.md).

## License

[ISC](LICENSE) © 2023 kaf-lamed-beyt
