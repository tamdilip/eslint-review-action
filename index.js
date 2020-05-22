async function runScript() {
    const github = require('@actions/github');
    const core = require('@actions/core');
    const exec = require('@actions/exec');
    const path = require('path');
    const url = require('url');
    const fs = require('fs');

    /* const CLIEngine = require("eslint").CLIEngine; */

    const repoToken = core.getInput('repo-token');
    const octokit = new github.GitHub(repoToken);
    const context = github.context;
    const { repo: { owner, repo }, issue: { number: issue_number } } = context;

    const eventPath = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
    const pull_number = eventPath.pull_request.number;

    const { data: changedFiles } = await octokit.pulls.listFiles({
        owner,
        repo,
        pull_number
    });
    const filenames = changedFiles.map(f => f.filename);

    /* const cli = new CLIEngine({
        envs: ["browser", "mocha"],
        useEslintrc: false,
        rules: {
            semi: 2
        }
    });
    const { results: reportContents } = cli.executeOnFiles(filenames); */



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

    try {
        console.log('npm run lint -- ' + filenames.join(' '));
        await exec.exec('npm run lint -- ' + filenames.join(' '), [], options);
    } catch (error) {
        console.log('tryCatcherror');
    }


    //await exec.exec('npm install -g eslint');
    //await exec.exec('eslint --ext .js --output-file eslint_report.json --format json ' + filenames.join(' '));
    //await exec.exec('npm run lint -- ' + filenames.join(' '));
    const reportPath = path.resolve('eslint_report.json');
    const reportFile = fs.readFileSync(reportPath, 'utf-8')
    const reportContents = JSON.parse(reportFile);

    const errorFiles = reportContents.filter(es => es.errorCount > 0);

    let commonComments = [];

    octokit.hook.error("request", async (error, options) => {
        console.log('options', options);
        commonComments.push({
            body: options.body,
            line: options.line,
            path: options.path
        });

        let markDownBody = "📌 **LINE**: " + options.line + "\r\n> ";
        markDownBody = markDownBody + "❌ **ERROR**: " + options.body + "\r\n\r\n> ";

        /* octokit.pulls.createComment({
            owner,
            repo,
            pull_number,
            body: markDownBody,
            commit_id,
            path: options.path
        }); */
        octokit.issues.createComment({
            owner,
            repo,
            issue_number,
            body: markDownBody
        });
        /* octokit.issues.createComment({
            owner,
            repo,
            issue_number,
            body: "FILE: " + options.path + " :: LINE: " + options.line + " :: ERROR: " + options.body
        }); */
    });

    for await (let errorFile of errorFiles) {
        const path = errorFile.filePath.replace(process.cwd() + '/', '');
        const prFilesWithError = changedFiles.find(changedFile => changedFile.filename == path);
        const url_parts = url.parse(prFilesWithError.contents_url, true);
        const commit_id = url_parts.query.ref;
        console.log(commit_id);
        try {
            await octokit.pulls.createComment({
                owner,
                repo,
                pull_number,
                body: errorFile.messages[0].message,
                commit_id,
                path,
                line: errorFile.messages[0].line
            });
        }
        catch (error) {
            console.log('tryerror', error);
        }
    }

    /* errorFiles.forEach(async (errorFile) => {
        const path = errorFile.filePath.replace(process.cwd() + '/', '');
        console.log(path);
        const prFilesWithError = changedFiles.find(changedFile => changedFile.filename == path);
        const url_parts = url.parse(prFilesWithError.contents_url, true);
        const commit_id = url_parts.query.ref;
        try {
            await octokit.pulls.createComment({
                owner,
                repo,
                pull_number,
                body: errorFile.messages[0].message,
                commit_id,
                path,
                line: errorFile.messages[0].line
            });
        }
        catch (error) {
            console.log('tryerror', error);
        }
    }); */

    let commentsCountLabel = "**`⚠️ " + commonComments.length + " :: ISSUES TO BE RESOLVED ⚠️  `**\r\n\r\n> "
    const overallCOmmentBody = commonComments.reduce((acc, val) => {
        acc = acc + "📌 **LINE**: " + val.line + "\r\n> ";
        acc = acc + "📕 **FILE**: " + val.path + "\r\n> ";
        acc = acc + "❌ **ERROR**: " + val.body + "\r\n\r\n> ";
        return acc;
    }, commentsCountLabel);

    octokit.issues.createComment({
        owner,
        repo,
        issue_number,
        body: overallCOmmentBody
    });

}

runScript();
