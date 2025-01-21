import * as fs from 'fs'
import * as cp from 'child_process'
import * as core from '@actions/core'
import * as path from 'path'

async function run(): Promise<void> {
  try {
    // get os
    const os = process.platform
    const localAppData = process.env.LocalAppData
    const githubPath = process.env.GITHUB_PATH
    if (os === 'win32' && !localAppData) {
      core.setFailed('LocalAppData environment variable is not defined.')
      return
    }
    if (!githubPath) {
      core.setFailed('GITHUB_PATH environment variable is not defined.')
      return
    }

    // get version number from input
    const version = core.getInput('version')
    const windowsInstallScript = `powershell -c "$scriptPath = \\"$($env:TEMP)\\install-azd.ps1\\"; Invoke-RestMethod 'https://aka.ms/install-azd.ps1' -OutFile $scriptPath; . $scriptPath -Version '${version}' -Verbose:$true; Remove-Item $scriptPath"`
    const linuxOrMacOSInstallScript = `curl -fsSL https://aka.ms/install-azd.sh | sudo bash -s -- --version ${version} --verbose`

    core.info(`Installing azd version ${version} on ${os}.`)

    if (os === 'win32' && localAppData) {
      core.info(cp.execSync(windowsInstallScript).toString())

      // Add azd to PATH
      const azdPath = path.join(localAppData, 'Programs', 'Azure Dev CLI')
      fs.appendFileSync(githubPath, `${azdPath}${path.delimiter}`)
    } else {
      core.info(cp.execSync(linuxOrMacOSInstallScript).toString())
    }

    // Run `azd version` to make sure if azd installation failed, it returns error on windows
    // if installation is not successful, linux and macos fail when running install scripts
    if (os === 'win32' && localAppData) {
      const azdExePath = path.join(
        localAppData,
        'Programs',
        'Azure Dev CLI',
        'azd.exe'
      )
      const azdVersion = `"${azdExePath}" version`
      cp.execSync(azdVersion)
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}

run()
