"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Check, RotateCcw, X } from "lucide-react";
import { ThemeToggle } from "~/components/layouts/theme-toggle";
import { tripFont } from "../../trip-font";
import tripStyles from "../../trip.module.css";
import { drawRound, topics, type Topic } from "./questions";
import styles from "./topic-game.module.css";

type Round = { player: number; topic: Topic; questions: ReturnType<typeof drawRound>; answers: boolean[] };
type Phase = "setup" | "topics" | "question" | "result";

export default function TopicGame() {
  const [names, setNames] = useState(["Bạn 1", "Bạn 2", "Bạn 3"]);
  const [phase, setPhase] = useState<Phase>("setup");
  const [player, setPlayer] = useState(0);
  const [round, setRound] = useState<Round | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [graded, setGraded] = useState<boolean | null>(null);
  const [history, setHistory] = useState<Round[]>([]);
  const [seen, setSeen] = useState<string[]>([]);
  const [roundNumber, setRoundNumber] = useState(1);
  const gradeLock = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const question = round?.questions[round.answers.length];
  function focusStage() {
    requestAnimationFrame(() => { heading.current?.focus({ preventScroll: true }); heading.current?.scrollIntoView({ block: "start", behavior: "instant" }); });
  }
  function choose(topic: Topic) {
    const questions = drawRound(topic, seen);
    setRound({ player, topic, questions, answers: [] });
    setSeen(previous => [...previous, ...questions.map(question => question[0])]);
    setRevealed(false); setGraded(null); gradeLock.current = false; setPhase("question"); focusStage();
  }
  function grade(correct: boolean) {
    if (!revealed || !round || graded !== null || gradeLock.current) return;
    gradeLock.current = true; setGraded(correct);
  }
  function nextQuestion() {
    if (!round || graded === null) return;
    const updated = { ...round, answers: [...round.answers, graded] };
    setRound(updated); setRevealed(false); setGraded(null); gradeLock.current = false;
    if (updated.answers.length === 5) { setHistory(previous => [...previous, updated]); setPhase("result"); }
    focusStage();
  }
  function nextPlayer() {
    setPlayer((player + 1) % names.length); setRoundNumber(roundNumber + 1);
    setRound(null); setPhase("topics"); focusStage();
  }
  function reset() {
    setPhase("setup"); setRound(null); setHistory([]); setSeen([]); setPlayer(0); setRoundNumber(1);
    setRevealed(false); setGraded(null); gradeLock.current = false;
  }
  const wrong = round?.answers.filter(answer => !answer).length ?? 0;
  return <div className={`${tripStyles.trip} ${tripFont.variable} ${styles.page}`} lang="vi">
    <header className={`dalat-header ${styles.header}`}><Link href="/me/travel/dalat/games"><ArrowLeft /> Các trò chơi</Link><span>5 CÂU · MẤY LY?</span><ThemeToggle className="dalat-theme-toggle" /></header>
    <main className={styles.main}>
      {phase === "setup" ? <section className={styles.setup}>
        <p className={styles.eyebrow}>🎯 CHỌN ĐÚNG SỞ TRƯỜNG · ĐỪNG CHỌN THEO SỞ THÍCH</p>
        <h1>5 câu.<br /><em>Mấy ly đây?</em></h1>
        <p>Mỗi người chọn 1 chủ đề, trả lời miệng 5 câu.<br /><strong>Sai bao nhiêu câu, uống bấy nhiêu ly.</strong></p>
        <div className={styles.names}>{names.map((name, index) => <label key={index}>Người chơi {index + 1}<input maxLength={24} value={name} onChange={event => setNames(names.map((old, i) => i === index ? event.target.value : old))} /></label>)}</div>
        <div className={styles.setupActions}><button className={styles.secondary} disabled={names.length >= 10} onClick={() => setNames([...names, `Bạn ${names.length + 1}`])}>+ Thêm người</button><button className={styles.secondary} disabled={names.length <= 2} onClick={() => setNames(names.slice(0, -1))}>Bớt người</button><button className={styles.primary} onClick={() => { setNames(names.map((name, i) => name.trim() || `Bạn ${i + 1}`)); setPhase("topics"); focusStage(); }}>Vào cuộc <ArrowRight /></button></div>
        <p className={styles.hint}>{topics.length} chủ đề · 5 câu ngẫu nhiên mỗi lượt · Hiện đáp án rồi cả hội chấm Đúng / Sai</p>
      </section> : <div className={styles.playLayout}>
        <aside className={styles.sidebar}>
          <p className={styles.eyebrow}>LƯỢT {roundNumber}</p><h2>{names[player]}</h2><p>{phase === "topics" ? "Chọn sở trường của mình!" : `${round?.topic.icon} ${round?.topic.name}`}</p>
          <div className={styles.players}>{names.map((name, index) => { const rounds = history.filter(item => item.player === index); const total = rounds.reduce((sum, item) => sum + item.answers.filter(answer => !answer).length, 0); return <div key={index} className={index === player ? styles.activePlayer : ""}><span>{name}{index === player && <small>Đang chơi</small>}</span><strong>{total} <small>ly</small></strong></div>; })}</div>
          <button className={styles.reset} onClick={reset}><RotateCcw size={18} /> Kết thúc / chơi lại</button>
        </aside>
        <section className={styles.stage}>
          {phase === "topics" && <><p className={styles.eyebrow}>CHỌN 1 TRONG {topics.length} CHỦ ĐỀ</p><h1 ref={heading} tabIndex={-1}>Tự tin môn nào?</h1><p className={styles.subtitle}>5 câu hỏi. Chọn xong là chốt, không quay xe nha!</p><div className={styles.topics}>{topics.map(topic => <button key={topic.id} onClick={() => choose(topic)}><span aria-hidden="true">{topic.icon}</span><strong>{topic.name}</strong><small>{topic.description}</small></button>)}</div></>}
          {phase === "question" && round && question && <>
            <div className={styles.questionTop}><span>{round.topic.icon} {round.topic.name}</span><strong>Câu {round.answers.length + 1} / 5</strong></div>
            <div className={styles.progress} aria-label="Kết quả 5 câu">{Array.from({length:5}, (_, index) => { const answer = index < round.answers.length ? round.answers[index] : index === round.answers.length ? graded : null; return <span key={index} className={answer === true ? styles.correct : answer === false ? styles.incorrect : index === round.answers.length ? styles.currentQuestion : ""}>{answer === true ? <Check /> : answer === false ? <X /> : index + 1}</span>; })}</div>
            <h1 ref={heading} tabIndex={-1} className={styles.question}>{question[0]}</h1>
            {question[2] && <div className={styles.logoFrame}><Image src={question[2]} alt="Logo thương hiệu cần đoán" width={360} height={220} unoptimized /></div>}
            {!revealed ? <><p className={styles.subtitle}>Trả lời thành tiếng, rồi mở đáp án để cả hội chấm.</p><button className={styles.primary} onClick={() => setRevealed(true)}>Hiện đáp án <ArrowRight /></button></> : <>
              <div className={styles.answer}><small>ĐÁP ÁN</small><strong>{question[1]}</strong></div>
              {graded === null ? <div className={styles.grading}><button className={styles.primary} onClick={() => grade(true)}><Check /> Đúng</button><button className={styles.wrong} onClick={() => grade(false)}><X /> Sai</button></div> : <div className={styles.feedback} aria-live="polite"><p>{graded ? "Đúng rồi! Qua được một câu 🎉" : "Sai rồi! Ghi nhận thêm 1 ly 🥂"}</p><button className={styles.primary} onClick={nextQuestion}>{round.answers.length === 4 ? "Xem kết quả lượt này" : "Câu tiếp theo"}<ArrowRight /></button></div>}
            </>}
          </>}
          {phase === "result" && round && <div className={styles.result}><p className={styles.eyebrow}>HOÀN THÀNH 5 CÂU · {round.topic.name}</p><h1 ref={heading} tabIndex={-1}>{wrong === 0 ? "Thoát ly xuất sắc!" : `${names[player]}, nhận ly thôi!`}</h1><div className={styles.cupCount}>{wrong}<span>ly</span></div><p>Đúng <strong>{5 - wrong}/5</strong> câu · Sai <strong>{wrong}/5</strong> câu</p><div className={styles.review}>{round.questions.map(([prompt, answer], index) => <details key={prompt}><summary><span className={round.answers[index] ? styles.reviewCorrect : styles.reviewWrong}>{round.answers[index] ? <Check /> : <X />}</span><span>{prompt}</span></summary><p>{answer}</p></details>)}</div><button className={styles.primary} onClick={nextPlayer}>Tới lượt {names[(player + 1) % names.length]} <ArrowRight /></button></div>}
        </section>
      </div>}
    </main>
  </div>;
}
