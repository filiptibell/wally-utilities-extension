# Wally Utilities

This VSCode extension provides some nice-to-haves when using the [Wally](https://wally.run) package manager.

----

Features in `wally.toml`:

* Autocomplete for dependencies.
* Diagnostics for dependencies, including:
	- Incomplete dependency (Author / name / version is missing)
	- Invalid dependency (Author / name / version does not exist)
	- A newer version of a package is available

* Validation for `package` info fields / settings.
* User-friendly hints for errors like `Did you mean "x"`, wherever applicable.
* **(TODO)** Quick actions for fixing diagnostics.

----

Some additional features:

* Fully supports any number of fallback registries, in addition to the [public registry](https://github.com/UpliftGames/wally-index).
* Adds the TOML language to the `wally.lock` file, giving it proper syntax highlighting.
