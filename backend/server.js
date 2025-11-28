require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { PythonShell } = require('python-shell');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 5000;
const USERS_FILE = path.join(__dirname, 'users.json');

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Directory Setup ---
const outputDir = path.join(__dirname, 'outputs');
const uploadDir = path.join(__dirname, 'uploads');
[outputDir, uploadDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// --- Multer Storage ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// --- Helper: User DB ---
const readUsers = () => {
  if (!fs.existsSync(USERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(USERS_FILE));
};
const writeUsers = (users) => fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

// --- AUTH ROUTES ---
app.post('/auth/signup', (req, res) => {
  const { name, email, password } = req.body;
  const users = readUsers();
  if (users.find(u => u.email === email)) return res.status(400).json({ error: "User already exists" });
  
  const newUser = { id: Date.now(), name, email, password }; // In prod, hash password!
  users.push(newUser);
  writeUsers(users);
  res.json({ success: true, user: newUser });
});

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  const users = readUsers();
  const user = users.find(u => u.email === email && u.password === password);
  
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  res.json({ success: true, user });
});

// --- GENERATE ROUTE ---
app.post('/generate', upload.fields([{ name: 'source_image' }, { name: 'target_video' }]), (req, res) => {
  if (!req.files.source_image || !req.files.target_video) return res.status(400).json({ error: 'Missing files' });

  const sourcePath = req.files.source_image[0].path;
  const targetPath = req.files.target_video[0].path;
  const outputPath = path.join(outputDir, `output_${Date.now()}.mp4`);

  let options = {
    mode: 'text', pythonOptions: ['-u'],
    pythonPath: 'E:\\DeepFakeProject\\generation\\venv_generation\\Scripts\\python.exe', 
    scriptPath: path.resolve(__dirname, '../generation/roop/'), 
    args: ['-s', sourcePath, '-t', targetPath, '-o', outputPath, '--execution-provider', 'cpu']
  };

  PythonShell.run('run.py', options).then(() => {
    if (fs.existsSync(outputPath)) res.download(outputPath);
    else throw new Error("Output file not generated");
  }).catch(err => res.status(500).json({ error: 'Generation failed', details: err.message }));
});

// --- Helper: Load External Models Config ---
const loadExternalModelsConfig = () => {
  const configPath = path.join(__dirname, 'external_models.json');
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (e) {
    console.error("Error loading external models config:", e.message);
  }
  return { enabled: false, external_models: [] };
};

// --- DETECT ROUTE (Single Model) ---
app.post('/detect', upload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No video uploaded' });

  const videoPath = req.file.path;
  const modelPath = path.resolve(__dirname, '../detection/deepfake_model.h5');

  let options = {
    mode: 'text', 
    pythonOptions: ['-u'],
    pythonPath: 'E:\\DeepFakeProject\\detection\\venv_detection\\Scripts\\python.exe',
    scriptPath: path.resolve(__dirname, '../detection/'), 
    args: [ videoPath, modelPath ]
  };

  console.log(">>> STARTING PYTHON PROCESS (Single Model)...");

  let pyshell = new PythonShell('detect.py', options);
  let resultJson = null;

  pyshell.on('stderr', function (stderr) {
    console.log(stderr);
  });

  pyshell.on('message', function (message) {
    try {
      const parsed = JSON.parse(message);
      if (parsed.label) resultJson = parsed;
    } catch (e) {
      // Ignore non-JSON messages
    }
  });

  pyshell.end(function (err, code, signal) {
    if (err) {
        console.error("Python crashed:", err);
        return res.status(500).json({ error: 'Detection failed', details: err.message });
    }
    
    if (!resultJson) {
        return res.status(500).json({ error: "No valid JSON output from Python" });
    }
    
    console.log(">>> PYTHON FINISHED. SENDING RESULT.");
    res.json(resultJson);
  });
});

// --- DETECT ROUTE (Dual Model) ---
app.post('/detect-dual', upload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No video uploaded' });

  const videoPath = req.file.path;
  const modelPath = path.resolve(__dirname, '../detection/deepfake_model.h5');
  const externalModelsConfig = loadExternalModelsConfig();
  
  // Get enabled external API URL
  let externalApiUrl = 'none';
  if (externalModelsConfig.enabled && externalModelsConfig.external_models.length > 0) {
    const enabledModel = externalModelsConfig.external_models.find(m => m.enabled);
    if (enabledModel) {
      externalApiUrl = enabledModel.api_url;
      console.log(`>>> Using external model: ${enabledModel.name} (${enabledModel.api_url})`);
    }
  }

  let options = {
    mode: 'text', 
    pythonOptions: ['-u'],
    pythonPath: 'E:\\DeepFakeProject\\detection\\venv_detection\\Scripts\\python.exe',
    scriptPath: path.resolve(__dirname, '../detection/'), 
    args: [ videoPath, modelPath, externalApiUrl ]
  };

  console.log(">>> STARTING DUAL-MODEL DETECTION PROCESS...");

  let pyshell = new PythonShell('detect_dual_model.py', options);
  let resultJson = null;

  pyshell.on('stderr', function (stderr) {
    console.log(stderr);
  });

  pyshell.on('message', function (message) {
    try {
      const parsed = JSON.parse(message);
      if (parsed.final_verdict) resultJson = parsed;
    } catch (e) {
      // Ignore non-JSON messages
    }
  });

  pyshell.end(function (err, code, signal) {
    if (err) {
        console.error("Python crashed:", err);
        return res.status(500).json({ error: 'Detection failed', details: err.message });
    }
    
    if (!resultJson) {
        return res.status(500).json({ error: "No valid JSON output from Python" });
    }
    
    console.log(">>> DUAL-MODEL DETECTION COMPLETE.");
    res.json(resultJson);
  });
});

// --- CONFIG ROUTE (Get/Update External Models) ---
app.get('/config/external-models', (req, res) => {
  const config = loadExternalModelsConfig();
  res.json(config);
});

app.post('/config/external-models', (req, res) => {
  const configPath = path.join(__dirname, 'external_models.json');
  try {
    fs.writeFileSync(configPath, JSON.stringify(req.body, null, 2));
    res.json({ success: true, message: 'External models config updated' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save config', details: e.message });
  }
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
});