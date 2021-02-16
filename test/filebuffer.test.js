const { expect, assert } = require("chai");
const util = require("../util");
const Zip = require("../adm-zip");

// create file buffer and check is file data avalable
// NOTE: this test does NOT use unicode
describe("Read file: simple zip buffer", () => {
    // random numbers [0..(len-1)]
    const _xRandom = (len) => Math.floor(Math.random() * len);
    // generate timestamp with DOS 2sec accuracy
    const timeStamp = ((ms) => new Date(ms - (ms % 2000)))(Date.now());
    // files content
    const filedata = {};
    const fileComment = "file comment";
    let fileBuffer;
    let xOS = 10;

    // create zip buffer
    function createSimpleFile() {
        if (fileBuffer) return;

        // runs once before the first test in this block
        content = "content\n";

        const zip = new Zip();

        for (let ix = 0; ix < 19; ix++) {
            // create file name
            let entryname = ix + "";
            while (entryname.length < 4) entryname = "0" + entryname;
            entryname += ".txt";

            const fileobj = { name: entryname, content: content, comment: "File: " + entryname };

            // create file content
            let conlen = _xRandom(10);
            for (; conlen; conlen--) fileobj.content += content;

            // create mode
            fileobj.mode = 1 << ix % 9;

            // add data
            filedata[entryname] = fileobj;
            zip.addFile(fileobj.name, fileobj.content, fileobj.comment, fileobj.mode);
        }

        // Set time stamp
        for (let entry of zip.getEntries()) {
            entry.header.time = timeStamp;
        }

        // file comment
        zip.addZipComment(fileComment);
        fileBuffer = zip.toBuffer();

        switch (process.platform) {
            case "win32":
                xOS = 0x0a;
            case "darwin":
                xOS = 0x13;
            default:
                xOS = 0x03;
        }
    }

    describe("Read from buffer data", () => {
        createSimpleFile();
        const files = Object.keys(filedata);
        const zip = new Zip(fileBuffer);

        it("entryheader values", () => {
            const mode = xOS !== 10;
            for (let file in filedata) {
                const fileobj = filedata[file];
                const header = zip.getEntry(file).header;

                // Data lengths are equal with string lengths since no unicode was used
                expect(header.size).to.equal(fileobj.content.length);
                expect(header.fileNameLength).to.equal(fileobj.name.length);
                expect(header.commentLength).to.equal(fileobj.comment.length);
                expect(header.extraLength).to.equal(0);
                expect(header.method).to.equal(util.Constants.DEFLATED);
                expect(header.time.valueOf()).to.equal(timeStamp.valueOf());

                // spanned data has to be 0
                expect(header.diskNumStart).to.equal(0);
                expect(header.inAttr).to.equal(0);

                // flags data
                expect(header.flags).to.equal(0);
                expect(header.encripted).to.be.false;

                // version data
                expect(header.made & 0xff).to.equal(20);
                expect(header.made >>> 8).to.equal(xOS);
                expect(header.version).to.equal(20);

                // crc data
                expect(header.crc).to.equal(util.crc32(fileobj.content));

                // MS-DOS attributes
                expect(header.attr & 0xffff).to.equal(0);

                if (xOS !== 10) {
                    // is unix mode data stored as should
                    expect((header.attr >>> 16) & 0o777).to.equal(fileobj.mode);
                    // is it regular file ?
                    expect((header.attr >>> 16) & 0xfe00).to.equal(0x8000);
                }
            }
        });

        it('extract - "test" function', () => {
            expect(zip.test()).to.be.true;
        });

        it('zip comment - "getZipComment"', () => {
            expect(zip.getZipComment()).to.equal(fileComment);
        });

        it('file comment - "getEntry" function', () => {
            for (let file of files) {
                const entry = zip.getEntry(file);
                expect(entry.comment).to.equal(filedata[file].comment);
            }
        });

        it('file comment - "getZipEntryComment" function', () => {
            for (let file in filedata) {
                const entry = zip.getZipEntryComment(file);
                expect(zip.getZipEntryComment(file)).to.equal(filedata[file].comment);
            }
        });

        it('file content - "getData" function', () => {
            for (let file in filedata) {
                const entry = zip.getEntry(file);
                expect(entry.getData().toString()).to.equal(filedata[file].content);
            }
        });

        it('file content - "readAsText" function', () => {
            for (let file in filedata) {
                expect(zip.readAsText(file)).to.equal(filedata[file].content);
            }
        });

        it('file content - "readAsTextAsync" function', (done) => {
            const file = files[_xRandom(files.length)];
            const content = filedata[file].content;

            zip.readAsTextAsync(file, function (data, err) {
                try {
                    if (err) done(err);
                    else {
                        assert(data === content, "file data didn't match");
                        done();
                    }
                } catch (e) {
                    done(e);
                }
            });
        });

        it('file content - "readFileAsync" function', (done) => {
            const file = files[_xRandom(files.length)];
            const content = filedata[file].content;

            zip.readFileAsync(file, function (data, err) {
                try {
                    if (err) done(err);
                    else {
                        assert(data.toString() === content, "file data didn't match");
                        done();
                    }
                } catch (e) {
                    done(e);
                }
            });
        });

        it('create content - "toAsyncBuffer" function', (done) => {
            const newzip = new Zip();
            const runs = { start: 0, stop: 0 };

            for (let file in filedata) {
                const fileobj = filedata[file];
                newzip.addFile(fileobj.name, fileobj.content, fileobj.comment, fileobj.mode);
            }

            // Set time stamp
            for (let entry of newzip.getEntries()) entry.header.time = timeStamp;

            // create buffer
            try {
                zip.toBuffer(
                    function onSuccess(data) {
                        const len = data.length;
                        assert(len === fileBuffer.length, "file has different length");
                        for (let i = 0; i < len; i++) assert(data[i] === fileBuffer[i], "file has different content");
                        assert(runs.start === runs.stop, "onItemStart and onItemEnd has different run times");

                        done();
                    },
                    function onFail(data, err) {
                        done(err);
                    },
                    function onItemStart(name) {
                        runs.start++;
                    },
                    function onItemEnd(name) {
                        runs.stop++;
                    }
                );
            } catch (e) {
                done(e);
            }
        });
    });
});
