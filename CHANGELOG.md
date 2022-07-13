# Changelog

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
