import { Project } from 'fixturify-project';
import { Scenarios } from '../dist/';
import type { PreparedApp } from '../dist/';
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

function skipMe(/* project: Project */) {
  // do nothing
}

const scenarios = Scenarios.fromDir('./tests/fixtures/app').expand({
  hello1,
  hello2,
  skipMe,
});

type TestContext = { app: PreparedApp };

scenarios
  .skip('skipMe')
  .skip('skipMe') // show that skipping twice doesn't crash
  .forEachScenario((scenario) => {
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
    const result = await execa('node', ['./dist/cli.js', 'list',  '--require', 'ts-node/register', '--files', './tests/test.ts', '--matrix'])

    const { stdout } = result;
    assert.deepEqual(
        stdout.split('\n'),
      ['hello1', 'hello2']
    );
  });
});
