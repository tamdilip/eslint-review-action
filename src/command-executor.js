const exec = require('@actions/exec');

let emberTestResult = '';

const options = {};
options.listeners = {
    stdout: (data) => {
        console.log('stdout');
        if (data.toString().includes('# tests')) {
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
        await exec.exec('npm run lint -- ' + filenames.join(' '), [], options);
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
    exec.exec('exit 1');
};


module.exports = { emberTestResult, runESlint, runEmberTest, exitProcess };