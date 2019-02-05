const FsObject = require("./FsObject").FsObject;
const findLinks = require("./findLinks").findLinks;

/**
 * 
 * @param {Date} date 
 */
function formatDate(date) {
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

const sourceDir = new FsObject("../NXG.wiki/people/Daniel-Earwicker/_source");

const blogDates = [];

for (const year of sourceDir.contents.filter(x => x.isDirectory)) {
    for (const month of year.contents.filter(x => x.isDirectory)) {
        for (const day of month.contents.filter(x => !x.isDirectory && x.extension === ".md")) {
            blogDates.push(new Date(year.name, parseInt(month.name, 10) - 1, parseInt(day.title)));
        }
    }
}

blogDates.sort((a, b) => a - b);

/**
 * 
 * @param {FsObject} root 
 * @param {Date} date 
 */
function getDateFile(root, date) {
    const f = formatDate(date);
    return root.asDirectory.at(f.year)
               .asDirectory.at(f.month)
               .asDirectory.at(f.day + ".md");
}

const linkMap = {};

function getLink(text) {
    const id = text.toLowerCase().split(/[^a-z]+/i).join("-");
    const key = "_" + id;
    return linkMap[key] || (linkMap[key] = { text, id, mentions: { } });
}

for (const blogDate of blogDates) {
    const dateStr = formatDate(blogDate).iso;

    findLinks(getDateFile(sourceDir, blogDate).text, undefined, (linkText, lineNumber) => {
        const link = getLink(linkText);
        if (link.mentions[dateStr] === undefined) {
            link.mentions[dateStr] = lineNumber;
        }
    });
}

function formatPrettyDate(date) {
    const dayOfWeek = dayNames[date.getDay()],
          month = monthNames[date.getMonth()];

    return `${dayOfWeek}, ${date.getDate()} ${month} ${date.getFullYear()}`;
}

const prettyDir = new FsObject("../NXG.wiki/people/Daniel-Earwicker/Blog");

function convertLinks(text, rootPath) {
    const outputText = [];

    findLinks(
        text, 
        plainText => {
            outputText.push(plainText);
        }, 
        linkText => {
            const link = getLink(linkText);

            if (Object.keys(link.mentions).length > 1) {
                outputText.push(`[${linkText}](${rootPath}/links/${link.id})`);
            } else {
                outputText.push(linkText);
            }
        }
    );

    return outputText.join("");
}

function makeLink(caption, date) {
    if (!date) return "";
    return `[${caption}](../../${formatDate(date).path})`;
}

for (let i = 0; i < blogDates.length; i++) {
    const today = blogDates[i];
    
    const header = formatPrettyDate(today);

    const previous = makeLink("< Previous", blogDates[i - 1]);
    const next = makeLink("Next >", blogDates[i + 1]);
    const links = [previous, next].filter(x => x).join(" | ");

    const content = convertLinks(getDateFile(sourceDir, today).text, "../..");

    getDateFile(prettyDir, today).text = `# ${header}\n${links}\n\n${content}`;
}

function addSnippet(blogDate, lineNumber, parts, rootPath) {    
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

    parts.push(convertLinks(snippetLines.join("\n"), rootPath));
    parts.push(`[More...](${rootPath}/${formatDate(blogDate).path})`);
}

const linksDir = prettyDir.asDirectory.at("links").asDirectory;

const linkTopics = Object.values(linkMap);
linkTopics.sort((a, b) => a.text.localeCompare(b.text));

for (const link of linkTopics) {
    
    const parts = [`# ${link.text}`];

    var mentions = Object.keys(link.mentions);
    mentions.sort();

    for (const mention of mentions) {
        addSnippet(new Date(mention), link.mentions[mention], parts, "..");
    }

    linksDir.at(link.id + ".md").text = parts.join("\n\n");
}

const homePage = [
    sourceDir.at("README.md").text
];

const recentPages = blogDates.slice(blogDates.length - 10);
recentPages.reverse();

for (const recentPage of recentPages) {
    addSnippet(recentPage, 0, homePage, ".");
}

homePage.push(linkTopics.map(l => `[${l.text}](links/${l.id})`).join(" | "));

prettyDir.parent.at("Blog.md").text = homePage.join("\n\n");

const firstYear = blogDates[0].getFullYear();
const lastYear = blogDates[blogDates.length - 1].getFullYear();

const dayHeader = "|" + dayNames.map(n => n.substr(0, 2)).join("|") + "|\n" +
                  "|" + dayNames.map(() => "--").join("|") + "|";

const availableDates = {};
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

    prettyDir.at(`${year}.md`).text = parts.join("\n");
}
