const core = require('@actions/core');
const exec = require('@actions/exec');
const Config = require('./config');

/**
 * Listener for eslint command execution,
 * to capture console outputs
 * 
 */
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

/**
 * Execute eslint cli command on only 
 * changed set of files under a pull-request
 * 
 * @param {Array} filenames changed files list in pull-request
 * 
 */
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

/**
 * Listener for ember test command execution,
 * to capture console outputs
 * 
 */
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

/**
 * Execute ember test cli command to
 * generate test report as xml format
 * 
 */
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

/**
 * Listener for npm audit command execution,
 * to capture console outputs
 * 
 */
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

/**
 * Execute npm audit cli command
 * to generate json report on vulnerabilities
 * 
 */
let runNpmAudit = async () => {
    try {
        await exec.exec('npm audit --json', [], npmAuditOptions);
    } catch (error) {
        console.log('command-executor::runNpmAudit--', error);
    }
};

/**
 * State to error out the pull-request status
 * 
 */
let failAction = false;
let getFailAction = () => {
    return failAction;
};

let setFailAction = (state) => {
    failAction = state;
};

/**
 * Exits the workflow execution 
 * to fail the pull-request status
 * 
 */
let exitProcess = () => {
    getFailAction() && core.setFailed('Errors pending in Pull-Request');
};

module.exports = {
    exitProcess,
    getEmberTestReportXmlString,
    getNpmAuditJson,
    runEmberTest,
    runESlint,
    runNpmAudit,
    getFailAction,
    setFailAction
};
