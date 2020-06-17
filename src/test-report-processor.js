const path = require('path');
const fs = require('fs');

let getTestCounts = async () => {
    const reportPath = path.resolve('test_report.xml');
    const xmlReport = fs.readFileSync(reportPath, 'utf-8');
    const jsonReport = await xml2js.parseStringPromise(xmlReport, { mergeAttrs: true, strict: false, explicitArray: false });
    let testCount = {
        TEST: parseInt(result.TESTSUITE.TESTS),
        SKIP: parseInt(result.TESTSUITE.SKIPPED),
        FAIL: parseInt(result.TESTSUITE.FAILURES)
    };
    testCount.PASS = testCount.TEST - testCount.FAIL;
    console.log(testCount);
    return testCount;
};

module.exports = { getTestCounts };
