import * as fs from 'fs'
import * as cp from 'child_process'
import * as core from '@actions/core'
import * as toolCache from '@actions/tool-cache'
import path from 'path'

async function run(): Promise<void> {
  try {
    // get version number from input
    const version = core.getInput('version')

    // get os
    const os = process.platform

    let windowsInstallScript = `powershell -ex AllSigned -c "Invoke-RestMethod 'https://aka.ms/install-azd.ps1' | Invoke-Expression"`
    let linuxOrMacOSInstallScript = `curl -fsSL https://aka.ms/install-azd.sh | bash`
    if (version) {
      windowsInstallScript = `powershell -ex AllSigned -c "Invoke-RestMethod 'https://aka.ms/install-azd.ps1' -OutFile 'install-azd.ps1'; powershell -ExecutionPolicy Bypass -File ./install-azd.ps1 -Version '${version}'"`
      linuxOrMacOSInstallScript = `sudo curl -fsSL https://aka.ms/install-azd.sh | bash -s -- --version ${version}`
    }

    if (os === 'win32') {
      cp.execSync(windowsInstallScript)

      // Add azd to PATH
      const addToPathScript = `
        $oldPath = [System.Environment]::GetEnvironmentVariable('Path', [System.EnvironmentVariableTarget]::Machine)
        $newPath = "$oldPath;$($env:LocalAppData)\\Programs\\Azure Dev CLI"
        [System.Environment]::SetEnvironmentVariable('Path', $newPath, [System.EnvironmentVariableTarget]::Machine)
      `
      cp.execSync(`powershell -Command "${addToPathScript}"`)
    } else {
      cp.execSync(linuxOrMacOSInstallScript)
    }

    core.notice(`The Azure Developer CLI collects usage data and sends that usage data to Microsoft in order to help us improve your experience.
You can opt-out of telemetry by setting the AZURE_DEV_COLLECT_TELEMETRY environment variable to 'no' in the shell you use.

Read more about Azure Developer CLI telemetry: https://github.com/Azure/azure-dev#data-collection`)

    core.info(`Installing azd version ${version} on ${os}.`)

    // Run `azd version` so we get the version that was installed written to the log.
    core.info(cp.execSync('powershell -Command \\"$env:PATH\\"').toString())
    core.info(`Checking azd version.`)
    core.info(cp.execSync('azd version').toString())
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}

run()
