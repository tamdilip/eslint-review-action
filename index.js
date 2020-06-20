const EslintReportProcessor = require('./src/eslint-report-processor');
const MarkdownProcessor = require('./src/markdown-processor');
const GithubApiService = require('./src/github-api-service');
const CommandExecutor = require('./src/command-executor');
const Config = require('./src/config');

async function runScript() {

    const changedFiles = await GithubApiService.getFilesChanged();
    const filenames = changedFiles.map(f => f.filename);

    !Config.DISABLE_ESLINT && await CommandExecutor.runESlint(filenames);
    !Config.DISABLE_TEST && await CommandExecutor.runEmberTest();
    !Config.DISABLE_AUDIT && await CommandExecutor.runNpmAudit();

    await EslintReportProcessor.createOrUpdateEslintComment(changedFiles);

    let { body: existingMarkdownComment = '', id: comment_id } = await GithubApiService.getCommonGroupedComment(),
        existingMarkdownCommentsList = await MarkdownProcessor.getExistingCommentsList(existingMarkdownComment),
        newMarkdownCommentsList = GithubApiService.getFailedComments(),
        updatedCommonCommentsList = MarkdownProcessor.getUpdatedCommonCommentsList(existingMarkdownCommentsList, newMarkdownCommentsList),
        markdownComments = updatedCommonCommentsList.filter(comment => comment.fixed).concat(newMarkdownCommentsList);

    const body = await MarkdownProcessor.getGroupedCommentMarkdown(markdownComments);

    if (existingMarkdownComment)
        GithubApiService.updateCommonComment({ comment_id, body });
    else
        GithubApiService.createCommonComment(body);

    (EslintReportProcessor.getErrorFiles().length > 0 || markdownComments.find(comment => !comment.fixed)) && CommandExecutor.exitProcess();
}

runScript();
