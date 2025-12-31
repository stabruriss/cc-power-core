import { useState, useEffect, useRef } from 'react';
import { Trash2, Power, X, Loader2, ChevronRight, Terminal as TerminalIcon, Crown, Medal, Zap, Clock, Calendar, CalendarDays } from 'lucide-react';
import { EnvState, GroupType, ENV_DEFS } from './types';
import { DEFAULT_VALUES, OPENROUTER_PRESETS, AVAILABLE_MODELS } from './constants';
import { fetchKeyInfo, KeyInfo, fetchModels } from './lib/openrouter';
import { Screw } from './components/Hardware/Screw';
import { MonitorRow } from './components/Screen/MonitorRow';
import { KeyAsset } from './components/KeyAsset';
import { IgnitionRing } from './components/IgnitionRing';
import { CostKnob } from './components/CostKnob';

import { EnvVarDefinition } from './types';

// New Helper Component for Ranked Slots
interface ModelSlotProps {
  rank: 'KING' | 'QUEEN' | 'JACK';
  def: EnvVarDefinition;
  value: string;
  icon: React.ReactNode;
  onEdit: () => void;
  isEditing: boolean;
  editValue: string;
  onEditValueChange: (val: string) => void;
  onSave: (val?: string) => void;
  onCancel: () => void;
  options: string[];
  status?: 'pending' | 'online' | 'offline' | 'idle';
}

const ModelSlot: React.FC<ModelSlotProps> = ({ rank, def, value, icon, onEdit, isEditing, editValue, onEditValueChange, onSave, onCancel, options, status = 'idle' }) => {
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center justify-between mb-1 pl-1">
        <div className="flex items-center gap-2">
          {icon}
          <span className={`text-[8px] font-bold tracking-widest ${rank === 'KING' ? 'text-yellow-500' : rank === 'QUEEN' ? 'text-zinc-400' : 'text-amber-600'}`}>
            {rank} MODEL
          </span>
        </div>
        {/* Status Light */}
        <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 
            ${status === 'online' ? 'bg-green-500 shadow-glow-green' :
            status === 'offline' ? 'bg-red-500 shadow-glow-red' :
              status === 'pending' ? 'bg-amber-500 animate-pulse' : 'bg-zinc-800 border border-zinc-700'}`}>
        </div>
      </div>

      {/* Re-use MonitorRow logic but customized or wrapped */}
      {isEditing && (
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={onCancel} // Close on click outside
        />
      )}
      <div className={`relative ${isEditing ? 'z-[100]' : 'z-10'}`}>
        <MonitorRow
          def={def}
          value={value}
          onEdit={onEdit}
          isEditing={isEditing}
          editValue={editValue}
          onEditValueChange={onEditValueChange}
          onSave={onSave}
          onCancel={onCancel}
          options={options}
        />
      </div>
    </div>
  );
};






export default function App() {
  const [envState, setEnvState] = useState<EnvState>(DEFAULT_VALUES);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>('');
  const [isBooting, setIsBooting] = useState(true);
  const [isVibrating, setIsVibrating] = useState(false);
  const [keyInfo, setKeyInfo] = useState<KeyInfo | null>(null);

  // Fetch and Filter Models
  const [filteredModelIds, setFilteredModelIds] = useState<string[]>([]);
  const [modelStatuses, setModelStatuses] = useState<{ [key: string]: 'pending' | 'online' | 'offline' | 'idle' }>({});

  // State for actual file config values (for Config Status column)
  interface FileConfigValues {
    found: boolean;
    baseUrl?: string;
    authToken?: string; // 'ACTIVATED' or ''
    opusModel?: string;
    sonnetModel?: string;
    haikuModel?: string;
  }
  const [fileConfigValues, setFileConfigValues] = useState<FileConfigValues>({ found: false });

  // Update Detection State
  interface UpdateInfo {
    hasUpdate: boolean;
    currentVersion?: string;
    latestVersion?: string;
    releaseUrl?: string;
  }
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);

  // Neon hint auto-hide state - only show when config file is modified
  const [showNeonHint, setShowNeonHint] = useState(false);
  const [neonHintKey, setNeonHintKey] = useState(0); // Key to force re-render and reset animation
  const neonHintTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check for updates on mount
  useEffect(() => {
    const checkUpdates = async () => {
      if (!window.electronAPI?.checkForUpdates) return;
      try {
        const result = await window.electronAPI.checkForUpdates();
        if (result.hasUpdate) {
          setUpdateInfo(result);
          setShowUpdateBanner(true);
        }
      } catch (e) {
        console.error('Update check failed:', e);
      }
    };
    // Delay check slightly to not block initial render
    const timer = setTimeout(checkUpdates, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const getModels = async () => {
      // Allow fetching models even without a key (Public Endpoint)
      // if (!keyToUse?.startsWith('sk-or-')) { ... } REMOVED CHECK

      try {
        const models = await fetchModels();
        // Filter: Tool use AND Reasoning AND Image
        const qualified = models.filter(m => {
          const hasTools = m.supported_parameters?.includes('tools');
          const hasImage = m.architecture?.input_modalities?.includes('image');
          const hasReasoning = m.supported_parameters?.includes('reasoning') || m.supported_parameters?.includes('include_reasoning');

          // Strict Filter as requested per OpenRouter docs
          return hasTools && hasImage && hasReasoning;
        });

        if (qualified.length > 0) {
          // Sort by context length descending? or specific defaults?
          // Let's just map IDs.
          const ids = qualified.map(m => m.id).sort();
          setFilteredModelIds(ids);
          // If search is empty, we show all.
        } else {
          setFilteredModelIds(AVAILABLE_MODELS);
        }
      } catch (e) {
        console.error(e);
        setFilteredModelIds(AVAILABLE_MODELS);
      }
    };
    getModels();
  }, [envState['ANTHROPIC_API_KEY']]);
  const initialUsageRef = useRef<number | null>(null);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);
  const [refreshTimer, setRefreshTimer] = useState(30); // 30s countdown
  const [configPath, setConfigPath] = useState<string>('');

  // Terminal State
  const [terminalLogs, setTerminalLogs] = useState<{ cmd: string, out: string, id: number }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const logIdCounter = useRef(0); // Unique ID counter for logs

  // OpenRouter Ignition State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [ignitionInput, setIgnitionInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Derived State for Ignition
  const hasOrKey = !!envState['ANTHROPIC_AUTH_TOKEN'] && envState['ANTHROPIC_AUTH_TOKEN'].startsWith('sk-or-');
  const isOrUrl = envState['ANTHROPIC_BASE_URL']?.includes('openrouter');

  let ignitionState: 'NO_KEY' | 'OFF' | 'ON' = 'NO_KEY';
  if (hasOrKey) {
    ignitionState = isOrUrl ? 'ON' : 'OFF';
  }

  // Rotation: NO_KEY (-45deg), OFF (0deg), ON (45deg)
  const rotation = ignitionState === 'NO_KEY' ? -45 : ignitionState === 'OFF' ? 0 : 45;

  // Helper function to trigger neon hint - only called when config file is actually modified
  const triggerNeonHint = () => {
    // Clear existing timer first
    if (neonHintTimerRef.current) {
      clearTimeout(neonHintTimerRef.current);
      neonHintTimerRef.current = null;
    }

    // Increment key to force re-render and reset all animations
    setNeonHintKey(prev => prev + 1);
    // Show hint
    setShowNeonHint(true);

    // Auto-hide after 10 seconds (animation duration)
    neonHintTimerRef.current = setTimeout(() => {
      setShowNeonHint(false);
    }, 10000);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (neonHintTimerRef.current) {
        clearTimeout(neonHintTimerRef.current);
        neonHintTimerRef.current = null;
      }
    };
  }, []);

  const syncToBackend = async (newState: EnvState, isActive: boolean, shouldShowHint: boolean = false) => {
    // Synchronize with Electron Backend
    // Use ANTHROPIC_AUTH_TOKEN as the "apiKey" for backend storage/config writing
    const apiKey = newState['ANTHROPIC_AUTH_TOKEN'] || '';
    const model = newState['ANTHROPIC_DEFAULT_SONNET_MODEL'] || ''; // Default "primary"
    const kingModel = newState['ANTHROPIC_DEFAULT_OPUS_MODEL'] || '';
    const queenModel = newState['ANTHROPIC_DEFAULT_SONNET_MODEL'] || '';
    const jackModel = newState['ANTHROPIC_DEFAULT_HAIKU_MODEL'] || '';

    if (window.electronAPI) {
      try {
        const res = await window.electronAPI.saveSettings({
          apiKey,
          model,
          kingModel,
          queenModel,
          jackModel,
          active: isActive
        });
        if (res.success) {
          console.log('Backend synced:', { apiKey, model, active: isActive });
          // Trigger neon hint only when config file was actually modified
          if (shouldShowHint) {
            triggerNeonHint();
          }
        } else {
          console.error('Backend sync failed:', res.error);
          addLog('error', `CONFIG SAVE ERROR: ${res.error}`);
        }
      } catch (e: any) {
        console.error('Backend sync exception:', e);
        addLog('error', `SYSTEM IO EXCEPTION: ${e.message}`);
      }
    } else {
      console.warn('Web Mode: Settings not saved to backend.');
    }
  };

  // Load settings from backend on mount
  useEffect(() => {
    const loadSettings = async () => {
      if (!window.electronAPI) {
        addLog('warn', 'WEB MODE DETECTED. NO BACKEND CONNECTION.');
        return;
      }
      try {
        const settings = await window.electronAPI.getSettings();

        // 1. Initial State from Store
        setEnvState(prev => ({
          ...prev,
          ANTHROPIC_AUTH_TOKEN: settings.apiKey || '',
          ANTHROPIC_API_KEY: '', // Explicitly empty for UI display consistency
          ANTHROPIC_DEFAULT_OPUS_MODEL: settings.kingModel || DEFAULT_VALUES.ANTHROPIC_DEFAULT_OPUS_MODEL,
          ANTHROPIC_DEFAULT_SONNET_MODEL: settings.queenModel || DEFAULT_VALUES.ANTHROPIC_DEFAULT_SONNET_MODEL,
          ANTHROPIC_DEFAULT_HAIKU_MODEL: settings.jackModel || DEFAULT_VALUES.ANTHROPIC_DEFAULT_HAIKU_MODEL,
          ANTHROPIC_BASE_URL: (settings.apiKey && settings.apiKey.startsWith('sk-or-'))
            ? OPENROUTER_PRESETS.ANTHROPIC_BASE_URL
            : DEFAULT_VALUES.ANTHROPIC_BASE_URL
        }));


        // 2. Override based on Actual Shell Config (Reality Check)
        const isShellActive = await window.electronAPI.getShellStatus();

        if (!isShellActive) {
          // STANDBY: Config is clean
          setEnvState(prev => ({
            ...prev,
            ANTHROPIC_BASE_URL: DEFAULT_VALUES.ANTHROPIC_BASE_URL
          }));
        } else {
          // ACTIVE: Config has CCPowerCore block
          setEnvState(prev => ({
            ...prev,
            ANTHROPIC_BASE_URL: OPENROUTER_PRESETS.ANTHROPIC_BASE_URL
          }));
        }

        if (settings.configPath) setConfigPath(settings.configPath);

        // 3. Load actual file values for Config Status column
        const fileVals = await window.electronAPI.getShellConfigValues();
        setFileConfigValues(fileVals);

        addLog('init', `CONFIG LOADED. STATUS: ${isShellActive ? 'ACTIVE' : 'STANDBY'}`);
      } catch (e) {
        console.error('Failed to load settings:', e);
        addLog('error', 'CONFIG LOAD FAILED.');
      }
    };
    loadSettings();
  }, []);

  // -- Logging Helper (PREPEND to keep newest at top) --
  const addLog = (command: string, output: string) => {
    logIdCounter.current += 1;
    setTerminalLogs(prev => [
      { cmd: command, out: output, id: logIdCounter.current },
      ...prev.slice(0, 19) // Keep first 20 entries (newest first)
    ]);
  };

  // Auto-scroll terminal to TOP (newest messages are at top now)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [terminalLogs]);

  // Simulate boot sequence (single consolidated log)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsBooting(false);
      // Single boot message to avoid timing issues
      addLog('sys_boot', 'SYSTEM READY.');
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const [historyOpen, setHistoryOpen] = useState(false);


  // Network Test State
  const [isTestRunning, setIsTestRunning] = useState(false);

  // Restore runAllTests for Model Checking
  const runAllTests = async () => {
    if (isTestRunning) return;
    setIsTestRunning(true);
    const keys = ['ANTHROPIC_DEFAULT_OPUS_MODEL', 'ANTHROPIC_DEFAULT_SONNET_MODEL', 'ANTHROPIC_DEFAULT_HAIKU_MODEL'];
    const apiKey = envState['ANTHROPIC_AUTH_TOKEN']; // Fixed: Use AUTH_TOKEN

    // Set all to pending
    const pending: any = {};
    keys.forEach(k => pending[k] = 'pending');
    setModelStatuses(prev => ({ ...prev, ...pending }));

    for (const k of keys) {
      const model = envState[k];
      if (!model || !apiKey) {
        setModelStatuses(prev => ({ ...prev, [k]: 'idle' }));
        continue;
      }

      try {
        // Ping chat completions with max_tokens=1 to verify model access + key
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: 'Hi' }],
            max_tokens: 16
          })
        });
        setModelStatuses(prev => ({ ...prev, [k]: res.ok ? 'online' : 'offline' }));
      } catch (e) {
        setModelStatuses(prev => ({ ...prev, [k]: 'offline' }));
      }
    }
    setIsTestRunning(false);
  };





  const handleToggleIgnition = () => {
    const king = envState.ANTHROPIC_DEFAULT_OPUS_MODEL;
    const queen = envState.ANTHROPIC_DEFAULT_SONNET_MODEL;
    const jack = envState.ANTHROPIC_DEFAULT_HAIKU_MODEL;

    if (ignitionState === 'NO_KEY') {
      addLog('ignition_start', 'ERROR: NO KEY DETECTED.');
      return;
    }

    // Activation Gate: Require all 3 models
    if (ignitionState === 'OFF' && (!king || !queen || !jack)) {
      addLog('ignition_fail', 'ALL CORE MODELS MUST BE SET.');
      setIsVibrating(true);
      setTimeout(() => setIsVibrating(false), 200);
      return;
    }

    const newUrl = ignitionState === 'OFF'
      ? OPENROUTER_PRESETS.ANTHROPIC_BASE_URL
      : DEFAULT_VALUES.ANTHROPIC_BASE_URL;

    const newState = { ...envState, ANTHROPIC_BASE_URL: newUrl };
    setEnvState(newState);

    if (ignitionState === 'OFF') {
      // Turning ON
      syncToBackend(newState, true, true); // Active = true, show hint
      setIsVibrating(true);
      setTimeout(() => setIsVibrating(false), 400); // 400ms vibration

      // Fetch key info if it's an OpenRouter key
      if (hasOrKey) {
        fetchKeyInfo(envState['ANTHROPIC_AUTH_TOKEN']).then(info => {
          if (info) {
            if (initialUsageRef.current === null) initialUsageRef.current = info.usage;
            setKeyInfo(info);
            const remaining = info.limit_remaining !== null ? `$${info.limit_remaining.toFixed(2)}` : 'UNLIMITED';
            addLog('sys_net --key-info', `REMAINING: ${remaining} | USAGE: $${info.usage.toFixed(2)}`);
          }
        });

        // Start polling
        const interval = setInterval(() => {
          fetchKeyInfo(envState['ANTHROPIC_AUTH_TOKEN']).then(info => {
            if (info) setKeyInfo(info);
          });
        }, 10000);
        setPollInterval(interval);
      }

      addLog('ignition --engage', 'OPENROUTER PROTOCOL ACTIVE.');
    } else {
      addLog('ignition --disengage', 'REVERTING TO STANDARD PROTOCOL.');
      if (pollInterval) {
        clearInterval(pollInterval);
        setPollInterval(null);
      }
      // Reset session cost when disengaging (new session starts on next engage)
      initialUsageRef.current = null;
      syncToBackend(newState, false, true); // Active = false (Remove from Config), show hint
    }

    // Refresh Config Status from file after toggle
    if (window.electronAPI?.getShellConfigValues) {
      // Small delay to ensure file is written
      setTimeout(async () => {
        const fileVals = await window.electronAPI.getShellConfigValues();
        setFileConfigValues(fileVals);
      }, 200);
    }
  };

  // Also fetch on mount/load if key is already there
  // Centralized Usage Polling Logic (Standby + ON)
  useEffect(() => {
    // We poll if we have an OpenRouter Key, regardless of Ignition State
    if (!hasOrKey) {
      setKeyInfo(null);
      return;
    }

    const fetchUsage = async () => {
      const apiKey = envState['ANTHROPIC_AUTH_TOKEN'];
      if (!apiKey) return;
      const info = await fetchKeyInfo(apiKey);
      if (info) {
        setKeyInfo(info);
        if (initialUsageRef.current === null) initialUsageRef.current = info.usage;
        setRefreshTimer(30); // Reset timer on fetch
      }
    };

    fetchUsage(); // Initial fetch
    const interval = setInterval(fetchUsage, 30000); // 30s polling

    // Countdown Timer logic
    const timerInterval = setInterval(() => {
      setRefreshTimer(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(timerInterval);
    };
  }, [hasOrKey, envState['ANTHROPIC_AUTH_TOKEN']]); // Dep on Key existence

  const handleSaveKey = async () => {
    if (!ignitionInput.trim()) return;

    // --- DIAGNOSTIC MODE ---
    if (ignitionInput.trim() === 'sys_diag') {
      addLog('sys_diag', 'RUNNING SYSTEM DIAGNOSTICS...');
      if (window.electronAPI) {
        try {
          const settings = await window.electronAPI.getSettings();
          addLog('diag_ipc', 'IPC CONNECTION: ESTABLISHED');
          addLog('diag_config', `DETECTED CONFIG: ${settings.configPath}`);
          addLog('diag_store', `STORED KEY: ${settings.apiKey ? 'PRESENT' : 'MISSING'}`);
        } catch (e: any) {
          addLog('diag_error', `IPC FAILURE: ${e.message}`);
        }
      } else {
        addLog('diag_warn', 'WEB MODE: NO ELECTRON BACKEND.');
      }
      setIgnitionInput('');
      return;
    }

    setIsVerifying(true);
    addLog(`verify_key "${ignitionInput.substring(0, 8)}..."`, 'VERIFYING SIGNATURE...');

    try {
      // Real Verification against OpenRouter
      // Use v1 endpoint for verification as standard
      const response = await fetch("https://openrouter.ai/api/v1/auth/key", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${ignitionInput}`,
          "Content-Type": "application/json"
        }
      });

      if (response.status === 200) {
        const data = await response.json();
        // OpenRouter returns { data: { label: "..." , usage: ... } } on success for this endpoint
        // Or we can just rely on 200 OK.

        setIsVerifying(false);
        const newState = {
          ...envState,
          ANTHROPIC_AUTH_TOKEN: ignitionInput,
          ANTHROPIC_API_KEY: '',
          ANTHROPIC_BASE_URL: DEFAULT_VALUES.ANTHROPIC_BASE_URL
        };
        setEnvState(newState);
        addLog('key_install', 'KEY ACCEPTED. IGNITION SEQUENCE STARTED.');
        if (data?.data?.label) {
          addLog('key_info', `KEY LABEL: ${data.data.label}`);
        }
        setIgnitionInput('');
        setDrawerOpen(false);

        setDrawerOpen(false);

        // Installing Key means turning ON usually?
        // User just saved key. We should probably just sync it but keep current state?
        // Actually handleSaveKey starts Ignition usually?
        // Let's assume Ignition stays whatever it is, but usually we start OFF.
        // Wait, handleSaveKey sets ANTHROPIC_API_KEY.
        // The user has to turn the key to ON manually?
        // If we just syncToBackend(newState, false), it saves key but doesn't write to config.
        // That is safer.
        syncToBackend(newState, ignitionState === 'ON');

        // Refresh file-based config status after saving
        if (window.electronAPI?.getShellConfigValues) {
          const fileVals = await window.electronAPI.getShellConfigValues();
          setFileConfigValues(fileVals);
        }
      } else {
        // Verification Failed
        setIsVerifying(false);
        addLog('verify_fail', `ERROR: INVALID KEY (HTTP ${response.status}). ACCESS DENIED.`);
      }
    } catch (error) {
      setIsVerifying(false);
      addLog('verify_error', `CONNECTION ERROR: ${error instanceof Error ? error.message : 'Unknown Network Error'}`);
    }
  };

  const handleRemoveKey = () => {
    const newState = {
      ...envState,
      ANTHROPIC_AUTH_TOKEN: '',
      ANTHROPIC_API_KEY: '',
      ANTHROPIC_BASE_URL: DEFAULT_VALUES.ANTHROPIC_BASE_URL // Auto-turn OFF logic
    };
    setEnvState(newState);
    addLog('eject_core', 'KEY REMOVED. SYSTEM RESET.');
    setDrawerOpen(false); // Close drawer on eject too

    // Clear CostKnob data and session cost
    setKeyInfo(null);
    initialUsageRef.current = null;

    // Clear polling interval if active
    if (pollInterval) {
      clearInterval(pollInterval);
      setPollInterval(null);
    }

    syncToBackend(newState, false);

    // Refresh Config Status from file after eject
    if (window.electronAPI?.getShellConfigValues) {
      setTimeout(async () => {
        const fileVals = await window.electronAPI.getShellConfigValues();
        setFileConfigValues(fileVals);
      }, 200);
    }
  };



  const modelVars = ENV_DEFS.filter(d => d.group === GroupType.MODELS);

  // --- Main Edit Logic ---
  const startEditing = (key: string) => {
    setEditingKey(key);
    setTempValue(envState[key] || '');
  };

  const saveEdit = (overrideValue?: string) => {
    if (editingKey) {
      const finalValue = overrideValue !== undefined ? overrideValue : tempValue;
      const newState = { ...envState, [editingKey]: finalValue };
      setEnvState(newState);
      addLog(`export ${editingKey}="..."`, `VALUE UPDATED (len: ${finalValue.length}).`);
      setEditingKey(null);

      syncToBackend(newState, ignitionState === 'ON');
    }
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setTempValue('');
  };


  return (
    // Chassis - Full Window Mode
    <div className="relative w-full h-screen bg-te-grey flex flex-col 
        border-t border-l border-white/40
        selection:bg-te-orange selection:text-white
      ">

      {/* Top Mechanical Ridge - DRAGGABLE REGION */}
      <div className="h-8 bg-te-grey border-b border-black/10 flex justify-between px-4 items-center shadow-sm relative z-20 app-drag-region">
        {/* Placeholder for Traffic Lights (Approx 70px) */}
        <div className="w-[70px] h-full"></div>

        <div className="text-[7px] text-zinc-500 font-mono tracking-widest font-bold uppercase">CC Powercore Swap // v0.0.2</div>
      </div>

      {/* Update Available Banner */}
      {showUpdateBanner && updateInfo && (
        <div className="bg-te-orange/90 text-white px-4 py-2 flex items-center justify-between text-xs font-mono relative z-30 shadow-md">
          <div className="flex items-center gap-3">
            <span className="font-bold uppercase tracking-wider">Update Available</span>
            <span className="text-white/80">v{updateInfo.currentVersion} → v{updateInfo.latestVersion}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                if (updateInfo.releaseUrl && window.electronAPI?.openExternal) {
                  await window.electronAPI.openExternal(updateInfo.releaseUrl);
                }
              }}
              className="bg-white text-te-orange px-3 py-1 text-[10px] font-bold uppercase tracking-wide hover:bg-zinc-100 transition-colors rounded-[2px] active:translate-y-[1px]"
            >
              Download
            </button>
            <button
              onClick={() => setShowUpdateBanner(false)}
              className="text-white/70 hover:text-white transition-colors p-1"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Screws */}
      <Screw className="absolute top-9 left-5 z-20 opacity-70" />
      <Screw className="absolute top-9 right-5 z-20 opacity-70" />
      <Screw className="absolute bottom-2 left-5 z-20 opacity-70" />
      <Screw className="absolute bottom-2 right-5 z-20 opacity-70" />

      {/* Header Branding */}
      <div className="flex justify-between items-center px-14 pt-6 pb-4 select-none">
        <div className="flex items-center gap-6 w-full">
          <div className="flex flex-col shrink-0">
            <span className="font-bold text-zinc-400 text-[9px] tracking-[0.2em] uppercase mb-0.5">Claude Code</span>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-te-black text-lg tracking-tighter uppercase leading-none">
                <span className="text-te-orange">Power Core</span> Swap
              </span>
            </div>
          </div>
          {/* Divider */}
          <div className="h-6 w-[1px] bg-zinc-400/50"></div>
          {/* Inkjet Effect Tagline */}
          <span className="text-[11px] text-[#404040] font-mono font-bold tracking-tight opacity-90 leading-tight blur-[0.3px] mix-blend-multiply">
            Use OpenRouter to Power your Claude Code
          </span>
        </div>
      </div>

      {/* CONTROL PAD (Unified Layout) */}
      <div className={`bg-retro-panel w-full px-4 py-6 border-y border-white/40 relative z-[100] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] flex items-center justify-center gap-4 md:gap-16 lg:gap-32 transition-all duration-300 ${ignitionState === 'ON' ? 'tech-glow-active' : ''}`}>

        {/* 1. Ignition Slot */}
        <div className="relative w-24 h-24 flex-shrink-0">
          {/* SVG RING - Replaces absolute HTML labels for stability */}
          <IgnitionRing state={ignitionState} />

          {/* Ignition Switch Graphic */}
          <div className="absolute inset-0 w-full h-full rounded-full bg-gradient-to-br from-[#d4d4d8] to-[#71717a] shadow-[-4px_-4px_8px_rgba(255,255,255,0.5),4px_4px_10px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(0,0,0,0.1)] flex items-center justify-center p-1 z-0 scale-[0.85]">
            {/* Rotating Inner Core */}
            <div
              className={`w-16 h-16 rounded-full bg-gradient-to-br from-[#e4e4e7] to-[#a1a1aa] shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1),inset_-1px_-1px_2px_rgba(255,255,255,0.5),0_2px_4px_rgba(0,0,0,0.2)] flex items-center justify-center transition-transform duration-300 cubic-bezier(0.34, 1.56, 0.64, 1) border border-zinc-400 ${isVibrating ? 'animate-viorate' : ''}`}
              style={{ transform: `rotate(${rotation}deg)` }}
            >
              {ignitionState === 'NO_KEY' ? (
                // EMPTY SLOT VISUAL
                <div
                  onClick={() => setDrawerOpen(true)}
                  className="w-2.5 h-10 bg-[#27272a] rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.9),0_1px_0_rgba(255,255,255,0.2)] cursor-pointer hover:bg-zinc-700 transition-colors flex items-center justify-center group"
                >
                  <div className="w-[1px] h-8 bg-zinc-800 group-hover:bg-zinc-600 transition-colors"></div>
                </div>
              ) : (
                // PHYSICAL KEY VISUAL
                <div className="relative z-10 flex flex-col items-center justify-center">
                  <KeyAsset onClick={handleToggleIgnition} isOn={ignitionState === 'ON'} className={isVibrating ? 'animate-viorate' : ''} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. Status Drawer (Center) */}
        <div className={`w-[260px] relative h-16 shrink-0 transition-all duration-300 ${isVibrating ? 'animate-viorate' : ''}`}>
          <div
            onClick={() => setDrawerOpen(!drawerOpen)}
            className={`
                      absolute inset-0 border-t border-b border-x shadow-hard-sm rounded-[2px] p-3 flex items-center justify-between cursor-pointer transition-all duration-300 z-20 active:translate-y-[1px]
                      ${drawerOpen ? '-translate-y-16 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}
                      ${ignitionState === 'ON'
                ? 'bg-[#1a1c1a] border-green-500/30 border-t-green-500/50 shadow-[0_0_15px_rgba(74,222,128,0.1)]'
                : 'bg-[#d4d4d8] border-white/40 border-b-black/20 border-x-black/10 hover:bg-[#e4e4e7]'}
                    `}
          >
            <div className="flex items-center gap-4">
              <div className={`w-3 h-3 rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)] border border-white/20 transition-all duration-500 relative
                          ${ignitionState === 'NO_KEY' ? 'bg-red-500/20' : ''}
                          ${ignitionState === 'OFF' ? 'bg-yellow-400/20' : ''}
                          ${ignitionState === 'ON' ? 'bg-black' : ''}
                       `}>
                <div className={`absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 ${ignitionState !== 'NO_KEY' && ignitionState !== 'OFF' && ignitionState !== 'ON' ? '' : 'opacity-100'}
                              ${ignitionState === 'NO_KEY' ? 'bg-red-500 shadow-glow-red' : ''}
                              ${ignitionState === 'OFF' ? 'bg-yellow-400 shadow-glow-yellow' : ''}
                              ${ignitionState === 'ON' ? 'bg-green-500 shadow-glow-green animate-pulse' : ''}
                          `}></div>
              </div>
              <div className="flex flex-col">
                <span className={`text-[12px] font-bold leading-none tracking-wide transition-colors duration-300 ${ignitionState === 'ON' ? 'text-green-400 font-mono tracking-widest' : 'text-zinc-700 font-sans'}`}>
                  {ignitionState === 'NO_KEY' ? 'NO KEY FOUND' : ignitionState === 'OFF' ? 'ROUTER STANDBY' : (keyInfo && initialUsageRef.current !== null) ? (
                    (() => {
                      const cost = keyInfo.usage - initialUsageRef.current;
                      const costStr = cost.toFixed(4);
                      const mainPart = costStr.slice(0, -2);
                      const smallPart = costStr.slice(-2);
                      return <>SESSION COST: ${mainPart}<span className="text-[9px] opacity-70">{smallPart}</span></>;
                    })()
                  ) : 'ROUTER ACTIVE'}
                </span>
                <span className={`text-[8px] font-mono mt-0.5 transition-colors duration-300 ${ignitionState === 'ON' ? 'text-green-500/70 animate-pulse duration-[3000ms]' : 'text-zinc-500'}`}>
                  {ignitionState === 'NO_KEY' ? 'INSERT KEY TO CONFIGURE' : ignitionState === 'OFF' ? 'Turn the key to rout Claude Code to Openrouter' : 'Your Claude Code is Powered by Openrouter Now'}
                </span>
              </div>
            </div>
            <ChevronRight size={14} className={`${ignitionState === 'ON' ? 'text-green-500/50' : 'text-zinc-400'}`} />
            {/* Refresh countdown and progress bar - only show when ON */}
            {ignitionState === 'ON' && (
              <div className="absolute bottom-0 left-0 right-0">
                <div className="absolute bottom-1 right-2 text-[8px] font-mono text-green-500/60">
                  {refreshTimer}s to refresh
                </div>
                <div
                  className="absolute bottom-0 left-0 h-[2px] bg-green-500 transition-all duration-1000 ease-linear"
                  style={{ width: `${(refreshTimer / 30) * 100}%` }}
                />
              </div>
            )}
          </div>

          <div className={`absolute inset-0 bg-[#d4d4d8] rounded-[2px] p-2 flex flex-col justify-center border border-black/10 shadow-inner transition-all duration-300 ${drawerOpen ? 'opacity-100 z-10' : 'opacity-0 -z-10'}`}>
            {ignitionState === 'NO_KEY' ? (
              <div className="flex flex-col gap-1.5 animate-in slide-in-from-bottom-2 duration-300">
                <div className="flex gap-1">
                  <input
                    type="password"
                    value={ignitionInput}
                    onChange={(e) => setIgnitionInput(e.target.value)}
                    placeholder="sk-or-..."
                    className="flex-1 h-6 bg-[#e4e4e7] border border-zinc-500 text-[10px] font-mono px-2 outline-none focus:border-te-orange shadow-inner placeholder-zinc-500 rounded-[1px] text-zinc-800"
                    autoFocus
                  />
                </div>
                <div className="flex gap-1 h-5">
                  <button onClick={handleSaveKey} disabled={isVerifying} className="flex-1 bg-te-black text-white text-[8px] font-bold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1 rounded-[1px] active:translate-y-[1px]">
                    {isVerifying ? <Loader2 size={8} className="animate-spin" /> : 'INSERT'}
                  </button>
                  <button onClick={() => setDrawerOpen(false)} className="w-6 bg-zinc-400 hover:bg-zinc-500 text-white flex items-center justify-center rounded-[1px] active:translate-y-[1px]">
                    <X size={10} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1 animate-in slide-in-from-bottom-2 duration-300">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[8px] font-bold text-zinc-600">KEY ID</span>
                  <span className="text-[8px] font-mono text-te-blue">sk-or-••••••••</span>
                </div>
                <div className="flex gap-1 h-6 mt-1">
                  <button onClick={handleRemoveKey} className="flex-1 bg-red-700 hover:bg-red-600 text-white text-[8px] font-bold flex items-center justify-center gap-1 rounded-[1px] shadow-sm active:translate-y-[1px] transition-colors border-b-2 border-red-900 active:border-b-0">
                    <Trash2 size={8} /> EJECT
                  </button>
                  <button onClick={() => setDrawerOpen(false)} className="w-16 bg-zinc-400 hover:bg-zinc-500 text-white text-[8px] font-bold flex items-center justify-center rounded-[1px] shadow-sm active:translate-y-[1px] transition-colors border-b-2 border-zinc-500 active:border-b-0">
                    CLOSE
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BACKDROP for Drawer (Click Outside to Close) */}
        {historyOpen && (
          <div
            className="fixed inset-0 z-40 bg-transparent"
            onClick={() => setHistoryOpen(false)}
          />
        )}

        {/* RIGHT GROUP: History Button & Advanced Drawer */}
        <div className="relative z-50"> {/* High Z for drawer */}
          {/* BUTTON: Icon Only, Tall to Match Drawer/Ignition */}
          <CostKnob
            currentCost={0}
            isOn={ignitionState === 'ON'}
            limit={keyInfo?.limit ?? null}
            limitRemaining={keyInfo?.limit_remaining ?? null}
            onClick={() => setHistoryOpen(!historyOpen)}
          />

          {/* DRAWER: Shell Style, Sliding Down */}
          <div className={`
                absolute top-full right-0 mt-2 w-[350px] md:w-[400px] bg-[#050505] rounded-[2px] border border-zinc-800 shadow-[0_20px_40px_-5px_rgba(0,0,0,0.8)] overflow-hidden transition-all duration-300 origin-top
                ${historyOpen ? 'opacity-100 max-h-[500px]' : 'opacity-0 max-h-0 pointer-events-none'}
              `}>
            {/* Header */}
            <div className="flex border-b border-zinc-900 bg-[#080808] p-2 items-center justify-between relative overflow-hidden">
              {/* Progress Bar (Green Line) */}
              <div
                className="absolute bottom-0 left-0 h-[1px] bg-green-500 transition-all duration-1000 ease-linear"
                style={{ width: `${(refreshTimer / 30) * 100}%` }}
              />
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-2">
                OpenRouter Usage
              </span>
              <span className="text-[9px] font-mono text-zinc-600">
                {refreshTimer}s to refresh
              </span>
            </div>

            {/* Body: Stats List */}
            <div className="p-3 font-mono text-[10px] space-y-3">
              {/* DAILY */}
              <div className="flex items-center justify-between p-2 bg-[#111] border border-zinc-800 rounded-[1px] relative overflow-hidden">
                <div className="flex items-center gap-3 z-10">
                  <div className="w-8 h-8 flex items-center justify-center bg-zinc-900 rounded-sm border border-zinc-800 text-te-orange">
                    <Clock size={14} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Daily Usage</span>
                    <span className="text-white text-base font-bold tracking-tight">
                      ${keyInfo?.usage_daily ? keyInfo.usage_daily.toFixed(4) : '0.0000'}
                    </span>
                  </div>
                </div>
                {/* Bar BG */}
                <div className="absolute bottom-0 left-0 h-0.5 bg-te-orange/50 w-[20%]"></div>
              </div>

              {/* WEEKLY */}
              <div className="flex items-center justify-between p-2 bg-[#111] border border-zinc-800 rounded-[1px] relative overflow-hidden">
                <div className="flex items-center gap-3 z-10">
                  <div className="w-8 h-8 flex items-center justify-center bg-zinc-900 rounded-sm border border-zinc-800 text-zinc-400">
                    <Calendar size={14} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Weekly Usage</span>
                    <span className="text-zinc-300 text-base font-bold tracking-tight">
                      ${keyInfo?.usage_weekly ? keyInfo.usage_weekly.toFixed(4) : '0.0000'}
                    </span>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 h-0.5 bg-zinc-500/50 w-[40%]"></div>
              </div>

              {/* MONTHLY */}
              <div className="flex items-center justify-between p-2 bg-[#111] border border-zinc-800 rounded-[1px] relative overflow-hidden">
                <div className="flex items-center gap-3 z-10">
                  <div className="w-8 h-8 flex items-center justify-center bg-zinc-900 rounded-sm border border-zinc-800 text-yellow-600">
                    <CalendarDays size={14} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Monthly Usage</span>
                    <span className="text-zinc-300 text-base font-bold tracking-tight">
                      ${keyInfo?.usage_monthly ? keyInfo.usage_monthly.toFixed(4) : '0.0000'}
                    </span>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 h-0.5 bg-yellow-600/50 w-[60%]"></div>
              </div>
            </div>

            {/* Footer: Session Context */}
            <div className="bg-[#0a0a0a] p-2 border-t border-zinc-900 flex justify-between items-center px-4">
              <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-wider">Current Limit</span>
              <span className="text-white font-mono font-bold text-xs">
                {keyInfo?.limit_remaining !== undefined && keyInfo?.limit_remaining !== null
                  ? `$${keyInfo.limit_remaining.toFixed(2)}`
                  : (keyInfo?.limit === null && keyInfo?.usage !== undefined) ? 'UNLIMITED' : 'UNKNOWN KEY'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Neon Terminal Hint - Two-Step Animation: Door Opens -> Content Slides Out */}
      <div
        className={`mx-6 mt-3 overflow-hidden transition-all duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]
          ${showNeonHint ? 'max-h-20' : 'max-h-0'}
        `}
        style={{
          perspective: '1200px',
        }}
      >
        {/* Mechanical Door Container - Dark background with subtle border */}
        <div
          className={`
            relative overflow-hidden rounded-[2px] border transition-all duration-800 ease-[cubic-bezier(0.4,0,0.2,1)]
            bg-[#0a0a0a]
            ${ignitionState === 'ON'
              ? 'border-green-800/60'
              : 'border-amber-800/60'}
            ${showNeonHint ? 'opacity-100' : 'opacity-0'}
          `}
          style={{
            boxShadow: ignitionState === 'ON'
              ? '0 0 12px rgba(34, 197, 94, 0.15), inset 0 0 20px rgba(0,0,0,0.5)'
              : '0 0 12px rgba(217, 119, 6, 0.15), inset 0 0 20px rgba(0,0,0,0.5)',
          }}
        >
          {/* Content that slides out */}
          <div
            key={neonHintKey}
            className={`
              relative px-4 py-2.5 font-mono text-[11px] tracking-wide text-center
              transition-all duration-800 ease-[cubic-bezier(0.4,0,0.2,1)]
              ${ignitionState === 'ON' ? 'text-green-500/90' : 'text-amber-500/90'}
            `}
            style={{
              transform: showNeonHint ? 'translateY(0)' : 'translateY(-100%)',
              opacity: showNeonHint ? 1 : 0,
              transitionDelay: showNeonHint ? '400ms' : '0ms',
            }}
          >
            {/* Life Bar - shrinks from both sides to center */}
            <div
              className={`absolute bottom-0 left-1/2 h-[2px] transition-none
                ${ignitionState === 'ON' ? 'bg-green-600/80 shadow-[0_0_6px_rgba(34,197,94,0.4)]' : 'bg-amber-600/80 shadow-[0_0_6px_rgba(217,119,6,0.4)]'}
              `}
              style={{
                transform: 'translateX(-50%)',
                animation: showNeonHint ? 'shrinkLifeBarCenter 10s linear forwards' : 'none',
              }}
            />
            <span className={`inline-block ${showNeonHint ? 'animate-pulse' : ''}`}>
              {ignitionState === 'ON'
                ? 'RESTART Terminal OR run "source ~/.zshrc" to use OpenRouter'
                : 'RESTART Terminal OR run "source ~/.zshrc" to cutoff OpenRouter'}
            </span>
          </div>
        </div>
      </div>

      {/* MAIN SCREEN AREA - FLEX ROW LAYOUT (Moved Bottom) */}
      <div className="mx-6 mt-5 mb-8 relative z-0">
        {/* Bezel */}
        <div className="bg-[#0f0f10] p-3 shadow-inset-screen relative overflow-hidden h-[340px] flex flex-col border-[3px] border-[#1a1a1c] rounded-[2px]">

          {/* Screen Content Wrapper - SIDE BY SIDE */}
          <div className="flex-1 flex flex-row relative z-30 h-full gap-0">

            {/* --- LEFT SECTION: GUI (2/3 Width) --- */}
            <div className="w-[65%] flex flex-col border-r border-zinc-800 relative">

              {/* Boot Overlay for GUI */}
              {isBooting && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-te-orange animate-pulse bg-[#0f0f10] z-50">
                  <Power className="mb-4 text-te-orange" size={32} />
                  <span className="font-mono text-xs tracking-widest text-te-offwhite">SYSTEM INITIALIZING</span>
                </div>
              )}

              {/* MONITOR MODE (Combined View) */}
              <div className="flex flex-col h-full text-te-offwhite font-mono">
                {/* GLOBAL ACTIONS HEADER - LEFT ALIGNED */}
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800 bg-[#121212]">
                  {/* Interactive Status Link */}
                  <div className="flex-1 flex justify-start items-center gap-6 text-[8px] font-mono text-zinc-500 uppercase tracking-wider relative -top-[1px] select-none">
                    <span className="flex items-center gap-1.5 cursor-pointer hover:text-zinc-300 transition-colors" onClick={async () => {
                      const ok = await window.electronAPI?.openPath(configPath);
                      if (!ok) addLog('err_open', `FAILED TO OPEN: ${configPath}`);
                    }}>
                      <span className="text-zinc-600">FILE:</span>
                      <span className="text-zinc-400 font-bold border-b border-dashed border-zinc-700 pb-[1px]">{configPath ? configPath.split('/').pop() : 'CONFIG'}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="text-zinc-600">STATUS:</span>
                      <span className={`font-bold transition-colors ${ignitionState === 'ON' ? 'text-te-green drop-shadow-[0_0_8px_rgba(74,222,128,0.4)]' : 'text-zinc-500'}`}>
                        {ignitionState === 'ON' ? 'ENABLED' : 'DISABLED'}
                      </span>
                    </span>
                  </div>

                  <p className="text-[8px] text-zinc-500 leading-tight font-sans italic mr-2 cursor-pointer hover:text-zinc-400 transition-colors mt-auto" onClick={async () => {
                    const ok = await window.electronAPI?.openPath(configPath);
                    if (!ok) addLog('err_open', `FAILED TO OPEN: ${configPath}`);
                  }}>
                    All 3 models are used in CC per its task & setup.
                  </p>
                </div>

                {/* SPLIT VIEW: CONNECTION | MODELS */}
                <div className="flex-1 flex flex-row overflow-hidden pb-1">
                  {/* Group 1: Config Status (Read-Only View from File) */}
                  <div className="flex-1 border-r border-zinc-800 pr-1 px-1 overflow-y-auto screen-scroll">
                    <div className="text-[9px] text-te-blue mb-2 px-1 flex justify-between items-center bg-te-blue/10 border-l-2 border-te-blue py-0.5">
                      <span className="font-bold pl-1 tracking-wider">CONFIG STATUS</span>
                    </div>

                    {/* Custom Render Logic for 5 Config Variables (no editing, read-from-file) */}
                    {(() => {
                      // Build display rows from fileConfigValues
                      // Strip https:// from URL for cleaner display
                      const displayUrl = fileConfigValues.baseUrl
                        ? fileConfigValues.baseUrl.replace(/^https?:\/\//, '')
                        : 'Not Set';

                      const items: { label: string; displayValue: string; status: 'set' | 'notset' | 'activated' | 'inactive' }[] = [
                        {
                          label: 'OpenRouter URL',
                          displayValue: displayUrl,
                          status: fileConfigValues.baseUrl ? 'set' : 'notset',
                        },
                        {
                          label: 'OpenRouter Key',
                          displayValue: fileConfigValues.authToken === 'ACTIVATED' ? 'ACTIVATED' : 'INACTIVE',
                          status: fileConfigValues.authToken === 'ACTIVATED' ? 'activated' : 'inactive',
                        },
                        {
                          label: 'King Model',
                          displayValue: fileConfigValues.opusModel ? 'SET' : 'NOT SET',
                          status: fileConfigValues.opusModel ? 'set' : 'notset',
                        },
                        {
                          label: 'Queen Model',
                          displayValue: fileConfigValues.sonnetModel ? 'SET' : 'NOT SET',
                          status: fileConfigValues.sonnetModel ? 'set' : 'notset',
                        },
                        {
                          label: 'Jack Model',
                          displayValue: fileConfigValues.haikuModel ? 'SET' : 'NOT SET',
                          status: fileConfigValues.haikuModel ? 'set' : 'notset',
                        },
                      ];

                      return items.map(item => (
                        <div key={item.label} className="py-2 px-2 border-b border-zinc-800/50 flex items-center justify-between gap-3 group hover:bg-zinc-900/30 transition-colors">
                          <span className="text-[9px] font-sans font-semibold text-zinc-500 tracking-wide shrink-0">{item.label}</span>
                          {/* Status Badge */}
                          <span className={`
                            text-[9px] font-mono font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider
                            ${item.status === 'set' ? 'text-te-green bg-te-green/10 border border-te-green/30' : ''}
                            ${item.status === 'notset' ? 'text-zinc-600 bg-zinc-800/50 border border-zinc-700' : ''}
                            ${item.status === 'activated' ? 'text-green-400 bg-green-500/10 border border-green-500/30 shadow-[0_0_8px_rgba(74,222,128,0.2)]' : ''}
                            ${item.status === 'inactive' ? 'text-red-400 bg-red-500/10 border border-red-500/30' : ''}
                          `}>
                            {item.displayValue}
                          </span>
                        </div>
                      ));
                    })()}
                  </div>

                  {/* Group 2: Models - RANKED VIEW */}
                  <div className="flex-1 pl-2 pr-1 px-1 flex flex-col">
                    {/* HEADER */}
                    <div className="mb-3 px-1">
                      <div className="text-[9px] text-te-orange mb-1 flex justify-between items-center bg-te-orange/10 border-l-2 border-te-orange py-0.5">
                        <span className="font-bold pl-1 tracking-wider">MODELS</span>
                      </div>
                    </div>

                    {/* KING SLOT */}
                    <ModelSlot
                      rank="KING"
                      def={modelVars.find(d => d.key === 'ANTHROPIC_DEFAULT_OPUS_MODEL')!}
                      value={envState['ANTHROPIC_DEFAULT_OPUS_MODEL']}
                      icon={<Crown size={14} className="text-yellow-500" />}
                      status={modelStatuses['ANTHROPIC_DEFAULT_OPUS_MODEL']}
                      onEdit={() => startEditing('ANTHROPIC_DEFAULT_OPUS_MODEL')}
                      isEditing={editingKey === 'ANTHROPIC_DEFAULT_OPUS_MODEL'}
                      editValue={tempValue}
                      onEditValueChange={setTempValue}
                      onSave={saveEdit}
                      onCancel={cancelEdit}
                      options={filteredModelIds}
                    />

                    {/* QUEEN SLOT */}
                    <ModelSlot
                      rank="QUEEN"
                      def={modelVars.find(d => d.key === 'ANTHROPIC_DEFAULT_SONNET_MODEL')!}
                      value={envState['ANTHROPIC_DEFAULT_SONNET_MODEL']}
                      icon={<Medal size={14} className="text-zinc-300" />}
                      status={modelStatuses['ANTHROPIC_DEFAULT_SONNET_MODEL']}
                      onEdit={() => startEditing('ANTHROPIC_DEFAULT_SONNET_MODEL')}
                      isEditing={editingKey === 'ANTHROPIC_DEFAULT_SONNET_MODEL'}
                      editValue={tempValue}
                      onEditValueChange={setTempValue}
                      onSave={saveEdit}
                      onCancel={cancelEdit}
                      options={filteredModelIds}
                    />

                    {/* JACK SLOT */}
                    <ModelSlot
                      rank="JACK"
                      def={modelVars.find(d => d.key === 'ANTHROPIC_DEFAULT_HAIKU_MODEL')!}
                      value={envState['ANTHROPIC_DEFAULT_HAIKU_MODEL']}
                      icon={<Zap size={14} className="text-amber-600" />}
                      status={modelStatuses['ANTHROPIC_DEFAULT_HAIKU_MODEL']}
                      onEdit={() => startEditing('ANTHROPIC_DEFAULT_HAIKU_MODEL')}
                      isEditing={editingKey === 'ANTHROPIC_DEFAULT_HAIKU_MODEL'}
                      editValue={tempValue}
                      onEditValueChange={setTempValue}
                      onSave={saveEdit}
                      onCancel={cancelEdit}
                      options={filteredModelIds}
                    />

                    {/* Unified Test Button at Bottom */}
                    <button
                      onClick={runAllTests}
                      disabled={isTestRunning}
                      className="mt-2 w-full h-5 bg-zinc-800 hover:bg-zinc-700 text-[9px] text-zinc-300 font-bold tracking-wider uppercase rounded-[1px] flex items-center justify-center gap-2 transition-all border border-zinc-700 hover:border-zinc-600 active:translate-y-[1px] shadow-sm mb-1"
                    >
                      {isTestRunning ? <Loader2 size={10} className="animate-spin text-zinc-400" /> : <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full"></div>}
                      <span className="leading-none mt-[1px]">Test Model Connection</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* --- RIGHT SECTION: TERMINAL (1/3 Width) --- */}
            <div className="w-[35%] flex flex-col bg-[#050505] min-w-0">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800 bg-[#080808]">
                <TerminalIcon size={10} className="text-amber-600" />
                <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider">Shell I/O</span>
                <div className="flex-1"></div>
                <span className="text-[8px] text-zinc-700 font-mono">/dev/ttyS0</span>
              </div>

              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto font-mono text-[9px] p-3 bg-black shadow-inner screen-scroll"
              >
                {isBooting ? (
                  <div className="text-zinc-600 animate-pulse">Initializing TTY...</div>
                ) : terminalLogs.length === 0 ? (
                  <div className="text-zinc-700 italic">Waiting for input...</div>
                ) : null}

                {/* Logs - newest at top (already in correct order) */}
                {terminalLogs.map((log, idx) => (
                  <div
                    key={log.id}
                    className={`mb-2 last:mb-0 rounded-sm ${idx === 0 ? 'animate-in fade-in slide-in-from-top-2 duration-300 animate-neon-flash-3' : ''}`}
                  >
                    <div className={`flex gap-2 break-all leading-tight transition-all duration-500 ${idx === 0 ? 'text-amber-300' : 'text-amber-500/80'}`}>
                      <span className="text-zinc-600 select-none shrink-0">$</span>
                      <span>{log.cmd}</span>
                    </div>
                    <div className={`pl-3 border-l ml-0.5 mt-0.5 break-all leading-tight transition-all duration-500 ${idx === 0 ? 'text-zinc-300 border-amber-400/60' : 'text-zinc-500 border-zinc-800'}`}>
                      {log.out}
                    </div>
                  </div>
                ))}

                {/* Status Bar instead of Cursor (at bottom) */}
                {!isBooting && terminalLogs.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-zinc-800/50 flex items-center gap-2 text-[8px] text-zinc-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500/50 animate-pulse"></div>
                    <span className="uppercase tracking-wider">READY</span>
                    <span className="flex-1"></span>
                    <span className="text-zinc-700">{terminalLogs.length} entries</span>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Screen Gloss & Scanlines */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.15)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_3px,3px_100%] pointer-events-none z-40"></div>
          <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-white/5 via-transparent to-transparent pointer-events-none z-50"></div>
        </div>
      </div>

    </div >
  );
}
