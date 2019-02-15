var _grid;
var _loader;

var __loading_time;
function loadFile(filepath){
  __loading_time = new Date();
  
  var curLine = 0;
  var totalLine = 0;
  var rowdata = [];

  loadingModal("start", "loading file ...", "count line");

  // https://coderwall.com/p/ohjerg/read-large-text-files-in-nodejs
  var instream = fs.createReadStream(filepath);
  var outstream = new stream;
  readline.createInterface(instream, outstream)
    .on('line', function(line) {
      totalLine++;
    })
    .on('close', function() {
      var spend_time = ((new Date)-__loading_time) / 1000;
	    console.log("_readFile count line done : " + spend_time);
      _readFile(filepath, totalLine);
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

  console.log('_readFile start');

  GridDB.initDB();

  var instream = fs.createReadStream(filepath);
  var outstream = new stream;
  readline.createInterface(instream, outstream)
    .on('line', function(line) {
      curLine++;
      var curPercent = parseInt(curLine / totalLine * 100);
      if(lastPercent != curPercent){
        var data = {api: "_readFile", action: "percent", param: {percent:curPercent}}
        console.log("_readFile percent : " + curPercent + "%" );
        // sendRenderAPI(data);
        loadingModal(curPercent, "loading file ...");
      }
      
      lastPercent = curPercent

      var items = line.split(",");
      colCount = items.length;
      var index = 0;
      var rowItem = {id: curLine };
      for(index=0; index < colCount ; index++ ){
        var colname = getColName(index+1);
        rowItem[colname] = items[index];
      }
      
      if(curLine == 1){
        var colInfo = getColInfos(colCount);
        GridDB.createColInfo(colInfo, colCount);
      }
      // rowdata[curLine - 1] = rowItem;
      rowsBuffer.push(rowItem)
      if(curLine % 5000 ==0 ){
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


function loadGrid(rowCount, colCount){

  var columns = getColInfos(colCount);
  var options = {
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
  _grid.onViewportChanged.notify();

  
}

function initGrid(){
  var filepath = getUrlParam("filepath");
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