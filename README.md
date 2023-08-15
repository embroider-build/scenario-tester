# scenario-tester

A tool for managing many combinations of real and fake npm packages within your test suite.

Extracted from [ember-auto-import](https://github.com/ef4/ember-auto-import). No docs here yet, but:
 - you can see how it's used in ember-auto-import/test-scenarios
 - it's all typescript so you can follow the types to learn what's possible

## Problem to solve

In the context of `scenario-tester`, a *project* is a codebase on your filesystem that you want to test against.

Specifically, you may want to test an app against various combinations of npm packages. Or maybe you're working on an npm package and you want to ensure that different versions of your pacakge work correctly with different consuming apps representing different use cases. In these examples, the codebases of both test apps and packages are called "projects".

To test all combinations of apps and packages, you'd need to have them on disk. Those test codebases will be mostly identical, varying only in which dependencies (or even versions of the same dependency) are installed.

Maintaining such a collection of test project codebases can be a burden. For example, if you need to upgrade a third-party dependency, you will have to repeat the same steps in every test project codebase. There's also a risk of your projects getting out of sync.

## How scenario-tester solves the problem

With `scenario-tester`, you only need to maintain a small number of project templates. In the simplest case, it will be just one test app or package. For complex cases, several template projects may be used.

`scenario-tester` lets you take a template project and customize it by creating *scenarios*: copies of the project containing unique changes. For example, each scenario could have a different version of an npm dependency added to the project. And then you can use your JS test suite of choice to run tests against each scenario.

## Example usage

Here's a very basic example:

```js
import { Scenarios } from 'scenario-tester';
import { Project } from 'fixturify-project';
import { module, test } from 'qunit';

Scenarios

  // Use a project from filesystem as a template
  .fromProject(() => Project.fromDir(dirname(require.resolve('../test-app/package.json')), { linkDevDeps: true })))

  // Define multiple scenarios, each scenario is derived from the template and has unique dependencies installed
  .expand({
    modern: async (project) => {
      project.linkDevDependency('some-npm-package', { baseDir: __dirname, resolveName: 'some-npm-package' });
      project.linkDevDependency('another-npm-package', { baseDir: __dirname, resolveName: 'another-npm-package' });
    },

    legacy: async function (project) => {
      project.linkDevDependency('some-npm-package', { baseDir: __dirname, resolveName: 'some-npm-package--legacy' });
      project.linkDevDependency('another-npm-package', { baseDir: __dirname, resolveName: 'another-npm-package--legacy' });
    }
  })

  // Emit derivative projects to the filesystem
  .forEachScenario(scenario => {

    // Define your test suite
    module(scenario.name, function (hooks) {
      hooks.beforeEach(assert => {
        // ...
      });

      test('output directories exist', async function () {
        // ...
      });

      test('package.json is modified appropriately', async function () {
        /// ...
      });
    });
  });
```

Note: no new project codebases will be emitted to your filesystem until `forEachScenario` is executed. This lets you manipulate scenarios before emitting their codebases.

## Creating and manipulating project codebases

Instead of defining a template project from disk as shown above, you can do it programmatically.

`scenario-tester` relies on [fixturify-project](https://www.npmjs.com/package/fixturify-project).

`fixturify-project` converts codebases between a filesystem representation and a JSON representation. For example, it lets you define a project (a test app or an npm package) as JSON:

```js
const { Project } = require('fixturify-project');

const project = new Project('rsvp', '3.1.4', {
  files: {
    'filename1.js': 'module.exports = "Hello, World!"',
    dirname1: {
      'filename2.json': `{
        "This is a": "multiline string",
        "that represents": "a JSON file in your project",
      }`,
    },
  },
});
```

Regardless of whether you created a project from disk or JSON, it will be represented in a `Project` class instance from `fixturify-project`.

You can emit your project codebase to filesystem:

```js
project.basedir = '/tmp/my-project'; // Optional. When not set, a random tmp path will be assigned to `basedir`.

await project.write()
```

This produces the following structure on disk:

```sh
/tmp/my-project/filename1.js
/tmp/my-project/dirname1/filename2.js
```

You can add mock dependencies to a project:

```js
project.addDependency('mocha', '5.2.0');
project.addDependency('chai', '5.2.0');

await project.write();
```

This will result in the follwing file/folder structure:

```sh
/tmp/my-project/package.json

/tmp/my-project/filename1.js
/tmp/my-project/dirname1/filename2.json

/tmp/my-project/node_modules/mocha/index.js
/tmp/my-project/node_modules/mocha/package.json
/tmp/my-project/node_modules/chai/index.json
/tmp/my-project/node_modules/chai/package.json
```

If you want real dependencies, use `project.linkDevDependency` instead of `addDependency`.

## Providing multiple versions of the same package

In the example above, two different versions of the same package are included into scenarios:

```js
  project.linkDevDependency('some-npm-package', { baseDir: __dirname, resolveName: 'some-npm-package' });
  project.linkDevDependency('some-npm-package', { baseDir: __dirname, resolveName: 'some-npm-package--legacy' });
```

Normally, you don't have different versions of the same npm package published under different package names, whereas package resolution built into Node does not let you require a specific version.

You can work around this issue.

First, create a `package.json` file next to the JS file where you define scenarios. This implies that they are in a subfolder:

```sh
package.json

tests/scenarios.js
tests/package.json
```

In the new `package.json`, you can include multiple versions of the same package, exposing them into your app under different package names. 

```json
{
  "name": "scenarios",
  "version": "0.0.1",
  "description": "",
  "devDependencies": {
    "some-npm-package": "npm:some-npm-package@latest",
    "some-npm-package--legacy": "npm:some-npm-package--legacy@1.2.3",
  },
}
```

Now you can reference them in your app as if they are different packages.

## Reusing and customizing scenarios

You don't need this section if you define scenarios and run tests in the same file.

But if your test suite is complex, you may want to define scenarios in a separate file, import them into multiple test files. This lets you pick only a subset of scenarios for each test file and to customize them further.

You can achieve that with the following methods on the `Scenarios` class:

* `skip` — removes one scenario with the given name from collection, returns new collection;
* `only` — returns new collection containing only the scenario with the given name;
* `map` — lets you all scenarios in collection.

Consider this example:

```js
// tests/scenarios.js
import { Scenarios } from 'scenario-tester';
import { Project } from 'fixturify-project';

export default Scenarios

  // Use a template project from filesystem
  .fromProject(() => Project.fromDir(dirname(require.resolve('../test-app/package.json')), { linkDevDeps: true })))

  // Define multiple scenarios, each scenario is derived from the template and has unique dependencies installed
  .expand({
    modern: async (project) => {
      project.linkDevDependency('some-npm-package', { baseDir: __dirname, resolveName: 'some-npm-package' });
      project.linkDevDependency('another-npm-package', { baseDir: __dirname, resolveName: 'another-npm-package' });
    },

    legacy: async function (project) => {
      project.linkDevDependency('some-npm-package', { baseDir: __dirname, resolveName: 'some-npm-package--legacy' });
      project.linkDevDependency('another-npm-package', { baseDir: __dirname, resolveName: 'another-npm-package--legacy' });
    }
  })
```

```js
// tests/legacy-test.js
import scenarios from './scenarios';
import { module, test } from 'qunit';

scenarios
  // Pick one scenario
  .only('legacy')

  // Customize it
  .map('without-another-npm-package', project => { // This callback can also be async
    project.removeDevDependency('another-npm-package--legacy');
  })

  // Emit derivative projects to the filesystem
  .forEachScenario(scenario => {

    // Define your test suite
    module(scenario.name, function (hooks) {
      hooks.beforeEach(assert => {
        // ...
      });

      test('output directories exist', async function () {
        // ...
      });

      test('package.json is modified appropriately', async function () {
        /// ...
      });
    });
  });
```

## Command-line interface

It is recommended that you define the following three commands in your `package.json` (the one specific to your scenarios).

Example, customize to your needs:

```json
{
  "scripts": {
    "test": "qunit *-test.ts",
    "test:list": "scenario-tester list",
    "test:output": "scenario-tester output"
  }
}
```

The `test` command should be specific to your test suite of choice.

The other two commands delegate to `scenario-tester`:

* `scenario-tester list` — enumerates defined scenarios.

    This command will output a list of all scenario names defined in your test suite.

    Arguments:

    * `--require <package-name>` — require a package before starting, e. g. `ts-node/register` if your test files are in TypeScript
    * `--files <glob>` — which files to look in.
    * `--matrix <format string>` — process scenario names with [util.format](https://nodejs.org/api/util.html#utilformatformat-args) and output as JSON that can be used to configure a test matrix in GitHub CI.

* `scenario-tester output` — emit derivative projects to filesystem without running the test suite.

    Useful for debugging.

    Arguments:

    * `--require <package-name>` — require a package before starting, e. g. `ts-node/register` if your test files are in TypeScript
    * `--files <glob>` — which files to look in.
    * `--scenario <name>` — pick only one specific scenario.
    * `--outdir <path>` — path to directory, where to emit a derivative project codebase of the scenario. 

