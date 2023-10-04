const vscode = require('vscode');
const script = require('./lib/index');

function activate(context) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "remotetolocalimagevscode" is now active!');

	// Register the command for replacing in workspaces
	let disposable = vscode.commands.registerCommand('remotetolocalimagevscode.replaceinworkspaces', function () {
		try {
			script.runAllWorkspaces();
			vscode.window.showInformationMessage('Images have been replaced');
		} catch (err) {
			console.log(err.stack);
		}
	});

	// Register the command for replacing in the current file
	let disposable2 = vscode.commands.registerCommand('remotetolocalimagevscode.replaceinfile', function () {
		try {
			script.runCurrentFile();
			vscode.window.showInformationMessage('Images have been replaced');

		} catch (err) {
			console.log(err.stack);
		}
	});

	// Register the command for running with a single URL
	let disposable4 = vscode.commands.registerCommand('remotetolocalimagevscode.singleurl', function (match) {
		try {
			script.runSingleUrl(match);
			vscode.window.showInformationMessage('Image has been replaced');

		} catch (err) {
			console.log(err.stack);
		}
	});

	// Register the code lens provider
	let disposable3 = vscode.languages.registerCodeLensProvider({ scheme: 'file' }, {
		provideCodeLenses
	});

	context.subscriptions.push(disposable);
	context.subscriptions.push(disposable2);
	context.subscriptions.push(disposable3);
	context.subscriptions.push(disposable4);
}

function provideCodeLenses(document) {
		const codeLenses = [];
		const content = document.getText();
		const urlRegex = /\b(?:https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|]/gi;
		const imageExtensionRegex = /\.(jpg|jpeg|png|gif|bmp|svg|webp)/i;
		let match;
		let count = 0;

		function createCodeLens(match) {
				const startPosition = document.positionAt(match.index);
				const endPosition = document.positionAt(match.index + match[0].length);
				const range = new vscode.Range(startPosition, endPosition);
				const codeLens = new vscode.CodeLens(range);
				codeLens.command = {
						title: "Download & replace img",
						command: "remotetolocalimagevscode.singleurl",
						arguments: [match[0]]
				};
				return codeLens;
		}

		while ((match = urlRegex.exec(content))) {
				count++;
				if (imageExtensionRegex.test(match[0])) {
						const codeLens = createCodeLens(match);
						codeLenses.push(codeLens);
				}
		}

		return codeLenses;
}

// this method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate
}
