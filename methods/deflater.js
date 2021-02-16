const zlib = require("zlib");

module.exports = class Deflater {
    constructor(/*Buffer*/ inbuf, /* object */ options) {
        this.databuf = inbuf;
        this.opts = Object.assign({ chunkSize: Math.ceil(this.databuf.length / 1024) * 1024 }, options, { info: false });
    }
    deflate() {
        return zlib.deflateRawSync(this.databuf, this.opts);
    }
    deflateAsync(/*Function*/ callback) {
        const stream = zlib.createDeflateRaw(this.opts),
            parts = [];
        let total = 0;
        stream.on("data", function (data) {
            parts.push(data);
            total += data.length;
        });
        stream.on("end", function () {
            const buf = Buffer.alloc(total, 0);
            let written = 0;
            for (const part of parts) {
                part.copy(buf, written);
                written += part.length;
            }
            callback && callback(buf);
        });
        stream.end(this.databuf);
    }
};
