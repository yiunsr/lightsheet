var levelup = require('levelup')
var leveldown = require('leveldown')

var _db;
var 
function initDB(){
  _db = levelup(leveldown('./db_nosql.db'))
}

function createColInfo(){

}