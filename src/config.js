const core = require('@actions/core');

module.exports = {
    COVERAGE_REPORT_PATH: 'coverage/coverage-summary.json',
    DISABLE_AUDIT: core.getInput('disable-npm-audit') || false,
    DISABLE_ESLINT: core.getInput('disable-eslint') || false,
    DISABLE_TEST: core.getInput('disable-ember-test') || false,
    DISABLE_TEST_COVERAGE: core.getInput('disable-test-coverage') || false,
    ESLINT_FAILED_TEXT: core.getInput('eslint-failed-text') || 'Pending',
    ESLINT_PASSED_TEXT: core.getInput('eslint-passed-text') || 'Fixed',
    ESLINT_REPORT_HEADER: core.getInput('eslint-report-header') || 'ESLINT ISSUES',
    ESLINT_REPORT_PATH: 'eslint_report.json',
    FAILED_EMOJI: core.getInput('pass-emoji') || '⛔',
    PASSED_EMOJI: core.getInput('fail-emoji') || '✔️',
    REPO_TOKEN: core.getInput('repo-token'),
    TEST_REPORT_PATH: 'test_report.xml',
    TESTCASE_REPORT_HEADER: core.getInput('test-report-header') || 'TEST CASE REPORT',
    VULNERABILITY_REPORT_HEADER: core.getInput('vulnerability-report-header') || 'VULNERABILITY REPORT'
}
