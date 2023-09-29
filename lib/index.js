#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const request = require('request')
const vscode = require('vscode')





function test(){
  vscode.window.showInformationMessage('Hello World from remoteToLocalimagevsCode!');
}


function runAllWorkspaces(){

  vscode.workspace.workspaceFolders.forEach((item) =>{
    console.log(item.uri);
    var options = {
      directory: item.uri.path || "./",
      output: item.uri.path+"/images" || "./",
      prefix: "",
      ignore: [],
      silent: false
    }
    startSearch(options)
  })
}


function startSearch(options){

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
  console.log(`${('[*]')} Searching for remote images in ${options.directory}`)
  searchForRemoteImages(options.directory, options)
}

function projectPath () {
  let pPaths = vscode.workspace.workspaceFolders;
  if (pPaths == undefined) {
    console.log('Project path is not defined');
    return null;
  }
  return pPaths.map(folder => folder.uri.path)[0];
}


// Function to search for remote images in files
function searchForRemoteImages (dir, options){

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

      if (urls) {
        urls.forEach(url => {
          // clean the url
          // sometimes, the url will have a '(' at the start
          url = url.replace('(', '')
          request.head(url, async (err, res) => {
            if (err) {
              //return console.error(err)
            }
            // Check if the Content-Type header indicates that the URL is an image
            if (
              res && res.headers && res.headers['content-type'] &&
              res.headers['content-type'].startsWith('image')) {
              // download the remote image
              let fileName = await downloadRemoteImage(url, options)
              console.log("Filepath:"+filePath);
              var imagePath = path.relative(path.dirname(filePath), `${options.output}/${fileName}` )

              console.log("Output; " +imagePath);


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
          })
        })
      }
    }
  })
}

const downloadRemoteImage = (url, options) => {
  return new Promise((resolve, reject) => {
    request.head(url, (err, res) => {
      if (err) {
        return reject(err)
      }
      // Determine the file extension from the Content-Type header
      let extension = '.' + res.headers['content-type'].split('/')[1]
      // Generate a random file name
      // let fileName = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      // use timestamp for name
      let fileName = Date.now()

      request(url)
        .pipe(fs.createWriteStream(path.join(options.output, fileName + extension)))
        .on('close', () => {
          resolve(fileName + extension)
        })
    })
  })
}

module.exports = {
  test, searchForRemoteImages, runAllWorkspaces
}
