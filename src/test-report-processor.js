const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const CommandExecutor = require('./command-executor');
const Config = require('./config');


let getTestCounts = async () => {
    let testCount;
    try {
        const xmlReport = CommandExecutor.getEmberTestReportXmlString(),
            jsonReport = await xml2js.parseStringPromise(xmlReport, { mergeAttrs: true, strict: false, explicitArray: false });
        testCount = {
            TEST: parseInt(jsonReport.TESTSUITE.TESTS),
            SKIP: parseInt(jsonReport.TESTSUITE.SKIPPED),
            FAIL: parseInt(jsonReport.TESTSUITE.FAILURES)
        };
        testCount.PASS = testCount.TEST - testCount.FAIL;
    } catch (error) {
        console.log('test-report-processor::getTestCounts', error);
    }

    return testCount;
};


let getCoveragePercentage = () => {
    let coveragePercentage = '';
    try {
        const reportPath = path.resolve(Config.COVERAGE_REPORT_PATH),
            reportFile = fs.readFileSync(reportPath, 'utf-8'),
            reportContents = JSON.parse(reportFile);
        coveragePercentage = reportContents.total.lines.pct;
    } catch (error) {
        console.log('test-report-processor::getCoveragePercentage', error);
    }

    return coveragePercentage;
};

module.exports = {
    getCoveragePercentage,
    getTestCounts
};
