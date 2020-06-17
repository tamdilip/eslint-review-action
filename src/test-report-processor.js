const CommandExecutor = require('./command-executor');
const xml2js = require('xml2js');
const path = require('path');
const fs = require('fs');

let getTestCounts = async () => {
    const xmlReport = CommandExecutor.getEmberTestReportXmlString();
    /* const reportPath = path.resolve('test_report.xml');
    const xmlReport = fs.readFileSync(reportPath, 'utf-8'); */
    const jsonReport = await xml2js.parseStringPromise(xmlReport, { mergeAttrs: true, strict: false, explicitArray: false });
    let testCount = {
        TEST: parseInt(jsonReport.TESTSUITE.TESTS),
        SKIP: parseInt(jsonReport.TESTSUITE.SKIPPED),
        FAIL: parseInt(jsonReport.TESTSUITE.FAILURES)
    };
    testCount.PASS = testCount.TEST - testCount.FAIL;
    console.log(testCount);
    return testCount;
};

module.exports = { getTestCounts };
