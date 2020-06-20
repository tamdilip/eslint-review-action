
const CommandExecutor = require('./command-executor');
const Config = require('./config');
const GithubApiService = require('./github-api-service');
const TestReportProcessor = require('./test-report-processor');


const { ESLINT_REPORT_HEADER, TESTCASE_REPORT_HEADER, VULNERABILITY_REPORT_HEADER, ESLINT_PASSED_TEXT, ESLINT_FAILED_TEXT, PASSED_EMOJI, FAILED_EMOJI } = Config;
const { owner, repo } = GithubApiService.getMetaInfo();

let getExistingCommentsList = (existingMarkdownComment) => {
    let testCaseMarkdownIndex = existingMarkdownComment.indexOf(`<h3>🩺 <ins>${TESTCASE_REPORT_HEADER}</ins></h3>`);
    testCaseMarkdownIndex != -1 && (existingMarkdownComment = existingMarkdownComment.substring(0, testCaseMarkdownIndex));

    let existingMarkdownCommentsList = [];
    if (existingMarkdownComment) {
        let validMarkdownComments = existingMarkdownComment.replace(existingMarkdownComment.substring(0, existingMarkdownComment.indexOf("</h2>") + 5), "").split("* ").slice(1);

        existingMarkdownCommentsList = validMarkdownComments.map(comment => {
            let subArr = comment.replace(/\r/g, "").replace(/\n/g, "").split(": **"),
                fixed = subArr[0].includes(PASSED_EMOJI),
                emoji = fixed ? PASSED_EMOJI : FAILED_EMOJI,
                lineUrl = fixed ? subArr[0].replace(PASSED_EMOJI, "").replace(/\s+/g, ' ').trim() : subArr[0].replace(FAILED_EMOJI, "").replace(/\s+/g, ' ').trim(),
                message = subArr[1].replace("**", "").replace("---", "").replace(/\s+/g, ' ').trim(),
                repoRemovedPath = lineUrl.replace("https://github.com/" + owner + "/" + repo + "/blob/", ""),
                path = repoRemovedPath.substring(repoRemovedPath.indexOf("/") + 1, repoRemovedPath.indexOf("#")),
                line = repoRemovedPath.substring(repoRemovedPath.lastIndexOf("#") + 2, repoRemovedPath.length),
                sha = repoRemovedPath.substring(0, repoRemovedPath.indexOf("/"));

            return { sha, emoji, lineUrl, path, line, fixed, message };
        });
    };

    return existingMarkdownCommentsList;
};

let getEmberTestBody = async () => {
    let testCounts = await TestReportProcessor.getTestCounts(),
        emberTestBody = '';
    if (testCounts) {
        const { TEST, PASS, SKIP, FAIL } = testCounts,
            COVERAGE = await TestReportProcessor.getCoveragePercentage() || '';
        emberTestBody = `<h3>🩺 <ins>${TESTCASE_REPORT_HEADER}</ins></h3>\r\n\t\t<table>\r\n\t\t\t<tr>\r\n\t\t\t\t<th>TESTS</th><th>PASS</th><th>SKIP</th><th>FAIL</th>${COVERAGE ? '<th>COVERAGE</th>' : ''}\r\n\t\t\t</tr>\r\n\t\t\t<tr>\r\n\t\t\t\t<td>${TEST}</td><td>${PASS}</td><td>${SKIP}</td><td>${FAIL}</td>${COVERAGE ? `<td>${COVERAGE} %</td>` : ''}\r\n\t\t\t</tr>\r\n\t</table>`;
    }

    return emberTestBody;
};

let getAuditBody = async () => {
    let auditJSON = await CommandExecutor.getNpmAuditJson(),
        npmAuditBody = '';
    if (auditJSON) {
        let { metadata: { vulnerabilities: { info, low, moderate, high, critical } } } = auditJSON;
        npmAuditBody = `<h3>👽 <ins>${VULNERABILITY_REPORT_HEADER}</ins></h3>\r\n\t\t<table>\r\n\t\t\t<tr>\r\n\t\t\t\t<th>INFO</th><th>LOW</th><th>MODERATE</th><th>HIGH</th><th>CRITICAL</th>\r\n\t\t\t</tr>\r\n\t\t\t<tr>\r\n\t\t\t\t<td>${info}</td><td>${low}</td><td>${moderate}</td><td>${high}</td><td>${critical}</td>\r\n\t\t\t</tr>\r\n\t</table>`;
    }

    return npmAuditBody;
};

let getGroupedCommentMarkdown = async (markdownComments) => {
    const pendingIssues = markdownComments.filter(comment => !comment.fixed);
    const fixedIssues = markdownComments.filter(comment => comment.fixed);

    let eslintIssuesBody = '';
    if (!!markdownComments.length || !!fixedIssues.length) {
        let commentsCountLabel = `<h2>🛠 <ins>${ESLINT_REPORT_HEADER}</ins> :: ${fixedIssues.length} - ${ESLINT_PASSED_TEXT} 📍 ${pendingIssues.length} - ${ESLINT_FAILED_TEXT}</h2>\r\n\r\n`
        eslintIssuesBody = markdownComments.reduce((acc, val) => {
            const link = val.fixed ? val.lineUrl : GithubApiService.getCommentLineURL(val);
            acc = acc + `* ${link}\r\n`;
            acc = acc + `  ${val.emoji} : **${val.message}**\r\n---\r\n`;
            return acc;
        }, commentsCountLabel);
    }

    let overallCommentBody = eslintIssuesBody + await getEmberTestBody() + await getAuditBody();

    return overallCommentBody;
};

let getUpdatedCommonCommentsList = (existingMarkdownCommentsList, newMarkdownCommentsList) => {
    let updatedCommonCommentsList = existingMarkdownCommentsList.map((issue) => {
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

    return updatedCommonCommentsList;
};

module.exports = {
    getExistingCommentsList,
    getGroupedCommentMarkdown,
    getUpdatedCommonCommentsList
};
