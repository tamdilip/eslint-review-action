const github = require('@actions/github');
const fs = require('fs');
const Config = require('./config');


const { context } = github,
    octokit = new github.GitHub(Config.REPO_TOKEN),
    { repo: { owner, repo }, issue: { number: issue_number }, sha } = context,
    { pull_request: { number: pull_number } } = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));

/**
 * Returns necessary meta info of a pull-request
 * for reusing in commenting and other git actions
 * 
 */
let getMetaInfo = () => {
    return {
        sha,
        repo,
        owner,
        pull_number,
        issue_number
    }
};

/**
 * Returns a list of failed comments, which is caused
 * because of the comments tried to made for error lines
 * apart from the actual changed lines portion visible in git diff
 * 
 */
let failedComments = [];
let getFailedComments = () => {
    return failedComments;
};

/**
 * Error handler for all github api calls via ocktokit service
 * 
 */
octokit.hook.error('request', async (error, options) => {
    failedComments.push({
        fixed: false,
        emoji: Config.FAILED_EMOJI,
        message: options.body,
        line: options.line,
        path: options.path
    });
});

/**
 * Returns the issue comment made for grouped eslint issues,
 * test report, test coverage and npm audit vulnerability
 * 
 */
let getCommonGroupedComment = async () => {
    let { data: { 0: commonGroupedComment = {} } = [{}] } = await octokit.issues.listComments({
        owner,
        repo,
        issue_number
    }) || {};

    console.log('commonGroupedComment', commonGroupedComment);
    return commonGroupedComment;
};

/**
 * Returns a list of files changed
 * under current pull-request
 * 
 */
let getFilesChanged = async () => {
    let { data: changedFiles } = await octokit.pulls.listFiles({
        owner,
        repo,
        pull_number
    }) || {};

    return changedFiles;
};

/**
 * Returns a list of inline comments under a pull-request
 */
let getCommentsInPR = async () => {
    let { data: commentsInPR = [] } = await octokit.pulls.listComments({
        owner,
        repo,
        pull_number,
    }) || [];

    if (Config.BOT_USER_NAME)
        commentsInPR = commentsInPR.filter(comment => comment.user.login === Config.BOT_USER_NAME);

    return commentsInPR;
};

/**
 * Creates an inline comment for a changed
 * file at specfic line of change
 * 
 * @param {Object} param0 required message, commit,id, file path
 */
let commentEslistError = async ({ message, commit_id, path }) => {
    return await octokit.pulls.createComment({
        owner,
        repo,
        pull_number,
        body: message.message,
        commit_id,
        path,
        line: message.line
    });
};

/**
 * returns a remote URL for specific line in a file at a specific commit
 * 
 * @param {Object} value required file path and line of change
 */
let getCommentLineURL = (value) => {
    return `https://github.com/${owner}/${repo}/blob/${sha}/${value.path}#L${value.line}`;
};

/**
 * Updates an existing issue comment with grouped common
 * report details for new commits after pull-request raised
 * 
 * @param {Object} param0 required commit id and comment body
 */
let updateCommonComment = ({ comment_id, body }) => {
    octokit.issues.updateComment({
        owner,
        repo,
        comment_id,
        body
    });
};

/**
 * Creates an issue comment with grouped eslint issues, test
 * report, test coverage and npm audit vulnerability details
 * 
 * @param {String} body required comment message body
 */
let createCommonComment = (body) => {
    octokit.issues.createComment({
        owner,
        repo,
        issue_number,
        body
    });
};

module.exports = {
    commentEslistError,
    createCommonComment,
    getCommentLineURL,
    getCommentsInPR,
    getCommonGroupedComment,
    getFailedComments,
    getFilesChanged,
    getMetaInfo,
    updateCommonComment
};
