import { Project } from 'fixturify-project';
import { setGracefulCleanup } from 'tmp';
import { spawn } from 'child_process';

setGracefulCleanup();

/**
 * A callback used by some of classes to obtain a {@link Project}.
 * 
 * You are supposed to pass such a callback. In it, you should create and return a {@link Project}
 * instance.
 * 
 * @returns A {@link Project} instance, optionally wrapped into a promise.
 */

export type CallbackCreateProject = () => Project | Promise<Project>;

/**
 * A callback used to customize an existing {@link Scenario}. In it, you receive a {@link Project}
 * instance and you can do stuff with it in order to adjust the project's codebase to the specific
 * needs of a given scenario.
 * 
 */
export type CallbackMutateProject = (project: Project) => void | Promise<void>;

/**
 * A callback for setting up test cases for each scenario. It accepts a {@link Scenario} instance.
 *
 * Typically, in a `beforeEach` hook of your test suite, you would run {@link Scenario.prepare} to
 * emit the correpsonding project to the filesystem and apply all {@link CallbackMutateProject} to
 * it.
 */
export type CallbackDefineTests = (scenario: Scenario) => void;

type SkippableVariant = { status: 'active' | 'skipped', project: CallbackMutateProject[]};

export { Project };

type State =
  | {
      type: 'root';
      callbackCreateProject: CallbackCreateProject;
    }
  | {
      type: 'derived';
      parent: Scenarios;
      variants: Record<string, SkippableVariant>;
    };

/**
 * This is your entry point to this library. Do not use the `new Scenarios()` constructor, instead
 * use its static methods {@link Scenarios.fromDir} and {@link Scenarios.fromProject}.
 *
 * ⚠ `Scenarios` is a separate class and not a plural for `Scenario`.
 *
 * `Scenarios` is used to:
 *
 * 1. Capture a base scenario by calling {@link Scenarios.fromDir} or {@link Scenarios.fromProject}.
 *
 *     At this point, the base scenario is represented by a {@link CallbackCreateProject} — a
 *     callback that, when invoked, will create and return a {@link Project} instance representing a
 *     codebase in memory.
 *
 *     {@link Scenarios.fromDir} captures a codebase into memory from disk.
 *
 *     {@link Scenarios.fromProject} captures a codebase from a {@link Project} instance. You can
 *     represent a codebase with a JSON-like structure and feed it into
 *     Project.{@link Project."constructor"} to create a {@link Project} instance.
 *
 * 2. Create a matrix of test cases by by calling {@link Scenarios.expand}. `expand` acccepts a
 *     record of key-value pairs where keys are names of scenarios and values are
 *     {@link CallbackMutateProject} callbacks.
 *
 *     The callbacks are not executed just yet, so no {@link Project} or {@link Scenario}
 *     instances are created at this point.
 *
 * 3. If you keep the result of {@link Scenarios.expand} in a separate module, you can import that
 *     module into multiple test files. In each of those files, you can:
 *
 *     * call {@link Scenarios.skip} to remove a scenario from the matrix;
 *     * call {@link Scenarios.only} to select a single scenario from the matrix;
 *     * call {@link Scenarios.map} to append a new {@link CallbackMutateProject} callback to all
 *       sceanarios in the matrix.
 *
 * 4. Finally, you call {@link Scenarios.forEachScenario}. It does the following:
 *
 *     * for each scenario defined in the matrix, it creates a new {@link Scenario} instance;
 *     * for each {@link Scenario} instance, {@link Scenarios.forEachScenario} executes the callback
 *       that you pass into it;
 *     * inside the callback, you receive the {@link Scenario} instance as an argument and use it
 *       to define test cases with a test suite of your choice (QUnit, Mocha, Jest, etc).
 *     * at certain point inside the callback (typically, a `beforeEach` hook of your test suite),
 *       you call Scenario.{@link Scenario.prepare}, which in turn will:
 *
 *         * instantiate a {@link Project} instance by running the {@link CallbackCreateProject}
 *           callback;
 *         * execute all {@link CallbackMutateProject} callbacks associated with the scenario, in
 *           order to customize the test codebase;
 *         * emit the test codebase to filesystem, either to a temporary directory or to a given
 *           basedir defined in {@link CallbackCreateProject} in {@link Scenarios.fromProject}.
 *
 * 5. Now, if you run a file that does `scenarios.forEachScenario` with your test suite, it will
 *     run the tests defined in the callback passed to {@link Scenarios.forEachScenario} for each
 *     scenario in the matrix.
 *
 */
export class Scenarios {
  /**
   * Should not be called by hand. Use the {@link Scenarios.fromDir} and
   * {@link Scenarios.fromProject} static methods instead.
   */
  private constructor(private state: State) {
    this.state = state;
  }

  /**
   * Instantiates a new `Scenarios` instance, referencing a path to a test codebase on the
   * filesystem to use as a base scenario.
   *
   * Delegates to Project.{@link Project.fromDir}. Note: {@link Project.fromDir} is not executed at
   * this point. The path is stored as a callback closure which is only executed during
   * {@link Scenarios.forEachScenario} to produce a {@link Project}, which is then written to disk.
   *
   * @param appPath - path to a test codebase on the filesystem to use for base scenario.
   * @param as - see {@link Project.fromDir}.
   * @returns a new `Scenarios` instance.
   */
  static fromDir(appPath: string, as: 'app' | 'lib' = 'app'): Scenarios {
    return new this({
      type: 'root',
      callbackCreateProject: () =>
        Project.fromDir(appPath, as === 'app' ? { linkDevDeps: true } : { linkDeps: true }),
    });
  }

  /**
   * Instantiates a new `Scenarios` instance using a given {@link Project} instance.
   *
   * Use this method if you want to define a test codebase in the code of your test file rather than
   * on a filesystem. See {@link Project} for more info.
   *
   * @param callbackCreateProject -  a callback that should return a new
   *     {@link Project} instance. This callback is not executed at this point, it is only executed
   *     during {@link Scenarios.forEachScenario}.
   * @returns a new `Senarios` instance.
   */
  static fromProject(callbackCreateProject: CallbackCreateProject): Scenarios {
    return new this({
      type: 'root',
      callbackCreateProject: callbackCreateProject,
    });
  }

  /**
   * Defines a number of new scenarios, using the base scenario as a template.
   *
   * @param variants - a key-value hash representing derived scenarios: the key is the name of a new
   *     scenario while the value is a {@link CallbackMutateProject} — a callback used to modify a
   *     test codebase to produce a unique scenario.
   * @returns a new derived `Scenarios` instance containing multiple named
   *     {@link CallbackMutateProject} and a reference to the base scenario (the one that this
   *     method was invoked on).
   *
   * Note: this method does not create {@link Scenario} instances. Those instances will only be
   * created during {@link Senarios.forEachScenario}.
   */
  expand(variants: Record<string, CallbackMutateProject>): Scenarios {
    return new Scenarios({
      type: 'derived',
      parent: this,
      variants: Object.fromEntries(
        Object.entries(variants).map(([variantName, mutator]) => [variantName, { status: 'active', project: [mutator]}])
      ),
    });
  }

  /**
   * @param variantName - name of scenario to remove. Note: names of derived scenarios are prepended
   *     with name name of the base scenario: <base>-<derived>.
   * @returns a new `Scenarios` instance with the given scenario removed.
   */
  skip(variantName: string): Scenarios {
    if (this.state.type === 'root') {
      throw new Error(`no variant named ${variantName} available to skip on root scenario`);
    }
    if (!this.state.variants[variantName]) {
      throw new Error(
        `no variant named ${variantName} available to skip. Found variants: ${Object.keys(
          this.state.variants
        ).join(', ')}`
      );
    }
    let variants = Object.assign({}, this.state.variants);
    variants[variantName].status = 'skipped';
    return new Scenarios({
      type: 'derived',
      parent: this.state.parent,
      variants,
    });
  }


  /**
   * @param variantName - name of scenario to keep. Note: names of derived scenarios are prepended
   *     with name name of the base scenario: <base>-<derived>.
   * @returns a new `Scenarios` instance with the given scenario only. Also keeps the base scenario.
   */
  only(variantName: string): Scenarios {
    if (this.state.type === 'root') {
      throw new Error(`root scenario cannot be skipped (you asked to skip "${variantName}")`);
    }
    if (!this.state.variants[variantName]) {
      throw new Error(
        `no variant named ${variantName} available to select via "only". Found variants: ${Object.keys(
          this.state.variants
        ).join(', ')}`
      );
    }
    let variants = { [variantName]: this.state.variants[variantName] };
    return new Scenarios({
      type: 'derived',
      parent: this.state.parent,
      variants,
    });
  }

  /**
   * Produces a new `Scenarios` instance by deriving new scenarios (aka `variants`) from each of
   * the previously defined ones.
   *
   * If the `Scenarios` instance only contains a base scenario, then adds one derived scenario on
   * top of it. The name of the derived scenario will be the same as the base one.
   *
   * @param name - The name of the new scenario. It will be used to identify the new scenario
   *     variation.
   *
   *     The name of the new scenario will be composed of the original name and the new name in the
   *     form of: <existing>-<new>.
   *
   *     When applied to a `Scenarios` instance that only has a base scenario defined, then the new
   *     name will be used and the original name will be omitted.
   *
   * @param callbackMutateProject - a callback that will be applied to each scenario. It will be
   *     run against a test codebase that will be emitted for this scenario during
   *     {@link Scenarios.forEachScenario}.
   * 
   *     Note that the callback will not replace existing {@link CallbackMutateProject} callbacks,
   *     but rather append to them.
   * 
   * @returns A new `Scenarios` instance created based on the instanced the method was invoked on.
   *     The new instance will have the new {@link CallbackMutateProject} callback appended to all
   *     scenarios.
   */
  map(name: string, callbackMutateProject: CallbackMutateProject): Scenarios {
    if (this.state.type === 'root') {
      return new Scenarios({
        type: 'derived',
        parent: this,
        variants: {
          [name]: { status: 'active', project: [callbackMutateProject]},
        },
      });
    } else {
      return new Scenarios({
        type: 'derived',
        parent: this.state.parent,
        variants: Object.fromEntries(
          Object.entries(this.state.variants).map(([variantName, variant]) => [
            `${variantName}-${name}`,
            { status: variant.status, project: [...variant.project, callbackMutateProject]},
          ])
        ),
      });
    }
  }

  private iterate(
    fn: (args: {
      name: string | undefined;
      callbackCreateProject: CallbackCreateProject;
      mutators: CallbackMutateProject[];
    }) => void
  ): void {
    if (this.state.type === 'root') {
      fn({ name: undefined, callbackCreateProject: this.state.callbackCreateProject, mutators: [] });
    } else {
      let state = this.state;
      this.state.parent.iterate((parent) => {
        for (let [variantName, variant] of Object.entries(state.variants)) {
          if(variant.status === 'skipped') {
            continue;
          }
          let combinedName = parent.name ? `${parent.name}-${variantName}` : variantName;
          fn({
            name: combinedName,
            callbackCreateProject: parent.callbackCreateProject,
            mutators: [...parent.mutators, ...variant.project],
          });
        }
      });
    }
  }

  /**
   * This method is a step that makes `Scenarios` do actual work. It has two purposes:
   *
   * 1. It iterates over all defined scenarios (variants). For each scenario, it instantiates a
   * {@link Scenario} instance and runs Scenario.{@link Scenario.prepare} on it.
   * 2. It lets you define test cases for each scenario, using a test suite of your choice. You do
   * it in a callback that you pass to `forEachScenario` as an argument.
   * Typically, in a `beforeEach` hook of your test suite, you would run
   * Scenario.{@link Scenario.prepare} to emit the correpsonding project to the filesystem and apply
   * all {@link CallbackMutateProject} to it.
   *
   * @param callbackDefineTests - A callback for setting up test cases for each scenario.
   */
  forEachScenario(callbackDefineTests: CallbackDefineTests): void {
    this.iterate(({ name, callbackCreateProject, mutators }) => {
      callbackDefineTests(new Scenario(name ?? '<root>', callbackCreateProject, mutators));
    });
  }
}

declare global {
  // eslint-disable-next-line no-var
  var scenarioTesterSeenScenarios: Scenario[];
}

global.scenarioTesterSeenScenarios = [];

export class Scenario {
  constructor(
    public name: string,
    private callbackCreateProject: CallbackCreateProject,
    private mutators: CallbackMutateProject[]
  ) {
    global.scenarioTesterSeenScenarios.push(this);
  }

  async prepare(outdir?: string): Promise<PreparedApp> {
    let project = await this.callbackCreateProject();
    for (let fn of this.mutators) {
      await fn(project);
    }

    if (outdir) {
      project.baseDir = outdir;
    }
    await project.write();
    return new PreparedApp(project.baseDir);
  }
}

export class PreparedApp {
  constructor(public dir: string) {}
  async execute(
    shellCommand: string,
    opts?: { env?: Record<string, string> }
  ): Promise<{
    exitCode: number;
    stderr: string;
    stdout: string;
    output: string;
  }> {
    let env: Record<string, string | undefined> | undefined;
    if (opts?.env) {
      env = { ...process.env, ...opts.env };
    }
    let child = spawn(shellCommand, {
      stdio: ['inherit', 'pipe', 'pipe'],
      cwd: this.dir,
      shell: true,
      env,
    });
    let stderrBuffer: string[] = [];
    let stdoutBuffer: string[] = [];
    let combinedBuffer: string[] = [];
    child.stderr.on('data', (data) => {
      stderrBuffer.push(data);
      combinedBuffer.push(data);
    });
    child.stdout.on('data', (data) => {
      stdoutBuffer.push(data);
      combinedBuffer.push(data);
    });
    return new Promise((resolve) => {
      child.on('close', (exitCode: number) => {
        resolve({
          exitCode,
          get stdout() {
            return stdoutBuffer.join('');
          },
          get stderr() {
            return stderrBuffer.join('');
          },
          get output() {
            return combinedBuffer.join('');
          },
        });
      });
    });
  }
}
