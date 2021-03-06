import * as assert from "assert";
import { findLinks } from "../findLinks";

interface LinkResult { link: string };

type LinkResults = (string | LinkResult)[];

function assertLinks(text: string, expected: LinkResults) {
    const actual: LinkResults = [];
    findLinks(text, plain => actual.push(plain), link => actual.push({ link }));
    assert.deepStrictEqual(actual, expected);
}

assertLinks("", []);
assertLinks("all plain text", ["all plain text"]);
assertLinks("{first part} is a link", [{ link: "first part" }, " is a link"]);
assertLinks("{APF7} is a link", [{ link: "APF7" }, " is a link"]);
assertLinks("{APF7}: \"Add\"", [{ link: "APF7" }, ": \"Add\""]);

assertLinks("link at {the end}", ["link at ", { link: "the end" }]);
assertLinks("links {more} than {once}", ["links ", { link: "more" }, " than ", { link: "once" }]);
assertLinks("links {right}{next} to each other", ["links ", { link: "right" }, { link: "next" }, " to each other"]);
assertLinks("broken link at {the end", ["broken link at ", "{the end"]);
assertLinks("broken link at }the end", ["broken link at }the end"]);
assertLinks("`links {inside} {ticks} do nothing`", ["`links {inside} {ticks} do nothing`"]);
assertLinks("links `{inside}` {ticks} do nothing", ["links `{inside}` ", { link: "ticks" }, " do nothing"]);
assertLinks("links {al`so} can contain {ticks}", ["links ", { link: "al`so" }, " can contain ", { link: "ticks" }]);
assertLinks("{lines} with\n    four {spaces}\nalso {ignore}", [{ link: "lines" }, " with\n    four {spaces}\nalso ", { link: "ignore" }]);
assertLinks("links and ticks\n```ts\nare `{ignored}` in code\n``` {blocks}", ["links and ticks\n```ts\nare `{ignored}` in code\n``` ", { link: "blocks" }]);

console.log("All good");