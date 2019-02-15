var levelup = require('levelup')
var leveldown = require('leveldown')
const memdown = require('memdown')

var _db;
var _colInfo;
var _colCount;
var _batch;

var GridDB = new Object();

GridDB.getColCount = function(){
  return _colCount;
}

GridDB.initDB = function (){
  _db = levelup(leveldown('./db_nosql.db'))
  // _db = levelup(memdown())
}

GridDB.createColInfo = function(colInfo, colCount) {
  _colCount = colCount;
  _colInfo = colInfo;
}


GridDB._batchRemainCounter = 0;
GridDB._doneCheck = function(){
  this._batchRemainCounter --;
}

GridDB.insertRows = function(rowdatas){
  var row_index = 0;
  var colname = 0;
  if(!_batch)
  var batch = _db.batch();
  for(row_index in rowdatas){
    var rowdata = rowdatas[row_index];
    for(colname in rowdata){
      if(colname == "ID") continue;
      var value = rowdata[colname];
      batch = batch.put(colname, value);
    }
  }
  this._batchRemainCounter ++;
  var _this = this;
  batch.write(function () { _this._doneCheck(); })
}

GridDB.getRowsDict = function(rowStart, rowEnd){
  var rowIndex = 0;
  var colIndex = 0;
  this._colCount

}