import { spawn } from 'node:child_process';
import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const BUILD_FILES = Object.freeze([
  'manifest.json',
  'icons/icon-16.png',
  'icons/icon-32.png',
  'icons/icon-48.png',
  'icons/icon-128.png',
  'background.js',
  'background-logic.js',
  'vendor/gsap.min.js',
  'toolbar-state.js',
  'toolbar-drag.js',
  'style-token-detection.js',
  'storybook-registry.js',
  'fds-package-registry.js',
  'package-registry-utils.js',
  'token-source.js',
  'bridge-token-source.js',
  'snapshot-token-source.js',
  'design-variables.js',
  'html-utils.js',
  'content-render.js',
  'content-scan-utils.js',
  'content-theme.js',
  'content-state-utils.js',
  'content-inspection.js',
  'content-summary-model.js',
  'content-violation-report.js',
  'content-summary-panel.js',
  'content-toolbar-ui.js',
  'content-bridge-specs.js',
  'content-token-suggestions.js',
  'content-floating-inspector.js',
  'content-scan-runner.js',
  'content-motion.js',
  'content.js',
  'overlay.css',
  'assets/ic_tool_close.svg',
  'assets/ic_tool_color.svg',
  'assets/ic_tool_exclamationmark.triangle.svg',
  'assets/ic_tool_font.svg',
  'assets/ic_tool_move.svg',
  'assets/ic_tool_plug_connected.svg',
  'assets/ic_tool_rescan.svg',
  'assets/ic_tool_round 2.svg',
  'assets/ic_tool_spacing.svg',
  'assets/ic_tool_success.svg',
  'assets/ic_tool_unplug.svg',
  'popup/popup.html',
  'popup/popup.js',
  'tokens/0.1.primitives.json',
  'tokens/0.2.theme.json',
  'tokens/1.0.semantic.json',
]);

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');

export function getDefaultBuildOptions(rootDir = repoRoot) {
  return {
    rootDir,
    distDir: join(rootDir, 'dist', 'fds-inspector'),
    zipPath: join(rootDir, 'dist', 'fds-inspector.zip'),
    zip: true,
  };
}

async function assertFileExists(filePath) {
  const stats = await stat(filePath);
  if (!stats.isFile()) {
    throw new Error(`Expected file but found non-file: ${filePath}`);
  }
}

async function copyRuntimeFile({ rootDir, distDir, filePath }) {
  const sourcePath = join(rootDir, filePath);
  const targetPath = join(distDir, filePath);
  await assertFileExists(sourcePath);
  await mkdir(dirname(targetPath), { recursive: true });
  await cp(sourcePath, targetPath);
}

function runCommand(command, args, options = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      ...options,
    });
    child.on('error', rejectPromise);
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      rejectPromise(new Error(`${command} exited with code ${code}`));
    });
  });
}

async function createZipArchive({ distDir, zipPath }) {
  await rm(zipPath, { force: true });
  await runCommand('zip', ['-qr', zipPath, '.'], { cwd: distDir });
}

export async function createExtensionBuild(options = {}) {
  const {
    rootDir,
    distDir,
    zipPath,
    zip,
  } = {
    ...getDefaultBuildOptions(),
    ...options,
  };

  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });

  for (const filePath of BUILD_FILES) {
    await copyRuntimeFile({ rootDir, distDir, filePath });
  }

  if (zip) {
    await mkdir(dirname(zipPath), { recursive: true });
    await createZipArchive({ distDir, zipPath });
  }

  return {
    distDir,
    zipPath: zip ? zipPath : null,
    fileCount: BUILD_FILES.length,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createExtensionBuild()
    .then((result) => {
      console.log(`Built extension directory: ${result.distDir}`);
      if (result.zipPath) {
        console.log(`Built extension zip: ${result.zipPath}`);
      }
      console.log(`Copied runtime files: ${result.fileCount}`);
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
