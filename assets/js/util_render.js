var fs = require('fs');
var stream = require('stream');
var readline = require('readline')

// http://cwestblog.com/2013/09/05/javascript-snippet-convert-number-to-column-name/
var __colNameList = [];
var __maxColCount = 1024;
function _prepareColName(){
  var index = 1;
  for(index = 1; index <= __maxColCount; index++){
    num = index;
    for (var ret = '', a = 1, b = 26; (num -= a) >= 0; a = b, b *= 26) {
      ret = String.fromCharCode(parseInt((num % b) / a) + 65) + ret;
    }
     __colNameList.push(ret);
  }
}
_prepareColName();

function getColName(num) {
  return __colNameList[num-1];
}

function getColInfos(col_count){
  var columns = [
		{id: "id", name: "id", field: "id", cssClass: "grid-row-hader", selectable: false}
	];
  for(index = 0; index < col_count; index++){
    var colname = getColName(index+1)
    var item = {id: colname, name: colname, field: colname, editor: Slick.Editors.LongText};
    columns.push(item);
  }
  return columns;
}

// https://davidwalsh.name/query-string-javascript
function getUrlParam(name) {
  name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
  var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
  var results = regex.exec(location.search);
  return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
};

function apiReceiver(data){
  var api = data["api"];
  var action = data["action"];
  var param = data["param"]

  switch(api){
    case "loadFile": loadFile(action, param);break;
    default:break;
  }

}

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
  // var rowdata = [];
  var rowdata = new Array(totalLine);
  var lastPercent = 0;

  console.log('_readFile start');

  var instream = fs.createReadStream(filepath);
  var outstream = new stream;
  readline.createInterface(instream, outstream)
    .on('line', function(line) {
      if(curLine == 0){
        
      }
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
      var colcount = items.length;
      var index = 0;
      var rowItem = {id: curLine };
      for(index=0; index < colcount ; index++ ){
        var colname = getColName(index+1);
        rowItem[colname] = items[index];
      }
      
      // rowdata.push(rowItem);
      rowdata[curLine - 1] = rowItem;
    })
    .on('error', function(err) {
      console.log('Error while reading file.', err);
    })
    .on('close', function() {
      console.log('_readFile end');

      var spend_time = ((new Date)-__loading_time) / 1000;
      console.log("_readFile prepare data done: " + spend_time);

      // sendRenderAPI(data);
      loadGrid(rowdata);
      loadingModal("end");
      console.log("_readFile end: " + spend_time);
    });


}


function loadGrid(gridData){
  var col_count = Object.keys(gridData[0]).length;

  var columns = getColInfos(col_count);
  var options = {
    editable: true,
    enableAddRow: true,
    enableCellNavigation: true,
    enableColumnReorder: true,
    asyncEditorLoading: false,
    autoEdit: false,
    editCommandHandler: queueAndExecuteCommand
  };

  grid = new Slick.Grid("#myGrid", gridData, columns, options);
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