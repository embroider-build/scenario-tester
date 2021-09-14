# 2.0.1

- BUGFIX: loosen our semver requirement on fixturify-project and bump minimum version to get important fix

# 2.0.0

- BREAKING: upgrading fixturify-project from 3.x to 4.x. I'm treating this as breaking because we re-exports `Project` as part of our own API.
- ENHANCEMENT: `Scenarios.fromDir` now accepts an optional `as: 'lib'` argument that opts out of linking `devDependencies`. By default you get `as: 'app'` instead, which does link `devDependencies`.

# 1.0.2

- BUGFIX: ensure users can debug with source-maps by @stefanpenner

# 1.0.1

- switching back to mainline fixturify-project because that repo merged our its
