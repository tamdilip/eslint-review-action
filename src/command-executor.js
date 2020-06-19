const exec = require('@actions/exec');
const core = require('@actions/core');

const eslintOptions = {};
eslintOptions.listeners = {
    stdout: () => {
        console.log('Eslint::stdout:: ');
    },
    stderr: () => {
        console.log('Eslint::stderr:: ');
    },
    errline: () => {
        console.log('Eslint::errline:: ');
    }
};

let runESlint = async (filenames) => {
    try {
        await exec.exec('npx eslint --ext .js --output-file eslint_report.json --format json ' + filenames.join(' '), [], eslintOptions);
    } catch (error) {
        console.log('Lint run error::', error);
    }
};

let emberTestReportXmlString = '';

let getEmberTestReportXmlString = () => {
    console.log('emberTestReportXmlString', emberTestReportXmlString);
    return emberTestReportXmlString;
};

const emberTestOptions = {};
emberTestOptions.listeners = {
    stdout: (data) => {
        console.log('EmberTest::stdout:: ', data.toString());
        emberTestReportXmlString = data.toString();
    },
    stderr: () => {
        console.log('EmberTest::stderr:: ');
    },
    errline: () => {
        console.log('EmberTest::errline:: ');
    }
};

let runEmberTest = async () => {
    try {
        await exec.exec('npx COVERAGE=true ember test -r xunit --silent > test_report.xml', [], emberTestOptions);
    } catch (error) {
        console.log('Ember Test run error::', error);
    }
};


let npmAuditJson = '';

let getNpmAuditJson = () => {
    console.log('npmAuditJson', npmAuditJson);
    return JSON.parse(npmAuditJson);
};

const npmAuditOptions = {};
npmAuditOptions.listeners = {
    stdout: (data) => {
        console.log('npmAudit::stdout:: ', data.toString());
        npmAuditJson = data.toString();
    },
    stderr: () => {
        console.log('npmAudit::stderr:: ');
    },
    errline: () => {
        console.log('npmAudit::errline:: ');
    }
};

let runNpmAudit = async () => {
    try {
        await exec.exec('npm audit --json', [], npmAuditOptions);
    } catch (error) {
        console.log('npm Audit run error::', error);
    }
};


let exitProcess = () => {
    core.setFailed('linting failed');
};

module.exports = { runESlint, runEmberTest, exitProcess, getEmberTestReportXmlString, runNpmAudit, getNpmAuditJson };