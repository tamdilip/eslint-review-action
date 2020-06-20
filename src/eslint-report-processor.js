const fs = require('fs');
const path = require('path');
const url = require('url');
const Config = require('./config');
const GithubApiService = require('./github-api-service');


let getErrorFiles = () => {
    let errorFiles = [];
    try {
        const reportPath = path.resolve(Config.ESLINT_REPORT_PATH),
            reportFile = fs.readFileSync(reportPath, 'utf-8'),
            reportContents = JSON.parse(reportFile);
        errorFiles = reportContents.filter(es => es.errorCount > 0);
    } catch (error) {
        console.log('eslint-report-processor::getErrorFiles', error);
    }

    return errorFiles;
};

let getExistingPrComments = async () => {
    const commentsInPR = await GithubApiService.getCommentsInPR(),
        existingPRcomments = commentsInPR.map((comment) => {
            return {
                path: comment.path,
                line: comment.line,
                message: comment.body
            }
        });

    return existingPRcomments;
};

let createOrUpdateEslintComment = async (changedFiles) => {
    const existingPRcomments = await getExistingPrComments(),
        errorFiles = getErrorFiles();

    for await (let errorFile of errorFiles) {
        const filePath = errorFile.filePath.replace(process.cwd() + '/', ''),
            prFilesWithError = changedFiles.find(changedFile => changedFile.filename == filePath),
            url_parts = url.parse(prFilesWithError.contents_url, true),
            commit_id = url_parts.query.ref;

        try {
            for await (let message of errorFile.messages) {
                const alreadExistsPRComment = existingPRcomments.find((comment) => comment.path == filePath && comment.line == message.line && comment.message.trim() == message.message.trim());

                if (!alreadExistsPRComment)
                    await GithubApiService.commentEslistError({ message, commit_id, path: filePath });
            }
        }
        catch (error) {
            console.log('eslint-report-processor::createOrUpdateEslintComment--', error);
        }
    }
};

module.exports = {
    createOrUpdateEslintComment,
    getErrorFiles
};
