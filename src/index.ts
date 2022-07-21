import {$fetch} from 'ohmyfetch'
import moment from "moment";

interface GithubApiListBranchResponse {
    refs: string[],
    cacheKey: string
}

interface GithubApiRepoTree {
    sha: string;
    url: string;
    tree: { path: string; mode: string; type: string; sha: string; size: number; url: string; }[];
    truncated: boolean;
}

interface GithubApiRepoContent {
    type: string;
    encoding: string;
    size: number;
    name: string;
    path: string;
    content: string;
    sha: string;
    url: string;
    git_url: string;
    html_url: string;
    download_url: string;
    _links: { git: string; self: string; html: string; };
}

function MAGAZINE_NAME_MAP(x: string | null) {
    if (x == 'the_economist')
        return '01_economist'
    else if (x == 'new_yorker')
        return '02_new_yorker'
    else if (x == 'atlantic')
        return '04_atlantic'
    else if (x == 'wired')
        return '05_wired'
    else if (x == 'guardian')
        return '09_guardian'
    else
        return null
}

const MAGAZINE_NAME = ['the_economist', 'new_yorker', 'atlantic', 'wired', 'guardian']
const FILE_TYPE = ['epub', 'mobi', 'pdf']


class Params {
    readonly magazine_name: string | null
    readonly file_type: string | null
    readonly date: number
    readonly action: string

    constructor(urlSearchParams: URLSearchParams) {
        let file_type = urlSearchParams.get('filetype') || 'none'
        this.magazine_name = urlSearchParams.get('magazine')

        if (FILE_TYPE.includes(file_type))
            this.file_type = file_type
        else
            this.file_type = null

        this.action = urlSearchParams.get('action') || 'url'

        let date = urlSearchParams.get('date')
        let tmp = moment(date || '', 'YYYYMMDD')
        this.date = tmp.isValid() ? tmp.valueOf() : moment().valueOf()
    }
}

class RepoHelper {
    protected owner: string
    protected repo: string
    //https://github.com/hehonghui/awesome-english-ebooks
    // https://raw.githubusercontent.com/hehonghui/awesome-english-ebooks/master/01_economist/te_2022.01.01/TheEconomist.2022.01.01.epub

    constructor(owner: string = 'hehonghui', repo: string = 'awesome-english-ebooks') {
        this.owner = owner
        this.repo = repo
    }

    async list_branch(): Promise<Array<string>> {
        let url = `https://github.com/${this.owner}/${this.repo}/refs?type=branch`
        const ret = await $fetch<GithubApiListBranchResponse>(url, {
            method: 'GET',
            headers: {Accept: 'application/json', 'User-Agent': 'ohmyfetch'},
        })
        return ret.refs
    }

    async get_main_branch(high_priority_branches: Array<string> = ['master', 'main']): Promise<string> {
        const all_branches = await this.list_branch()
        for (const stringsKey in all_branches) {
            if (high_priority_branches.includes(stringsKey)) {
                return stringsKey
            }
        }
        return all_branches[0]
    }

    async get_all_files_in_repo(): Promise<GithubApiRepoTree> {
        const branch = await this.get_main_branch(['master', 'main'])
        const url = `https://api.github.com/repos/${this.owner}/${this.repo}/git/trees/${branch}?recursive=1`
        return await $fetch<GithubApiRepoTree>(url, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                'User-Agent': 'ohmyfetch'
            }
        })
    }

    async get_target_path(magazine_name: string, date: number, file_type: string): Promise<string> {
        const files = await this.get_all_files_in_repo()
        const target_list_sorted = files.tree.filter(value => {
            const x = new RegExp(`^${MAGAZINE_NAME_MAP(magazine_name)}/.*\\.${file_type}$`)
            return x.test(value.path)
        }).sort((a, b) => {
            const s2date = (s: string): number => {
                const t = /(\d{4}\.\d{2}\.\d{2})/.exec(s)
                return t ? moment(t[0].replaceAll('.', '-')).valueOf() : 0
            }
            return Math.abs(s2date(a.path) - date) > Math.abs(s2date(b.path) - date) ? 1 : -1
        })
        console.log('Target Object:', target_list_sorted[0])
        return target_list_sorted[0].path
    }

    async get_content(content_path: string): Promise<GithubApiRepoContent> {
        // https://docs.github.com/cn/rest/repos/contents
        // https://api.github.com/repos/hehonghui/awesome-english-ebooks/contents/05_wired/2022.02.02/wired_2022.02.02.pdf
        const url = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${content_path}`
        const ret = await $fetch<GithubApiRepoContent>(url, {
            method: 'GET',
            headers: {Accept: 'application/json', 'User-Agent': 'ohmyfetch'}
        })
        console.log(ret)
        return ret
    }

}

const b64toBlob = (b64Data: string, sliceSize = 512) => {
    const byteCharacters = atob(b64Data);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        const slice = byteCharacters.slice(offset, offset + sliceSize);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }
    return new Blob(byteArrays);
}

export interface Env {
    // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
    STORAGE: KVNamespace;
}

export default {
    async fetch(
        request: Request,
        env: Env,
        ctx: ExecutionContext
    ): Promise<Response> {
        const url = new URL(request.url)
        const params = new Params(url.searchParams)

        const usage = `
This is a tool to get the download link of English magazines(The Economist/New Yorker/Atlantic/Wired/Guardian) from https://github.com/hehonghui/awesome-english-ebooks
usage:
    ${url.origin}/feed?magazine=<MAGAZINE_NAME>&date=<DATE>&filetype=<FILE_TYPE>&action=<ACTION>

    <MAGAZINE_NAME> (required)
        description :   the name of the magazine
        values      :   the_economist, new_yorker, atlantic, wired, guardian
        default     :   none
    <FILE_TYPE>     (required)
        description :   the type of the magazine file you want
        values      :   epub, mobi, pdf
        default     :   none
    <DATE>          (optional)   
        description :   the magazine publish date, if no match will return the nearest date of input
        values      :   latest, YYYYMMDD
        default     :   latest
    <ACTION>      (optional)   
        description :   the action of how to process the download link
        values      :   url, redirect, download
        default     :   url
        
    ${url.origin}/feed?magazine=the_economist&date=latest&filetype=pdf&action=url
`
        // check path
        if (url.pathname != '/feed') {
            return new Response(`Get request:${url.href}
Can not recognize the request path: ${url.pathname}
` + usage, {status: 400})
        }
        // check params
        if (!params.file_type || !params.magazine_name || !MAGAZINE_NAME_MAP(params.magazine_name)) {
            return new Response(`Get request:${url.href}
filetype:${params.file_type},magazine:${params.magazine_name}
required params must be gaven with proper value !
` + usage, {status: 404})
        }
        env.STORAGE
        console.log("URL:", request.url)

        let rh = new RepoHelper('hehonghui', 'awesome-english-ebooks')
        let path = await rh.get_target_path(params.magazine_name, params.date, params.file_type)
        let content_obj = await rh.get_content(path)
        let resp
        switch (params.action) {
            case 'url':
                resp = new Response(content_obj.download_url)
                break
            case 'redirect':
                resp = new Response('', {status: 302, headers: {Location: content_obj.download_url}})
                break
            case 'download':
                let blob = content_obj.content ?
                    b64toBlob(content_obj.content) :
                    await fetch(content_obj.download_url).then(value => value.blob())
                resp = new Response(blob, {headers: {'Content-Disposition': `attachment; filename="${content_obj.name}"`}})
                break
            default:
                resp = new Response('Un excepted action:' + params.action)
        }
        return resp;
    },
};

