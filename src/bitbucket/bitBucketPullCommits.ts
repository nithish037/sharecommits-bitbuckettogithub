import { makeRequest, ResponseWithPossibleMessageOrData } from '@utils/RequestUtils';
import { Buffer } from 'buffer';

interface IUser {
    username: string;
    email: string;
    password: string;
    workspace: string;
    ignoreRepos: string;
}

export interface ICommitsBitbucket {
    hash: string;
    date: string;
    user: string;
}

export interface ICommitsBufferBitbucket {
    repo: string;
    commits: ICommitsBitbucket[];
}

/**
 * Commit Bitbucket API Docs: https://developer.atlassian.com/cloud/bitbucket/rest/api-group-commits/#api-group-commits
 */
interface IResponseCommit {
    author: {
        raw: string;
        [key: string]: unknown;
    };
    hash: string;
    date: string;
    [key: string]: unknown;
}

/**
 * Pagination Bitbucket API Docs: https://developer.atlassian.com/cloud/bitbucket/rest/intro/#pagination
 */
interface IResponseCommits extends ResponseWithPossibleMessageOrData {
    values: IResponseCommit[];
    next: string;
}

/**
 * Repos Bitbucket API Docs: https://developer.atlassian.com/cloud/bitbucket/rest/api-group-repositories/#api-repositories-workspace-get
 */
interface IResponseRepos extends ResponseWithPossibleMessageOrData {
    values: { slug: string; [key: string]: unknown }[];
    next: string;
}

const API_URL = 'https://api.bitbucket.org/2.0';

export class BitbucketPuller {
    private userName = this.user.username;
    private userPassword = this.user.password;
    private userWorkspace = this.user.workspace;
    private userEmail = this.user.email;
    private userIgnoreRepos = this.user.ignoreRepos;
    private authorizationBuffer = Buffer.from(this.userName + ':' + this.userPassword);
    private headers = {
        'Content-Type': 'application/json',
        Authorization: `Basic ${this.authorizationBuffer.toString('base64')}`,
    };
    private commitsBuffer: ICommitsBufferBitbucket[] = [];

    constructor(private user: Partial<IUser>) {}

    private getMail(authorRawStr: string) {
        // Extracts the mail address of the "raw author" string, e.g.
        // "abc <abc@somewhere.com>", via a regular expression

        const mailMatch = authorRawStr.match(/(?:<)(.*)(?=>)/);

        if (mailMatch) {
            return mailMatch[1]; // Second capture group
        } else {
            return '';
        }
    }

    private async getRepoCommits(repo: string) {
        // Returns all the commits made by the user in the specified repository
        const ignoreReposArr = this.userIgnoreRepos?.replace(/"/g, '').split(' ');

        if (ignoreReposArr?.includes(repo)) {
            console.log(`\x1b[36mIgnoring repo\x1b[0m \x1b[32m${repo}\x1b[0m \x1b[36mfor sharing commits\x1b[0m`);
            return;
        }

        console.log(`\x1b[36mGetting commits from Bitbucket for repo\x1b[0m \x1b[32m${repo}\x1b[0m\x1b[36m...\x1b[0m`);

        const commits: ICommitsBitbucket[] = [];

        let url =
            `${API_URL}/repositories/${this.userWorkspace}/${repo}/commits/` +
            '?fields=next,values.author,values.date,values.hash';

        let fetchFailed = false;

        // while loop that handles the pagination of the API
        while (url) {
            const data = (await makeRequest('GET', url, this.headers)) as IResponseCommits;

            if (data.ok) {
                data.values.forEach((item) => {
                    const mail = this.getMail(item.author.raw);
                    const userEmailArray = this.userEmail?.replace(/"/g, '').split(' ');

                    if (userEmailArray?.includes(mail)) {
                        commits.push({
                            hash: item.hash,
                            date: item.date,
                            user: mail,
                        });
                    }
                });

                url = data.next;
            } else {
                url = '';
                if (!(commits && commits.length)) {
                    fetchFailed = true;
                    console.log(`\x1b[31mFailed to fetch commits for\x1b[0m \x1b[33m${repo}\x1b[0m`);
                    await Promise.reject();
                }
            }
        }

        if (commits && commits.length > 0) {
            this.commitsBuffer.push({
                repo: repo,
                commits: commits,
            });
        } else {
            if (!fetchFailed) {
                console.log(`\x1b[35mNo commits present for repo\x1b[0m \x1b[32m${repo}\x1b[0m`);
            }
        }
    }

    public async getRepoNames() {
        // Gets the slugs of all repos found in the workspace

        console.log(
            `\x1b[36mGetting repo list from Bitbucket for workspace\x1b[0m \x1b[32m${this.userWorkspace}\x1b[0m\x1b[36m...\x1b[0m`
        );

        const results: string[] = [];

        let url = `${API_URL}/repositories/${this.userWorkspace}?fields=next,values.slug`;

        let fetchFailed = false;

        // while loop that handles the pagination of the API
        while (url) {
            const data = (await makeRequest('GET', url, this.headers)) as IResponseRepos;

            if (data.ok) {
                data.values.forEach((item) => {
                    results.push(item.slug);
                });

                url = data.next;
            } else {
                url = '';

                if (!(results && results.length)) {
                    fetchFailed = true;
                    console.log(`\x1b[31mFailed to fetch repos for\x1b[0m \x1b[33m${this.userWorkspace}\x1b[0m`);
                }
            }
        }

        if (results && results.length) {
            console.log(
                `\x1b[36mRepos present in workspace\x1b[0m \x1b[32m${
                    this.userWorkspace
                }\x1b[0m \x1b[36m: \x1b[0m \n \x1b[32m${results.join(' ')}\x1b[0m`
            );
            return results;
        } else {
            if (!fetchFailed) {
                console.log(`\x1b[35mNo repos present for\x1b[0m \x1b[32m${this.userWorkspace}\x1b[0m`);
            }
            return;
        }
    }

    public async getAllUserCommits(repos?: string[]) {
        if (repos && repos.length) {
            // Clearing Commits Buffer
            this.commitsBuffer = [];

            console.log(
                `\x1b[36mFetching commits from\x1b[0m \x1b[32m${repos.length}\x1b[0m \x1b[36mBitbucket repos...\x1b[0m`
            );

            const promises = repos.reduce<Promise<void>[]>((accumulator, repo) => {
                accumulator.push(this.getRepoCommits(repo));

                return accumulator;
            }, []);

            const ignoreRepoLength = this.userIgnoreRepos?.replace(/"/g, '').split(' ').length ?? 0;
            const reposLength = repos.length - ignoreRepoLength;
            const reposTotal = reposLength > 0 ? reposLength : 0;

            // Wait until all promises have been resolved
            const result = await Promise.allSettled(promises);

            const isAnyFetchFailed = result.some((result) => result.status === 'rejected');

            if (!isAnyFetchFailed) {
                console.log(
                    `\x1b[36mFetched commits from\x1b[0m \x1b[32m${reposTotal}\x1b[0m \x1b[36mBitbucket repos...\x1b[0m`
                );
            } else {
                console.log(
                    `\x1b[31mFailed to fetch commits from\x1b[0m \x1b[33m${reposTotal}\x1b[0m \x1b[31mBitbucket repos...\x1b[0m`
                );
            }

            return this.commitsBuffer;
        }
        return;
    }
}
