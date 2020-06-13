import core from '@actions/core';

export default {
    REPO_TOKEN: core.getInput('repo-token'),
    PASSED_EMOJI: core.getInput('lint-pass-emoji') || '✔️',
    FAILED_EMOJI: core.getInput('lint-fail-emoji') || '⛔',
    TESTCASE_REPORT_HEADER: core.getInput('test-report-header') || '⚠️TEST CASE REPORT⚠️'
}