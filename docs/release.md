# Release preparation

This repository is local. Before publication, create the official FlashData GitHub
account, choose the repository owner and verify package-name availability/ownership.
Planned distribution names are `flashdata` on PyPI and `@flashdata-dev/sdk` on npm;
neither registry has been changed by this work.

1. Set repository/source/issue metadata to the actual official repository URL.
2. Review license, contact, source contract, changelog and test results.
3. Run all local checks and inspect the package contents listed below.
4. Initialize/push the existing local repository to the official GitHub repository.
5. Run GitHub CI on supported platforms and runtimes. The workflows do not publish.
6. Set up registry credentials or trusted publishing through the registry's official
   account settings, then deliberately publish the reviewed artifact.

```sh
npm ci
npm run typecheck
npm test
npm pack --dry-run
npm pack
```

The npm archive includes built ESM/CommonJS code, declaration files, guides, examples,
public API snapshots, README, license and changelog. Install the `.tgz` in an empty application and verify ESM, require() and
TypeScript resolution before release. No npm publishing token/workflow is configured.
