async function runScript() {
    const github = require('@actions/github');
    const core = require('@actions/core');
    const exec = require('@actions/exec');
    const path = require('path');
    const url = require('url');
    const fs = require('fs');

    const repoToken = core.getInput('repo-token');
    const octokit = new github.GitHub(repoToken);
    const { context } = github;
    console.log('context', context);
    const { repo: { owner, repo }, issue: { number: issue_number }, sha } = context;
    const { pull_request: { number: pull_number } } = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));

    let { data: issuesListCommentsData } = await octokit.issues.listComments({
        owner,
        repo,
        issue_number
    }),
        existingMarkdownComment = "";
    issuesListCommentsData.length > 0 && ({ 0: { body: existingMarkdownComment, id: comment_id } } = issuesListCommentsData);

    let existingMarkdownCommentsList = [];
    existingMarkdownComment.includes("**LINE**: ") && (existingMarkdownCommentsList = existingMarkdownComment.split("**LINE**: ").map((comment) => {
        let error = { line: "", path: "", message: "" };
        if (comment.includes("**FILE**") && comment.includes("**ERROR**")) {
            error.line = parseInt(comment.substring(comment.indexOf("[") + 1, comment.indexOf("]")).replace(/\s+/g, ' ').trim());
            error.path = comment.substring(comment.indexOf("**FILE**: ") + 10, comment.indexOf("**ERROR**:") - 5).replace(/\s+/g, ' ').trim();
            error.message = comment.substring(comment.indexOf("**ERROR**: ") + 11, comment.lastIndexOf(">") - 3).replace(/\s+/g, ' ').trim();
        }
        return error;
    }));
    console.log('existingMarkdownCommentsList', existingMarkdownCommentsList);

    const { data: changedFiles } = await octokit.pulls.listFiles({
        owner,
        repo,
        pull_number
    });
    const filenames = changedFiles.map(f => f.filename);

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
        await exec.exec('npm run lint -- ' + filenames.join(' '), [], options);
    } catch (error) {
        console.log('Lint run error::', error);
    }

    const reportPath = path.resolve('eslint_report.json');
    const reportFile = fs.readFileSync(reportPath, 'utf-8')
    const reportContents = JSON.parse(reportFile);
    const errorFiles = reportContents.filter(es => es.errorCount > 0);

    let commonComments = [];
    octokit.hook.error("request", async (error, options) => {
        console.log('octokit.hook.error');
        commonComments.push({
            emoji: "❌",
            message: options.body,
            line: options.line,
            path: options.path
        });
    });

    const { data: listCommentsInPR } = await octokit.pulls.listComments({
        owner,
        repo,
        pull_number,
    });
    console.log('listCommentsInPR', listCommentsInPR);

    const existingPRcomments = listCommentsInPR.map((comment) => {
        return {
            path: comment.path,
            line: comment.line,
            message: comment.body
        }
    });

    for await (let errorFile of errorFiles) {
        const path = errorFile.filePath.replace(process.cwd() + '/', '');
        const prFilesWithError = changedFiles.find(changedFile => changedFile.filename == path);
        const url_parts = url.parse(prFilesWithError.contents_url, true);
        const commit_id = url_parts.query.ref;

        try {
            for await (let message of errorFile.messages) {
                let alreadExistsPRComment = existingPRcomments.filter((comment) => {
                    return comment.path == path && comment.line == message.line && comment.message.trim() == message.message.trim()
                });
                console.log('alreadExistsPRComment', alreadExistsPRComment.length);
                if (alreadExistsPRComment.length == 0) {
                    console.log('octokit.pulls.createComment');
                    await octokit.pulls.createComment({
                        owner,
                        repo,
                        pull_number,
                        body: message.message,
                        commit_id,
                        path,
                        line: message.line
                    });
                }
            }
        }
        catch (error) {
            console.log('createComment error::', error);
        }
    }

    console.log('commonComments', commonComments);

    let markdownComments = existingMarkdownCommentsList;

    let emptyCommentIndex = existingMarkdownCommentsList.findIndex(comment => !comment.path);
    emptyCommentIndex != -1 && existingMarkdownCommentsList.splice(emptyCommentIndex, 1);
    existingMarkdownCommentsList.forEach((issue) => {
        let issueData = issue;
        if (issueData.path) {
            let existingComment = commonComments.findIndex((message) => message.line == issueData.line && message.path.trim() == issueData.path.trim() && message.message.trim() == issueData.message.trim());
            if (existingComment != -1)
                issueData.emoji = "❌";
            else
                issueData.emoji = "✔️";
            existingComment != -1 && commonComments.splice(existingComment, 1);
        }
    });
    markdownComments = markdownComments.concat(commonComments);
    console.log('markdownComments', markdownComments);

    if (markdownComments.length > 0) {
        const pendingIssues = markdownComments.filter(comment => comment.emoji == "❌");
        let commentsCountLabel = "**`⚠️ " + pendingIssues.length + " :: ISSUES TO BE RESOLVED ⚠️  `**\r\n\r\n> "
        const overallCommentBody = markdownComments.reduce((acc, val) => {
            const link = `https://github.com/${owner}/${repo}/blob/${sha}/${val.path}#L${val.line}`;
            acc = acc + val.emoji + " **LINE**: [" + val.line + "](" + link + ")\r\n> ";
            acc = acc + "📕 **FILE**: " + val.path + "\r\n> ";
            acc = acc + "❌ **ERROR**: " + val.message + "\r\n\r\n> ";
            return acc;
        }, commentsCountLabel);
        console.log('overallCommentBody', overallCommentBody);

        if (existingMarkdownCommentsList.length > 0) {
            console.log('octokit.issues.updateComment');
            octokit.issues.updateComment({
                owner,
                repo,
                comment_id,
                body: overallCommentBody
            });
        } else {
            console.log('octokit.issues.createComment');
            octokit.issues.createComment({
                owner,
                repo,
                issue_number,
                body: overallCommentBody
            });
        }
    }
}

runScript();
