/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Scenario } from './index.js';
import glob from 'glob';
import { resolve } from 'path';
import { format } from 'util';
import { createRequire } from 'node:module';

const { sync: globSync } = glob;

export interface ListParams {
  files: string[];
  require: string[] | undefined;
  matrix: string | undefined;
}

export async function list(params: ListParams): Promise<Scenario[]> {
  if (params.require) {
    for (let r of params.require) {
      // @ts-ignore this doesn't actually fail since we're checking before using it
      if(import.meta.url) {
        // @ts-ignore
        const require = createRequire(import.meta.url);
        // @ts-ignore this will only happen if we have import.meta.url
        await import(require.resolve(r, { paths: [process.cwd()]}));
      } else {
        require(require.resolve(r, { paths: [process.cwd()]}));
      }
    }
  }
  for (let pattern of params.files) {
    for (let file of globSync(pattern)) {
      // @ts-ignore
      if(import.meta.url) {
        // @ts-ignore
        await import(resolve(file));
      } else {
        require(resolve(file));
      }
    }
  }
  return global.scenarioTesterSeenScenarios;
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
