"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, LockKeyhole, RotateCcw, Shuffle, Wine } from "lucide-react";
import { ThemeToggle } from "~/components/layouts/theme-toggle";
import { tripFont } from "../../trip-font";
import tripStyles from "../../trip.module.css";
import shared from "../5-cau-5-ly/topic-game.module.css";
import cards from "../boc-bai/party-game.module.css";
import styles from "./secrets.module.css";
import { secretCards, shuffleSecrets, type SecretCard } from "./cards";

type Decision = "answer" | "drink";
type Turn = { player: number; decision: Decision };

export default function SecretsGame() {
  const [names, setNames] = useState(["Bạn 1", "Bạn 2", "Bạn 3"]);
  const [phase, setPhase] = useState<"setup" | "play" | "summary">("setup");
  const [deck, setDeck] = useState<SecretCard[]>([]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [decision, setDecision] = useState<Decision | null>(null);
  const actionLock = useRef(false);
  const stage = useRef<HTMLDivElement>(null);
  const turnIndex = decision === null ? turns.length : turns.length - 1;
  const player = turnIndex % names.length;
  const card = deck[turnIndex];
  function focusStage() { requestAnimationFrame(() => stage.current?.focus({ preventScroll: true })); }
  function start() {
    setNames(names.map((name, index) => name.trim() || `Bạn ${index + 1}`));
    setDeck(shuffleSecrets()); setTurns([]); setRevealed(false); setDecision(null);
    actionLock.current = false; setPhase("play"); focusStage();
  }
  function choose(value: Decision) {
    if (!revealed || decision !== null || actionLock.current || !card) return;
    actionLock.current = true;
    setTurns(previous => [...previous, { player, decision: value }]);
    setDecision(value); focusStage();
  }
  function next() {
    setDecision(null); setRevealed(false); actionLock.current = false;
    if (turns.length === deck.length) setPhase("summary");
    focusStage();
  }
  return <div className={`${tripStyles.trip} ${tripFont.variable} ${styles.page}`} lang="vi">
    <header className={`dalat-header ${shared.header}`}><Link href="/me/travel/dalat/games"><ArrowLeft /> Các trò chơi</Link><span>BÍ MẬT KHÓ NÓI</span><ThemeToggle className="dalat-theme-toggle" /></header>
    <main className={shared.main}>
      {phase === "setup" ? <section className={shared.setup}>
        <p className={shared.eyebrow}>🔐 CÓ NHỮNG CHUYỆN · CHỈ HỘI NÀY MỚI ĐƯỢC NGHE</p>
        <h1>Nói thật.<br /><em>Hay giữ bí mật?</em></h1>
        <p>{secretCards.length} câu hỏi về tình cảm, bạn bè, cái tôi và những chuyện chưa kể.<br /><strong>Trả lời thật lòng, hoặc uống 1 ngụm để qua lượt.</strong></p>
        <div className={shared.names}>{names.map((name, index) => <label key={index}>Người chơi {index + 1}<input value={name} maxLength={24} onChange={event => setNames(names.map((old, i) => i === index ? event.target.value : old))} /></label>)}</div>
        <p className={styles.agreement}>Chỉ kể chuyện của mình, không cần nêu tên người khác. Không ghi âm, không quay lại lời chia sẻ. Đồ uống tự chọn; ai cũng có thể dừng bất cứ lúc nào.</p>
        <div className={shared.setupActions}><button className={shared.secondary} disabled={names.length >= 10} onClick={() => setNames([...names, `Bạn ${names.length + 1}`])}>+ Thêm người</button><button className={shared.secondary} disabled={names.length <= 2} onClick={() => setNames(names.slice(0, -1))}>Bớt người</button><button className={shared.primary} onClick={start}><Shuffle /> Trộn bài, bắt đầu</button></div>
      </section> : phase === "summary" ? <section className={shared.setup}>
        <p className={shared.eyebrow}>🌙 CHUYỆN TỐI NAY, GIỮ Ở TỐI NAY</p><h1>{turns.length} lá bài.<br /><em>Gần nhau thêm chút.</em></h1>
        <div className={cards.summaryGrid}>{names.map((name, index) => <div key={index}><h2>{name}</h2><strong>{turns.filter(turn => turn.player === index && turn.decision === "answer").length} <small>lần chia sẻ</small></strong><p>{turns.filter(turn => turn.player === index && turn.decision === "drink").length} lần chọn uống</p></div>)}</div>
        <button className={shared.primary} onClick={() => setPhase("setup")}><RotateCcw /> Chơi lại / đổi người</button>
      </section> : card && <div className={shared.playLayout}>
        <aside className={shared.sidebar}><p className={shared.eyebrow}>LƯỢT {turnIndex + 1} / {deck.length}</p><h2>{names[player]}</h2><p>Một lá bài. Một lựa chọn.</p>
          <div className={shared.players}>{names.map((name, index) => <div key={index} className={player === index ? shared.activePlayer : ""}><span>{name}{player === index && <small>Đang chơi</small>}</span><strong>{turns.filter(turn => turn.player === index).length}<small> lượt</small></strong></div>)}</div>
          <button className={shared.reset} onClick={() => setPhase("summary")}>Dừng & xem tổng kết <ArrowRight size={18} /></button>
          <p className={styles.sideNote}>Không cần nhập lời trả lời.<br />Game chỉ đếm lựa chọn của bạn.</p>
        </aside>
        <div ref={stage} tabIndex={-1} className={cards.stage}>
          {!revealed ? <button className={`${cards.deck} ${styles.secretDeck}`} onClick={() => { setRevealed(true); focusStage(); }} aria-label={`${names[player]}, bốc một lá bí mật`}><span className={cards.corner}>✦ ?</span><span className={cards.deckIcon}>🔐</span><strong>Có dám<br />nói thật không?</strong><span className={cards.drawLabel}>BỐC MỘT BÍ MẬT <ArrowRight /></span><span className={cards.cornerBottom}>? ✦</span></button> : <article className={`${cards.face} ${styles.secretFace}`}>
            <div className={cards.faceTop}><span>{card.icon} {card.topic}</span><small>LÁ {turnIndex + 1} / {deck.length}</small></div>
            <p className={cards.subtitle}>Không có đúng sai. Chỉ có điều bạn muốn nói.</p>
            <div className={cards.prompt} aria-live="polite"><h1>{card.question}</h1></div>
            {decision === null ? <><div className={styles.decisions}><button className={shared.primary} onClick={() => choose("answer")}><Check /> Đã trả lời thật</button><button className={styles.drink} onClick={() => choose("drink")}><Wine /> Không nói · uống 1 ngụm</button></div><p className={styles.answerHint}>Nói câu trả lời trước, rồi bấm để ghi nhận lựa chọn.</p></> : <div className={styles.outcome} aria-live="polite"><p>{decision === "answer" ? "🤍 Cảm ơn bạn đã thật lòng." : "🔐 Bí mật vẫn là của bạn. Nhấp 1 ngụm đồ uống bạn chọn."}</p><button className={shared.primary} onClick={next}>{turns.length === deck.length ? "Xem tổng kết" : `Tới lượt ${names[turns.length % names.length]}`}<ArrowRight /></button></div>}
            <p className={styles.footerNote}><LockKeyhole size={16} /> Nghe để hiểu nhau, không dùng chuyện này để trêu lại sau.</p>
          </article>}
        </div>
      </div>}
    </main>
  </div>;
}
