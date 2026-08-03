import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BriefcaseBusiness, Check, ClipboardCheck, Home, Languages, MessageCircle, Plus, Send, ShieldCheck, Sparkles, UserRoundCog } from 'lucide-react';
import { api } from './api';
import type { Chat, Job, Message, Offer, Role, User } from './types';
import './styles.css';

const categories = [
  { id: 'moving', label: 'Переезд' },
  { id: 'handyman', label: 'Мастер' },
  { id: 'childcare', label: 'Няня' },
  { id: 'dogwalk', label: 'Собаки' },
  { id: 'cleaning', label: 'Уборка' },
];

type Screen = 'feed' | 'request' | 'offers' | 'chatList' | 'chat' | 'profile';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [screen, setScreen] = useState<Screen>('feed');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [toast, setToast] = useState('');
  const [showOriginal, setShowOriginal] = useState(false);

  useEffect(() => {
    window.Telegram?.WebApp?.ready?.();
    window.Telegram?.WebApp?.expand?.();
    api.auth().then(setUser).then(refreshFeed).catch((error) => flash(error.message));
  }, []);

  useEffect(() => {
    if (!selectedChat) return;
    const timer = window.setInterval(() => api.messages(selectedChat.id).then(setMessages).catch(() => undefined), 4000);
    return () => window.clearInterval(timer);
  }, [selectedChat]);

  const isContractor = user?.role === 'contractor' || user?.role === 'both';
  const heading = isContractor ? 'Заявки рядом' : 'Что нужно сделать?';

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
    setOffers(await api.offers(job.id));
    setScreen('offers');
  }

  async function openChat(chat: Chat) {
    setSelectedChat(chat);
    setMessages(await api.messages(chat.id));
    setScreen('chat');
  }

  return (
    <div className="stage">
      <div className="phone" role="application" aria-label="TaskBridge Mini App">
        <header className="app-header">
          <div className="bar">
            <div className="brand"><span className="brand-mark"><BriefcaseBusiness size={20} /></span><span>TaskBridge</span></div>
            <button className="icon-btn" type="button" aria-label="Профиль" onClick={() => setScreen('profile')}><UserRoundCog /></button>
          </div>
          {screen === 'feed' && <div className="search-box">переезд, мастер, няня</div>}
        </header>

        <main className="screen">
          {screen === 'feed' && <Feed heading={heading} jobs={jobs} isContractor={isContractor} onJob={openOffers} onCreate={() => setScreen('request')} />}
          {screen === 'request' && <RequestScreen onCreated={async (job) => { setSelectedJob(job); await refreshFeed(); await openOffers(job); }} />}
          {screen === 'offers' && selectedJob && <OffersScreen job={selectedJob} offers={offers} isContractor={isContractor} onOffer={async (body) => { await api.createOffer(selectedJob.id, body); flash('Отклик отправлен'); await openOffers(selectedJob); }} onSelect={async (offerId) => { const chat = await api.selectOffer(offerId); flash('Исполнитель выбран'); await refreshFeed(); await openChat(chat); }} onChat={openChat} />}
          {screen === 'chatList' && <ChatList chats={chats} onOpen={openChat} />}
          {screen === 'chat' && selectedChat && <ChatScreen messages={messages} showOriginal={showOriginal} onToggle={() => setShowOriginal((value) => !value)} onSend={async (text) => { await api.sendMessage(selectedChat.id, text); setMessages(await api.messages(selectedChat.id)); flash('Сообщение отправлено с переводом'); }} />}
          {screen === 'profile' && user && <Profile user={user} onRole={setRole} />}
        </main>

        <button className="btn primary fab" type="button" onClick={() => setScreen(isContractor ? 'feed' : 'request')}><Plus size={18} />{isContractor ? 'Найти' : 'Заявка'}</button>
        <nav className="tabbar" aria-label="Навигация">
          <button className={screen === 'feed' ? 'tab active' : 'tab'} type="button" onClick={() => setScreen('feed')}><Home /><span>Лента</span></button>
          <button className={screen === 'request' ? 'tab active' : 'tab'} type="button" onClick={() => setScreen('request')}><Plus /><span>Заявка</span></button>
          <button className={screen === 'offers' ? 'tab active' : 'tab'} type="button" onClick={() => selectedJob && openOffers(selectedJob)}><ShieldCheck /><span>Отклики</span></button>
          <button className={screen === 'chatList' ? 'tab active' : 'tab'} type="button" onClick={async () => { setChats(await api.chats()); setScreen('chatList'); }}><MessageCircle /><span>Чаты</span></button>
        </nav>
        {toast && <div className="toast"><Check size={18} />{toast}</div>}
      </div>
    </div>
  );
}

function Feed({ heading, jobs, isContractor, onJob, onCreate }: { heading: string; jobs: Job[]; isContractor: boolean; onJob: (job: Job) => void; onCreate: () => void }) {
  return (
    <>
      <div className="section-title"><div><h1>{heading}</h1><p>Заявка уходит исполнителям на их языке</p></div></div>
      <div className="stories">{categories.map((item) => <span className="category" key={item.id}>{item.label}</span>)}</div>
      <article className="trust-strip"><div><h2>Без звонков до выбора</h2><p>Цена, срок, рейтинг, язык и уточнения сразу в отклике.</p></div><strong>4.8</strong></article>
      <div className="section-title"><h2>{isContractor ? 'Подходящие работы' : 'Мои и свежие заявки'}</h2></div>
      <div className="cards">
        {jobs.map((job) => <button className="job-card" type="button" key={job.id} onClick={() => onJob(job)}><span><span className="badge">{job.status}</span><h3>{job.title || job.description}</h3><p>{job.district || job.city} · {job.time_window || 'время уточняется'}</p><p>{job.description}</p></span><strong>{job.budget || 'цена?'}</strong></button>)}
        {!jobs.length && <Empty title="Пока заявок нет" action="Создать заявку" onClick={onCreate} />}
      </div>
    </>
  );
}

function RequestScreen({ onCreated }: { onCreated: (job: Job) => void }) {
  const [category, setCategory] = useState('moving');
  const [description, setDescription] = useState('Нужно перевезти 8 коробок и небольшой стол. Есть лифт, нужна машина и помощь с погрузкой.');
  const [district, setDistrict] = useState('Сабуртало');
  const [timeWindow, setTimeWindow] = useState('Завтра после 14:00');
  const [budget, setBudget] = useState('до 120 GEL');
  const [brief, setBrief] = useState<{ score: number; questions: string[] } | null>(null);

  async function create(improveOnly: boolean) {
    const job = await api.createDraft({ category, description, district, time_window: timeWindow, budget });
    const improved = await api.improveBrief(job.id);
    setBrief(improved);
    if (!improveOnly) onCreated(await api.publishJob(job.id));
  }

  return (
    <div className="panel form-grid">
      <h1>Новая заявка</h1>
      <select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select>
      <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
      <input value={district} onChange={(event) => setDistrict(event.target.value)} placeholder="Район" />
      <input value={timeWindow} onChange={(event) => setTimeWindow(event.target.value)} placeholder="Когда" />
      <input value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="Бюджет" />
      {brief && <div className="brief"><strong>ТЗ {brief.score}%</strong>{brief.questions.map((question) => <p key={question}>{question}</p>)}</div>}
      <button className="btn dark full" type="button" onClick={() => create(true)}><Sparkles />Уточнить ТЗ</button>
      <button className="btn primary full" type="button" onClick={() => create(false)}><Send />Опубликовать заявку</button>
    </div>
  );
}

function OffersScreen({ job, offers, isContractor, onOffer, onSelect, onChat }: { job: Job; offers: Offer[]; isContractor: boolean; onOffer: (body: { price: string; eta: string; text: string }) => void; onSelect: (offerId: number) => void; onChat: (chat: Chat) => void }) {
  const [price, setPrice] = useState('100 GEL');
  const [eta, setEta] = useState('15:00');
  const [text, setText] = useState('Могу приехать, инструмент и всё нужное возьму.');
  return (
    <>
      <div className="section-title"><div><h1>{isContractor ? 'Откликнуться' : 'Отклики'}</h1><p>{job.title}</p></div></div>
      {isContractor && <div className="panel form-grid"><input value={price} onChange={(event) => setPrice(event.target.value)} /><input value={eta} onChange={(event) => setEta(event.target.value)} /><textarea value={text} onChange={(event) => setText(event.target.value)} /><button className="btn primary full" type="button" onClick={() => onOffer({ price, eta, text })}>Отправить отклик</button></div>}
      <div className="cards">{offers.map((offer) => <article className={offer.status === 'selected' ? 'offer-card chosen' : 'offer-card'} key={offer.id}><h3>{offer.price}</h3><p>{offer.eta}</p><p>{offer.translated_text || offer.text}</p><div className="mini-actions"><button className="btn small dark" type="button" onClick={() => onSelect(offer.id)}><Check />Выбрать</button></div></article>)}</div>
      {!offers.length && !isContractor && <Empty title="Пока нет откликов" action="Обновить позже" onClick={() => undefined} />}
    </>
  );
}

function ChatList({ chats, onOpen }: { chats: Chat[]; onOpen: (chat: Chat) => void }) {
  return <div className="cards"><h1>Чаты</h1>{chats.map((chat) => <button className="chat-item" type="button" key={chat.id} onClick={() => onOpen(chat)}>Чат по заявке #{chat.job_id}<span>Открыть</span></button>)}</div>;
}

function ChatScreen({ messages, showOriginal, onToggle, onSend }: { messages: Message[]; showOriginal: boolean; onToggle: () => void; onSend: (text: string) => void }) {
  const [text, setText] = useState('Можете приехать к 15:00?');
  const rendered = useMemo(() => messages, [messages]);
  return (
    <div className="chat-room">
      <div className="chat-head"><h2>Чат</h2><button className="icon-btn" type="button" onClick={onToggle} aria-label="Переключить перевод"><Languages /></button></div>
      <div className="messages">{rendered.map((message) => <div className="msg" key={message.id}><p>{showOriginal ? message.original_text : message.translated_text || message.original_text}</p>{!showOriginal && <small>{message.original_text}</small>}</div>)}</div>
      <div className="composer"><input value={text} onChange={(event) => setText(event.target.value)} /><button className="btn primary" type="button" onClick={() => { onSend(text); setText(''); }}><Send /></button></div>
    </div>
  );
}

function Profile({ user, onRole }: { user: User; onRole: (role: Role) => void }) {
  return <div className="panel form-grid"><h1>Профиль</h1><p>{user.first_name || user.username || `Telegram ${user.telegram_id}`}</p><button className="btn full" type="button" onClick={() => onRole('customer')}>Я заказчик</button><button className="btn full" type="button" onClick={() => onRole('contractor')}>Я исполнитель</button><button className="btn full" type="button" onClick={() => onRole('both')}>Обе роли</button><p>Город: {user.city} · язык: {user.language_code}</p></div>;
}

function Empty({ title, action, onClick }: { title: string; action: string; onClick: () => void }) {
  return <div className="panel empty"><ClipboardCheck /><h3>{title}</h3><button className="btn primary" type="button" onClick={onClick}>{action}</button></div>;
}

createRoot(document.getElementById('root')!).render(<App />);
