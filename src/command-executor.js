const exec = require('@actions/exec');
const core = require('@actions/core');

const options = {};
options.listeners = {
    stdout: (data) => {
        console.log('stdout');
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
        await exec.exec('npx eslint --ext .js --output-file eslint_report.json --format json ' + filenames.join(' '), [], options);
    } catch (error) {
        console.log('Lint run error::', error);
    }
};

let runEmberTest = async () => {
    try {
        await exec.exec('npx ember test -r xunit --silent > test_report.xml', [], options);
        await exec.exec('ls');
    } catch (error) {
        console.log('Ember Test run error::', error);
    }
};

let exitProcess = () => {
    core.setFailed('linting failed');
};

module.exports = { runESlint, runEmberTest, exitProcess };