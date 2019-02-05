const fs = require("fs");
const path = require("path");

class FsObject {

    /**
     * @param {string} relPath 
     */
    constructor(relPath) {
        this.relPath = relPath;
    }

    get contents() {
        return fs.readdirSync(this.relPath)
                 .map(name => new FsObject(path.join(this.relPath, name)));
    }

    get stat() {
        if (!this._stat) {
            this._stat = fs.statSync(this.relPath);
        }
        return this._stat;
    }

    get isDirectory() {
        return this.stat.isDirectory();
    }

    get asDirectory() {
        if (!fs.existsSync(this.relPath)) {
            fs.mkdirSync(this.relPath);
        }
        return this;
    }

    get parent() {
        return new FsObject(path.dirname(this.relPath));
    }

    /** Name including extension */
    get name() {
        return path.basename(this.relPath);
    }

    get extension() {
        return path.extname(this.relPath);
    }

    /** Name excluding extension */
    get title() {
        return path.basename(this.relPath, this.extension);
    }

    get text() {
        return fs.readFileSync(this.relPath, "utf8");
    }

    set text(contents) {
        fs.writeFileSync(this.relPath, contents);
    }

    /**
     * @param {string} name 
     */
    at(name) {
        return new FsObject(path.join(this.relPath, name));
    }

    /** 
     * @param {FsObject} destination 
     */
    moveTo(destination) {
        fs.renameSync(this.relPath, destination.relPath);
    }
}

exports.FsObject = FsObject;