import { FsObject } from "./FsObject";
import { findLinks } from "./findLinks";
import * as chokidar from "chokidar";
import { execSync } from "child_process";
import { EOL } from "os";

function formatDate(date: Date) {
    const year = date.getFullYear() + "";
    const month = ((date.getMonth() + 1) + "").padStart(2, "0");
    const day = (date.getDate() + "").padStart(2, "0");
    return {
        year, month, day,
        iso: `${year}-${month}-${day}`,
        path: `${year}/${month}/${day}`
    };
}

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const blottoDir = new FsObject(".");
const sourceDir = blottoDir.at("_source");
const prettyDir = blottoDir.at("Blog");

function getDateFile(root: FsObject, date: Date) {
    const f = formatDate(date);
    return root.asDirectory.at(f.year)
               .asDirectory.at(f.month)
               .asDirectory.at(f.day + ".md");
}

interface MappedLink {
    text: string,
    id: string,
    mentions: {
        [dateStr: string]: number;
    }
};

interface LinkMap {
    getLink(text: string): MappedLink;
    allLinks: MappedLink[];
}

function createLinkMap(): LinkMap {

    const linkMap: { [key: string]: MappedLink; } = {};

    return {
        getLink(text: string) {
            const id = text.toLowerCase().split(/[^\w\d]+/i).join("-");
            const key = "_" + id;
            return linkMap[key] || (linkMap[key] = { text, id, mentions: { } });
        },
        get allLinks() {
            return Object.values(linkMap);
        }
    }
}

function formatPrettyDate(date: Date) {
    const dayOfWeek = dayNames[date.getDay()],
          month = monthNames[date.getMonth()];

    return `${dayOfWeek}, ${date.getDate()} ${month} ${date.getFullYear()}`;
}

function convertLinks(links: LinkMap, text: string, rootPath: string) {
    const outputText: string[] = [];

    findLinks(
        text, 
        plainText => {
            outputText.push(plainText);
        }, 
        linkText => {
            const link = links.getLink(linkText);

            if (Object.keys(link.mentions).length > 1) {
                outputText.push(`[${linkText}](${rootPath}/links/${link.id})`);
            } else {
                outputText.push(linkText);
            }
        }
    );

    return outputText.join("");
}

function makeLink(caption: string, date: Date) {
    if (!date) return "";
    return `[${caption}](../../${formatDate(date).path})`;
}

function addSnippet(getLink: LinkMap, blogDate: Date, lineNumber: number, parts: string[], rootPath: string) {    
    parts.push(`## ${formatPrettyDate(blogDate)}`);

    let snippetLines = getDateFile(sourceDir, blogDate).text
                            .split("\n")
                            .map(l => l.trim());

    while (snippetLines[lineNumber] === "") {
        lineNumber++;
    }

    snippetLines = snippetLines.slice(lineNumber, lineNumber + 3);

    const blankLine = snippetLines.findIndex(l => l.length === 0);
    if (blankLine !== -1) {
        snippetLines.length = blankLine;
    }

    parts.push(convertLinks(getLink, snippetLines.join(EOL), rootPath));
    parts.push(`[More...](${rootPath}/${formatDate(blogDate).path})`);
}

function generate() {

    const blogDates: Date[] = [];

    for (const year of sourceDir.contents.filter(x => x.isDirectory)) {
        for (const month of year.contents.filter(x => x.isDirectory)) {
            for (const day of month.contents.filter(x => !x.isDirectory && x.extension === ".md")) {
                blogDates.push(new Date(parseInt(year.name, 10), parseInt(month.name, 10) - 1, parseInt(day.title)));
            }
        }
    }

    blogDates.sort((a, b) => a.getTime() - b.getTime());

    const linkMap = createLinkMap();

    for (const blogDate of blogDates) {
        const dateStr = formatDate(blogDate).iso;
    
        findLinks(getDateFile(sourceDir, blogDate).text, undefined, (linkText, lineNumber) => {
            const link = linkMap.getLink(linkText);
            if (link.mentions[dateStr] === undefined) {
                link.mentions[dateStr] = lineNumber;
            }
        });
    }
    
    for (let i = 0; i < blogDates.length; i++) {
        const today = blogDates[i];
        
        const header = formatPrettyDate(today);

        const previous = makeLink("< Previous", blogDates[i - 1]);
        const next = makeLink("Next >", blogDates[i + 1]);
        const links = [previous, next].filter(x => x).join(" | ");

        const content = convertLinks(linkMap, getDateFile(sourceDir, today).text, "../..");

        getDateFile(prettyDir, today).text = `# ${header}${EOL}${links}${EOL}${EOL}${content}`;
    }

    const linksDir = prettyDir.asDirectory.at("links").asDirectory;

    const linkTopics = linkMap.allLinks;
    linkTopics.sort((a, b) => a.text.localeCompare(b.text));

    for (const link of linkTopics) {
        const parts = [`# ${link.text}`];

        var mentions = Object.keys(link.mentions);
        mentions.sort();

        for (const mention of mentions) {
            addSnippet(linkMap, new Date(mention), link.mentions[mention], parts, "..");
        }

        linksDir.at(link.id + ".md").text = parts.join(EOL + EOL);
    }

    const homePage = [
        sourceDir.at("README.md").text
    ];

    const recentPages = blogDates.slice(blogDates.length - 10);
    recentPages.reverse();

    for (const recentPage of recentPages) {
        addSnippet(linkMap, recentPage, 0, homePage, "Blog");
    }

    homePage.push(linkTopics.map(l => `[${l.text}](Blog/links/${l.id})`).join(" | "));

    blottoDir.at("Blog.md").text = homePage.join(EOL + EOL);

    const firstYear = blogDates[0].getFullYear();
    const lastYear = blogDates[blogDates.length - 1].getFullYear();

    const dayHeader = "|" + dayNames.map(n => n.substr(0, 2)).join("|") + "|" + EOL +
                      "|" + dayNames.map(() => "--").join("|") + "|";

    const availableDates: { [dateStr: string]: boolean } = {};
    for (const blogDate of blogDates) {
        availableDates[formatDate(blogDate).iso] = true;
    }

    for (let year = firstYear; year <= lastYear; year++) {

        const parts = [`# ${year}`];

        for (let month = 0; month < monthNames.length; month++) {

            const date = new Date(year, month, 1);

            if (date < blogDates[0] ||
                date > blogDates[blogDates.length - 1]) {
                continue;
            }

            parts.push(`## ${monthNames[month]}`);
            parts.push(dayHeader);

            while (date.getDay() !== 0) {
                date.setDate(date.getDate() - 1);
            }

            do {
                const days = [];
                for (let d = 0; d < 7; d++) {

                    if (date.getMonth() !== month ||
                        !availableDates[formatDate(date).iso]) {
                        days.push(".");
                    } else {
                        days.push(`[${date.getDate()}](${formatDate(date).path})`);
                    }

                    date.setDate(date.getDate() + 1);
                }

                parts.push("|" + days.join("|") + "|");
            }
            while (date.getMonth() === month);
        }

        prettyDir.at(`${year}.md`).text = parts.join(EOL);
    }
}

function publish() {
    generate();

    const commands = [
        "git pull",
        "git add .",
        "git commit -m Published",
        "git push"
    ];

    for (const command of commands) {
        try {
            execSync(command, {
                cwd: blottoDir.relPath, 
                stdio: ["ignore", "inherit", "inherit"] 
            });
        } catch (x) {
            break;
        }
    }
}

export function watch() {
    var watcher = chokidar.watch(sourceDir.relPath, { 
        persistent: true,
        ignoreInitial: true,
        atomic: 1000
    });

    watcher.on("all", () => publish());
}
