"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMain = void 0;
const task = __importStar(require("azure-pipelines-task-lib/task"));
const cp = __importStar(require("child_process"));
const path_1 = __importDefault(require("path"));
const fs = __importStar(require("fs"));
const download_1 = __importDefault(require("download"));
const decompress_1 = __importDefault(require("decompress"));
function runMain() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            task.setTaskVariable('hasRunMain', 'true');
            const version = task.getInput('version') || 'latest';
            console.log("using version: " + version);
            // get architecture and os
            const architecture = process.arch;
            const os = process.platform;
            // map for different platform and arch
            const extensionMap = {
                linux: '.tar.gz',
                darwin: '.zip',
                win32: '.zip'
            };
            const exeMap = {
                linux: '',
                darwin: '',
                win32: '.exe'
            };
            const arm64Map = {
                x64: 'amd64',
                arm64: 'arm64-beta'
            };
            const platformMap = {
                linux: 'linux',
                darwin: 'darwin',
                win32: 'windows'
            };
            // get install url
            const installArray = installUrlForOS(os, architecture, platformMap, arm64Map, extensionMap, exeMap);
            const url = `https://azure-dev.azureedge.net/azd/standalone/release/${version}/${installArray[0]}`;
            console.log(`The Azure Developer CLI collects usage data and sends that usage data to Microsoft in order to help us improve your experience.
You can opt-out of telemetry by setting the AZURE_DEV_COLLECT_TELEMETRY environment variable to 'no' in the shell you use.

Read more about Azure Developer CLI telemetry: https://github.com/Azure/azure-dev#data-collection`);
            console.log(`Installing azd from ${url}`);
            const buffer = yield (0, download_1.default)(url);
            const pwd = process.cwd();
            const files = yield (0, decompress_1.default)(buffer, pwd);
            const extracted = files[0].path;
            console.log(pwd);
            if (os !== 'win32') {
                fs.symlinkSync(path_1.default.join(pwd, installArray[1]), path_1.default.join('azd'));
            }
            else {
                fs.symlinkSync(path_1.default.join(pwd, installArray[1]), path_1.default.join('azd.exe'));
            }
            console.log(`azd installed to ${pwd}/${extracted}`);
            console.log(cp.execSync('azd version').toString());
        }
        catch (err) {
            task.setResult(task.TaskResult.Failed, err.message);
        }
    });
}
exports.runMain = runMain;
function installUrlForOS(os, architecture, platformMap, archMap, extensionMap, exeMap) {
    const platformPart = `${platformMap[os]}`;
    const archPart = `${archMap[architecture]}`;
    if (platformPart === `undefined` || archPart === `undefined`) {
        throw new Error(`Unsupported platform and architecture: ${architecture} ${os}`);
    }
    const installUrl = `azd-${platformPart}-${archPart}${extensionMap[os]}`;
    const installUrlForRename = `azd-${platformPart}-${archPart}${exeMap[os]}`;
    return [installUrl, installUrlForRename];
}
