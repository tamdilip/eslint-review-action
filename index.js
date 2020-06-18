const GithubApiService = require('./src/github-api-service');
const MarkdownProcessor = require('./src/markdown-processor');
const CommandExecutor = require('./src/command-executor');
const EslintReportProcessor = require('./src/eslint-report-processor');

async function runScript() {

    const changedFiles = await GithubApiService.getFilesChanged();
    const filenames = changedFiles.map(f => f.filename);

    await CommandExecutor.runESlint(filenames);
    await CommandExecutor.runEmberTest();
    await EslintReportProcessor.createOrUpdateEslintComment(changedFiles);

    let { body: existingMarkdownComment = '', id: comment_id } = await GithubApiService.getCommonGroupedComment(),
        existingMarkdownCommentsList = await MarkdownProcessor.getExistingCommentsList(existingMarkdownComment),
        newMarkdownCommentsList = GithubApiService.getFailedComments(),
        updatedCommonCommentsList = MarkdownProcessor.getUpdatedCommonCommentsList(existingMarkdownCommentsList, newMarkdownCommentsList),
        markdownComments = updatedCommonCommentsList.filter(comment => comment.fixed).concat(newMarkdownCommentsList);

    const body = await MarkdownProcessor.getGroupedCommentMarkdown(markdownComments);

    console.log('updatedCommonCommentsList', updatedCommonCommentsList);
    if (existingMarkdownComment)
        GithubApiService.updateCommonComment({ comment_id, body });
    else
        GithubApiService.createCommonComment(body);

    (EslintReportProcessor.getErrorFiles().length > 0 || markdownComments.find(comment => !comment.fixed)) && CommandExecutor.exitProcess();
}

runScript();
