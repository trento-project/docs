# Release Process

To issue a new version of any Trento component (e.g. Web, Agent, Wanda, etc.), a new GitHub release needs to be published in the respective repository.  
Most of the process is automated via GitHub Actions.

## Overview

These are the main steps, to be repeated for each relevant repository:

- Bump the version by changing the file holding the most recent version number, named `VERSION` and located at the root of the repository.
- Push this change as a commit on the `main` branch (admins only), or open a pull-request as usual.
  This will trigger a couple of automated steps:
  - update the changelog;
  - add a tag to the repository;
  - publish the release on GitHub;
  - build container images hosted on ghcr.io;
  - update SUSE distribution packages in OBS.

Note that the Continous Integration pipelines are not involved in this release process (i.e. changing just the `VERSION` file won't trigger a test run), so developers should rely on the fact that the `main` branch is expected to always be in a green build status.  
If it's not, one should work to achieve a green build _before_ bumping the version.
