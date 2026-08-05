import {jest} from '@jest/globals'
import * as os from 'os'
import * as path from 'path'

import {run} from '../lib/run.js'
import {isValidVersion} from '../lib/version.js'

function processResult(status = 0) {
  return {
    pid: 1,
    output: [],
    stdout: '',
    stderr: '',
    status,
    signal: null
  }
}

function createDependencies({
  platform = 'linux',
  version = 'latest',
  results = [],
  cleanupError
} = {}) {
  const tempDirectory = path.join(os.tmpdir(), 'setup-azd-test')
  const environment = {
    GITHUB_PATH: path.join(tempDirectory, 'github-path'),
    LocalAppData: path.join(tempDirectory, 'local-app-data'),
    PATH: process.env.PATH
  }
  const queuedResults = [...results]

  return {
    platform,
    environment,
    getInput: jest.fn(() => version),
    setFailed: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    addPath: jest.fn(),
    createTempDirectory: jest.fn(async () => tempDirectory),
    removeTempDirectory: jest.fn(async () => {
      if (cleanupError) {
        throw cleanupError
      }
    }),
    spawn: jest.fn(() => queuedResults.shift() ?? processResult())
  }
}

describe('version validation', () => {
  test.each([
    'latest',
    'stable',
    'daily',
    '0.0.0',
    '1.2.3',
    '1.14.0-beta.1',
    '1.14.0-beta.1+build.5',
    '1.2.3-0',
    '1.2.3-alpha-1',
    '1.2.3+001'
  ])('accepts %s', version => {
    expect(isValidVersion(version)).toBe(true)
  })

  test.each([
    '',
    'Latest',
    'v1.2.3',
    '01.2.3',
    '1.02.3',
    '1.2.03',
    '1.2.3-01',
    '1.2',
    '1.2.3.4',
    '1.2.3_foo',
    'latest ',
    ' latest',
    'latest\n',
    '1.2.3; touch /tmp/pwned',
    '$(touch /tmp/pwned)',
    '1.2.3 && whoami',
    '1.2.3|whoami',
    'a'.repeat(129)
  ])('rejects %s', version => {
    expect(isValidVersion(version)).toBe(false)
  })
})

describe('installer invocation', () => {
  test('rejects invalid input before creating or invoking an installer', async () => {
    const dependencies = createDependencies({
      version: '1.2.3; touch /tmp/pwned'
    })

    await run(dependencies)

    expect(dependencies.setFailed).toHaveBeenCalledWith(
      'Version must be latest, stable, daily, or a semantic version such as 1.2.3.'
    )
    expect(dependencies.createTempDirectory).not.toHaveBeenCalled()
    expect(dependencies.spawn).not.toHaveBeenCalled()
  })

  test('downloads and invokes the Unix installer with explicit arguments', async () => {
    const dependencies = createDependencies({
      platform: 'linux',
      version: '1.2.3-beta.1+build.5'
    })
    const installScriptPath = path.join(
      await dependencies.createTempDirectory(),
      'install-azd.sh'
    )
    dependencies.createTempDirectory.mockClear()

    await run(dependencies)

    expect(dependencies.spawn).toHaveBeenNthCalledWith(
      1,
      'curl',
      ['-fsSL', 'https://aka.ms/install-azd.sh', '-o', installScriptPath],
      expect.objectContaining({shell: false})
    )
    expect(dependencies.spawn).toHaveBeenNthCalledWith(
      2,
      'sudo',
      [
        'bash',
        installScriptPath,
        '--version',
        '1.2.3-beta.1+build.5',
        '--verbose'
      ],
      expect.objectContaining({shell: false})
    )
    expect(dependencies.setFailed).not.toHaveBeenCalled()
  })

  test('downloads and invokes the Windows installer with explicit arguments', async () => {
    const dependencies = createDependencies({
      platform: 'win32',
      version: 'daily'
    })
    const tempDirectory = await dependencies.createTempDirectory()
    const installScriptPath = path.join(tempDirectory, 'install-azd.ps1')
    const azdDirectory = path.join(
      dependencies.environment.LocalAppData,
      'Programs',
      'Azure Dev CLI'
    )
    dependencies.createTempDirectory.mockClear()

    await run(dependencies)

    expect(dependencies.spawn).toHaveBeenNthCalledWith(
      1,
      'powershell',
      [
        '-NoLogo',
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        "$ErrorActionPreference = 'Stop'; Invoke-RestMethod -Uri $env:AZD_INSTALLER_URL -OutFile $env:AZD_INSTALL_SCRIPT"
      ],
      expect.objectContaining({
        env: expect.objectContaining({
          AZD_INSTALLER_URL: 'https://aka.ms/install-azd.ps1',
          AZD_INSTALL_SCRIPT: installScriptPath
        }),
        shell: false
      })
    )
    expect(dependencies.spawn).toHaveBeenNthCalledWith(
      2,
      'powershell',
      [
        '-NoLogo',
        '-NoProfile',
        '-NonInteractive',
        '-File',
        installScriptPath,
        '-Version',
        'daily',
        '-Verbose'
      ],
      expect.objectContaining({shell: false})
    )
    expect(dependencies.spawn).toHaveBeenNthCalledWith(
      3,
      path.join(azdDirectory, 'azd.exe'),
      ['version'],
      expect.objectContaining({shell: false})
    )
    expect(dependencies.addPath).toHaveBeenCalledWith(azdDirectory)
    expect(dependencies.setFailed).not.toHaveBeenCalled()
  })
})

describe('installer failures and cleanup', () => {
  test('reports download failures with the exit code', async () => {
    const dependencies = createDependencies({
      results: [processResult(7)]
    })

    await run(dependencies)

    expect(dependencies.setFailed).toHaveBeenCalledWith(
      'Failed to download the azd installer. Exit code: 7'
    )
    expect(dependencies.spawn).toHaveBeenCalledTimes(1)
    expect(dependencies.removeTempDirectory).toHaveBeenCalledTimes(1)
  })

  test('reports install failures with the exit code', async () => {
    const dependencies = createDependencies({
      results: [processResult(), processResult(23)]
    })

    await run(dependencies)

    expect(dependencies.setFailed).toHaveBeenCalledWith(
      'Failed to install azd. Exit code: 23'
    )
    expect(dependencies.removeTempDirectory).toHaveBeenCalledTimes(1)
  })

  test('reports Windows version-check failures with the exit code', async () => {
    const dependencies = createDependencies({
      platform: 'win32',
      results: [processResult(), processResult(), processResult(9)]
    })

    await run(dependencies)

    expect(dependencies.setFailed).toHaveBeenCalledWith(
      'azd version check failed. Exit code: 9'
    )
    expect(dependencies.removeTempDirectory).toHaveBeenCalledTimes(1)
  })

  test('warns when cleanup fails after a successful install', async () => {
    const dependencies = createDependencies({
      cleanupError: new Error('directory is busy')
    })

    await run(dependencies)

    expect(dependencies.setFailed).not.toHaveBeenCalled()
    expect(dependencies.warning).toHaveBeenCalledWith(
      'Failed to clean up installer files: directory is busy'
    )
  })

  test('preserves the install failure when cleanup also fails', async () => {
    const dependencies = createDependencies({
      results: [processResult(), processResult(42)],
      cleanupError: new Error('directory is busy')
    })

    await run(dependencies)

    expect(dependencies.setFailed).toHaveBeenCalledWith(
      'Failed to install azd. Exit code: 42'
    )
    expect(dependencies.warning).toHaveBeenCalledWith(
      'Failed to clean up installer files: directory is busy'
    )
  })
})
