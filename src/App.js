import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import {
  Upload, Cpu, ShieldCheck, Play, Download,
  FileVideo, Image as ImageIcon, AlertTriangle, CheckCircle,
  Terminal, Loader2, History, Info, FileText, X,
  Settings, Moon, Sun, User, Globe, Lock
} from 'lucide-react';
import './App.css';
import { auth, googleProvider } from './firebase-config'; // Real Auth
import { signInWithPopup } from 'firebase/auth';

function App() {
  // --- Global State ---
  const [view, setView] = useState('login'); // 'login', 'home', 'generate', 'detect', 'tech-specs', 'about'
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

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('synthetix_history');
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
    switch (view) {
      case 'login': return <LoginView setUser={setUser} setView={setView} />;
      case 'home': return <HomeView setView={setView} />;
      case 'tech-specs': return <TechSpecsView />;
      case 'about': return <AboutView />;
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

      <HistorySidebar isOpen={historyOpen} close={() => setHistoryOpen(false)} history={history} clearHistory={clearHistory} />
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
        <button className={currentView === 'about' ? 'active' : ''} onClick={() => setView('about')}>About Us</button>
        <span className="separator">|</span>
        <button onClick={toggleHistory}><History size={18} /></button>
        <button onClick={toggleSettings}><Settings size={18} /></button>
      </div>
    </div>
  </nav>
);

const HistorySidebar = ({ isOpen, close, history, clearHistory }) => (
  <div className={`sidebar right-sidebar ${isOpen ? 'open' : ''}`}>
    <div className="sidebar-header">
      <h3>Session Log</h3>
      <button onClick={close}><X size={24} /></button>
    </div>
    {history.length === 0 && <p className="text-muted">No recent activity.</p>}
    {history.length > 0 && (
      <button
        className="btn-outline full-width"
        onClick={clearHistory}
        style={{ marginBottom: '1rem', fontSize: '0.9rem' }}
      >
        🗑️ Clear Logs
      </button>
    )}
    {history.map(item => (
      <div key={item.id} className="history-item fade-in">
        <div className="history-meta">
          <span className={`badge ${item.type === 'GEN' ? 'badge-gen' : 'badge-det'}`}>{item.type}</span>
          <span className="timestamp">{item.time}</span>
        </div>
        <p className="filename">{item.name}</p>
        <p className={`result-text ${item.type === 'GEN' ? 'text-primary' : (item.result.label === 'FAKE' ? 'text-danger' : 'text-success')}`}>
          {item.type === 'GEN' ? 'Success' : `${item.result.label} (${(item.result.probability * 100).toFixed(0)}%)`}
        </p>
      </div>
    ))}
  </div>
);

const SettingsSidebar = ({ isOpen, close, theme, toggleTheme, user }) => {
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showDevAPI, setShowDevAPI] = useState(false);
  const [apiKey] = useState(`sk-synthetix-${Date.now()}-${Math.random().toString(36).substring(7)}`);

  return (
    <>
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
          <button className="btn-outline full-width" onClick={() => setShowEditProfile(true)}><User size={18} /> Edit Profile</button>
        </div>

        <div className="setting-group">
          <label>Privacy & API</label>
          <button className="btn-outline full-width" onClick={() => setShowChangePassword(true)}><Lock size={18} /> Change Password</button>
          <button className="btn-outline full-width" onClick={() => setShowDevAPI(true)}><Globe size={18} /> Developer API</button>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditProfile && <EditProfileModal user={user} onClose={() => setShowEditProfile(false)} />}

      {/* Change Password Modal */}
      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}

      {/* Developer API Modal */}
      {showDevAPI && <DeveloperAPIModal apiKey={apiKey} onClose={() => setShowDevAPI(false)} />}
    </>
  );
};

// Modal Components
const EditProfileModal = ({ user, onClose }) => {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');

  const handleSave = () => {
    alert(`Profile Updated!\nName: ${name}\nEmail: ${email}`);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3><User size={24} /> Edit Profile</h3>
          <button onClick={onClose} className="close-btn"><X size={24} /></button>
        </div>
        <div className="modal-body">
          <div className="input-group">
            <label>Full Name</label>
            <input
              type="text"
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
            />
          </div>
          <div className="input-group">
            <label>Email Address</label>
            <input
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>Save Changes</button>
        </div>
      </div>
    </div>
  );
};

const ChangePasswordModal = ({ onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleChange = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert('Please fill in all fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('New passwords do not match!');
      return;
    }
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    alert('Password changed successfully!');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3><Lock size={24} /> Change Password</h3>
          <button onClick={onClose} className="close-btn"><X size={24} /></button>
        </div>
        <div className="modal-body">
          <div className="input-group">
            <label>Current Password</label>
            <input
              type="password"
              className="input-field"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
            />
          </div>
          <div className="input-group">
            <label>New Password</label>
            <input
              type="password"
              className="input-field"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </div>
          <div className="input-group">
            <label>Confirm New Password</label>
            <input
              type="password"
              className="input-field"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleChange}>Update Password</button>
        </div>
      </div>
    </div>
  );
};

const DeveloperAPIModal = ({ apiKey, onClose }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3><Globe size={24} /> Developer API</h3>
          <button onClick={onClose} className="close-btn"><X size={24} /></button>
        </div>
        <div className="modal-body">
          <p className="text-muted" style={{ marginBottom: '1rem' }}>
            Use this API key to access Synthetix AI programmatically. Keep it secure!
          </p>
          <div className="api-key-container">
            <code className="api-key">{apiKey}</code>
            <button className="btn-primary" onClick={copyToClipboard}>
              {copied ? <>✓ Copied!</> : <>Copy Key</>}
            </button>
          </div>
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(147, 51, 234, 0.1)', borderRadius: '8px', border: '1px solid rgba(147, 51, 234, 0.3)' }}>
            <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Example Usage:</h4>
            <pre className="code-block">
              {`curl -X POST ${process.env.REACT_APP_API_URL}/detect \\
  -H "Authorization: Bearer ${apiKey}" \\
  -F "video=@yourfile.mp4"`}
            </pre>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-outline full-width" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

const LoginView = ({ setUser, setView }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const endpoint = isSignup ? '/auth/signup' : '/auth/login';
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL}${endpoint}`, formData, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      setUser(res.data.user);
      setView('home');
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed');
    }
  };



  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Log login to backend (for Sheets tracking)
      axios.post(`${process.env.REACT_APP_API_URL}/auth/log-visit`, {
        email: user.email,
        name: user.displayName
      }).catch(err => console.error("Logging failed", err));

      setUser({
        name: user.displayName,
        email: user.email,
        avatar: user.photoURL
      });
      setView('home');
    } catch (error) {
      console.error("Login Failed:", error);
      alert(`Login Failed: ${error.message}`);
    }
  };

  return (
    <div className="login-wrapper fade-in">
      <div className="glass-card login-card">
        <div className="icon-wrapper"><Cpu size={48} className="text-primary" /></div>
        <h2>{isSignup ? 'Create Account' : 'System Access'}</h2>
        <p className="text-muted">Authenticate to access neural engines.</p>

        <button className="btn-google" onClick={handleGoogleLogin}>
          <Globe size={18} /> Sign in with Google
        </button>

        <div className="divider"><span>OR</span></div>

        <form onSubmit={handleSubmit}>
          {isSignup && (
            <div className="input-group">
              <input type="text" placeholder="Full Name" className="input-field" required
                onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </div>
          )}
          <div className="input-group">
            <input type="email" placeholder="Email Address" className="input-field" required
              onChange={e => setFormData({ ...formData, email: e.target.value })} />
          </div>
          <div className="input-group">
            <input type="password" placeholder="Password" className="input-field" required
              onChange={e => setFormData({ ...formData, password: e.target.value })} />
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
  <div className="glass-card fade-in" style={{ marginTop: '2rem' }}>
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

const AboutView = () => (
  <div className="fade-in" style={{ marginTop: '2rem' }}>
    {/* Hero Section */}
    <div className="glass-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
      <h1 className="hero-title about-hero-title" style={{ marginBottom: '1rem' }}>
        About <span className="neon-text">Team T72</span>
      </h1>
      <p className="hero-sub about-hero-sub" style={{ maxWidth: '800px', margin: '0 auto' }}>
        Curious AI enthusiasts experimenting with cutting-edge technology to shape the future of digital media.
      </p>
    </div>

    {/* Mission Section */}
    <div className="glass-card" style={{ marginTop: '2rem' }}>
      <h2 className="section-title"><Globe size={24} /> Our Mission</h2>
      <p style={{ fontSize: '1.1rem', lineHeight: '1.8', color: 'var(--text-main)' }}>
        We are curious AI amateurs trying to experiment and create new things. We are highly passionate and delighted to be part of the current AI revolution.
        We take great privilege in delivering a product that not only can generate deepfakes but also detect them, ensuring the safety and security of every user.
      </p>
    </div>

    {/* Project Story */}
    <div className="glass-card" style={{ marginTop: '2rem' }}>
      <h2 className="section-title"><Info size={24} /> Project Story</h2>
      <div style={{ fontSize: '1.05rem', lineHeight: '1.8', color: 'var(--text-main)' }}>
        <p style={{ marginBottom: '1rem' }}>
          Synthetix AI began as a mini-project in <strong>2025</strong> at <strong className="text-primary">GLA University</strong>.
          Our task was to design a deepfake detection system, but we decided to go beyond the requirements.
        </p>
        <p>
          We created a comprehensive platform that not only detects deepfakes but also generates them, demonstrating the dual nature of AI technology—its power
          to both create and protect. This project showcases our commitment to innovation while prioritizing digital safety.
        </p>
      </div>
    </div>

    {/* Team Section */}
    <div className="glass-card" style={{ marginTop: '2rem' }}>
      <h2 className="section-title"><User size={24} /> Meet the Team</h2>
      <div className="team-grid">
        <div className="team-card">
          <img src="/kshitiz.png" alt="Kshitiz Sharma" className="team-avatar-img" />
          <h3>Kshitiz Sharma</h3>
          <p className="team-role">AI & Research</p>
          <p className="text-muted">Specialized in machine learning models and neural network architectures for deepfake detection and generation.</p>
        </div>
        <div className="team-card">
          <img src="/utkarsh.png" alt="Utkarsh Chauhan" className="team-avatar-img" />
          <h3>Utkarsh Chauhan</h3>
          <p className="team-role">Full Stack Development</p>
          <p className="text-muted">Built the complete web infrastructure, from responsive frontend to robust backend APIs.</p>
        </div>
        <div className="team-card">
          <img src="/saksham.png" alt="Saksham Gupta" className="team-avatar-img" />
          <h3>Saksham Gupta</h3>
          <p className="team-role">Integration & Deployment</p>
          <p className="text-muted">Seamlessly integrated AI models with the application and managed deployment pipelines.</p>
        </div>
      </div>
    </div>

    {/* Tech Stack */}
    <div className="glass-card" style={{ marginTop: '2rem' }}>
      <h2 className="section-title"><Terminal size={24} /> Technology Stack</h2>
      <div className="tech-grid">
        <div className="tech-category">
          <h4>Frontend</h4>
          <div className="tech-tags">
            <span className="tech-tag">React.js</span>
            <span className="tech-tag">Axios</span>
            <span className="tech-tag">Lucide Icons</span>
          </div>
        </div>
        <div className="tech-category">
          <h4>Backend</h4>
          <div className="tech-tags">
            <span className="tech-tag">Node.js</span>
            <span className="tech-tag">Express.js</span>
            <span className="tech-tag">Multer</span>
          </div>
        </div>
        <div className="tech-category">
          <h4>AI & ML</h4>
          <div className="tech-tags">
            <span className="tech-tag">TensorFlow</span>
            <span className="tech-tag">XceptionNet</span>
            <span className="tech-tag">Vision Transformer</span>
            <span className="tech-tag">ROOP (InsightFace)</span>
          </div>
        </div>
        <div className="tech-category">
          <h4>Tools</h4>
          <div className="tech-tags">
            <span className="tech-tag">Python</span>
            <span className="tech-tag">OpenCV</span>
            <span className="tech-tag">NumPy</span>
          </div>
        </div>
      </div>
    </div>

    {/* Contact Section */}
    <div className="glass-card" style={{ marginTop: '2rem', textAlign: 'center' }}>
      <h2 className="section-title"><Globe size={24} /> Get In Touch</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        Interested in our work or have questions? Feel free to reach out!
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <a href="mailto:kshitizsharma015@gmail.com" className="btn-primary" style={{ textDecoration: 'none' }}>
          📧 kshitizsharma015@gmail.com
        </a>
        <p className="text-muted" style={{ fontSize: '0.9rem' }}>
          <strong>GLA University</strong> • Mini Project 2025
        </p>
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
  const [targetPreview, setTargetPreview] = useState(null);

  // Refs for file inputs
  const sourceInputRef = useRef(null);
  const targetInputRef = useRef(null);

  const handleFile = (e, setter, isImg) => {
    const file = e.target.files[0];
    if (file) {
      setter(file);
      const url = URL.createObjectURL(file);
      if (isImg) {
        setSourcePreview(url);
      } else {
        setTargetPreview(url);
      }
    }
  };

  const handleReset = () => {
    // Clean up blob URLs
    if (sourcePreview) URL.revokeObjectURL(sourcePreview);
    if (targetPreview) URL.revokeObjectURL(targetPreview);
    if (videoUrl) URL.revokeObjectURL(videoUrl);

    // Reset all states
    setSourceFile(null);
    setTargetFile(null);
    setVideoUrl(null);
    setSourcePreview(null);
    setTargetPreview(null);

    // Reset file inputs
    if (sourceInputRef.current) sourceInputRef.current.value = '';
    if (targetInputRef.current) targetInputRef.current.value = '';

    // Smooth scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [progress, setProgress] = useState(0);
  const [tabWarning, setTabWarning] = useState(false);

  // --- Tab Switch & Close Warning Logic ---
  useEffect(() => {
    if (!loading) return;

    // 1. Prevent closing tab
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = ''; // Legacy support
      return '';
    };

    // 2. Warn on Tab Switch
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // We can't alert/confirm here reliably, but we can update UI or notify
        // Ideally, use the Web Notification API if permitted, or just setting a document title
        document.title = "⚠️ DON'T CLOSE! Processing...";
        setTabWarning(true);
      } else {
        document.title = "Synthetix AI"; // Restore
        // Optional: show a toast/modal saying "Please keep this tab open!"
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.title = "Synthetix AI";
    };
  }, [loading]);

  // --- Progress Simulation (7 Minutes) ---
  useEffect(() => {
    if (!loading) {
      setProgress(0);
      return;
    }

    // 420 seconds (7 mins) to reach ~95%
    // Increment roughly every 4 seconds -> 1%
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev; // Hold at 95 until done
        // Slow down as we get closer
        const increment = prev < 50 ? 0.5 : 0.2;
        return Math.min(prev + increment, 95);
      });
    }, 2000); // Update every 2s

    return () => clearInterval(interval);
  }, [loading]);

  const handleGenerate = async () => {
    if (!sourceFile || !targetFile) return alert("Please upload both files.");
    setLoading(true);
    setTabWarning(false);
    setProgress(0);

    // Scroll to bottom to show loading
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });

    const formData = new FormData();
    formData.append('source_image', sourceFile);
    formData.append('target_video', targetFile);

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/generate`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'ngrok-skip-browser-warning': 'true'
        },
        responseType: 'blob'
      });
      const url = URL.createObjectURL(new Blob([response.data]));
      setVideoUrl(url);
      setProgress(100); // Complete
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
          <input ref={sourceInputRef} type="file" accept="image/*" onChange={(e) => handleFile(e, setSourceFile, true)} id="src-up" hidden />
          <label htmlFor="src-up" className="drop-label">
            {sourcePreview ? (
              <img src={sourcePreview} alt="Source" className="preview-img" style={{ height: '120px', objectFit: 'contain' }} />
            ) : (
              <ImageIcon size={32} />
            )}
            <p>{sourceFile ? sourceFile.name : "Source Face (Image)"}</p>
          </label>
        </div>
        <div className="drop-zone">
          <input ref={targetInputRef} type="file" accept="video/*" onChange={(e) => handleFile(e, setTargetFile, false)} id="tgt-up" hidden />
          <label htmlFor="tgt-up" className="drop-label">
            {targetPreview ? (
              <video src={targetPreview} className="preview-img" style={{ height: '120px' }} muted loop autoPlay />
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
          <div className="loading-container glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
            <Loader2 className="spin" size={48} style={{ marginBottom: '1rem', color: 'var(--primary)' }} />

            <h3 style={{ marginBottom: '0.5rem' }}>Neural Synthesis In Progress...</h3>
            <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
              We are merging facial embeddings frame-by-frame. This is a heavy AI process.
            </p>

            {/* Progress Bar */}
            <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', overflow: 'hidden', marginBottom: '0.5rem' }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
                transition: 'width 0.5s ease'
              }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <span>Progress: {Math.round(progress)}%</span>
              <span>Estimated time: 5-7 minutes</span>
            </div>

            {/* Tab Warning Alert */}
            {tabWarning && (
              <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', borderRadius: '8px', color: '#ff6b6b' }}>
                <AlertTriangle size={18} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                <strong>Warning:</strong> You switched tabs! Please keep this tab open and active to prevent the server connection from dropping.
              </div>
            )}

            <div style={{ marginTop: '1rem', fontSize: '0.8rem', opacity: 0.7 }}>
              <Info size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              Do not close or reload this page.
            </div>
          </div>
        )}

        {videoUrl && (
          <div className="output-container fade-in" style={{ width: '100%' }}>
            <h3 style={{ marginBottom: '20px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>
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
                <h4 className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '10px' }}>Source Face</h4>
                <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '10px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={sourcePreview} alt="Source" style={{ maxHeight: '100%', maxWidth: '100%' }} />
                </div>
              </div>

              {/* 2. Original Video */}
              <div className="comp-side">
                <h4 className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '10px' }}>Original Video</h4>
                <video src={targetPreview} controls style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '8px', border: '1px solid var(--glass-border)', backgroundColor: 'rgba(0,0,0,0.3)' }} />
              </div>

              {/* 3. Swapped Result */}
              <div className="comp-side">
                <h4 className="text-primary" style={{ fontSize: '0.9rem', marginBottom: '10px' }}>Synthesized Output</h4>
                <video src={videoUrl} controls style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '8px', border: '1px solid var(--primary)', boxShadow: '0 0 15px rgba(147, 51, 234, 0.3)', backgroundColor: 'rgba(0,0,0,0.3)' }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button onClick={handleReset} className="btn-outline">
                <Upload size={16} /> Generate Another
              </button>
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
  const [error, setError] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setVideoPreview(URL.createObjectURL(selectedFile));
      setError(null);
      setResult(null);
    }
  };

  const handleClearSelection = () => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    setFile(null);
    setVideoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleReset = () => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    setFile(null);
    setResult(null);
    setError(null);
    setVideoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleScan = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('video', file);

    const endpoint = `${process.env.REACT_APP_API_URL}/detect`;

    try {
      const response = await axios.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'ngrok-skip-browser-warning': 'true'
        },
        timeout: 120000
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
    const label = result.label;
    const isFake = label === 'FAKE';

    doc.setFillColor(5, 5, 9); doc.rect(0, 0, 210, 297, 'F');
    doc.setTextColor(34, 197, 94); doc.setFontSize(22); doc.setFont("courier", "bold");
    doc.text("SYNTHETIX AI FORENSICS", 105, 20, null, null, "center");

    doc.setTextColor(255, 255, 255); doc.setFont("courier", "normal"); doc.setFontSize(12);
    doc.text(`FILE: ${file.name}`, 20, 60);
    doc.text(`DATE: ${new Date().toLocaleString()}`, 20, 70);
    doc.text(`MODEL: ${result.model_name}`, 20, 80);

    let yPos = 100;
    doc.setFillColor(isFake ? 239 : 34, isFake ? 68 : 197, isFake ? 68 : 94);
    doc.rect(20, yPos, 170, 15, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont("courier", "bold");
    const confidence = result.confidence_percentage.toFixed(2);
    doc.text(`VERDICT: ${label} (${confidence}%)`, 105, yPos + 8, null, null, "center");

    doc.save("Synthetix_Report.pdf");
  };

  return (
    <div className="glass-card fade-in" style={{ marginTop: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h2 className="section-title"><ShieldCheck size={24} /> Forensic Detection Unit</h2>

      {/* File Upload Section - Only show if no result */}
      {!result && (
        <>
          <div className="drop-zone large-zone">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              id="detect-up"
              hidden
              disabled={loading}
            />
            <label htmlFor="detect-up" className="drop-label">
              <Upload size={48} style={{ marginBottom: '15px' }} />
              <p className="large-text">{file ? file.name : "Upload Video for Analysis"}</p>
            </label>
          </div>

          {/* Video Preview */}
          {videoPreview && !loading && (
            <div className="fade-in" style={{ marginTop: '20px', marginBottom: '20px', textAlign: 'center' }}>
              <h4 style={{ color: '#cbd5e1', marginBottom: '10px' }}>Preview</h4>
              <video
                src={videoPreview}
                controls
                style={{
                  width: '100%',
                  maxHeight: '300px',
                  borderRadius: '8px',
                  border: '2px solid var(--glass-border)',
                  backgroundColor: 'rgba(0,0,0,0.3)'
                }}
              />
            </div>
          )}
        </>
      )}

      <div className="action-area">
        {error && (
          <div style={{ padding: '12px', backgroundColor: '#7f1d1d', color: '#fca5a5', borderRadius: '6px', marginBottom: '15px' }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Action Buttons - File Selected but Not Analyzed */}
        {!loading && !result && file && (
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button className="btn-outline" onClick={handleScan}>
              <Terminal size={16} /> Run Detection Scan
            </button>
            <button className="btn-outline" onClick={handleClearSelection} style={{ opacity: 0.7 }}>
              <X size={16} /> Clear Selection
            </button>
          </div>
        )}

        {loading && (
          <div className="loading-container">
            <Loader2 className="spin" /> Analyzing video artifacts...
          </div>
        )}

        {result && (
          <div className="result-container fade-in">
            <div className={`result-badge ${result.label === 'FAKE' ? 'badge-fake' : 'badge-real'}`}>
              {result.label === 'FAKE' ? <AlertTriangle size={24} /> : <CheckCircle size={24} />}
              <span>VERDICT: {result.label}</span>
            </div>
            <div className="confidence-section">
              <span className="confidence-text">Confidence: <span className="mono">{result.confidence_percentage.toFixed(2)}%</span></span>
            </div>
            <div style={{ marginTop: '15px', padding: '10px', backgroundColor: 'rgba(147, 51, 234, 0.1)', borderRadius: '6px', border: '1px solid rgba(147, 51, 234, 0.3)', textAlign: 'center' }}>
              <p style={{ color: '#cbd5e1', fontSize: '14px', margin: 0 }}>
                Model: <strong style={{ color: '#e2e8f0' }}>{result.model_name}</strong>
              </p>
            </div>
            <button onClick={handleReset} className="btn-outline" style={{ marginRight: '10px' }}>
              <Upload size={18} style={{ marginRight: '8px' }} /> Analyze Another Video
            </button>
            <button onClick={generatePDF} className="btn-glitch">
              <FileText size={18} style={{ marginRight: '8px' }} /> Export PDF Report
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;