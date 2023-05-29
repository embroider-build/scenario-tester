"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("./index.js");
const qunit_1 = __importDefault(require("qunit"));
const child_process_1 = __importDefault(require("child_process"));
function hello1(project) {
    project.linkDependency('hello', {
        baseDir: './fixtures',
        resolveName: 'hello1',
    });
}
function hello2(project) {
    project.linkDependency('hello', {
        baseDir: './fixtures',
        resolveName: 'hello',
    });
}
const scenarios = index_js_1.Scenarios.fromDir('./fixtures/app').expand({
    hello1,
    hello2,
});
scenarios.forEachScenario((scenario) => {
    qunit_1.default.module(scenario.name, (hooks) => {
        hooks.before(async function () {
            this.app = await scenario.prepare();
        });
        qunit_1.default.test('yarn test', async function (assert) {
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
        qunit_1.default.test('yarn bin inside app', async function (assert) {
            let result = await this.app.execute('yarn --silent bin');
            const yarnBin = result.stdout.trimRight();
            assert.ok(yarnBin.startsWith(this.app.dir));
            result = await this.app.execute('yarn --silent exec which qunit');
            assert.ok(result.stdout.startsWith(yarnBin));
        });
        qunit_1.default.test('check scenario', async function (assert) {
            let result = await this.app.execute(`node -p 'require("./index").polyfilled'`);
            assert.equal(result.stdout.trim(), ('hello1' === scenario.name).toString());
        });
    });
});
qunit_1.default.module('cli', () => {
    qunit_1.default.test('list', (assert) => {
        assert.deepEqual(child_process_1.default
            .execFileSync(process.execPath, ['cli.js', 'list', '--files', 'test.js', '--matrix'], { encoding: 'utf8' })
            .trimRight()
            .split('\n'), ['hello1', 'hello2']);
    });
});
//# sourceMappingURL=test.js.map