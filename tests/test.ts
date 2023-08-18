import { Project } from 'fixturify-project';
import { Scenarios } from '../index.js';
import type { PreparedApp } from '../index.js';
import Qunit from 'qunit';
import execa from 'execa';

function hello1(project: Project) {
  project.linkDependency('hello', {
    baseDir: './tests/fixtures',
    resolveName: 'hello1',
  });
}

function hello2(project: Project) {
  project.linkDependency('hello', {
    baseDir: './tests/fixtures',
    resolveName: 'hello',
  });
}

const scenarios = Scenarios.fromDir('./tests/fixtures/app').expand({
  hello1,
  hello2,
});

type TestContext = { app: PreparedApp };

scenarios.forEachScenario((scenario) => {
  Qunit.module(scenario.name, (hooks) => {
    hooks.before(async function (this: TestContext) {
      this.app = await scenario.prepare();
    });

    Qunit.test(
      'yarn test',
      async function (this: TestContext, assert) {
        const result = await this.app.execute('yarn --silent test');
        assert.equal(
          result.stdout,
          `TAP version 13
ok 1 project > createHello
1..1
# pass 1
# skip 0
# todo 0
# fail 0
`
        );
      }
    );

    Qunit.test(
      'yarn bin inside app',
      async function (this: TestContext, assert) {
        let result = await this.app.execute('yarn --silent bin');
        const yarnBin = result.stdout.trimRight();
        assert.ok(yarnBin.startsWith(this.app.dir));
        result = await this.app.execute('yarn --silent exec which qunit');
        assert.ok(result.stdout.startsWith(yarnBin));
      }
    );

    Qunit.test(
      'check scenario',
      async function (this: TestContext, assert) {
        let result = await this.app.execute(
          `node -p 'require("./index").polyfilled'`
        );
        assert.equal(
          result.stdout.trim(),
          ('hello1' === scenario.name).toString()
        );
      }
    );
  });
});

Qunit.module('cli', () => {
  Qunit.test('list', async (assert) => {
    // I tried to test this using the ts file dirrectly but I couldn't get ts-node/require to work correctly
    // so I'm just testing against the compiled esm output
    const result = await execa('npx', ['.', 'list', '--files', './build/tests/test.js', '--matrix'])

    const { stdout } = result;
    assert.deepEqual(
        stdout.split('\n'),
      ['hello1', 'hello2']
    );
  });
});
