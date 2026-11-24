import { spawnSync } from 'node:child_process';

const windows = process.platform === 'win32';
const command = windows ? 'cmd.exe' : './mvnw';
const args = windows ? ['/d', '/c', 'mvnw.cmd'] : [];
const suites = {
  '--java': 'CheckpointWorkshopTest',
  '--client': 'CheckpointClientIT',
  '--with-client': 'CheckpointClientIT,CheckpointWorkshopTest',
};
const testClasses = suites[process.argv[2] ?? '--java'];
if (!testClasses) throw new Error('Choose --java, --client, or --with-client.');
const result = spawnSync(command, [...args, `-Dtest=${testClasses}`, 'test'], {
  cwd: new URL('../backend/', import.meta.url),
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error.message);
}
process.exitCode = result.status ?? 1;
