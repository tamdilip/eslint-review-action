const core = require('@actions/core');
const exec = require('@actions/exec');
const Config = require('./config');

const eslintOptions = {};
eslintOptions.listeners = {
    stdout: (data) => {
        console.log('Eslint::stdout--', data.toString());
    },
    stderr: (data) => {
        console.log('Eslint::stderr--', data.toString());
    },
    errline: (data) => {
        console.log('Eslint::errline--', data.toString());
    }
};

let runESlint = async (filenames) => {
    try {
        await exec.exec(`npx eslint --ext .js --output-file ${Config.ESLINT_REPORT_PATH} --format json ` + filenames.join(' '), [], eslintOptions);
    } catch (error) {
        console.log('command-executor::runESlint--', error);
    }
};

let emberTestReportXmlString = '';
let getEmberTestReportXmlString = () => {
    return emberTestReportXmlString;
};

const emberTestOptions = {};
emberTestOptions.listeners = {
    stdout: (data) => {
        console.log('EmberTest::stdout--', data.toString());
        emberTestReportXmlString = data.toString();
    },
    stderr: (data) => {
        console.log('EmberTest::stderr--', data.toString());
    },
    errline: (data) => {
        console.log('EmberTest::errline--', data.toString());
    }
};

let runEmberTest = async () => {
    try {
        core.exportVariable('COVERAGE', !Config.DISABLE_TEST_COVERAGE);
        await exec.exec(`npx ember test -r xunit --silent > ${Config.TEST_REPORT_PATH}`, [], emberTestOptions);
    } catch (error) {
        console.log('command-executor::runEmberTest--', error);
    }
};


let npmAuditJson = '';
let getNpmAuditJson = () => {
    return JSON.parse(npmAuditJson);
};

const npmAuditOptions = {};
npmAuditOptions.listeners = {
    stdout: (data) => {
        console.log('npmAudit::stdout--', data.toString());
        npmAuditJson = data.toString();
    },
    stderr: (data) => {
        console.log('npmAudit::stderr--', data.toString());
    },
    errline: (data) => {
        console.log('npmAudit::errline--', data.toString());
    }
};

let runNpmAudit = async () => {
    try {
        await exec.exec('npm audit --json', [], npmAuditOptions);
    } catch (error) {
        console.log('command-executor::runNpmAudit--', error);
    }
};

let exitProcess = () => {
    core.setFailed('Errors pending in Pull-Request');
};

module.exports = {
    exitProcess,
    getEmberTestReportXmlString,
    getNpmAuditJson,
    runEmberTest,
    runESlint,
    runNpmAudit
};
