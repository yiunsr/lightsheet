var fs = require('fs');

const levelup = require('levelup')
const leveldown = require('leveldown')
const encode = require('encoding-down')
const lexint = require('lexicographic-integer')
const memdown = require('memdown')

const MAX_COL = 16384;
const DB_PATH = './db_nosql.db';

var GridDB = new Object();
GridDB._db = undefined;
GridDB._colInfo = undefined;
GridDB._colCount = undefined;
GridDB._batch = undefined;
GridDB._curRowIndex = 0;
GridDB._db_rs = undefined;

GridDB.getColCount = function(){
  return this._colCount;
}

GridDB._save_mod = "m"

GridDB.initDB = function (){
  if(this._save_mod == "m"){
    this._db = levelup(memdown(), {
    keyEncoding: {
      type: 'lexicographic-integer',
      encode: (n) => lexint.pack(n, 'hex'),
      decode: lexint.unpack,
      buffer: false
    }, clean: true, compression: true
   });
  }
  else{
    this._db = levelup(encode(leveldown(DB_PATH), {
      keyEncoding: {
        type: 'lexicographic-integer',
        encode: (n) => lexint.pack(n, 'hex'),
        decode: lexint.unpack,
        buffer: false
      }
    },), {compression: true, cacheSize: 32*1024*1024} );
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


GridDB.insertRows = function(rowdatas){
  var row_index = 0;
  var colname = 0;
  var colIndex = 0;
  var batch = this._db.batch();

  for(row_index in rowdatas){
    var rowdata = rowdatas[row_index];
    var rowNum = this._curRowIndex;
    this._curRowIndex++;
    var colNum = 0;
    for(colIndex in rowdata){
      var value = rowdata[colIndex];
      var dbNum = this.grid2index(rowNum, colNum);
      batch = batch.put(dbNum, value);
      colNum++;
    }
  }
  
  this._batchRemainCounter ++;
  var _this = this;
  batch.write();//function () { _this._doneCheck(); })
}

GridDB.getRowsDict = function(rowStart, rowEnd, callback){
  var rowIndex = 0;
  var colIndex = 0;
  var dbIndexStart = this.grid2index(rowStart, 0);
  var dbIndexEnd = this.grid2index(rowEnd, MAX_COL);
  
  var rowDicts = {};
  var curRowIndex = -1;
  var _this = this;
  //if(this._db_rs)
  //  this._db_rs.destroy();
  this._db_rs = this._db.createReadStream({gte: dbIndexStart, lte: dbIndexEnd})
  .on('data', function (data) {
    [rowIndex, colIndex] = _this.index2grid(data.key);
    if(colIndex ==0){
      curRowIndex ++;
      rowDicts[curRowIndex] = {"id": parseInt(rowIndex) + 1};
    }
    else{
      var colName = getColName(colIndex);
      rowDicts[curRowIndex][colName] = data.value;
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