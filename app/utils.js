var fs = require('fs');


initWindow = function initWindow(mainWindow){
  global.mainWindow = mainWindow;
}
  
sendRenderAPI = function sendRenderAPI(data){
  global.mainWindow.webContents.send('api', data);
}

exports.initWindow = initWindow;
exports.sendRenderAPI = sendRenderAPI;
