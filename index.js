const core = require("@actions/core");
const github = require("@actions/github");

function getReleaseData(branchName) {
  const versionRegex = new RegExp(
    "^(?<mainBranch>.*)\\/(?<major>\\d+)\\.(?<minor>\\d+)\\.(?<patch>\\d+)$"
  );
  const regexMatch = versionRegex.exec(branchName);

  if (!regexMatch) {
    return null;
  }

  const major = regexMatch.groups.major * 1;
  const minor = regexMatch.groups.minor * 1;
  const patch = regexMatch.groups.patch * 1;

  return { major, minor, patch };
}

async function run() {
  try {
    const branchRefName = core.getInput("branch");
    const repoNameWithOwner = core.getInput("external-repo-name");
    const repoOwner = core.getInput("owner");
    const token = core.getInput("token");
    const externalRepoName = repoNameWithOwner.replace(`${repoOwner}/`, "");

    const octokit = new github.GitHub(token);

    const branchName = branchRefName.replace("refs/", "").replace("heads/", "");

    console.log(`External repo name: ${externalRepoName}`);
    console.log(`Current repo owner: ${repoOwner}`);
    console.log(`Current branch name: ${branchName}`);

    const branchData = getReleaseData(branchName);

    if (!branchData) {
      console.log("Not need external proj build");
      return;
    }

    let branchOnExternalRepo;
    try {
      branchOnExternalRepo = await octokit.repos.getBranch({
        owner: repoOwner,
        repo: externalRepoName,
        branch: branchName,
      });
    } catch (error) {
      console.log(JSON.stringify(error));
      if (error.status == 404 || error.status == 301) {
				console.log('404');

        const response = await octokit.git.listMatchingRefs({
          owner: repoOwner,
          repo: externalRepoName,
          ref: "heads/release",
          per_page: 100,
        });

        let branchNames = response.data
          .filter((d) => !!d.ref)
          .map((d) => {
						console.log(d);
						let name = d.ref.replace("refs/", "").replace("heads/", "");
						let sha = d.object.sha;

						return {name: d.ref, sha: sha};
					})
          .filter((d) => {
            const data = getReleaseData(d.name);

            if (data === null) {
              return false;
            }

            if (
              data.major == branchData.major &&
              data.minor == branchData.minor &&
              data.patch < branchData.patch
            ) {
              return true;
            }

            if (
              data.major == branchData.major &&
              data.minor < branchData.minor
            ) {
              return true;
            }

            if (data.major < branchData.major) {
              return true;
            }

            return false;
          })
          .sort((da, db) => {
            const a = getReleaseData(da.name);
            const b = getReleaseData(db.name);

            if (a.major < b.major) {
              return 1;
            }

            if (a.major == b.major && a.minor < b.minor) {
              return 1;
            }

            if (a.major == b.major && a.minor == b.minor && a.patch < b.patch) {
              return 1;
            }

            return -1;
          });

        if (!branchNames && !branchNames.some((e) => e)) {
          throw new Error(`Not found branches in ${externalRepoName} `);
        }
				console.log(branchNames);

        let earlierBranch = branchNames[0];
		console.log(`Earlier branch : ${earlierBranch.name}`);

		//console.log(`Earlier branch found: ${earlierBranch.data.name}`);
				
        const createRefResponse = await octokit.git.createRef({
          owner: repoOwner,
          repo: externalRepoName,
          ref: earlierBranch.name,
          sha: earlierBranch.sha,
        });

        if (createRefResponse.status != 201) {
          throw new Error(
            `Error while creating branch ${branchName} in ${externalRepoName}`
          );
        }

        branchOnExternalRepo = await octokit.repos.getBranch({
          owner: repoOwner,
          repo: externalRepoName,
          branch: branchName,
        });
      }
    }
    try {
      if (branchOnExternalRepo && branchOnExternalRepo.status == 200) {
        console.log(
          `External repo branch found, name: ${branchOnExternalRepo.data.name}`
        );

        const currentCommit = await octokit.git.getCommit({
          owner,
          externalRepoName,
          commit_sha: branchOnExternalRepo.data.sha,
        });

        const newCommit = await octokit.git.createCommit({
          owner,
          externalRepoName,
          message: "Automatic empty commit to trigger build",
          tree: currentCommit.data.tree.sha,
          parents: [currentCommit.data.sha],
        });

        await octokit.git.updateRef({
          owner,
          repo,
          ref: `heads/${branchName}`,
          sha: newCommit.data.sha,
        });
      }
    } catch (error) {
      console.log(JSON.stringify(error));

      throw new Error(
        `Error while creating commit on branch: ${branchName} in ${externalRepoName}`
      );
    }
    console.log("Operation completed");
  } catch (error) {
    core.setFailed(error.toString());
  }
}

run();
