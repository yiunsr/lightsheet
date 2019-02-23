var fs = require('fs');
var stream = require('stream');
var readline = require('readline')
const split = require('binary-split')


var _grid;
var _loader;
var _headerMenuPlugin;
const BUFFER_SIZE = 10000;

var __loading_time;
function loadFile(filepath){
  __loading_time = new Date();
  
  var curLine = 0;
  var totalLine = 0;

  // GridDB.initDB();
  loadingModal("start", "loading file ...", "count line");

  // https://coderwall.com/p/ohjerg/read-large-text-files-in-nodejs
  // var instream = fs.createReadStream(filepath);
  // var outstream = new stream;
  var instream = fs.createReadStream(filepath);
  instream.pipe(split("\n"))
  .on('data', function(line) {
    totalLine++;
  })
  .on('end', function() {
    var spend_time = ((new Date)-__loading_time) / 1000;
    console.log("_readFile count line done : " + spend_time);
    // _readFile(filepath, totalLine);
    GridDB.readCvsFile(filepath, totalLine, __loading_time)
  });

}

function _readFile(filepath, totalLine){
  var curLine = 0;
  var rowCount = totalLine;
  var colCount = 0;
  // var rowdata = [];
  var rowsBuffer = [];
  // var rowdata = new Array(totalLine);
  var lastPercent = 0;
  var rowIndex = 0;
  var splitChar = ",";

  console.log('_readFile start');

  var instream = fs.createReadStream(filepath);
  var outstream = new stream;
  readline.createInterface(instream, outstream)
    .on('line', function(line) {
      curLine++;
      rowIndex++;

      if(curLine == 1){
        colCount = line.split(",").length;
        var colInfo = getColInfos(colCount);
        GridDB.createColInfo(colInfo, colCount);
      }

      var curPercent = parseInt(curLine / totalLine * 100);
      if(lastPercent != curPercent){
        var data = {api: "_readFile", action: "percent", param: {percent:curPercent}}
        var spend_time = ((new Date)-__loading_time) / 1000;
        console.log("_readFile percent : " + curPercent + "%, Second : " + spend_time );
        // sendRenderAPI(data);
        loadingModal(curPercent, "loading file ...");
      }
      
      lastPercent = curPercent
      var items = line.split(splitChar);

      var index = 0;
      // var rowItem = {id: curLine};
      var rowItem = Array(colCount+1)
      rowItem[0] = curLine;
      for(index=0; index < colCount; index++ ){
        var colname = getColName(index+1);
        // rowItem[index] = items[index];
        // rowItem.push(items[index])
        rowItem[index+1] = items[index];
      }
      
      // rowdata[curLine - 1] = rowItem;
      rowsBuffer.push(rowItem)
      if(curLine % BUFFER_SIZE ==0 ){
        GridDB.insertRows(rowsBuffer);
        rowsBuffer = [];
      }
      
    })
    .on('error', function(err) {
      console.log('Error while reading file.', err);
    })
    .on('close', function() {
      console.log('_readFile end');

      var spend_time = ((new Date)-__loading_time) / 1000;
      console.log("_readFile prepare data done: " + spend_time);

      // sendRenderAPI(data);
      if(rowsBuffer.length > 0){
        GridDB.insertRows(rowsBuffer);
      }
      loadGrid(rowCount, colCount);
      loadingModal("end");
      console.log("_readFile end: " + spend_time);
    });


}


function _initColHeader(columns){
  for (var i = 0; i < columns.length; i++) {
    columns[i].header = {
      menu: {
        items: [
          {
            iconImage: "../images/sort-asc.gif",
            title: "Sort Ascending",
            disabled: !columns[i].sortable,
            command: "sort-asc"
          },
          {
            iconImage: "../images/sort-desc.gif",
            title: "Sort Descending",
            disabled: !columns[i].sortable,
            command: "sort-desc"
          },
          {
            title: "Hide Column",
            command: "hide",
            tooltip: "Can't hide this column"
          },
          {
            divider: true,
            command: ""
          },
          {
            iconCssClass: "icon-help",
            title: "Help",
            command: "help"
          }
        ]
      }
    };
  }

  return columns;
}


function _initColMenu(grid){
  _headerMenuPlugin = new Slick.Plugins.HeaderMenu({})
  _headerMenuPlugin.onCommand.subscribe(function(e, args) {
    if(args.command === "hide") {
      // hide column
      visibleColumns = removeColumnById(visibleColumns, args.column.id);
      grid.setColumns(visibleColumns);
      executeSort(grid.getSortColumns());
    }else if(args.command === "sort-asc" || args.command === "sort-desc") {
      // sort column asc or desc
      var isSortedAsc = (args.command === "sort-asc");
      var sortCols = removeSortColumnById(grid.getSortColumns(), args.column.id);
      sortCols.push({ sortAsc: isSortedAsc, columnId: args.column.id });
      grid.setSortColumns(sortCols);
      executeSort(sortCols);
    }else {
      // command not recognised
      alert("Command: " + args.command);
    }
  });
  grid.registerPlugin(_headerMenuPlugin);
}

function loadGrid(rowCount, colCount){

  var columns = getColInfos(colCount);
  columns = _initColHeader(columns);

  var options = {
    columnPicker: {
      columnTitle: "Columns"
    },
    editable: true,
    enableAddRow: true,
    enableCellNavigation: true,
    enableColumnReorder: true,
    asyncEditorLoading: false,
    autoEdit: false,
    editCommandHandler: queueAndExecuteCommand
  };

  // https://github.com/6pac/SlickGrid/blob/master/examples/example6-ajax-loading.html
  _loader = new Slick.Data.RemoteModel(rowCount, colCount);


  // _grid = new Slick.Grid("#myGrid", gridData, columns, options);
  _grid = new Slick.Grid("#myGrid", _loader.data, columns, options);
  _grid.onViewportChanged.subscribe(function (e, args) {
    var vp = _grid.getViewport();
    _loader.ensureData(vp.top, vp.bottom);
  });
  _grid.onSort.subscribe(function (e, args) {
    loader.setSort(args.sortCol.field, args.sortAsc ? 1 : -1);
    var vp = _grid.getViewport();
    _loader.ensureData(vp.top, vp.bottom);
  });

  _loader.onDataLoading.subscribe(function () {
    // 로딩 show
  });
  _loader.onDataLoaded.subscribe(function (e, args) {
    
    for (var i = args.from; i <= args.to; i++) {
      _grid.invalidateRow(i);
    }
    _grid.updateRowCount();
    _grid.render();
    // 로딩 hide
  });
  // _grid.onViewportChanged.notify();

  setTimeout(function(){
    _grid.onViewportChanged.notify();
   }, 500);
   _grid.render();


   var columnpicker = new Slick.Controls.ColumnPicker(columns, _grid, options);
   _initColMenu(_grid);

  attachAutoResizeDataGrid(_grid, "myGrid", "gridContainer");

}

function initGrid(){
  var filepath = getUrlParam("filepath");
  titleChange(filepath);
  loadFile(filepath);
}
  

var commandQueue = [];
function queueAndExecuteCommand(item, column, editCommand) {
  commandQueue.push(editCommand);
  editCommand.execute();
}

function undo() {
  var command = commandQueue.pop();
  if (command && Slick.GlobalEditorLock.cancelCurrentEdit()) {
    command.undo();
    grid.gotoCell(command.row, command.cell, false);
  }
}


// define some minimum height/width/padding before resizing
var DATAGRID_MIN_HEIGHT = 180;
var DATAGRID_MIN_WIDTH = 300;
var DATAGRID_BOTTOM_PADDING = 20;
/** Attach an auto resize trigger on the datagrid, if that is enable then it will resize itself to the available space
 * Options: we could also provide a % factor to resize on each height/width independently
 */
function attachAutoResizeDataGrid(grid, gridId, gridContainerId) {
  return;

  var gridDomElm = $('#' + gridId);
  if (!gridDomElm || typeof gridDomElm.offset() === "undefined") {
    // if we can't find the grid to resize, return without attaching anything
    return null;
  }
  //-- 1st resize the datagrid size on first load (because the onResize is not triggered on first page load)
  resizeToFitBrowserWindow(grid, gridId, gridContainerId);
  //-- 2nd attach a trigger on the Window DOM element, so that it happens also when resizing after first load
  $(window).on("resize", function () {
    // for some yet unknown reason, calling the resize twice removes any stuttering/flickering when changing the height and makes it much smoother
    resizeToFitBrowserWindow(grid, gridId, gridContainerId);
    resizeToFitBrowserWindow(grid, gridId, gridContainerId);
  });
  // in a SPA (Single Page App) environment you SHOULD also call the destroyAutoResize()
}
/* destroy the resizer when user leaves the page */
function destroyAutoResize() {
  $(window).trigger('resize').off('resize');
}
/**
* Private function, calculate the datagrid new height/width from the available space, also consider that a % factor might be applied to calculation
* object gridOptions
*/
function calculateGridNewDimensions(gridId, gridContainerId) {
  var availableHeight = $(window).height() - $('#' + gridId).offset().top - DATAGRID_BOTTOM_PADDING;
  var availableWidth = $('#' + gridContainerId).width();
  var newHeight = availableHeight;
  var newWidth = availableWidth;
  // we want to keep a minimum datagrid size, apply these minimum if required
  if (newHeight < DATAGRID_MIN_HEIGHT) {
    newHeight = DATAGRID_MIN_HEIGHT;
  }
  if (newWidth < DATAGRID_MIN_WIDTH) {
    newWidth = DATAGRID_MIN_WIDTH;
  }
  return {
    height: newHeight,
    width: newWidth
  };
}
/** resize the datagrid to fit the browser height & width */
function resizeToFitBrowserWindow(grid, gridId, gridContainerId) {
  // calculate new available sizes but with minimum height of 220px
  var newSizes = calculateGridNewDimensions(gridId, gridContainerId);
  if (newSizes) {
    // apply these new height/width to the datagrid
    $('#' + gridId).height(newSizes.height);
    $('#' + gridId).width(newSizes.width);
    // resize the slickgrid canvas on all browser except some IE versions
    // exclude all IE below IE11
    if (new RegExp('MSIE [6-8]').exec(navigator.userAgent) === null && grid) {
      grid.resizeCanvas();
    }
  }
}

// https://github.com/joshbtn/excelFormulaUtilitiesJS/blob/fac55f0acc11845b4eca9cef8f738460502196c7/src/ExcelFormulaUtilities.js#L653
function breakOutRanges(rangeStr, delimStr){

  //Quick Check to see if if rangeStr is a valid range
  if ( !RegExp("[a-z]+[0-9]+:[a-z]+[0-9]+","gi").test(rangeStr) ){
      throw "This is not a valid range: " + rangeStr;
  }

  //Make the rangeStr lowercase to deal with looping.
  var range = rangeStr.split(":"),

      startRow = parseInt(range[0].match(/[0-9]+/gi)[0]),
      startCol = range[0].match(/[A-Z]+/gi)[0],
      startColDec = fromBase26(startCol)

      endRow =  parseInt(range[1].match(/[0-9]+/gi)[0]),
      endCol = range[1].match(/[A-Z]+/gi)[0],
      endColDec = fromBase26(endCol),

      // Total rows and cols
      totalRows = endRow - startRow + 1,
      totalCols = fromBase26(endCol) - fromBase26(startCol) + 1,

      // Loop vars
      curCol = 0,
      curRow = 1 ,
      curCell = "",

      //Return String
      retStr = "";

  for(; curRow <= totalRows; curRow+=1){
      for(; curCol < totalCols; curCol+=1){
          // Get the current cell id
          curCell = toBase26(startColDec + curCol) + "" + (startRow+curRow-1) ;
          retStr += curCell + (curRow===totalRows && curCol===totalCols-1 ? "" : delimStr);
      }
      curCol=0;
  }

  return retStr;
}

function toBase26(value){

  value = Math.abs(value);

  var converted = ""
       ,iteration = false
       ,remainder;

  // Repeatedly divide the numerb by 26 and convert the
  // remainder into the appropriate letter.
  do {
      remainder = value % 26;

      // Compensate for the last letter of the series being corrected on 2 or more iterations.
      if (iteration && value < 25) {
          remainder--;
      }

      converted = String.fromCharCode((remainder + 'A'.charCodeAt(0))) + converted;
      value = Math.floor((value - remainder) / 26);

      iteration = true;
  } while (value > 0);

  return converted;
}

function fromBase26(number) {
  number = number.toUpperCase();

  var s = 0
      ,i = 0
      ,dec = 0;

  if (
      number !== null
      && typeof number !== "undefined"
      && number.length > 0
  ) {
      for (; i < number.length; i++) {
          s = number.charCodeAt(number.length - i - 1) - "A".charCodeAt(0);
          dec += (Math.pow(26, i)) * (s+1);
      }
  }

  return dec - 1;
}