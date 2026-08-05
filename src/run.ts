import * as core from '@actions/core'
import {
  spawnSync,
  type SpawnSyncOptionsWithStringEncoding,
  type SpawnSyncReturns
} from 'child_process'
import {mkdtemp, rm} from 'fs/promises'
import * as os from 'os'
import * as path from 'path'

import {isValidVersion} from './version'

const WINDOWS_INSTALLER_URL = 'https://aka.ms/install-azd.ps1'
const UNIX_INSTALLER_URL = 'https://aka.ms/install-azd.sh'
const INVALID_VERSION_MESSAGE =
  'Version must be latest, stable, daily, or a semantic version such as 1.2.3.'

export interface RunDependencies {
  platform: NodeJS.Platform
  environment: NodeJS.ProcessEnv
  getInput(name: string): string
  setFailed(message: string): void
  info(message: string): void
  warning(message: string): void
  addPath(inputPath: string): void
  createTempDirectory(): Promise<string>
  removeTempDirectory(directory: string): Promise<void>
  spawn(
    command: string,
    args: string[],
    options: SpawnSyncOptionsWithStringEncoding
  ): SpawnSyncReturns<string>
}

const defaultDependencies: RunDependencies = {
  platform: process.platform,
  environment: process.env,
  getInput: name => core.getInput(name),
  setFailed: message => core.setFailed(message),
  info: message => core.info(message),
  warning: message => core.warning(message),
  addPath: inputPath => core.addPath(inputPath),
  createTempDirectory: async () =>
    mkdtemp(path.join(os.tmpdir(), 'setup-azd-')),
  removeTempDirectory: async directory =>
    rm(directory, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 100
    }),
  spawn: (command, args, options) => spawnSync(command, args, options)
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function logProcessOutput(
  dependencies: RunDependencies,
  output: string | null
): void {
  const message = output?.trimEnd()
  if (message) {
    dependencies.info(message)
  }
}

function runProcess(
  dependencies: RunDependencies,
  command: string,
  args: string[],
  failureMessage: string,
  environment: NodeJS.ProcessEnv = dependencies.environment
): void {
  const result = dependencies.spawn(command, args, {
    encoding: 'utf8',
    env: environment,
    shell: false
  })

  logProcessOutput(dependencies, result.stdout)
  logProcessOutput(dependencies, result.stderr)

  if (result.error) {
    throw new Error(`${failureMessage} ${result.error.message}`)
  }
  if (result.status !== 0) {
    throw new Error(
      `${failureMessage} Exit code: ${result.status ?? 'unknown'}`
    )
  }
}

function installOnWindows(
  dependencies: RunDependencies,
  version: string,
  tempDirectory: string,
  localAppData: string
): void {
  const installScriptPath = path.join(tempDirectory, 'install-azd.ps1')
  const powershellArgs = ['-NoLogo', '-NoProfile', '-NonInteractive']

  runProcess(
    dependencies,
    'powershell',
    [
      ...powershellArgs,
      '-Command',
      "$ErrorActionPreference = 'Stop'; Invoke-RestMethod -Uri $env:AZD_INSTALLER_URL -OutFile $env:AZD_INSTALL_SCRIPT"
    ],
    'Failed to download the azd installer.',
    {
      ...dependencies.environment,
      AZD_INSTALLER_URL: WINDOWS_INSTALLER_URL,
      AZD_INSTALL_SCRIPT: installScriptPath
    }
  )

  runProcess(
    dependencies,
    'powershell',
    [
      ...powershellArgs,
      '-File',
      installScriptPath,
      '-Version',
      version,
      '-Verbose'
    ],
    'Failed to install azd.'
  )

  const azdDirectory = path.join(localAppData, 'Programs', 'Azure Dev CLI')
  dependencies.addPath(azdDirectory)
  runProcess(
    dependencies,
    path.join(azdDirectory, 'azd.exe'),
    ['version'],
    'azd version check failed.'
  )
}

function installOnUnix(
  dependencies: RunDependencies,
  version: string,
  tempDirectory: string
): void {
  const installScriptPath = path.join(tempDirectory, 'install-azd.sh')

  runProcess(
    dependencies,
    'curl',
    ['-fsSL', UNIX_INSTALLER_URL, '-o', installScriptPath],
    'Failed to download the azd installer.'
  )
  runProcess(
    dependencies,
    'sudo',
    ['bash', installScriptPath, '--version', version, '--verbose'],
    'Failed to install azd.'
  )
}

export async function run(
  dependencies: RunDependencies = defaultDependencies
): Promise<void> {
  let tempDirectory: string | undefined

  try {
    const localAppData = dependencies.environment.LocalAppData
    if (dependencies.platform === 'win32' && !localAppData) {
      dependencies.setFailed(
        'LocalAppData environment variable is not defined.'
      )
      return
    }
    if (!dependencies.environment.GITHUB_PATH) {
      dependencies.setFailed('GITHUB_PATH environment variable is not defined.')
      return
    }

    const version = dependencies.getInput('version') || 'latest'
    if (!isValidVersion(version)) {
      dependencies.setFailed(INVALID_VERSION_MESSAGE)
      return
    }

    dependencies.info(
      `Installing azd version ${version} on ${dependencies.platform}.`
    )
    tempDirectory = await dependencies.createTempDirectory()

    if (dependencies.platform === 'win32' && localAppData) {
      installOnWindows(dependencies, version, tempDirectory, localAppData)
    } else {
      installOnUnix(dependencies, version, tempDirectory)
    }

    dependencies.info(`Successfully installed azd version ${version}.`)
  } catch (error: unknown) {
    dependencies.setFailed(errorMessage(error))
  } finally {
    if (tempDirectory) {
      try {
        await dependencies.removeTempDirectory(tempDirectory)
      } catch (error: unknown) {
        dependencies.warning(
          `Failed to clean up installer files: ${errorMessage(error)}`
        )
      }
    }
  }
}
