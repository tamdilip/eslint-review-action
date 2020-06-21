const core = require('@actions/core');

module.exports = {
    COVERAGE_REPORT_PATH: 'coverage/coverage-summary.json',
    DISABLE_AUDIT: core.getInput('disable-npm-audit').toLowerCase() === 'true',
    DISABLE_ESLINT: core.getInput('disable-eslint').toLowerCase() === 'true',
    DISABLE_TEST: core.getInput('disable-ember-test').toLowerCase() === 'true',
    DISABLE_TEST_COVERAGE: core.getInput('disable-test-coverage').toLowerCase() === 'true',
    ESLINT_EMOJI: core.getInput('eslint-emoji'),
    ESLINT_REPORT_HEADER: core.getInput('eslint-report-header'),
    ESLINT_REPORT_PATH: 'eslint_report.json',
    FAIL_ON_TEST: core.getInput('fail-on-test').toLowerCase() === 'true',
    FAILED_EMOJI: core.getInput('fail-emoji'),
    INFO_EMOJI: core.getInput('info-emoji'),
    PASSED_EMOJI: core.getInput('pass-emoji'),
    REPO_TOKEN: core.getInput('repo-token'),
    TEST_COVERAGE_THRESHOLD: core.getInput('test-coverage-threshold'),
    TEST_EMOJI: core.getInput('test-emoji'),
    TEST_REPORT_PATH: 'test_report.xml',
    TESTCASE_REPORT_HEADER: core.getInput('test-report-header'),
    VULNERABILITY_EMOJI: core.getInput('vulnerability-emoji'),
    VULNERABILITY_FAIL_ON: core.getInput('vulnerability-fail-on').toLowerCase(),
    VULNERABILITY_REPORT_HEADER: core.getInput('vulnerability-report-header')
}
