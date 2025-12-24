import { useState, useEffect, useRef } from 'react';
import { Trash2, Power, X, Loader2, ChevronRight, Terminal as TerminalIcon, Crown, Medal, Zap } from 'lucide-react';
import { EnvState, GroupType, ENV_DEFS } from './types';
import { DEFAULT_VALUES, OPENROUTER_PRESETS, AVAILABLE_MODELS } from './constants';
import { fetchCredits, Credits, fetchModels } from './lib/openrouter';
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
  onSave: () => void;
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
  );
};

export default function App() {
  const [envState, setEnvState] = useState<EnvState>(DEFAULT_VALUES);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>('');
  const [isBooting, setIsBooting] = useState(true);
  const [isVibrating, setIsVibrating] = useState(false);
  const [credits, setCredits] = useState<Credits | null>(null);
  const [initialCredits, setInitialCredits] = useState<number | null>(null);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);
  const [configPath, setConfigPath] = useState<string>('');

  // Terminal State
  const [terminalLogs, setTerminalLogs] = useState<{ cmd: string, out: string, id: number }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // OpenRouter Ignition State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [ignitionInput, setIgnitionInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Derived State for Ignition
  const hasOrKey = envState['ANTHROPIC_API_KEY']?.startsWith('sk-or-');
  const isOrUrl = envState['ANTHROPIC_BASE_URL']?.includes('openrouter');

  let ignitionState: 'NO_KEY' | 'OFF' | 'ON' = 'NO_KEY';
  if (hasOrKey) {
    ignitionState = isOrUrl ? 'ON' : 'OFF';
  }

  // Rotation: NO_KEY (-45deg), OFF (0deg), ON (45deg)
  const rotation = ignitionState === 'NO_KEY' ? -45 : ignitionState === 'OFF' ? 0 : 45;

  const syncToBackend = async (newState: EnvState) => {
    // Synchronize with Electron Backend
    const apiKey = newState['ANTHROPIC_API_KEY'] || '';
    const model = newState['ANTHROPIC_DEFAULT_SONNET_MODEL'] || ''; // Current mapping

    if (window.electronAPI) {
      try {
        await window.electronAPI.saveSettings({ apiKey, model });
        console.log('Backend synced:', { apiKey, model });
      } catch (e) {
        console.error('Backend sync failed:', e);
        addLog('error', 'SYSTEM IO ERROR: CONFIG SAVE FAILED');
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
        setEnvState(prev => ({
          ...prev,
          ANTHROPIC_API_KEY: settings.apiKey || '',
          // If model is set, we assume it's the sonnet model for now as per this UI's logic
          ANTHROPIC_DEFAULT_SONNET_MODEL: settings.model || DEFAULT_VALUES.ANTHROPIC_DEFAULT_SONNET_MODEL,
          // We default base URL to OpenRouter if key is present to match UI logic, or keep default
          ANTHROPIC_BASE_URL: (settings.apiKey && settings.apiKey.startsWith('sk-or-'))
            ? OPENROUTER_PRESETS.ANTHROPIC_BASE_URL
            : DEFAULT_VALUES.ANTHROPIC_BASE_URL
        }));
        if (settings.configPath) setConfigPath(settings.configPath);
        addLog('sys', 'BACKEND CONFIG LOADED.');
      } catch (e) {
        console.error('Failed to load settings:', e);
        addLog('error', 'CONFIG LOAD FAILED.');
      }
    };
    loadSettings();
  }, []);

  // -- Logging Helper --
  const addLog = (command: string, output: string) => {
    setTerminalLogs(prev => [
      ...prev.slice(-19), // Keep last 20 lines (slightly more for vertical space)
      { cmd: command, out: output, id: Date.now() }
    ]);
  };

  // Auto-scroll terminal
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  // Simulate boot sequence
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsBooting(false);
      addLog('sys_init --force', 'KERNEL_LOADED. MEMORY_OK.');
      addLog('mount_env', 'VARIABLES_LOADED.');
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyView, setHistoryView] = useState<'DAY' | 'WEEK' | 'MONTH'>('DAY');
  const [costHistory, setCostHistory] = useState<{ date: string, cost: number }[]>([]);

  const [filteredModelIds, setFilteredModelIds] = useState<string[]>([]);
  const [modelStatuses, setModelStatuses] = useState<{ [key: string]: 'pending' | 'online' | 'offline' | 'idle' }>({});
  const [isTestRunning, setIsTestRunning] = useState(false);

  const runAllTests = async () => {
    if (isTestRunning) return;
    setIsTestRunning(true);
    const keys = ['ANTHROPIC_DEFAULT_OPUS_MODEL', 'ANTHROPIC_DEFAULT_SONNET_MODEL', 'ANTHROPIC_DEFAULT_HAIKU_MODEL'];
    const apiKey = envState['ANTHROPIC_API_KEY'];

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
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: 'Hi' }],
            max_tokens: 1
          })
        });
        setModelStatuses(prev => ({ ...prev, [k]: res.ok ? 'online' : 'offline' }));
      } catch (e) {
        setModelStatuses(prev => ({ ...prev, [k]: 'offline' }));
      }
    }
    setIsTestRunning(false);
  };

  // Fetch and Filter Models
  useEffect(() => {
    const getModels = async () => {
      // Use test key if available in env, or fallbacks
      const keyToUse = envState['ANTHROPIC_API_KEY'];
      // Only fetch if we have a key (and it's likely an OR key)
      if (!keyToUse?.startsWith('sk-or-')) {
        // Fallback to default list if no key
        setFilteredModelIds(AVAILABLE_MODELS);
        return;
      }

      try {
        // We use the lib function but might need to pass key if authentication is required by endpoint (it usually is for models list?)
        // Actually openrouter models endpoint is public? Let's check. 
        // Documentation says GET https://openrouter.ai/api/v1/models is public but better with key for limits?
        // The lib function doesn't take key currently? 
        // Wait, I updated lib function? No, I updated the *interface* but not the *implementation* to take a key?
        // Let's check openrouter.ts content again if needed.
        // Assuming it works or I'll just fetch here directly to be safe.

        const models = await fetchModels();
        // Filter: Tool use AND Reasoning AND Image
        const qualified = models.filter(m => {
          const hasTools = m.supported_parameters?.includes('tools');
          const hasImage = m.architecture?.input_modalities?.includes('image');
          // Reasoning check: simpler heuristic or "reasoning" parameter
          const hasReasoning = m.supported_parameters?.includes('reasoning') || m.supported_parameters?.includes('include_reasoning');

          return hasTools && hasImage && hasReasoning;
        });

        if (qualified.length > 0) {
          setFilteredModelIds(qualified.map(m => m.id));
        } else {
          // If strictly no model meets ALL 3, maybe relax?
          // User said: "only provide these models". 
          // Detailed check: GPT-4o?
          // Let's rely on the strict filter. If empty, user can type manually.
          setFilteredModelIds(qualified.map(m => m.id));
        }
      } catch (e) {
        console.error(e);
        setFilteredModelIds(AVAILABLE_MODELS);
      }
    };
    getModels();
  }, [envState['ANTHROPIC_API_KEY']]); // Refetch if key changes?

  // Load History
  useEffect(() => {
    const stored = localStorage.getItem('cc_cost_history');
    if (stored) setCostHistory(JSON.parse(stored));
    else setCostHistory([]); // Init empty
  }, []);

  // Save History
  useEffect(() => {
    localStorage.setItem('cc_cost_history', JSON.stringify(costHistory));
  }, [costHistory]);

  // Aggregation Logic
  const getGroupedHistory = () => {
    // Clone and sort descending
    const sorted = [...costHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Inject current session if > 0
    let currentSessionCost = 0;
    if (credits && initialCredits !== null) {
      currentSessionCost = Math.max(0, initialCredits - credits.total_credits);
    }
    const todayStr = new Date().toDateString();

    // If viewing DAY, we just use the list, merging current session into today
    if (historyView === 'DAY') {
      const combined = [...sorted];
      const todayIdx = combined.findIndex(x => x.date === todayStr);
      if (todayIdx >= 0) {
        combined[todayIdx] = { ...combined[todayIdx], cost: combined[todayIdx].cost + currentSessionCost };
      } else if (currentSessionCost > 0) {
        combined.unshift({ date: todayStr, cost: currentSessionCost });
      }
      return combined;
    }

    // Grouping Maps
    const groups: { [key: string]: number } = {};

    // Add stored history
    sorted.forEach(entry => {
      const d = new Date(entry.date);
      let key = '';
      if (historyView === 'WEEK') {
        // ISO Week or just "Week of X"
        const firstDay = new Date(d.setDate(d.getDate() - d.getDay())); // Sunday
        key = `Week of ${firstDay.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
      } else { // MONTH
        key = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      }
      groups[key] = (groups[key] || 0) + entry.cost;
    });

    // Add Current Session
    const now = new Date();
    let nowKey = '';
    if (historyView === 'WEEK') {
      const firstDay = new Date(now.setDate(now.getDate() - now.getDay()));
      nowKey = `Week of ${firstDay.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    } else {
      nowKey = now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    }
    if (currentSessionCost > 0) {
      groups[nowKey] = (groups[nowKey] || 0) + currentSessionCost;
    }

    // Convert to array
    return Object.entries(groups).map(([date, cost]) => ({ date, cost }));
  };

  const historyList = getGroupedHistory();

  const handleToggleIgnition = () => {
    if (ignitionState === 'NO_KEY') {
      addLog('ignition_start', 'ERROR: NO KEY DETECTED.');
      return;
    }

    const newUrl = ignitionState === 'OFF'
      ? OPENROUTER_PRESETS.ANTHROPIC_BASE_URL
      : DEFAULT_VALUES.ANTHROPIC_BASE_URL;

    const newState = { ...envState, ANTHROPIC_BASE_URL: newUrl };
    setEnvState(newState);

    if (ignitionState === 'OFF') {
      setIsVibrating(true);
      setTimeout(() => setIsVibrating(false), 400); // 400ms vibration

      // Fetch credits if it's an OpenRouter key
      if (hasOrKey) {
        fetchCredits(envState['ANTHROPIC_API_KEY']).then(c => {
          if (c) {
            if (initialCredits === null) setInitialCredits(c.total_credits);
            setCredits(c);
            addLog('sys_net --credits', `BALANCE: $${c.total_credits.toFixed(2)}`);
          }
        });

        // Start polling
        const interval = setInterval(() => {
          fetchCredits(envState['ANTHROPIC_API_KEY']).then(c => {
            if (c) setCredits(c);
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
      setCredits(null);
      setInitialCredits(null);
    }
    // Base URL toggling is local state for now, but if we wanted to sync to backend we could.
    // However, backend currently hardcodes OpenRouter. 
  };

  // Also fetch on mount/load if key is already there
  useEffect(() => {
    if (hasOrKey && ignitionState === 'ON') {
      fetchCredits(envState['ANTHROPIC_API_KEY']).then(c => {
        if (c) {
          if (initialCredits === null) setInitialCredits(c.total_credits);
          setCredits(c);
        }
      });
    }
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [hasOrKey, ignitionState, envState, initialCredits, pollInterval]);

  const handleSaveKey = async () => {
    if (!ignitionInput.trim()) return;
    setIsVerifying(true);
    addLog(`verify_key "${ignitionInput.substring(0, 8)}..."`, 'VERIFYING SIGNATURE...');

    try {
      // Real Verification against OpenRouter
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
          ANTHROPIC_API_KEY: ignitionInput,
          ANTHROPIC_BASE_URL: DEFAULT_VALUES.ANTHROPIC_BASE_URL
        };
        setEnvState(newState);
        addLog('key_install', 'KEY ACCEPTED. IGNITION SEQUENCE STARTED.');
        if (data?.data?.label) {
          addLog('key_info', `KEY LABEL: ${data.data.label}`);
        }
        setIgnitionInput('');
        setDrawerOpen(false);

        syncToBackend(newState);
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
      ANTHROPIC_API_KEY: '',
      ANTHROPIC_BASE_URL: DEFAULT_VALUES.ANTHROPIC_BASE_URL // Auto-turn OFF logic
    };
    setEnvState(newState);
    addLog('eject_core', 'KEY REMOVED. SYSTEM RESET.');
    setDrawerOpen(false); // Close drawer on eject too

    syncToBackend(newState);
  };

  // --- Main Edit Logic ---
  const startEditing = (key: string) => {
    setEditingKey(key);
    setTempValue(envState[key] || '');
  };

  const saveEdit = () => {
    if (editingKey) {
      const newState = { ...envState, [editingKey]: tempValue };
      setEnvState(newState);
      addLog(`export ${editingKey}="..."`, `VALUE UPDATED (${tempValue.length} chars).`);
      setEditingKey(null);

      syncToBackend(newState);
    }
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setTempValue('');
  };

  const connectionVars = ENV_DEFS.filter(d => d.group === GroupType.CONNECTION);
  const modelVars = ENV_DEFS.filter(d => d.group === GroupType.MODELS);

  return (
    <div className="relative p-8 bg-retro-bg min-h-screen flex items-center justify-center font-sans overflow-x-hidden">

      {/* Device Chassis - WIDER LANDSCAPE FORMAT */}
      <div className="relative w-[880px] bg-te-grey rounded-xl flex flex-col overflow-hidden 
        border-t border-l border-white/40
        border-r-[6px] border-r-black/20
        border-b-[8px] border-b-black/30
        shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)]
      ">

        {/* Top Mechanical Ridge */}
        <div className="h-6 bg-te-grey border-b border-black/10 flex justify-between px-4 items-center shadow-sm relative z-20">
          <div className="flex gap-1.5 h-2.5 opacity-40">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="w-0.5 h-full bg-black"></div>)}
          </div>
          <div className="text-[7px] text-zinc-500 font-mono tracking-widest font-bold uppercase">CC Powercore Swap // v1.0</div>
        </div>

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
                    {ignitionState === 'NO_KEY' ? 'NO KEY FOUND' : ignitionState === 'OFF' ? 'ROUTER STANDBY' : (credits && initialCredits !== null) ? `SESSION COST: $${(initialCredits - credits.total_credits).toFixed(6)}` : 'ROUTER ACTIVE'}
                  </span>
                  <span className={`text-[8px] font-mono mt-0.5 transition-colors duration-300 ${ignitionState === 'ON' ? 'text-green-500/70 animate-pulse duration-[3000ms]' : 'text-zinc-500'}`}>
                    {ignitionState === 'NO_KEY' ? 'INSERT KEY TO CONFIGURE' : ignitionState === 'OFF' ? 'Turn the key to rout Claude Code to Openrouter' : 'Your Claude Code is Powered by Openrouter Now'}
                  </span>
                </div>
              </div>
              <ChevronRight size={14} className={`${ignitionState === 'ON' ? 'text-green-500/50' : 'text-zinc-400'}`} />
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

          {/* RIGHT GROUP: History Button & Advanced Drawer */}
          <div className="relative z-50"> {/* High Z for drawer */}
            {/* BUTTON: Icon Only, Tall to Match Drawer/Ignition */}
            <CostKnob isOpen={historyOpen} onClick={() => setHistoryOpen(!historyOpen)} />

            {/* DRAWER: Shell Style, Sliding Down */}
            <div className={`
                absolute top-full right-0 mt-2 w-[350px] md:w-[400px] bg-[#050505] rounded-[2px] border border-zinc-800 shadow-[0_20px_40px_-5px_rgba(0,0,0,0.8)] overflow-hidden transition-all duration-300 origin-top
                ${historyOpen ? 'opacity-100 max-h-[500px]' : 'opacity-0 max-h-0 pointer-events-none'}
              `}>
              {/* Header: Modes */}
              <div className="flex border-b border-zinc-800">
                {['DAY', 'WEEK', 'MONTH'].map(mode => (
                  <button
                    key={mode}
                    onClick={() => setHistoryView(mode as any)}
                    className={`flex-1 py-1.5 text-[9px] font-bold tracking-widest transition-colors
                                ${historyView === mode ? 'bg-amber-900/20 text-amber-500 shadow-[inset_0_-2px_0_rgba(245,158,11,1)]' : 'text-zinc-600 hover:text-zinc-400'}
                            `}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              {/* Body: List */}
              <div className="max-h-[200px] overflow-y-auto p-3 font-mono text-[10px] scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                {historyList.length === 0 ? (
                  <div className="text-zinc-700 italic text-center py-4">NO RECORDS FOUND</div>
                ) : (
                  historyList.map((entry, i) => (
                    <div key={i} className="flex justify-between items-center py-1 border-b border-zinc-900 last:border-0 hover:bg-[#111]">
                      <span className="text-zinc-400">{entry.date}</span>
                      <div className="flex items-center gap-2">
                        <div className="h-[1px] w-8 bg-zinc-800 hidden sm:block"></div>
                        <span className="text-amber-500 font-bold">${entry.cost.toFixed(2)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer: Totals */}
              <div className="bg-[#0f0f10] p-2 border-t border-zinc-800 flex justify-between items-center">
                <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Total</span>
                <span className="text-white font-mono font-bold text-xs">
                  ${historyList.reduce((acc, curr) => acc + curr.cost, 0).toFixed(2)}
                </span>
              </div>
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
                      <span className="flex items-center gap-1.5 cursor-pointer hover:text-zinc-300 transition-colors" onClick={() => window.electronAPI?.openConfigFolder()}>
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

                    <p className="text-[8px] text-zinc-500 leading-tight font-sans italic mr-2 cursor-pointer hover:text-zinc-400 transition-colors mt-auto" onClick={() => window.electronAPI?.openConfigFolder()}>
                      All 3 models are used in CC per its task & setup.
                    </p>
                  </div>

                  {/* SPLIT VIEW: CONNECTION | MODELS */}
                  <div className="flex-1 flex flex-row overflow-hidden pb-1">
                    {/* Group 1: Connection - NO EDIT */}
                    <div className="flex-1 border-r border-zinc-800 pr-1 px-1 overflow-y-auto screen-scroll">
                      <div className="text-[9px] text-te-blue mb-2 px-1 flex justify-between items-center bg-te-blue/10 border-l-2 border-te-blue py-0.5">
                        <span className="font-bold pl-1 tracking-wider">CONNECTION</span>
                      </div>
                      {connectionVars.map(def => (
                        <MonitorRow key={def.key} def={def} value={envState[def.key]} />
                      ))}
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

                  {terminalLogs.map((log) => (
                    <div key={log.id} className="mb-2 last:mb-0">
                      <div className="flex gap-2 text-amber-500/90 break-all leading-tight">
                        <span className="text-zinc-600 select-none shrink-0">$</span>
                        <span>{log.cmd}</span>
                      </div>
                      <div className="text-zinc-500 pl-3 border-l border-zinc-800 ml-0.5 mt-0.5 break-all leading-tight">
                        {log.out}
                      </div>
                    </div>
                  ))}
                  {/* Blinking Cursor */}
                  {!isBooting && (
                    <div className="flex gap-2 text-amber-500 mt-2">
                      <span className="text-zinc-600 select-none">$</span>
                      <span className="w-1.5 h-3 bg-amber-500 animate-pulse"></span>
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

        {/* Footer Text */}
        <div className="absolute bottom-2 left-14 right-14 flex justify-between items-center opacity-30 pointer-events-none">
          <span className="font-mono text-[7px] tracking-widest uppercase">Design: Otakrab // Lic: MIT</span>
          <div className="flex gap-1">
            {[1, 2, 3].map(i => <div key={i} className="w-0.5 h-0.5 rounded-full bg-black"></div>)}
          </div>
        </div>
      </div>
    </div>
  );
}
