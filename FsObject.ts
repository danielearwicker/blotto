import * as fs from "fs";
import * as path from "path";

export class FsObject {

    private _stat: fs.Stats | undefined;

    constructor(public readonly relPath: string) { }

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

    get exists() {
        return fs.existsSync(this.relPath);
    }

    get isDirectory() {
        return this.exists && this.stat.isDirectory();
    }

    get asDirectory() {
        if (!this.exists) {
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

    set text(contents: string) {
        fs.writeFileSync(this.relPath, contents);
    }

    at(name: string) {
        return new FsObject(path.join(this.relPath, name));
    }

    moveTo(destination: FsObject) {
        fs.renameSync(this.relPath, destination.relPath);
    }

    deleteFile() {
        fs.unlinkSync(this.relPath);
    }

    deleteDirectory() {
        fs.rmdirSync(this.relPath);
    }

    deleteAll() {
        if (this.exists) {
            if (this.isDirectory && !this.stat.isSymbolicLink()) {
                for (const child of this.contents) {
                    child.deleteAll();
                }
                this.deleteDirectory();
            } else {
                this.deleteFile();
            }
        }
    }
}
