const GithubApiService = require('./github-api-service');
const path = require('path');
const url = require('url');
const fs = require('fs');

let isLintIssueAvailable = false;
let getLintStatus = () => {
    return isLintIssueAvailable;
}

let getErrorFiles = () => {
    const reportPath = path.resolve('eslint_report.json');
    const reportFile = fs.readFileSync(reportPath, 'utf-8')
    const reportContents = JSON.parse(reportFile);
    const errorFiles = reportContents.filter(es => es.errorCount > 0);
    return errorFiles;
};

let getExistingPrComments = async () => {
    const commentsInPR = await GithubApiService.getCommentsInPR();
    const existingPRcomments = commentsInPR.map((comment) => {
        return {
            path: comment.path,
            line: comment.line,
            message: comment.body
        }
    });
    return existingPRcomments;
};

let createOrUpdateEslintComment = async (changedFiles) => {
    const existingPRcomments = await getExistingPrComments();
    const errorFiles = getErrorFiles();

    for await (let errorFile of errorFiles) {
        const filePath = errorFile.filePath.replace(process.cwd() + '/', '');
        const prFilesWithError = changedFiles.find(changedFile => changedFile.filename == filePath);
        const url_parts = url.parse(prFilesWithError.contents_url, true);
        const commit_id = url_parts.query.ref;

        try {
            for await (let message of errorFile.messages) {
                let alreadExistsPRComment = existingPRcomments.filter((comment) => comment.path == filePath && comment.line == message.line && comment.message.trim() == message.message.trim());

                if (alreadExistsPRComment.length == 0)
                    await GithubApiService.commentEslistError({ message, commit_id, path: filePath }) && (isLintIssueAvailable = true);

            }
        }
        catch (error) {
            console.log('createComment error::', error);
        }
    }

};

module.exports = { createOrUpdateEslintComment, getLintStatus };