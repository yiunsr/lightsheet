var levelup = require('levelup')
var leveldown = require('leveldown')

var _db;
var _colInfo;
var _colcount;

var GridDB = new Object();

GridDB.initDB = function (){
  _db = levelup(leveldown('./db_nosql.db'))
}

GridDB.createColInfo = function(colInfo, colcount) {
  _colcount = colcount;
  _colInfo = colInfo;
}

GridDB.insertRows = function(rowdatas){
  var row_index = 0;
  var col_index = 0;
  for(row_index in rowdatas){
    var rowdata = rowdatas[row_index];
    for(col_index in rowdata){

    }
  }
}
