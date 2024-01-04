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
const scenarios = Scenarios.fromDir('./tests/fixtures/app').expand({
    hello1,
    hello2,
});
scenarios.forEachScenario((scenario) => {
    qunit.module(scenario.name, (hooks) => {
        hooks.before(async function () {
            this.app = await scenario.prepare();
        });
        qunit.test('yarn test', async function (assert) {
            const result = await this.app.execute('yarn --silent test');
            assert.equal(result.stdout, `TAP version 13
ok 1 project > createHello
1..1
# pass 1
# skip 0
# todo 0
# fail 0
`);
        });
        qunit.test('yarn bin inside app', async function (assert) {
            let result = await this.app.execute('yarn --silent bin');
            const yarnBin = result.stdout.trimRight();
            assert.ok(yarnBin.startsWith(this.app.dir));
            result = await this.app.execute('yarn --silent exec which qunit');
            assert.ok(result.stdout.startsWith(yarnBin));
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