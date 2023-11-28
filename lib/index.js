#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const vscode = require('vscode')
const axios = require('axios')

function test() {
  vscode.window.showInformationMessage('Hello World from remoteToLocalimagevsCode!');
}


function runAllWorkspaces() {
  const imagePathOption = vscode.workspace.getConfiguration('remotetolocalimagevscode').get("imagespath") || '/images'

  vscode.workspace.workspaceFolders.forEach((item) => {
    var options = {
      directory: item.uri.path,
      output: item.uri.path + imagePathOption,
      prefix: "",
      ignore: [],
      silent: false
    }
    startSearch(options, () => searchForRemoteImages(item.uri.path, options))
  })
}

function runCurrentFile() {
  const imagePathOption = vscode.workspace.getConfiguration('remotetolocalimagevscode').get("imagespath") || '/images'

  let filePath = vscode.window.activeTextEditor.document.uri.path
  vscode.workspace.workspaceFolders.forEach((item) => {
    console.log(item.uri);
    var options = {
      directory: item.uri.path,
      output: item.uri.path + imagePathOption,
      prefix: "",
      ignore: [],
      silent: false
    }
    if (!filePath.startsWith(item.uri.path)) {
      console.log("File not in workspace: " + item.uri.path);
      return
    }
    startSearch(options, () => searchSingleFile(filePath, options))
  })
}

function runSingleUrl(url) {
  const imagePathOption = vscode.workspace.getConfiguration('remotetolocalimagevscode').get("imagespath") || '/images'

  let filePath = vscode.window.activeTextEditor.document.uri.path
  vscode.workspace.workspaceFolders.forEach((item) => {
    var options = {
      directory: item.uri.path,
      output: item.uri.path + imagePathOption,
      prefix: "",
      ignore: [],
      silent: false
    }
    if (!filePath.startsWith(item.uri.path)) {
      console.log("File not in workspace: " + item.uri.path);
      return
    }
    startSearch(options, () => startSingleUrl(url, options, filePath))
  })
}

function startSearch(options, callback) {

  if (!options.directory) {
    console.error('Error: Please specify a directory to search for files in')
    return
  }

  if (!options.output) {
    console.error('Please specify an output directory for downloaded images')
    return
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
            let fileName = generateFilename(options, filePath, extension, url)

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

function generateFilename(options, filePath, extension, url) {
  var nameFormat = vscode.workspace.getConfiguration('remotetolocalimagevscode').get("imagename") || '${rawdate}'

  const workspacename = options.directory.split("/").pop(); // Get the last folder name from the directory path
  const formatteddate = getCurrentDate();

  // Check if the URL has an image extension and use it as the filename if it does
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.tiff'];
  const urlFilename = path.basename(url);
  const urlExtension = path.extname(urlFilename);
  if (imageExtensions.includes(urlExtension)) {
    nameFormat = urlFilename.replace(urlExtension, '');
  } else {
    nameFormat = nameFormat.replace("${rawdate}", Date.now().toString());
    nameFormat = nameFormat.replace("${workspacename}", workspacename);
    nameFormat = nameFormat.replace("${formatteddate}", formatteddate);
    nameFormat = nameFormat.replace("${filename}", path.basename(filePath).replace(/\.[^/.]+$/, ""));
  }

  let filesWithName;
  try {
    filesWithName = fs.readdirSync(options.output).filter(fn => fn.startsWith(nameFormat)).length;
  } catch (err) {
    console.error("Error reading the output directory:", err);
    return null;
  }

  if (filesWithName > 0) {
    nameFormat = `${nameFormat}-${filesWithName}`;
  }

  nameFormat = nameFormat.replace(/\s+/g, '-');

  return nameFormat + extension;
}

function getCurrentDate() {
  const currentDate = new Date();
  return currentDate.getFullYear() + '-' + (currentDate.getMonth() + 1).toString().padStart(2, '0') + '-' + currentDate.getDate().toString().padStart(2, '0');
}

module.exports = {
  test, searchForRemoteImages, runAllWorkspaces, runCurrentFile, runSingleUrl
}
