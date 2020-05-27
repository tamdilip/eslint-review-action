module.exports =
/******/ (function(modules, runtime) { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete installedModules[moduleId];
/******/ 		}
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	__webpack_require__.ab = __dirname + "/";
/******/
/******/ 	// the startup function
/******/ 	function startup() {
/******/ 		// Load entry module and return exports
/******/ 		return __webpack_require__(925);
/******/ 	};
/******/
/******/ 	// run startup
/******/ 	return startup();
/******/ })
/************************************************************************/
/******/ ({

/***/ 403:
/***/ (function(module) {

module.exports = eval("require")("@actions/github");


/***/ }),

/***/ 418:
/***/ (function(module) {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 622:
/***/ (function(module) {

module.exports = require("path");

/***/ }),

/***/ 747:
/***/ (function(module) {

module.exports = require("fs");

/***/ }),

/***/ 835:
/***/ (function(module) {

module.exports = require("url");

/***/ }),

/***/ 922:
/***/ (function(module) {

module.exports = eval("require")("@actions/exec");


/***/ }),

/***/ 925:
/***/ (function(__unusedmodule, __unusedexports, __webpack_require__) {

async function runScript() {
    const github = __webpack_require__(403);
    const core = __webpack_require__(418);
    const exec = __webpack_require__(922);
    const path = __webpack_require__(622);
    const url = __webpack_require__(835);
    const fs = __webpack_require__(747);

    const repoToken = core.getInput('repo-token');
    const octokit = new github.GitHub(repoToken);
    const { context } = github;
    const { repo: { owner, repo }, issue: { number: issue_number }, sha } = context;
    const { pull_request: { number: pull_number } } = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));

    let { data: issuesListCommentsData } = await octokit.issues.listComments({
        owner,
        repo,
        issue_number
    }),
        existingMarkdownComment = "";
    issuesListCommentsData.length > 0 && ({ 0: { body: existingMarkdownComment, id: comment_id } } = issuesListCommentsData);

    let testCaseMarkdownIndex = existingMarkdownComment.indexOf("<h3>⚠️TEST CASE REPORT⚠️</h3>");
    testCaseMarkdownIndex != -1 && (existingMarkdownComment = existingMarkdownComment.substring(0, testCaseMarkdownIndex));

    let existingMarkdownCommentsList = [];
    existingMarkdownComment && (existingMarkdownCommentsList = existingMarkdownComment.replace(existingMarkdownComment.substring(0, existingMarkdownComment.indexOf("</h2>") + 5), "").split("* ").slice(1).map(comment => {

        let subArr = comment.replace(/\r/g, "").replace(/\n/g, "").split(": **");
        console.log('subArr', subArr);
        let fixed = subArr[0].includes("✔️"),
            emoji = fixed ? "✔️" : "⛔",
            lineUrl = fixed ? subArr[0].replace("✔️", "").replace(/\s+/g, ' ').trim() : subArr[0].replace("⛔", "").replace(/\s+/g, ' ').trim(),
            message = subArr[1].replace("**", "").replace("---", "").replace(/\s+/g, ' ').trim(),
            repoRemovedPath = lineUrl.replace("https://github.com/" + owner + "/" + repo + "/blob/", ""),
            path = repoRemovedPath.substring(repoRemovedPath.indexOf("/") + 1, repoRemovedPath.indexOf("#")),
            line = repoRemovedPath.substring(repoRemovedPath.lastIndexOf("#") + 2, repoRemovedPath.length),
            sha = repoRemovedPath.substring(0, repoRemovedPath.indexOf("/"));

        return {
            sha,
            emoji,
            lineUrl,
            path,
            line,
            fixed,
            message
        }
    }));
    console.log('existingMarkdownCommentsList', existingMarkdownCommentsList);

    const { data: changedFiles } = await octokit.pulls.listFiles({
        owner,
        repo,
        pull_number
    });
    const filenames = changedFiles.map(f => f.filename);

    let emberTestResult = "";
    const options = {};
    options.listeners = {
        stdout: (data) => {
            console.log('stdout');
            if (data.toString().includes("# tests")) {
                emberTestResult = data.toString();
            }
        },
        stderr: (data) => {
            console.log('stderr');
        },
        errline: (data) => {
            console.log('errline');
        }
    };

    try {
        await exec.exec('npm run lint -- ' + filenames.join(' '), [], options);
    } catch (error) {
        console.log('Lint run error::', error);
    }

    try {
        await exec.exec('npm run test', [], options);
    } catch (error) {
        console.log('Ember Test run error::', error);
    }

    console.log('emberTestResult', emberTestResult);

    const reportPath = path.resolve('eslint_report.json');
    const reportFile = fs.readFileSync(reportPath, 'utf-8')
    const reportContents = JSON.parse(reportFile);
    const errorFiles = reportContents.filter(es => es.errorCount > 0);

    let commonComments = [];
    octokit.hook.error("request", async (error, options) => {
        commonComments.push({
            fixed: false,
            emoji: "⛔",
            message: options.body,
            line: options.line,
            path: options.path
        });
    });

    const { data: listCommentsInPR } = await octokit.pulls.listComments({
        owner,
        repo,
        pull_number,
    });

    const existingPRcomments = listCommentsInPR.map((comment) => {
        return {
            path: comment.path,
            line: comment.line,
            message: comment.body
        }
    });

    for await (let errorFile of errorFiles) {
        const path = errorFile.filePath.replace(process.cwd() + '/', '');
        const prFilesWithError = changedFiles.find(changedFile => changedFile.filename == path);
        const url_parts = url.parse(prFilesWithError.contents_url, true);
        const commit_id = url_parts.query.ref;

        try {
            for await (let message of errorFile.messages) {
                let alreadExistsPRComment = existingPRcomments.filter((comment) => {
                    return comment.path == path && comment.line == message.line && comment.message.trim() == message.message.trim()
                });

                if (alreadExistsPRComment.length == 0) {
                    await octokit.pulls.createComment({
                        owner,
                        repo,
                        pull_number,
                        body: message.message,
                        commit_id,
                        path,
                        line: message.line
                    });
                }
            }
        }
        catch (error) {
            console.log('createComment error::', error);
        }
    }

    console.log('commonComments', commonComments);


    existingMarkdownCommentsList.forEach((issue, index) => {
        let issueData = issue;

        let existingComment = commonComments.findIndex((message) => {
            return message.line == issueData.line && message.path.trim() == issueData.path.trim() && message.message.trim() == issueData.message.trim()
        });
        if (existingComment != -1) {
            issueData.fixed = false;
            issueData.emoji = "⛔";
        }
        else {
            issueData.fixed = true;
            issueData.emoji = "✔️";
        }
    });

    let markdownComments = existingMarkdownCommentsList.filter(comment => comment.fixed);

    console.log('AfterSplicedExistingMarkdownCommentsList', markdownComments);

    markdownComments = markdownComments.concat(commonComments);
    console.log('markdownComments', markdownComments);

    const pendingIssues = markdownComments.filter(comment => !comment.fixed);
    const fixedIssues = markdownComments.filter(comment => comment.fixed);

    if (markdownComments.length > 0) {

        let commentsCountLabel = `<h2 align=\"center\">⚠️ ${fixedIssues.length} :: ISSUES FIXED | ${pendingIssues.length} :: ISSUES TO BE RESOLVED ⚠️</h2>\r\n\r\n`
        let overallCommentBody = markdownComments.reduce((acc, val) => {
            const link = val.fixed ? val.lineUrl : `https://github.com/${owner}/${repo}/blob/${sha}/${val.path}#L${val.line}`;
            acc = acc + `* ${link}\r\n`;
            acc = acc + `  ${val.emoji} : **${val.message}**\r\n---\r\n`;
            return acc;
        }, commentsCountLabel);

        console.log('overallCommentBody', overallCommentBody);

        let [TEST, PASS, SKIP, FAIL] = emberTestResult.split("#").map(t => t.replace(/^\D+/g, '').trim()).slice(1);
        let emberTestBody = `<h3>⚠️TEST CASE REPORT⚠️</h3>\r\n\t\t<table>\r\n\t\t\t<tr>\r\n\t\t\t\t<th>Tests</th><th>Pass</th><th>Skip</th><th>Fail</th>\r\n\t\t\t</tr>\r\n\t\t\t<tr>\r\n\t\t\t\t<td>${TEST}</td><td>${PASS}</td><td>${SKIP}</td><td>${FAIL}</td>\r\n\t\t\t</tr>\r\n\t</table>`;

        overallCommentBody = overallCommentBody + emberTestBody;

        console.log('overallCommentBodyWithTest', overallCommentBody);

        if (existingMarkdownCommentsList.length > 0) {
            octokit.issues.updateComment({
                owner,
                repo,
                comment_id,
                body: overallCommentBody
            });
        } else {
            octokit.issues.createComment({
                owner,
                repo,
                issue_number,
                body: overallCommentBody
            });
        }

    }

    pendingIssues.length > 0 && exec.exec('exit 1');
}

runScript();


/***/ })

/******/ });