const { expect } = require('chai');
const {
  parsePriceBreakpoints,
  snapMinToBreakpoint,
  snapMaxToBreakpoint,
} = require('../../utils/priceBreakpoints');

const BPS = parsePriceBreakpoints(
  '0,50,100,500,1000,5000,10000,20000,50000,100000'
);

describe('priceBreakpoints — containment snap', function () {
  it('parses configured breakpoints', function () {
    expect(BPS).to.deep.equal([
      0, 50, 100, 500, 1000, 5000, 10000, 20000, 50000, 100000,
    ]);
  });

  it('contains $223–$1,013 as $100–$5,000', function () {
    expect(snapMinToBreakpoint(BPS, 223)).to.equal(100);
    expect(snapMaxToBreakpoint(BPS, 1013)).to.equal(5000);
  });

  it('handles single-price results (same actual min/max)', function () {
    expect(snapMinToBreakpoint(BPS, 223)).to.equal(100);
    expect(snapMaxToBreakpoint(BPS, 223)).to.equal(500);
  });

  it('handles exact breakpoint prices', function () {
    expect(snapMinToBreakpoint(BPS, 500)).to.equal(500);
    expect(snapMaxToBreakpoint(BPS, 500)).to.equal(500);
  });

  it('clamps prices below the first breakpoint to the first', function () {
    expect(snapMinToBreakpoint(BPS, -10)).to.equal(0);
    expect(snapMaxToBreakpoint(BPS, -10)).to.equal(0);
  });

  it('clamps prices above the last breakpoint to the last', function () {
    expect(snapMinToBreakpoint(BPS, 250000)).to.equal(100000);
    expect(snapMaxToBreakpoint(BPS, 250000)).to.equal(100000);
  });

  it('empty results (0) snap to 0 when 0 is configured', function () {
    expect(snapMinToBreakpoint(BPS, 0)).to.equal(0);
    expect(snapMaxToBreakpoint(BPS, 0)).to.equal(0);
  });

  it('returns actual values when breakpoints are empty', function () {
    expect(snapMinToBreakpoint([], 223)).to.equal(223);
    expect(snapMaxToBreakpoint([], 1013)).to.equal(1013);
  });
});
