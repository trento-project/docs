# GitHub Release Process

## 1. Requirements

a. **GitHub Token**

- [Setup a GitHub token by going to your GitHub account](https://docs.github.com/en/enterprise-server@3.6/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) (`Settings` -> `Developer Settings` -> `Personal access tokens` -> `Generate a new token`).

b. **Install GitHub Changelog Generator**

- Install the [GitHub Changelog Generator](https://github.com/github-changelog-generator/github-changelog-generator) by following the instructions.

### 2: Prepare for Release

a. **Merge Changes**

- Ensure that all relevant changes, fixes, and features are merged into the main branch.

b. **Merge Freeze on the Main Branch:**

- Notify your team about the merge freeze on the main branch.

c. **Tagging Pull Requests:**

- Add appropriate labels to all pull requests intended for the release to maintain a clean and organized changelog.

### 3. Update Changelog

a. **Pull Latest Changes:**

- Navigate to the project directory and pull the latest changes on the main branch.

b. **Change Log Branch**

- Create a new branch for the release changelog.

c. **Generate Changelog**

- Utilize the [GitHub Changelog Generator CLI](https://github.com/github-changelog-generator/github-changelog-generator) to generate the changelog.

CLI:

```bash
github_changelog_generator --since-tag= <<CURRENT_TAG>> --future-release= <<RELEASE_VERSION_TAG>> -t <<GITHUB_TOKEN>> -p <<PROJECT_NAME>> -u <<PROJECT_GROUP>> --base CHANGELOG.md
```

| Variables:          | Explanation:                                                               | Examples:                                                                                                                                 |
| ------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| CURRENT_TAG         | Changelog will start after specified tag.                                  | 2.1.0                                                                                                                                     |
| RELEASE_VERSION_TAG | Release version                                                            | 2.2.0                                                                                                                                     |
| PROJECT_NAME        | Name of project on GitHub                                                  | agent, helm-charts, wanda or web                                                                                                          |
| GITHUB_TOKEN        | Your personal Github Token                                                 | https://docs.github.com/en/enterprise-server@3.6/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens |
| PROJECT_GROUP       | Username of the GitHub repository OR namespace of target Github repository | trento-project                                                                                                                            |

CLI Example:

```bash
github_changelog_generator --since-tag=2.1.0 --future-release=2.2.0 -p agent -t <<GITHUB_TOKEN>> -u trento-project --base CHANGELOG.md
```

### 4. Version Bump

a. **Version Upgrade**

- Search for the current version in every project file and perform a version bump.

Previous Release Examples:

- [Agent](https://github.com/trento-project/agent/commit/df9bce2692ee46d3faa548494ec7ba40a22d1873)
- [Helm-Chart](https://github.com/trento-project/helm-charts/commit/1a1d638ee8409a3c5b91609b18ac901c7b7a9fe7)
- [Wanda](https://github.com/trento-project/wanda/commit/57d4a64980f75c0e687d424fe5554feb9c0545d5)
- [Web](https://github.com/trento-project/web/commit/05dca928b43c203a43839c40df9de419f4d9e1b4)

b. **Create Pull Request**

- Create a pull request that includes the changelog and version upgrade.

c. **Merge changelog branch with main after Review**

- Merging the branch triggers GitHub Actions. One of the steps in the CI is to submit the changes to the internal build service.

### 5. Release on GitHub

a. **Check GitHub Actions**

- Ensure that GitHub Actions have passed. The CI system submits the changes to our internal build service, in the **"Build and push container images"** step.

b. **Draft New Release**

- [Go to the repository's releases section and draft a new release](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository).

c. **Release Description:**

- Use the generated changelog as the release description.

d. **Publish Release**

- This concludes the GitHub release process. For the next steps, proceed with our internal release process.
