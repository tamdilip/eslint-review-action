async function runScript() {
    const core = require('@actions/core');
    const github = require('@actions/github');
    const path = require('path');
    const url = require('url');
    const fs = require('fs');

    const ev = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
    const prNum = ev.pull_request.number;
    console.log(prNum);

    const repoToken = core.getInput('repo-token');

    const octokit = new github.GitHub(repoToken);

    const changedFiles = await octokit.pulls.listFiles({
        owner: context.repo.owner,
        repo: context.repo.repo,
        pull_number: prNum
    });

    const filename = changedFiles.data[0].filename;
    console.log(filename);

    const reportPath = path.resolve('eslint_report.json');
    console.log(reportPath);

    const reportFile = await fs.readFileSync(reportPath, 'utf-8');
    console.log(reportFile);

    const reportContents = JSON.parse(reportFile);
    console.log(reportContents);


    const url_parts = url.parse(changedFiles.data[0].contents_url, true);
    const commitId = url_parts.query.ref;

    octokit.pulls.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        pull_number: prNum,
        body: reportContents.filter(es => es.errorCount > 0)[0].messages[0].message,
        commit_id: commitId,
        path: filename,
        line: reportContents.filter(es => es.errorCount > 0)[0].messages[0].line
    });

}

runScript();
