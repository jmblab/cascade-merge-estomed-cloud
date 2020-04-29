const core = require('@actions/core');
const github = require('@actions/github');
const axios = require('axios').default;

try {
    const repoKey = core.getInput('repo-key');
    const branchRefName = core.getInput('branch');
    const repoName = core.getInput('repo');

    const payload = github.context.payload;
    
    const branchName = branchRefName.replace('refs/', '');

    console.log(`Current repo name: ${repoName}`);
    console.log(`Current branch name: ${branchName}`);
} catch (error) {
    core.setFailed(error.message);
}