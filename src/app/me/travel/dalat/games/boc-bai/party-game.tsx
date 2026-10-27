"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, RotateCcw, Shuffle, SkipForward } from "lucide-react";
import { ThemeToggle } from "~/components/layouts/theme-toggle";
import { tripFont } from "../../trip-font";
import tripStyles from "../../trip.module.css";
import shared from "../5-cau-5-ly/topic-game.module.css";
import { kinds, partyCards, shuffleCards, type CardKind, type PartyCard } from "./cards";
import styles from "./party-game.module.css";

type Turn = { player: number; card: PartyCard; skipped: boolean; choice: "truth" | "dare" | null };
const kindList = Object.keys(kinds) as CardKind[];

export default function PartyGame() {
  const [names, setNames] = useState(["Bạn 1", "Bạn 2", "Bạn 3"]);
  const [enabled, setEnabled] = useState<CardKind[]>(kindList);
  const [phase, setPhase] = useState<"setup" | "play" | "summary">("setup");
  const [deck, setDeck] = useState<PartyCard[]>([]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [choice, setChoice] = useState<"truth" | "dare" | null>(null);
  const actionLock = useRef(false);
  const stage = useRef<HTMLDivElement>(null);
  const player = turns.length % names.length;
  const card = deck[turns.length];
  const kind = card ? kinds[card.kind] : null;
  const text = card?.kind === "choice" && choice ? card[choice] : card?.text;
  function focusStage() { requestAnimationFrame(() => stage.current?.focus({ preventScroll: true })); }
  function start() {
    if (!enabled.length) return;
    setNames(names.map((name, i) => name.trim() || `Bạn ${i + 1}`));
    setDeck(shuffleCards(enabled)); setTurns([]); setRevealed(false); setChoice(null);
    actionLock.current = false; setPhase("play"); focusStage();
  }
  function finish(skipped: boolean) {
    if (!card || !revealed || actionLock.current || (!skipped && card.kind === "choice" && !choice)) return;
    actionLock.current = true;
    setTurns(previous => [...previous, { player, card, skipped, choice }]);
    setRevealed(false); setChoice(null);
    if (turns.length + 1 === deck.length) setPhase("summary");
    focusStage();
  }
  function draw() { actionLock.current = false; setRevealed(true); focusStage(); }
  return <div className={`${tripStyles.trip} ${tripFont.variable} ${styles.page}`} lang="vi">
    <header className={`dalat-header ${shared.header}`}><Link href="/me/travel/dalat/games"><ArrowLeft /> Các trò chơi</Link><span>BỐC BÀI · THẬT HAY LÀM?</span><ThemeToggle className="dalat-theme-toggle" /></header>
    <main className={shared.main}>
      {phase === "setup" ? <section className={shared.setup}>
        <p className={shared.eyebrow}>🃏 MỘT LÁ BÀI · MỘT CHUYỆN CHƯA KỂ</p>
        <h1>Bốc đi.<br /><em>Ngại gì tối nay!</em></h1>
        <p>{partyCards.length} lá bài, có {partyCards.filter(card => card.bold).length} lá 🔥 Bung nóc: tình trường, thả thính, roast và những pha quê không cứu nổi.</p>
        <div className={shared.names}>{names.map((name, index) => <label key={index}>Người chơi {index + 1}<input value={name} maxLength={24} onChange={event => setNames(names.map((old, i) => i === index ? event.target.value : old))} /></label>)}</div>
        <fieldset className={styles.filters}><legend>Chọn loại bài cho tối nay</legend>{kindList.map(key => <label key={key} className={enabled.includes(key) ? styles.enabled : ""}><input type="checkbox" checked={enabled.includes(key)} onChange={() => setEnabled(previous => previous.includes(key) ? previous.filter(item => item !== key) : [...previous, key])} /><span>{kinds[key].icon} {kinds[key].name}</span><small>{partyCards.filter(card => card.kind === key).length} lá</small></label>)}</fieldset>
        <p className={styles.rule}>Lá drinking: 1 ngụm đồ uống bạn chọn. Có thể bỏ qua bất kỳ lá nào, không phạt thêm.</p>
        <div className={shared.setupActions}><button className={shared.secondary} disabled={names.length >= 10} onClick={() => setNames([...names, `Bạn ${names.length + 1}`])}>+ Thêm người</button><button className={shared.secondary} disabled={names.length <= 2} onClick={() => setNames(names.slice(0, -1))}>Bớt người</button><button className={shared.primary} disabled={!enabled.length} onClick={start}><Shuffle /> Trộn {partyCards.filter(card => enabled.includes(card.kind)).length} lá & chơi</button></div>
      </section> : phase === "summary" ? <section className={`${shared.setup} ${styles.summary}`}>
        <p className={shared.eyebrow}>🎉 {turns.length === deck.length ? "HẾT BÀI RỒI!" : "CHỐT SỔ TỐI NAY"}</p><h1>Cả hội đã bốc<br /><em>{turns.length} lá bài.</em></h1>
        <div className={styles.summaryGrid}>{names.map((name, index) => { const played = turns.filter(turn => turn.player === index); return <div key={index}><h2>{name}</h2><strong>{played.filter(turn => !turn.skipped).length} <small>hoàn thành</small></strong><p>{played.filter(turn => turn.skipped).length} lá bỏ qua</p></div>; })}</div>
        <button className={shared.primary} onClick={() => setPhase("setup")}><RotateCcw /> Chơi lại / đổi người</button>
      </section> : card && kind && <div className={shared.playLayout}>
        <aside className={shared.sidebar}><p className={shared.eyebrow}>LƯỢT {turns.length + 1} · CÒN {deck.length - turns.length} LÁ</p><h2>{names[player]}</h2><p>Tới bạn bốc bài!</p>
          <div className={shared.players}>{names.map((name, index) => <div key={index} className={player === index ? shared.activePlayer : ""}><span>{name}{player === index && <small>Đang chơi</small>}</span><strong>{turns.filter(turn => turn.player === index && !turn.skipped).length}<small> lá</small></strong></div>)}</div>
          <button className={shared.reset} onClick={() => setPhase("summary")}>Kết thúc & xem tổng kết <ArrowRight size={18} /></button>
        </aside>
        <div ref={stage} tabIndex={-1} className={styles.stage}>
          {!revealed ? <button className={styles.deck} onClick={draw} aria-label={`${names[player]}, bốc một lá bài ngẫu nhiên`}><span className={styles.corner}>? ✦</span><span className={styles.deckIcon}>🃏</span><strong>Số phận<br />trong tay bạn.</strong><span className={styles.drawLabel}>CHẠM ĐỂ BỐC BÀI <ArrowRight /></span><span className={styles.cornerBottom}>✦ ?</span></button> : <article className={`${styles.face} ${styles[card.kind]}`}>
            <div className={styles.faceTop}><span>{kind.icon} {kind.name}</span><small>LÁ {turns.length + 1} / {deck.length}</small></div>
            <p className={styles.subtitle}>{card.bold ? "🔥 BUNG NÓC · Bạn thân mới dám chơi" : kind.subtitle}</p>
            <div className={styles.prompt} aria-live="polite"><h1>{text}</h1></div>
            {card.kind === "choice" && !choice ? <div className={styles.choiceButtons}><button className={shared.primary} onClick={() => setChoice("truth")}>🤫 Chọn nói thật</button><button className={shared.secondary} onClick={() => setChoice("dare")}>🤡 Chọn dám làm</button></div> : <><p className={styles.smallNote}>{card.kind === "choice" ? (choice === "truth" ? "🤫 Bạn đã chọn nói thật" : "🤡 Bạn đã chọn dám làm") : card.kind === "drink" ? "Đồ uống tùy chọn · Một ngụm thôi nhé" : "Roast chuyện vui, không lôi bí mật của người khác. Bạn diễn đồng ý rồi mới diễn nhé."}</p><button className={shared.primary} onClick={() => finish(false)}><Check /> Xong rồi · {turns.length + 1 === deck.length ? "Xem tổng kết" : `Tới ${names[(player + 1) % names.length]}`}</button></>}
            <button className={styles.skip} onClick={() => finish(true)}><SkipForward size={20} /> Bỏ qua lá này · không phạt</button>
          </article>}
          {turns.length > 0 && <p className={styles.lastTurn}>Lượt trước: <strong>{names[turns[turns.length - 1].player]}</strong> · {kinds[turns[turns.length - 1].card.kind].name} · {turns[turns.length - 1].skipped ? "Đã bỏ qua" : "Đã hoàn thành"}</p>}
        </div>
      </div>}
    </main>
  </div>;
}
