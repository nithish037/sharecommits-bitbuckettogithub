# Share Commits - Bitbucket to Github

A Node Script for including Bitbucket commits in the contributions graph on Github.

## What does it do?

Say you have some repositories on Bitbucket, e.g. for work. This program allows you to shadow your commit activity on Bitbucket to the contributions chart on your activity overview on GitHub.

![Contribution graph on GitHub]()

We do this by querying the Bitbucket workspace for commits made by us. The program then makes a _shadow_ repository on GitHub. Here each Bitbucket repository is represented by a file, and each Bitbucket commit is reflected by the Bitbucket commit hash in the file.

The Bitbucket hashes are added backwards in time to match the point in time when the original commit was made on Bitbucket.

> **_Note:_** As default the shadow repository is made private to hide sensitive information. This means that the program depends on the GitHub settings to allow to show activity from _both_ public and private repositories ([read more](https://docs.github.com/en/github/setting-up-and-managing-your-github-profile/publicizing-or-hiding-your-private-contributions-on-your-profile)).

## Quick start:

### 1) Clone the repository and install:

```bash
$ git clone
$ cd
$ npm install
```

### 2) Create an environment file with credentials:

Create a file called `.env` at the project root, which contains the following environment variables:

> **_Note:_** You can check the `.env.example` file at the project root for reference

```bash
# Bitbucket Credentials
BITBUCKET_USERNAME=[FILL_ACCORDINGLY]
# Note - If you want to provide multiple email addresses, follow the format <abc@de.com qwe@rt.com> with space in between emails
BITBUCKET_EMAIL=[FILL_ACCORDINGLY]
BITBUCKET_PASSWORD=[FILL_ACCORDINGLY]
# Note - Doesn't support multiple workspaces!
# One Possible solution is to change workspace name based on requirements
BITBUCKET_WORKSPACE=[FILL_ACCORDINGLY]
# Note - If you want to provide multiple repos, follow the format <abcd efgh> with space in between repos
BITBUCKET_IGNORE_REPOS=[FILL_ACCORDINGLY]


# Github Credentials
GITHUB_OWNER=[FILL_ACCORDINGLY]
GITHUB_USERNAME=[FILL_ACCORDINGLY]
GITHUB_EMAIL=[FILL_ACCORDINGLY]
GITHUB_TOKEN=[FILL_ACCORDINGLY]
```

For now the program works with [App Password](https://developer.atlassian.com/cloud/bitbucket/rest/intro/#app-passwords) for Bitbucket and [Personal access tokens](https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token) for GitHub. So make sure to create a app password for Bitbucket and token for GitHub then add it to the `.env` file.

### 3) Run the program:

```bash

# Note: Use only one of the following commands

# Using tsnode - A TypeScript execution and REPL for node.js
$ npm run sc-btg-tsnode

# Using node.js
$ npm run sc-btg-node
```
