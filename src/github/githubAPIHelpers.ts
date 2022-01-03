import { makeRequest, ResponseWithPossibleMessageOrData } from '@utils/RequestUtils';
import { Buffer } from 'buffer';

const API_URL = 'https://api.github.com';

/**
 * Create Trees Github API Docs: https://docs.github.com/en/rest/reference/git#trees
 */
interface ICreateTreesGithub {
    path: string;
    mode: string;
    type: string;
    // Note: Use either tree.sha or content to specify the contents of the entry. Using both tree.sha and content will return an error.
    sha?: string;
    content: string;
}

/**
 * Get Trees Github API Docs: https://docs.github.com/en/rest/reference/git#get-a-tree
 */
interface ITreeGithub extends Omit<ICreateTreesGithub, 'content'> {
    size: number;
    url: string;
}

interface ITreesGithub extends ResponseWithPossibleMessageOrData {
    sha: string;
    url: string;
    tree: ITreeGithub[];
}

/**
 * Create Commits Github API Docs: https://docs.github.com/en/rest/reference/git#commits
 */
interface ICreateCommitGithub {
    message: string;
    tree: string;
    parents: string[];
    author: {
        name: string;
        email: string;
        date: string;
    };
}

interface ICreatedCommitGithub extends ResponseWithPossibleMessageOrData {
    sha: string;
}

/**
 * Commit(latest) for a specific ref Github API Docs: https://docs.github.com/en/rest/reference/commits#get-a-commit
 */
interface ICommitGithub extends ResponseWithPossibleMessageOrData {
    sha: string;
    commit: {
        tree: {
            url: string;
            sha: string;
        };
    };
}

/**
 * Blobs Github API Docs: https://docs.github.com/en/rest/reference/git#get-a-blob
 */
interface IBlobGithub extends ResponseWithPossibleMessageOrData {
    content: string;
    encoding: BufferEncoding;
}

export class GithubAPI {
    private headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github.v3+json',
    };

    constructor(private token?: string, private owner?: string) {}

    public async checkRepoExists(repo_name: string) {
        const repo = await makeRequest('GET', `${API_URL}/repos/${this.owner}/${repo_name}`, this.headers);

        return repo.ok;
    }

    public async createRepo<T extends Record<string, unknown>>(body: { [K in keyof T]: T[K] }) {
        return await makeRequest('POST', `${API_URL}/user/repos`, this.headers, body);
    }

    /**
     * A Git blob (binary large object) is the object type used to store the contents of each file in a repository.
     */
    public async getBlob(owner: string, repo: string, file_sha?: string | null) {
        const url = `${API_URL}/repos/${owner}/${repo}/git/blobs/${file_sha}`;

        return (await makeRequest('GET', url, this.headers)) as IBlobGithub;
    }

    public async createBlob(
        owner: string,
        repo: string,
        content: WithImplicitCoercion<ArrayBuffer | SharedArrayBuffer>
    ) {
        const encodedContent = Buffer.from(content).toString('base64');

        const body = {
            content: encodedContent,
            encoding: 'base64',
        };

        const url = `${API_URL}/repos/${owner}/${repo}/git/blobs`;

        return await makeRequest('POST', url, this.headers, body);
    }

    private async handleTreeOps<T extends Record<string, unknown>>(
        owner: string,
        repo: string,
        body: { [K in keyof T]: T[K] }
    ) {
        const url = `${API_URL}/repos/${owner}/${repo}/git/trees`;

        return (await makeRequest('POST', url, this.headers, body)) as ITreesGithub;
    }

    public async createTree(owner: string, repo: string, treeEntries: ICreateTreesGithub[]) {
        const body = { tree: treeEntries };

        return this.handleTreeOps(owner, repo, body);
    }

    public async modifyTree(owner: string, repo: string, baseTree: string, treeEntries: ICreateTreesGithub[]) {
        const body = {
            tree: treeEntries,
            base_tree: baseTree,
        };
        return this.handleTreeOps(owner, repo, body);
    }

    public async createCommit(owner: string, repo: string, commit: ICreateCommitGithub) {
        const body = { ...commit };
        const url = `${API_URL}/repos/${owner}/${repo}/git/commits`;

        return (await makeRequest('POST', url, this.headers, body)) as ICreatedCommitGithub;
    }

    public async updateRef(owner: string, repo: string, branch: string, commit_sha: string, force: boolean = false) {
        const url = `${API_URL}/repos/${owner}/${repo}/git/refs/heads/${branch}`;

        return await makeRequest('PATCH', url, this.headers, {
            sha: commit_sha,
            force: force,
        });
    }

    public async getLatestCommitSha(owner: string, repo: string, ref: string) {
        const commit = await this.getLatestCommit(owner, repo, ref);
        return commit.sha;
    }

    public async getLatestCommit(owner: string, repo: string, ref: string) {
        const url = `${API_URL}/repos/${owner}/${repo}/commits/${ref}`;

        return (await makeRequest('GET', url, this.headers)) as ICommitGithub;
    }

    public async getContent(owner: string, repo: string, filename: string, commit: string) {
        const url = `${API_URL}/repos/${owner}/${repo}/content/${filename}?ref=${commit}`;

        return await makeRequest('GET', url, this.headers);
    }

    public async fetchContentUrl(url: string) {
        return await makeRequest('GET', url, this.headers);
    }

    public async getTree(owner: string, repo: string, sha: string) {
        const url = `${API_URL}/repos/${owner}/${repo}/git/trees/${sha}`;

        return (await makeRequest('GET', url, this.headers)) as ITreesGithub;
    }
}
