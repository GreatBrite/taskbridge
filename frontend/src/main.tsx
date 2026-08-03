import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Baby, Camera, Check, ClipboardCheck, Clock, Dog, Home, Languages, MapPin, MessageCircle, Paperclip, Plus, Search, Send, ShieldCheck, SlidersHorizontal, Sparkles, Star, Truck, UserRoundCog, Wrench } from 'lucide-react';
import { api } from './api';
import type { Chat, Job, Message, Offer, Role, User } from './types';
import './styles.css';

const APP_NAME = 'DeloLynk';
const APP_TITLE = `${APP_NAME} Mini App`;

function DeloLynkMark() {
  return (
    <svg viewBox="0 0 36 36" role="img" aria-label="DeloLynk">
      <rect x="5" y="7" width="14" height="14" rx="5" fill="currentColor" opacity=".95" />
      <rect x="17" y="15" width="14" height="14" rx="5" fill="currentColor" opacity=".72" />
      <path d="M14 18.5h8c2.1 0 3.8-1.7 3.8-3.8S24.1 11 22 11h-2.2" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M22 17.5h-8c-2.1 0-3.8 1.7-3.8 3.8S11.9 25 14 25h2.2" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M11.4 13.8h3.8M20.8 24h4" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const categories = [
  { id: 'moving', label: 'Переезд', icon: Truck },
  { id: 'handyman', label: 'Мастер', icon: Wrench },
  { id: 'childcare', label: 'Няня', icon: Baby },
  { id: 'dogwalk', label: 'Собаки', icon: Dog },
  { id: 'cleaning', label: 'Уборка', icon: Sparkles },
];

const categoryImages: Record<string, string> = {
  moving: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=360&q=78',
  handyman: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=360&q=78',
  childcare: 'https://images.unsplash.com/photo-1544776193-352d25ca82cd?auto=format&fit=crop&w=360&q=78',
  dogwalk: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=360&q=78',
  cleaning: 'https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?auto=format&fit=crop&w=360&q=78',
};

const demoJobs: Job[] = [
  {
    id: -1,
    customer_id: 0,
    category: 'moving',
    title: 'Переезд: коробки и стол',
    description: '8 коробок и небольшой стол, есть лифт, нужна машина и помощь с погрузкой.',
    city: 'Tbilisi',
    district: 'Сабуртало',
    time_window: 'завтра 14:00-17:00',
    budget: 'до 120 GEL',
    currency: 'GEL',
    status: 'published',
    structured_brief: {},
    missing_fields: [],
    selected_offer_id: null,
    created_at: new Date().toISOString(),
  },
  {
    id: -2,
    customer_id: 0,
    category: 'handyman',
    title: 'Полка + дверца шкафа',
    description: 'Повесить одну полку, подтянуть дверцу, мастер со своей дрелью.',
    city: 'Tbilisi',
    district: 'Ваке',
    time_window: 'сегодня вечером',
    budget: '80-100 GEL',
    currency: 'GEL',
    status: 'published',
    structured_brief: {},
    missing_fields: [],
    selected_offer_id: null,
    created_at: new Date().toISOString(),
  },
  {
    id: -3,
    customer_id: 0,
    category: 'dogwalk',
    title: 'Выгул собаки 40 минут',
    description: 'Спокойная собака, маршрут рядом с домом, нужен отчёт фото.',
    city: 'Tbilisi',
    district: 'Чугурети',
    time_window: 'будни утром',
    budget: '25 GEL',
    currency: 'GEL',
    status: 'published',
    structured_brief: {},
    missing_fields: [],
    selected_offer_id: null,
    created_at: new Date().toISOString(),
  },
];

type Screen = 'feed' | 'request' | 'offers' | 'chatList' | 'chat' | 'profile';

type LanguageCode = 'ru' | 'en' | 'ka' | 'sr';

type OfferView = Offer & {
  name: string;
  initials: string;
  language: LanguageCode;
  rating: number;
  completedJobs: number;
  originalText: string;
};

type ChatView = Chat & {
  name: string;
  language: LanguageCode;
  preview: string;
  unread: number;
};

const languageOptions: Array<{ code: LanguageCode; label: string; nativeName: string }> = [
  { code: 'ru', label: 'Русский', nativeName: 'русский' },
  { code: 'en', label: 'English', nativeName: 'english' },
  { code: 'ka', label: 'ქართული', nativeName: 'ქართული' },
  { code: 'sr', label: 'Srpski', nativeName: 'srpski' },
];

const copy: Record<LanguageCode, Record<string, string>> = {
  ru: {
    feedTitle: 'Что нужно сделать?',
    contractorTitle: 'Заявки рядом',
    feedSubtitle: 'Заявка уходит исполнителям на их языке',
    feedSection: 'Мои и свежие заявки',
    contractorSection: 'Подходящие работы',
    request: 'Заявка',
    offers: 'Отклики',
    chats: 'Чаты',
    profile: 'Профиль',
    publish: 'Опубликовать заявку',
    improve: 'Уточнить ТЗ',
    select: 'Выбрать',
    chat: 'Чат',
    noCalls: 'Без звонков до выбора',
    noCallsText: 'Цена, срок, рейтинг, язык и уточнения сразу в отклике.',
    filter: 'Фильтр',
    urgentFirst: 'Сначала срочные',
  },
  en: {
    feedTitle: 'What needs doing?',
    contractorTitle: 'Nearby jobs',
    feedSubtitle: 'The request is sent to contractors in their language',
    feedSection: 'My and fresh requests',
    contractorSection: 'Matching jobs',
    request: 'Request',
    offers: 'Offers',
    chats: 'Chats',
    profile: 'Profile',
    publish: 'Publish request',
    improve: 'Improve brief',
    select: 'Select',
    chat: 'Chat',
    noCalls: 'No calls before choosing',
    noCallsText: 'Price, timing, rating, language and clarifications are in the offer.',
    filter: 'Filter',
    urgentFirst: 'Urgent first',
  },
  ka: {
    feedTitle: 'რა გჭირდებათ?',
    contractorTitle: 'ახლოს დავალებები',
    feedSubtitle: 'განაცხადი მიდის შემსრულებლებთან მათ ენაზე',
    feedSection: 'ჩემი და ახალი განაცხადები',
    contractorSection: 'შესაფერისი სამუშაოები',
    request: 'განაცხადი',
    offers: 'შეთავაზებები',
    chats: 'ჩატები',
    profile: 'პროფილი',
    publish: 'განაცხადის გამოქვეყნება',
    improve: 'დაზუსტება',
    select: 'არჩევა',
    chat: 'ჩატი',
    noCalls: 'ზარების გარეშე არჩევამდე',
    noCallsText: 'ფასი, დრო, რეიტინგი, ენა და დეტალები ჩანს შეთავაზებაში.',
    filter: 'ფილტრი',
    urgentFirst: 'ჯერ სასწრაფო',
  },
  sr: {
    feedTitle: 'Šta treba uraditi?',
    contractorTitle: 'Poslovi u blizini',
    feedSubtitle: 'Zahtev ide izvođačima na njihovom jeziku',
    feedSection: 'Moji i novi zahtevi',
    contractorSection: 'Odgovarajući poslovi',
    request: 'Zahtev',
    offers: 'Ponude',
    chats: 'Četovi',
    profile: 'Profil',
    publish: 'Objavi zahtev',
    improve: 'Dopuni opis',
    select: 'Izaberi',
    chat: 'Čet',
    noCalls: 'Bez poziva pre izbora',
    noCallsText: 'Cena, rok, rejting, jezik i detalji su odmah u ponudi.',
    filter: 'Filter',
    urgentFirst: 'Prvo hitno',
  },
};

const demoOffers: OfferView[] = [
  {
    id: -11,
    job_id: -1,
    contractor_id: -101,
    name: 'Giorgi',
    initials: 'GI',
    language: 'ka',
    price: '100 GEL',
    eta: '15:00',
    rating: 4.9,
    completedJobs: 124,
    originalText: 'ხვალ 15:00-ზე მოვალ მანქანით. ღვედებს და პლედს წამოვიღებ.',
    text: 'ხვალ 15:00-ზე მოვალ მანქანით. ღვედებს და პლედს წამოვიღებ.',
    translated_text: 'Завтра в 15:00 приеду с машиной. Возьму ремни и плед для стола.',
    target_lang: 'ru',
    status: 'pending',
    created_at: new Date().toISOString(),
  },
  {
    id: -12,
    job_id: -1,
    contractor_id: -102,
    name: 'Marta',
    initials: 'MA',
    language: 'en',
    price: '115 GEL',
    eta: '14:30',
    rating: 4.8,
    completedJobs: 82,
    originalText: 'I can come with a van. Price includes loading and unloading.',
    text: 'I can come with a van. Price includes loading and unloading.',
    translated_text: 'Могу приехать на фургоне. Цена включает погрузку и разгрузку.',
    target_lang: 'ru',
    status: 'pending',
    created_at: new Date().toISOString(),
  },
  {
    id: -13,
    job_id: -1,
    contractor_id: -103,
    name: 'Luis',
    initials: 'LU',
    language: 'en',
    price: '95 GEL',
    eta: '16:00',
    rating: 4.7,
    completedJobs: 61,
    originalText: 'Puedo ayudar con cajas y mesa, necesito foto de la entrada.',
    text: 'Puedo ayudar con cajas y mesa, necesito foto de la entrada.',
    translated_text: 'Могу помочь с коробками и столом, нужна фотография входа.',
    target_lang: 'ru',
    status: 'pending',
    created_at: new Date().toISOString(),
  },
  {
    id: -21,
    job_id: -2,
    contractor_id: -201,
    name: 'Milan',
    initials: 'MI',
    language: 'sr',
    price: '90 GEL',
    eta: '19:00',
    rating: 4.9,
    completedJobs: 143,
    originalText: 'Mogu večeras. Imam bušilicu, tiple i alat za šarke.',
    text: 'Mogu večeras. Imam bušilicu, tiple i alat za šarke.',
    translated_text: 'Могу сегодня вечером. Есть дрель, дюбели и инструмент для петель.',
    target_lang: 'ru',
    status: 'pending',
    created_at: new Date().toISOString(),
  },
  {
    id: -31,
    job_id: -3,
    contractor_id: -301,
    name: 'Nino',
    initials: 'NI',
    language: 'ka',
    price: '25 GEL',
    eta: '08:30',
    rating: 4.8,
    completedJobs: 47,
    originalText: 'დილით შემიძლია. ფოტო ანგარიშს გამოგიგზავნით прогулки შემდეგ.',
    text: 'დილით შემიძლია. ფოტო ანგარიშს გამოგიგზავნით прогулки შემდეგ.',
    translated_text: 'Могу утром. После прогулки пришлю фото-отчёт.',
    target_lang: 'ru',
    status: 'pending',
    created_at: new Date().toISOString(),
  },
];

const demoChats: ChatView[] = [
  { id: -1001, job_id: -1, customer_id: 1001, contractor_id: -101, name: 'Giorgi', language: 'ka', preview: 'Да, возьму ремни. Напишите адрес.', unread: 2, created_at: new Date().toISOString() },
  { id: -1002, job_id: -1, customer_id: 1001, contractor_id: -102, name: 'Marta', language: 'en', preview: 'Price includes loading and unloading.', unread: 1, created_at: new Date().toISOString() },
  { id: -1003, job_id: -2, customer_id: 1001, contractor_id: -201, name: 'Milan', language: 'sr', preview: 'Могу сегодня вечером, инструмент есть.', unread: 0, created_at: new Date().toISOString() },
];

const demoMessages: Record<number, Message[]> = {
  [-1001]: [
    { id: -1, chat_id: -1001, sender_id: -101, original_lang: 'ka', original_text: 'გამარჯობა, ხვალ 15:00-ზე მოვალ მანქანით.', translated_text: 'Здравствуйте, завтра в 15:00 приеду с машиной.', target_lang: 'ru', created_at: new Date().toISOString() },
    { id: -2, chat_id: -1001, sender_id: 1001, original_lang: 'ru', original_text: 'Отлично. Стол небольшой, но лучше взять ремни.', translated_text: 'Great. The table is small, but please bring straps.', target_lang: 'ka', created_at: new Date().toISOString() },
    { id: -3, chat_id: -1001, sender_id: -101, original_lang: 'ka', original_text: 'კი, ღვედებს წამოვიღებ. მისამართი მომწერეთ.', translated_text: 'Да, возьму ремни. Напишите адрес.', target_lang: 'ru', created_at: new Date().toISOString() },
  ],
  [-1002]: [
    { id: -4, chat_id: -1002, sender_id: -102, original_lang: 'en', original_text: 'I can arrive at 14:30 with a van.', translated_text: 'Могу приехать в 14:30 на фургоне.', target_lang: 'ru', created_at: new Date().toISOString() },
    { id: -5, chat_id: -1002, sender_id: 1001, original_lang: 'ru', original_text: 'Цена окончательная или нужно доплатить за этаж?', translated_text: 'Is the price final or is there an extra floor fee?', target_lang: 'en', created_at: new Date().toISOString() },
  ],
  [-1003]: [
    { id: -6, chat_id: -1003, sender_id: -201, original_lang: 'sr', original_text: 'Mogu večeras posle 19:00. Imam sav alat.', translated_text: 'Могу сегодня после 19:00. Весь инструмент есть.', target_lang: 'ru', created_at: new Date().toISOString() },
  ],
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [screen, setScreen] = useState<Screen>('feed');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatView | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [toast, setToast] = useState('');
  const [showOriginal, setShowOriginal] = useState(false);
  const [appLanguage, setAppLanguage] = useState<LanguageCode>('ru');

  useEffect(() => {
    window.Telegram?.WebApp?.ready?.();
    window.Telegram?.WebApp?.expand?.();
    api.auth().then((nextUser) => {
      setUser(nextUser);
      setAppLanguage(normalizeLanguage(nextUser.language_code));
    }).then(refreshFeed).catch((error) => flash(error.message));
  }, []);

  useEffect(() => {
    if (!selectedChat || selectedChat.id < 0) return;
    const timer = window.setInterval(() => api.messages(selectedChat.id).then(setMessages).catch(() => undefined), 4000);
    return () => window.clearInterval(timer);
  }, [selectedChat]);

  const isContractor = user?.role === 'contractor' || user?.role === 'both';
  const heading = isContractor ? ui(appLanguage, 'contractorTitle') : ui(appLanguage, 'feedTitle');
  const languageLabel = languageOptions.find((item) => item.code === appLanguage)?.nativeName || 'русский';

  function flash(text: string) {
    setToast(text);
    window.setTimeout(() => setToast(''), 2200);
  }

  async function refreshFeed() {
    const [myJobs, contractorJobs, chatList] = await Promise.all([
      api.myJobs().catch(() => []),
      api.feed().catch(() => []),
      api.chats().catch(() => []),
    ]);
    const merged = [...contractorJobs, ...myJobs].filter((job, index, list) => list.findIndex((item) => item.id === job.id) === index);
    setJobs(merged);
    setChats(chatList);
    if (!selectedJob && merged.length) setSelectedJob(merged[0]);
  }

  async function setRole(role: Role) {
    const profile = role === 'contractor' || role === 'both'
      ? { categories: ['moving', 'handyman', 'dogwalk'], districts: [], languages: ['ru', 'en', 'ka'], description: 'Готов брать бытовые задачи', is_active: true }
      : undefined;
    const next = await api.patchMe({ role, contractor_profile: profile } as Partial<User>);
    setUser(next);
    await refreshFeed();
  }

  async function openOffers(job: Job) {
    setSelectedJob(job);
    setOffers(job.id > 0 ? await api.offers(job.id) : []);
    setScreen('offers');
  }

  async function openChat(chat: ChatView) {
    setSelectedChat(chat);
    setMessages(chat.id > 0 ? await api.messages(chat.id) : demoMessages[chat.id] || []);
    setScreen('chat');
  }

  async function setLanguage(language: LanguageCode) {
    setAppLanguage(language);
    if (!user) return;
    const next = await api.patchMe({ language_code: language } as Partial<User>);
    setUser(next);
    flash(`Language: ${languageOptions.find((item) => item.code === language)?.nativeName}`);
  }

  async function selectOffer(offer: OfferView) {
    if (offer.id < 0) {
      const chat = demoChatFromOffer(offer);
      flash('Исполнитель выбран');
      await openChat(chat);
      return;
    }
    const chat = await api.selectOffer(offer.id);
    flash('Исполнитель выбран');
    await refreshFeed();
    await openChat(toChatView(chat));
  }

  return (
    <div className="stage">
      <div className="phone" role="application" aria-label={APP_TITLE}>
        <header className="app-header">
          <div className="bar">
            <div className="brand"><span className="brand-mark"><DeloLynkMark /></span><span>{APP_NAME}</span></div>
            <button className="icon-btn" type="button" aria-label="Профиль" onClick={() => setScreen('profile')}><UserRoundCog /></button>
          </div>
          <button className="language-pill" type="button" onClick={() => setScreen('profile')}>
            <Languages size={15} />Language: {languageLabel}
          </button>
          {screen === 'feed' && (
            <div className="search-box">
              <Search size={21} />
              <span>переезд, мастер, няня</span>
              <button className="filter-chip" type="button" onClick={() => flash('Фильтры: район, цена, язык, рейтинг')}>
                <SlidersHorizontal size={18} />{ui(appLanguage, 'filter')}
              </button>
            </div>
          )}
        </header>

        <main className="screen">
          {screen === 'feed' && <Feed heading={heading} appLanguage={appLanguage} jobs={jobs} isContractor={isContractor} onJob={openOffers} onCreate={() => setScreen('request')} />}
          {screen === 'request' && <RequestScreen appLanguage={appLanguage} onCreated={async (job) => { setSelectedJob(job); await refreshFeed(); await openOffers(job); }} />}
          {screen === 'offers' && selectedJob && <OffersScreen appLanguage={appLanguage} job={selectedJob} offers={offers} isContractor={isContractor} onOffer={async (body) => { await api.createOffer(selectedJob.id, body); flash('Отклик отправлен'); await openOffers(selectedJob); }} onSelect={selectOffer} onChat={openChat} />}
          {screen === 'chatList' && <ChatList appLanguage={appLanguage} chats={[...chats.map(toChatView), ...demoChats]} onOpen={openChat} />}
          {screen === 'chat' && selectedChat && <ChatScreen chat={selectedChat} messages={messages} showOriginal={showOriginal} appLanguage={appLanguage} onToggle={() => setShowOriginal((value) => !value)} onSend={async (text) => {
            if (selectedChat.id < 0) {
              setMessages((items) => [...items, makeDemoMessage(selectedChat.id, text, appLanguage)]);
              flash('Сообщение отправлено с переводом');
              return;
            }
            await api.sendMessage(selectedChat.id, text);
            setMessages(await api.messages(selectedChat.id));
            flash('Сообщение отправлено с переводом');
          }} />}
          {screen === 'profile' && user && <Profile user={user} appLanguage={appLanguage} onRole={setRole} onLanguage={setLanguage} />}
        </main>

        <button className="btn primary fab" type="button" onClick={() => setScreen(isContractor ? 'feed' : 'request')}><Plus size={18} />{isContractor ? 'Найти' : ui(appLanguage, 'request')}</button>
        <nav className="tabbar" aria-label="Навигация">
          <button className={screen === 'feed' ? 'tab active' : 'tab'} type="button" onClick={() => setScreen('feed')}><Home /><span>{appLanguage === 'ru' ? 'Лента' : 'Feed'}</span></button>
          <button className={screen === 'request' ? 'tab active' : 'tab'} type="button" onClick={() => setScreen('request')}><Plus /><span>{ui(appLanguage, 'request')}</span></button>
          <button className={screen === 'offers' ? 'tab active' : 'tab'} type="button" onClick={() => selectedJob && openOffers(selectedJob)}><ShieldCheck /><span>{ui(appLanguage, 'offers')}</span></button>
          <button className={screen === 'chatList' ? 'tab active' : 'tab'} type="button" onClick={async () => { setChats(await api.chats()); setScreen('chatList'); }}><MessageCircle /><span>{ui(appLanguage, 'chats')}</span></button>
        </nav>
        {toast && <div className="toast"><Check size={18} />{toast}</div>}
      </div>
    </div>
  );
}

function Feed({ heading, appLanguage, jobs, isContractor, onJob, onCreate }: { heading: string; appLanguage: LanguageCode; jobs: Job[]; isContractor: boolean; onJob: (job: Job) => void; onCreate: () => void }) {
  const visibleJobs = jobs.length ? jobs : demoJobs;
  return (
    <>
      <div className="section-title"><div><h1>{heading}</h1><p>{ui(appLanguage, 'feedSubtitle')}</p></div></div>
      <div className="stories">{categories.map((item, index) => {
        const Icon = item.icon;
        return <button className={index === 0 ? 'category active' : 'category'} type="button" key={item.id}><span className="category-icon"><Icon size={20} /></span><span>{item.label}</span></button>;
      })}</div>
      <article className="trust-strip"><div><h2>{ui(appLanguage, 'noCalls')}</h2><p>{ui(appLanguage, 'noCallsText')}</p></div><div className="trust-kpi"><strong>4.8</strong><small>средний рейтинг</small></div></article>
      <div className="filter-row">
        <span className="chip"><MapPin size={15} />рядом</span>
        <span className="chip"><Languages size={15} />auto RU</span>
        <span className="chip"><Clock size={15} />срочные</span>
      </div>
      <div className="section-title"><h2>{isContractor ? ui(appLanguage, 'contractorSection') : ui(appLanguage, 'feedSection')}</h2><button className="chip" type="button">{ui(appLanguage, 'urgentFirst')}</button></div>
      <div className="cards">
        {visibleJobs.map((job) => <JobCard job={job} key={job.id} onClick={() => (job.id > 0 ? onJob(job) : onCreate())} />)}
      </div>
    </>
  );
}

function JobCard({ job, onClick }: { job: Job; onClick: () => void }) {
  return (
    <button className="job-card" type="button" onClick={onClick}>
      <span className="job-art"><img src={categoryImages[job.category] || categoryImages.moving} alt="" loading="lazy" /></span>
      <span className="job-main">
        <span className="job-top">
          <span><span className="badge">{job.status === 'published' ? 'срочно' : job.status}</span><h3>{job.title || job.description}</h3></span>
          <span className="price">{job.budget || 'цена?'}</span>
        </span>
        <span className="meta"><span>{job.district || job.city}</span><span>{job.time_window || 'время уточняется'}</span></span>
        <span className="offer-text">{job.description}</span>
        <span className="mini-actions"><span className="chip"><MessageCircle size={15} />отклики</span><span className="chip"><Languages size={15} />auto RU</span></span>
      </span>
    </button>
  );
}

function RequestScreen({ appLanguage, onCreated }: { appLanguage: LanguageCode; onCreated: (job: Job) => void }) {
  const [category, setCategory] = useState('moving');
  const [description, setDescription] = useState('Нужно перевезти 8 коробок и небольшой стол. Есть лифт, нужна машина и помощь с погрузкой.');
  const [district, setDistrict] = useState('Сабуртало');
  const [timeWindow, setTimeWindow] = useState('Завтра после 14:00');
  const [budget, setBudget] = useState('до 120 GEL');
  const [brief, setBrief] = useState<{ score: number; questions: string[] } | null>(null);
  const [attachments, setAttachments] = useState<string[]>(['фото подъезда.jpg']);

  async function create(improveOnly: boolean) {
    const job = await api.createDraft({ category, description, district, time_window: timeWindow, budget });
    const improved = await api.improveBrief(job.id);
    setBrief(improved);
    if (!improveOnly) onCreated(await api.publishJob(job.id));
  }

  return (
    <div className="panel form-grid">
      <h1>{ui(appLanguage, 'request')}</h1>
      <select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select>
      <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
      <input value={district} onChange={(event) => setDistrict(event.target.value)} placeholder="Район" />
      <input value={timeWindow} onChange={(event) => setTimeWindow(event.target.value)} placeholder="Когда" />
      <input value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="Бюджет" />
      <div className="attach-box">
        <div><strong>Фото и детали</strong><p>Можно приложить фото входа, мебели, инструмента или места работы.</p></div>
        <label className="btn small" htmlFor="attachments"><Camera size={17} />Прикрепить</label>
        <input id="attachments" className="visually-hidden" type="file" multiple accept="image/*" onChange={(event) => {
          const files = Array.from(event.target.files || []).map((file) => file.name);
          if (files.length) setAttachments(files);
        }} />
      </div>
      <div className="attachment-list">{attachments.map((name) => <span className="chip" key={name}><Paperclip size={15} />{name}</span>)}</div>
      {brief && <div className="brief"><strong>ТЗ {brief.score}%</strong>{brief.questions.map((question) => <p key={question}>{question}</p>)}</div>}
      <button className="btn dark full" type="button" onClick={() => create(true)}><Sparkles />{ui(appLanguage, 'improve')}</button>
      <button className="btn primary full" type="button" onClick={() => create(false)}><Send />{ui(appLanguage, 'publish')}</button>
    </div>
  );
}

function OffersScreen({ appLanguage, job, offers, isContractor, onOffer, onSelect, onChat }: { appLanguage: LanguageCode; job: Job; offers: Offer[]; isContractor: boolean; onOffer: (body: { price: string; eta: string; text: string }) => void; onSelect: (offer: OfferView) => void; onChat: (chat: ChatView) => void }) {
  const [price, setPrice] = useState('100 GEL');
  const [eta, setEta] = useState('15:00');
  const [text, setText] = useState('Могу приехать, инструмент и всё нужное возьму.');
  const visibleOffers = offers.length ? offers.map(toOfferView) : demoOffersForJob(job);
  return (
    <>
      <div className="section-title"><div><h1>{isContractor ? 'Откликнуться' : ui(appLanguage, 'offers')}</h1><p>{job.title}</p></div></div>
      {isContractor && <div className="panel form-grid"><input value={price} onChange={(event) => setPrice(event.target.value)} /><input value={eta} onChange={(event) => setEta(event.target.value)} /><textarea value={text} onChange={(event) => setText(event.target.value)} /><button className="btn primary full" type="button" onClick={() => onOffer({ price, eta, text })}>Отправить отклик</button></div>}
      <div className="cards">
        {visibleOffers.map((offer) => (
          <article className={offer.status === 'selected' ? 'offer-card chosen' : 'offer-card'} key={offer.id}>
            <div className="person">
              <div className="avatar">{offer.initials}</div>
              <div>
                <h3>{offer.name}</h3>
                <div className="meta"><span className="rating"><Star size={14} />{offer.rating}</span><span>{offer.completedJobs} работ</span><span>{languageName(offer.language)}</span></div>
              </div>
              <span className="badge">OK</span>
            </div>
            <div className="offer-text">{offer.translated_text || offer.text}</div>
            <div className="translated-note"><Languages size={14} />Оригинал: {offer.originalText}</div>
            <div className="mini-actions"><span className="price">{offer.price}</span><span className="chip"><Clock size={15} />{offer.eta}</span></div>
            <div className="mini-actions">
              <button className="btn small dark" type="button" onClick={() => onSelect(offer)}><Check size={16} />{ui(appLanguage, 'select')}</button>
              <button className="btn small" type="button" onClick={() => onChat(demoChatFromOffer(offer))}><MessageCircle size={16} />{ui(appLanguage, 'chat')}</button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function ChatList({ appLanguage, chats, onOpen }: { appLanguage: LanguageCode; chats: ChatView[]; onOpen: (chat: ChatView) => void }) {
  return (
    <div className="cards">
      <h1>{ui(appLanguage, 'chats')}</h1>
      {chats.map((chat) => (
        <button className="chat-item" type="button" key={chat.id} onClick={() => onOpen(chat)}>
          <span className="avatar">{chat.name.slice(0, 2).toUpperCase()}</span>
          <span><h3>{chat.name}</h3><small>{languageName(chat.language)} ⇄ русский · {chat.preview}</small></span>
          {chat.unread > 0 && <span className="unread">{chat.unread}</span>}
        </button>
      ))}
    </div>
  );
}

function ChatScreen({ chat, messages, showOriginal, appLanguage, onToggle, onSend }: { chat: ChatView; messages: Message[]; showOriginal: boolean; appLanguage: LanguageCode; onToggle: () => void; onSend: (text: string) => void }) {
  const [text, setText] = useState('Можете приехать к 15:00?');
  const rendered = useMemo(() => messages, [messages]);
  return (
    <div className="chat-room">
      <div className="chat-head"><div><h2>{chat.name}</h2><p>{languageName(chat.language)} ⇄ {languageName(appLanguage)} · автоперевод</p></div><button className="icon-btn" type="button" onClick={onToggle} aria-label="Переключить перевод"><Languages /></button></div>
      <div className="messages">{rendered.map((message) => <div className={message.sender_id === 1001 ? 'msg me' : 'msg'} key={message.id}><p>{showOriginal ? message.original_text : message.translated_text || message.original_text}</p>{!showOriginal && <small>{message.original_text}</small>}</div>)}</div>
      <div className="composer"><input value={text} onChange={(event) => setText(event.target.value)} /><button className="btn primary" type="button" onClick={() => { onSend(text); setText(''); }}><Send /></button></div>
    </div>
  );
}

function Profile({ user, appLanguage, onRole, onLanguage }: { user: User; appLanguage: LanguageCode; onRole: (role: Role) => void; onLanguage: (language: LanguageCode) => void }) {
  return (
    <div className="panel form-grid">
      <h1>{ui(appLanguage, 'profile')}</h1>
      <p>{user.first_name || user.username || `Telegram ${user.telegram_id}`}</p>
      <div className="language-card">
        <strong>Language: {languageOptions.find((item) => item.code === appLanguage)?.nativeName}</strong>
        <div className="language-grid">
          {languageOptions.map((item) => <button className={appLanguage === item.code ? 'language-option active' : 'language-option'} type="button" key={item.code} onClick={() => onLanguage(item.code)}>{item.label}</button>)}
        </div>
      </div>
      <button className="btn full" type="button" onClick={() => onRole('customer')}>Я заказчик</button>
      <button className="btn full" type="button" onClick={() => onRole('contractor')}>Я исполнитель</button>
      <button className="btn full" type="button" onClick={() => onRole('both')}>Обе роли</button>
      <p>Город: {user.city} · текущий язык: {languageName(appLanguage)}</p>
    </div>
  );
}

function Empty({ title, action, onClick }: { title: string; action: string; onClick: () => void }) {
  return <div className="panel empty"><ClipboardCheck /><h3>{title}</h3><button className="btn primary" type="button" onClick={onClick}>{action}</button></div>;
}

function normalizeLanguage(language: string): LanguageCode {
  if (['ru', 'en', 'ka', 'sr'].includes(language)) return language as LanguageCode;
  return 'ru';
}

function ui(language: LanguageCode, key: string): string {
  return copy[language]?.[key] || copy.ru[key] || key;
}

function languageName(language: string): string {
  return languageOptions.find((item) => item.code === normalizeLanguage(language))?.nativeName || language;
}

function toOfferView(offer: Offer): OfferView {
  return {
    ...offer,
    name: `Исполнитель #${offer.contractor_id}`,
    initials: 'OK',
    language: normalizeLanguage(offer.target_lang || 'ru'),
    rating: 4.8,
    completedJobs: 12,
    originalText: offer.text,
  };
}

function demoOffersForJob(job: Job): OfferView[] {
  const byJob = demoOffers.filter((offer) => offer.job_id === job.id);
  if (byJob.length) return byJob;
  if (job.category === 'handyman') return demoOffers.filter((offer) => offer.job_id === -2);
  if (job.category === 'dogwalk') return demoOffers.filter((offer) => offer.job_id === -3);
  return demoOffers.filter((offer) => offer.job_id === -1).map((offer) => ({ ...offer, job_id: job.id }));
}

function toChatView(chat: Chat): ChatView {
  return {
    ...chat,
    name: `Чат #${chat.id}`,
    language: 'ru',
    preview: `Заявка #${chat.job_id}`,
    unread: 0,
  };
}

function demoChatFromOffer(offer: OfferView): ChatView {
  const existing = demoChats.find((chat) => chat.contractor_id === offer.contractor_id);
  if (existing) return existing;
  const chatId = -9000 + offer.id;
  demoMessages[chatId] = [
    {
      id: chatId - 1,
      chat_id: chatId,
      sender_id: offer.contractor_id,
      original_lang: offer.language,
      original_text: offer.originalText,
      translated_text: offer.translated_text,
      target_lang: 'ru',
      created_at: new Date().toISOString(),
    },
  ];
  return { id: chatId, job_id: offer.job_id, customer_id: 1001, contractor_id: offer.contractor_id, name: offer.name, language: offer.language, preview: offer.translated_text, unread: 1, created_at: new Date().toISOString() };
}

function makeDemoMessage(chatId: number, text: string, appLanguage: LanguageCode): Message {
  return {
    id: Date.now() * -1,
    chat_id: chatId,
    sender_id: 1001,
    original_lang: appLanguage,
    original_text: text,
    translated_text: `[${languageName(demoChats.find((chat) => chat.id === chatId)?.language || 'en')}] ${text}`,
    target_lang: demoChats.find((chat) => chat.id === chatId)?.language || 'en',
    created_at: new Date().toISOString(),
  };
}

createRoot(document.getElementById('root')!).render(<App />);
