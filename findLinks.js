function doNothing() {}

function findLinks(text, plain, link) {

    plain = plain || doNothing;
    link = link || doNothing;

    let inBackTicks = false;
    let inLink = false;
    let start = 0;
    let line = 0;
    let indented = 0;
    let tripleTicks = 0;
    let inCodeBlock = 0;

    for (let i = 0; i < text.length; i++) {
        const c = text[i];

        if (indented < 4 && c !== " ") {
            indented = -1;
        }

        if (tripleTicks < 3 && c != "`") {
            tripleTicks = -1;
        }

        if (c === "\n") {
            line++;
            indented = 0;
            tripleTicks = 0;
        } else if (!inLink) {           
            if (c === "`") {
                if (tripleTicks !== -1) {
                    tripleTicks++;
                    if (tripleTicks === 3) {
                        inCodeBlock = !inCodeBlock;
                    }
                }
                inBackTicks = !inBackTicks;
            } else if (!inCodeBlock && !inBackTicks && indented < 4) {
                if (c === " ") {
                    if (indented !== -1) {
                        indented++;             
                    }
                } else {
                    if (c === "{") {
                        if (i > start) {
                            plain(text.substr(start, i - start), line);
                        }
                        inLink = true;
                        start = i + 1;
                    }
                }
            }
        } else if (c === "}") {
            if (i > start) {
                link(text.substr(start, i - start), line);
            }
            inLink = false;
            start = i + 1;
        }
    }

    if (start < text.length) {
        if (inLink) {
            plain("{" + text.substr(start), line);
        } else {
            plain(text.substr(start), line);
        }
    }
}

exports.findLinks = findLinks;
