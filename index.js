const core = require('@actions/core');
const github = require('@actions/github');

function getReleaseData(branchName) {
    const versionRegex = new RegExp('^(?<mainBranch>.*)\\/(?<major>\\d+)\\.(?<minor>\\d+)\\.(?<patch>\\d+)$');
    const regexMatch = versionRegex.exec(branchName);

    if(!regexMatch) {
        return null;
    }

    const major = regexMatch.groups.major * 1;
    const minor = regexMatch.groups.minor * 1;
    const patch = regexMatch.groups.patch * 1;

    return { major, minor, patch }
}

async function run() {
    try {
        const branchRefName = core.getInput('branch');
        const repoNameWithOwner = core.getInput('repo');    
        const repoOwner = core.getInput('owner');    
        const token = core.getInput('token');
        const repoName = repoNameWithOwner.replace(`${repoOwner}/`, '');

        const octokit = new github.GitHub(token);


        const branchName = branchRefName.replace('refs/', '').replace('heads/', '');
    
        console.log(`Current repo name: ${repoName}`);
        console.log(`Current repo owner: ${repoOwner}`);
        console.log(`Current branch name: ${branchName}`);
    
        const branchData = getReleaseData(branchName);
    
        if(!branchData) {
            console.log('Not need cascade merge');
            return;
        }
    
        const major = branchData.major;
        const minor = branchData.minor;
        const patch = branchData.patch;
    
        console.log(`Major version: ${major}`);
        console.log(`Major version: ${minor}`);
        console.log(`Patch version: ${patch}`);

        const response = await octokit.git.listMatchingRefs({
            owner: repoOwner,
            repo: repoName,
            ref: 'heads/release',
            per_page: 100
        });

        const branchNames = response.data
            .map(d => d.ref.replace('refs/', '').replace('heads/', ''))
            .map(v => branchName(d))
            .filter(data => {
                if(data.major == branchData.major && data.minor == branchData.minor && data.patch > branchData.patch) {
                    return true;
                }

                if(data.major == branchData.major && data.minor > branchData.minor) {
                    return true;
                }                

                if(data.major > branchData.major) {
                    return true;
                }

                return false;
            });

        console.log(branchNames);
    } catch (error) {
        core.setFailed(error.message);
    }    
}

run();