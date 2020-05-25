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
    existingMarkdownComment && (existingMarkdownCommentsList = existingMarkdownComment.replace(existingMarkdownComment.substring(0, existingMarkdownComment.indexOf("</h2>") + 5), "").split("* ").slice(1).map(comment => {

        let subArr = comment.split(": **`"),
            fixed = subArr[0].includes("✔️"),
            url = (fixed && subArr[0].replace("✔️", "").replace(/\s+/g, ' ').trim()) ||subArr[0].replace("⛔", "").replace(/\s+/g, ' ').trim(),
            message = subArr[1].replace("`**", "").replace("---", "").replace(/\s+/g, ' ').trim(),
            path = url.substring(url.indexOf("/") + 1, url.indexOf("#")),
            line = url.substring(url.lastIndexOf("#"), url.length),
            sha = url.substring(0, url.indexOf("/"));
        return {
            sha,
            url,
            path,
            line,
            fixed,
            message
        }
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
        console.log('octokit.hook.error', options.request.validate.line, options.request.validate.start_line);
        commonComments.push({
            fixed: false,
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

                if (alreadExistsPRComment.length == 0) {
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

    existingMarkdownCommentsList.forEach((issue, index) => {
        let issueData = issue;
        let existingComment = commonComments.findIndex((message) => message.line == issueData.line && message.path.trim() == issueData.path.trim() && message.message.trim() == issueData.message.trim());
        if (existingComment != -1)
            issueData.emoji = "❌";
        else
            issueData.emoji = "✔️";
        //existingComment != -1 && commonComments.splice(existingComment, 1);
        existingComment != -1 && existingMarkdownCommentsList.splice(index, 1);
    });
    markdownComments = markdownComments.concat(commonComments);
    console.log('markdownComments', markdownComments);

    if (markdownComments.length > 0) {

        const pendingIssues = markdownComments.filter(comment => !comment.fixed);
        let commentsCountLabel = `<h2 align=\"center\">⚠️ ${pendingIssues.length} :: ISSUES TO BE RESOLVED ⚠️</h2>\r\n\r\n`
        const overallCommentBody = markdownComments.reduce((acc, val) => {
            const link = val.fixed ? val.url : `https://github.com/${owner}/${repo}/blob/${sha}/${val.path}#L${val.line}`;
            acc = acc + `* ${link}\r\n`;
            acc = acc + `  ${val.emoji} : **${val.message}**\r\n---\r\n`;
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
