# Wally Utilities

This VSCode extension provides some nice-to-haves when using the [Wally](https://wally.run) package manager.

----

Features in `wally.toml`:

* **(TODO)** Validation for `package` info fields / settings.
* **(TODO)** The latest version of a package is displayed next to it in dependencies.
* Autocomplete for dependency package names and package versions.

----

Some additional features:

* Fully supports any number of fallback registries, in addition to the [public registry](https://github.com/UpliftGames/wally-index).
* Adds the TOML language to the `wally.lock` file, giving it proper syntax highlighting.

## Extension Settings

This extension contributes the following settings:

* `wally.auth.token`: A GitHub [personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token) to use for authentication.
* `wally.completion.enabled`: If autocompletion should be enabled or not.
* `wally.diagnostics.enabled`: If diagnostics should be enabled or not.
* `wally.versionLens.enabled`: If the version lens should be enabled or not.
