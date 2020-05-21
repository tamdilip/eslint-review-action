async function runScript() {
    const core = require('@actions/core');
    const github = require('@actions/github');
    const path = require('path');
    const url = require('url');
    const fs = require('fs');

    const CLIEngine = require("eslint").CLIEngine;

    (async function main() {

        const cli = new CLIEngine({
            envs: ["browser", "mocha"],
            useEslintrc: false,
            rules: {
                semi: 2
            }
        });

        // lint myfile.js and all files in lib/
        const report = cli.executeOnFiles(["app/router.js"]);
        console.log(report);
    })().catch((error) => {
        process.exitCode = 1;
        console.error(error);
    });

    const repoToken = core.getInput('repo-token');
    const octokit = new github.GitHub(repoToken);
    const context = github.context;
    const { repo: { owner, repo } } = context;

    const eventPath = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
    const pull_number = eventPath.pull_request.number;

    const changedFiles = await octokit.pulls.listFiles({
        owner,
        repo,
        pull_number
    });
    const filename = changedFiles.data[0].filename;

    const reportPath = path.resolve('eslint_report.json');
    const reportFile = fs.readFileSync(reportPath, 'utf-8')
    const reportContents = JSON.parse(reportFile);

    const url_parts = url.parse(changedFiles.data[0].contents_url, true);
    const commit_id = url_parts.query.ref;

    octokit.pulls.createComment({
        owner,
        repo,
        pull_number,
        body: reportContents.filter(es => es.errorCount > 0)[0].messages[0].message,
        commit_id,
        path: filename,
        line: reportContents.filter(es => es.errorCount > 0)[0].messages[0].line
    });

}

runScript();
