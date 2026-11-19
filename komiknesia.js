
// ID: ext_komiknesia
// NAME: Komiknesia
// TYPE: comic
// VERSION: 1.0.0
// COLOR: #e53935
// ICON: https://www.komiknesia.net/favicon.ico
// REFERER: https://www.komiknesia.net/

const BASE_URL = "https://www.komiknesia.net";

async function request(url) {
    const response = await fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0",
            "Referer": BASE_URL + "/"
        }
    });

    if (!response.ok) {
        throw new Error("HTTP Error: " + response.status);
    }

    return await response.text();
}

function decode(text) {
    return text
        .replace(/&amp;/g, "&")
        .replace(/&#038;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&nbsp;/g, " ")
        .trim();
}

function cleanUrl(url) {
    if (!url) return "";
    if (url.startsWith("//")) return "https:" + url;
    if (url.startsWith("/")) return BASE_URL + url;
    return url;
}

function getAttr(html, attr) {
    const match = html.match(
        new RegExp(attr + '=["\\']([^"\\']+)["\\']', "i")
    );
    return match ? decode(match[1]) : "";
}

const KonmikExtension = {
    async getList(page, query, filters) {
        const search = query
            ? "/?s=" + encodeURIComponent(query)
            : "/page/" + (page || 1) + "/";

        const html = await request(BASE_URL + search);
        const manga_list = [];

        const blocks = html.match(
            /<div[^>]*class=["'][^"']*(?:bsx|utao|listupd)[^"']*["'][\s\S]*?<\/div>/gi
        ) || [];

        const links = html.match(
            /<a[^>]+href=["'][^"']+["'][^>]*>[\s\S]*?<\/a>/gi
        ) || [];

        for (const block of blocks) {
            const href = getAttr(block, "href");
            const img = getAttr(block, "src") ||
                        getAttr(block, "data-src");
            const title = getAttr(block, "title") ||
                          (block.match(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/i) || [])[1];

            if (!href || !title) continue;

            manga_list.push({
                title: decode(title.replace(/<[^>]+>/g, "")),
                cover: cleanUrl(img),
                endpoint: href
            });
        }

        return { manga_list };
    },

    async getDetail(slug) {
        const url = cleanUrl(slug);
        const html = await request(url);

        const titleMatch = html.match(
            /<h1[^>]*>([\s\S]*?)<\/h1>/i
        );

        const coverMatch = html.match(
            /<img[^>]+(?:data-src|src)=["']([^"']+)["'][^>]*>/i
        );

        const descMatch = html.match(
            /<div[^>]*class=["'][^"']*(?:entry-content|description|synopsis)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
        );

        const chapters = [];
        const chapterRegex =
            /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

        let match;

        while ((match = chapterRegex.exec(html)) !== null) {
            const chapterTitle = decode(
                match[2].replace(/<[^>]*>/g, "").trim()
            );

            if (/chapter|chap|episode/i.test(chapterTitle)) {
                chapters.push({
                    title: chapterTitle,
                    endpoint: match[1]
                });
            }
        }

        return {
            title: titleMatch
                ? decode(titleMatch[1].replace(/<[^>]*>/g, ""))
                : "Unknown",
            cover: coverMatch
                ? cleanUrl(coverMatch[1])
                : "",
            description: descMatch
                ? decode(descMatch[1].replace(/<[^>]*>/g, ""))
                : "",
            chapters: chapters.reverse()
        };
    },

    async getChapterImages(endpoint) {
        const html = await request(cleanUrl(endpoint));
        const images = [];

        const contentMatch = html.match(
            /<div[^>]*class=["'][^"']*(?:reader-area|reading-content|chapter-content)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
        );

        const content = contentMatch
            ? contentMatch[1]
            : html;

        const regex =
            /<img[^>]+(?:data-src|data-lazy-src|src)=["']([^"']+)["'][^>]*>/gi;

        let match;

        while ((match = regex.exec(content)) !== null) {
            const image = cleanUrl(match[1]);

            if (
                image &&
                !/logo|avatar|icon|ads|banner/i.test(image)
            ) {
                images.push(image);
            }
        }

        return images;
    }
};

KonmikExtension;
              
