var fs = require('fs');
var es = require('event-stream');


initWindow = function initWindow(mainWindow){
  global.mainWindow = mainWindow;
}
  
sendRenderAPI = function sendRenderAPI(data){
  global.mainWindow.webContents.send('api', data);
}

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


// https://github.com/paigen11/file-read-challenge/blob/master/readFileEventStream.js
readFileData = function readFileData(filepath){
  var curLine = 0;
  var totalLine = 0;
  var rowdata = [];

  var s = fs
    .createReadStream(filepath)
    .pipe(es.split())
    .pipe(
      es.mapSync(function(line) {
        totalLine++;
      })
    .on('end', function() {
        _readFileData(filepath, totalLine);
      }),
    );
}

function _readFileData(filepath, totalLine){
  var curLine = 0;
  var rowdata = [];
  var lastPercent = 0;

  console.log('loadFileData start');
  var s = fs
    .createReadStream(filepath)
    .pipe(es.split())
    .pipe(
      es
        .mapSync(function(line) {
          if(curLine == 0){
            var data = {api: "loadFileData", action: "start", param: {}}
            sendRenderAPI(data);
          }
          curLine++;
          var curPercent = parseInt(curLine / totalLine * 100);
          if(lastPercent != curPercent){
            var data = {api: "loadFileData", action: "percent", param: {percent:curPercent}}
            console.log("loadFileData percent : " + curPercent + "%" );
            sendRenderAPI(data);
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
          
          rowdata.push(rowItem);
        })
        .on('error', function(err) {
          console.log('Error while reading file.', err);
        })
        .on('end', function() {
          console.log('loadFileData end');

          var data = {api: "loadFileData", action: "end", param: {rowdata:rowdata}}
          sendRenderAPI(data);

        }),
    );

}

exports.initWindow = initWindow;
exports.sendRenderAPI = sendRenderAPI;
exports.readFileData = readFileData;
