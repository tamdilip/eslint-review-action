
const CommandExecutor = require('./command-executor');
const Config = require('./config');
const EslintReportProcessor = require('./eslint-report-processor');
const GithubApiService = require('./github-api-service');
const TestReportProcessor = require('./test-report-processor');

const {
    ESLINT_EMOJI,
    ESLINT_REPORT_HEADER,
    FAIL_ON_TEST,
    FAILED_EMOJI,
    INFO_EMOJI,
    PASSED_EMOJI,
    TEST_COVERAGE_THRESHOLD,
    TEST_EMOJI,
    TESTCASE_REPORT_HEADER,
    VULNERABILITY_EMOJI,
    VULNERABILITY_FAIL_ON,
    VULNERABILITY_REPORT_HEADER
} = Config,
    {
        owner,
        repo
    } = GithubApiService.getMetaInfo();

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
            COVERAGE = TestReportProcessor.getCoveragePercentage() || '';
        let status = `${PASSED_EMOJI} Threshold met`;
        if (FAIL_ON_TEST && !!FAIL)
            status = `${FAILED_EMOJI} Testcases failing`;
        if (COVERAGE < TEST_COVERAGE_THRESHOLD)
            status = `${FAILED_EMOJI} Minimum test coverage should be ${TEST_COVERAGE_THRESHOLD} %`;

        emberTestBody = `<h3>${TEST_EMOJI} <ins>${TESTCASE_REPORT_HEADER}</ins> : ${INFO_EMOJI} :: ${status}</h3>\r\n\t\t<table>\r\n\t\t\t<tr>\r\n\t\t\t\t<th>TESTS</th><th>PASS</th><th>SKIP</th><th>FAIL</th>${COVERAGE ? '<th>COVERAGE</th>' : ''}\r\n\t\t\t</tr>\r\n\t\t\t<tr>\r\n\t\t\t\t<td>${TEST}</td><td>${PASS}</td><td>${SKIP}</td><td>${FAIL}</td>${COVERAGE ? `<td>${COVERAGE} %</td>` : ''}\r\n\t\t\t</tr>\r\n\t</table>`;
    }

    return emberTestBody;
};

let getAuditBody = async () => {
    let auditJSON = await CommandExecutor.getNpmAuditJson(),
        npmAuditBody = '';

    if (auditJSON) {
        let { metadata: { vulnerabilities } } = auditJSON,
            { info, low, moderate, high, critical } = vulnerabilities,
            status = `${PASSED_EMOJI} Threshold met`;
        if (vulnerabilities[VULNERABILITY_FAIL_ON] > 0)
            status = `${FAILED_EMOJI} ${VULNERABILITY_FAIL_ON} threshold not met`;

        npmAuditBody = `<h3>${VULNERABILITY_EMOJI} <ins>${VULNERABILITY_REPORT_HEADER}</ins> : ${INFO_EMOJI} :: ${status}</h3>\r\n\t\t<table>\r\n\t\t\t<tr>\r\n\t\t\t\t<th>INFO</th><th>LOW</th><th>MODERATE</th><th>HIGH</th><th>CRITICAL</th>\r\n\t\t\t</tr>\r\n\t\t\t<tr>\r\n\t\t\t\t<td>${info}</td><td>${low}</td><td>${moderate}</td><td>${high}</td><td>${critical}</td>\r\n\t\t\t</tr>\r\n\t</table>`;
    }

    return npmAuditBody;
};

let getGroupedCommentMarkdown = async (markdownComments) => {
    const { length: overallPendingIssues } = EslintReportProcessor.getErrorFiles();
    let eslintIssuesBody = `<h2>${ESLINT_EMOJI} <ins>${ESLINT_REPORT_HEADER}</ins> : ${INFO_EMOJI} :: ${overallPendingIssues == 0 ? PASSED_EMOJI : FAILED_EMOJI} ${overallPendingIssues} - Pending</h2>\r\n\r\n`;

    if (!!markdownComments.length) {
        eslintIssuesBody = eslintIssuesBody.replace('</h2>', '<h4>(issues in other than visible changed lines)</h4><br></h2>');
        eslintIssuesBody = markdownComments.reduce((acc, val) => {
            const link = val.fixed ? val.lineUrl : GithubApiService.getCommentLineURL(val);
            acc = acc + `* ${link}\r\n`;
            acc = acc + `  ${val.emoji} : **${val.message}**\r\n---\r\n`;
            return acc;
        }, eslintIssuesBody);
    }

    return eslintIssuesBody + await getEmberTestBody() + await getAuditBody();
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
