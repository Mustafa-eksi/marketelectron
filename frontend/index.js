const electron = require('electron');
const url = require("url");
const path = require("path");
const http = require("http");
const {app, BrowserWindow, ipcMain} = electron;
const fetch = require("electron-fetch");

let mainWindow;
app.on('ready', () => {
    mainWindow = new BrowserWindow({
        webPreferences: {
            nodeIntegration:true,
            contextIsolation:false,
            enableRemoteModule:true
        }
    });
    mainWindow.loadURL(
        url.format({
            pathname:path.join(__dirname, "index.html"),
            protocol:"file:",
            slashes:true
    }));
    ipcMain.handle('get-products', (e)=>{
        return new Promise((res,rej)=>{
            fetch.default('http://localhost:8080/products')
                .then(res => res.json())
                .then(json => {
                    res(json.data);
                }).catch((err)=>{
                    if(err) {
                        rej(err)
                    }
                })
        })
    });
});