import React, { useState, useEffect } from 'react';
import { Shield, Zap, Send, Ghost, Layout, Terminal, Activity, Globe, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { PrankList } from './components/PrankList';
import { LanguageSelector } from './components/LanguageSelector';
import * as api from './services/api';

function App() {
  const [did, setDid] = useState('');
  const [uid, setUid] = useState('');
  const [baseCountry, setBaseCountry] = useState('fi');
  const [languages, setLanguages] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [pranks, setPranks] = useState([]);
  const [selectedPrank, setSelectedPrank] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('Initializing Ghost Protocol...');
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const MotionDiv = motion.div;

  useEffect(() => {
    const initialize = async () => {
      let currentDid = localStorage.getItem('did');
      if (!currentDid) {
        currentDid = api.generateId();
        localStorage.setItem('did', currentDid);
      }
      setDid(currentDid);

      try {
        const storedBaseCountry = (localStorage.getItem('baseCountry') || 'fi').toLowerCase();
        setBaseCountry(storedBaseCountry);

        setStatus('Warping to Helsinki...');
        const createResponse = await api.createAccount(currentDid, storedBaseCountry);
        const createdUid = api.resolveUid(createResponse, localStorage.getItem('uid'));
        if (!createdUid) {
          throw new Error('Unable to resolve UID from create account response.');
        }

        setUid(createdUid);
        localStorage.setItem('uid', createdUid);
        localStorage.setItem('baseCountry', storedBaseCountry);

        const identityResponse = await api.syncIdentity(currentDid, createdUid);
        const syncedUid = api.resolveUid(identityResponse, createdUid);
        const activeUid = syncedUid || createdUid;
        if (activeUid !== createdUid) {
          setUid(activeUid);
          localStorage.setItem('uid', activeUid);
        }
        
        const langList = await api.getDialplanList(currentDid);
        setLanguages(langList);

        const initialLanguage = langList.find((lang) => lang._id === 'fi')?._id || langList[0]?._id;
        if (!initialLanguage) {
          throw new Error('No languages returned from API.');
        }

        setSelectedLanguage(initialLanguage);
        
        setStatus(`Fetching ${initialLanguage.toUpperCase()} Protocols...`);
        const prankData = await api.getPranks(storedBaseCountry, activeUid, initialLanguage);
        setPranks(prankData);
        
        setStatus('System Online');
        setIsReady(true);
      } catch (error) {
        console.error("Init Error:", error);
        setStatus('Network Breach');
      }
    };
    initialize();
  }, []);

  const handleLanguageChange = async (langId) => {
    if (!langId || !uid || !baseCountry) {
      return;
    }

    setSelectedLanguage(langId);
    setPranks([]);
    setSelectedPrank(null);
    setIsLoading(true);
    setStatus(`Switching to ${langId.toUpperCase()} Frequency...`);
    
    try {
      const prankData = await api.getPranks(baseCountry, uid, langId);
      
      setPranks(prankData);
      setStatus(`${prankData.length} Protocols Loaded`);
    } catch (error) {
      console.error("Language Switch Error:", error);
      setStatus('Syncing Failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLaunch = async () => {
    if (!selectedPrank || !name || !phone) return;
    
    setIsLoading(true);
    setStatus('Launching Ghost Task...');
    
    const taskId = api.generateTaskId();
    const ts = new Date().toISOString().replace(/\.\d+Z$/, '').replace('T', ' ');
    
    const payload = {
      _id: taskId,
      c: selectedLanguage,
      dial: selectedPrank._id,
      dst: phone,
      f: ts,
      nombre: name,
      real_f: ts,
      titulo: selectedPrank.titulo,
      uid: uid
    };

    try {
      const response = await api.launchPrank(payload);
      if (response.res === 'OK') {
        setStatus('Task Queued Successfully');
      } else {
        setStatus(`Task Denied: ${response.msg || 'Unknown'}`);
      }
    } catch {
      setStatus('Infiltration Failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <Ghost size={32} color="hsl(var(--primary))" />
          <h2>SENTINEL HELSINKI</h2>
        </div>

        <nav className="nav-section">
          <p className="nav-label">Main Console</p>
          <div className="nav-item active">
            <Layout size={20} />
            Launch Terminal
          </div>
          <div className="nav-item">
            <Activity size={20} />
            Live Monitors
          </div>
          <div className="nav-item">
            <Terminal size={20} />
            Command Logs
          </div>
          
          <p className="nav-label">Global Config</p>
          <div className="nav-item">
            <Globe size={20} />
            Dialplan Matrix
          </div>
        </nav>

        <div className="identity-card">
          <p className="id-label">ACTIVE IDENTITY</p>
          <p className="id-value">DID: {did.slice(0, 16)}...</p>
          <p className="id-value" style={{ marginTop: '4px' }}>UID: {uid.slice(0, 16)}...</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="header">
          <div className="header-title">
            <h1>Ghost Protocol Interface</h1>
          </div>
          <div className="status-badge">
            <div className="status-dot"></div>
            {status.toUpperCase()}
          </div>
        </header>

        <div className="view-container">
          <div className="dashboard-grid">
            {/* Execution Panel */}
            <section className="execution-panel">
              <h3><Terminal size={18} /> Launch Terminal</h3>
              
              <div className="input-container">
                <label>Victim Signature</label>
                <input 
                  type="text" 
                  placeholder="Intercept Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="input-container">
                <label>Target Frequency (Phone)</label>
                <input 
                  type="tel" 
                  placeholder="+XXXXXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <LanguageSelector 
                languages={languages}
                selectedLanguage={selectedLanguage}
                onSelect={handleLanguageChange}
              />

              {selectedPrank && (
                <MotionDiv
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="input-container"
                  style={{ background: 'hsl(var(--bg-sidebar))', padding: '12px', borderRadius: '12px', border: '1px solid hsl(var(--primary) / 0.3)' }}
                >
                  <label style={{ color: 'hsl(var(--primary))', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Shield size={14} /> Selected Scenario
                  </label>
                  <p style={{ fontSize: '0.9rem', fontWeight: '600' }}>{selectedPrank.titulo}</p>
                </MotionDiv>
              )}

              <button 
                className="launch-button"
                onClick={handleLaunch}
                disabled={!isReady || !selectedPrank || !name || !phone || isLoading}
              >
                {isLoading ? (
                  <>
                    <Zap className="animate-pulse" size={20} /> TRANSMITTING...
                  </>
                ) : (
                  <>
                    <Send size={20} /> EXECUTE GHOST CALL
                  </>
                )}
              </button>

              <div style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: 'hsl(var(--text-ghost))', display: 'flex', gap: '8px' }}>
                <Info size={14} /> 
                <p>Task will be queued globally. Connection status is real-time.</p>
              </div>
            </section>

            {/* Selection Grid */}
            <section>
              <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'hsl(var(--text-dim))' }}>
                  AVAILABLE SCENARIOS {pranks.length > 0 && `(${pranks.length})`}
                </h3>
              </div>
              <PrankList 
                pranks={pranks}
                selectedPrankId={selectedPrank?._id}
                onSelect={setSelectedPrank}
              />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
