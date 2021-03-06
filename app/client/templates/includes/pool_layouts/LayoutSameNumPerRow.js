
/**
 * layout to render the same numer of bubbles per row
 *
 * Use the constructor to init the cursor position and
 * remember a reference to the (dynamically changing)
 * array of IDs to be rendered.
 *
 * Use scroll() to specify any scrolling by the users,
 * and specify the deltaY in pixels.
 *
 * For drawing a single ID bubble, query its current
 * position and scale factor (for scaling bubble and text)
 * using getPositionAndSize().
 *
 */

/**
  *  module returns constructor for LayoutSameNumPerRow
  *  NOTE that the definition below is GLOBAL
  *  because only globally declared functions will be readable in other JS files!
  *  see: http://stackoverflow.com/questions/16166509/in-which-order-meteor-include-my-js-files
  **/
LayoutSameNumPerRow = function() {

  /**
    *  constructor initializes cursor and returns a new layout object
    *  queryNumberOfIDs: function that can be used to query current number of IDs in the pool
    */
  var Layout = function(queryNumberOfIDs, options) {

    // read options and provide default values
    if(!options)
      options = {};
    this.opt = {};
    this.opt.baseBubbleRadius = options.baseBubbleRadius || 60;
    this.opt.drawAreaWidth = options.drawAreaWidth || 600;
    this.opt.drawAreaHeight = options.drawAreaHeight || 400;
    this.opt.maxRows = options.maxRows || 8;
    this.opt.bubblesPerRow = options.bubblesPerRow || 5;
    this.opt.rowSpacing = 1.0;
    this.opt.colSpacing = 1.2;

    // remember the ids array to query its length lateron (HACK???)
    this.queryNumberOfIDs = queryNumberOfIDs;

    var numIDs = this.queryNumberOfIDs();

    // console.log("creating layout based on " + numIDs + " IDs.");

    // which bubble column is in the center?
    this.centerColumn = Math.floor(this.opt.bubblesPerRow / 2);

    // in which column shall the first bubble be displayed?
    // this.firstOffset = numIDs % this.opt.bubblesPerRow;
    this.firstOffset = 0;

    // which bubble is in the center
    // this.cursorRow = Math.floor(numIDs / this.opt.bubblesPerRow / 2);
    this.cursorRow = 2;

    // cursorPixelPos describes how many pixels the central
    // bubble is off-center, vertically
    this.cursorPixelPos = 0;

  };

  /**
    *  set width and height of drawing area for subsequent calculations
    */
  Layout.prototype.setDimensions = function(width,height) {
    this.opt.drawAreaWidth = width || 600;
    this.opt.drawAreaHeight = height || 400;
  };

  /**
    * scroll down by a number of pixels. This only recalculates
    * the positions in the layout; you need to redraw afterwards
    */
  Layout.prototype.scroll = function(numPixels) {

    // min / max allowed central index
    var maxRow = Math.floor((this.queryNumberOfIDs()+this.firstOffset)/this.opt.bubblesPerRow)-1;

    // how many pixels for advancing from one bubble row to the next?
    var pixelsPerRow = Math.floor(this.opt.baseBubbleRadius * 2 * this.opt.rowSpacing);

    // current pixel pos + pixels to be scrolled by
    var pixelPos = this.cursorPixelPos + numPixels;

    // scroll by how many rows?
    var rows = Math.trunc(pixelPos/pixelsPerRow);

    // new row of central bubble, new pixel pos
    var row = this.cursorRow - rows;
    pixelPos = pixelPos - rows*pixelsPerRow;

    // clamp
    if(row <= 0) {
      row = 0;
      if(pixelPos>0)
        pixelPos = 0;
    } else if(row >= maxRow) {
      row = maxRow;
      if(pixelPos<0)
        pixelPos = 0;
    }

    // set cursor to resulting values
    this.cursorRow = row;
    this.cursorPixelPos = pixelPos;

    //console.log("idx="+idx + " pixPos = "+pixelPos);
  };

  /**
    *  given the index of an ID within the ids array,
    *  return position and size of bubble, or undefined
    *  if bubble shall not be rendered at all
    */
  Layout.prototype.getPositionAndSize = function(bubbleIndex) {

    // return this.getPosForFullRow(bubbleIndex);

    // how many pixels for advancing from one bubble row to the next?
    var pixelsPerRow = this.opt.baseBubbleRadius * 2 * this.opt.rowSpacing;

    // calculate the two positions to interpolate in-between, and the interpol weight
    var res1,res2,w;
    if(this.cursorPixelPos < 0) {
      res1 = this.getPosForFullRow(bubbleIndex);
      res2 = this.getPosForFullRow(bubbleIndex-this.opt.bubblesPerRow);
      w = -this.cursorPixelPos/pixelsPerRow;
    } else {
      res1 = this.getPosForFullRow(bubbleIndex);
      res2 = this.getPosForFullRow(bubbleIndex+this.opt.bubblesPerRow);
      w = this.cursorPixelPos/pixelsPerRow;
    }

    // check for non-renderable bubbles
    if(res1 === undefined || res2 === undefined) {
      return undefined;
    }

    // interpolate between the two positions
    var res = {};
    res.x = Math.round(res1.x*(1-w) + res2.x*w);
    res.y = Math.round(res1.y*(1-w) + res2.y*w);
    res.scale = res1.scale*(1-w) + res2.scale*w;

    return res;
  };

  /**
    *  internal calculation of bubble position and size for full rows only
    *  (without in-between cursor positions several pixels off a full row)
    */
  Layout.prototype.getPosForFullRow = function(bubbleIndex) {

    // how many IDs currently in pool?
    var numIds = this.queryNumberOfIDs();

    // which "line" is the bubble to be rendered in?
    var bubbleRow = Math.floor((bubbleIndex + this.firstOffset) / this.opt.bubblesPerRow);

    // which column?
    var bubbleCol = bubbleIndex + this.firstOffset - bubbleRow*this.opt.bubblesPerRow;
    var cursorCol = this.centerColumn;

    // how far is this bubble from the current cursor position?
    var diff = bubbleIndex - this.cursorIndex;

    // how many rows / columns away?
    var colDiff = bubbleCol - cursorCol;
    var rowDiff = bubbleRow - this.cursorRow;

    // start in center of drawing area
    var x = Math.floor(this.opt.drawAreaWidth / 2);
    var y = Math.floor(this.opt.drawAreaHeight / 2);

    // initial row size is that of the basic bubble size
    var scale = 1.0;
    var sign = rowDiff<0? -1 : 1;
    var currentRowSpacing = this.opt.rowSpacing;
    var currentColSpacing = this.opt.colSpacing;

    // for each row away,change x and y
    for(var i=0; i<Math.abs(rowDiff); i++) {

      // out of renderable area?
      if(i>this.opt.maxRows)
        return undefined;

      // go away up/down from center, change spacing each time
      y += Math.floor(sign * currentRowSpacing * this.opt.baseBubbleRadius*2);

      // make rows and columns denser using some heuristic ratios :-)
      currentRowSpacing = 0.70*currentRowSpacing;
      currentColSpacing = 0.80*currentColSpacing;

      // make bubbles smaller, row by row. Allow 20% overlap max.
      scale = Math.min(currentRowSpacing*1.0, currentColSpacing*1.0);

    }

    // go left/right from center, using spacing dependent
    // on which row we are in
    x += colDiff  * currentColSpacing * this.opt.baseBubbleRadius*2;

    // return x, y, and bubble size
    return { "x": x, "y": y, "scale": scale};

  }; // getPosForFullRow()

  // module returns constructor function
  return Layout;

} (); //  module
