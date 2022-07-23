<!-- Disable lint that disallows html -->
<!-- markdownlint-disable MD033 -->

<h1 align="center">Wally Utilities</h1>

<div align="center">
<img src="https://vsmarketplacebadge.apphb.com/version/filiptibell.wally-utilities.svg"/>
</div>

<br>

This VSCode extension provides some nice-to-haves when using the [Wally](https://wally.run) package manager.

The extension can be downloaded from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=filiptibell.wally-utilities).

----

<h2 align="center">Features</h2>

<!--- Code Completions --->
<details>
<summary><b>Code Completions</b></summary>
<br>

<i>Autocomplete for dependencies</i>

- Package authors (scopes)
- Package names
- Package versions, including prereleases

</details>

<div align="center">
<img src="assets/images/CodeCompletions.png"/>
</div>

<!--- Diagnostics --->
<details>
<summary><b>Diagnostics</b></summary>
<br>

<i>Diagnostics for dependencies and package fields, including but not limited to:</i>

- Incomplete dependency (Author / name / version is missing)
- Invalid dependency (Author / name / version does not exist)
- A newer version of a package is available

</details>

<!--- Hovers --->
<details>
<summary><b>Hovers</b></summary>
<br>

<i>Information about a package on hover, including:</i>

- Package author(s), name, and description
- Direct links to readme & changelog, if the package is downloaded
- Direct link to the package on the official [wally.run](https://wally.run) page

</details>

<!--- Misc --->
<details>
<summary><b>Misc</b></summary>
<br>

<i>Miscellaneous notes and extra features</i>

- Fully supports any number of fallback registries, in addition to the [public registry](https://github.com/UpliftGames/wally-index)
- Adds the TOML language to the `wally.lock` file, giving it proper syntax highlighting
- The theme used in the screenshots above is [One Dark Pro](https://marketplace.visualstudio.com/items?itemName=zhuangtongfa.Material-theme)

</details>
