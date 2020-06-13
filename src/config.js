const core = require('@actions/core');

export default {
    REPO_TOKEN: core.getInput('repo-token'),
    PASSED_EMOJI: '✔️',
    FAILED_EMOJI: '⛔',
    TESTCASE_REPORT_HEADER: '⚠️TEST CASE REPORT⚠️'
}