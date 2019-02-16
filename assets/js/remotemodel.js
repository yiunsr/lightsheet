(function ($) {
    /***
     * A sample AJAX data store implementation.
     * Right now, it's hooked up to load search results from Octopart, but can
     * easily be extended to support any JSONP-compatible backend that accepts paging parameters.
     */
    function RemoteModel(rowCount, colCount) {
      // private
      var PAGESIZE = 50;
      var data = {length: rowCount, rowCount:rowCount, colCount:colCount};
      var searchstr = "";
      var sortcol = null;
      var sortdir = 1;
  
      // events
      var onDataLoading = new Slick.Event();
      var onDataLoaded = new Slick.Event();
  
  
      function init() {
      }
  
  
      function isDataLoaded(from, to) {
        for (var i = from; i <= to; i++) {
          if (data[i] == undefined || data[i] == null) {
            return false;
          }
        }
  
        return true;
      }
  
  
      function clear() {
        for (var key in data) {
          delete data[key];
        }
        data.length = 0;
      }
  
  
      function ensureData(from, to) {
        GridDB.getRowsDict(from, to, function(rowDicts){
          for (var i = 0; i < Object.keys(rowDicts).length; i++) {
            var item = rowDicts[i];
    
            data[from + i] = item;
            data[from + i].index = from + i;
          }
          // data.length = Object.keys(rowDicts).length;
          var end = from + Object.keys(rowDicts).length;
          onDataLoaded.notify({from: from, to: end});
        });
      }
  
      function reloadData(from, to) {
        for (var i = from; i <= to; i++)
          delete data[i];
  
        ensureData(from, to);
      }
  
  
      function setSort(column, dir) {
        sortcol = column;
        sortdir = dir;
        clear();
      }
  
      function setSearch(str) {
        searchstr = str;
        clear();
      }
  
  
      init();
  
      return {
        // properties
        "data": data,
  
        // methods
        "clear": clear,
        "isDataLoaded": isDataLoaded,
        "ensureData": ensureData,
        "reloadData": reloadData,
        "setSort": setSort,
        "setSearch": setSearch,
  
        // events
        "onDataLoading": onDataLoading,
        "onDataLoaded": onDataLoaded
      };
    }
  
    // Slick.Data.RemoteModel
    $.extend(true, window, { Slick: { Data: { RemoteModel: RemoteModel }}});
  })(jQuery);