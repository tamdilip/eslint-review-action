
const TestReportProcessor = require('./test-report-processor');
const GithubApiService = require('./github-api-service');
const Config = require('./config');

const { TESTCASE_REPORT_HEADER, PASSED_EMOJI, FAILED_EMOJI } = Config;
const { owner, repo } = GithubApiService.getMetaInfo();

let getExistingCommentsList = (existingMarkdownComment) => {
    let testCaseMarkdownIndex = existingMarkdownComment.indexOf(`<h3>${TESTCASE_REPORT_HEADER}</h3>`);
    testCaseMarkdownIndex != -1 && (existingMarkdownComment = existingMarkdownComment.substring(0, testCaseMarkdownIndex));

    let existingMarkdownCommentsList = [];
    if (existingMarkdownComment) {
        existingMarkdownCommentsList = existingMarkdownComment.replace(existingMarkdownComment.substring(0, existingMarkdownComment.indexOf("</h2>") + 5), "").split("* ").slice(1).map(comment => {

            let subArr = comment.replace(/\r/g, "").replace(/\n/g, "").split(": **");

            let fixed = subArr[0].includes(PASSED_EMOJI),
                emoji = fixed ? PASSED_EMOJI : FAILED_EMOJI,
                lineUrl = fixed ? subArr[0].replace(PASSED_EMOJI, "").replace(/\s+/g, ' ').trim() : subArr[0].replace(FAILED_EMOJI, "").replace(/\s+/g, ' ').trim(),
                message = subArr[1].replace("**", "").replace("---", "").replace(/\s+/g, ' ').trim(),
                repoRemovedPath = lineUrl.replace("https://github.com/" + owner + "/" + repo + "/blob/", ""),
                path = repoRemovedPath.substring(repoRemovedPath.indexOf("/") + 1, repoRemovedPath.indexOf("#")),
                line = repoRemovedPath.substring(repoRemovedPath.lastIndexOf("#") + 2, repoRemovedPath.length),
                sha = repoRemovedPath.substring(0, repoRemovedPath.indexOf("/"));

            return {
                sha,
                emoji,
                lineUrl,
                path,
                line,
                fixed,
                message
            }
        });
    };
    return existingMarkdownCommentsList;
};

let getGroupedCommentMarkdown = async (markdownComments) => {
    const pendingIssues = markdownComments.filter(comment => !comment.fixed);
    const fixedIssues = markdownComments.filter(comment => comment.fixed);

    let overallCommentBody = '';
    if (!!markdownComments.length || !!fixedIssues.length) {
        let commentsCountLabel = `<h2 align=\"center\">⚠️ ${fixedIssues.length} :: ISSUES FIXED | ${pendingIssues.length} :: ISSUES TO BE RESOLVED ⚠️</h2>\r\n\r\n`
        overallCommentBody = markdownComments.reduce((acc, val) => {
            const link = val.fixed ? val.lineUrl : GithubApiService.getCommentLineURL(val);
            acc = acc + `* ${link}\r\n`;
            acc = acc + `  ${val.emoji} : **${val.message}**\r\n---\r\n`;
            return acc;
        }, commentsCountLabel);
    }

    let { TEST, PASS, SKIP, FAIL } = await TestReportProcessor.getTestCounts();
    let emberTestBody = `<h3>${Config.TESTCASE_REPORT_HEADER}</h3>\r\n\t\t<table>\r\n\t\t\t<tr>\r\n\t\t\t\t<th>Tests</th><th>Pass</th><th>Skip</th><th>Fail</th>\r\n\t\t\t</tr>\r\n\t\t\t<tr>\r\n\t\t\t\t<td>${TEST}</td><td>${PASS}</td><td>${SKIP}</td><td>${FAIL}</td>\r\n\t\t\t</tr>\r\n\t</table>`;

    overallCommentBody = overallCommentBody + emberTestBody;

    return overallCommentBody;
};

let getUpdatedCommonCommentsList = (existingMarkdownCommentsList, newMarkdownCommentsList) => {
    return existingMarkdownCommentsList.map((issue) => {
        const existingComment = newMarkdownCommentsList.find((message) => message.line == issue.line && message.path.trim() == issue.path.trim() && message.message.trim() == issue.message.trim());

        if (existingComment) {
            issue.fixed = false;
            issue.emoji = FAILED_EMOJI;
        }
        else {
            issue.fixed = true;
            issue.emoji = PASSED_EMOJI;
        }

        return issue;
    });
};

module.exports = { getExistingCommentsList, getGroupedCommentMarkdown, getUpdatedCommonCommentsList };