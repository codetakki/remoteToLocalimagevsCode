#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const vscode = require('vscode')
const axios = require('axios')

function test() {
  vscode.window.showInformationMessage('Hello World from remoteToLocalimagevsCode!');
}


function runCurrentHighlight() {
  const editor = vscode.window.activeTextEditor;
  let cursorPosition = editor.selection.start;
  let wordRange = editor.document.getWordRangeAtPosition(cursorPosition);
  let highlight = editor.document.getText(wordRange);
  console.log(highlight);
}

function runAllWorkspaces() {
  vscode.workspace.workspaceFolders.forEach((item) => {
    console.log(item.uri);
    var options = {
      directory: item.uri.path,
      output: item.uri.path + "/images",
      prefix: "",
      ignore: [],
      silent: false
    }
    startSearch(options, ()=>searchForRemoteImages(item.uri.path, options))
  })
}

function runCurrentFile() {
  let filePath = vscode.window.activeTextEditor.document.uri.path
  vscode.workspace.workspaceFolders.forEach((item) => {
    console.log(item.uri);
    var options = {
      directory: item.uri.path,
      output: item.uri.path + "/images",
      prefix: "",
      ignore: [],
      silent: false
    }
    if (!filePath.startsWith(item.uri.path)) {
      console.log("File not in workspace: " + item.uri.path);
      return
    }
    startSearch(options, ()=>searchSingleFile(filePath, options))
  })
}

function runSingleUrl(url) {
  let filePath = vscode.window.activeTextEditor.document.uri.path
  vscode.workspace.workspaceFolders.forEach((item) => {
    console.log(item.uri);
    var options = {
      directory: item.uri.path,
      output: item.uri.path + "/images",
      prefix: "",
      ignore: [],
      silent: false
    }
    if (!filePath.startsWith(item.uri.path)) {
      console.log("File not in workspace: " + item.uri.path);
      return
    }
    startSearch(options, ()=>startSingleUrl(url, options, filePath))
  })
}

function startSearch(options, callback) {

  if (!options.directory) {
    console.error('Error: Please specify a directory to search for files in')
    process.exit(1)
  }

  if (!options.output) {
    console.error('Please specify an output directory for downloaded images')
    process.exit(1)
  }
  if (!fs.existsSync(options.output)) {
    options.silent && console.log(`${('[+]')} Creating output directory ${options.output}`)
    fs.mkdirSync(options.output)
  }
  
  callback()
}

function searchSingleFile(filePath, options) {
  let fileData = fs.readFileSync(filePath, 'utf-8')
  let urls = fileData.match(/\b(?:https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|]/gi)
  convertUrlsInFile(urls, options, fileData, filePath)
}

function startSingleUrl(url, options, filePath) {
  let fileData = fs.readFileSync(filePath, 'utf-8')
  var urls = [url]
  convertUrlsInFile(urls, options, fileData, filePath)
}
// Function to search for remote images in files
function searchForRemoteImages(dir, options) {
  console.log(`${('[*]')} Searching for remote images in ${options.directory}`)

  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file)
    if (fs.lstatSync(filePath).isDirectory()) {
      // Recursively search for files in subdirectories
      searchForRemoteImages(filePath, options)
    } else if (options.ignore.includes(path.extname(filePath))) {
      // ignore files with the specified extension
      return
    } else {
      // Read the contents of the file
      let fileData = fs.readFileSync(filePath, 'utf-8')
      // find all the urls
      // Regex from here: https://regexr.com/39nr7
      let urls = fileData.match(/\b(?:https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|]/gi)
      convertUrlsInFile(urls, options, fileData, filePath)
    }
  })
}

function convertUrlsInFile(urls, options, fileData, filePath) {
  console.log(urls);
  if (urls) {
    urls.forEach(url => {
      // clean the url
      // sometimes, the url will have a '(' at the start
      url = url.replace('(', '')
      axios.get(url).then(async res => {
        {
          // Check if the Content-Type header indicates that the URL is an image
          if (res && res.headers && res.headers['content-type'] && res.headers['content-type'].startsWith('image')) {
            // download the remote image

            let extension = '.' + res.headers['content-type'].split('/')[1]
            let fileName = Date.now().toString() + extension
            await downloadFile(url, options, fileName)
            console.log("Filepath:" + filePath);
            var imagePath = path.relative(path.dirname(filePath), `${options.output}/${fileName}`)

            console.log("Output; " + imagePath);


            fileData = fileData.replace(url, imagePath)
            // replace the remote image url with local
            // use prefix if exists
            /*
            if (options.prefix) {
              fileData = fileData.replace(url, `${options.prefix}${fileName}`)
            } else {
              fileData = fileData.replace(url, `${options.output}/${fileName}`)
            }*/

            const msg = (`[+] ${filePath}`) + ` Replaced ${(url)} with ${(`${options.output}/${fileName}`)}`
            //console.log(msg)
            // write the contents of the file back to the file
            fs.writeFileSync(filePath, fileData)
          }
        }
      }).catch((err) => {
        console.log(err);
      })
    })
  }
}

async function downloadFile(fileUrl, options, fileName) {

  const writer = fs.createWriteStream(path.join(options.output, fileName));

  return axios({
    method: 'get',
    url: fileUrl,
    responseType: 'stream',
  }).then(response => {

    //ensure that the user can call `then()` only when the file has
    //been downloaded entirely.
    // Generate a random file name
    // let fileName = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    // use timestamp for name
    return new Promise((resolve, reject) => {
      response.data.pipe(writer);
      let error = null;
      writer.on('error', err => {
        error = err;
        writer.close();
        reject(err);
      });
      writer.on('close', () => {
        if (!error) {
          resolve(true);
        }
        //no need to call the reject here, as it will have been called in the
        //'error' stream;
      });
    });
  });
}

module.exports = {
  test, searchForRemoteImages, runAllWorkspaces, runCurrentFile, runCurrentHighlight, runSingleUrl
}
