const { spawn } = require('child_process');
const path = require('path');
const electronPath = require('electron');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const mainPath = path.resolve(__dirname, 'main.cjs');

const child = spawn(electronPath, [mainPath], {
  stdio: 'inherit',
  env,
  windowsHide: false,
  cwd: path.resolve(__dirname, '..')
});

child.on('close', (code) => {
  process.exit(code || 0);
});
