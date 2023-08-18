import { Scenario, seenScenarios } from './index.js';
import glob from 'glob';
import { resolve } from 'path';
import { format } from 'util';

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { sync: globSync } = glob;

export interface ListParams {
  files: string[];
  require: string[] | undefined;
  matrix: string | undefined;
}

export async function list(params: ListParams): Promise<Scenario[]> {
  if (params.require) {
    for (let r of params.require) {
      await import(require.resolve(r, { paths: [process.cwd()]}));
    }
  }
  for (let pattern of params.files) {
    for (let file of globSync(pattern)) {
      await import(resolve(file));
    }
  }
  return seenScenarios;
}

export async function printList(params: ListParams) {
  let scenarios = await list(params);
  if (params.matrix) {
    process.stdout.write(
      JSON.stringify({
        include: scenarios.map(scenario => ({
          name: scenario.name,
          command: format(params.matrix, scenario.name),
        })),
        name: scenarios.map(scenario => scenario.name),
      })
    );
  } else {
    for (let scenario of scenarios) {
      process.stdout.write(scenario.name + '\n');
    }
  }
}
