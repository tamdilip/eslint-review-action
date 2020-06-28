const CommandExecutor = require('./command-executor');
const Config = require('./config');
const DomParser = require('dom-parser');
const EslintReportProcessor = require('./eslint-report-processor');
const GithubApiService = require('./github-api-service');
const TestReportProcessor = require('./test-report-processor');

const {
    ESLINT_COMMON_ISSUES_DISCLAIMER,
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
    } = GithubApiService.getMetaInfo(),
    HtmlParser = new DomParser();

/**
 * Extracts existing list of errors from the string body of 
 * an issue comment having all information of eslint issues,
 * test report, test coverage and npm audit vulnerability
 * 
 * @param {String} existingMarkdownComment common grouped comment markdown string
 */
let getExistingCommentsList = (existingMarkdownComment) => {
    let existingMarkdownCommentsList = [];

    try {
        const dom = HtmlParser.parseFromString(existingMarkdownComment);
        const eslintIssuesList = dom.getElementById('eslint-issues-list');
        if (eslintIssuesList) {
            const issuesList = eslintIssuesList.getElementsByTagName("li");
            existingMarkdownCommentsList = issuesList.map(element => {
                let { 0: { textContent: lineUrl } } = element.getElementsByTagName("a"),
                    { 0: { textContent: message } } = element.getElementsByTagName("strong"),
                    fixed = message.includes(PASSED_EMOJI),
                    emoji = fixed ? PASSED_EMOJI : FAILED_EMOJI,
                    repoRemovedPath = lineUrl.replace("https://github.com/" + owner + "/" + repo + "/blob/", ""),
                    path = repoRemovedPath.substring(repoRemovedPath.indexOf("/") + 1, repoRemovedPath.indexOf("#")),
                    line = repoRemovedPath.substring(repoRemovedPath.lastIndexOf("#") + 2, repoRemovedPath.length),
                    sha = repoRemovedPath.substring(0, repoRemovedPath.indexOf("/"));

                return { sha, emoji, lineUrl, path, line, fixed, message };
            });
        }
    } catch (error) {
        CommandExecutor.setFailAction(true);
        console.log('markdown-processor::getExistingCommentsList', error);
    }

    return existingMarkdownCommentsList;
};

/**
 * Returns ember test report markdown string
 * with test counts and coverage in table format
 * 
 */
let getEmberTestBody = async () => {
    let testCounts = await TestReportProcessor.getTestCounts(),
        emberTestBody = '';

    if (testCounts) {
        const { TEST, PASS, SKIP, FAIL } = testCounts,
            COVERAGE = TestReportProcessor.getCoveragePercentage() || '';
        let status = `${PASSED_EMOJI} Threshold met`;
        if (FAIL_ON_TEST && !!FAIL) {
            status = `${FAILED_EMOJI} Testcases failing`;
            !Config.DISABLE_TEST && CommandExecutor.setFailAction(true);
        }
        if (COVERAGE < TEST_COVERAGE_THRESHOLD) {
            status = `${FAILED_EMOJI} Minimum test coverage should be ${TEST_COVERAGE_THRESHOLD} %`;
            !Config.DISABLE_TEST && CommandExecutor.setFailAction(true);
        }

        let tableLabel = `<h3>${TEST_EMOJI} <ins>${TESTCASE_REPORT_HEADER}</ins> : ${INFO_EMOJI} :: ${status}</h3>`,
            tableItemsList = [
                { header: 'TESTS', value: TEST },
                { header: 'PASS', value: PASS },
                { header: 'SKIP', value: SKIP },
                { header: 'FAIL', value: FAIL }
            ];
        COVERAGE && tableItemsList.push({ header: 'COVERAGE', value: COVERAGE });
        let tableHeaders = tableItemsList.map(item => `<th><h6>${item.header}</h6></th>`).join(''),
            tableRows = tableItemsList.map(item => `<td>${item.value}</td>`).join('');

        emberTestBody = `${tableLabel}<ul><li><table><tr>${tableHeaders}</tr><tr>${tableRows}</tr></table></li></ul>`;
    }

    return emberTestBody;
};

/**
 * Returns node module dependencies vulnerability
 * count report markdown string in table format
 * 
 */
let getAuditBody = async () => {
    let auditJSON = await CommandExecutor.getNpmAuditJson(),
        npmAuditBody = '';

    if (auditJSON) {
        let { metadata: { vulnerabilities } } = auditJSON,
            { info, low, moderate, high, critical } = vulnerabilities,
            status = `${PASSED_EMOJI} Threshold met`;
        if (vulnerabilities[VULNERABILITY_FAIL_ON] > 0) {
            status = `${FAILED_EMOJI} ${VULNERABILITY_FAIL_ON.toUpperCase()} - threshold not met`;
            !Config.DISABLE_AUDIT && CommandExecutor.setFailAction(true);
        }

        let tableLabel = `<h3>${VULNERABILITY_EMOJI} <ins>${VULNERABILITY_REPORT_HEADER}</ins> : ${INFO_EMOJI} :: ${status}</h3>`,
            tableItemsList = [
                { header: 'INFO', value: info },
                { header: 'LOW', value: low },
                { header: 'MODERATE', value: moderate },
                { header: 'HIGH', value: high },
                { header: 'CRITICAL', value: critical }
            ],
            tableHeaders = tableItemsList.map(item => `<th><h6>${item.header}</h6></th>`).join(''),
            tableRows = tableItemsList.map(item => `<td>${item.value}</td>`).join('');

        npmAuditBody = `<ul><li>${tableLabel}<table><tr>${tableHeaders}</tr><tr>${tableRows}</tr></table></li></ul>`;
    }

    return npmAuditBody;
};

/**
 * Returns github markdown string with grouped eslint errors,
 * test coverage and npm audit report.
 * 
 * @param {Array} markdownComments error comments list occured at unchanged portion of lines
 */
let getGroupedCommentMarkdown = async (markdownComments) => {
    const { length: overallPendingIssues } = EslintReportProcessor.getErrorFiles();

    if (!Config.DISABLE_ESLINT && overallPendingIssues > 0)
        CommandExecutor.setFailAction(true);

    let eslintIssuesBody = `<h3>${ESLINT_EMOJI} <ins>${ESLINT_REPORT_HEADER}</ins> : ${INFO_EMOJI} :: ${overallPendingIssues == 0 ? PASSED_EMOJI : FAILED_EMOJI} ${overallPendingIssues} - Pending</h3><br />`;

    if (!!markdownComments.length) {
        eslintIssuesBody = eslintIssuesBody.replace('</h3><br />', `<h4>(${ESLINT_COMMON_ISSUES_DISCLAIMER})</h4></h3><br />`);
        eslintIssuesBody = markdownComments.reduce((acc, val, index) => {
            const link = val.fixed ? val.lineUrl : GithubApiService.getCommentLineURL(val);
            acc = acc + `<li><a href=${link}>${link}</a>`;
            acc = acc + `<p>${val.emoji} : <strong>${val.message}</strong></p></li>${markdownComments.length - 1 != index ? `<hr />` : `</ul>`}`;
            return acc;
        }, `${eslintIssuesBody}<ul id="eslint-issues-list">`);
    }

    return eslintIssuesBody + await getEmberTestBody() + await getAuditBody();
};

/**
 * Returns updated list of grouped eslint errors comparing
 * with previous issue comment list of errors.
 * 
 * @param {Array} existingMarkdownCommentsList existing eslint errors list in grouped issue comment
 * @param {Array} newMarkdownCommentsList new eslint errors list in to update in issue comment
 */
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
