import { list, ListParams } from './list';

export interface OutputParams extends ListParams {
  scenario: string;
  outdir: string;
}

export async function output(params: OutputParams) {
  let scenarios = await list(params);
  for (let scenario of scenarios) {
    if (scenario.name.indexOf(params.scenario) !== -1) {
      process.stdout.write(`Found scenario ${scenario.name}\n`);
      await scenario.prepare(params.outdir);
      process.stdout.write(`Wrote successfully to ${params.outdir}\n`);
      return;
    }
  }
  process.stderr.write(`No matching scenario ${params.scenario}. Try running "scenario-tester list" to see all available scenarios.`);
  process.exit(-1);
}
