async function runScript() {
    const core = require('@actions/core');
    const github = require('@actions/github');
    const url = require('url');
    const fs = require('fs');

    const CLIEngine = require("eslint").CLIEngine;

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
    console.log(filenames);

    const cli = new CLIEngine({
        envs: ["browser", "mocha"],
        useEslintrc: false,
        rules: {
            semi: 2
        }
    });
    const { results: reportContents } = cli.executeOnFiles(filenames);

    const errorFiles = reportContents.filter(es => es.errorCount > 0);

    let commonComments = [];

    octokit.hook.error("request", async (error, options) => {
        commonComments.push({
            body: options.body,
            line: options.line,
            path: options.path
        });
        /* octokit.issues.createComment({
            owner,
            repo,
            issue_number,
            body: "FILE: " + options.path + " :: LINE: " + options.line + " :: ERROR: " + options.body
        }); */
    });

    errorFiles.forEach(async (errorFile) => {
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
    });

    let commentsCountLabel = "**`⚠️ " + commonComments.length + " :: ISSUES TO BE RESOLVED ⚠️  `**\r\n\r\n> "
    const overallCOmmentBody = commonComments.reduce((acc, val) => {
        acc = acc + "**LINE**: " + val.line + "\r\n> ";
        acc = acc + "**FILE**: " + val.path + "\r\n> ";
        acc = acc + "**ERROR**: " + val.body + "\r\n\r\n> ";
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
