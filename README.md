# GitHub Action for Azure Developer CLI


With Azure Developer CLI GitHub Action, you can automate your workflow by executing [Azure Developer CLI](https://github.com/hemarina/setup-azd) commands to manage resources inside of an Action.

The action installs the Azure Developer CLI on a user defined Azure Developer CLI version. If the user does not specify a version, latest CLI version is used. 
Read more about various Azure Developer CLI versions [here](https://github.com/Azure/azure-dev/releases).

- `version` – **Optional** Example: 1.0.1, Default: set to latest azd cli version.

The definition of this GitHub Action is in [action.yml](https://github.com/hemarina/setup-azd/blob/main/action.yml).

## Sample workflow

### Workflow to install a specific AZD CLI version
```
# File: .github/workflows/azure-dev.yml

on: [push]

jobs:

  build:
    runs-on: ubuntu-latest
    steps:
      - name: Install `azd`
        uses: Azure/setup-azd@v1.0.0
```

## Azure CLI Action metadata file

```
# File: action.yml

# Automate your GitHub workflows using Azure Developer CLI scripts.
name: 'setup-azd'
description: 'This action downloads and installs azd'
author: 'Azure Developer CLI Team'
inputs:
  version:
    required: false
    description: 'The version of azd to install (default: latest)'
    default: 'latest'
runs:
  using: 'node16'
  main: 'dist/index.js'
```

# Getting Help for Azure Developer CLI Issues

If you encounter an issue related to the Azure Developer CLI commands executed in your script, you can file an issue directly on the [Azure Developer CLI repository](https://github.com/Azure/azure-dev/issues/new/choose).

## Data Collection

The software may collect information about you and your use of the software and send it to Microsoft. Microsoft may use this information to provide services and improve our products and services. You may turn off the telemetry as described in the repository. There are also some features in the software that may enable you and Microsoft to collect data from users of your applications. If you use these features, you must comply with applicable law, including providing appropriate notices to users of your applications together with a copy of Microsoft's privacy statement. Our privacy statement is located at https://go.microsoft.com/fwlink/?LinkId=521839. You can learn more about data collection and use in the help documentation and our privacy statement. Your use of the software operates as your consent to these practices.

### Telemetry Configuration

Telemetry collection is on by default.

To opt out, set the environment variable `AZURE_DEV_COLLECT_TELEMETRY` to `no` in your environment.

## Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft 
trademarks or logos is subject to and must follow 
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.
