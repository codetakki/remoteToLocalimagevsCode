# Remote to Local images README
This project uses the base code from [ImageSaver by Ademiking](https://github.com/Ademking/imgsaver) <br>
This extension helps replaceing remote image urls with local uris by downloading the images and replacing the paths

## TODO

This project is in very early stages. I currently see the following upgrades:
- Ability to replace single images DONE
- Ability to replace for a entier file DONE
- Settings for default path and image file DONE
- Dialog for selecting wanted save path
- Settings for chaning dowloaded image name DONE
  - original file name with index? DONE
  - Formated timestamps DONE

## Features

Replace remote images in workspace with "Replace remote images " command<br>
Adds a Code Lens above image urls that lets you replace single images <br>
Change the path of downloaded images relative to the current workspace<br>
Change how image names are formatted 

![](images/remoteimagesevcode.webp)
> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.

## Requirements

Todo
## Extension Settings


- Image Name 
  - Allows you to set a filename for a given string 
  - If a file with the name already exists a number is added to the end of file
  - Support for formatting with the variable by using ${}
    - ${rawdate} the current time in unix
    - ${formatteddate} the current date in format yyyy-mm-dd
    - ${workspacename} the name of the files workspace
    - ${filename} the name of the file your in
- Image path
  - Allows you to change the default path based on the current workspace

## Known Issues

Todo

## Release Notes

Todo

### 1.0.0

Initial release includes "replace images in workspace"

