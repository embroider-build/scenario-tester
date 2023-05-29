# scenario-tester

A tool for managing many combinations of real and fake NPM packages within your test suite.

Extracted from [ember-auto-import](https://github.com/ef4/ember-auto-import). No docs here yet, but:
 - you can see how it's used in ember-auto-import/test-scenarios
 - it's all typescript so you can follow the types to learn what's possible

## Getting started

`scenario-tester` works especially well with a monorepo. We recommend that you create a new workspace package for your scenarios e.g. : 

```
mkdir test-packages/test-scenarios
```

Next you need to create some scenarios. The best way to create a scenario is from a Project, and the best way to create a project is to have a base project on disk. For example, in EmberJS you can create a new project with `ember new base-project` and it will create a new empty project for you. We can use this as a starting point for our other scenarios.

```
cd test-packages/test-scenarios
ember new base-project
```

Next you can create a scenarios file that you can export a base project function: 


```js
// test-packages/tests-scenarios/scenarios.js
import { Project } from 'scenario-tester';
import { dirname } from 'path';

// This is a way to allow for `require.resolve` to work in esm modules in node. 
// If you are using CJS you can skip these two lines
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

export function baseApp() {
  return Project.fromDir(dirname(require.resolve('./classic-app-template/package.json')), { linkDevDeps: true });
}
```

While it's not quite that useful (yet) you can use this base app to build a specific test scenario. Let's do a simple test that boots your app.

```js
// test-packages/test-scenarios/boot-app-test.js

import { baseApp } from './scenarios';
import { Scenarios } from 'scenario-tester';
import qunit from 'qunit';

const { module: Qmodule, test } = qunit;

Scenarios.fromProject(baseApp)
  .map('boot-app-test', project => {
    // TODO add some specifics for your test scenarios here
  })
  .forEachScenario(scenario => {
    Qmodule(scenario.name, function (hooks) {
      let app; // PreparedApp

      hooks.before(async () => {
        app = await scenario.prepare();
        // any custom setup that you have for each scenario  
      });

      test('it works', async function (assert) {
        // your custom test code
        assert.ok(true);
      });
    });
  });
```

The power in this kind of setup comes when you start adding in different dependencies that you might want to test this app with. We'll go into that a bit more in the next section. For now to run these tests we can run the following command.

```bash
npx qunit *-test.js
```

This will run each of the tests in your setup sequentially. This can take a while, so on CI it can be useful to run all your scenarios in paralell. For this we need your CI to be able to discover all the possible tests that are available and run one specific test. 

**Note:** all of our examples are using Gihub Actions so your CI provider may need a different setup

## CI Setup

The first job in your CI will need to discover all the tests that are available to use: 

```yaml
jobs:
  discover_matrix:
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.set-matrix.outputs.matrix }}
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '16'
          cache: npm
      - run: npm install
      - id: set-matrix
        working-directory: test-packages/test-scenarios
        run: echo "::set-output name=matrix::$(npm run --silent test:list -- --matrix 'npm run test -- --filter %s:')"
```

This will generate a matrix for you that will contain a command to filter down to just one test. You can then use this to run the test in another job: 

```yaml
jobs:
  scenarios:
    needs: discover_matrix
    name: ${{ matrix.name }}
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix: ${{fromJson(needs.discover_matrix.outputs.matrix)}}
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '16'
          cache: npm
      - run: npm ci
      - name: test
        run: ${{ matrix.command }}
        working-directory: test-packages/test-scenarios
```





