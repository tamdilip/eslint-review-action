const core = require('@actions/core');

module.exports = {
    REPO_TOKEN: core.getInput('repo-token'),
    PASSED_EMOJI: '✔️',
    FAILED_EMOJI: '⛔',
    TESTCASE_REPORT_HEADER: '⚠️TEST CASE REPORT⚠️'
}

