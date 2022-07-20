<h1 align="center">Wally Utilities</h1>

<div align="center">
<img src="https://vsmarketplacebadge.apphb.com/version/filiptibell.wally-utilities.svg"/>
</div>

<br>

This VSCode extension provides some nice-to-haves when using the [Wally](https://wally.run) package manager.

The extension can be downloaded from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=filiptibell.wally-utilities).

----

<div align="center">
<img
style="width: 75%; height: auto;"
src="assets/images/CodeCompletions.png"
/>
</div>

----

<details>
<summary><b>Feature List</b></summary>

* Autocomplete for dependencies.
* Information about dependencies on hover.
* Diagnostics for dependencies, including:
	- Incomplete dependency (Author / name / version is missing)
	- Invalid dependency (Author / name / version does not exist)
	- A newer version of a package is available

* Validation for `package` info fields / settings.
* User-friendly hints for errors like `Did you mean "x"`, wherever applicable.
* **(TODO)** Quick actions for fixing diagnostics.

</details>

<details>
<summary><b>Additional Features</b></summary>

* Fully supports any number of fallback registries, in addition to the [public registry](https://github.com/UpliftGames/wally-index).
* Adds the TOML language to the `wally.lock` file, giving it proper syntax highlighting.

</details>
