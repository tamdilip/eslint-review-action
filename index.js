import GithubApiService from './src/github-api-service';
import MarkdownProcessor from './src/markdown-processor';
import CommandExecutor from './src/command-executor';
import EslintReportProcessor from './src/eslint-report-processor';

async function runScript() {

    const changedFiles = await GithubApiService.getFilesChanged();
    const filenames = changedFiles.map(f => f.filename);

    await CommandExecutor.runESlint(filenames);
    await CommandExecutor.runEmberTest();
    await EslintReportProcessor.createOrUpdateEslintComment(changedFiles);

    let { body: existingMarkdownComment, id: comment_id } = await GithubApiService.getCommonGroupedComment(),
        existingMarkdownCommentsList = await MarkdownProcessor.getExistingCommentsList(existingMarkdownComment),
        { failedComments: newMarkdownCommentsList } = GithubApiService,
        updatedCommonCommentsList = MarkdownProcessor.getUpdatedCommonCommentsList(existingMarkdownCommentsList, newMarkdownCommentsList),
        markdownComments = updatedCommonCommentsList.filter(comment => comment.fixed).concat(newMarkdownCommentsList);

    if (markdownComments.length > 0) {
        const body = MarkdownProcessor.getGroupedCommentMarkdown(markdownComments);

        if (updatedCommonCommentsList.length > 0)
            GithubApiService.updateCommonComment({ comment_id, body });
        else
            GithubApiService.createCommonComment(body);
    }

    markdownComments.find(comment => !comment.fixed) && CommandExecutor.exitProcess();
}

runScript();
