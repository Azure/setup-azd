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
    const windowsInstallScript = `powershell -c "$scriptPath = \\"$($env:TEMP)\\install-azd.ps1\\"; Invoke-RestMethod 'https://aka.ms/install-azd.ps1' -OutFile $scriptPath; . $scriptPath -Version '${version}' -Verbose; Remove-Item $scriptPath"`
    const linuxOrMacOSInstallScript = `curl -fsSL https://aka.ms/install-azd.sh | sudo bash -s -- --version ${version} --verbose`

    core.info(`Installing azd version ${version} on ${os}.\n`)

    if (os === 'win32' && localAppData) {
      cp.execSync(windowsInstallScript)

      // Add azd to PATH
      const azdPath = path.join(localAppData, 'Programs', 'Azure Dev CLI')
      fs.appendFileSync(githubPath, `${azdPath}${path.delimiter}`)
    } else {
      cp.execSync(linuxOrMacOSInstallScript)
    }

    core.notice(`The Azure Developer CLI collects usage data and sends that usage data to Microsoft in order to help us improve your experience.
You can opt-out of telemetry by setting the AZURE_DEV_COLLECT_TELEMETRY environment variable to 'no' in the shell you use.
Read more about Azure Developer CLI telemetry: https://github.com/Azure/azure-dev#data-collection`)

    // Run `azd version` so we get the version that was installed written to the log.
    let azdVersion = 'azd version'
    if (os === 'win32' && localAppData) {
      const azdExePath = path.join(
        localAppData,
        'Programs',
        'Azure Dev CLI',
        'azd.exe'
      )
      azdVersion = `"${azdExePath}" version`
    }

    core.info(`\nChecking azd version: ${cp.execSync(azdVersion).toString()}`)
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}

run()
