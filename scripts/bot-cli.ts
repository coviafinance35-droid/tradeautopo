const baseUrl = process.env.APP_URL ?? 'http://localhost:3000';
const action = process.argv[2] ?? 'status';

const actions: Record<string, string> = {
  start: 'start_monitoring',
  stop: 'stop',
  cycle: 'run_cycle',
};

async function main() {
  if (action === 'status') {
    const response = await fetch(`${baseUrl}/api/bot/status`);
    console.log(JSON.stringify(await response.json(), null, 2));
    process.exitCode = response.ok ? 0 : 1;
    return;
  }

  const apiAction = actions[action];
  if (!apiAction) {
    console.error('Usage: bun run bot:cli -- [status|start|stop|cycle]');
    process.exitCode = 1;
    return;
  }

  const response = await fetch(`${baseUrl}/api/bot/actions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: apiAction }),
  });
  console.log(JSON.stringify(await response.json(), null, 2));
  process.exitCode = response.ok ? 0 : 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'CLI request failed');
  process.exitCode = 1;
});
