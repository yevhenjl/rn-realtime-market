// Interactive EAS Update publisher: `bun run update [channel] [message]`.
// Channel names match eas.json build profiles and EAS environments.
import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';

const CHANNELS = ['development', 'preview', 'production'];

const rl = createInterface({ input: process.stdin, output: process.stdout });

async function pickChannel(preset) {
  if (preset) {
    return preset;
  }
  console.log('Channel to publish the update to:');
  CHANNELS.forEach((name, i) => console.log(`  ${i + 1}) ${name}`));
  const answer = (await rl.question(`Choose [1-${CHANNELS.length}]: `)).trim();
  return CHANNELS[Number(answer) - 1] ?? answer;
}

async function main() {
  const [presetChannel, ...messageParts] = process.argv.slice(2);
  const channel = await pickChannel(presetChannel);

  if (!CHANNELS.includes(channel)) {
    console.error(`Unknown channel "${channel}". Use one of: ${CHANNELS.join(', ')}`);
    process.exitCode = 1;
    return;
  }

  const message = messageParts.join(' ').trim() || (await rl.question('Update message: ')).trim();
  if (!message) {
    console.error('Update message is required.');
    process.exitCode = 1;
    return;
  }

  if (channel === 'production') {
    const confirm = (await rl.question('Publish to PRODUCTION? Type "production" to confirm: ')).trim();
    if (confirm !== 'production') {
      console.log('Cancelled.');
      return;
    }
  }
  rl.close();

  const args = ['eas-cli', 'update', '--channel', channel, '--environment', channel, '--message', message];
  console.log(`\n> bunx ${args.join(' ')}\n`);
  const result = spawnSync('bunx', args, { stdio: 'inherit' });
  process.exitCode = result.status ?? 1;
}

main().finally(() => rl.close());
