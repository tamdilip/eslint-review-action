# 🛠 [eslint-review-action](https://github.com/tamdilip/eslint-review-action.git)
Github Action to review code changes on a Pull-Request and add corresponding review comments for a clean Merge process.

This action repo mainly targets on Ember app, does eslint on only changed set of files in a pull-request and cosecutive commits. Also does ember testing along with code coverage for entire app, if ember-cli-code-coverage setup is configured. Together runs npm audit check to get the vulnerability report.

### 🕹 Usage: 
Add the following to your workflow `.yml` file in app (`secrets.GITHUB_TOKEN` is the default Personal Access Token(PAT) generated):

```yaml
name: Run eslint review action repo
uses: tamdilip/eslint-review-action@v1
with:
    repo-token: ${{ secrets.GITHUB_TOKEN }}
```


Incase of consuming this action by moving to private repo (`secrets.ACTION_TOKEN` should be a new private token to clone action):

```yaml
- name: Checkout GitHub Action Repo
        uses: actions/checkout@v2
        with:
          repository: tamdilip/eslint-review-action
          ref: v1
          token: ${{ secrets.ACTION_TOKEN }}
          path: .github/actions/eslint-review-action
      - name: Run eslint-review-action action
        uses: ./.github/actions/eslint-review-action
        with:
          repo-token: ${{ secrets.ACTION_TOKEN }}
```

#### Dynamic inputs and configurations ( add under `with:`)
Most of the action items can be configured dynamically as per the need with all these available set of config inputs here -  [action.yml](https://github.com/tamdilip/eslint-review-action/blob/master/action.yml).

<details>
<summary>All available inputs</summary>
<pre><code>
repo-token:
    description: 'Token used to interact with the Github API.'
    required: true
  bot-user-name:
    description: 'Set username of the token provide to filter out comments'
    required: false
    default: ''
  disable-eslint:
    description: 'Set true to stop linting.'
    required: false
    default: 'false'
  disable-ember-test:
    description: 'Set true to stop ember testing.'
    required: false
    default: 'false'
  disable-npm-audit:
    description: 'Set true to stop npm auditing.'
    required: false
    default: 'false'
  fail-on-test:
    description: 'Set true to fail the pull-request merge status, if ember test has failing test cases.'
    required: false
    default: 'false'
  disable-test-coverage:
    description: 'Set true to stop ember coverage execution, when ember test is enabled.'
    required: false
    default: 'false'
  test-coverage-threshold:
    description: 'Minimum test coverage percentage to pass the pull-request.'
    required: false
    default: '0'
  vulnerability-fail-on:
    description: 'Set vulnerability criteria to fail the pull-request merge status, OPTIONS: INFO/LOW/MODERATE/HIGH/CRITICAL'
    required: false
    default: ''
  pass-emoji:
    description: 'Emoji to indicate fixed eslint issue.'
    required: false
    default: '✔️'
  fail-emoji:
    description: 'Emoji to indicate failed eslint issue.'
    required: false
    default: '❌'
  info-emoji:
    description: 'Emoji to indicate status message.'
    required: false
    default: '📢'
  eslint-emoji:
    description: 'Emoji for eslint header label.'
    required: false
    default: '🛠'
  test-emoji:
    description: 'Emoji for test header label.'
    required: false
    default: '🔬'
  vulnerability-emoji:
    description: 'Emoji for vulnerability header label.'
    required: false
    default: '👽'
  eslint-report-header:
    description: 'Header text for Eslint issues.'
    required: false
    default: 'ESLINT ISSUES'
  test-report-header:
    description: 'Header text for Test case report.'
    required: false
    default: 'TEST CASE REPORT'
  vulnerability-report-header:
    description: 'Header text for node dependencies vulnerability report.'
    required: false
    default: 'VULNERABILITY REPORT'
  eslint-common-issues-disclaimer:
    description: 'Disclaimer text to explain about the common grouped set of eslint issue comment.'
    required: false
    default: 'issues listed below are in areas other than visible changed portion of lines'
</code></pre>
</details>

## Actions Output Visuals
#### 💬 Inline comment
For eslint issues occurred at actual changed portion of lines part of the pull-request and the visible diff section as below -

![Inline Comment](https://raw.githubusercontent.com/tamdilip/eslint-review-action/master/doc/Inline_Comment.png "Inline Comment")

#### 💬 Grouped common issue comment
For eslint issues occurred at other than changed portion of lines part of the pull-request and not at the visible diff section, along with test coverage and vulnerability report as below - 

![Grouped common issue comment](https://raw.githubusercontent.com/tamdilip/eslint-review-action/master/doc/Grouped_Issue_Comment.png "Grouped common issue comment")

#### 💬 Pull request action run status
Incase of any issues, the pull-request merge status will be displayed as below from the action run - 

![Pull request action run status](https://raw.githubusercontent.com/tamdilip/eslint-review-action/master/doc/Review_Action_Status.png "Pull request action run status")

## Local setup and development
```sh
$ git clone https://github.com/tamdilip/eslint-review-action.git
$ cd eslint-review-action
$ npm install
$ ncc build index.js
```

# References
 - [Github actions annotations disable issue](https://github.community/t/disable-github-actions-check-runs-from-annotating-files/118193)
 - [Ocktokit - Github REST API SDK](https://octokit.github.io/rest.js/v18)
 - [Caching node modules](https://help.github.com/en/actions/configuring-and-managing-workflows/caching-dependencies-to-speed-up-workflows)
 - [Github Actions Script](https://github.com/actions/github-script)
 - [ember-cli-code-coverage](https://github.com/kategengler/ember-cli-code-coverage)
 - [dom-parser](https://github.com/ershov-konst/dom-parser)
 - [xml2js](https://github.com/Leonidas-from-XIV/node-xml2js)

##### Happy coding :) !!
