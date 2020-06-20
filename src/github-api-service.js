const github = require('@actions/github');
const Config = require('./config');
const fs = require('fs');

console.log('github.token', github.token);
console.log('github.context.token', github.context.token);

const { context } = github,
    octokit = new github.GitHub(Config.REPO_TOKEN),
    { repo: { owner, repo }, issue: { number: issue_number }, sha } = context,
    { pull_request: { number: pull_number } } = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));

let getMetaInfo = () => {
    return {
        sha,
        repo,
        owner,
        pull_number,
        issue_number
    }
};

let failedComments = [];
let getFailedComments = () => {
    console.log('failedComments', failedComments);
    return failedComments;
};


octokit.hook.error('request', async (error, options) => {
    failedComments.push({
        fixed: false,
        emoji: Config.FAILED_EMOJI,
        message: options.body,
        line: options.line,
        path: options.path
    });
});

let getCommonGroupedComment = async () => {
    let { data: { 0: commonGroupedComment = {} } = [{}] } = await octokit.issues.listComments({
        owner,
        repo,
        issue_number
    }) || {};
    console.log('commonGroupedComment', commonGroupedComment);
    return commonGroupedComment;
};

let getFilesChanged = async () => {
    let { data: changedFiles } = await octokit.pulls.listFiles({
        owner,
        repo,
        pull_number
    }) || {};
    return changedFiles;
};

let getCommentsInPR = async () => {
    let { data: commentsInPR } = await octokit.pulls.listComments({
        owner,
        repo,
        pull_number,
    }) || {};
    return commentsInPR;
};

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

let getCommentLineURL = (value) => {
    return `https://github.com/${owner}/${repo}/blob/${sha}/${value.path}#L${value.line}`;
};

let updateCommonComment = ({ comment_id, body }) => {
    octokit.issues.updateComment({
        owner,
        repo,
        comment_id,
        body
    });
};

let createCommonComment = (body) => {
    octokit.issues.createComment({
        owner,
        repo,
        issue_number,
        body
    });
};

module.exports = { getFailedComments, getCommonGroupedComment, getFilesChanged, getCommentsInPR, commentEslistError, getCommentLineURL, updateCommonComment, createCommonComment, getMetaInfo };
