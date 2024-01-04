# scenario-tester Changelog

## v3.0.0 (2023-11-08)

#### :boom: Breaking Change
* [#14](https://github.com/embroider-build/scenario-tester/pull/14) Drop support for Node 14 and update TypeScript ([@lolmaus](https://github.com/lolmaus))

#### :rocket: Enhancement
* [#18](https://github.com/embroider-build/scenario-tester/pull/18) Enable both CJS and ESM builds ([@mansona](https://github.com/mansona))
* [#15](https://github.com/embroider-build/scenario-tester/pull/15) Install TypeDoc and deploy TypeDoc documentation site ([@lolmaus](https://github.com/lolmaus))

#### :memo: Documentation
* [#17](https://github.com/embroider-build/scenario-tester/pull/17) TypeDoc: document the Scenarios class ([@lolmaus](https://github.com/lolmaus))
* [#16](https://github.com/embroider-build/scenario-tester/pull/16) Rename types in preparation for TypeDoc ([@lolmaus](https://github.com/lolmaus))
* [#13](https://github.com/embroider-build/scenario-tester/pull/13) Docs: add introduction and guide to readme ([@lolmaus](https://github.com/lolmaus))

#### :house: Internal
* [#24](https://github.com/embroider-build/scenario-tester/pull/24) Set up release-it ([@mansona](https://github.com/mansona))
* [#23](https://github.com/embroider-build/scenario-tester/pull/23) use the right tsconfig for typedoc ([@mansona](https://github.com/mansona))
* [#22](https://github.com/embroider-build/scenario-tester/pull/22) fix CI to remove volta ([@mansona](https://github.com/mansona))
* [#12](https://github.com/embroider-build/scenario-tester/pull/12) Tests: use a TestContext type for DRY ([@lolmaus](https://github.com/lolmaus))

#### Committers: 2
- Andrey Mikhaylov (lolmaus) ([@lolmaus](https://github.com/lolmaus))
- Chris Manson ([@mansona](https://github.com/mansona))

# 2.1.2

- BUGFIX: upgrade fixturify-project for upstream bug fixes

# 2.1.1

- BUGFIX: Fixes issues with 2.1.0

# 2.1.0

- ENHANCEMENT: ensure node_modules/.bin is used inside of the scenario by @krisselden

# 2.0.0

- BREAKING: upgrading fixturify-project from 3.x to 4.x. I'm treating this as breaking because we re-exports `Project` as part of our own API.
- ENHANCEMENT: `Scenarios.fromDir` now accepts an optional `as: 'lib'` argument that opts out of linking `devDependencies`. By default you get `as: 'app'` instead, which does link `devDependencies`.

# 1.0.2

- BUGFIX: ensure users can debug with source-maps by @stefanpenner

# 1.0.1

- switching back to mainline fixturify-project because that repo merged our its
