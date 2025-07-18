const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { spawn } = require('child_process');

let mainWindow;
let backendProcess = null;

// Backend server management
function startBackendServer() {
	const backendPath = path.join(__dirname, '..', 'backend', 'dist', 'main.js');
	const backendCwd = path.join(__dirname, '..', 'backend');

	console.log('Starting backend server...');
	console.log('Backend path:', backendPath);
	console.log('Backend CWD:', backendCwd);
	console.log('Backend exists:', require('fs').existsSync(backendPath));

	backendProcess = spawn('node', [backendPath], {
		cwd: backendCwd,
		env: {
			...process.env,
			NODE_ENV: 'production',
			PORT: '3002'
		},
		stdio: ['ignore', 'pipe', 'pipe']
	});

	backendProcess.stdout.on('data', (data) => {
		console.log(`Backend: ${data}`);
	});

	backendProcess.stderr.on('data', (data) => {
		console.error(`Backend Error: ${data}`);
	});

	backendProcess.on('close', (code) => {
		console.log(`Backend process exited with code ${code}`);
	});

	backendProcess.on('error', (error) => {
		console.error(`Failed to start backend process: ${error}`);
	});

	// Wait for backend to start
	return new Promise((resolve) => {
		setTimeout(resolve, 5000);
	});
}

function createWindow() {
	// Create the browser window
	mainWindow = new BrowserWindow({
		width: 1400,
		height: 900,
		minWidth: 1200,
		minHeight: 800,
		webPreferences: {
			nodeIntegration: false,
			contextIsolation: true,
			enableRemoteModule: false,
			webSecurity: true
		},
		icon: path.join(__dirname, '..', 'assets', 'icon.png'),
		titleBarStyle: 'default',
		show: false
	});

	// Load the frontend
	const startUrl = isDev
		? 'http://localhost:3000'
		: `file://${path.join(__dirname, '..', 'frontend', 'build', 'index.html')}`;

	console.log('Loading URL:', startUrl);
	mainWindow.loadURL(startUrl).catch(error => {
		console.error('Failed to load URL:', error);
	});

	// Show window when ready
	mainWindow.once('ready-to-show', () => {
		mainWindow.show();

		if (isDev) {
			mainWindow.webContents.openDevTools();
		}
	});

	// Handle window closed
	mainWindow.on('closed', () => {
		mainWindow = null;
	});

	// Handle external links
	mainWindow.webContents.setWindowOpenHandler(({ url }) => {
		shell.openExternal(url);
		return { action: 'deny' };
	});
}

// App event handlers
app.whenReady().then(async () => {
	// Always start backend server in production app
	try {
		console.log('Starting backend server...');
		await startBackendServer();
	} catch (error) {
		console.error('Failed to start backend:', error);
	}

	// Create main window
	createWindow();

	// macOS specific: recreate window when dock icon is clicked
	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

// Function to cleanup backend process
function cleanupBackend() {
	if (backendProcess) {
		console.log('Killing backend process...');
		backendProcess.kill('SIGTERM');
		// Force kill if not terminated after 3 seconds
		setTimeout(() => {
			if (backendProcess) {
				console.log('Force killing backend process...');
				backendProcess.kill('SIGKILL');
				backendProcess = null;
			}
		}, 3000);
	}
}

// Quit when all windows are closed
app.on('window-all-closed', () => {
	cleanupBackend();
	app.quit(); // Always quit the app when all windows are closed
});

// Ensure backend is killed when app quits
app.on('before-quit', () => {
	cleanupBackend();
});

// Security: prevent new window creation
app.on('web-contents-created', (event, contents) => {
	contents.on('new-window', (event, navigationUrl) => {
		event.preventDefault();
		shell.openExternal(navigationUrl);
	});
});

// Create application menu
function createMenu() {
	const template = [
		{
			label: 'OrionAutomato',
			submenu: [
				{
					label: 'About OrionAutomato',
					role: 'about'
				},
				{ type: 'separator' },
				{
					label: 'Hide OrionAutomato',
					accelerator: 'Command+H',
					role: 'hide'
				},
				{
					label: 'Hide Others',
					accelerator: 'Command+Shift+H',
					role: 'hideothers'
				},
				{
					label: 'Show All',
					role: 'unhide'
				},
				{ type: 'separator' },
				{
					label: 'Quit',
					accelerator: 'Command+Q',
					click: () => {
						app.quit();
					}
				}
			]
		},
		{
			label: 'Edit',
			submenu: [
				{ label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
				{ label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
				{ type: 'separator' },
				{ label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
				{ label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
				{ label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' }
			]
		},
		{
			label: 'View',
			submenu: [
				{ label: 'Reload', accelerator: 'CmdOrCtrl+R', role: 'reload' },
				{ label: 'Force Reload', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
				{ label: 'Toggle Developer Tools', accelerator: 'F12', role: 'toggleDevTools' },
				{ type: 'separator' },
				{ label: 'Actual Size', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
				{ label: 'Zoom In', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
				{ label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
				{ type: 'separator' },
				{ label: 'Toggle Fullscreen', accelerator: 'Ctrl+Command+F', role: 'togglefullscreen' }
			]
		},
		{
			label: 'Window',
			submenu: [
				{ label: 'Minimize', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
				{ label: 'Close', accelerator: 'CmdOrCtrl+W', role: 'close' }
			]
		}
	];

	const menu = Menu.buildFromTemplate(template);
	Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
	createMenu();
});