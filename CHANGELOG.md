# Changelog

## Unreleased

### Added

- Added details when hovering over dependencies
- Added the current version of Wally being used to the status bar, if available

## `[0.3.1]` - July 17, 2022

### Added

- Added diagnostics for dependency realms, meaning things such as `realm = "server"` packages being listed under `dependencies` when they should be listed under `server-dependencies`

### Fixed

- Fixed single-character package names not being valid (eg. `osyrisrblx/t@3.0.0`)
- Fixed some issues related to caching of package authors & names
- Other minor internal fixes

## `[0.3.0]` - July 16, 2022

### Added

- Added diagnostics for `realm`, `version` and `registry` fields in `package`
- Added more helpful error messages for most diagnostics like `Did you mean "x"?`

### Changed

- Extension now uses much less of the GitHub requests limit
- Extension is now smaller in size and generally more responsive

## `[0.2.0]` - July 14, 2022

### Changed

- Diagnostics now update in realtime
- Improved diagnostics performance & responsiveness

### Fixed

- Packages that contain numbers in their names no longer make strange errors
- Packages that contain a version suffix like `1.2.3-alpha` no longer error
- Diagnostics now always highlight the full dependency and not just a partial
- Status bar is no longer flicker-y

## `[0.1.1]` - July 13, 2022

### Changed

- Improved handling of dependencies with version prefixes such as `^`, `~`, `=`, ...

## `[0.1.0]` - July 13, 2022

This is the initial release of the Wally Utilities extension! Yay!

### Added

#### Autocomplete

Autocomplete is provided for package authors, names, and versions.

#### Dependency diagnostics

- Incomplete dependency (Author / name / version is missing)
- Invalid dependency (Author / package / version does not exist)
- A newer version of a package is available

#### Status bar

A status bar in the bottom left will give hints depending on dependency diagnostics.
