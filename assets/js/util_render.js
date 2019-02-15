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
