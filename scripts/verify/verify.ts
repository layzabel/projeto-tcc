import { run } from '../lib/exec.ts';
import { STAGES, runStages } from './stages.ts';

process.exit(await runStages(STAGES, run, console));
