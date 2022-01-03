import fetch from 'cross-fetch';

export interface ResponseWithPossibleMessageOrData {
    message?: string;
    ok?: boolean;
    [key: string]: unknown;
}

type IHTTPMethods = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const hasJsonStructure = (res: Response) => {
    if (typeof res !== 'string') return false;
    try {
        const result = JSON.parse(res);
        const type = Object.prototype.toString.call(result);
        return type === '[object Object]' || type === '[object Array]';
    } catch (err) {
        return false;
    }
};

const _logRequestError = async (res: Response) => {
    // Prints the failed status and its url
    let msg: string = '';

    // console.log('res', res);
    // console.log('res_json', await res.json());
    // If failed reponse includes a message append it
    if (res.url.includes('github') || hasJsonStructure(res)) {
        const res_json = (await res.json()) as Omit<ResponseWithPossibleMessageOrData, 'ok'>;
        res_json.message ? (msg = `\x1b[36m:\x1b[0m\n    \x1b[31m${res_json.message}\x1b[0m`) : (msg = '');
    }

    console.log(
        `\x1b[35mRequest to\x1b[0m \x1b[32m${res.url}\x1b[0m ` +
            `\x1b[35mfailed with status\x1b[0m \x1b[33m${res.status}\x1b[0m${
                msg ? msg : `\x1b[35m:\x1b[0m\n    \x1b[31m${res.statusText}\x1b[0m`
            }`
    );
};

export const makeRequest = async <T extends Record<string, unknown>>(
    method: IHTTPMethods,
    url: string,
    headers: HeadersInit,
    body?: { [K in keyof T]: T[K] }
) => {
    const opts: RequestInit = {
        method: method,
        headers: headers,
    };

    if (method === 'PUT' || method === 'POST' || method === 'PATCH') {
        opts.body = JSON.stringify(body);
    }

    try {
        const res = await fetch(url, opts);

        if (res.ok) {
            const result = (await res.json()) as ResponseWithPossibleMessageOrData;
            result.ok = true;
            return result;
        } else {
            _logRequestError(res);
            return { ok: false };
        }
    } catch (err: unknown) {
        console.log(`\x1b[31m"${err}"\x1b[0m`);
        return { ok: false };
    }
};
