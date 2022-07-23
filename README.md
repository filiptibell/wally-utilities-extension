<!-- Disable lint that disallows html -->
<!-- markdownlint-disable MD033 -->

<h1 align="center">Wally Utilities</h1>

<div align="center">
<img src="https://vsmarketplacebadge.apphb.com/version/filiptibell.wally-utilities.svg"/>
</div>

<br>

This extension provides useful features inside of VSCode for the [Wally](https://wally.run) package manager.

The extension can be downloaded from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=filiptibell.wally-utilities).





----

<h2 align="center">Features</h2>





<!--- Hovers --->

<h3>🔎&nbsp Hovers &nbsp🔍</h3>
<i>Information about dependencies on hover</i>

<br>

- Package author(s), name, and description
- Direct links to readme & changelog, if the package is downloaded
- Direct link to the package on the official [wally.run](https://wally.run) page

<div align="center">
<img src="assets/images/Hovers.png"/>
</div>





<!--- Code Completions --->

<h3>🔮&nbsp Code Completions &nbsp🔮</h3>
<i>Autocomplete for package dependencies</i>

<br>

- Package authors (scopes)
- Package names
- Package versions, including prereleases

<div align="center">
<img src="assets/images/CodeCompletions.png"/>
</div>





<!--- Diagnostics --->

<h3>ℹ️&nbsp Diagnostics &nbspℹ️</h3>
<i>Diagnostics for dependencies and package fields</i>

<br>

- Incomplete dependency (Author / name / version is missing)
- Invalid dependency (Author / name / version does not exist)
- Incorrect dependency realm
- A newer version of a package is available

<div align="center">
<img src="assets/images/Diagnostics.png"/>
</div>





----

<h2 align="center">Extras</h2>

<br>

- Adds the TOML language to the `wally.lock` file, giving it proper syntax highlighting
- Fully supports any number of fallback registries, in addition to the [public registry](https://github.com/UpliftGames/wally-index)
- The theme used in the screenshots above is [One Dark Pro](https://marketplace.visualstudio.com/items?itemName=zhuangtongfa.Material-theme)
