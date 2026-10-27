"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Pause, Play, RotateCcw, Shuffle, Wine } from "lucide-react";
import { ThemeToggle } from "~/components/layouts/theme-toggle";
import { tripFont } from "../../trip-font";
import tripStyles from "../../trip.module.css";
import shared from "../5-cau-5-ly/topic-game.module.css";
import { normalizeAnswer, roundTopics, shuffleTopics, type RoundTopic } from "./topics";
import styles from "./circle.module.css";

type Answer = { player: number; text: string };
type Result = { player: number; topic: RoundTopic; answers: number };
export default function CircleGame() {
  const [names, setNames] = useState(["Bạn 1", "Bạn 2", "Bạn 3"]);
  const [phase, setPhase] = useState<"setup" | "choose" | "ready" | "playing" | "result" | "summary">("setup");
  const [seconds, setSeconds] = useState(10);
  const [remaining, setRemaining] = useState(10);
  const [paused, setPaused] = useState(false);
  const [player, setPlayer] = useState(0);
  const [topic, setTopic] = useState<RoundTopic>(roundTopics[0]);
  const [topicDeck, setTopicDeck] = useState<RoundTopic[]>([]);
  const [seen, setSeen] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [history, setHistory] = useState<Result[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const actionLock = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const timedOut = seconds > 0 && remaining === 0;
  useEffect(() => {
    if (phase !== "playing" || paused || seconds === 0) return;
    const timer = window.setInterval(() => setRemaining(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [phase, paused, seconds, answers.length]);
  function focusHeading() { requestAnimationFrame(() => heading.current?.focus({ preventScroll: true })); }
  function chooseTopic(selected: RoundTopic) {
    setTopic(selected); setSeen(previous => [...previous, selected.id]);
    setAnswers([]); setInput(""); setError(""); setRemaining(seconds); setPaused(false);
    actionLock.current = false; setPhase("ready"); focusHeading();
  }
  function randomTopic() {
    const available = topicDeck.filter(item => !seen.includes(item.id));
    if (available.length) chooseTopic(available[0]);
    else { const fresh = shuffleTopics(); setTopicDeck(fresh); setSeen([]); chooseTopic(fresh[0]); }
  }
  function accept() {
    if (phase !== "playing" || paused || timedOut || actionLock.current) return;
    const text = input.trim();
    if (text && !normalizeAnswer(text)) { setError("Hãy ghi một đáp án bằng chữ hoặc số."); return; }
    if (text && answers.some(answer => answer.text && normalizeAnswer(answer.text) === normalizeAnswer(text))) {
      setError("Đáp án này đã có người nói. Nếu đúng là bị lặp, bấm xác nhận thua bên dưới."); return;
    }
    actionLock.current = true;
    setAnswers(previous => [...previous, { player, text }]);
    setPlayer((player + 1) % names.length); setRemaining(seconds); setInput(""); setError("");
    requestAnimationFrame(() => { actionLock.current = false; });
  }
  function lose() {
    if (phase !== "playing" || paused || actionLock.current) return;
    actionLock.current = true;
    setHistory(previous => [...previous, { player, topic, answers: answers.length }]);
    setPhase("result"); focusHeading();
  }
  function start() {
    setNames(names.map((name, i) => name.trim() || `Bạn ${i + 1}`));
    setTopicDeck(shuffleTopics()); setSeen([]); setHistory([]); setPlayer(0); setPhase("choose"); focusHeading();
  }
  function newRound() { setPlayer((player + 1) % names.length); setPhase("choose"); focusHeading(); }
  return <div className={`${tripStyles.trip} ${tripFont.variable} ${styles.page}`} lang="vi">
    <header className={`dalat-header ${shared.header}`}><Link href="/me/travel/dalat/games"><ArrowLeft /> Các trò chơi</Link><span>XOAY VÒNG · BÍ LÀ UỐNG</span><ThemeToggle className="dalat-theme-toggle" /></header>
    <main className={shared.main}>
      {phase === "setup" ? <section className={shared.setup}><p className={shared.eyebrow}>🔄 NÓI TIẾP NHAU · ĐỪNG LẶP ĐÁP ÁN</p><h1>Xoay vòng.<br /><em>Bí là uống!</em></h1><p>Chọn chủ đề, mỗi người nói 1 đáp án rồi chuyển lượt.<br /><strong>Bí, sai hoặc trùng: nhận 1 ngụm và kết thúc vòng.</strong></p>
        <div className={shared.names}>{names.map((name, index) => <label key={index}>Người chơi {index + 1}<input maxLength={24} value={name} onChange={event => setNames(names.map((old, i) => i === index ? event.target.value : old))} /></label>)}</div>
        <fieldset className={styles.timerOptions}><legend>Thời gian cho mỗi người</legend>{[0,5,10,15].map(value => <label key={value} className={seconds === value ? styles.chosen : ""}><input type="radio" name="duration" checked={seconds === value} onChange={() => setSeconds(value)} />{value ? `${value} giây` : "Không giới hạn"}</label>)}</fieldset>
        <div className={shared.setupActions}><button className={shared.secondary} disabled={names.length >= 10} onClick={() => setNames([...names, `Bạn ${names.length + 1}`])}>+ Thêm người</button><button className={shared.secondary} disabled={names.length <= 2} onClick={() => setNames(names.slice(0,-1))}>Bớt người</button><button className={shared.primary} onClick={start}>Vào vòng <ArrowRight /></button></div><p className={shared.hint}>{roundTopics.length} chủ đề · Nhóm cùng chấm · Đồ uống tự chọn</p>
      </section> : phase === "summary" ? <section className={shared.setup}><p className={shared.eyebrow}>CHỐT SỔ XOAY VÒNG</p><h1>{history.length} vòng.<br /><em>Bao nhiêu pha bí?</em></h1><div className={styles.summary}>{names.map((name,index) => <div key={index}><h2>{name}</h2><strong>{history.filter(result => result.player === index).length}</strong><p>lần nhận 1 ngụm</p></div>)}</div><button className={shared.primary} onClick={() => setPhase("setup")}><RotateCcw /> Chơi lại / đổi người</button></section> : <div className={shared.playLayout}>
        <aside className={shared.sidebar}><p className={shared.eyebrow}>VÒNG {phase === "result" ? history.length : history.length + 1}</p><h2>{names[player]}</h2><p>{phase === "playing" ? "Tới bạn nói một đáp án!" : phase === "result" ? "Nhận 1 ngụm nhé" : "Bạn mở đầu vòng này"}</p><div className={shared.players}>{names.map((name,index) => <div key={index} className={player === index ? shared.activePlayer : ""}><span>{name}{player === index && <small>{phase === "result" ? "Thua vòng này" : "Tới lượt"}</small>}</span><strong>{history.filter(result => result.player === index).length}<small> ngụm</small></strong></div>)}</div><button className={shared.reset} onClick={() => setPhase("summary")}>Dừng & tổng kết <ArrowRight size={18}/></button></aside>
        <section className={shared.stage}>
          {phase === "choose" && <><p className={shared.eyebrow}>MỖI NGƯỜI MỘT ĐÁP ÁN, XOAY ĐẾN KHI CÓ NGƯỜI BÍ</p><h1 ref={heading} tabIndex={-1}>Vòng này nói gì?</h1><button className={shared.primary} onClick={randomTopic}><Shuffle /> Bốc chủ đề ngẫu nhiên</button><p className={styles.pickNote}>Hoặc chọn một chủ đề bên dưới. Chủ đề đã chơi có dấu ✓.</p><div className={shared.topics}>{roundTopics.map(item => <button key={item.id} onClick={() => chooseTopic(item)}><span>{item.icon}</span><strong>{item.name}</strong><small>{seen.includes(item.id) ? "✓ Đã chơi · chọn lại" : "Chưa chơi"}</small></button>)}</div></>}
          {phase === "ready" && <><p className={shared.eyebrow}>CẢ NHÓM THỐNG NHẤT LUẬT RỒI HẴNG BẮT ĐẦU</p><div className={styles.topicIcon}>{topic.icon}</div><h1 ref={heading} tabIndex={-1}>{topic.name}</h1><p className={styles.rule}>{topic.rule}</p><p className={styles.pickNote}>{seconds ? `${seconds} giây mỗi lượt.` : "Không giới hạn thời gian."} Hết giờ sẽ dừng lượt để cả nhóm xác nhận. Người thua vòng này không bị loại khỏi vòng sau.</p><button className={shared.primary} onClick={() => { setPhase("playing"); setRemaining(seconds); actionLock.current = false; focusHeading(); }}><Play /> Bắt đầu · {names[player]}</button></>}
          {phase === "playing" && <><div className={styles.roundTop}><span>{topic.icon} {topic.name}</span><button className={shared.secondary} onClick={() => setPaused(!paused)}>{paused ? <Play /> : <Pause />}{paused ? "Tiếp tục" : "Tạm dừng"}</button></div><h1 ref={heading} tabIndex={-1}>{names[player]}, nói tiếp!</h1><div className={`${styles.clock} ${timedOut || paused ? styles.expired : ""}`} aria-live={timedOut || paused ? "polite" : "off"}>{paused ? "TẠM DỪNG" : seconds === 0 ? "∞" : timedOut ? "HẾT GIỜ" : remaining}<small>{!paused && !timedOut ? (seconds === 0 ? "cứ nghĩ thong thả" : "giây còn lại") : "Cả nhóm cùng xác nhận kết quả"}</small></div><p className={styles.rule}>{topic.rule}</p>
            <label className={styles.answerInput}>Ghi đáp án để nhớ, không bắt buộc<input value={input} maxLength={80} disabled={paused || timedOut} onChange={event => { setInput(event.target.value); setError(""); }} placeholder="Có thể chỉ nói miệng rồi bấm Hợp lệ" /></label>{error && <p role="alert" className={styles.error}>{error}</p>}
            <div className={styles.actions}><button className={shared.primary} disabled={paused || timedOut} onClick={accept}><Check /> Hợp lệ · Người tiếp theo</button><button className={shared.wrong} disabled={paused} onClick={lose}><Wine /> {timedOut ? "Xác nhận hết giờ · Thua" : "Bí / Sai / Trùng · Thua"}</button></div>
            <details className={styles.answerHistory}><summary>Đã nói {answers.length} đáp án · Bấm để xem lại</summary>{answers.length ? <ol>{answers.map((answer,index) => <li key={index}><strong>{names[answer.player]}</strong><span>{answer.text || "Đã nói miệng, không ghi lại"}</span></li>)}</ol> : <p>Chưa có đáp án nào.</p>}</details>
          </>}
          {phase === "result" && <div className={styles.result}><p className={shared.eyebrow}>{topic.icon} {topic.name}</p><h1 ref={heading} tabIndex={-1}>{names[player]} bí rồi!</h1><div className={styles.topicIcon}>🥂</div><h2>Nhận 1 ngụm</h2><p>Vòng này cả nhóm đã nói được <strong>{answers.length}</strong> đáp án hợp lệ.</p><button className={shared.primary} onClick={newRound}>Vòng mới · {names[(player + 1) % names.length]} mở đầu <ArrowRight /></button></div>}
        </section>
      </div>}
    </main>
  </div>;
}
