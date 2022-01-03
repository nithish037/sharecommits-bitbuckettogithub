import { GithubAPI } from './githubAPIHelpers';
import { Buffer } from 'buffer';
import { ICommitsBitbucket, ICommitsBufferBitbucket } from '@bitbucket/bitBucketPullCommits';

interface IUserGithub {
    owner: string;
    username: string;
    email: string;
    token: string;
}

export class GithubPusher {
    private owner = this.user.owner ?? '';
    private username = this.user.username ?? '';
    private userEmail = this.user.email ?? '';
    private token = this.user.token;
    private api = new GithubAPI(this.token, this.owner);
    private repo = this.githubRepoName;

    constructor(
        private user: Partial<IUserGithub>,
        private githubRepoName: string = 'BitbucketCommitsShadowContributions'
    ) {}

    private async initShadowRepo() {
        console.log('\x1b[36m"Creating GitHub shadow repo..."\x1b[0m');

        const response = await this.api.createRepo({
            name: this.repo,
            description: 'Created by ShareCommits-BitbucketToGithub',
            homepage: 'https://github.com/nmudd037/sharecommits-bitbuckettogithub',
            private: true,
            auto_init: true,
        });

        if (!response.ok) {
            throw new Error('Initialization of repository failed');
        }
    }

    private async getBlobContents(sha?: string | null) {
        console.log('\x1b[36mFetching content for shadow file\x1b[0m');

        const response = await this.api.getBlob(this.owner, this.repo, sha);

        return Buffer.from(response.content, response.encoding).toString('utf8');
    }

    private async queryBlobSha(filename: string) {
        console.log(`\x1b[36mVerifying content of shadow file\x1b[0m \x1b[32m${filename}\x1b[0m`);
        try {
            const head = await this.api.getLatestCommit(this.owner, this.repo, 'main');

            const res = await this.api.getTree(this.owner, this.repo, head.commit.tree.sha);

            // Loop over blobs in tree and find whether shadow exist
            const isTreeExist = res.tree.filter((tree) => tree.path === filename);

            if (isTreeExist.length) {
                return { exist: true, sha: isTreeExist[0].sha };
            }

            return { exist: false, sha: null };
        } catch (err) {
            console.log('error', err);
            throw new Error('Query for blob failed');
        }
    }

    private async commitShadow(filename: string, content: string, date: string) {
        console.log(
            `\x1b[36mCommiting content on date\x1b[0m \x1b[32m${new Date(
                date
            )}\x1b[0m \x1b[36mto shadow file\x1b[0m \x1b[32m${filename}\x1b[0m`
        );

        const head = await this.api.getLatestCommit(this.owner, this.repo, 'main');

        const tree = await this.api.modifyTree(this.owner, this.repo, head.commit.tree.sha, [
            {
                path: filename,
                mode: '100644',
                type: 'blob',
                content: content,
            },
        ]);

        const commit = await this.api.createCommit(this.owner, this.repo, {
            message: `Update ${filename}`,
            tree: tree.sha,
            parents: [head.sha],
            author: {
                name: this.username,
                email: this.userEmail,
                date: date,
            },
        });

        return await this.api.updateRef(this.owner, this.repo, 'main', commit.sha);
    }

    private async makeOrUpdateShadow(repoName: string, commits: ICommitsBitbucket[], content: string) {
        let commitsAdded = 0;

        let contentArray: string[];

        await commits.reduce<Promise<void>>(async (promise, commit) => {
            // This line will wait for the last async function to finish the first iteration uses an already resolved Promise so, it will immediately continue.
            await promise;

            // Convert lines in str to array for easier handling
            contentArray = content.split('\n');

            // Check that the Bitbucket hash is not already in the shadow file
            if (!contentArray.includes(commit.hash)) {
                contentArray.push(commit.hash);

                content = contentArray.join('\n').trim();

                // Commit content to shadow file
                await this.commitShadow(repoName, content, commit.date);

                commitsAdded += 1;
            }
        }, Promise.resolve());

        // Print msg: "- Added X commits from [REPO/SHADOW NAME]"
        console.log(
            `\x1b[36m- Added\x1b[0m \x1b[32m${commitsAdded}\x1b[0m \x1b[36mcommits ` +
                `from\x1b[0m \x1b[32m${repoName}\x1b[0m`
        );
    }

    private async getOrInitShadowContent(repoName: string) {
        const shadowFilename = repoName;

        const blob = await this.queryBlobSha(shadowFilename);

        // Get the current content in the shadow file, if shadow does not exist,
        // we init a new content string
        let content;

        if (blob.exist) {
            content = await this.getBlobContents(blob.sha);
        } else {
            content = '';
        }

        return content;
    }

    public async sync(bitbucketData?: ICommitsBufferBitbucket[]) {
        if (bitbucketData && bitbucketData.length) {
            // Create GitHub shadow repository if it doesn't already exist
            if (!(await this.api.checkRepoExists(this.repo))) {
                await this.initShadowRepo();
            }

            // For each repository on Bitbucket, update (or create) shadow file on GitHub
            await bitbucketData.reduce<Promise<void>>(async (promise, data, index) => {
                // This line will wait for the last async function to finish the first iteration uses an already resolved Promise so, it will immediately continue.
                await promise;

                const { commits, repo: repoName } = data;

                // Print msg: "Syncing X out of Y Bitbucket repos"
                console.log(
                    `\x1b[36mSyncing\x1b[0m \x1b[32m${index + 1}\x1b[0m \x1b[36mout of\x1b[0m \x1b[32m${
                        bitbucketData.length
                    }\x1b[0m \x1b[36mBitbucket repos\x1b[0m`
                );

                const content = await this.getOrInitShadowContent(repoName);

                await this.makeOrUpdateShadow(repoName, commits, content);
            }, Promise.resolve());
        }
        return;
    }
}
