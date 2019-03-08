const levelup = require('levelup')
const leveldown = require('leveldown')
const encode = require('encoding-down')
const lexint = require('lexicographic-integer')
const memdown = require('memdown')

const byteStream = require('byte-stream')
const split = require('binary-split')
const fs = require('fs')
const chardet = require('chardet');
const Iconv  = require('iconv').Iconv;

const csvtojson=require("csvtojson");
const _ = require('lodash');

const MAX_COL = 16384;
//const DB_PATH = './db_nosql.db';
const DB_PATH = './db_nosql.db';
//const DB_PATH = 'C:/Temp/db_nosql.db';

var GridDB = new Object();
GridDB._db = undefined;
GridDB._colInfo = undefined;
GridDB._colCount = undefined;
GridDB._rowCount = undefined;
GridDB._batch = undefined;
GridDB._curRowIndex = 0;
GridDB._db_rs = undefined;
GridDB.wbs_size = 1024 * 1024 * 16

GridDB.getColCount = function(){
  return this._colCount;
}
GridDB.getRowCount = function(){
  return this._rowCount;
}

GridDB._save_mod = "h" // "m" : memory, "h" : hard

GridDB.initDB = function (){
  if(this._save_mod == "m"){
    this._db = levelup(encode(memdown(), {
      keyEncoding: {
        type: 'lexicographic-integer',
        encode: (n) => lexint.pack(n, 'hex'),
        decode: lexint.unpack,
        buffer: false
      },
      // valueEncoding: 'json'
   }), {clean: true, compression: true});
  }
  else if(this._save_mod == "h"){
    this._db = levelup(encode(leveldown(DB_PATH), {
      keyEncoding: {
        type: 'lexicographic-integer',
        encode: (n) => lexint.pack(n, 'hex'),
        decode: lexint.unpack,
        buffer: false
      },
      // valueEncoding: 'json'
    },), {compression: true, cacheSize: 32*1024*1024, writeBufferSize: this.wbs_size} );
  }
  
}

GridDB.createColInfo = function(colInfo, colCount) {
  this._colCount = colCount;
  this._colInfo = colInfo;
}

GridDB._batchRemainCounter = 0;
GridDB._doneCheck = function(){
  this._batchRemainCounter --;
}
GridDB._isDone = function(){
  return this._batchRemainCounter == 0;
}

// rowIndex, colIndex start 1
GridDB.grid2index = function(rowNum, colNum){
  return rowNum * MAX_COL + colNum;
}

GridDB.index2grid = function(index){
  var colIndex = index % MAX_COL;
  var rowIndex = parseInt(index / MAX_COL);
  return [rowIndex, colIndex];
}

GridDB.getByCellName = async function(cellName){
  var rowNum, colNum;
  [rowNum, colNum] = parseAddress(cellName);
  var dbNum = this.grid2index(rowNum, colNum);
  
  var value = await this._db.get(dbNum);
  console.log(value);
  return value;
}

GridDB.loadFile = function(filepath){
  var __loading_time= new Date();
  
  var curLine = 0;
  var totalLine = 0;

  // GridDB.initDB();
  loadingModal("start", "loading file ...", "count line");
  const stats = fs.statSync(filepath);
  // detInfo = chardet.detectFileSync(filepath,  { sampleSize: 1024 });
  var firstBuffer = new Buffer(16*1024);
  fd= fs.openSync(filepath,'r');
  fs.readSync(fd, firstBuffer, 0, 16*1024);
  detInfo = chardet.detect(firstBuffer);
  if(detInfo != "UTF-8"){
    var iconv = new Iconv(detInfo, "utf-8//IGNORE");
    firstBuffer = iconv.convert(firstBuffer);
  }
  firstBuffer = firstBuffer.utf8Slice()
  fs.close(fd, function(){

  });
  delimiter1 = firstBuffer.split(",").length - 1;
  delimiter2 = firstBuffer.split("|").length - 1;
  if(delimiter1 >= delimiter2)
    delimiter = ","
  else
    delimiter = "|"
  GridDB.readCvsFile(filepath, detInfo , stats.size, __loading_time,"\n", delimiter);
  // GridDB.readCvsFile2(filepath, detInfo , stats.size, __loading_time,"\n", delimiter);
}


// https://gist.github.com/maxogden/6551333
GridDB.readCvsFile = function(csvFile, charEncoding, totalSize, startTime, linedelimiter, cdelimiter){
  var rowIndex = 1;
  var curSize = 0;
  var batch_size = this.wbs_size;
  var batcher = byteStream(batch_size);
  var _this = this;
  var lastPercent = 0;
  var curPercent = 0;
  var colCount = 0;
  var items = [];

  // GridDB.initDB();
  var iconv = new Iconv(charEncoding, "utf-8//IGNORE");
  var fileStream = fs.createReadStream(csvFile, { highWaterMark:  4 * 1024 * 1024 });
  fileStream = fileStream
    .on('data', function(data) {
      curSize += data.length;
    });
  if(charEncoding != "UTF-8")
    fileStream = fileStream.pipe(iconv);
  fileStream
    //.pipe(csvtojson({noheader:true, output: "csv", delimiter:cdelimiter}))
    .pipe(split(linedelimiter))
    .pipe(batcher)
    .on('data', function(lines) {
      if(rowIndex == 1){
        //colCount = JSON.parse(lines[0]).length;
        colCount = lines[0].utf8Slice().split(cdelimiter).length;
        var colInfo = getColInfos(colCount);
        GridDB.createColInfo(colInfo, colCount);
      }

      var batch = _this._db.batch();
      for (var i = 0; i < lines.length; i++) {
        try{
          var items = [];
          var line = lines[i].utf8Slice();
          if(line[line.length-1].charCodeAt() == 13)
            line=line.slice(0, -1)
          var lineItems = line.split(cdelimiter);
          for(var j = 0; j < lineItems.length ; j++){
            var colvalue = lineItems[j];
            if(colvalue[0] == '"' & colvalue[colvalue.length-1] == '"'){
              items.push( colvalue.slice(1, colvalue.length -1) );
            }
            else{
              items.push(colvalue);
            }
          }
          items = '["'+ items.join('","') + '"]';
        }
        catch (e) {
          console.log(e);
          items = '["#Error"]';
        }
        // var items = utfstring.split(",")
        batch.put(rowIndex, items)
        // batch.put(rowIndex, lines[i])
        rowIndex++
      }
      curPercent = parseInt(curSize/totalSize * 100);
      if(curPercent!=lastPercent){
        lastPercent = curPercent;
        var data = {api: "_readFile", action: "percent", param: {percent:curPercent}}
        var spend_time = ((new Date)-startTime) / 1000;
        console.log("_readFile percent : " + curPercent + "%, Second : " + spend_time );
        // sendRenderAPI(data);
        loadingModal(curPercent, "loading file ...");
      }

      batch.write()
  }).
  on('end', function() {
    var spend_time = ((new Date)-startTime) / 1000;
    console.log("_readFile end: " + spend_time);
    var heaptotal = process.memoryUsage()["heapTotal"] / (1024 * 1024 * 1024)
    console.log("heaptotal: " + heaptotal);
    loadingModal("end");

    loadGrid(rowIndex, colCount);
    _this._rowCount = rowIndex;
  });
}

GridDB.insertRows = function(rowdatas){
  var row_index = 0;
  var colname = 0;
  var colIndex = 0;
  var batch = this._db.batch();
  // var rowBuffers = [];
  var batchBuffer = [];

  for(row_index in rowdatas){
    var rowdata = rowdatas[row_index];
    var rowNum = this._curRowIndex;
    this._curRowIndex++;
    batch = batch.put(this._curRowIndex, rowdata);      
  }
  
  this._batchRemainCounter ++;
  var _this = this;
  
  batch.write();//function () { _this._doneCheck(); })
}

GridDB.getRowsDict = function(rowStart, rowEnd, callback, logmode){
  if(logmode === undefined)
    logmode = false;
  var rowIndex = 0;
  var colIndex = 0;
  var lastPercent = 0;
  
  var dbIndexStart = rowStart;
  var dbIndexEnd = rowEnd;
  
  var rowDicts = {};
  var curRowIndex = -1;
  var _this = this;
  var colNames = getColNames().slice(0, this._colCount);
  colNames.unshift("id");

  this._db_rs = this._db.createReadStream({gte: dbIndexStart, lte: dbIndexEnd})
  .on('data', function (data) {
      curRowIndex++;
      // var values = JSON.parse(data.value);var values = JSON.parse(data.value);
      var values = data.value.slice(2,-2).split('","');
      values.unshift(data.key)
      rowDicts[curRowIndex] = _.zipObject(colNames, values);
      if(logmode){
        curPercent = parseInt(curRowIndex / ( rowEnd - rowStart) * 100);
        if(curPercent != lastPercent){
          console.log("getRowsDict percent : " + curPercent);
          lastPercent = curPercent;
        }
      }
  })
  .on('error', function (err) {
    console.log('Oh my!', err)
  })
  .on('close', function () {
    console.log('Stream closed');
    this._db_rs = undefined;
  })
  .on('end', function () {
    callback(rowDicts);
    this._db_rs = undefined;
  })
  
}


// GridDB.csvtojson = function(data, rowChar, colChar){
//   var lineCount 
// }

// https://geedew.com/remove-a-directory-that-is-not-empty-in-nodejs/
var deleteFolderRecursive = function(path) {
  if( fs.existsSync(path) ) {
    fs.readdirSync(path).forEach(function(file,index){
      var curPath = path + "/" + file;
      if(fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};

deleteFolderRecursive(DB_PATH);
GridDB.initDB();