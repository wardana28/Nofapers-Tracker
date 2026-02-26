/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Flame, 
  History, 
  AlertTriangle, 
  BookOpen, 
  Trophy, 
  RefreshCcw, 
  ChevronRight,
  ChevronLeft,
  Quote,
  Zap,
  Calendar,
  BarChart2,
  Heart,
  Brain,
  ShieldCheck,
  Users,
  MessageCircle,
  Send,
  Image as ImageIcon,
  LogOut,
  Sun,
  Moon,
  Languages
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Language, TRANSLATIONS } from './translations';

// --- Types ---
interface User {
  id: string;
  name: string;
  email: string;
  picture: string;
}

interface Comment {
  id: number;
  postId: number;
  userId: string;
  userName: string;
  userPicture: string;
  content: string;
  createdAt: string;
}

interface Post {
  id: number;
  userId: string;
  userName: string;
  userPicture: string;
  content: string;
  image: string | null;
  createdAt: string;
  comments: Comment[];
}

interface Relapse {
  date: string;
  note: string;
}

interface JournalEntry {
  date: string;
  content: string;
}

interface AppData {
  startDate: string | null;
  bestStreakSeconds: number;
  relapses: Relapse[];
  journal: JournalEntry[];
  points: number;
  unlockedBadges: string[];
}

// --- Constants ---

const INITIAL_DATA: AppData = {
  startDate: null,
  bestStreakSeconds: 0,
  relapses: [],
  journal: [],
  points: 0,
  unlockedBadges: [],
};

// --- Components ---

export default function App() {
  const [data, setData] = useState<AppData>(() => {
    const saved = localStorage.getItem('nofap_data');
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...INITIAL_DATA, ...parsed };
    }
    return INITIAL_DATA;
  });

  const [now, setNow] = useState(new Date());
  const [showRelapseModal, setShowRelapseModal] = useState(false);
  const [relapseNote, setRelapseNote] = useState('');
  const [aiMotivation, setAiMotivation] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'journal' | 'history' | 'badges' | 'community' | 'analytics'>('dashboard');
  const [journalText, setJournalText] = useState('');
  const [showPanicModal, setShowPanicModal] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ascend_theme');
      if (saved) return saved as 'light' | 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ascend_lang');
      if (saved) return saved as Language;
      const browserLang = navigator.language.split('-')[0];
      if (['en', 'id', 'ja', 'zh', 'es', 'ru'].includes(browserLang)) return browserLang as Language;
    }
    return 'en';
  });

  const t = TRANSLATIONS[language];

  const RANKS = useMemo(() => [
    { minDays: 0, name: t.ranks.recruit, color: "text-stone-400 dark:text-stone-500", bg: "bg-stone-50 dark:bg-stone-800/50" },
    { minDays: 4, name: t.ranks.novice, color: "text-blue-400 dark:text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
    { minDays: 8, name: t.ranks.apprentice, color: "text-indigo-400 dark:text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-900/20" },
    { minDays: 15, name: t.ranks.warrior, color: "text-emerald-400 dark:text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
    { minDays: 31, name: t.ranks.knight, color: "text-cyan-400 dark:text-cyan-500", bg: "bg-cyan-50 dark:bg-cyan-900/20" },
    { minDays: 61, name: t.ranks.master, color: "text-purple-400 dark:text-purple-500", bg: "bg-purple-50 dark:bg-purple-900/20" },
    { minDays: 91, name: t.ranks.grandmaster, color: "text-amber-400 dark:text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20" },
    { minDays: 181, name: t.ranks.legend, color: "text-orange-500 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/20" },
    { minDays: 366, name: t.ranks.immortal, color: "text-red-500 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20" },
  ], [t]);

  const BADGES = useMemo(() => [
    { id: 'seed', days: 1, name: language === 'en' ? "Seed" : language === 'id' ? "Benih" : language === 'ja' ? "種" : language === 'zh' ? "种子" : language === 'es' ? "Semilla" : "Семечко", icon: "🌱", description: language === 'en' ? "The first 24 hours of freedom." : language === 'id' ? "24 jam pertama kebebasan." : language === 'ja' ? "自由の最初の24時間。" : language === 'zh' ? "自由的最初24小时。" : language === 'es' ? "Las primeras 24 horas de libertad." : "Первые 24 часа свободы." },
    { id: 'sprout', days: 3, name: language === 'en' ? "Sprout" : language === 'id' ? "Tunas" : language === 'ja' ? "芽" : language === 'zh' ? "嫩芽" : language === 'es' ? "Brote" : "Росток", icon: "🌿", description: language === 'en' ? "Three days of discipline." : language === 'id' ? "Tiga hari disiplin." : language === 'ja' ? "3日間の規律。" : language === 'zh' ? "三天的自律。" : language === 'es' ? "Tres días de disciplina." : "Три дня дисциплины." },
    { id: 'sapling', days: 7, name: language === 'en' ? "Sapling" : language === 'id' ? "Pohon Muda" : language === 'ja' ? "苗木" : language === 'zh' ? "树苗" : language === 'es' ? "Arbolito" : "Саженец", icon: "🌳", description: language === 'en' ? "One full week of strength." : language === 'id' ? "Satu minggu penuh kekuatan." : language === 'ja' ? "1週間の強さ。" : language === 'zh' ? "整整一周的力量。" : language === 'es' ? "Una semana completa de fuerza." : "Целая неделя силы." },
    { id: 'tree', days: 14, name: language === 'en' ? "Tree" : language === 'id' ? "Pohon" : language === 'ja' ? "木" : language === 'zh' ? "树" : language === 'es' ? "Árbol" : "Дерево", icon: "🌲", description: language === 'en' ? "Two weeks of neural healing." : language === 'id' ? "Dua minggu penyembuhan saraf." : language === 'ja' ? "2週間の神経回復。" : language === 'zh' ? "两周的神经修复。" : language === 'es' ? "Dos semanas de curación neuronal." : "Две недели нейронного исцеления." },
    { id: 'forest', days: 30, name: language === 'en' ? "Forest" : language === 'id' ? "Hutan" : language === 'ja' ? "森" : language === 'zh' ? "森林" : language === 'es' ? "Bosque" : "Лес", icon: "🍃", description: language === 'en' ? "One month of self-mastery." : language === 'id' ? "Satu bulan penguasaan diri." : language === 'ja' ? "1ヶ月の自己習得。" : language === 'zh' ? "一个月的自我掌控。" : language === 'es' ? "Un mes de autodominio." : "Один месяц самообладания." },
    { id: 'mountain', days: 60, name: language === 'en' ? "Mountain" : language === 'id' ? "Gunung" : language === 'ja' ? "山" : language === 'zh' ? "山脉" : language === 'es' ? "Montaña" : "Гора", icon: "⛰️", description: language === 'en' ? "Two months of unwavering focus." : language === 'id' ? "Dua bulan fokus yang tak tergoyahkan." : language === 'ja' ? "2ヶ月の揺るぎない集中。" : language === 'zh' ? "两个月的坚定专注。" : language === 'es' ? "Dos meses de enfoque inquebrantable." : "Два месяца непоколебимой сосредоточенности." },
    { id: 'sky', days: 90, name: language === 'en' ? "Sky" : language === 'id' ? "Langit" : language === 'ja' ? "空" : language === 'zh' ? "天空" : language === 'es' ? "Cielo" : "Небо", icon: "☁️", description: language === 'en' ? "The standard reboot milestone." : language === 'id' ? "Tonggak sejarah reboot standar." : language === 'ja' ? "標準的なリブートの節目。" : language === 'zh' ? "标准的重启里程碑。" : language === 'es' ? "El hito estándar de reinicio." : "Стандартная веха перезагрузки." },
    { id: 'space', days: 180, name: language === 'en' ? "Space" : language === 'id' ? "Luar Angkasa" : language === 'ja' ? "宇宙" : language === 'zh' ? "太空" : language === 'es' ? "Espacio" : "Космос", icon: "🚀", description: language === 'en' ? "Six months of total transformation." : language === 'id' ? "Enam bulan transformasi total." : language === 'ja' ? "6ヶ月の完全な変革。" : language === 'zh' ? "六个月的全面蜕变。" : language === 'es' ? "Seis meses de transformación total." : "Шесть месяцев полной трансформации." },
    { id: 'universe', days: 365, name: language === 'en' ? "Universe" : language === 'id' ? "Alam Semesta" : language === 'ja' ? "ユニバース" : language === 'zh' ? "宇宙" : language === 'es' ? "Universo" : "Вселенная", icon: "🌌", description: language === 'en' ? "One year of absolute freedom." : language === 'id' ? "Satu tahun kebebasan mutlak." : language === 'ja' ? "1年間の絶対的な自由。" : language === 'zh' ? "一年的绝对自由。" : language === 'es' ? "Un año de libertad absoluta." : "Один год абсолютной свободы." },
  ], [language]);

  const BENEFITS = useMemo(() => [
    { days: 1, title: language === 'en' ? "Androgen Receptors Reset" : language === 'id' ? "Reset Reseptor Androgen" : language === 'ja' ? "アンドロゲン受容体のリセット" : language === 'zh' ? "雄激素受体重置" : language === 'es' ? "Reinicio de Receptores de Andrógenos" : "Сброс андрогенных рецепторов", description: language === 'en' ? "Your brain starts to recover from overstimulation." : language === 'id' ? "Otak Anda mulai pulih dari stimulasi berlebihan." : language === 'ja' ? "脳が過剰刺激から回復し始めます。" : language === 'zh' ? "大脑开始从过度刺激中恢复。" : language === 'es' ? "Tu cerebro comienza a recuperarse de la sobreestimulación." : "Ваш мозг начинает восстанавливаться после чрезмерной стимуляции.", icon: <Zap className="w-5 h-5" /> },
    { days: 3, title: language === 'en' ? "Increased Energy" : language === 'id' ? "Peningkatan Energi" : language === 'ja' ? "エネルギーの増加" : language === 'zh' ? "精力增加" : language === 'es' ? "Aumento de Energía" : "Повышенная энергия", description: language === 'en' ? "Testosterone levels begin to stabilize and energy rises." : language === 'id' ? "Kadar testosteron mulai stabil dan energi meningkat." : language === 'ja' ? "テストステロン値が安定し始め、エネルギーが高まります。" : language === 'zh' ? "睾酮水平开始稳定，精力上升。" : language === 'es' ? "Los niveles de testosterona comienzan a estabilizarse y la energía aumenta." : "Уровень тестостерона начинает стабилизироваться, энергия растет.", icon: <Flame className="w-5 h-5" /> },
    { days: 7, title: language === 'en' ? "Testosterone Peak" : language === 'id' ? "Puncak Testosteron" : language === 'ja' ? "テストステロンのピーク" : language === 'zh' ? "睾酮峰值" : language === 'es' ? "Pico de Testosterona" : "Пик тестостерона", description: language === 'en' ? "Studies show a significant spike in testosterone levels around day 7." : language === 'id' ? "Penelitian menunjukkan lonjakan signifikan kadar testosteron sekitar hari ke-7." : language === 'ja' ? "研究によると、7日目あたりでテストステロン値が大幅に上昇します。" : language === 'zh' ? "研究显示，在第7天左右睾酮水平会显著飙升。" : language === 'es' ? "Los estudios muestran un pico significativo en los niveles de testosterona alrededor del día 7." : "Исследования показывают значительный всплеск уровня тестостерона примерно на 7-й день.", icon: <Trophy className="w-5 h-5" /> },
    { days: 14, title: language === 'en' ? "Mental Clarity" : language === 'id' ? "Kejelasan Mental" : language === 'ja' ? "精神的な明晰さ" : language === 'zh' ? "头脑清晰" : language === 'es' ? "Claridad Mental" : "Ясность ума", description: language === 'en' ? "Brain fog begins to lift. Focus and concentration improve." : language === 'id' ? "Kabut otak mulai menghilang. Fokus dan konsentrasi meningkat." : language === 'ja' ? "脳の霧が晴れ始め、集中力が高まります。" : language === 'zh' ? "脑雾开始消散。注意力和集中力得到改善。" : language === 'es' ? "La niebla mental comienza a disiparse. El enfoque y la concentración mejoran." : "Мозговой туман начинает рассеиваться. Фокус и концентрация улучшаются.", icon: <Brain className="w-5 h-5" /> },
    { days: 30, title: language === 'en' ? "Dopamine Sensitivity" : language === 'id' ? "Sensitivitas Dopamin" : language === 'ja' ? "ドーパミン感受性" : language === 'zh' ? "多巴胺敏感性" : language === 'es' ? "Sensibilidad a la Dopamina" : "Чувствительность к дофамину", description: language === 'en' ? "You start finding joy in simple things again." : language === 'id' ? "Anda mulai menemukan kegembiraan dalam hal-hal sederhana lagi." : language === 'ja' ? "シンプルなことに再び喜びを感じ始めます。" : language === 'zh' ? "你开始再次从简单的事情中发现快乐。" : language === 'es' ? "Comienzas a encontrar alegría en las cosas simples de nuevo." : "Вы снова начинаете находить радость в простых вещах.", icon: <Heart className="w-5 h-5" /> },
    { days: 90, title: language === 'en' ? "Full Reboot" : language === 'id' ? "Reboot Penuh" : language === 'ja' ? "フルリブート" : language === 'zh' ? "全面重启" : language === 'es' ? "Reinicio Completo" : "Полная перезагрузка", description: language === 'en' ? "The standard 'reboot' period. Neural pathways are significantly rewired." : language === 'id' ? "Periode 'reboot' standar. Jalur saraf terhubung kembali secara signifikan." : language === 'ja' ? "標準的な「リブート」期間。神経回路が大幅に書き換えられます。" : language === 'zh' ? "标准的“重启”期。神经通路得到显著重构。" : language === 'es' ? "El período estándar de 'reinicio'. Las vías neuronales se reconectan significativamente." : "Стандартный период «перезагрузки». Нейронные пути значительно перестраиваются.", icon: <ShieldCheck className="w-5 h-5" /> },
  ], [language]);

  useEffect(() => {
    localStorage.setItem('ascend_lang', language);
  }, [language]);

  // Calendar State
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Community State
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImage, setNewPostImage] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [commentTexts, setCommentTexts] = useState<Record<number, string>>({});

  // Auth Check
  useEffect(() => {
    fetch("/api/auth/me")
      .then(res => res.json())
      .then(data => setUser(data.user))
      .catch(err => console.error("Auth check failed", err));
  }, []);

  // Fetch Posts
  const fetchPosts = async () => {
    setIsLoadingPosts(true);
    try {
      const res = await fetch("/api/posts");
      const data = await res.json();
      setPosts(data);
    } catch (err) {
      console.error("Fetch posts failed", err);
    } finally {
      setIsLoadingPosts(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'community') {
      fetchPosts();
    }
  }, [activeTab]);

  // OAuth Listener
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        fetch("/api/auth/me")
          .then(res => res.json())
          .then(data => {
            setUser(data.user);
            fetchPosts();
          });
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const res = await fetch("/api/auth/google/url");
      const { url } = await res.json();
      window.open(url, 'google_login', 'width=500,height=600');
    } catch (err) {
      console.error("Login failed", err);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPostImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const createPost = async () => {
    if (!newPostContent.trim() && !newPostImage) return;
    setIsPosting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newPostContent, image: newPostImage }),
      });
      if (res.ok) {
        setNewPostContent('');
        setNewPostImage(null);
        fetchPosts();
      }
    } catch (err) {
      console.error("Create post failed", err);
    } finally {
      setIsPosting(false);
    }
  };

  const addComment = async (postId: number) => {
    const content = commentTexts[postId];
    if (!content?.trim()) return;
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        setCommentTexts(prev => ({ ...prev, [postId]: '' }));
        fetchPosts();
      }
    } catch (err) {
      console.error("Add comment failed", err);
    }
  };

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Persist data
  useEffect(() => {
    localStorage.setItem('nofap_data', JSON.stringify(data));
  }, [data]);

  // Theme effect
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('ascend_theme', theme);
  }, [theme]);

  // Calculations
  const streakSeconds = useMemo(() => {
    if (!data.startDate) return 0;
    const start = new Date(data.startDate).getTime();
    const diff = Math.max(0, Math.floor((now.getTime() - start) / 1000));
    return diff;
  }, [data.startDate, now]);

  const { days, hours, minutes, seconds } = useMemo(() => {
    const d = Math.floor(streakSeconds / (24 * 3600));
    const h = Math.floor((streakSeconds % (24 * 3600)) / 3600);
    const m = Math.floor((streakSeconds % 3600) / 60);
    const s = streakSeconds % 60;
    return { days: d, hours: h, minutes: m, seconds: s };
  }, [streakSeconds]);

  const currentRank = useMemo(() => {
    return [...RANKS].reverse().find(r => days >= r.minDays) || RANKS[0];
  }, [days]);

  const totalPoints = useMemo(() => {
    // 1 point per hour clean
    const hourlyPoints = Math.floor(streakSeconds / 3600);
    // Bonus points for milestones
    const milestonePoints = BADGES.reduce((acc, badge) => {
      if (days >= badge.days) return acc + (badge.days * 10);
      return acc;
    }, 0);
    return hourlyPoints + milestonePoints;
  }, [streakSeconds, days]);

  useEffect(() => {
    if (streakSeconds > data.bestStreakSeconds) {
      setData(prev => ({ ...prev, bestStreakSeconds: streakSeconds }));
    }
  }, [streakSeconds, data.bestStreakSeconds]);

  // Badge unlocking logic
  useEffect(() => {
    const newlyUnlocked = BADGES
      .filter(b => days >= b.days && !data.unlockedBadges.includes(b.id))
      .map(b => b.id);
    
    if (newlyUnlocked.length > 0) {
      setData(prev => ({
        ...prev,
        unlockedBadges: [...prev.unlockedBadges, ...newlyUnlocked]
      }));
    }
  }, [days, data.unlockedBadges]);

  const formatTime = (totalSeconds: number) => {
    const d = Math.floor(totalSeconds / (24 * 3600));
    const h = Math.floor((totalSeconds % (24 * 3600)) / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return { days: d, hours: h, minutes: m, seconds: s };
  };

  // Handlers
  const addJournalEntry = () => {
    if (!journalText.trim()) return;
    const newEntry: JournalEntry = {
      date: new Date().toISOString(),
      content: journalText
    };
    setData(prev => ({
      ...prev,
      journal: [newEntry, ...prev.journal]
    }));
    setJournalText('');
  };

  const startStreak = () => {
    setData(prev => ({ ...prev, startDate: new Date().toISOString() }));
  };

  const handleRelapse = () => {
    const newRelapse: Relapse = {
      date: new Date().toISOString(),
      note: relapseNote || 'No note provided'
    };
    setData(prev => ({
      ...prev,
      startDate: new Date().toISOString(),
      relapses: [newRelapse, ...prev.relapses]
    }));
    setRelapseNote('');
    setShowRelapseModal(false);
  };

  // Analytics Calculations
  const analyticsData = useMemo(() => {
    const relapseDates = data.relapses.map(r => new Date(r.date).toISOString().split('T')[0]);
    const relapseSet = new Set(relapseDates);

    // Relapses by month (last 6 months)
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthName = d.toLocaleString('default', { month: 'short' });
      const monthYear = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const count = data.relapses.filter(r => r.date.startsWith(monthYear)).length;
      months.push({ name: monthName, count });
    }

    // Average streak
    let avgStreakDays = 0;
    if (data.relapses.length > 0) {
      const sortedRelapses = [...data.relapses].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      let totalDays = 0;
      for (let i = 1; i < sortedRelapses.length; i++) {
        const diff = new Date(sortedRelapses[i].date).getTime() - new Date(sortedRelapses[i-1].date).getTime();
        totalDays += diff / (1000 * 3600 * 24);
      }
      avgStreakDays = sortedRelapses.length > 1 ? Math.round(totalDays / (sortedRelapses.length - 1)) : days;
    } else {
      avgStreakDays = days;
    }

    return { relapseSet, months, avgStreakDays };
  }, [data.relapses, days]);

  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const daysArr = [];
    // Padding for start of month
    for (let i = 0; i < firstDay; i++) {
      daysArr.push(null);
    }
    // Days of month
    for (let i = 1; i <= daysInMonth; i++) {
      daysArr.push(new Date(year, month, i));
    }
    return daysArr;
  }, [calendarDate]);

  const changeMonth = (offset: number) => {
    setCalendarDate(prev => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + offset);
      return next;
    });
  };

  const getAiMotivation = async () => {
    setIsLoadingAi(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Give me a short, powerful, and stoic motivational quote for someone struggling with a NoFap journey. Current streak: ${days} days. Rank: ${currentRank.name}. Be supportive but firm.`,
      });
      setAiMotivation(response.text || "Stay strong. The pain of discipline is better than the pain of regret.");
    } catch (error) {
      console.error("AI Error:", error);
      setAiMotivation("Stay strong. Your future self will thank you.");
    } finally {
      setIsLoadingAi(false);
    }
  };

  const PANIC_ADVICE = useMemo(() => {
    switch (language) {
      case 'id': return [
        "Ambil 10 napas dalam. Hirup selama 4, tahan selama 4, buang selama 8.",
        "Jalan kaki selama 5 menit. Sekarang juga. Jangan berpikir, bergerak saja.",
        "Lakukan 20 pushup. Salurkan energi itu menjadi kekuatan fisik.",
        "Percikkan air dingin ke wajah Anda. Kejutan itu akan mengatur ulang sistem saraf Anda.",
        "Hubungi teman atau anggota keluarga. Koneksi adalah penawar kecanduan.",
        "Ingat mengapa Anda memulai. Diri masa depan Anda sedang memperhatikan."
      ];
      case 'ja': return [
        "深呼吸を10回してください。4秒吸って、4秒止めて、8秒吐きます。",
        "5分間散歩に行ってください。今すぐ。考えずに、ただ動いてください。",
        "腕立て伏せを20回してください。そのエネルギーを物理的な強さに変えてください。",
        "顔に冷たい水をかけてください。その衝撃が神経系をリセットします。",
        "友人や家族に電話してください。つながりは依存症の解毒剤です。",
        "なぜ始めたのかを思い出してください。未来の自分があなたを見ています。"
      ];
      case 'zh': return [
        "深呼吸10次。吸气4秒，屏息4秒，呼气8秒。",
        "散步5分钟。现在就去。不要思考，动起来。",
        "做20个俯卧撑。将能量转化为体力。",
        "往脸上泼冷水。这种冲击会重置你的神经系统。",
        "给朋友或家人打电话。联系是克服成瘾的良药。",
        "记住你为什么开始。未来的你正在看着你。"
      ];
      case 'es': return [
        "Toma 10 respiraciones profundas. Inhala por 4, mantén por 4, exhala por 8.",
        "Sal a caminar 5 minutos. Ahora mismo. No lo pienses, solo muévete.",
        "Haz 20 flexiones. Canaliza esa energía en fuerza física.",
        "Salpica agua fría en tu cara. El choque reseteará tu sistema nervioso.",
        "Llama a un amigo o familiar. La conexión es el antídoto contra la adicción.",
        "Recuerda por qué empezaste. Tu yo del futuro te está observando."
      ];
      case 'ru': return [
        "Сделайте 10 глубоких вдохов. Вдох на 4 счета, задержка на 4, выдох на 8.",
        "Прогуляйтесь 5 минут. Прямо сейчас. Не думайте, просто двигайтесь.",
        "Сделайте 20 отжиманий. Направьте эту энергию в физическую силу.",
        "Ополосните лицо холодной водой. Шок перезагрузит вашу нервную систему.",
        "Позвоните другу или члену семьи. Общение — противоядие от зависимости.",
        "Вспомните, почему вы начали. Ваше будущее «я» наблюдает за вами."
      ];
      default: return [
        "Take 10 deep breaths. Inhale for 4, hold for 4, exhale for 8.",
        "Go for a 5-minute walk. Right now. Don't think, just move.",
        "Do 20 pushups. Channel that energy into physical strength.",
        "Splash cold water on your face. The shock will reset your nervous system.",
        "Call a friend or family member. Connection is the antidote to addiction.",
        "Remember why you started. Your future self is watching."
      ];
    }
  }, [language]);

  return (
    <div className="min-h-screen bg-[#F5F5F5] dark:bg-stone-950 text-[#1A1A1A] dark:text-stone-100 font-sans selection:bg-emerald-100 pb-24 transition-colors duration-300">
      {/* Header */}
      <header className="max-w-md mx-auto pt-8 px-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.appName}</h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-widest font-semibold">{t.freedomTracker}</p>
        </div>
        <div className="flex gap-2">
          <div className="relative group">
            <button className="p-3 bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800 transition-all">
              <Languages className="w-5 h-5" />
            </button>
            <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100] overflow-hidden">
              {[
                { code: 'en', label: 'English' },
                { code: 'id', label: 'Indonesia' },
                { code: 'ja', label: '日本語' },
                { code: 'zh', label: '中文' },
                { code: 'es', label: 'Español' },
                { code: 'ru', label: 'Русский' }
              ].map((lang) => (
                <button 
                  key={lang.code}
                  onClick={() => setLanguage(lang.code as Language)}
                  className={`w-full px-4 py-2 text-left text-xs font-bold hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors ${language === lang.code ? 'text-emerald-500' : 'text-stone-600 dark:text-stone-400'}`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
          <button 
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 dark:text-stone-400 transition-colors"
            title="Toggle Theme"
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
          <button 
            onClick={() => setShowPanicModal(true)}
            className="p-2 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            title="Panic Button"
          >
            <AlertTriangle className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setShowRelapseModal(true)}
            className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 dark:text-stone-400 transition-colors"
            title="Relapse"
          >
            <RefreshCcw className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 pt-8">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {/* Rank & Points Bar */}
              <div className="flex justify-between items-center mb-8 bg-white dark:bg-stone-900 p-4 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-800 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${currentRank.bg} ${currentRank.color}`}>
                    {currentRank.name}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-bold text-stone-700 dark:text-stone-300">{totalPoints} pts</span>
                </div>
              </div>

              {/* Main Streak Display */}
              <section className="mb-12 text-center">
                {!data.startDate ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-stone-900 p-8 rounded-[32px] shadow-sm border border-stone-100 dark:border-stone-800 transition-colors"
                  >
                    <Flame className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold mb-2">{t.readyToBegin}</h2>
                    <p className="text-stone-500 dark:text-stone-400 text-sm mb-6">{t.journeyStart}</p>
                    <button 
                      onClick={startStreak}
                      className="w-full bg-[#1A1A1A] dark:bg-emerald-600 text-white py-4 rounded-2xl font-semibold hover:bg-stone-800 dark:hover:bg-emerald-700 transition-all active:scale-95"
                    >
                      {t.startStreak}
                    </button>
                  </motion.div>
                ) : (
                  <div className="space-y-8">
                    <div className="relative inline-block">
                      <motion.div 
                        key={days}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-[120px] font-bold leading-none tracking-tighter text-[#1A1A1A] dark:text-stone-100"
                      >
                        {days}
                      </motion.div>
                      <div className="text-sm font-bold uppercase tracking-[0.2em] text-stone-400 dark:text-stone-500 -mt-2">{t.daysClean}</div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-800 transition-colors">
                        <div className="text-xl font-bold">{hours}</div>
                        <div className="text-[10px] uppercase tracking-wider text-stone-400 font-bold">{t.hours}</div>
                      </div>
                      <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-800 transition-colors">
                        <div className="text-xl font-bold">{minutes}</div>
                        <div className="text-[10px] uppercase tracking-wider text-stone-400 font-bold">{t.minutes}</div>
                      </div>
                      <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-800 transition-colors">
                        <div className="text-xl font-bold">{seconds}</div>
                        <div className="text-[10px] uppercase tracking-wider text-stone-400 font-bold">{t.seconds}</div>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* Quick Stats */}
              <section className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-5 rounded-[24px] border border-emerald-100 dark:border-emerald-900/30">
                  <Trophy className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-2" />
                  <div className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold uppercase tracking-wider mb-1">{t.bestStreak}</div>
                  <div className="text-xl font-bold text-emerald-900 dark:text-emerald-100">{formatTime(data.bestStreakSeconds).days} {t.days}</div>
                </div>
                <div className="bg-stone-100 dark:bg-stone-800 p-5 rounded-[24px] border border-stone-200 dark:border-stone-700">
                  <History className="w-5 h-5 text-stone-600 dark:text-stone-400 mb-2" />
                  <div className="text-xs text-stone-700 dark:text-stone-300 font-semibold uppercase tracking-wider mb-1">{t.totalRelapses}</div>
                  <div className="text-xl font-bold text-stone-900 dark:text-stone-100">{data.relapses.length}</div>
                </div>
              </section>

              {/* AI Motivation */}
              <section className="mb-8">
                <div className="bg-white dark:bg-stone-900 p-6 rounded-[24px] shadow-sm border border-stone-100 dark:border-stone-800 relative overflow-hidden transition-colors">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <Quote className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-bold uppercase tracking-wider text-stone-400">{t.dailyWisdom}</span>
                    </div>
                    <button 
                      onClick={getAiMotivation}
                      disabled={isLoadingAi}
                      className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 disabled:opacity-50"
                    >
                      {isLoadingAi ? t.thinking : t.refresh}
                    </button>
                  </div>
                  <p className="text-stone-800 dark:text-stone-200 italic leading-relaxed">
                    {aiMotivation || t.journeyStart}
                  </p>
                </div>
              </section>

              {/* Benefits Timeline */}
              <section className="mb-8">
                <h3 className="text-sm font-bold uppercase tracking-widest text-stone-400 mb-4 px-1">{t.benefitsTimeline}</h3>
                <div className="space-y-3">
                  {BENEFITS.map((benefit, idx) => {
                    const isUnlocked = days >= benefit.days;
                    return (
                      <div 
                        key={idx}
                        className={`p-4 rounded-2xl border transition-all ${
                          isUnlocked 
                            ? 'bg-white dark:bg-stone-900 border-emerald-100 dark:border-emerald-900/30 shadow-sm' 
                            : 'bg-stone-50 dark:bg-stone-900/50 border-stone-100 dark:border-stone-800 opacity-60'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`p-2 rounded-xl ${isUnlocked ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' : 'bg-stone-200 dark:bg-stone-800 text-stone-400 dark:text-stone-600'}`}>
                            {benefit.icon}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                              <h4 className={`font-bold text-sm ${isUnlocked ? 'text-stone-900 dark:text-stone-100' : 'text-stone-500 dark:text-stone-400'}`}>{benefit.title}</h4>
                              <span className="text-[10px] font-bold text-stone-400 uppercase">{benefit.days} {t.days}</span>
                            </div>
                            <p className="text-xs text-stone-500 dark:text-stone-400 leading-snug">{benefit.description}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'journal' && (
            <motion.div 
              key="journal"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-2xl font-bold mb-6">{t.journal}</h2>
              <div className="bg-white dark:bg-stone-900 p-6 rounded-[24px] shadow-sm border border-stone-100 dark:border-stone-800 mb-8 transition-colors">
                <textarea 
                  value={journalText}
                  onChange={(e) => setJournalText(e.target.value)}
                  placeholder={t.journalPlaceholder}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-100 dark:border-stone-700 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/30 transition-all resize-none h-32 mb-4 text-stone-900 dark:text-stone-100"
                />
                <button 
                  onClick={addJournalEntry}
                  className="w-full bg-[#1A1A1A] dark:bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-stone-800 dark:hover:bg-emerald-700 transition-all"
                >
                  {t.saveEntry}
                </button>
              </div>

              <div className="space-y-4">
                {data.journal.length === 0 ? (
                  <div className="text-center py-12 bg-white dark:bg-stone-900 rounded-[32px] border border-stone-100 dark:border-stone-800 transition-colors">
                    <BookOpen className="w-12 h-12 text-stone-200 dark:text-stone-800 mx-auto mb-4" />
                    <p className="text-stone-400 dark:text-stone-600 text-sm">{t.noJournalEntries}</p>
                  </div>
                ) : (
                  data.journal.map((entry, idx) => (
                    <div key={idx} className="bg-white dark:bg-stone-900 p-5 rounded-[24px] shadow-sm border border-stone-100 dark:border-stone-800 transition-colors">
                      <div className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-2">
                        {new Date(entry.date).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      </div>
                      <p className="text-sm text-stone-800 dark:text-stone-200 leading-relaxed">{entry.content}</p>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-2xl font-bold mb-6">{t.relapseHistory}</h2>
              {data.relapses.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-stone-900 rounded-[32px] border border-stone-100 dark:border-stone-800 transition-colors">
                  <ShieldCheck className="w-12 h-12 text-emerald-500 dark:text-emerald-600 mx-auto mb-4" />
                  <p className="text-stone-500 dark:text-stone-400">{t.noRelapses}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.relapses.map((relapse, idx) => (
                    <div key={idx} className="bg-white dark:bg-stone-900 p-5 rounded-[24px] shadow-sm border border-stone-100 dark:border-stone-800 flex items-start gap-4 transition-colors">
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-xl">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-stone-900 dark:text-stone-100">
                          {new Date(relapse.date).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="text-xs text-stone-500 dark:text-stone-400 mt-1 italic">"{relapse.note}"</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'badges' && (
            <motion.div 
              key="badges"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-2xl font-bold mb-2">{t.achievements}</h2>
              <p className="text-stone-500 dark:text-stone-400 text-sm mb-8">{t.unlockBadges}</p>
              
              <div className="grid grid-cols-2 gap-4">
                {BADGES.map((badge) => {
                  const isUnlocked = data.unlockedBadges.includes(badge.id);
                  return (
                    <div 
                      key={badge.id}
                      className={`p-6 rounded-[32px] border text-center transition-all ${
                        isUnlocked 
                          ? 'bg-white dark:bg-stone-900 border-amber-100 dark:border-amber-900/30 shadow-sm' 
                          : 'bg-stone-50 dark:bg-stone-900/50 border-stone-100 dark:border-stone-800 opacity-40 grayscale'
                      }`}
                    >
                      <div className="text-4xl mb-3">{badge.icon}</div>
                      <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 mb-1">{badge.name}</h4>
                      <p className="text-[10px] text-stone-500 dark:text-stone-400 leading-tight">{badge.description}</p>
                      <div className="mt-3 text-[9px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">
                        {badge.days} {t.days}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div 
              key="analytics"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-2xl font-bold mb-6">{t.analysis}</h2>
              
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-white dark:bg-stone-900 p-5 rounded-[24px] border border-stone-100 dark:border-stone-800 shadow-sm transition-colors">
                  <div className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-1">{t.avgStreak}</div>
                  <div className="text-2xl font-bold text-stone-900 dark:text-stone-100">{analyticsData.avgStreakDays} <span className="text-xs font-normal text-stone-400">{t.days}</span></div>
                </div>
                <div className="bg-white dark:bg-stone-900 p-5 rounded-[24px] border border-stone-100 dark:border-stone-800 shadow-sm transition-colors">
                  <div className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-1">{t.relapseRate}</div>
                  <div className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                    {(data.relapses.length / Math.max(1, Math.ceil(streakSeconds / (3600 * 24 * 30)))).toFixed(1)} 
                    <span className="text-xs font-normal text-stone-400"> /mo</span>
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="bg-white dark:bg-stone-900 p-6 rounded-[32px] border border-stone-100 dark:border-stone-800 shadow-sm mb-8 transition-colors">
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 mb-6">{t.relapsesPerMonth}</h3>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.months}>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: theme === 'dark' ? '#57534E' : '#A8A29E'}} />
                      <Tooltip 
                        cursor={{fill: theme === 'dark' ? '#1C1917' : '#F5F5F4'}} 
                        contentStyle={{
                          borderRadius: '12px', 
                          border: 'none', 
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          backgroundColor: theme === 'dark' ? '#1C1917' : '#FFFFFF',
                          color: theme === 'dark' ? '#F5F5F4' : '#1A1A1A'
                        }}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {analyticsData.months.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.count > 0 ? '#EF4444' : '#10B981'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Calendar */}
              <div className="bg-white dark:bg-stone-900 p-6 rounded-[32px] border border-stone-100 dark:border-stone-800 shadow-sm mb-8 transition-colors">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">{t.relapseCalendar}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors">
                      <ChevronLeft className="w-4 h-4 text-stone-400 dark:text-stone-600" />
                    </button>
                    <span className="text-xs font-bold text-stone-600 dark:text-stone-400 min-w-[80px] text-center">
                      {calendarDate.toLocaleString(language === 'id' ? 'id-ID' : 'en-US', { month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={() => changeMonth(1)} className="p-1 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors">
                      <ChevronRight className="w-4 h-4 text-stone-400 dark:text-stone-600" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                  {(language === 'id' ? ['M', 'S', 'S', 'R', 'K', 'J', 'S'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S']).map(d => (
                    <div key={d} className="text-[10px] font-bold text-stone-300 dark:text-stone-700">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((date, idx) => {
                    if (!date) return <div key={`empty-${idx}`} />;
                    const dateStr = date.toISOString().split('T')[0];
                    const isRelapse = analyticsData.relapseSet.has(dateStr);
                    const isToday = date.toDateString() === new Date().toDateString();
                    
                    return (
                      <div 
                        key={dateStr}
                        className={`aspect-square flex items-center justify-center text-[10px] font-bold rounded-lg transition-all relative ${
                          isRelapse 
                            ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30' 
                            : isToday 
                              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30'
                              : 'text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800'
                        }`}
                      >
                        {date.getDate()}
                        {isRelapse && <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full" />}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-6 flex gap-4 justify-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                    <span className="text-[10px] font-bold text-stone-400 dark:text-stone-600 uppercase">{t.relapse}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                    <span className="text-[10px] font-bold text-stone-400 dark:text-stone-600 uppercase">{t.today}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'community' && (
            <motion.div 
              key="community"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">{t.community}</h2>
                {user && (
                  <button onClick={handleLogout} className="flex items-center gap-2 text-xs font-bold text-red-500 uppercase tracking-wider">
                    <LogOut className="w-4 h-4" /> {t.logout}
                  </button>
                )}
              </div>

              {!user ? (
                <div className="bg-white dark:bg-stone-900 p-12 rounded-[32px] shadow-sm border border-stone-100 dark:border-stone-800 text-center transition-colors">
                  <Users className="w-16 h-16 text-emerald-500 mx-auto mb-6" />
                  <h3 className="text-xl font-bold mb-2">{t.joinBrotherhood}</h3>
                  <p className="text-stone-500 dark:text-stone-400 text-sm mb-8">{t.connectOthers}</p>
                  <button 
                    onClick={handleGoogleLogin}
                    className="w-full bg-[#1A1A1A] dark:bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-stone-800 dark:hover:bg-emerald-700 transition-all flex items-center justify-center gap-3"
                  >
                    <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
                    {t.loginWithGoogle}
                  </button>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Create Post */}
                  <div className="bg-white dark:bg-stone-900 p-6 rounded-[24px] shadow-sm border border-stone-100 dark:border-stone-800 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                      <img src={user.picture} className="w-10 h-10 rounded-full" alt={user.name} />
                      <span className="font-bold text-sm">{user.name}</span>
                    </div>
                    <textarea 
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      placeholder={t.shareThoughts}
                      className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-100 dark:border-stone-700 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/30 transition-all resize-none h-24 mb-4 text-stone-900 dark:text-stone-100"
                    />
                    {newPostImage && (
                      <div className="relative mb-4">
                        <img src={newPostImage} className="w-full h-48 object-cover rounded-2xl" alt="Preview" />
                        <button 
                          onClick={() => setNewPostImage(null)}
                          className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full"
                        >
                          ×
                        </button>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <label className="cursor-pointer p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-stone-500 dark:text-stone-400">
                        <ImageIcon className="w-5 h-5" />
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </label>
                      <button 
                        onClick={createPost}
                        disabled={isPosting || (!newPostContent.trim() && !newPostImage)}
                        className="bg-emerald-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-600 transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                        {isPosting ? t.posting : <><Send className="w-4 h-4" /> {t.post}</>}
                      </button>
                    </div>
                  </div>

                  {/* Posts Feed */}
                  <div className="space-y-6">
                    {isLoadingPosts ? (
                      <div className="text-center py-12 text-stone-400 dark:text-stone-600">{t.loadingFeed}</div>
                    ) : posts.length === 0 ? (
                      <div className="text-center py-12 text-stone-400 dark:text-stone-600">{t.noPosts}</div>
                    ) : (
                      posts.map((post) => (
                        <div key={post.id} className="bg-white dark:bg-stone-900 rounded-[24px] shadow-sm border border-stone-100 dark:border-stone-800 overflow-hidden transition-colors">
                          <div className="p-5">
                            <div className="flex items-center gap-3 mb-4">
                              <img src={post.userPicture} className="w-10 h-10 rounded-full" alt={post.userName} />
                              <div>
                                <div className="font-bold text-sm">{post.userName}</div>
                                <div className="text-[10px] text-stone-400 dark:text-stone-500 uppercase font-bold">
                                  {new Date(post.createdAt).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US')}
                                </div>
                              </div>
                            </div>
                            {post.content && <p className="text-sm text-stone-800 dark:text-stone-200 leading-relaxed mb-4">{post.content}</p>}
                            {post.image && <img src={post.image} className="w-full h-64 object-cover rounded-2xl mb-4" alt="Post" />}
                            
                            {/* Comments Section */}
                            <div className="border-t border-stone-50 dark:border-stone-800 pt-4">
                              <div className="space-y-3 mb-4">
                                {post.comments.map((comment) => (
                                  <div key={comment.id} className="flex gap-3">
                                    <img src={comment.userPicture} className="w-6 h-6 rounded-full" alt={comment.userName} />
                                    <div className="bg-stone-50 dark:bg-stone-800 p-3 rounded-2xl flex-1">
                                      <div className="font-bold text-[10px] mb-1">{comment.userName}</div>
                                      <p className="text-xs text-stone-700 dark:text-stone-300">{comment.content}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="flex gap-2">
                                <input 
                                  value={commentTexts[post.id] || ''}
                                  onChange={(e) => setCommentTexts(prev => ({ ...prev, [post.id]: e.target.value }))}
                                  placeholder={t.addComment}
                                  className="flex-1 bg-stone-50 dark:bg-stone-800 border border-stone-100 dark:border-stone-700 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/30 text-stone-900 dark:text-stone-100"
                                />
                                <button 
                                  onClick={() => addComment(post.id)}
                                  className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border-t border-stone-100 dark:border-stone-800 px-6 py-4 flex justify-around items-center z-50 transition-colors">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'dashboard' ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-400 dark:text-stone-600'}`}
        >
          <Flame className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-tighter">{t.streak}</span>
        </button>
        <button 
          onClick={() => setActiveTab('badges')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'badges' ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-400 dark:text-stone-600'}`}
        >
          <Trophy className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-tighter">{t.badges}</span>
        </button>
        <button 
          onClick={() => setActiveTab('analytics')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'analytics' ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-400 dark:text-stone-600'}`}
        >
          <BarChart2 className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-tighter">{t.analysis}</span>
        </button>
        <button 
          onClick={() => setActiveTab('community')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'community' ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-400 dark:text-stone-600'}`}
        >
          <Users className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-tighter">{t.community}</span>
        </button>
        <button 
          onClick={() => setActiveTab('journal')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'journal' ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-400 dark:text-stone-600'}`}
        >
          <BookOpen className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-tighter">{t.journal}</span>
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'history' ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-400 dark:text-stone-600'}`}
        >
          <Calendar className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-tighter">{t.history}</span>
        </button>
      </nav>

      {/* Panic Modal */}
      <AnimatePresence>
        {showPanicModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPanicModal(false)}
              className="absolute inset-0 bg-red-900/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-white dark:bg-stone-900 rounded-[32px] p-8 shadow-2xl text-center transition-colors"
            >
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <Zap className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">{t.emergencyProtocol}</h2>
              <div className="space-y-4 mb-8">
                {PANIC_ADVICE.map((advice, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="p-3 bg-stone-50 dark:bg-stone-800 rounded-xl text-sm text-stone-700 dark:text-stone-300 font-medium"
                  >
                    {advice}
                  </motion.div>
                ))}
              </div>
              <button 
                onClick={() => setShowPanicModal(false)}
                className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold hover:bg-red-700 transition-all"
              >
                {t.strongerThanThis}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Relapse Modal */}
      <AnimatePresence>
        {showRelapseModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRelapseModal(false)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="relative w-full max-w-md bg-white dark:bg-stone-900 rounded-[32px] p-8 shadow-2xl transition-colors"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold mb-2">{t.honestyFirst}</h2>
                <p className="text-stone-500 dark:text-stone-400 text-sm">{t.relapseNote}</p>
              </div>

              <div className="mb-6">
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2 block">{t.whatHappened}</label>
                <textarea 
                  value={relapseNote}
                  onChange={(e) => setRelapseNote(e.target.value)}
                  placeholder={t.identifyTrigger}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-100 dark:border-stone-700 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900/30 transition-all resize-none h-24 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowRelapseModal(false)}
                  className="flex-1 py-4 rounded-2xl font-bold text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                >
                  {t.cancel}
                </button>
                <button 
                  onClick={handleRelapse}
                  className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-bold hover:bg-red-600 transition-all active:scale-95 shadow-lg shadow-red-200 dark:shadow-none"
                >
                  {t.resetStreak}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
