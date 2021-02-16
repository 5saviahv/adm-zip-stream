"use strict";
const { expect, assert } = require("chai");
const { Deflater, Inflater } = require("../../methods");
// const { crc32 } = require('../util/utils');

//This test focus is correct data handling by Deflate and Inflate in ADM-ZIP wrappers.
describe("method - deflate ", () => {
    const source = {};

    // create buffer
    function createBufferA() {
        const xlen = 256;
        const result = Buffer.alloc(xlen, 0);
        let a = 1,
            b = 1,
            x = 1;
        while (x < xlen) {
            const b2 = Buffer.alloc(a, b % 256);
            b2.copy(result, x, 0, a < xlen - x ? a : xlen - x);
            x += a;
            let c = a + b;
            b = a;
            a = c;
        }
        source.source = result;
    }

    function createBufferB() {
        if (!source.source) createBufferA();
        source.deflate1 = new Deflater(source.source).deflate();
    }

    before(createBufferB);

    // does extraction give same data
    it("inflate - sync", () => {
        if (!source.deflate1) createBufferB();
        const inflater = new Inflater(source.deflate1);
        const data = inflater.inflate();
        expect(data.compare(source.source)).to.equal(0);
    });

    it("deflate - async data", () => {
        if (!source.deflate1) createBufferB();
        const deflater = new Deflater(source.source, { windowBits: 9, level: 1 });
        deflater.deflateAsync(function (data) {
            expect(data.compare(source.deflate1)).to.equal(0);
        });
    });

    it("inflate - async data", () => {
        if (!source.deflate1) createBufferB();
        const inflater = new Inflater(source.deflate1);
        inflater.inflateAsync(function (data) {
            expect(data.compare(source.source)).to.equal(0);
        });
    });
});
