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

export { Project };

type State =
  | {
      type: 'root';
      callbackCreateProject: CallbackCreateProject;
    }
  | {
      type: 'derived';
      parent: Scenarios;
      variants: Record<string, CallbackMutateProject[]>;
    };

export class Scenarios {
  private constructor(private state: State) {}

  static fromDir(appPath: string, as: 'app' | 'lib' = 'app'): Scenarios {
    return new this({
      type: 'root',
      callbackCreateProject: () =>
        Project.fromDir(appPath, as === 'app' ? { linkDevDeps: true } : { linkDeps: true }),
    });
  }

  static fromProject(callbackCreateProject: CallbackCreateProject): Scenarios {
    return new this({
      type: 'root',
      callbackCreateProject: callbackCreateProject,
    });
  }

  expand(variants: Record<string, CallbackMutateProject>): Scenarios {
    return new Scenarios({
      type: 'derived',
      parent: this,
      variants: Object.fromEntries(
        Object.entries(variants).map(([variantName, mutator]) => [variantName, [mutator]])
      ),
    });
  }

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
    delete variants[variantName];
    return new Scenarios({
      type: 'derived',
      parent: this.state.parent,
      variants,
    });
  }

  only(variantName: string): Scenarios {
    if (this.state.type === 'root') {
      throw new Error(`no variant named ${variantName} available to skip on root scenario`);
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

  map(name: string, callbackMutateProject: CallbackMutateProject): Scenarios {
    if (this.state.type === 'root') {
      return new Scenarios({
        type: 'derived',
        parent: this,
        variants: {
          [name]: [callbackMutateProject],
        },
      });
    } else {
      return new Scenarios({
        type: 'derived',
        parent: this.state.parent,
        variants: Object.fromEntries(
          Object.entries(this.state.variants).map(([variantName, mutators]) => [
            `${variantName}-${name}`,
            [...mutators, callbackMutateProject],
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
        for (let [variantName, mutators] of Object.entries(state.variants)) {
          let combinedName = parent.name ? `${parent.name}-${variantName}` : variantName;
          fn({
            name: combinedName,
            callbackCreateProject: parent.callbackCreateProject,
            mutators: [...parent.mutators, ...mutators],
          });
        }
      });
    }
  }

  forEachScenario(fn: (appDefinition: Scenario) => void): void {
    this.iterate(({ name, callbackCreateProject, mutators }) => {
      fn(new Scenario(name ?? '<root>', callbackCreateProject, mutators));
    });
  }
}

export const seenScenarios: Scenario[] = [];

export class Scenario {
  constructor(
    public name: string,
    private callbackCreateProject: CallbackCreateProject,
    private mutators: CallbackMutateProject[]
  ) {
    seenScenarios.push(this);
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
