import * as fs from 'fs'
import * as cp from 'child_process'
import * as core from '@actions/core'
import * as path from 'path'

async function run(): Promise<void> {
  try {
    const localAppDataPath = process.env.LocalAppData
    // get version number from input
    const version = core.getInput('version')

    // get os
    const os = process.platform

    let windowsInstallScript = `powershell -ex AllSigned -c "Invoke-RestMethod 'https://aka.ms/install-azd.ps1' | Invoke-Expression"`
    let linuxOrMacOSInstallScript = `curl -fsSL https://aka.ms/install-azd.sh | sudo bash`
    if (version !== 'latest') {
      windowsInstallScript = `powershell -ex AllSigned -c "Invoke-RestMethod 'https://aka.ms/install-azd.ps1' -OutFile 'install-azd.ps1'; powershell -ExecutionPolicy Bypass -File ./install-azd.ps1 -Version '${version}'"`
      linuxOrMacOSInstallScript = `curl -fsSL https://aka.ms/install-azd.sh | sudo bash -s -- --version ${version}`
    }

    core.info(`Installing azd version ${version} on ${os}.\n`)

    if (os === 'win32') {
      cp.execSync(windowsInstallScript)
      // Add azd to PATH
      if (localAppDataPath) {
        const azdPath = path.join(localAppDataPath, 'Programs', 'Azure Dev CLI')
        fs.appendFileSync(
          process.env.GITHUB_PATH || '',
          `${azdPath}${path.delimiter}`
        )
      } else {
        core.setFailed('LocalAppData environment variable is not defined.')
        return
      }
    } else {
      cp.execSync(linuxOrMacOSInstallScript)
    }

    core.notice(`The Azure Developer CLI collects usage data and sends that usage data to Microsoft in order to help us improve your experience.
You can opt-out of telemetry by setting the AZURE_DEV_COLLECT_TELEMETRY environment variable to 'no' in the shell you use.
Read more about Azure Developer CLI telemetry: https://github.com/Azure/azure-dev#data-collection`)

    // Run `azd version` so we get the version that was installed written to the log.
    let azdVersion = 'azd version'
    if (os === 'win32' && localAppDataPath) {
      const azdExePath = path.join(
        localAppDataPath,
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
