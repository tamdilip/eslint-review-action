const exec = require('@actions/exec');
const core = require('@actions/core');

let emberTestResult = '';

const options = {};
options.listeners = {
    stdout: (data) => {
        console.log('stdout');
        if (data.toString().includes('# tests')) {
            console.log('# tests@@@@@@@@@@%%%%%%%%%%%%%%%%%%%');
            emberTestResult = data.toString();
        }
    },
    stderr: (data) => {
        console.log('stderr');
    },
    errline: (data) => {
        console.log('errline');
    }
};

let runESlint = async (filenames) => {
    try {
        await exec.exec('eslint --ext .js --output-file eslint_report.json --format json ' + filenames.join(' '), [], options);
        //await exec.exec('npm run lint -- ' + filenames.join(' '), [], options);
    } catch (error) {
        console.log('Lint run error::', error);
    }
};

let runEmberTest = async () => {
    try {
        await exec.exec('npm run test', [], options);
    } catch (error) {
        console.log('Ember Test run error::', error);
    }
};

let exitProcess = () => {
    core.setFailed('linting failed');
};

let getEmberTestResult = () => {
    return emberTestResult;
};


module.exports = { emberTestResult, runESlint, runEmberTest, exitProcess, getEmberTestResult };