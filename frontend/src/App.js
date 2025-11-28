import React, { useState, useEffect } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import { 
  Upload, Cpu, ShieldCheck, Play, Download,
  FileVideo, Image as ImageIcon, AlertTriangle, CheckCircle, 
  Terminal, Loader2, History, Info, FileText, X, 
  Settings, Moon, Sun, User, Globe, Lock 
} from 'lucide-react';
import './App.css';

function App() {
  // --- Global State ---
  const [view, setView] = useState('login'); // 'login', 'home', 'generate', 'detect', 'tech-specs'
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('dark');
  
  // Sidebars
  const [historyOpen, setHistoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [history, setHistory] = useState([]);

  // --- Initialization ---
  useEffect(() => {
    // Load History
    const savedHistory = localStorage.getItem('synthetix_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    
    // Load Theme
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const addToHistory = (type, name, result) => {
    const newItem = {
      id: Date.now(),
      type, // 'GEN' or 'DET'
      name,
      result,
      time: new Date().toLocaleTimeString()
    };
    const updated = [newItem, ...history].slice(0, 20);
    setHistory(updated);
    localStorage.setItem('synthetix_history', JSON.stringify(updated));
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // --- Auth Logic ---
  const handleLogout = () => {
    setUser(null);
    setView('login');
    setHistoryOpen(false);
    setSettingsOpen(false);
  };

  // --- Routing ---
  const renderContent = () => {
    switch(view) {
      case 'login': return <LoginView setUser={setUser} setView={setView} />;
      case 'home': return <HomeView setView={setView} />;
      case 'tech-specs': return <TechSpecsView />;
      case 'generate': return <GenerateView addToHistory={addToHistory} />;
      case 'detect': return <DetectView addToHistory={addToHistory} />;
      default: return <HomeView setView={setView} />;
    }
  };

  return (
    <div className="app">
      {user && (
        <Navbar 
          user={user} 
          setView={setView} 
          currentView={view} 
          onLogout={handleLogout} 
          toggleHistory={() => { setSettingsOpen(false); setHistoryOpen(!historyOpen); }}
          toggleSettings={() => { setHistoryOpen(false); setSettingsOpen(!settingsOpen); }}
        />
      )}
      
      <HistorySidebar isOpen={historyOpen} close={() => setHistoryOpen(false)} history={history} />
      <SettingsSidebar isOpen={settingsOpen} close={() => setSettingsOpen(false)} theme={theme} toggleTheme={toggleTheme} user={user} />

      <div className="container main-content">
        {renderContent()}
      </div>
    </div>
  );
}

// --- Components ---

const Navbar = ({ user, setView, currentView, onLogout, toggleHistory, toggleSettings }) => (
  <nav className="navbar">
    <div className="container nav-content">
      <div className="logo" onClick={() => setView('home')}>
        SYNTHETIX<span className="highlight">.AI</span>
      </div>
      <div className="nav-links">
        <button className={currentView === 'home' ? 'active' : ''} onClick={() => setView('home')}>Dashboard</button>
        <button className={currentView === 'tech-specs' ? 'active' : ''} onClick={() => setView('tech-specs')}>Tech Specs</button>
        <button className={currentView === 'generate' ? 'active' : ''} onClick={() => setView('generate')}>Generate</button>
        <button className={currentView === 'detect' ? 'active' : ''} onClick={() => setView('detect')}>Detect</button>
        <span className="separator">|</span>
        <button onClick={toggleHistory}><History size={18} /></button>
        <button onClick={toggleSettings}><Settings size={18} /></button>
      </div>
    </div>
  </nav>
);

const HistorySidebar = ({ isOpen, close, history }) => (
  <div className={`sidebar right-sidebar ${isOpen ? 'open' : ''}`}>
    <div className="sidebar-header">
      <h3>Session Log</h3>
      <button onClick={close}><X size={24} /></button>
    </div>
    {history.length === 0 && <p className="text-muted">No recent activity.</p>}
    {history.map(item => (
      <div key={item.id} className="history-item fade-in">
        <div className="history-meta">
          <span className={`badge ${item.type === 'GEN' ? 'badge-gen' : 'badge-det'}`}>{item.type}</span>
          <span className="timestamp">{item.time}</span>
        </div>
        <p className="filename">{item.name}</p>
        <p className={`result-text ${item.type === 'GEN' ? 'text-primary' : (item.result.label==='FAKE'?'text-danger':'text-success')}`}>
          {item.type === 'GEN' ? 'Success' : `${item.result.label} (${(item.result.probability*100).toFixed(0)}%)`}
        </p>
      </div>
    ))}
  </div>
);

const SettingsSidebar = ({ isOpen, close, theme, toggleTheme, user }) => (
  <div className={`sidebar right-sidebar ${isOpen ? 'open' : ''}`}>
    <div className="sidebar-header">
      <h3>Settings</h3>
      <button onClick={close}><X size={24} /></button>
    </div>
    
    <div className="setting-group">
      <label>Appearance</label>
      <button className="btn-outline full-width" onClick={toggleTheme}>
        {theme === 'dark' ? <><Sun size={18} /> Light Mode</> : <><Moon size={18} /> Dark Mode</>}
      </button>
    </div>

    <div className="setting-group">
      <label>User Profile</label>
      <div className="profile-card">
        <div className="avatar">{user?.name?.charAt(0)}</div>
        <div>
          <h4>{user?.name}</h4>
          <p>{user?.email}</p>
        </div>
      </div>
      <button className="btn-outline full-width" disabled><User size={18} /> Edit Profile</button>
    </div>

    <div className="setting-group">
      <label>Privacy & API</label>
      <button className="btn-outline full-width" disabled><Lock size={18} /> Change Password</button>
      <button className="btn-outline full-width" disabled><Globe size={18} /> Developer API</button>
    </div>
  </div>
);

const LoginView = ({ setUser, setView }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const endpoint = isSignup ? '/auth/signup' : '/auth/login';
    try {
      const res = await axios.post(`http://localhost:5000${endpoint}`, formData);
      setUser(res.data.user);
      setView('home');
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed');
    }
  };

  const mockGoogleLogin = () => {
    // Simulation
    setTimeout(() => {
      setUser({ name: "Google User", email: "google_user@gmail.com" });
      setView('home');
    }, 1000);
  };

  return (
    <div className="login-wrapper fade-in">
      <div className="glass-card login-card">
        <div className="icon-wrapper"><Cpu size={48} className="text-primary" /></div>
        <h2>{isSignup ? 'Create Account' : 'System Access'}</h2>
        <p className="text-muted">Authenticate to access neural engines.</p>
        
        <button className="btn-google" onClick={mockGoogleLogin}>
          <Globe size={18} /> Sign in with Google
        </button>
        
        <div className="divider"><span>OR</span></div>

        <form onSubmit={handleSubmit}>
          {isSignup && (
            <div className="input-group">
              <input type="text" placeholder="Full Name" className="input-field" required 
                onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
          )}
          <div className="input-group">
            <input type="email" placeholder="Email Address" className="input-field" required 
               onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>
          <div className="input-group">
            <input type="password" placeholder="Password" className="input-field" required 
               onChange={e => setFormData({...formData, password: e.target.value})} />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="btn-primary full-width">
            {isSignup ? 'Register' : 'Initialize Session'}
          </button>
        </form>
        
        <p className="auth-toggle" onClick={() => setIsSignup(!isSignup)}>
          {isSignup ? "Already have an account? Login" : "New user? Create Account"}
        </p>
      </div>
    </div>
  );
};

const HomeView = ({ setView }) => (
  <div className="home-view fade-in">
    <div className="hero-section">
      <h1 className="hero-title">Trust in the Age of <br /><span className="neon-text">Synthetic Media</span></h1>
      <p className="hero-sub">Advanced Deepfake Generation & Forensic Detection Platform powered by ROOP & XceptionNet.</p>
      
      <div className="cards-grid">
        <div className="glass-card feature-card" onClick={() => setView('generate')}>
          <Cpu size={40} className="text-primary" />
          <h3>Generation Engine</h3>
          <p>Create hyper-realistic deepfakes using ROOP architecture. Seamless face swapping.</p>
          <div className="card-action">Access Engine <Play size={16} /></div>
        </div>
        <div className="glass-card feature-card" onClick={() => setView('detect')}>
          <ShieldCheck size={40} className="text-secondary" />
          <h3>Detection Shield</h3>
          <p>Analyze video artifacts using XceptionNet CNN to determine authenticity.</p>
          <div className="card-action text-secondary">Start Scan <ShieldCheck size={16} /></div>
        </div>
      </div>
    </div>

    <div className="about-section glass-card">
      <h2>Mission & Future</h2>
      <div className="about-grid">
        <div>
          <h4><Info size={18} /> The Mission</h4>
          <p>To restore trust in digital media by providing accessible, high-grade forensic tools to identify synthetic manipulation.</p>
        </div>
        <div>
          <h4><Globe size={18} /> The Roadmap</h4>
          <p>Future updates include Real-Time Stream Analysis, Blockchain Evidence Hashing, and Explainable AI Heatmaps.</p>
        </div>
      </div>
    </div>
  </div>
);

const TechSpecsView = () => (
  <div className="glass-card fade-in" style={{marginTop: '2rem'}}>
    <h2 className="section-title"><Terminal size={24} /> Technical Specifications</h2>
    <div className="specs-content">
      <div className="spec-block">
        <h3>1. ROOP (InsightFace) - Generation</h3>
        <p>Our generation engine utilizes the ROOP framework, which relies on the InsightFace INSwapper model. Unlike traditional Deepfakes that require training a LoRA for hours, ROOP performs a single-shot face replacement by extracting embeddings from a single source image and mapping them to the target video frame-by-frame.</p>
      </div>
      <div className="spec-block">
        <h3>2. XceptionNet - Detection</h3>
        <p>The detection unit employs a modified XceptionNet (Extreme Inception) Convolutional Neural Network. It is fine-tuned on the FaceForensics++ dataset. The model analyzes frame-level spatial artifacts (compression inconsistencies, warping artifacts) that are invisible to the naked eye but statistically significant to the CNN.</p>
      </div>
    </div>
  </div>
);

const GenerateView = ({ addToHistory }) => {
  const [sourceFile, setSourceFile] = useState(null);
  const [targetFile, setTargetFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  
  // Previews
  const [sourcePreview, setSourcePreview] = useState(null);
  const [targetPreview, setTargetPreview] = useState(null); // NEW: Store original video preview

  const handleFile = (e, setter, isImg) => {
    const file = e.target.files[0];
    if(file) {
      setter(file);
      const url = URL.createObjectURL(file); // Create URL for both image and video
      if(isImg) {
        setSourcePreview(url);
      } else {
        setTargetPreview(url);
      }
    }
  };

  const handleGenerate = async () => {
    if (!sourceFile || !targetFile) return alert("Please upload both files.");
    setLoading(true);
    
    // Scroll to bottom to show loading
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });

    const formData = new FormData();
    formData.append('source_image', sourceFile);
    formData.append('target_video', targetFile);

    try {
      const response = await axios.post('http://localhost:5000/generate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob'
      });
      const url = URL.createObjectURL(new Blob([response.data]));
      setVideoUrl(url);
      addToHistory('GEN', targetFile.name, { label: 'Success', probability: 1 });
    } catch (error) {
      console.error(error);
      alert("Generation failed. Check backend connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card fade-in" style={{ marginTop: '2rem' }}>
      <h2 className="section-title"><Cpu size={24} /> Deepfake Synthesis</h2>
      
      {/* INPUTS */}
      <div className="cards-grid inputs-grid">
        <div className="drop-zone">
           <input type="file" accept="image/*" onChange={(e) => handleFile(e, setSourceFile, true)} id="src-up" hidden />
           <label htmlFor="src-up" className="drop-label">
              {sourcePreview ? (
                <img src={sourcePreview} alt="Source" className="preview-img" style={{height: '120px', objectFit: 'contain'}}/>
              ) : (
                <ImageIcon size={32} />
              )}
              <p>{sourceFile ? sourceFile.name : "Source Face (Image)"}</p>
           </label>
        </div>
        <div className="drop-zone">
           <input type="file" accept="video/*" onChange={(e) => handleFile(e, setTargetFile, false)} id="tgt-up" hidden />
           <label htmlFor="tgt-up" className="drop-label">
              {targetPreview ? (
                 <video src={targetPreview} className="preview-img" style={{height: '120px'}} muted loop autoPlay />
              ) : (
                 <FileVideo size={32} />
              )}
              <p>{targetFile ? targetFile.name : "Target Body (Video)"}</p>
           </label>
        </div>
      </div>

      <div className="action-area">
        {!loading && !videoUrl && (
            <button className="btn-primary" onClick={handleGenerate}>Initiate Synthesis</button>
        )}
        
        {loading && (
            <div className="loading-container">
                <Loader2 className="spin" /> 
                Processing Neural Weights... This may take a minute.
            </div>
        )}
        
        {videoUrl && (
          <div className="output-container fade-in" style={{width: '100%'}}>
             <h3 style={{marginBottom: '20px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px'}}>
                 Result Analysis
             </h3>
             
             {/* 3-WAY COMPARISON GRID */}
             <div style={{
                 display: 'grid', 
                 gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                 gap: '20px',
                 marginBottom: '20px'
             }}>
                {/* 1. Source Face */}
                <div className="comp-side">
                  <h4 className="text-muted" style={{fontSize: '0.9rem', marginBottom: '10px'}}>Source Face</h4>
                  <div style={{background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '10px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <img src={sourcePreview} alt="Source" style={{maxHeight: '100%', maxWidth: '100%'}} />
                  </div>
                </div>

                {/* 2. Original Video */}
                <div className="comp-side">
                  <h4 className="text-muted" style={{fontSize: '0.9rem', marginBottom: '10px'}}>Original Video</h4>
                  <video src={targetPreview} controls style={{width: '100%', height: '200px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--glass-border)'}} />
                </div>

                {/* 3. Swapped Result */}
                <div className="comp-side">
                  <h4 className="text-primary" style={{fontSize: '0.9rem', marginBottom: '10px'}}>Synthesized Output</h4>
                  <video src={videoUrl} controls style={{width: '100%', height: '200px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--primary)', boxShadow: '0 0 15px rgba(147, 51, 234, 0.3)'}} />
                </div>
             </div>

             <div style={{display: 'flex', justifyContent: 'center'}}>
                <a href={videoUrl} download={`synthetix_${Date.now()}.mp4`} className="btn-primary btn-green">
                    <Download size={16} /> Download Result
                </a>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

const DetectView = ({ addToHistory }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [useDualModel, setUseDualModel] = useState(true);
  const [error, setError] = useState(null);

  const handleScan = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('video', file);
    
    const endpoint = useDualModel ? 'http://localhost:5000/detect-dual' : 'http://localhost:5000/detect';
    
    try {
      const response = await axios.post(endpoint, formData, { 
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000 // 2 minute timeout
      });
      setResult(response.data);
      addToHistory('DET', file.name, response.data);
    } catch (error) {
      const errorMsg = error.response?.data?.error || "Analysis failed. Make sure backend is running.";
      setError(errorMsg);
      console.error("Detection error:", error);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const isSingleModel = !result.final_verdict;
    const label = isSingleModel ? result.label : result.final_verdict;
    const isFake = label === 'FAKE';
    
    doc.setFillColor(5, 5, 9); doc.rect(0, 0, 210, 297, 'F');
    doc.setTextColor(34, 197, 94); doc.setFontSize(22); doc.setFont("courier", "bold");
    doc.text("SYNTHETIX AI FORENSICS", 105, 20, null, null, "center");
    
    doc.setTextColor(255, 255, 255); doc.setFont("courier", "normal"); doc.setFontSize(12);
    doc.text(`FILE: ${file.name}`, 20, 60);
    doc.text(`DATE: ${new Date().toLocaleString()}`, 20, 70);
    
    let yPos = 90;
    if (!isSingleModel) {
      // Dual model info
      doc.setTextColor(100, 200, 255);
      doc.setFontSize(10);
      doc.text("DUAL-MODEL ANALYSIS", 20, yPos);
      yPos += 8;
      doc.setTextColor(200, 200, 200);
      doc.text(`Consensus: ${result.consensus ? 'YES' : 'NO'}`, 20, yPos);
      yPos += 6;
      doc.text(`Local: ${result.local_model.label} (${result.local_model.confidence_percentage.toFixed(2)}%)`, 20, yPos);
      yPos += 6;
      if (result.external_model) {
        doc.text(`External: ${result.external_model.label} (${result.external_model.confidence_percentage.toFixed(2)}%)`, 20, yPos);
      } else {
        doc.text(`External: Not available`, 20, yPos);
      }
      yPos += 10;
    }
    
    doc.setFillColor(isFake ? 239 : 34, isFake ? 68 : 197, isFake ? 68 : 94);
    doc.rect(20, yPos, 170, 15, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont("courier", "bold");
    const confidence = isSingleModel ? (result.probability * 100).toFixed(2) : (result.final_confidence * 100).toFixed(2);
    doc.text(`VERDICT: ${label} (${confidence}%)`, 105, yPos + 8, null, null, "center");
    
    doc.save("Synthetix_Report.pdf");
  };

  return (
    <div className="glass-card fade-in" style={{ marginTop: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h2 className="section-title"><ShieldCheck size={24} /> Forensic Detection Unit</h2>
      
      {/* Dual Model Toggle */}
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'rgba(100, 100, 200, 0.1)', borderRadius: '8px', border: '1px solid rgba(100, 100, 200, 0.3)' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#e2e8f0' }}>
          <input 
            type="checkbox" 
            checked={useDualModel}
            onChange={(e) => setUseDualModel(e.target.checked)}
            disabled={loading}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <span>Use Dual-Model Consensus Detection (slower but more accurate)</span>
        </label>
      </div>

      <div className="drop-zone large-zone">
         <input type="file" accept="video/*" onChange={(e) => setFile(e.target.files[0])} id="detect-up" hidden disabled={loading} />
         <label htmlFor="detect-up" className="drop-label">
            <Upload size={48} style={{ marginBottom: '15px' }} />
            <p className="large-text">{file ? file.name : "Upload Video for Analysis"}</p>
         </label>
      </div>
      <div className="action-area">
        {error && (
          <div style={{ padding: '12px', backgroundColor: '#7f1d1d', color: '#fca5a5', borderRadius: '6px', marginBottom: '15px' }}>
            <strong>Error:</strong> {error}
          </div>
        )}
        {!loading && !result && (
          <button className="btn-outline" onClick={handleScan} disabled={!file}>
            <Terminal size={16} /> {useDualModel ? 'Run Dual-Model Scan' : 'Run Scan'}
          </button>
        )}
        {loading && (
          <div className="loading-container">
            <Loader2 className="spin" /> {useDualModel ? 'Analyzing with both models...' : 'Analyzing Artifacts...'}
          </div>
        )}
        {result && (
          <div className="result-container fade-in">
            {/* Single Model Result */}
            {!result.final_verdict && (
              <>
                <div className={`result-badge ${result.label === 'FAKE' ? 'badge-fake' : 'badge-real'}`}>
                  {result.label === 'FAKE' ? <AlertTriangle size={24} /> : <CheckCircle size={24} />}
                  <span>VERDICT: {result.label}</span>
                </div>
                <div className="confidence-section">
                  <span className="confidence-text">Confidence: <span className="mono">{(result.probability * 100).toFixed(2)}%</span></span>
                </div>
              </>
            )}
            
            {/* Dual Model Result */}
            {result.final_verdict && (
              <>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ padding: '12px', backgroundColor: result.consensus ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', border: `1px solid ${result.consensus ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}` }}>
                    <strong>Consensus: {result.consensus ? '✓ YES' : '✗ NO'}</strong>
                    <p style={{ fontSize: '12px', marginTop: '5px', color: '#cbd5e1' }}>{result.note}</p>
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                  <div style={{ padding: '12px', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                    <h4 style={{ margin: '0 0 8px 0', color: '#93c5fd' }}>Local Model</h4>
                    <p style={{ margin: '4px 0', color: '#e2e8f0' }}><strong>{result.local_model.label}</strong></p>
                    <p style={{ margin: '4px 0', fontSize: '12px', color: '#cbd5e1' }}>Confidence: {result.local_model.confidence_percentage.toFixed(2)}%</p>
                  </div>
                  
                  {result.external_model && (
                    <div style={{ padding: '12px', backgroundColor: 'rgba(168, 85, 247, 0.1)', borderRadius: '6px', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                      <h4 style={{ margin: '0 0 8px 0', color: '#d8b4fe' }}>External Model</h4>
                      <p style={{ margin: '4px 0', color: '#e2e8f0' }}><strong>{result.external_model.label}</strong></p>
                      <p style={{ margin: '4px 0', fontSize: '12px', color: '#cbd5e1' }}>Confidence: {result.external_model.confidence_percentage.toFixed(2)}%</p>
                    </div>
                  )}
                </div>
                
                <div className={`result-badge ${result.final_verdict === 'FAKE' ? 'badge-fake' : 'badge-real'}`}>
                  {result.final_verdict === 'FAKE' ? <AlertTriangle size={24} /> : <CheckCircle size={24} />}
                  <span>FINAL VERDICT: {result.final_verdict}</span>
                </div>
                <div className="confidence-section">
                  <span className="confidence-text">Final Confidence: <span className="mono">{(result.final_confidence * 100).toFixed(2)}%</span></span>
                </div>
              </>
            )}
            
            <button onClick={() => { setResult(null); setFile(null); setError(null); }} className="btn-outline" style={{ marginRight: '10px' }}>
              Analyze Another Video
            </button>
            <button onClick={generatePDF} className="btn-glitch">
              <FileText size={18} style={{marginRight:'8px'}}/> Export PDF Report
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;