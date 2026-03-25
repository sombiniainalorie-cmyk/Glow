import React, { useState, useEffect, useContext, Component, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  MessageCircle, 
  User, 
  Settings, 
  LogOut, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  CreditCard,
  Search,
  Send,
  ShieldCheck,
  Shield,
  X,
  ShieldAlert,
  ChevronRight,
  ChevronLeft,
  Star,
  HelpCircle,
  Camera,
  Bell,
  ThumbsUp,
  ThumbsDown,
  Filter,
  ArrowUpDown,
  Trash2,
  Info,
  Lightbulb,
  Menu,
  Sparkles,
  Wand2,
  Target,
  ArrowRight,
  Globe,
  PenTool,
  Briefcase,
  Flag,
  MoreHorizontal,
  Grid
} from 'lucide-react';
import { io } from 'socket.io-client';
import { GoogleGenAI, Type } from "@google/genai";
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Components ---

class AppErrorBoundary extends (Component as any) {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("AppErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-offwhite">
          <div className="card max-w-md w-full text-center space-y-6">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-2xl font-serif">Oups ! Quelque chose s'est mal passé.</h2>
            <p className="text-anthracite/60">
              Une erreur inattendue est survenue. Veuillez rafraîchir la page ou réessayer plus tard.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="btn-primary w-full"
            >
              Rafraîchir la page
            </button>
            <pre className="text-left text-[8px] bg-black/5 p-2 rounded-lg overflow-auto max-h-20 opacity-50">
              {this.state.error?.toString()}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const LazyImage = ({ 
  src, 
  alt, 
  className, 
  referrerPolicy = "no-referrer", 
  loading = "lazy",
  userId
}: { 
  src?: string | null, 
  alt: string, 
  className?: string, 
  referrerPolicy?: React.HTMLAttributeReferrerPolicy, 
  loading?: "lazy" | "eager",
  userId?: string | number
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  // Generate a consistent placeholder based on userId or a default seed
  const placeholderUrl = `https://images.unsplash.com/photo-1511367461989-f85a21fda167?q=80&w=1000&auto=format&fit=crop`;
  const finalSrc = src || placeholderUrl;

  return (
    <div className={cn("relative overflow-hidden w-full h-full bg-beige/20", className)}>
      {!isLoaded && !error && (
        <div className="absolute inset-0 bg-white/5 backdrop-blur-sm animate-pulse flex items-center justify-center">
          <Heart size={24} className="text-terracotta/10" />
        </div>
      )}
      <img
        src={error ? placeholderUrl : finalSrc}
        alt={alt}
        className={cn(
          "w-full h-full object-cover transition-all duration-1000 ease-out",
          isLoaded ? "opacity-100 scale-100 blur-0" : "opacity-0 scale-110 blur-xl"
        )}
        onLoad={() => setIsLoaded(true)}
        onError={() => setError(true)}
        loading={loading}
        referrerPolicy={referrerPolicy}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </div>
  );
};

const ThemedModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Confirmer", 
  cancelText = "Annuler",
  type = "info"
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onConfirm: () => void, 
  title: string, 
  message: string, 
  confirmText?: string, 
  cancelText?: string,
  type?: "info" | "danger" | "success"
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-anthracite/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-beige w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-white/10"
          >
            <div className={cn(
              "p-6 text-white flex items-center gap-4",
              type === 'danger' ? "bg-indigo-500" : type === 'success' ? "bg-green-600" : "bg-terracotta"
            )}>
              <div className="p-2 bg-white/20 rounded-xl">
                {type === 'danger' ? <ShieldAlert size={24} /> : type === 'success' ? <CheckCircle size={24} /> : <Sparkles size={24} />}
              </div>
              <h3 className="text-xl font-serif font-bold">{title}</h3>
            </div>
            
            <div className="p-8">
              <p className="text-anthracite/70 leading-relaxed mb-8">
                {message}
              </p>
              
              <div className="flex gap-4">
                <button 
                  onClick={onClose}
                  className="flex-1 py-4 rounded-xl font-bold text-anthracite/40 hover:bg-black/5 transition-colors"
                >
                  {cancelText}
                </button>
                <button 
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className={cn(
                    "flex-1 py-4 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95",
                    type === 'danger' ? "bg-indigo-500 shadow-indigo-500/20" : type === 'success' ? "bg-green-600 shadow-green-600/20" : "bg-terracotta shadow-terracotta/20"
                  )}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// --- API Service ---
const API_URL = '';
const getAuthHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json'
});

// --- Push Notification Service ---
const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

const subscribeToPush = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    const response = await fetch('/api/push/key');
    const { publicKey } = await response.json();
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });

    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ subscription })
    });
    console.log('Push subscription successful');
  } catch (err) {
    console.error('Push subscription failed:', err);
  }
};

const ETHNICITIES = [
  "Antakarana", "Tsimihety", "Sihanaka", "Betsimisaraka", "Merina", 
  "Bezanozano", "Sakalava", "Betsileo", "Tanala", "Antemoro", 
  "Bara", "Antefasy", "Vezo", "Antambahoaka", "Mahafaly", 
  "Antasaka", "Antandroy", "Antandosy", "Autre", "Étranger"
];

const SKIN_COLORS = ["Claire", "Hâlée", "Brune", "Ebène"];
const HAIR_TYPES = ["Lisse", "Bouclé", "Ondulé", "Frisé", "Chauve"];
const CITIES = ["Antananarivo", "Toamasina", "Antsirabe", "Fianarantsoa", "Mahajanga", "Toliara", "Antsiranana", "Autre"];

// --- Types ---
interface Toast {
  id: string;
  message: string;
  type: 'error' | 'success' | 'info';
  reason?: string;
}

const ToastContext = React.createContext<{
  addToast: (message: string, type: 'error' | 'success' | 'info', reason?: string) => void;
}>({ addToast: () => {} });

const ToastContainer = ({ toasts, removeToast }: { toasts: Toast[], removeToast: (id: string) => void }) => (
  <div className="fixed bottom-8 right-8 z-[200] flex flex-col gap-4 pointer-events-none">
    <AnimatePresence>
      {toasts.map((toast) => (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, x: 50, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, x: 0, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, x: 20, transition: { duration: 0.2 } }}
          className={cn(
            "pointer-events-auto flex items-start gap-4 p-5 rounded-[2rem] shadow-2xl border min-w-[340px] max-w-md",
            "bg-beige/95 backdrop-blur-md border-white/20"
          )}
        >
          <div className={cn(
            "p-3 rounded-2xl shadow-inner",
            toast.type === 'error' ? "bg-terracotta/10 text-terracotta" : 
            toast.type === 'success' ? "bg-emerald-500/10 text-emerald-600" : 
            "bg-anthracite/5 text-anthracite/60"
          )}>
            {toast.type === 'error' ? <ShieldAlert size={24} /> : 
             toast.type === 'success' ? <CheckCircle size={24} /> : 
             <Sparkles size={24} />}
          </div>
          <div className="flex-1 pt-1">
            <p className="text-base font-serif font-bold text-anthracite leading-tight">{toast.message}</p>
            {toast.reason && (
              <p className="text-sm text-anthracite/50 mt-1.5 leading-relaxed font-medium">
                {toast.reason}
              </p>
            )}
          </div>
          <button 
            onClick={() => removeToast(toast.id)}
            className="p-2 hover:bg-black/5 rounded-xl transition-all text-anthracite/20 hover:text-anthracite/40 active:scale-90"
          >
            <X size={18} />
          </button>
        </motion.div>
      ))}
    </AnimatePresence>
  </div>
);

// --- Components ---

const StaticPage = ({ title, content }: { title: string, content: React.ReactNode }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="max-w-4xl mx-auto py-20 px-4"
  >
    <h1 className="text-4xl font-serif mb-8 text-anthracite border-b pb-4">{title}</h1>
    <div className="text-anthracite/80 leading-relaxed space-y-6 text-lg">
      {content}
    </div>
  </motion.div>
);

const StatusGuard = ({ user, onLogout, children }: { user: any, onLogout?: () => void, children: React.ReactNode }) => {
  if (!user) return <Navigate to="/login" />;

  if (user.status === 'expired') return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <ShieldAlert size={60} className="text-indigo-500 mb-4" />
      <h2 className="text-2xl font-serif mb-2">Votre abonnement a expiré</h2>
      <p className="text-anthracite/60 mb-6">Votre accès de 30 jours est terminé. Réabonnez-vous pour continuer à découvrir vos affinités.</p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Link to="/subscription" className="btn-primary">Se réabonner (2 000 Ar)</Link>
        {onLogout && (
          <button onClick={onLogout} className="btn-secondary flex items-center justify-center gap-2">
            <LogOut size={18} />
            Se déconnecter
          </button>
        )}
      </div>
    </div>
  );

  if (user.status === 'pending') return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <Clock size={60} className="text-yellow-500 mb-4 animate-pulse" />
      <h2 className="text-2xl font-serif mb-2">Paiement en cours de validation</h2>
      <p className="text-anthracite/60 mb-6">Nous avons bien reçu votre demande. Votre compte sera activé sous 24h après vérification de votre transfert.</p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Link to="/profile" className="btn-secondary">Voir mon profil</Link>
        <button onClick={() => window.location.reload()} className="btn-primary">Actualiser</button>
        {onLogout && (
          <button onClick={onLogout} className="btn-secondary flex items-center justify-center gap-2">
            <LogOut size={18} />
            Se déconnecter
          </button>
        )}
      </div>
    </div>
  );

  if (user.status === 'inactive') return <Navigate to="/subscription" />;

  if (user.status !== 'active') return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <Heart size={60} className="text-terracotta mb-4" />
      <h2 className="text-2xl font-serif mb-2">Merci pour votre confiance</h2>
      <p className="text-anthracite/60 mb-6">Votre compte est en attente d'activation. Vous recevrez une notification dès que vous pourrez commencer vos rencontres.</p>
      {onLogout && (
        <button onClick={onLogout} className="btn-secondary flex items-center justify-center gap-2">
          <LogOut size={18} />
          Se déconnecter
        </button>
      )}
    </div>
  );

  return <>{children}</>;
};

const HelpModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-anthracite/20 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-beige rounded-3xl p-8 max-w-lg w-full shadow-2xl relative"
        >
          <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-black/5 rounded-full">
            <X size={20} />
          </button>
          <h2 className="text-3xl font-serif mb-6 flex items-center gap-2">
            <HelpCircle className="text-terracotta" />
            Guide d'utilisation
          </h2>
          <div className="space-y-6 text-anthracite/80 overflow-y-auto max-h-[60vh] pr-2">
            <section>
              <h3 className="font-bold text-anthracite mb-2 flex items-center gap-2">
                <Heart size={18} className="text-terracotta" />
                Découverte & Affinité
              </h3>
              <p className="text-sm">Nous vous présentons uniquement des profils avec qui vous avez au moins 70% de compatibilité basée sur vos critères et personnalités.</p>
            </section>
            <section>
              <h3 className="font-bold text-anthracite mb-2 flex items-center gap-2">
                <ThumbsUp size={18} className="text-terracotta" />
                Liker / Passer
              </h3>
              <p className="text-sm">Utilisez le pouce levé pour montrer votre intérêt ou le pouce vers le bas pour passer au profil suivant. Si l'intérêt est mutuel, c'est un match !</p>
            </section>
            <section>
              <h3 className="font-bold text-anthracite mb-2 flex items-center gap-2">
                <ShieldCheck size={18} className="text-indigo-500" />
                Bouton Bloquer
              </h3>
              <p className="text-sm">Si un utilisateur vous importune, bloquez-le. Il ne pourra plus vous voir ni vous contacter.</p>
            </section>
            <section>
              <h3 className="font-bold text-anthracite mb-2 flex items-center gap-2">
                <ShieldAlert size={18} className="text-orange-500" />
                Signaler un compte
              </h3>
              <p className="text-sm">Si vous suspectez une arnaque ou un comportement malveillant, utilisez le bouton "Signaler". Les comptes signalés plus de 10 fois sont examinés par l'administration.</p>
            </section>
            <section>
              <h3 className="font-bold text-anthracite mb-2 flex items-center gap-2">
                <CreditCard size={18} className="text-terracotta" />
                Abonnement
              </h3>
              <p className="text-sm">L'abonnement est de 2 000 Ar pour 30 jours. Passé ce délai, votre accès sera restreint jusqu'au prochain réabonnement.</p>
            </section>
          </div>
          <button onClick={onClose} className="btn-primary w-full mt-8">J'ai compris</button>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

const LogoutModal = ({ isOpen, onClose, onConfirm }: { isOpen: boolean, onClose: () => void, onConfirm: () => void }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-anthracite/20 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-beige rounded-[3rem] p-10 max-w-md w-full shadow-2xl relative border border-white/10 text-center"
        >
          <div className="w-20 h-20 bg-terracotta/10 rounded-full flex items-center justify-center mx-auto mb-8">
            <LogOut size={40} className="text-terracotta" />
          </div>
          
          <h2 className="text-3xl font-serif mb-4 text-anthracite">Déjà envie de nous quitter ?</h2>
          <p className="text-anthracite/60 mb-10 leading-relaxed">
            Votre prochaine belle rencontre n'est peut-être qu'à un clic. Êtes-vous sûr de vouloir vous déconnecter maintenant ?
          </p>
          
          <div className="flex flex-col gap-4">
            <button 
              onClick={onConfirm}
              className="btn-primary py-4 text-lg"
            >
              Oui, me déconnecter
            </button>
            <button 
              onClick={onClose}
              className="btn-secondary py-4 text-lg border-transparent hover:bg-black/5"
            >
              Rester encore un peu
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

const ReportModal = ({ isOpen, onClose, targetId, targetName }: { isOpen: boolean, onClose: () => void, targetId: number, targetName: string }) => {
  const { addToast } = useContext(ToastContext);
  const [reason, setReason] = useState('Arnaque / Faux profil');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    const res = await fetch('/api/report', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reportedId: targetId, reason, details })
    });
    if (res.ok) {
      addToast("Signalement reçu", "success", "Votre vigilance nous aide à maintenir l'excellence de notre communauté.");
      onClose();
    }
    setLoading(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-anthracite/40 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-beige rounded-3xl p-8 max-w-md w-full shadow-2xl relative"
          >
            <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-black/5 rounded-full">
              <X size={20} />
            </button>
            <h2 className="text-2xl font-serif mb-2 flex items-center gap-2">
              <ShieldAlert className="text-indigo-500" />
              Signaler {targetName}
            </h2>
            <p className="text-sm text-anthracite/60 mb-6">Aidez-nous à garder <span translate="no">Affinity70</span> sûr et authentique.</p>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase text-anthracite/40 mb-1 px-1">Raison du signalement</label>
                <ChoiceGrid 
                  options={["Arnaque / Faux profil", "Comportement inapproprié", "Harcèlement", "Contenu offensant", "Autre"]} 
                  value={reason} 
                  onChange={setReason} 
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-anthracite/40 mb-1">Détails supplémentaires</label>
                <textarea 
                  className="w-full p-3 rounded-xl border border-black/10 outline-none focus:ring-2 focus:ring-indigo-500/20 h-32"
                  placeholder="Décrivez ce qui s'est passé..."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                />
              </div>
              <div className="bg-indigo-50 p-4 rounded-xl text-xs text-indigo-600 italic">
                Rappel : Signaler un compte pour de fausses raisons peut entraîner la suspension de votre propre compte.
              </div>
              <button 
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-indigo-500 text-white py-4 rounded-xl font-bold hover:bg-indigo-600 transition-all disabled:opacity-50"
              >
                {loading ? "Envoi..." : "Envoyer le signalement"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const SuggestionModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const { addToast } = useContext(ToastContext);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ content })
      });
      if (res.ok) {
        setSent(true);
        addToast("Suggestion envoyée", "success", "Merci pour votre suggestion !");
        setTimeout(() => {
          setSent(false);
          setContent('');
          onClose();
        }, 2000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-anthracite/40 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-beige rounded-3xl p-8 max-w-md w-full shadow-2xl relative border border-white/5"
          >
            <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-black/5 rounded-full">
              <X size={20} />
            </button>
            <h2 className="text-2xl font-serif mb-2 flex items-center gap-2 text-anthracite">
              <Lightbulb className="text-terracotta" />
              Vos idées comptent
            </h2>
            <p className="text-sm text-anthracite/60 mb-6">Suggérez des idées pour rénover et améliorer <span translate="no">Affinity70</span>. Vos suggestions apparaîtront dans ma boîte d'administrateur.</p>
            
            {sent ? (
              <div className="py-8 text-center space-y-4">
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="text-green-500" size={32} />
                </div>
                <p className="font-bold text-green-600">Merci ! Votre idée a été envoyée.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <textarea 
                  className="w-full p-4 rounded-2xl border border-white/10 bg-offwhite/50 text-anthracite outline-none focus:ring-2 focus:ring-terracotta/20 h-40 resize-none"
                  placeholder="Partagez votre idée ici..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
                <button 
                  onClick={handleSubmit}
                  disabled={loading || !content.trim()}
                  className="btn-primary w-full py-4 mt-2 flex items-center justify-center gap-2"
                >
                  {loading ? "Envoi..." : (
                    <>
                      <Send size={18} />
                      Envoyer ma suggestion
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const DatingAssistant = ({ isOpen, onClose, user }: { isOpen: boolean, onClose: () => void, user: any }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
    { role: 'assistant', content: "Bonjour ! Je suis votre assistant Affinity70. Comment puis-je vous aider aujourd'hui ? Je peux vous aider à améliorer votre bio, suggérer des sujets de discussion ou analyser votre compatibilité avec d'autres profils." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        setMessages(prev => [...prev, { role: 'assistant', content: "L'assistant IA n'est pas configuré. Veuillez contacter le support." }]);
        setLoading(false);
        return;
      }
      const ai = new GoogleGenAI({ apiKey });
      const model = "gemini-3-flash-preview";
      
      const chat = ai.chats.create({
        model,
        config: {
          systemInstruction: `Tu es l'assistant d'Affinity70, une application de rencontre premium à Madagascar. 
          Ton but est d'aider les utilisateurs à réussir leurs rencontres. 
          Sois élégant, bienveillant, et donne des conseils personnalisés. 
          L'application se concentre sur une compatibilité de 70% et plus. 
          L'utilisateur actuel a l'ID ${user?.id}. 
          Réponds toujours en français. 
          Garde tes réponses concises et encourageantes.`,
        }
      });

      const response = await chat.sendMessage({ message: userMessage });
      setMessages(prev => [...prev, { role: 'assistant', content: response.text || "Désolé, je n'ai pas pu générer de réponse." }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: "Une erreur est survenue. Veuillez réessayer plus tard." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-anthracite/40 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="bg-beige w-full max-w-lg h-[80dvh] sm:h-[600px] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-white/5"
          >
            <div className="p-6 bg-terracotta text-beige flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h2 className="font-serif text-xl font-bold">Assistant Affinity70</h2>
                  <p className="text-xs text-beige/70">Propulsé par l'IA</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-offwhite/50">
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
                      msg.role === 'user' 
                        ? "bg-terracotta text-beige rounded-tr-none" 
                        : "bg-white text-beige rounded-tl-none border border-black/5"
                    )}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-black/5 flex gap-1">
                    <div className="w-1.5 h-1.5 bg-terracotta/40 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-terracotta/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1.5 h-1.5 bg-terracotta/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-white border-t border-black/5">
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Posez votre question..."
                  className="flex-1 p-4 bg-offwhite rounded-xl outline-none focus:ring-2 focus:ring-terracotta/20 text-sm"
                />
                <button 
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className="p-4 bg-terracotta text-beige rounded-xl hover:bg-terracotta/90 transition-all disabled:opacity-50"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const Navbar = ({ user, onLogout, socket }: { user: any, onLogout: () => void, socket: any }) => {
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (user) {
      fetch('/api/notifications', { headers: getAuthHeaders() })
        .then(res => res.json())
        .then(setNotifications);

      if (socket) {
        socket.on('newNotification', (notif: any) => {
          setNotifications(prev => [notif, ...prev]);
        });
        
        return () => {
          socket.off('newNotification');
        };
      }
    }
  }, [user, socket]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = async () => {
    await fetch('/api/notifications/read', { method: 'POST', headers: getAuthHeaders() });
    setNotifications(notifications.map(n => ({ ...n, is_read: 1 })));
  };

  return (
    <>
      <nav className="bg-offwhite sticky top-0 z-50 border-b border-white/5 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2 group">
                <div className="w-8 h-8 bg-terracotta rounded-lg flex items-center justify-center text-white shadow-lg shadow-terracotta/20 group-hover:rotate-12 transition-transform">
                  <Heart size={18} fill="currentColor" />
                </div>
                <span className="text-xl font-serif font-bold text-anthracite tracking-tight" translate="no">Affinity70</span>
              </Link>

              <div className="hidden lg:flex items-center gap-8">
                {user ? (
                  <>
                    <Link to="/discover" className="text-xs font-bold text-anthracite/60 hover:text-terracotta transition-colors uppercase tracking-widest">Découvrir</Link>
                    <Link to="/favorites" className="text-xs font-bold text-anthracite/60 hover:text-terracotta transition-colors uppercase tracking-widest">Favoris</Link>
                    <Link to="/chat" className="text-xs font-bold text-anthracite/60 hover:text-terracotta transition-colors uppercase tracking-widest">Messages</Link>
                    <Link to="/profile" className="text-xs font-bold text-anthracite/60 hover:text-terracotta transition-colors uppercase tracking-widest">Profil</Link>
                  </>
                ) : (
                  <Link to="/about" className="text-xs font-bold text-anthracite/60 hover:text-terracotta transition-colors uppercase tracking-widest">À propos</Link>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <div className="hidden md:flex items-center gap-6">
                    <div className="relative">
                      <button 
                        onClick={() => {
                          setShowNotifications(!showNotifications);
                          if (!showNotifications) markAsRead();
                        }}
                        className="p-2 text-anthracite/40 hover:text-terracotta transition-colors relative"
                      >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                          <span className="absolute top-1 right-1 w-4 h-4 bg-terracotta text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white">
                            {unreadCount}
                          </span>
                        )}
                      </button>
                      
                      <AnimatePresence>
                        {showNotifications && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute right-0 mt-2 w-80 bg-beige rounded-2xl shadow-xl border border-white/5 overflow-hidden"
                          >
                            <div className="p-4 border-b border-black/5 font-bold">Notifications</div>
                            <div className="max-h-96 overflow-y-auto">
                              {notifications.length === 0 ? (
                                <div className="p-8 text-center text-anthracite/40 text-sm">Aucune notification</div>
                              ) : (
                                notifications.map(n => (
                                  <div key={n.id} className={cn("p-4 text-sm border-b border-black/5 last:border-0", !n.is_read && "bg-beige/20")}>
                                    {n.message}
                                    <div className="text-[10px] text-anthracite/40 mt-1">
                                      {new Date(n.created_at).toLocaleDateString()}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {user.role === 'admin' && (
                      <Link to="/admin" className="flex items-center gap-1 bg-terracotta/10 text-terracotta px-3 py-1 rounded-full font-bold hover:bg-terracotta hover:text-white transition-all text-xs">
                        <ShieldCheck size={14} />
                        Admin
                      </Link>
                    )}
                    
                    <button onClick={() => setIsHelpOpen(true)} className="p-2 text-anthracite/40 hover:text-terracotta transition-colors" title="Aide">
                      <HelpCircle size={20} />
                    </button>
                    
                    <button 
                      onClick={() => setIsSuggestionOpen(true)} 
                      className="p-2 text-yellow-500 hover:text-yellow-400 transition-all relative group" 
                      title="Suggérer une idée"
                    >
                      <Lightbulb size={24} className="relative z-10 drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]" />
                    </button>
                  </div>

                  <button 
                    onClick={() => setIsSideMenuOpen(true)}
                    className="p-2 bg-white/5 text-anthracite/60 hover:text-terracotta hover:bg-white/10 rounded-lg transition-all flex items-center gap-2 group border border-white/5"
                  >
                    <Menu size={20} />
                    <span className="hidden sm:inline text-[10px] font-black uppercase tracking-[0.2em]">Menu</span>
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-4">
                  <Link to="/login" className="text-sm font-bold text-anthracite/70 hover:text-terracotta transition-colors">Connexion</Link>
                  <Link to="/register" className="btn-primary py-2 text-sm">S'inscrire</Link>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <AnimatePresence>
          {isSideMenuOpen && (

            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSideMenuOpen(false)}
                className="fixed inset-0 bg-anthracite/40 backdrop-blur-sm z-[100]"
              />
              <motion.div 
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                className="fixed top-0 left-0 bottom-0 w-80 bg-offwhite z-[110] shadow-2xl p-8 flex flex-col border-r border-white/5"
              >
                <div className="flex justify-between items-center mb-12">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-terracotta rounded-lg flex items-center justify-center text-white">
                      <Heart size={18} fill="currentColor" />
                    </div>
                    <span className="text-xl font-serif font-bold text-anthracite" translate="no">Affinity70</span>
                  </div>
                  <button onClick={() => setIsSideMenuOpen(false)} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                    <X size={20} />
                  </button>
                </div>
                
                <div className="flex flex-col gap-6">
                  <Link to="/" onClick={() => setIsSideMenuOpen(false)} className="text-lg font-bold text-anthracite/90 hover:text-terracotta transition-colors flex items-center gap-3">
                    <Heart size={20} className="text-terracotta" /> Accueil
                  </Link>
                  {user && (
                    <>
                      <Link to="/discover" onClick={() => setIsSideMenuOpen(false)} className="text-lg font-bold text-anthracite/90 hover:text-terracotta transition-colors flex items-center gap-3">
                        <Search size={20} className="text-terracotta" /> Découvrir
                      </Link>
                      <Link to="/favorites" onClick={() => setIsSideMenuOpen(false)} className="text-lg font-bold text-anthracite/90 hover:text-terracotta transition-colors flex items-center gap-3">
                        <Heart size={20} className="text-terracotta" /> Favoris
                      </Link>
                      <Link to="/chat" onClick={() => setIsSideMenuOpen(false)} className="text-lg font-bold text-anthracite/90 hover:text-terracotta transition-colors flex items-center gap-3">
                        <MessageCircle size={20} className="text-terracotta" /> Messages
                      </Link>
                      <Link to="/profile" onClick={() => setIsSideMenuOpen(false)} className="text-lg font-bold text-anthracite/90 hover:text-terracotta transition-colors flex items-center gap-3">
                        <User size={20} className="text-terracotta" /> Mon Profil
                      </Link>
                    </>
                  )}
                  <Link to="/about" onClick={() => setIsSideMenuOpen(false)} className="text-lg font-bold text-anthracite/90 hover:text-terracotta transition-colors flex items-center gap-3">
                    <Info size={20} className="text-terracotta" /> À propos
                  </Link>
                  {user?.status !== 'active' && (
                    <Link to="/payment-terms" onClick={() => setIsSideMenuOpen(false)} className="text-lg font-bold text-anthracite/90 hover:text-terracotta transition-colors flex items-center gap-3">
                      <CreditCard size={20} className="text-terracotta" /> Abonnement
                    </Link>
                  )}
                  <Link to="/privacy" onClick={() => setIsSideMenuOpen(false)} className="text-lg font-bold text-anthracite/90 hover:text-terracotta transition-colors flex items-center gap-3">
                    <Shield size={20} className="text-terracotta" /> Confidentialité
                  </Link>
                  <Link to="/terms" onClick={() => setIsSideMenuOpen(false)} className="text-lg font-bold text-anthracite/90 hover:text-terracotta transition-colors flex items-center gap-3">
                    <ShieldAlert size={20} className="text-terracotta" /> Conditions
                  </Link>
                  {user?.role === 'admin' && (
                    <Link to="/admin" onClick={() => setIsSideMenuOpen(false)} className="text-lg font-bold text-terracotta hover:text-accent-hover transition-colors flex items-center gap-3 border-t border-black/5 pt-6 mt-4">
                      <ShieldCheck size={20} /> Administration
                    </Link>
                  )}
                  {user && (
                    <button onClick={() => { onLogout(); setIsSideMenuOpen(false); }} className="text-lg font-bold text-indigo-500 hover:text-indigo-400 transition-colors flex items-center gap-3 border-t border-black/5 pt-6">
                      <LogOut size={20} /> Quitter
                    </button>
                  )}
                </div>
                
                <div className="mt-auto pt-8 border-t border-black/5 space-y-4">
                  <div>
                    <h3 className="text-xl font-serif font-bold text-anthracite mb-2" translate="no">Affinity70</h3>
                    <p className="text-xs text-anthracite/60 leading-relaxed">
                      La première plateforme de rencontre à Madagascar basée sur une compatibilité réelle de 70% et plus. Sécurité, élégance et authenticité.
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-anthracite/40 mb-2">Contact</h4>
                    <p className="text-xs text-anthracite/60">Support : <a href="tel:+261389326331" className="hover:text-terracotta transition-colors">038 93 263 31</a></p>
                    <p className="text-xs text-anthracite/60">Email : <a href="mailto:Our@affinity70.mg" className="hover:text-terracotta transition-colors">Our@affinity70.mg</a></p>
                    <p className="text-xs text-anthracite/60 font-medium">Antananarivo, Madagascar</p>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

      </nav>
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <SuggestionModal isOpen={isSuggestionOpen} onClose={() => setIsSuggestionOpen(false)} />
    </>
  );
};

const Hero = ({ user, onLogout }: { user: any, onLogout: () => void }) => (
  <section className="relative h-[90dvh] flex items-center justify-center overflow-hidden bg-offwhite">
    <div className="absolute inset-0 z-0">
      <img 
        src="https://images.unsplash.com/photo-1511733334857-e82f662407fb?auto=format&fit=crop&q=80&w=1200" 
        className="w-full h-full object-cover opacity-10 grayscale"
        alt=""
        loading="eager"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-offwhite via-transparent to-offwhite"></div>
    </div>
    <div className="relative z-10 text-center max-w-4xl px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="inline-block mb-8"
      >
        <div className="bg-terracotta/10 text-terracotta px-6 py-2 rounded-full text-sm font-black uppercase tracking-[0.4em] border border-terracotta/20">
          Madagascar Premium
        </div>
      </motion.div>
      <motion.h1 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-7xl md:text-9xl font-serif text-anthracite mb-8 tracking-tighter"
      >
        <span translate="no">Affinity70</span>
      </motion.h1>
      <motion.p 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-2xl md:text-3xl text-anthracite/50 mb-12 font-serif italic"
      >
        “L’essentiel commence à 70%.”
      </motion.p>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col sm:flex-row gap-6 justify-center"
      >
        {user ? (
          <>
            <Link to="/profile" className="btn-primary text-xl px-12 py-5 flex items-center justify-center gap-2">
              <User size={24} />
              Voir mon profil
            </Link>
            <Link to="/discover" className="btn-secondary text-xl px-12 py-5 flex items-center justify-center gap-2">
              <Search size={24} />
              Découvrir
            </Link>
            <button 
              onClick={onLogout}
              className="px-12 py-5 text-xl font-bold text-anthracite/40 hover:text-terracotta transition-colors flex items-center justify-center gap-2"
            >
              <LogOut size={24} />
              Se déconnecter
            </button>
          </>
        ) : (
          <>
            <Link to="/register" className="btn-primary text-xl px-12 py-5">Commencer l'aventure</Link>
            <Link to="/subscription" className="btn-secondary text-xl px-12 py-5">S'abonner</Link>
          </>
        )}
      </motion.div>
    </div>
  </section>
);

// --- Pages ---

const Login = ({ setUser }: { setUser: (u: any) => void }) => {
  const { addToast } = useContext(ToastContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('token', data.token);
      const userObj = { id: data.userId, role: data.role, status: data.status, email_verified: data.emailVerified };
      setUser(userObj);
      if (data.role === 'admin') navigate('/admin');
      else if (data.status === 'active') navigate('/discover');
      else navigate('/subscription');
    } else {
      addToast("Échec de connexion", "error", data.error || "Email ou mot de passe incorrect.");
    }
  };

  return (
    <div className="min-h-[80dvh] flex items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card w-full max-w-md"
      >
        <h2 className="text-3xl font-serif text-center mb-8">Bon retour</h2>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input 
              type="email" 
              className="w-full p-3 rounded-xl border border-black/10 focus:ring-2 focus:ring-terracotta outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">Mot de passe</label>
              <Link to="/forgot-password" title="Mot de passe oublié ?" className="text-xs text-terracotta hover:underline">Oublié ?</Link>
            </div>
            <input 
              type="password" 
              className="w-full p-3 rounded-xl border border-black/10 focus:ring-2 focus:ring-terracotta outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full py-4 text-lg">Se connecter</button>
        </form>
        <p className="mt-6 text-center text-sm text-anthracite/60">
          Pas encore de compte ? <Link to="/register" className="text-terracotta font-bold">S'inscrire</Link>
        </p>
      </motion.div>
    </div>
  );
};

const ForgotPassword = () => {
  const { addToast } = useContext(ToastContext);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok) {
        setSent(true);
        addToast("Lien envoyé", "success", "Un email de réinitialisation a été envoyé à votre adresse.");
      } else {
        addToast("Oups", "error", data.error || "Nous n'avons pas pu trouver de compte avec cet email.");
      }
    } catch (err) {
      addToast("Erreur", "error", "Impossible de contacter le serveur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80dvh] flex items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card w-full max-w-md"
      >
        <h2 className="text-3xl font-serif text-center mb-4">Mot de passe oublié</h2>
        {sent ? (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle size={32} />
            </div>
            <p className="text-anthracite/70">Si un compte est associé à cet email, vous recevrez un lien de réinitialisation sous peu.</p>
            <Link to="/login" className="btn-primary block w-full py-4">Retour à la connexion</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <p className="text-sm text-anthracite/60 text-center">Entrez votre adresse email pour recevoir un lien de réinitialisation.</p>
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input 
                type="email" 
                className="w-full p-3 rounded-xl border border-black/10 focus:ring-2 focus:ring-terracotta outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-lg disabled:opacity-50">
              {loading ? "Envoi..." : "Envoyer le lien"}
            </button>
            <div className="text-center">
              <Link to="/login" className="text-sm text-terracotta font-bold">Retour à la connexion</Link>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};

const ResetPassword = () => {
  const { addToast } = useContext(ToastContext);
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      addToast("Erreur", "error", "Les mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 6) {
      addToast("Erreur", "error", "Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      const data = await res.json();
      if (res.ok) {
        addToast("Mot de passe mis à jour", "success", "Votre nouveau mot de passe est prêt. Vous pouvez maintenant vous connecter.");
        navigate('/login');
      } else {
        addToast("Lien expiré", "error", data.error || "Ce lien de réinitialisation n'est plus valide.");
      }
    } catch (err) {
      addToast("Erreur", "error", "Impossible de contacter le serveur");
    } finally {
      setLoading(false);
    }
  };

  if (!token) return <Navigate to="/login" />;

  return (
    <div className="min-h-[80dvh] flex items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card w-full max-w-md"
      >
        <h2 className="text-3xl font-serif text-center mb-8">Nouveau mot de passe</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Nouveau mot de passe</label>
            <input 
              type="password" 
              className="w-full p-3 rounded-xl border border-black/10 focus:ring-2 focus:ring-terracotta outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Confirmer le mot de passe</label>
            <input 
              type="password" 
              className="w-full p-3 rounded-xl border border-black/10 focus:ring-2 focus:ring-terracotta outline-none"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-lg disabled:opacity-50">
            {loading ? "Réinitialisation..." : "Réinitialiser le mot de passe"}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const ChoiceGrid = ({ 
  options, 
  value, 
  onChange, 
  columns = 2,
  dark = false
}: { 
  options: string[], 
  value: string, 
  onChange: (val: string) => void,
  columns?: number,
  dark?: boolean
}) => {
  return (
    <div className={cn(
      "grid gap-2",
      columns === 2 ? "grid-cols-2" : columns === 3 ? "grid-cols-3" : "grid-cols-1"
    )}>
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            "p-3 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 border text-center",
            value === opt 
              ? "bg-terracotta text-white border-terracotta shadow-lg shadow-terracotta/20 scale-[1.02]" 
              : dark 
                ? "bg-white/5 text-white/70 border-white/5 hover:border-terracotta/30 hover:bg-terracotta/5"
                : "bg-white text-anthracite/70 border-black/5 hover:border-terracotta/30 hover:bg-terracotta/5"
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
};

const Register = ({ setUser }: { setUser: (u: any) => void }) => {
  const { addToast } = useContext(ToastContext);
  const [step, setStep] = useState(0);
  const [photos, setPhotos] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    email: '', password: '', firstName: '', lastName: '', gender: 'Femme',
    age: 16, height: 160, hobbies: '', bio: '', talent: '', religion: 'Protestant(e)',
    ethnicity: ETHNICITIES[0], hairType: HAIR_TYPES[0], skinColor: SKIN_COLORS[0], physique: 'Svelte',
    jealous: 'Non', personality: 'Introverti(e)', hasChildren: 'Non',
    occupationStatus: 'Étudiant(e)', city: CITIES[0], orientation: 'Hétéro',
    funQuestion: '', seriousQuestion: ''
  });
  const [prefs, setPrefs] = useState({
    minAge: 16, maxAge: 35, height: 170, hobbies: '', religion: 'Indifférent',
    ethnicity: 'Indifférent', hairType: 'Indifférent', skinColor: 'Indifférent', physique: 'Indifférent',
    occupationStatus: 'Indifférent', city: 'Indifférent', hasChildren: 'Indifférent',
    jealous: 'Indifférent', personality: 'Indifférent'
  });
  const navigate = useNavigate();

  const [regLoading, setRegLoading] = useState(false);

  const handleRegister = async () => {
    // Validation for the questionnaire (Step 7)
    if (!formData.funQuestion.trim() || !formData.seriousQuestion.trim()) {
      addToast("Questionnaire incomplet", "error", "Veuillez répondre à toutes les questions (FUN et SÉRIEUSE) avant de finaliser.");
      return;
    }
    if (photos.length === 0) {
      addToast("Photo manquante", "error", "Veuillez ajouter au moins une photo de profil pour finaliser votre inscription.");
      return;
    }

    setRegLoading(true);
    try {
      const authRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password })
      });
      const authData = await authRes.json();
      if (!authRes.ok) throw new Error(authData.error || "Erreur lors de l'inscription");
      
      localStorage.setItem('token', authData.token);

      // Send profile data with photos
      const profileData = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        profileData.append(key, value.toString());
      });
      (photos as File[]).forEach(p => {
        profileData.append('photos', p);
      });

      const profRes = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authData.token}` },
        body: profileData
      });
      if (!profRes.ok) throw new Error("Erreur lors de la création du profil");

      const prefRes = await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authData.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs)
      });
      if (!prefRes.ok) throw new Error("Erreur lors de l'enregistrement des préférences");

      const newUser = authData.user || authData;
      setUser({ ...newUser, status: newUser.status || 'inactive', email_verified: 1 });
      navigate('/subscription');
    } catch (err) {
      addToast("Erreur d'inscription", "error", err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setRegLoading(false);
    }
  };

  const nextStep = () => {
    // Validation for each step
    if (step === 1) {
      if (!formData.email.trim() || !formData.password.trim()) {
        addToast("Champs requis", "error", "Veuillez remplir votre email et votre mot de passe.");
        return;
      }
      if (formData.password.length < 6) {
        addToast("Mot de passe trop court", "error", "Le mot de passe doit contenir au moins 6 caractères.");
        return;
      }
    }
    if (step === 2) {
      if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.age || !formData.height) {
        addToast("Informations manquantes", "error", "Veuillez remplir toutes les informations personnelles de cette étape.");
        return;
      }
      if (formData.age < 16) {
        addToast("Âge non autorisé", "error", "Vous devez avoir au moins 16 ans pour vous inscrire sur Affinity70.");
        return;
      }
    }
    if (step === 3) {
      // All are selects with defaults
    }
    if (step === 4) {
      if (!formData.bio.trim() || !formData.hobbies.trim() || !formData.talent.trim()) {
        addToast("Détails manquants", "error", "Veuillez remplir votre bio, vos loisirs et votre talent.");
        return;
      }
    }
    if (step === 5) {
      if (!prefs.minAge || !prefs.maxAge || !prefs.height) {
        addToast("Critères manquants", "error", "Veuillez remplir vos critères d'âge et de taille.");
        return;
      }
    }
    if (step === 6) {
      if (!prefs.hobbies.trim()) {
        addToast("Loisirs requis", "error", "Veuillez indiquer les loisirs que vous recherchez chez votre partenaire.");
        return;
      }
    }
    setStep(s => s + 1);
  };
  const prevStep = () => setStep(s => s - 1);

  return (
    <div className="min-h-[80dvh] flex items-center justify-center py-12 px-4">
      <div className="card w-full max-w-2xl overflow-hidden relative">
        <div className="flex justify-between mb-8 overflow-x-auto pb-2">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((s) => (
            <div key={s} className={cn("min-w-[30px] h-1 rounded-full mx-1 transition-all duration-500", step >= s ? "bg-terracotta" : "bg-white/10")} />
          ))}
        </div>

        {step === 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-8 py-6">
            <div className="w-24 h-24 bg-terracotta/10 rounded-[2rem] flex items-center justify-center mx-auto text-terracotta shadow-2xl shadow-terracotta/20">
              <Sparkles size={48} />
            </div>
            <div>
              <h2 className="text-4xl font-serif mb-4">Bienvenue sur Affinity70</h2>
              <p className="text-anthracite/60 text-lg leading-relaxed max-w-md mx-auto">
                Ici, nous ne laissons rien au hasard. <br />
                <span className="text-terracotta font-bold">L'essentiel commence à 70%.</span>
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              <div className="bg-beige/50 p-6 rounded-3xl border border-white/5">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mb-4 shadow-sm">
                  <ShieldCheck size={20} className="text-terracotta" />
                </div>
                <h4 className="font-bold mb-1">Qualité & Sécurité</h4>
                <p className="text-xs text-anthracite/60">Chaque profil est vérifié manuellement pour garantir une expérience authentique.</p>
              </div>
              <div className="bg-beige/50 p-6 rounded-3xl border border-white/5">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mb-4 shadow-sm">
                  <Target size={20} className="text-terracotta" />
                </div>
                <h4 className="font-bold mb-1">Algorithme d'Affinité</h4>
                <p className="text-xs text-anthracite/60">Vous ne verrez que les profils avec lesquels vous avez au moins 70% de points communs.</p>
              </div>
            </div>

            <div className="pt-4">
              <button onClick={nextStep} className="btn-primary w-full py-5 text-xl flex items-center justify-center gap-3">
                Découvrir mon affinité
                <ArrowRight size={20} />
              </button>
              <p className="mt-4 text-xs text-anthracite/40">Déjà membre ? <Link to="/login" className="text-terracotta font-bold">Se connecter</Link></p>
            </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-terracotta/10 rounded-2xl flex items-center justify-center text-terracotta">
                <User size={24} />
              </div>
              <div>
                <h2 className="text-3xl font-serif">Vos accès</h2>
                <p className="text-sm text-anthracite/60">Commençons par le commencement.</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-anthracite/40 mb-2 px-1">Email professionnel ou personnel</label>
                <input type="email" placeholder="votre@email.com" className="w-full p-4 rounded-2xl border border-black/5 focus:ring-2 focus:ring-terracotta outline-none transition-all" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-anthracite/40 mb-2 px-1">Mot de passe sécurisé</label>
                <input type="password" placeholder="••••••••" className="w-full p-4 rounded-2xl border border-black/5 focus:ring-2 focus:ring-terracotta outline-none transition-all" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button onClick={prevStep} className="btn-secondary flex-1">Retour</button>
              <button onClick={nextStep} className="btn-primary flex-1">Continuer</button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-terracotta/10 rounded-2xl flex items-center justify-center text-terracotta">
                <Heart size={24} />
              </div>
              <div>
                <h2 className="text-3xl font-serif">Qui êtes-vous ?</h2>
                <p className="text-sm text-anthracite/60">Parlez-nous un peu de vous.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-anthracite/40 px-1">Prénom</label>
                <input placeholder="Ex: Mialy" className="w-full p-3 rounded-xl border border-black/5" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-anthracite/40 px-1">Nom</label>
                <input placeholder="Ex: Rakoto" className="w-full p-3 rounded-xl border border-black/5" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-anthracite/40 px-1">Genre</label>
                <ChoiceGrid options={["Femme", "Homme"]} value={formData.gender} onChange={v => setFormData({...formData, gender: v})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-anthracite/40 px-1">Âge</label>
                <input type="number" min="16" placeholder="Âge" className="w-full p-4 rounded-xl border border-black/5 focus:ring-2 focus:ring-terracotta outline-none" value={formData.age} onChange={e => setFormData({...formData, age: parseInt(e.target.value)})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-anthracite/40 px-1">Taille (cm)</label>
                <input type="number" placeholder="Ex: 165" className="w-full p-4 rounded-xl border border-black/5 focus:ring-2 focus:ring-terracotta outline-none" value={formData.height} onChange={e => setFormData({...formData, height: parseInt(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-anthracite/40 px-1">Ville</label>
                <ChoiceGrid options={CITIES} value={formData.city} onChange={v => setFormData({...formData, city: v})} columns={3} />
              </div>
              <div className="col-span-full space-y-2">
                <label className="text-[10px] font-bold uppercase text-anthracite/40 px-1">Orientation</label>
                <ChoiceGrid options={["Hétéro", "Homo", "Bi"]} value={formData.orientation} onChange={v => setFormData({...formData, orientation: v})} columns={3} />
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button onClick={prevStep} className="btn-secondary flex-1">Retour</button>
              <button onClick={nextStep} className="btn-primary flex-1">Suivant</button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-terracotta/10 rounded-2xl flex items-center justify-center text-terracotta">
                <Globe size={24} />
              </div>
              <div>
                <h2 className="text-3xl font-serif">Vos racines</h2>
                <p className="text-sm text-anthracite/60">La culture et les valeurs comptent.</p>
              </div>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-anthracite/40 px-1">Religion</label>
                <ChoiceGrid options={["Protestant(e)", "Catholique", "Adventiste", "Musulman(e)", "Autre"]} value={formData.religion} onChange={v => setFormData({...formData, religion: v})} columns={3} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-anthracite/40 px-1">Ethnie</label>
                <ChoiceGrid options={ETHNICITIES} value={formData.ethnicity} onChange={v => setFormData({...formData, ethnicity: v})} columns={3} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-anthracite/40 px-1">Physique</label>
                  <ChoiceGrid options={["Svelte", "Moyenne", "Athlétique", "En formes", "Autre"]} value={formData.physique} onChange={v => setFormData({...formData, physique: v})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-anthracite/40 px-1">Couleur de peau</label>
                  <ChoiceGrid options={SKIN_COLORS} value={formData.skinColor} onChange={v => setFormData({...formData, skinColor: v})} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-anthracite/40 px-1">Type de cheveux</label>
                <ChoiceGrid options={HAIR_TYPES} value={formData.hairType} onChange={v => setFormData({...formData, hairType: v})} columns={3} />
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button onClick={prevStep} className="btn-secondary flex-1">Retour</button>
              <button onClick={nextStep} className="btn-primary flex-1">Suivant</button>
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-terracotta/10 rounded-2xl flex items-center justify-center text-terracotta">
                <PenTool size={24} />
              </div>
              <div>
                <h2 className="text-3xl font-serif">Votre univers</h2>
                <p className="text-sm text-anthracite/60">Ce qui vous définit au quotidien.</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-anthracite/40 px-1">Bio / Présentation</label>
                <textarea 
                  placeholder="Partagez vos passions, votre voyage de rêve, ce qui vous fait rire..." 
                  className="w-full p-4 rounded-2xl border border-black/5 min-h-[120px] focus:ring-2 focus:ring-terracotta outline-none transition-all" 
                  value={formData.bio} 
                  onChange={e => setFormData({...formData, bio: e.target.value})} 
                />
                <p className="text-[10px] text-anthracite/40 px-1 italic">Idées : Vos passions cachées, votre destination de rêve, vos valeurs...</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-anthracite/40 px-1">Jaloux(se) ?</label>
                  <ChoiceGrid options={["Non", "Oui", "Un peu"]} value={formData.jealous} onChange={v => setFormData({...formData, jealous: v})} columns={3} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-anthracite/40 px-1">Personnalité</label>
                  <ChoiceGrid options={["Introverti(e)", "Extraverti(e)"]} value={formData.personality} onChange={v => setFormData({...formData, personality: v})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-anthracite/40 px-1">Avec enfant ?</label>
                  <ChoiceGrid options={["Non", "Oui"]} value={formData.hasChildren} onChange={v => setFormData({...formData, hasChildren: v})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-anthracite/40 px-1">Situation</label>
                  <ChoiceGrid options={["Étudiant(e)", "Travaille déjà"]} value={formData.occupationStatus} onChange={v => setFormData({...formData, occupationStatus: v})} />
                </div>
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button onClick={prevStep} className="btn-secondary flex-1">Retour</button>
              <button onClick={nextStep} className="btn-primary flex-1">Suivant</button>
            </div>
          </motion.div>
        )}

        {step === 5 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-terracotta/10 rounded-2xl flex items-center justify-center text-terracotta">
                <Search size={24} />
              </div>
              <div>
                <h2 className="text-3xl font-serif">Critères (1/2)</h2>
                <p className="text-sm text-anthracite/60">Qui cherchez-vous à rencontrer ?</p>
              </div>
            </div>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-anthracite/40 px-1">Âge Min</label>
                  <input type="number" className="w-full p-4 rounded-xl border border-black/5 focus:ring-2 focus:ring-terracotta outline-none" value={prefs.minAge} onChange={e => setPrefs({...prefs, minAge: parseInt(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-anthracite/40 px-1">Âge Max</label>
                  <input type="number" className="w-full p-4 rounded-xl border border-black/5 focus:ring-2 focus:ring-terracotta outline-none" value={prefs.maxAge} onChange={e => setPrefs({...prefs, maxAge: parseInt(e.target.value)})} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-anthracite/40 px-1">Ville idéale</label>
                <ChoiceGrid options={["Indifférent", ...CITIES]} value={prefs.city} onChange={v => setPrefs({...prefs, city: v})} columns={3} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-anthracite/40 px-1">Taille idéale (cm)</label>
                <input type="number" placeholder="Ex: 170" className="w-full p-4 rounded-xl border border-black/5 focus:ring-2 focus:ring-terracotta outline-none" value={prefs.height} onChange={e => setPrefs({...prefs, height: parseInt(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-anthracite/40 px-1">Religion</label>
                <ChoiceGrid options={["Indifférent", "Protestant(e)", "Catholique", "Adventiste", "Musulman(e)", "Autre"]} value={prefs.religion} onChange={v => setPrefs({...prefs, religion: v})} columns={3} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-anthracite/40 px-1">Ethnie</label>
                <ChoiceGrid options={["Indifférent", ...ETHNICITIES]} value={prefs.ethnicity} onChange={v => setPrefs({...prefs, ethnicity: v})} columns={3} />
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button onClick={prevStep} className="btn-secondary flex-1">Retour</button>
              <button onClick={nextStep} className="btn-primary flex-1">Suivant</button>
            </div>
          </motion.div>
        )}

        {step === 6 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-terracotta/10 rounded-2xl flex items-center justify-center text-terracotta">
                <Target size={24} />
              </div>
              <div>
                <h2 className="text-3xl font-serif">Critères (2/2)</h2>
                <p className="text-sm text-anthracite/60">Affinez votre recherche.</p>
              </div>
            </div>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-anthracite/40 px-1">Physique</label>
                  <ChoiceGrid options={["Indifférent", "Svelte", "Moyenne", "Athlétique", "En formes", "Autre"]} value={prefs.physique} onChange={v => setPrefs({...prefs, physique: v})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-anthracite/40 px-1">Couleur de peau</label>
                  <ChoiceGrid options={["Indifférent", ...SKIN_COLORS]} value={prefs.skinColor} onChange={v => setPrefs({...prefs, skinColor: v})} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-anthracite/40 px-1">Type de cheveux</label>
                <ChoiceGrid options={["Indifférent", ...HAIR_TYPES]} value={prefs.hairType} onChange={v => setPrefs({...prefs, hairType: v})} columns={3} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-anthracite/40 px-1">Avec enfant ?</label>
                  <ChoiceGrid options={["Indifférent", "Non", "Oui"]} value={prefs.hasChildren} onChange={v => setPrefs({...prefs, hasChildren: v})} columns={3} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-anthracite/40 px-1">Situation</label>
                  <ChoiceGrid options={["Indifférent", "Étudiant(e)", "Travaille déjà"]} value={prefs.occupationStatus} onChange={v => setPrefs({...prefs, occupationStatus: v})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-anthracite/40 px-1">Jaloux(se) ?</label>
                  <ChoiceGrid options={["Indifférent", "Non", "Oui", "Un peu"]} value={prefs.jealous} onChange={v => setPrefs({...prefs, jealous: v})} columns={2} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-anthracite/40 px-1">Personnalité</label>
                  <ChoiceGrid options={["Indifférent", "Introverti(e)", "Extraverti(e)"]} value={prefs.personality} onChange={v => setPrefs({...prefs, personality: v})} />
                </div>
              </div>
              <div className="col-span-full space-y-1">
                <label className="text-[10px] font-bold uppercase text-anthracite/40 px-1">Loisirs (Mots clés)</label>
                <input placeholder="Ex: Voyage, Musique" className="w-full p-4 rounded-xl border border-black/5 focus:ring-2 focus:ring-terracotta outline-none" value={prefs.hobbies} onChange={e => setPrefs({...prefs, hobbies: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button onClick={prevStep} className="btn-secondary flex-1">Retour</button>
              <button onClick={nextStep} className="btn-primary flex-1">Suivant</button>
            </div>
          </motion.div>
        )}

        {step === 7 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-terracotta/10 rounded-2xl flex items-center justify-center text-terracotta">
                <Camera size={24} />
              </div>
              <div>
                <h2 className="text-3xl font-serif">Dernière étape</h2>
                <p className="text-sm text-anthracite/60">Questions brise-glace et photo.</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-anthracite/40 px-1">Question FUN</label>
                <textarea placeholder="Ex: Si on gagne 10 millions Ar ensemble, on fait quoi ?" className="w-full p-3 rounded-xl border border-black/5 h-20" value={formData.funQuestion} onChange={e => setFormData({...formData, funQuestion: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-anthracite/40 px-1">Question SÉRIEUSE</label>
                <textarea placeholder="Ex: C'est quoi le respect pour toi ?" className="w-full p-3 rounded-xl border border-black/5 h-20" value={formData.seriousQuestion} onChange={e => setFormData({...formData, seriousQuestion: e.target.value})} />
              </div>
            </div>

            <div className="pt-4 border-t border-black/5">
              <h3 className="text-xl font-serif mb-2 text-center">Vos plus beaux sourires</h3>
              <p className="text-terracotta text-xs font-medium italic mb-4 text-center">"Soyez belles, soyez beaux... Mais restez vrais. 😉"</p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                {photos.map((p, i) => (
                  <div key={i} className="relative aspect-square rounded-2xl overflow-hidden shadow-lg group">
                    <img src={URL.createObjectURL(p)} className="w-full h-full object-cover" alt="Preview" />
                    <button 
                      onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-2 right-2 bg-indigo-500 text-white p-1 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={14} />
                    </button>
                    {i === 0 && (
                      <div className="absolute bottom-0 inset-x-0 bg-terracotta/80 text-white text-[8px] font-black uppercase py-1 text-center">
                        Principale
                      </div>
                    )}
                  </div>
                ))}
                
                {photos.length < 6 && (
                  <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-black/10 rounded-2xl bg-black/5 hover:bg-black/10 transition-colors cursor-pointer">
                    <Camera size={24} className="text-anthracite/20 mb-1" />
                    <span className="text-[10px] text-anthracite/60 text-center px-2">Ajouter</span>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      multiple 
                      onChange={e => {
                        const files = Array.from(e.target.files || []);
                        setPhotos(prev => [...prev, ...files].slice(0, 6));
                      }} 
                    />
                  </label>
                )}
              </div>
              <p className="text-[10px] text-center text-anthracite/40">Vous pouvez ajouter jusqu'à 6 photos. La première sera votre photo principale.</p>
            </div>

            <div className="flex gap-4 pt-4">
              <button onClick={prevStep} disabled={regLoading} className="btn-secondary flex-1 disabled:opacity-50">Retour</button>
              <button onClick={handleRegister} disabled={regLoading} className="btn-primary flex-1 disabled:opacity-50 flex items-center justify-center gap-2">
                {regLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Envoi...
                  </>
                ) : (
                  "Finaliser l'inscription"
                )}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};


const Subscription = ({ user, onLogout }: { user: any, onLogout?: () => void }) => {
  const { addToast } = useContext(ToastContext);
  const [mvolaNumber, setMvolaNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [reference, setReference] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData();
    formData.append('mvolaNumber', mvolaNumber);
    formData.append('transactionId', transactionId);
    formData.append('reference', reference);
    if (file) formData.append('proof', file);

    const res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: formData
    });

    if (res.ok) {
      setSuccess(true);
      addToast("Paiement enregistré", "success", "Votre demande est en cours de traitement. Merci de votre patience.");
      // Optional: trigger user refresh
      window.location.reload();
    }
    setLoading(false);
  };

  if (success || user?.status === 'pending') return (
    <div className="min-h-[70dvh] flex flex-col items-center justify-center text-center px-4">
      {user?.status === 'pending' ? <Clock size={80} className="text-yellow-500 mb-6 animate-pulse" /> : <CheckCircle size={80} className="text-green-500 mb-6" />}
      <h2 className="text-4xl font-serif mb-4">{user?.status === 'pending' ? "Validation en cours" : "Paiement envoyé !"}</h2>
      <p className="text-anthracite/70 max-w-md">
        {user?.status === 'pending' 
          ? "Votre demande est en cours de traitement par notre équipe. L'activation se fait généralement sous 24h."
          : "Votre preuve de paiement a été transmise à l'administration. Votre compte sera activé sous 24h après validation."}
      </p>
      <div className="flex flex-col sm:flex-row gap-4 mt-8">
        <Link to="/discover" className="btn-primary">Retour à l'accueil</Link>
        {onLogout && (
          <button onClick={onLogout} className="btn-secondary flex items-center justify-center gap-2">
            <LogOut size={18} />
            Se déconnecter
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="grid md:grid-cols-2 gap-12">
        <div className="space-y-8">
          <h2 className="text-4xl font-serif">Abonnement Premium</h2>
          <div className="bg-beige p-8 rounded-2xl border border-white/5 shadow-2xl">
            <div className="text-5xl font-bold text-terracotta mb-2">2 000 Ar <span className="text-lg font-normal text-anthracite/60">/ 30 jours</span></div>
            <p className="text-anthracite/70">Accès illimité aux profils compatibles, messagerie et découvertes quotidiennes pendant 30 jours.</p>
            <p className="text-xs text-accent-light font-medium mt-2 italic">* Prévoir 150 Ar de frais de retrait (Total à envoyer : 2 150 Ar)</p>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-xl font-bold uppercase tracking-widest text-anthracite/40 text-xs">Instructions MVola</h3>
            <div className="bg-beige p-6 rounded-xl border border-white/5 space-y-3">
              <div className="flex justify-between text-sm"><span className="text-anthracite/40">Numéro :</span> <span className="font-bold">038 93 263 31</span></div>
              <div className="flex justify-between text-sm"><span className="text-anthracite/40">Nom :</span> <span className="font-bold">Lalatiana</span></div>
              <div className="flex justify-between text-sm"><span className="text-anthracite/40">Opérateur :</span> <span className="font-bold text-orange-500">MVola uniquement</span></div>
              <div className="flex justify-between text-sm"><span className="text-anthracite/40">Montant :</span> <span className="font-bold">2 000 Ar + 150 Ar (frais)</span></div>
              <div className="flex justify-between border-t border-white/5 pt-2 mt-2"><span>Total à envoyer :</span> <span className="font-bold text-accent-light">2 150 Ar</span></div>
            </div>
          </div>
        </div>

        <div className="card bg-beige border-white/5">
          <h3 className="text-2xl font-serif mb-6">Validation du paiement</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-anthracite/30 px-1">Votre numéro MVola</label>
              <input placeholder="Ex: 034 XX XXX XX" className="w-full p-3 rounded-xl border border-white/5 bg-offwhite/50 focus:bg-offwhite/80 outline-none transition-all" value={mvolaNumber} onChange={e => setMvolaNumber(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-anthracite/30 px-1">ID Transaction (Obligatoire)</label>
              <input placeholder="ID reçu par SMS" className="w-full p-3 rounded-xl border border-white/5 bg-offwhite/50 focus:bg-offwhite/80 outline-none transition-all" value={transactionId} onChange={e => setTransactionId(e.target.value)} required />
              <p className="text-[10px] text-anthracite/20 px-1 italic">Le numéro de transaction reçu par SMS après votre transfert MVola.</p>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-anthracite/30 px-1">Référence (Optionnel)</label>
              <input placeholder="Référence de l'envoi" className="w-full p-3 rounded-xl border border-white/5 bg-offwhite/50 focus:bg-offwhite/80 outline-none transition-all" value={reference} onChange={e => setReference(e.target.value)} />
            </div>
            <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center bg-offwhite/30">
              <input type="file" id="proof" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
              <label htmlFor="proof" className="cursor-pointer flex flex-col items-center gap-2">
                <CreditCard className="text-anthracite/20" />
                <span className="text-sm font-medium text-anthracite/60">{file ? file.name : "Capture d'écran (Optionnel si ID fourni)"}</span>
              </label>
            </div>
            <button disabled={loading} className="btn-primary w-full py-4 mt-4">
              {loading ? "Envoi en cours..." : "Confirmer le paiement"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const Discover = ({ user, updateCache, discoverCache, setDiscoverCache, onlineUsers }: { user: any, updateCache: (profiles: any[]) => void, discoverCache: any[] | null, setDiscoverCache: (p: any[]) => void, onlineUsers: Set<number> }) => {
  const { addToast } = useContext(ToastContext);
  const [profiles, setProfiles] = useState<any[]>(discoverCache || []);
  const [loading, setLoading] = useState(!discoverCache);
  const [error, setError] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterMinAge, setFilterMinAge] = useState<number | ''>('');
  const [filterMaxAge, setFilterMaxAge] = useState<number | ''>('');
  const [filterReligion, setFilterReligion] = useState('');
  const [filterPhysique, setFilterPhysique] = useState('');
  const [filterEthnicity, setFilterEthnicity] = useState('');
  const [filterSkinColor, setFilterSkinColor] = useState('');
  const [filterOccupation, setFilterOccupation] = useState('');
  const [sortBy, setSortBy] = useState('compatibility'); // compatibility, age
  const [sortOrder, setSortOrder] = useState('desc'); // asc, desc
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user?.status === 'active') {
      fetch('/api/discover', { headers: getAuthHeaders() })
        .then(res => res.json())
        .then(data => {
          if (data.error) setError(data.error);
          else {
            setProfiles(data);
            setDiscoverCache(data);
            updateCache(data);
          }
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleLike = async (targetId: number, type: 'like' | 'pass') => {
    const res = await fetch('/api/likes', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ targetId, type })
    });
    const data = await res.json();
    if (data.success) {
      if (data.match) {
        addToast("Affinité confirmée ✨", "success", "C'est un match ! Une nouvelle histoire commence peut-être ici.");
      }
      setProfiles(profiles.filter(p => p.user_id !== targetId));
    }
  };

  const toggleFavorite = async (targetId: number, isFavorite: boolean) => {
    try {
      const res = await fetch(`/api/favorites/${targetId}`, {
        method: isFavorite ? 'DELETE' : 'POST',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        setProfiles(profiles.map(p => 
          p.user_id === targetId ? { ...p, is_favorite: !isFavorite } : p
        ));
      }
    } catch (err) {
      console.error("Error toggling favorite", err);
    }
  };

  const filteredProfiles = profiles
    .filter(p => {
      const searchLower = searchQuery.toLowerCase();
      const matchSearch = !searchQuery || 
        p.first_name.toLowerCase().includes(searchLower) || 
        p.last_name.toLowerCase().includes(searchLower) || 
        (p.city && p.city.toLowerCase().includes(searchLower));
      
      const matchCity = !filterCity || (p.city && p.city.toLowerCase().includes(filterCity.toLowerCase()));
      const matchMinAge = !filterMinAge || p.age >= filterMinAge;
      const matchMaxAge = !filterMaxAge || p.age <= filterMaxAge;
      const matchReligion = !filterReligion || p.religion === filterReligion;
      const matchPhysique = !filterPhysique || p.physique === filterPhysique;
      const matchEthnicity = !filterEthnicity || p.ethnicity === filterEthnicity;
      const matchSkinColor = !filterSkinColor || p.skin_color === filterSkinColor;
      const matchOccupation = !filterOccupation || p.occupation_status === filterOccupation;
      return matchSearch && matchCity && matchMinAge && matchMaxAge && matchReligion && matchPhysique && matchEthnicity && matchSkinColor && matchOccupation;
    })
    .sort((a, b) => {
      const valA = sortBy === 'compatibility' ? a.compatibility : a.age;
      const valB = sortBy === 'compatibility' ? b.compatibility : b.age;
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });

  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Preload images for better performance
  useEffect(() => {
    if (filteredProfiles.length > 0) {
      const preloadCount = 3;
      filteredProfiles.slice(0, preloadCount).forEach(p => {
        const img = new Image();
        img.src = p.photo_url || `https://picsum.photos/seed/${p.user_id}/600/800`;
      });
    }
  }, [filteredProfiles]);

  if (loading) return (
    <div className="max-w-7xl mx-auto py-12 px-4">
      <div className="h-12 w-64 bg-white/5 rounded-2xl mb-4 animate-pulse" />
      <div className="h-6 w-80 bg-white/5 rounded-lg mb-12 animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div key={i} className="bg-white/5 rounded-[2.5rem] overflow-hidden border border-white/5 animate-pulse">
            <div className="aspect-[3/4] bg-white/5" />
            <div className="p-8 space-y-4">
              <div className="h-8 w-3/4 bg-white/5 rounded-xl" />
              <div className="h-4 w-1/2 bg-white/5 rounded-lg" />
              <div className="h-12 w-full bg-white/5 rounded-2xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  if (error) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-20 h-20 bg-terracotta/10 rounded-3xl flex items-center justify-center text-terracotta mb-6">
        <Heart size={40} fill="currentColor" />
      </div>
      <h2 className="text-4xl font-serif mb-4">Merci pour votre confiance</h2>
      <p className="text-anthracite/60 mb-8 max-w-md mx-auto">Pour accéder aux profils et trouver votre affinité, veuillez vous abonner à notre service premium.</p>
      <Link to="/subscription" className="btn-primary px-10 py-4 text-lg">S'abonner maintenant</Link>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto py-12 px-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
        <div className="flex-1">
          <div className="inline-block bg-terracotta/10 text-terracotta px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 border border-terracotta/20">
            Algorithme 70%
          </div>
          <h2 className="text-6xl font-serif mb-4 tracking-tight">Vos Affinités</h2>
          <p className="text-anthracite/50 text-xl font-serif italic mb-8">Découvrez les profils qui résonnent avec votre âme.</p>
          
          <div className="relative max-w-xl group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-anthracite/20 group-focus-within:text-terracotta transition-colors" size={22} />
            <input 
              type="text" 
              placeholder="Rechercher une ville, un prénom..." 
              className="w-full pl-14 pr-6 py-5 rounded-[2rem] border border-white/5 bg-white/5 focus:bg-white/10 focus:border-terracotta/30 transition-all outline-none text-lg shadow-2xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4 items-center">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-3 px-6 py-4 rounded-2xl border transition-all font-bold uppercase tracking-widest text-xs",
              showFilters ? "bg-terracotta text-white border-terracotta shadow-lg shadow-terracotta/20" : "bg-white/5 border-white/5 text-anthracite/40 hover:bg-white/10"
            )}
          >
            <Filter size={18} />
            Filtres
            {(filterCity || filterMinAge || filterMaxAge || filterReligion || filterPhysique || filterEthnicity || filterSkinColor || filterOccupation) && (
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            )}
          </button>

          <div className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-2xl p-2">
            <button 
              onClick={() => {
                if (sortBy === 'compatibility') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                else setSortBy('compatibility');
              }}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 uppercase tracking-widest",
                sortBy === 'compatibility' ? "bg-terracotta text-white shadow-lg shadow-terracotta/20" : "text-anthracite/30 hover:text-anthracite/60"
              )}
            >
              Affinité
              {sortBy === 'compatibility' && <ArrowUpDown size={12} className={sortOrder === 'asc' ? "rotate-180" : ""} />}
            </button>
            <button 
              onClick={() => {
                if (sortBy === 'age') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                else setSortBy('age');
              }}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 uppercase tracking-widest",
                sortBy === 'age' ? "bg-terracotta text-white shadow-lg shadow-terracotta/20" : "text-anthracite/30 hover:text-anthracite/60"
              )}
            >
              Âge
              {sortBy === 'age' && <ArrowUpDown size={12} className={sortOrder === 'asc' ? "rotate-180" : ""} />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-16"
          >
            <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 shadow-2xl">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-anthracite/30 px-1">Ville</label>
                <div className="relative">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-anthracite/20" />
                  <input 
                    type="text" 
                    placeholder="Toutes les villes" 
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-white/5 bg-white/5 text-sm focus:bg-white/10 transition-all outline-none"
                    value={filterCity}
                    onChange={(e) => setFilterCity(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-anthracite/30 px-1">Âge</label>
                <div className="flex items-center gap-3">
                  <input type="number" placeholder="Min" className="w-full p-3 rounded-xl border border-white/5 bg-white/5 text-sm focus:bg-white/10 transition-all outline-none" value={filterMinAge} onChange={e => setFilterMinAge(e.target.value ? parseInt(e.target.value) : '')} />
                  <div className="w-4 h-[1px] bg-white/10"></div>
                  <input type="number" placeholder="Max" className="w-full p-3 rounded-xl border border-white/5 bg-white/5 text-sm focus:bg-white/10 transition-all outline-none" value={filterMaxAge} onChange={e => setFilterMaxAge(e.target.value ? parseInt(e.target.value) : '')} />
                </div>
              </div>
              
              <div className="space-y-3 sm:col-span-2 lg:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-anthracite/30 px-1">Religion</label>
                <ChoiceGrid 
                  options={["Toutes", "Protestant(e)", "Catholique", "Adventiste", "Musulman(e)", "Autre"]} 
                  value={filterReligion || "Toutes"} 
                  onChange={v => setFilterReligion(v === "Toutes" ? "" : v)} 
                  columns={3}
                  dark
                />
              </div>

              <div className="space-y-3 sm:col-span-2 lg:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-anthracite/30 px-1">Physique</label>
                <ChoiceGrid 
                  options={["Tous", "Svelte", "Moyenne", "Athlétique", "En formes"]} 
                  value={filterPhysique || "Tous"} 
                  onChange={v => setFilterPhysique(v === "Tous" ? "" : v)} 
                  columns={3}
                  dark
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                <button 
                  onClick={() => {
                    setFilterCity('');
                    setFilterMinAge('');
                    setFilterMaxAge('');
                    setFilterReligion('');
                    setFilterPhysique('');
                    setFilterEthnicity('');
                    setFilterSkinColor('');
                    setFilterOccupation('');
                  }}
                  className="text-[10px] font-black text-terracotta hover:text-accent-light flex items-center gap-2 uppercase tracking-widest transition-colors"
                >
                  <Trash2 size={14} />
                  Réinitialiser les filtres
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
        {filteredProfiles.map((p, idx) => (
          <motion.div 
            key={p.user_id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="group relative bg-white/5 rounded-[3rem] overflow-hidden border border-white/5 hover:border-accent-light/30 transition-all duration-500 shadow-2xl"
          >
            <div className="aspect-[3/4] relative overflow-hidden">
              <LazyImage 
                src={p.photo_url} 
                userId={p.user_id}
                className="transition-transform duration-1000 group-hover:scale-110" 
                alt={p.first_name}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-offwhite via-transparent to-transparent opacity-80" />
              
              <div className="absolute top-6 right-6 flex flex-col gap-3">
                <div className="bg-accent-light text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-2xl shadow-accent-light/40 tracking-widest uppercase border border-white/20">
                  {p.compatibility}% Match
                </div>
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleFavorite(p.user_id, !!p.is_favorite);
                  }}
                  className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-xl transition-all transform hover:scale-110 border border-white/10",
                    p.is_favorite ? "bg-accent-light text-white border-accent-light" : "bg-white/10 text-white hover:bg-white/20"
                  )}
                >
                  <Heart size={24} fill={p.is_favorite ? "currentColor" : "none"} />
                </button>
              </div>

              <div className="absolute bottom-8 left-8 right-8">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-3xl font-serif text-white drop-shadow-lg">{p.first_name}{p.age ? `, ${p.age}` : ''}</h3>
                  {onlineUsers.has(p.user_id) && (
                    <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-lg animate-pulse" title="En ligne"></div>
                  )}
                </div>
                <p className="text-white/60 text-sm font-medium tracking-wide uppercase">{p.city} • {p.occupation_status}</p>
              </div>

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-offwhite/90 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col items-center justify-center p-10 text-center">
                <div className="mb-8">
                  <p className="text-anthracite/60 text-lg font-serif italic mb-6 line-clamp-4">"{p.bio || "Une personnalité mystérieuse à découvrir..."}"</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {p.hobbies?.split(',').slice(0, 3).map((h: string) => (
                      <span key={h} className="text-[10px] bg-terracotta/10 text-terracotta px-3 py-1 rounded-full font-black uppercase tracking-widest border border-terracotta/10">{h.trim()}</span>
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-4 w-full">
                  <button 
                    onClick={() => handleLike(p.user_id, 'pass')}
                    className="flex-1 bg-white/5 text-anthracite/20 hover:text-indigo-500 hover:bg-indigo-500/10 py-4 rounded-2xl transition-all flex items-center justify-center border border-white/5"
                  >
                    <ThumbsDown size={24} />
                  </button>
                  <button 
                    onClick={() => handleLike(p.user_id, 'like')}
                    className="flex-[2] bg-terracotta text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-terracotta/20 hover:bg-accent-light transition-all flex items-center justify-center gap-3"
                  >
                    <ThumbsUp size={20} />
                    <span>Liker</span>
                  </button>
                </div>
                <Link to={`/profile/${p.user_id}`} className="mt-6 text-xs font-black text-terracotta hover:text-accent-light uppercase tracking-[0.2em] transition-colors">Voir le profil complet</Link>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredProfiles.length === 0 && (
        <div className="text-center py-32 bg-white/5 rounded-[3rem] border border-white/5 border-dashed">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-anthracite/10">
            <Search size={40} />
          </div>
          <h3 className="text-2xl font-serif text-anthracite/40 mb-2">Aucune affinité trouvée</h3>
          <p className="text-anthracite/20 max-w-xs mx-auto">Essayez d'ajuster vos filtres pour découvrir de nouveaux profils.</p>
        </div>
      )}

      {/* Back to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0, y: 20 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-24 left-6 z-[100] w-14 h-14 bg-white/10 backdrop-blur-xl text-anthracite/40 rounded-full shadow-2xl flex items-center justify-center hover:bg-white/20 transition-all border border-white/10"
          >
            <ArrowUpDown size={24} className="rotate-180" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

const Chat = ({ user, socket, onlineUsers }: { user: any, socket: any, onlineUsers: Set<number> }) => {
  const { addToast } = useContext(ToastContext);
  const { id } = useParams();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [otherProfile, setOtherProfile] = useState<any>(null);
  const [icebreakers, setIcebreakers] = useState<any[]>([]);
  const [generatingIcebreakers, setGeneratingIcebreakers] = useState(false);
  const [myProfile, setMyProfile] = useState<any>(null);

  useEffect(() => {
    fetch('/api/me', { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => setMyProfile(data.profile));
  }, []);

  const generateIcebreakers = async () => {
    if (!otherProfile || !myProfile || generatingIcebreakers) return;
    setGeneratingIcebreakers(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn("GEMINI_API_KEY is not set");
        return;
      }
      const ai = new GoogleGenAI({ apiKey });
      const model = "gemini-3-flash-preview";
      
      const prompt = `Génère 3 suggestions de questions ou de sujets de discussion (icebreakers) pour entamer une conversation entre deux utilisateurs d'une application de rencontre à Madagascar.
      
      Utilisateur 1 (Moi):
      - Prénom: ${myProfile.first_name}
      - Hobbies: ${myProfile.hobbies}
      - Bio: ${myProfile.bio}
      - Question amusante: ${myProfile.fun_question}
      - Question sérieuse: ${myProfile.serious_question}
      
      Utilisateur 2 (${otherProfile.first_name}):
      - Hobbies: ${otherProfile.hobbies}
      - Bio: ${otherProfile.bio}
      - Question amusante: ${otherProfile.fun_question}
      - Question sérieuse: ${otherProfile.serious_question}
      - Talent: ${otherProfile.talent}
      
      Points communs ou de compatibilité: ${otherProfile.compatibility}% d'affinité.
      
      Les icebreakers doivent être personnalisés, bienveillants, et viser à faciliter le démarrage d'une conversation significative.
      Réponds uniquement avec un tableau JSON de 3 chaînes de caractères.`;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.STRING,
            },
          },
        }
      });

      let suggestions = [];
      try {
        suggestions = JSON.parse(response.text || "[]");
      } catch (e) {
        console.error("Failed to parse icebreakers JSON:", e);
      }
      
      for (const content of suggestions) {
        await fetch('/api/icebreakers', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ otherId: id, content })
        });
      }

      const res = await fetch(`/api/icebreakers/${id}`, { headers: getAuthHeaders() });
      const data = await res.json();
      setIcebreakers(data);
    } catch (err) {
      console.error("Failed to generate icebreakers:", err);
    } finally {
      setGeneratingIcebreakers(false);
    }
  };

  useEffect(() => {
    fetch('/api/conversations', { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => {
        setConversations(data);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (id) {
      const loadChatData = async () => {
        try {
          const [msgsRes, profileRes, ibsRes] = await Promise.all([
            fetch(`/api/messages/${id}`, { headers: getAuthHeaders() }),
            fetch(`/api/profile/${id}`, { headers: getAuthHeaders() }),
            fetch(`/api/icebreakers/${id}`, { headers: getAuthHeaders() })
          ]);

          const msgs = await msgsRes.json();
          const profileData = await profileRes.json();
          const ibs = await ibsRes.json();

          setMessages(msgs);
          setOtherProfile(profileData.user);
          setIcebreakers(ibs);

          // Only generate if no messages yet and no icebreakers
          if (msgs.length === 0 && ibs.length === 0 && profileData.user && myProfile) {
            generateIcebreakers();
          }
        } catch (err) {
          console.error("Failed to load chat data:", err);
        }
      };

      loadChatData();
    } else {
      setMessages([]);
      setOtherProfile(null);
      setIcebreakers([]);
    }
  }, [id, myProfile?.user_id]);

  useEffect(() => {
    if (socket) {
      const handleNewMessage = (msg: any) => {
        if (id && (msg.senderId === parseInt(id) || msg.receiverId === parseInt(id))) {
          setMessages(prev => [...prev, { ...msg, sender_id: msg.senderId, receiver_id: msg.receiverId, created_at: new Date().toISOString() }]);
        }
        // Update conversations list
        fetch('/api/conversations', { headers: getAuthHeaders() })
          .then(res => res.json())
          .then(data => setConversations(data));
      };

      socket.on('newMessage', handleNewMessage);
      return () => {
        socket.off('newMessage', handleNewMessage);
      };
    }
  }, [socket, id]);

  const sendMessage = (content: string) => {
    if (!content.trim() || !id || !socket) return;

    const msgData = {
      senderId: user.id,
      receiverId: parseInt(id),
      content: content.trim()
    };

    socket.emit('sendMessage', msgData);
    setMessages(prev => [...prev, { ...msgData, sender_id: user.id, receiver_id: parseInt(id), created_at: new Date().toISOString() }]);
    setNewMessage('');
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(newMessage);
  };

  if (loading) return <div className="p-12 text-center">Chargement des conversations...</div>;

  return (
    <div className="max-w-6xl mx-auto py-4 md:py-8 px-4 h-[80dvh] flex gap-6">
      {/* Conversations List */}
      <div className={cn("w-full md:w-80 bg-beige rounded-3xl shadow-sm border border-white/5 overflow-hidden flex flex-col", id ? "hidden md:flex" : "flex")}>
        <div className="p-6 border-b border-black/5">
          <h2 className="text-xl font-serif">Messages</h2>
        </div>
        <div className="flex-grow overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-12 text-center text-anthracite/40">Aucune conversation.</div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.user_id}
                onClick={() => navigate(`/chat/${conv.user_id}`)}
                className={cn(
                  "w-full p-4 flex gap-4 hover:bg-beige/10 transition-colors text-left border-b border-black/5",
                  id === conv.user_id.toString() && "bg-beige/20"
                )}
              >
                <div className="relative">
                  <LazyImage 
                    src={conv.photo_url} 
                    userId={conv.user_id}
                    className="w-12 h-12 rounded-full object-cover" 
                    alt="" 
                  />
                  {onlineUsers.has(conv.user_id) && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-beige shadow-sm"></div>
                  )}
                </div>
                <div className="flex-grow min-w-0">
                  <div className="font-bold truncate">{conv.first_name}</div>
                  <div className="text-sm text-anthracite/60 truncate">{conv.last_message}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat View */}
      <div className={cn("flex-grow bg-beige rounded-3xl shadow-sm border border-white/5 overflow-hidden flex flex-col", !id ? "hidden md:flex items-center justify-center text-anthracite/40" : "flex")}>
        {!id ? (
          <div className="text-center">
            <MessageCircle size={48} className="mx-auto mb-4 opacity-20" />
            <p>Sélectionnez une conversation pour commencer à discuter.</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-black/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={() => navigate('/chat')} className="md:hidden p-2 hover:bg-beige/10 rounded-full">
                  <ChevronLeft size={20} />
                </button>
                {otherProfile && (
                  <>
                    <div className="relative">
                      <LazyImage 
                        src={otherProfile.photo_url} 
                        userId={otherProfile.user_id}
                        className="w-10 h-10 rounded-full object-cover" 
                        alt="" 
                      />
                      {onlineUsers.has(otherProfile.user_id) && (
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-beige shadow-sm"></div>
                      )}
                    </div>
                    <div>
                      <div className="font-bold">{otherProfile.first_name}</div>
                      {onlineUsers.has(otherProfile.user_id) ? (
                        <div className="text-[10px] text-green-500 font-bold uppercase tracking-wider">En ligne</div>
                      ) : (
                        <div className="text-[10px] text-anthracite/30 font-bold uppercase tracking-wider">Hors ligne</div>
                      )}
                    </div>
                  </>
                )}
              </div>
              {otherProfile && (
                <button 
                  onClick={async () => {
                    addToast("IA", "info", "Recherche d'idées de rendez-vous...");
                    try {
                      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
                      const model = "gemini-3-flash-preview";
                      const response = await ai.models.generateContent({
                        model,
                        contents: `Suggère 3 idées de rendez-vous romantiques et originales à Madagascar (si possible dans sa ville: ${otherProfile.city}) pour moi et ${otherProfile.first_name}.
                        Ses centres d'intérêt: ${otherProfile.hobbies}.
                        Son talent: ${otherProfile.talent}.
                        Réponds avec une liste courte et élégante en français.`,
                      });
                      if (response.text) {
                        addToast("Idées de rendez-vous", "success", response.text);
                      }
                    } catch (err) {
                      console.error(err);
                      addToast("IA", "error", "Impossible de générer des idées.");
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-terracotta/10 text-terracotta rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-terracotta hover:text-white transition-all"
                >
                  <Sparkles size={12} />
                  Idées de RDV
                </button>
              )}
            </div>

            {/* Messages Area */}
            <div className="flex-grow overflow-y-auto p-6 space-y-4 flex flex-col">
              {otherProfile?.isMutualFavorite && (
                <div className="bg-terracotta/10 text-terracotta text-center p-3 rounded-xl text-sm font-medium italic mb-4">
                  Vous figurez désormais dans vos favoris respectifs
                </div>
              )}
              {messages.length === 0 && !generatingIcebreakers && icebreakers.length === 0 && (
                <div className="flex-grow flex flex-col items-center justify-center text-center p-8 space-y-4">
                  <div className="w-16 h-16 bg-terracotta/10 rounded-full flex items-center justify-center text-terracotta">
                    <Sparkles size={32} />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl">Brisez la glace !</h3>
                    <p className="text-sm text-anthracite/60">C'est le moment idéal pour envoyer votre premier message à {otherProfile?.first_name}.</p>
                  </div>
                </div>
              )}
              {generatingIcebreakers && (
                <div className="flex justify-center p-4">
                  <div className="flex items-center gap-2 text-xs text-anthracite/40 animate-pulse">
                    <Wand2 size={14} />
                    Génération d'icebreakers personnalisés...
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "max-w-[80%] p-4 rounded-2xl text-sm",
                    msg.sender_id === user.id 
                      ? "bg-terracotta text-white self-end rounded-tr-none" 
                      : "bg-beige/20 text-anthracite self-start rounded-tl-none"
                  )}
                >
                  {msg.content}
                  <div className={cn("text-[10px] mt-1 opacity-60", msg.sender_id === user.id ? "text-right" : "text-left")}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>

            {/* Icebreakers */}
            {icebreakers.length > 0 && (
              <div className="px-4 py-3 border-t border-black/5 bg-beige/30">
                <div className="flex items-center gap-2 mb-2 text-[10px] font-black uppercase tracking-widest text-anthracite/40 px-1">
                  <Lightbulb size={12} className="text-terracotta" />
                  Suggestions d'icebreakers
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-1">
                  {icebreakers.map((ib) => (
                    <button
                      key={ib.id}
                      onClick={() => {
                        sendMessage(ib.content);
                        fetch('/api/icebreakers/use', {
                          method: 'POST',
                          headers: getAuthHeaders(),
                          body: JSON.stringify({ id: ib.id })
                        });
                        setIcebreakers(prev => prev.filter(i => i.id !== ib.id));
                      }}
                      className="flex-shrink-0 px-4 py-2 bg-white border border-black/5 rounded-xl text-xs text-anthracite hover:border-terracotta/50 hover:shadow-sm transition-all whitespace-nowrap"
                    >
                      {ib.content}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-4 border-t border-black/5 flex gap-2">
              <input
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="Écrivez votre message..."
                className="flex-grow p-3 rounded-xl border border-black/5 focus:outline-none focus:border-terracotta/50"
              />
              <button type="submit" className="bg-terracotta text-white p-3 rounded-xl hover:bg-terracotta-dark transition-colors">
                <Send size={20} />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

const UserProfile = ({ user, cache, onlineUsers }: { user: any, cache: Record<number, any>, onlineUsers: Set<number> }) => {
  const { addToast } = useContext(ToastContext);
  const { id } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  useEffect(() => {
    if (user?.status !== 'active') {
      setLoading(false);
      return;
    }

    const profileId = parseInt(id || '0');
    if (cache[profileId]) {
      setProfile(cache[profileId]);
      setLoading(false);
      // Still fetch in background to refresh data
      fetch(`/api/profile/${id}`, { headers: getAuthHeaders() })
        .then(res => res.json())
        .then(data => {
          if (!data.error) setProfile(data.user);
        });
      return;
    }

    fetch(`/api/profile/${id}`, { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setProfile(data.user);
        setLoading(false);
      });
  }, [id, user]);

  if (user?.status === 'expired') return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <ShieldAlert size={60} className="text-indigo-500 mb-4" />
      <h2 className="text-2xl font-serif mb-2">Accès restreint</h2>
      <p className="text-anthracite/60 mb-6">Votre abonnement a expiré. Veuillez renouveler votre accès pour voir ce profil.</p>
      <Link to="/subscription" className="btn-primary">Se réabonner</Link>
    </div>
  );

  if (user?.status !== 'active') return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <Heart size={60} className="text-terracotta mb-4" />
      <h2 className="text-2xl font-serif mb-2">Merci pour votre confiance</h2>
      <p className="text-anthracite/60 mb-6">Pour accéder aux profils détaillés, veuillez vous abonner.</p>
      <Link to="/subscription" className="btn-primary">S'abonner maintenant</Link>
    </div>
  );

  if (loading) return <div className="p-12 text-center">Chargement du profil...</div>;
  if (error || !profile) return <div className="p-12 text-center text-indigo-500">Profil introuvable.</div>;

  const toggleFavorite = async () => {
    const method = profile.is_favorite ? 'DELETE' : 'POST';
    const res = await fetch(`/api/favorites/${profile.user_id}`, {
      method,
      headers: getAuthHeaders()
    });
    if (res.ok) {
      setProfile({ ...profile, is_favorite: !profile.is_favorite });
    }
  };

  const handleBlock = async () => {
    const res = await fetch('/api/block', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ blockedId: profile.user_id })
    });
    if (res.ok) {
      addToast("Tranquillité assurée", "success", `${profile.first_name} ne pourra plus vous contacter ni voir votre profil.`);
      window.location.href = '/discover';
    } else {
      addToast("Une petite erreur", "error", "Nous n'avons pas pu bloquer ce profil pour le moment.");
    }
  };

  const photos = profile.photos && profile.photos.length > 0 
    ? profile.photos 
    : [{ url: profile.photo_url || `https://picsum.photos/seed/${profile.user_id}/400/600` }];

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Instagram-style Header */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-16 mb-16">
        <div className="relative group">
          <div className="w-32 h-32 md:w-44 md:h-44 rounded-full p-1 bg-gradient-to-tr from-terracotta via-indigo-500 to-terracotta animate-gradient-x shadow-2xl">
            <div className="w-full h-full rounded-full border-4 border-offwhite overflow-hidden bg-beige">
              <LazyImage 
                src={profile.photo_url} 
                userId={profile.user_id}
                alt={profile.first_name}
              />
            </div>
          </div>
          {onlineUsers.has(profile.user_id) && (
            <div className="absolute bottom-2 right-2 w-5 h-5 bg-green-500 border-4 border-offwhite rounded-full animate-pulse shadow-lg shadow-green-500/20" />
          )}
        </div>

        <div className="flex-grow space-y-6 text-center md:text-left">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <h1 className="text-3xl font-serif text-anthracite">{profile.first_name}{profile.age ? `, ${profile.age}` : ''}</h1>
            <div className="flex items-center justify-center md:justify-start gap-2">
              <Link to={`/chat/${profile.user_id}`} className="px-6 py-2 bg-indigo-500 text-white rounded-xl text-sm font-bold hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20">
                Message
              </Link>
              <button 
                onClick={toggleFavorite}
                className={cn(
                  "p-2 rounded-xl border transition-all",
                  profile.is_favorite ? "bg-terracotta/10 border-terracotta/20 text-terracotta" : "bg-beige border-white/5 text-anthracite/40 hover:text-terracotta"
                )}
              >
                <Heart size={20} fill={profile.is_favorite ? "currentColor" : "none"} />
              </button>
              <div className="relative group/menu">
                <button className="p-2 rounded-xl bg-beige border border-white/5 text-anthracite/40 hover:text-anthracite transition-all">
                  <MoreHorizontal size={20} />
                </button>
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-black/5 py-2 opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-50">
                  <button onClick={() => setIsBlockModalOpen(true)} className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2">
                    <ShieldAlert size={16} /> Bloquer
                  </button>
                  <button onClick={() => setIsReportOpen(true)} className="w-full px-4 py-2 text-left text-sm text-anthracite/60 hover:bg-black/5 transition-colors flex items-center gap-2">
                    <Flag size={16} /> Signaler
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center md:justify-start gap-8 text-sm">
            <div className="flex flex-col items-center md:items-start">
              <span className="font-black text-anthracite">{profile.compatibility}%</span>
              <span className="text-anthracite/40 uppercase tracking-widest text-[10px] font-bold">Affinité</span>
            </div>
            <div className="flex flex-col items-center md:items-start">
              <span className="font-black text-anthracite">{profile.city}</span>
              <span className="text-anthracite/40 uppercase tracking-widest text-[10px] font-bold">Ville</span>
            </div>
            <div className="flex flex-col items-center md:items-start">
              <span className="font-black text-anthracite">{profile.occupation_status}</span>
              <span className="text-anthracite/40 uppercase tracking-widest text-[10px] font-bold">Statut</span>
            </div>
          </div>

          <div className="max-w-md">
            <p className="text-anthracite/80 text-sm leading-relaxed italic font-serif">
              "{profile.bio || "Pas encore de bio renseignée..."}"
            </p>
          </div>
        </div>
      </div>

      {/* Profile Tabs (Wall vs Info) */}
      <div className="border-t border-black/5">
        <div className="flex justify-center gap-12 -mt-px">
          <button className="flex items-center gap-2 py-4 border-t-2 border-anthracite text-xs font-black uppercase tracking-widest text-anthracite">
            <Grid size={14} />
            Le Mur
          </button>
          <button className="flex items-center gap-2 py-4 border-t-2 border-transparent text-xs font-black uppercase tracking-widest text-anthracite/40 hover:text-anthracite transition-all">
            <Info size={14} />
            Détails
          </button>
        </div>
      </div>

      {/* Instagram-style Grid */}
      <div className="grid grid-cols-3 gap-1 md:gap-8 mt-8">
        {photos.map((p: any, i: number) => (
          <div 
            key={i} 
            className="aspect-square rounded-lg md:rounded-2xl overflow-hidden bg-beige group relative cursor-pointer shadow-sm hover:shadow-xl transition-all duration-500"
            onClick={() => setActivePhotoIndex(i)}
          >
            <LazyImage src={p.url} userId={profile.user_id} alt="" />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white">
              <div className="flex items-center gap-1">
                <Heart size={20} fill="currentColor" />
                <span className="font-bold">12</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle size={20} fill="currentColor" />
                <span className="font-bold">4</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Info Section */}
      <div className="mt-16 space-y-12">
        <div className="grid md:grid-cols-2 gap-12">
          <div className="space-y-6">
            <h3 className="text-xl font-serif flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-terracotta/10 flex items-center justify-center">
                <User size={16} className="text-terracotta" />
              </div>
              Portrait Physique
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Taille", value: `${profile.height} cm` },
                { label: "Physique", value: profile.physique },
                { label: "Teint", value: profile.skin_color },
                { label: "Cheveux", value: profile.hair_type },
                { label: "Ethnie", value: profile.ethnicity },
                { label: "Enfants", value: profile.has_children }
              ].map((item, idx) => (
                <div key={idx} className="bg-white p-4 rounded-2xl border border-black/5 shadow-sm">
                  <span className="text-[10px] font-black uppercase tracking-widest text-anthracite/30 block mb-1">{item.label}</span>
                  <span className="text-sm font-medium text-anthracite">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-xl font-serif flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center">
                <Heart size={16} className="text-indigo-500" />
              </div>
              Personnalité & Valeurs
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Religion", value: profile.religion },
                { label: "Jalousie", value: profile.jealous },
                { label: "Personnalité", value: profile.personality },
                { label: "Loisirs", value: profile.hobbies },
                { label: "Talent", value: profile.talent },
                { label: "Orientation", value: profile.orientation }
              ].map((item, idx) => (
                <div key={idx} className="bg-white p-4 rounded-2xl border border-black/5 shadow-sm">
                  <span className="text-[10px] font-black uppercase tracking-widest text-anthracite/30 block mb-1">{item.label}</span>
                  <span className="text-sm font-medium text-anthracite">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Questions Section */}
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-[2rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="relative z-10 space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                <Sparkles size={24} />
              </div>
              <h3 className="text-2xl font-serif">Confidences</h3>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <p className="text-white/60 text-xs font-black uppercase tracking-widest">Si vous aviez 10 millions Ar...</p>
                <p className="text-lg font-serif italic leading-relaxed">"{profile.fun_question}"</p>
              </div>
              <div className="space-y-3">
                <p className="text-white/60 text-xs font-black uppercase tracking-widest">Le respect, c'est quoi pour vous ?</p>
                <p className="text-lg font-serif italic leading-relaxed">"{profile.serious_question}"</p>
              </div>
            </div>

            <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
              <p className="text-white/80 text-sm max-w-md text-center md:text-left">
                Laissez-vous guider par l'IA pour trouver les mots justes et briser la glace avec élégance.
              </p>
              <button 
                onClick={async () => {
                  addToast("IA", "info", "Génération d'icebreakers personnalisés...");
                  try {
                    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
                    const model = "gemini-3-flash-preview";
                    const response = await ai.models.generateContent({
                      model,
                      contents: `Génère 3 icebreakers (phrases d'accroche) originaux et élégants pour aborder cette personne sur Affinity70.
                      Profil de la personne : 
                      Prénom: ${profile.first_name}
                      Bio: ${profile.bio}
                      Loisirs: ${profile.hobbies}
                      Talent: ${profile.talent}
                      Réponse à "10 millions Ar": ${profile.fun_question}
                      Réponse à "Le respect": ${profile.serious_question}
                      
                      Sois créatif, pas trop lourd, et utilise les infos de son profil.
                      Réponds avec une liste numérotée en français.`,
                    });
                    if (response.text) {
                      addToast("Conseils de l'IA", "success", response.text);
                    }
                  } catch (err) {
                    console.error(err);
                    addToast("IA", "error", "Impossible de générer des icebreakers.");
                  }
                }}
                className="flex items-center gap-3 px-8 py-4 bg-white text-indigo-600 rounded-2xl font-bold hover:bg-offwhite transition-all shadow-xl"
              >
                <Sparkles size={18} />
                Générer des Icebreakers
              </button>
            </div>
          </div>
        </div>
      </div>

      <ReportModal 
        isOpen={isReportOpen} 
        onClose={() => setIsReportOpen(false)} 
        targetId={profile.user_id} 
        targetName={profile.first_name} 
      />
    </div>
  );
};

const MyProfile = ({ user, onLogout }: { user: any, onLogout?: () => void }) => {
  const { addToast } = useContext(ToastContext);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [isHidden, setIsHidden] = useState(user.is_hidden === 1);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState<'none' | 'profile' | 'preferences' | 'photos'>('none');
  const [profileData, setProfileData] = useState<any>(null);
  const [prefsData, setPrefsData] = useState<any>(null);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [saveLoading, setSaveLoading] = useState(false);
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [privacySettings, setPrivacySettings] = useState({
    show_age: user.show_age === 1,
    show_city: user.show_city === 1,
    show_online_status: user.show_online_status === 1,
    show_read_receipts: user.show_read_receipts === 1
  });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<number | null>(null);

  useEffect(() => {
    const checkPush = async () => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          const subscription = await registration.pushManager.getSubscription();
          setIsPushEnabled(!!subscription);
        }
      }
    };
    checkPush();
  }, []);

  const togglePush = async () => {
    if (isPushEnabled) {
      // Unsubscribe
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          await fetch('/api/push/unsubscribe', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ subscription })
          });
        }
      }
      setIsPushEnabled(false);
    } else {
      // Subscribe
      await subscribeToPush();
      setIsPushEnabled(true);
    }
  };

  useEffect(() => {
    if (user) {
      fetch('/api/blocks', { headers: getAuthHeaders() })
        .then(res => res.json())
        .then(setBlockedUsers);
      
      fetch('/api/me', { headers: getAuthHeaders() })
        .then(res => res.json())
        .then(data => {
          if (data.profile) setProfileData(data.profile);
          if (data.prefs) setPrefsData(data.prefs);
          if (data.subscription) setSubscriptionData(data.subscription);
          if (data.user) {
            setPrivacySettings({
              show_age: data.user.show_age === 1,
              show_city: data.user.show_city === 1,
              show_online_status: data.user.show_online_status === 1,
              show_read_receipts: data.user.show_read_receipts === 1
            });
          }
        });

      fetch('/api/photos', { headers: getAuthHeaders() })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setPhotos(data);
        });
    }
  }, [user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(profileData)
      });
      if (res.ok) {
        setEditMode('none');
        addToast("Succès", "success", "Profil mis à jour !");
      }
    } catch (err) {
      addToast("Erreur", "error", "Erreur lors de la mise à jour");
    } finally {
      setSaveLoading(false);
    }
  };

  const handlePrefsUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      const res = await fetch('/api/preferences', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(prefsData)
      });
      if (res.ok) {
        setEditMode('none');
        addToast("Succès", "success", "Préférences mises à jour !");
      }
    } catch (err) {
      addToast("Erreur", "error", "Erreur lors de la mise à jour");
    } finally {
      setSaveLoading(false);
    }
  };

  const toggleHide = async () => {
    setLoading(true);
    const res = await fetch('/api/privacy/hide', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ isHidden: !isHidden })
    });
    if (res.ok) {
      setIsHidden(!isHidden);
    }
    setLoading(false);
  };

  const updatePrivacySetting = async (key: string, value: boolean) => {
    const newSettings = { ...privacySettings, [key]: value as any };
    setPrivacySettings(newSettings as any);
    try {
      await fetch('/api/privacy/settings', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newSettings)
      });
      addToast("Confidentialité", "success", "Paramètres mis à jour");
    } catch (err) {
      addToast("Erreur", "error", "Échec de la mise à jour");
    }
  };

  const deleteAccount = async () => {
    const res = await fetch('/api/account', {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (res.ok) {
      localStorage.removeItem('token');
      window.location.href = '/';
    }
  };

  const unblock = async (id: number) => {
    const res = await fetch('/api/unblock', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ blockedId: id })
    });
    if (res.ok) {
      setBlockedUsers(blockedUsers.filter(u => u.user_id !== id));
      addToast("Profil débloqué", "success", "Vous pouvez à nouveau interagir avec cette personne.");
    } else {
      addToast("Oups", "error", "Impossible de débloquer ce profil pour le moment.");
    }
  };

  const uploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    setSaveLoading(true);
    const formData = new FormData();
    (files as File[]).forEach(file => {
      formData.append('photos', file);
    });
    
    try {
      const res = await fetch('/api/photos', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setPhotos(data);
        addToast("Photos ajoutées", "success", "Votre galerie a été mise à jour.");
      }
    } catch (err) {
      addToast("Erreur", "error", "Impossible d'ajouter les photos.");
    } finally {
      setSaveLoading(false);
    }
  };

  const deletePhoto = async () => {
    if (!photoToDelete) return;
    try {
      const res = await fetch(`/api/photos/${photoToDelete}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        setPhotos(prev => prev.filter(p => p.id !== photoToDelete));
        addToast("Photo supprimée", "info");
      }
    } catch (err) {
      addToast("Erreur", "error");
    } finally {
      setPhotoToDelete(null);
    }
  };

  const setPrimaryPhoto = async (id: number) => {
    try {
      const res = await fetch(`/api/photos/${id}/primary`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        setPhotos(prev => prev.map(p => ({ ...p, is_primary: p.id === id ? 1 : 0 })));
        addToast("Photo principale mise à jour", "success");
      }
    } catch (err) {
      addToast("Erreur", "error");
    }
  };

  if (!user) return <Navigate to="/login" />;

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-8">
      {user.status === 'active' && subscriptionData && (
        <div className="bg-green-50 border border-green-100 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <CheckCircle className="text-green-600" size={32} />
            <div>
              <h3 className="font-bold text-green-900">Abonnement Premium Actif</h3>
              <p className="text-sm text-green-700">
                Expire le {new Date(subscriptionData.end_date).toLocaleDateString('fr-FR')} 
                ({Math.max(0, Math.ceil((new Date(subscriptionData.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} jours restants)
              </p>
            </div>
          </div>
          <Link to="/subscription" className="text-green-600 font-bold text-sm hover:underline">Détails</Link>
        </div>
      )}

      {user.status === 'expired' && (
        <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <ShieldAlert className="text-indigo-500" size={32} />
            <div>
              <h3 className="font-bold text-indigo-900">Abonnement expiré</h3>
              <p className="text-sm text-indigo-700">Renouvelez votre accès pour continuer à découvrir des profils.</p>
            </div>
          </div>
          <Link to="/subscription" className="btn-primary whitespace-nowrap">Se réabonner</Link>
        </div>
      )}

      {user.status === 'pending' && (
        <div className="bg-yellow-50 border border-yellow-100 p-6 rounded-3xl flex items-center gap-4">
          <Clock className="text-yellow-600 animate-pulse" size={32} />
          <div>
            <h3 className="font-bold text-yellow-900">Validation en cours</h3>
            <p className="text-sm text-yellow-700">Votre profil est en cours de vérification. Il sera visible dès validation.</p>
          </div>
        </div>
      )}

      {user.status === 'inactive' && (
        <div className="bg-terracotta/5 border border-terracotta/10 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Heart className="text-terracotta" size={32} />
            <div>
              <h3 className="font-bold text-anthracite">Bienvenue sur Affinity70</h3>
              <p className="text-sm text-anthracite/60">Complétez votre profil et abonnez-vous pour commencer.</p>
            </div>
          </div>
          <Link to="/subscription" className="btn-primary whitespace-nowrap">S'abonner (2 000 Ar)</Link>
        </div>
      )}

      <div className="card">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-serif">Mon Profil</h2>
          <div className="flex gap-2">
            <button 
              onClick={() => setEditMode(editMode === 'profile' ? 'none' : 'profile')}
              className="px-4 py-2 bg-terracotta/10 text-terracotta rounded-xl font-bold hover:bg-terracotta hover:text-white transition-all text-sm"
            >
              {editMode === 'profile' ? 'Annuler' : 'Modifier Profil'}
            </button>
            <button 
              onClick={() => setEditMode(editMode === 'preferences' ? 'none' : 'preferences')}
              className="px-4 py-2 bg-anthracite/10 text-anthracite rounded-xl font-bold hover:bg-anthracite hover:text-white transition-all text-sm"
            >
              {editMode === 'preferences' ? 'Annuler' : 'Modifier Préférences'}
            </button>
            <button 
              onClick={() => setEditMode(editMode === 'photos' ? 'none' : 'photos')}
              className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold hover:bg-indigo-600 hover:text-white transition-all text-sm"
            >
              {editMode === 'photos' ? 'Annuler' : 'Gérer Photos'}
            </button>
          </div>
        </div>

        {editMode === 'photos' ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-serif">Ma Galerie Photos</h3>
              <label className="cursor-pointer bg-terracotta text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-terracotta/90 transition-all flex items-center gap-2">
                <Camera size={16} />
                Ajouter une photo
                <input type="file" className="hidden" accept="image/*" multiple onChange={uploadPhoto} disabled={saveLoading} />
              </label>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {photos.map(photo => (
                <div key={photo.id} className="relative group aspect-square rounded-2xl overflow-hidden bg-beige border border-white/5">
                  <img src={photo.url} className="w-full h-full object-cover" alt="" />
                  
                  {photo.is_primary === 1 && (
                    <div className="absolute top-2 left-2 bg-terracotta text-white text-[10px] font-black uppercase px-2 py-1 rounded-lg shadow-lg">
                      Principale
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {photo.is_primary === 0 && (
                      <button 
                        onClick={() => setPrimaryPhoto(photo.id)}
                        className="p-2 bg-white text-beige rounded-full hover:bg-terracotta hover:text-beige transition-all"
                        title="Définir comme principale"
                      >
                        <Star size={16} />
                      </button>
                    )}
                    <button 
                      onClick={() => setPhotoToDelete(photo.id)}
                      className="p-2 bg-white text-indigo-500 rounded-full hover:bg-indigo-500 hover:text-white transition-all"
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              
              {photos.length === 0 && (
                <div className="col-span-full py-12 text-center bg-beige/30 rounded-3xl border-2 border-dashed border-anthracite/10">
                  <Camera size={40} className="mx-auto text-anthracite/20 mb-2" />
                  <p className="text-anthracite/40 italic">Aucune photo dans votre galerie.</p>
                </div>
              )}
            </div>
          </div>
        ) : editMode === 'profile' && profileData ? (
          <form onSubmit={handleProfileUpdate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-full">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold uppercase text-anthracite/40 block">Bio / Présentation</label>
                  <button 
                    type="button"
                    onClick={async () => {
                      if (!profileData.bio) {
                        addToast("Info", "info", "Écrivez d'abord un brouillon de bio pour que je puisse l'optimiser.");
                        return;
                      }
                      setSaveLoading(true);
                      try {
                        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
                        const model = "gemini-3-flash-preview";
                        const response = await ai.models.generateContent({
                          model,
                          contents: `Optimise cette bio de rencontre pour Affinity70 (app premium à Madagascar). 
                          Rends-la plus élégante, mystérieuse et attirante, tout en restant authentique. 
                          Bio actuelle : "${profileData.bio}"
                          Réponds uniquement avec la nouvelle bio optimisée en français.`,
                        });
                        if (response.text) {
                          setProfileData({...profileData, bio: response.text.trim()});
                          addToast("IA", "success", "Votre bio a été optimisée avec élégance !");
                        }
                      } catch (err) {
                        console.error(err);
                        addToast("IA", "error", "Impossible d'optimiser la bio pour le moment.");
                      } finally {
                        setSaveLoading(false);
                      }
                    }}
                    disabled={saveLoading}
                    className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-terracotta hover:text-terracotta/80 transition-colors"
                  >
                    <Wand2 size={12} />
                    Optimiser avec l'IA
                  </button>
                </div>
                <textarea 
                  className="w-full p-3 rounded-xl border min-h-[100px]" 
                  value={profileData.bio || ''} 
                  onChange={e => setProfileData({...profileData, bio: e.target.value})}
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-anthracite/40 block mb-1">Prénom</label>
                <input className="w-full p-3 rounded-xl border" value={profileData.first_name} onChange={e => setProfileData({...profileData, firstName: e.target.value, first_name: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-anthracite/40 block mb-1">Nom</label>
                <input className="w-full p-3 rounded-xl border" value={profileData.last_name} onChange={e => setProfileData({...profileData, lastName: e.target.value, last_name: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-anthracite/40 block mb-1">Âge</label>
                <input type="number" className="w-full p-3 rounded-xl border" value={profileData.age} onChange={e => setProfileData({...profileData, age: parseInt(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-anthracite/40 block mb-1">Ville</label>
                <ChoiceGrid options={CITIES} value={profileData.city} onChange={v => setProfileData({...profileData, city: v})} columns={3} />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-anthracite/40 block mb-1">Loisirs / Hobbies</label>
                <input className="w-full p-3 rounded-xl border" value={profileData.hobbies} onChange={e => setProfileData({...profileData, hobbies: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-anthracite/40 block mb-1">Talent</label>
                <input className="w-full p-3 rounded-xl border" value={profileData.talent} onChange={e => setProfileData({...profileData, talent: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-anthracite/40 block mb-1">Physique</label>
                <ChoiceGrid options={["Svelte", "Moyenne", "Athlétique", "En formes", "Autre"]} value={profileData.physique} onChange={v => setProfileData({...profileData, physique: v})} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-anthracite/40 block mb-1">Religion</label>
                <ChoiceGrid options={["Protestant(e)", "Catholique", "Adventiste", "Musulman(e)", "Autre"]} value={profileData.religion} onChange={v => setProfileData({...profileData, religion: v})} columns={3} />
              </div>
            </div>
            <button type="submit" disabled={saveLoading} className="btn-primary w-full py-4">
              {saveLoading ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </form>
        ) : editMode === 'preferences' && prefsData ? (
          <form onSubmit={handlePrefsUpdate} className="space-y-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-anthracite/40 block mb-1">Âge Min</label>
                  <input type="number" className="w-full p-3 rounded-xl border" value={prefsData.min_age} onChange={e => setPrefsData({...prefsData, minAge: parseInt(e.target.value), min_age: parseInt(e.target.value)})} />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-anthracite/40 block mb-1">Âge Max</label>
                  <input type="number" className="w-full p-3 rounded-xl border" value={prefsData.max_age} onChange={e => setPrefsData({...prefsData, maxAge: parseInt(e.target.value), max_age: parseInt(e.target.value)})} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-anthracite/40 block mb-1">Ville idéale</label>
                <ChoiceGrid options={["Indifférent", ...CITIES]} value={prefsData.city} onChange={v => setPrefsData({...prefsData, city: v})} columns={3} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-anthracite/40 block mb-1">Religion</label>
                <ChoiceGrid options={["Indifférent", "Protestant(e)", "Catholique", "Adventiste", "Musulman(e)", "Autre"]} value={prefsData.religion} onChange={v => setPrefsData({...prefsData, religion: v})} columns={3} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-anthracite/40 block mb-1">Physique</label>
                <ChoiceGrid options={["Indifférent", "Svelte", "Moyenne", "Athlétique", "En formes", "Autre"]} value={prefsData.physique} onChange={v => setPrefsData({...prefsData, physique: v})} />
              </div>
            </div>
            <button type="submit" disabled={saveLoading} className="btn-primary w-full py-4">
              {saveLoading ? 'Enregistrement...' : 'Enregistrer les préférences'}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between border-b pb-2">
              <span className="text-anthracite/60">Email</span>
              <span className="font-medium">{user.email}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-anthracite/60">Statut</span>
              <span className="text-green-500 font-bold uppercase">{user.status}</span>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="text-2xl font-serif mb-6 flex items-center gap-2">
          <Settings className="text-terracotta" />
          Confidentialité
        </h2>
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-beige/10 rounded-2xl">
            <div>
              <h4 className="font-bold">Masquer mon profil</h4>
              <p className="text-xs text-anthracite/60">Votre profil n'apparaîtra plus dans les découvertes.</p>
            </div>
            <button 
              onClick={toggleHide}
              disabled={loading}
              className={cn(
                "w-12 h-6 rounded-full transition-all relative",
                isHidden ? "bg-terracotta" : "bg-black/10"
              )}
            >
              <div className={cn(
                "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                isHidden ? "right-1" : "left-1"
              )} />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-beige/10 rounded-2xl">
            <div>
              <h4 className="font-bold">Notifications Push</h4>
              <p className="text-xs text-anthracite/60">Recevoir des alertes pour les nouveaux matchs et messages.</p>
            </div>
            <button 
              onClick={togglePush}
              className={cn(
                "w-12 h-6 rounded-full transition-all relative",
                isPushEnabled ? "bg-terracotta" : "bg-black/10"
              )}
            >
              <div className={cn(
                "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                isPushEnabled ? "right-1" : "left-1"
              )} />
            </button>
          </div>

          <div className="pt-4 border-t border-black/5">
            <h3 className="text-sm font-bold uppercase text-anthracite/40 mb-4">Visibilité des données</h3>
            <div className="space-y-4">
              {[
                { key: 'show_age', label: 'Afficher mon âge', desc: 'Permettre aux autres de voir votre âge.' },
                { key: 'show_city', label: 'Afficher ma ville', desc: 'Afficher votre localisation sur votre profil.' },
                { key: 'show_online_status', label: 'Statut en ligne', desc: 'Montrer quand vous êtes actif.' },
                { key: 'show_read_receipts', label: 'Confirmations de lecture', desc: 'Savoir quand vos messages sont lus.' }
              ].map((setting) => (
                <div key={setting.key} className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold">{setting.label}</h4>
                    <p className="text-[10px] text-anthracite/60">{setting.desc}</p>
                  </div>
                  <button 
                    onClick={() => updatePrivacySetting(setting.key, !(privacySettings as any)[setting.key])}
                    className={cn(
                      "w-10 h-5 rounded-full transition-all relative",
                      (privacySettings as any)[setting.key] ? "bg-terracotta" : "bg-black/10"
                    )}
                  >
                    <div className={cn(
                      "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all",
                      (privacySettings as any)[setting.key] ? "right-0.5" : "left-0.5"
                    )} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 border border-indigo-100 rounded-2xl bg-indigo-50/30">
            <h4 className="font-bold text-indigo-500 mb-1">Zone de danger</h4>
            <p className="text-xs text-anthracite/60 mb-4">La suppression de votre compte est définitive et immédiate.</p>
            <button 
              onClick={() => setIsDeleteModalOpen(true)}
              className="flex items-center gap-2 text-indigo-500 text-sm font-bold hover:underline"
            >
              <Trash2 size={16} />
              Supprimer mon compte définitivement
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-2xl font-serif mb-6 flex items-center gap-2">
          <ShieldCheck className="text-indigo-500" />
          Utilisateurs bloqués
        </h2>
        {blockedUsers.length === 0 ? (
          <p className="text-anthracite/40 text-center py-4 italic">Aucun utilisateur bloqué.</p>
        ) : (
          <div className="divide-y divide-black/5">
            {blockedUsers.map(u => (
              <div key={u.user_id} className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img src={u.photo_url || `https://picsum.photos/seed/${u.user_id}/50/50`} className="w-10 h-10 rounded-full object-cover" alt="" />
                  <span className="font-medium">{u.first_name}</span>
                </div>
                <button onClick={() => unblock(u.user_id)} className="text-xs font-bold text-terracotta hover:underline">Débloquer</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ThemedModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={deleteAccount}
        title="Suppression de compte"
        message="Cette action est irréversible. Toutes vos données, messages et abonnements seront supprimés définitivement de l'univers Affinity70. Souhaitez-vous vraiment nous quitter ?"
        type="danger"
        confirmText="Supprimer définitivement"
        cancelText="Rester avec nous"
      />

      <ThemedModal 
        isOpen={photoToDelete !== null}
        onClose={() => setPhotoToDelete(null)}
        onConfirm={deletePhoto}
        title="Supprimer la photo"
        message="Voulez-vous vraiment supprimer cette photo de votre galerie ? Cette action est irréversible."
        type="danger"
        confirmText="Supprimer"
        cancelText="Annuler"
      />
    </div>
  );
};

const Favorites = ({ user }: { user: any }) => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/favorites', { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setProfiles(data);
        setLoading(false);
      });
  }, []);

  const removeFavorite = async (id: number) => {
    const res = await fetch(`/api/favorites/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (res.ok) {
      setProfiles(profiles.filter(p => p.user_id !== id));
    }
  };

  if (loading) return <div className="p-12 text-center">Chargement de vos favoris...</div>;

  return (
    <div className="max-w-7xl mx-auto py-12 px-4">
      <div className="mb-8">
        <h2 className="text-4xl font-serif mb-2">Mes Favoris</h2>
        <p className="text-anthracite/60">Retrouvez ici les profils que vous avez marqués d'un cœur.</p>
      </div>

      {profiles.length === 0 ? (
        <div className="text-center py-20 bg-beige/10 rounded-3xl">
          <Heart size={40} className="mx-auto mb-4 text-anthracite/20" />
          <p className="text-anthracite/40">Vous n'avez pas encore de favoris.</p>
          <Link to="/discover" className="btn-primary mt-6 inline-block">Découvrir des profils</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {profiles.map((p) => (
            <motion.div 
              key={p.user_id}
              whileHover={{ y: -10 }}
              className="group bg-beige rounded-3xl overflow-hidden shadow-sm border border-white/5 relative"
            >
              <button 
                onClick={() => removeFavorite(p.user_id)}
                className="absolute top-4 right-4 z-10 p-2 bg-beige/80 backdrop-blur-sm rounded-full text-indigo-500 shadow-md hover:bg-beige transition-all opacity-0 group-hover:opacity-100"
                title="Retirer des favoris"
              >
                <Trash2 size={16} />
              </button>
              <div className="aspect-[3/4] bg-beige/50">
                <LazyImage 
                  src={p.photo_url} 
                  userId={p.user_id}
                  alt={p.first_name}
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold mb-1">{p.first_name}, {p.age}</h3>
                <p className="text-anthracite/60 text-sm mb-4">{p.city}</p>
                <Link to={`/profile/${p.user_id}`} className="btn-secondary w-full flex justify-center py-2 text-sm">Voir le profil</Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

const Admin = () => {
  const { addToast } = useContext(ToastContext);
  const [txs, setTxs] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'transactions' | 'reports' | 'suggestions'>('transactions');
  
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'info' | 'danger' | 'success';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'info'
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [txRes, reportRes, suggestionRes] = await Promise.all([
          fetch('/api/admin/transactions', { headers: getAuthHeaders() }),
          fetch('/api/admin/reports', { headers: getAuthHeaders() }),
          fetch('/api/admin/suggestions', { headers: getAuthHeaders() })
        ]);
        
        const txData = await txRes.json();
        const reportData = await reportRes.json();
        const suggestionData = await suggestionRes.json();
        
        if (Array.isArray(txData)) setTxs(txData);
        if (Array.isArray(reportData)) setReports(reportData);
        if (Array.isArray(suggestionData)) setSuggestions(suggestionData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const approve = async (txId: number, userId: number) => {
    setConfirmModal({
      isOpen: true,
      title: "Validation d'accès",
      message: "Souhaitez-vous valider l'accès de cet utilisateur ? Un message de bienvenue lui sera envoyé.",
      type: 'success',
      onConfirm: async () => {
        setActionLoading(txId);
        try {
          const res = await fetch('/api/admin/approve', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ transactionId: txId, userId })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Erreur lors de l'approbation");
          setTxs(txs.filter(t => t.id !== txId));
          addToast("Accès validé ✨", "success", "L'utilisateur a été notifié et peut désormais profiter de son abonnement.");
        } catch (err) {
          addToast("Action impossible", "error", "Nous n'avons pas pu valider cet accès. Veuillez réessayer.");
        } finally {
          setActionLoading(null);
        }
      }
    });
  };

  const reject = async (txId: number) => {
    setConfirmModal({
      isOpen: true,
      title: "Rejet de transaction",
      message: "Êtes-vous sûr de vouloir rejeter cette transaction ? Cette action est définitive.",
      type: 'danger',
      onConfirm: async () => {
        setActionLoading(txId);
        try {
          const res = await fetch('/api/admin/reject', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ transactionId: txId })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Erreur lors du rejet");
          setTxs(txs.filter(t => t.id !== txId));
          addToast("Transaction rejetée", "info", "La demande a été classée sans suite.");
        } catch (err) {
          addToast("Erreur", "error", err instanceof Error ? err.message : "Une erreur est survenue");
        } finally {
          setActionLoading(null);
        }
      }
    });
  };

  const restrictUser = async (userId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    setConfirmModal({
      isOpen: true,
      title: newStatus === 'inactive' ? "Restriction de compte" : "Réactivation de compte",
      message: `Souhaitez-vous vraiment ${newStatus === 'inactive' ? 'suspendre' : 'rétablir'} l'accès pour cet utilisateur ?`,
      type: newStatus === 'inactive' ? 'danger' : 'success',
      onConfirm: async () => {
        const res = await fetch('/api/admin/restrict', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ userId, status: newStatus })
        });
        if (res.ok) {
          setReports(reports.map(r => r.reported_id === userId ? { ...r, reported_status: newStatus } : r));
          addToast("Statut mis à jour", "success", "Le changement a été appliqué immédiatement.");
        }
      }
    });
  };

  if (loading) return (
    <div className="min-h-[60dvh] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-terracotta"></div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 md:py-12">
      <div className="mb-10">
        <h2 className="text-4xl font-serif mb-2">Espace Admin</h2>
        <p className="text-anthracite/60">Gestion de la plateforme et modération.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1 space-y-2">
          <button 
            onClick={() => setActiveTab('transactions')}
            className={cn(
              "w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold transition-all",
              activeTab === 'transactions' 
                ? "bg-terracotta text-offwhite shadow-lg shadow-black/40" 
                : "bg-beige text-anthracite/60 hover:bg-beige/80 hover:text-terracotta border border-white/5"
            )}
          >
            <CreditCard size={20} />
            <span>Paiements</span>
            <span className={cn(
              "ml-auto px-2 py-0.5 rounded-full text-[10px]",
              activeTab === 'transactions' ? "bg-white/20" : "bg-terracotta/10 text-terracotta"
            )}>{txs.length}</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('reports')}
            className={cn(
              "w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold transition-all",
              activeTab === 'reports' 
                ? "bg-terracotta text-offwhite shadow-lg shadow-black/40" 
                : "bg-beige text-anthracite/60 hover:bg-beige/80 hover:text-terracotta border border-white/5"
            )}
          >
            <Shield size={20} />
            <span>Signalements</span>
            <span className={cn(
              "ml-auto px-2 py-0.5 rounded-full text-[10px]",
              activeTab === 'reports' ? "bg-white/20" : "bg-terracotta/10 text-terracotta"
            )}>{reports.length}</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('suggestions')}
            className={cn(
              "w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold transition-all",
              activeTab === 'suggestions' 
                ? "bg-terracotta text-offwhite shadow-lg shadow-black/40" 
                : "bg-beige text-anthracite/60 hover:bg-beige/80 hover:text-terracotta border border-white/5"
            )}
          >
            <Lightbulb size={20} />
            <span>Suggestions</span>
            <span className={cn(
              "ml-auto px-2 py-0.5 rounded-full text-[10px]",
              activeTab === 'suggestions' ? "bg-white/20" : "bg-terracotta/10 text-terracotta"
            )}>{suggestions.length}</span>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          {activeTab === 'transactions' ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-serif">Transactions en attente</h3>
                <div className="text-xs font-bold text-terracotta uppercase tracking-wider">M-Vola / Orange Money</div>
              </div>
              
              {txs.length === 0 ? (
                <div className="card p-20 text-center bg-beige/50 border-dashed">
                  <div className="bg-green-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="text-green-500" size={32} />
                  </div>
                  <h3 className="text-xl font-serif mb-2">Tout est en ordre</h3>
                  <p className="text-anthracite/40">Aucun paiement en attente de validation.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {txs.map(t => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={t.id} 
                      className="bg-beige rounded-3xl p-6 border border-white/5 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
                    >
                      <div className="flex gap-4 items-center">
                        <div className="w-12 h-12 bg-terracotta/10 rounded-2xl flex items-center justify-center text-terracotta font-bold text-lg">
                          {t.first_name[0]}
                        </div>
                        <div>
                          <div className="font-bold text-lg">{t.first_name} {t.last_name}</div>
                          <div className="text-sm text-anthracite/40">{t.email}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:flex md:gap-8 gap-4">
                        <div>
                          <div className="text-[10px] font-bold text-anthracite/30 uppercase">Mobile</div>
                          <div className="font-medium">{t.mvola_number}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-anthracite/30 uppercase">ID Trans.</div>
                          <div className="font-mono text-xs bg-offwhite/50 px-2 py-1 rounded border border-white/5">{t.transaction_id}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {t.proof_url && (
                          <a 
                            href={t.proof_url} 
                            target="_blank" 
                            className="p-3 bg-offwhite/50 text-anthracite/60 rounded-2xl hover:bg-offwhite transition-colors border border-white/5"
                            title="Voir la preuve"
                          >
                            <Search size={20} />
                          </a>
                        )}
                        <button 
                          onClick={() => reject(t.id)} 
                          disabled={actionLoading === t.id}
                          className="p-3 bg-offwhite/50 text-anthracite/40 hover:text-terracotta hover:bg-terracotta/10 rounded-2xl transition-all border border-white/5"
                        >
                          <X size={20} />
                        </button>
                        <button 
                          onClick={() => approve(t.id, t.user_id)} 
                          disabled={actionLoading === t.id}
                          className="flex items-center gap-2 bg-terracotta text-offwhite px-6 py-3 rounded-2xl font-bold shadow-lg shadow-black/40 hover:bg-accent-hover transition-all disabled:opacity-50"
                        >
                          {actionLoading === t.id ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <CheckCircle size={18} />
                          )}
                          <span>Valider</span>
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === 'reports' ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-serif">Signalements & Modération</h3>
                <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">Sécurité de la plateforme</div>
              </div>

              {reports.length === 0 ? (
                <div className="card p-20 text-center bg-beige/50 border-dashed">
                  <div className="bg-offwhite/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                    <ShieldCheck className="text-slate-400" size={32} />
                  </div>
                  <h3 className="text-xl font-serif mb-2">Aucun signalement</h3>
                  <p className="text-anthracite/40">La communauté se porte bien !</p>
                </div>
              ) : (
                <div className="bg-beige rounded-3xl border border-white/5 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-800 text-white">
                          <th className="p-6 font-medium text-sm">Utilisateur</th>
                          <th className="p-6 font-medium text-sm">Gravité</th>
                          <th className="p-6 font-medium text-sm">Dernière Raison</th>
                          <th className="p-6 font-medium text-sm">Statut</th>
                          <th className="p-6 font-medium text-sm text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5">
                        {reports.map(r => (
                          <tr key={r.id} className="hover:bg-white/5 transition-colors">
                            <td className="p-6">
                              <div className="font-bold text-slate-800">{r.reported_name}</div>
                              <div className="text-[10px] text-slate-400">ID: {r.reported_id}</div>
                            </td>
                            <td className="p-6">
                              <div className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                r.report_count >= 5 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                              )}>
                                <ShieldAlert size={12} />
                                {r.report_count} Signalements
                              </div>
                            </td>
                            <td className="p-6">
                              <div className="text-sm font-medium text-slate-700">{r.reason}</div>
                              <div className="text-xs text-slate-400 italic mt-1">"{r.details}"</div>
                            </td>
                            <td className="p-6">
                              <div className={cn(
                                "inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest",
                                r.reported_status === 'active' ? "text-emerald-600 bg-emerald-50" : "text-slate-400 bg-slate-100"
                              )}>
                                {r.reported_status}
                              </div>
                            </td>
                            <td className="p-6 text-right">
                              <button 
                                onClick={() => restrictUser(r.reported_id, r.reported_status)}
                                className={cn(
                                  "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                                  r.reported_status === 'active' 
                                    ? "bg-slate-800 text-white hover:bg-slate-900" 
                                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                                )}
                              >
                                {r.reported_status === 'active' ? "Restreindre" : "Réactiver"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-serif">Suggestions & Feedback</h3>
                <div className="text-xs font-bold text-amber-600 uppercase tracking-wider">Voix des utilisateurs</div>
              </div>
              
              <div className="grid gap-4">
                {suggestions.map(s => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={s.id} 
                    className="bg-beige rounded-3xl p-6 border border-white/5 shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex gap-4 items-center">
                        <div className="w-10 h-10 bg-terracotta/10 rounded-xl flex items-center justify-center text-terracotta font-bold">
                          {s.first_name[0]}
                        </div>
                        <div>
                          <div className="font-bold">{s.first_name} {s.last_name}</div>
                          <div className="text-xs text-anthracite/40">{s.email}</div>
                        </div>
                      </div>
                      <div className="text-[10px] font-bold text-anthracite/40 uppercase bg-offwhite/50 px-2 py-1 rounded border border-white/5">
                        {new Date(s.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="bg-beige/10 p-4 rounded-2xl text-anthracite/80 text-sm leading-relaxed italic">
                      "{s.content}"
                    </div>
                  </motion.div>
                ))}
                {suggestions.length === 0 && (
                  <div className="card p-20 text-center bg-beige/50 border-dashed">
                    <div className="bg-terracotta/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Lightbulb className="text-terracotta" size={32} />
                    </div>
                    <h3 className="text-xl font-serif mb-2">Aucun message</h3>
                    <p className="text-anthracite/40">Les utilisateurs n'ont pas encore envoyé de suggestions.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <ThemedModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type as any}
      />
    </div>

  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(() => !!localStorage.getItem('token'));
  const [profileCache, setProfileCache] = useState<Record<number, any>>({});
  const [discoverCache, setDiscoverCache] = useState<any[] | null>(null);
  const [socket, setSocket] = useState<any>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const addToast = (message: string, type: 'error' | 'success' | 'info', reason?: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type, reason }]);
    setTimeout(() => removeToast(id), 5000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const updateProfileCache = (profiles: any[]) => {
    setProfileCache(prev => {
      const newCache = { ...prev };
      profiles.forEach(p => {
        newCache[p.user_id] = p;
      });
      return newCache;
    });
  };

  useEffect(() => {
    if (user) {
      const s = io();
      s.emit('join', user.id);
      s.on('newNotification', (notif: any) => {
        addToast(notif.message, 'info');
      });
      s.on('newMatch', (data: any) => {
        addToast("Nouveau Match !", 'success', data.message);
      });
      s.on('onlineUsers', (users: number[]) => {
        setOnlineUsers(new Set(users));
      });
      s.on('userOnline', (userId: number) => {
        setOnlineUsers(prev => {
          const next = new Set(prev);
          next.add(userId);
          return next;
        });
      });
      s.on('userOffline', (userId: number) => {
        setOnlineUsers(prev => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      });
      setSocket(s);
      
      // Subscribe to Push Notifications
      subscribeToPush();

      return () => {
        s.off('newNotification');
        s.off('newMatch');
        s.off('onlineUsers');
        s.off('userOnline');
        s.off('userOffline');
        s.disconnect();
      };
    } else {
      setSocket(null);
      setOnlineUsers(new Set());
    }
  }, [user]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/me', { headers: getAuthHeaders() })
        .then(res => res.json())
        .then(data => {
          if (!data.error) setUser(data.user);
          setLoading(false);
        })
        .catch(err => {
          console.error("Auth fetch failed:", err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const logout = () => {
    setIsLogoutModalOpen(true);
  };

  const performLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setSocket(null);
    setIsLogoutModalOpen(false);
  };

  if (loading) return (
    <div className="h-dvh flex flex-col items-center justify-center bg-offwhite">
      <div className="relative w-24 h-24 mb-8">
        <div className="absolute inset-0 border-4 border-terracotta/20 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-terracotta border-t-transparent rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Heart className="text-terracotta animate-pulse" size={32} fill="currentColor" />
        </div>
      </div>
      <div className="font-serif text-4xl text-anthracite tracking-tighter" translate="no">Affinity70</div>
      <div className="text-anthracite/40 text-sm mt-4 uppercase tracking-[0.3em]">L'excellence à 70%</div>
    </div>
  );

  return (
    <AppErrorBoundary>
      <ToastContext.Provider value={{ addToast }}>
        <Router>
        <div className="min-h-dvh flex flex-col">
          <Navbar user={user} onLogout={logout} socket={socket} />
          <main className="flex-grow">
            <Routes>
            <Route path="/" element={<Hero user={user} onLogout={logout} />} />
            <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? "/admin" : (user.status === 'active' ? "/discover" : "/subscription")} /> : <Login setUser={setUser} />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/register" element={user ? <Navigate to="/subscription" /> : <Register setUser={setUser} />} />
            <Route path="/discover" element={<StatusGuard user={user} onLogout={logout}><Discover user={user} updateCache={updateProfileCache} discoverCache={discoverCache} setDiscoverCache={setDiscoverCache} onlineUsers={onlineUsers} /></StatusGuard>} />
            <Route path="/favorites" element={<StatusGuard user={user} onLogout={logout}><Favorites user={user} /></StatusGuard>} />
            <Route path="/chat" element={<StatusGuard user={user} onLogout={logout}><Chat user={user} socket={socket} onlineUsers={onlineUsers} /></StatusGuard>} />
            <Route path="/chat/:id" element={<StatusGuard user={user} onLogout={logout}><Chat user={user} socket={socket} onlineUsers={onlineUsers} /></StatusGuard>} />
            <Route path="/profile" element={user ? <MyProfile user={user} onLogout={logout} /> : <Navigate to="/login" />} />
            <Route path="/profile/:id" element={<StatusGuard user={user} onLogout={logout}><UserProfile user={user} cache={profileCache} onlineUsers={onlineUsers} /></StatusGuard>} />
            <Route path="/subscription" element={user ? <Subscription user={user} onLogout={logout} /> : <Navigate to="/login" />} />
            <Route path="/admin" element={user?.role === 'admin' ? <Admin /> : <Navigate to="/" />} />
            
            <Route path="/about" element={
              <StaticPage 
                title="À propos d'Affinity70" 
                content={
                  <>
                    <p><span translate="no">Affinity70</span> est la première plateforme de rencontre à Madagascar dédiée à l'excellence et à l'authenticité. Notre mission est de créer des connexions durables et significatives entre des personnes qui partagent des valeurs et des aspirations communes.</p>
                    <p>Notre algorithme unique garantit une compatibilité minimale de 70% entre les profils, basée sur des critères psychologiques, culturels et personnels approfondis. Nous croyons que les rencontres de qualité commencent par une sélection rigoureuse et une sécurité sans faille.</p>
                    <p>Chaque profil est vérifié manuellement pour garantir une communauté saine et respectueuse. Avec <span translate="no">Affinity70</span>, trouvez enfin la personne qui vous correspond vraiment.</p>
                  </>
                } 
              />
            } />

            <Route path="/privacy" element={
              <StaticPage 
                title="Politique de Confidentialité" 
                content={
                  <>
                    <p>Votre vie privée est notre priorité absolue. Chez <span translate="no">Affinity70</span>, nous nous engageons à protéger vos données personnelles avec la plus grande rigueur.</p>
                    <h3 className="text-xl font-bold mt-6">Protection des données</h3>
                    <p>Nous ne partageons jamais vos informations avec des tiers à des fins commerciales. Toutes vos photos et données de profil sont stockées de manière sécurisée.</p>
                    <h3 className="text-xl font-bold mt-6">Contrôle total</h3>
                    <p>Vous avez un contrôle total sur la visibilité de votre profil. Vous pouvez choisir de masquer votre compte des résultats de recherche ou de le supprimer définitivement à tout moment depuis vos paramètres.</p>
                    <h3 className="text-xl font-bold mt-6">Géolocalisation</h3>
                    <p>Nous utilisons votre ville pour vous proposer des profils à proximité, mais nous ne partageons jamais votre position exacte en temps réel.</p>
                  </>
                } 
              />
            } />

            <Route path="/terms" element={
              <StaticPage 
                title="Conditions d'Utilisation" 
                content={
                  <>
                    <p>En utilisant <span translate="no">Affinity70</span>, vous acceptez de respecter les règles de notre communauté pour garantir une expérience agréable à tous.</p>
                    <h3 className="text-xl font-bold mt-6">Éligibilité</h3>
                    <p>L'accès à la plateforme est strictement réservé aux personnes de <strong>16 ans et plus</strong>. L'accès est interdit aux mineurs de moins de 16 ans.</p>
                    <h3 className="text-xl font-bold mt-6">Comportement attendu</h3>
                    <p>Vous vous engagez à fournir des informations véridiques et à traiter les autres membres avec respect. Tout comportement abusif, harcèlement, discours de haine ou création de faux profils entraînera un bannissement immédiat et définitif.</p>
                    <h3 className="text-xl font-bold mt-6">Responsabilité</h3>
                    <p><span translate="no">Affinity70</span> s'efforce de maintenir un environnement sûr, mais chaque utilisateur est responsable de ses interactions et de sa sécurité lors des rencontres physiques.</p>
                  </>
                } 
              />
            } />

            <Route path="/payment-terms" element={
              <StaticPage 
                title="Conditions de Paiement" 
                content={
                  <>
                    <p>L'accès complet aux fonctionnalités d'<span translate="no">Affinity70</span> nécessite un abonnement actif. Voici nos conditions de paiement claires et transparentes.</p>
                    <h3 className="text-xl font-bold mt-6">Tarification</h3>
                    <p>L'abonnement standard est de <strong>2 000 Ar</strong> pour une durée de <strong>30 jours</strong> calendaires. Vous devez inclure les frais de retrait de <strong>150 Ar</strong> lors de votre envoi (soit un total de <strong>2 150 Ar</strong>).</p>
                    <h3 className="text-xl font-bold mt-6">Modes de paiement</h3>
                    <p>Nous acceptons exclusivement les paiements via <strong>MVola</strong> au numéro suivant : <strong>038 93 263 31</strong> (Titulaire : <strong>Lalatiana</strong>).</p>
                    <h3 className="text-xl font-bold mt-6">Validation du compte</h3>
                    <p>Une fois le transfert effectué, vous devez renseigner l'<strong>ID de transaction</strong> reçu par SMS. L'envoi d'une capture d'écran est facultatif si l'ID est correct. L'activation du compte est effectuée manuellement par notre équipe après vérification (généralement sous 24h).</p>
                    <h3 className="text-xl font-bold mt-6">Remboursement</h3>
                    <p>En raison de la nature numérique du service, aucun remboursement n'est possible une fois que l'accès a été validé et activé sur votre compte.</p>
                  </>
                } 
              />
            } />
          </Routes>
        </main>
        <footer className="bg-offwhite text-anthracite py-8 px-4 mt-20 border-t border-white/5">
          <div className="max-w-7xl mx-auto text-center text-anthracite/40 text-sm flex flex-col items-center gap-2">
            <p>© 2026 <span translate="no">Affinity70</span>. Tous droits réservés.</p>
          </div>
        </footer>
      </div>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      {user && user.status === 'active' && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsAssistantOpen(true)}
          className="fixed bottom-24 right-6 z-[100] w-14 h-14 bg-terracotta text-white rounded-full shadow-2xl flex items-center justify-center group overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
          <Sparkles size={24} />
        </motion.button>
      )}
      <DatingAssistant isOpen={isAssistantOpen} onClose={() => setIsAssistantOpen(false)} user={user} />
      <LogoutModal 
        isOpen={isLogoutModalOpen} 
        onClose={() => setIsLogoutModalOpen(false)} 
        onConfirm={performLogout} 
      />
    </Router>
  </ToastContext.Provider>
  </AppErrorBoundary>
);
}
