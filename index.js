const core = require('@actions/core');
const github = require('@actions/github');
const axios = require('axios').default;

try {
    const branchRefName = core.getInput('branch');
    const repoName = core.getInput('repo');    
    const branchName = branchRefName.replace('refs/', '').replace('heads/');

    console.log(`Current repo name: ${repoName}`);
    console.log(`Current branch name: ${branchName}`);

    const versionRegex = new RegExp('^(?<mainBranch>.*)\\/(?<major>\\d+)\\.(?<minor>\\d+)\\.(?<patch>\\d+)$');
    const regexMatch = versionRegex.exec(branchName);

    if(!regexMatch) {
        console.log('Not need cascade merge');
        return;
    }

    const major = regexMatch.groups.major;
    const minor = regexMatch.groups.minor;
    const patch = regexMatch.groups.patch;

    console.log(`Major version: ${major}`);
    console.log(`Major version: ${minor}`);
    console.log(`Major version: ${patch}`);
} catch (error) {
    core.setFailed(error.message);
}