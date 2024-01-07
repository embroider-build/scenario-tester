"use strict";

const { Scenarios } = require('scenario-tester');
const qunit = require("qunit");
const child_process = require("child_process");
const execa = require('execa');

function hello1(project) {
    project.linkDependency('hello', {
        baseDir: './tests/fixtures',
        resolveName: 'hello1',
    });
}
function hello2(project) {
    project.linkDependency('hello', {
        baseDir: './tests/fixtures',
        resolveName: 'hello',
    });
}

function skipMe(project) {
  // do nothing
}

const scenarios = Scenarios.fromDir('./tests/fixtures/app').expand({
    hello1,
    hello2,
    skipMe,
});

scenarios
    .skip('skipMe')
    .skip('skipMe') // show that skipping twice doesn't crash
    .forEachScenario((scenario) => {
    qunit.module(scenario.name, (hooks) => {
        hooks.before(async function () {
            this.app = await scenario.prepare();
        });
        qunit.test('pnpm test', async function (assert) {
            const result = await this.app.execute('pnpm --silent test');
            assert.equal(result.stdout, `TAP version 13
ok 1 project > createHello
1..1
# pass 1
# skip 0
# todo 0
# fail 0
`);
        });
        qunit.test('check scenario', async function (assert) {
            let result = await this.app.execute(`node -p 'require("./index").polyfilled'`);
            assert.equal(result.stdout.trim(), ('hello1' === scenario.name).toString());
        });
    });
});
qunit.module('cli', () => {
    qunit.test('list', async (assert) => {
      const result = await execa('node', ['./dist/cli.js', 'list', '--files', 'tests/test.cjs', '--matrix'])

      const { stdout } = result;
      assert.deepEqual(
          stdout.split('\n'),
        ['hello1', 'hello2']
      );
    });
});
//# sourceMappingURL=test.js.map
