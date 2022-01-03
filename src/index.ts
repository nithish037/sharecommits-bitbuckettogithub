import { BitbucketPuller } from '@bitbucket/bitBucketPullCommits';
import { GithubPusher } from '@github/githubPushCommits';
import dotenv from 'dotenv';

dotenv.config();

const BitbucketEnvVars = {
    BITBUCKET_USERNAME: process.env.BITBUCKET_USERNAME,
    BITBUCKET_EMAIL: process.env.BITBUCKET_EMAIL,
    BITBUCKET_PASSWORD: process.env.BITBUCKET_PASSWORD,
    BITBUCKET_WORKSPACE: process.env.BITBUCKET_WORKSPACE,
    BITBUCKET_IGNORE_REPOS: process.env.BITBUCKET_IGNORE_REPOS,
};

const GithubEnvVars = {
    GITHUB_OWNER: process.env.GITHUB_OWNER,
    GITHUB_USERNAME: process.env.GITHUB_USERNAME,
    GITHUB_EMAIL: process.env.GITHUB_EMAIL,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
};

const checkAllEnvVarsExist = (envVars: string[]) => {
    const envVarKeysArr = Object.keys(process.env);

    return envVars.every((envVar) => envVarKeysArr.includes(envVar));
};

console.log('\x1b[36mVerifying environment variables...\x1b[0m');

if (checkAllEnvVarsExist(Object.keys(BitbucketEnvVars)) && checkAllEnvVarsExist(Object.keys(GithubEnvVars))) {
    const shareCommits = async () => {
        const bitbucketPull = new BitbucketPuller({
            username: BitbucketEnvVars.BITBUCKET_USERNAME,
            email: BitbucketEnvVars.BITBUCKET_EMAIL,
            password: BitbucketEnvVars.BITBUCKET_PASSWORD,
            workspace: BitbucketEnvVars.BITBUCKET_WORKSPACE,
            ignoreRepos: BitbucketEnvVars.BITBUCKET_IGNORE_REPOS,
        });

        const repos = await bitbucketPull.getRepoNames();
        const bitbucketCommits = await bitbucketPull.getAllUserCommits(repos);

        const githubPush = new GithubPusher({
            owner: GithubEnvVars.GITHUB_OWNER,
            username: GithubEnvVars.GITHUB_USERNAME,
            email: GithubEnvVars.GITHUB_EMAIL,
            token: GithubEnvVars.GITHUB_TOKEN,
        });

        await githubPush.sync(bitbucketCommits);
    };

    shareCommits();
} else {
    console.log(
        '\x1b[31mPlease, provide all the required environment variables as specified in the Readme Doc!\x1b[0m'
    );
}
