const core = require('@actions/core');
const github = require('@actions/github');
const axios = require('axios').default;

try {
    const repoKey = core.getInput('repo-key');

    const payload = github.context.payload;
    
    const branchRefName = payload.ref;
    const branchName = branchRefName.replace('refs/', '');

    console.log(`Current repo name: ${github.event.repository.name}`);
    console.log(`Current branch name: ${branchName}`);
} catch (error) {
    core.setFailed(error.message);
}