"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Heart, RotateCcw, Shuffle, SkipForward } from "lucide-react";
import { ThemeToggle } from "~/components/layouts/theme-toggle";
import { tripFont } from "../../trip-font";
import tripStyles from "../../trip.module.css";
import shared from "../5-cau-5-ly/topic-game.module.css";
import cards from "../boc-bai/party-game.module.css";
import styles from "./couple.module.css";
import { coupleCards, coupleKinds, drawCoupleCards, formatCouplePrompt, type CoupleCard } from "./cards";

type Outcome = "match" | "different" | "done" | "skip";
type Turn = { player: number; card: CoupleCard; outcome: Outcome };
export default function CoupleGame() {
  const [names, setNames] = useState(["Bạn", "Người yêu"]);
  const [limit, setLimit] = useState(10);
  const [phase, setPhase] = useState<"setup" | "play" | "summary">("setup");
  const [deck, setDeck] = useState<CoupleCard[]>([]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const actionLock = useRef(false);
  const stage = useRef<HTMLDivElement>(null);
  const index = outcome === null ? turns.length : turns.length - 1;
  const player = index % 2;
  const partner = names[1 - player];
  const card = deck[index];
  const kind = card ? coupleKinds[card.kind] : null;
  const hearts = turns.filter(turn => turn.outcome === "match" || turn.outcome === "done").length;
  const guessTurns = turns.filter(turn => turn.card.kind === "guess" && turn.outcome !== "skip");
  function focusStage() { requestAnimationFrame(() => stage.current?.focus({ preventScroll: true })); }
  function start() {
    setNames(names.map((name, i) => name.trim() || (i === 0 ? "Bạn" : "Người yêu")));
    setDeck(drawCoupleCards(limit)); setTurns([]); setOutcome(null); setRevealed(false);
    actionLock.current = false; setPhase("play"); focusStage();
  }
  function finish(value: Outcome) {
    if (!revealed || outcome !== null || actionLock.current || !card) return;
    actionLock.current = true;
    setTurns(previous => [...previous, { player, card, outcome: value }]); setOutcome(value); focusStage();
  }
  function next() {
    setRevealed(false); setOutcome(null); actionLock.current = false;
    if (turns.length === deck.length) setPhase("summary");
    focusStage();
  }
  const messages: Record<Outcome, string> = {
    match: "Đúng ý rồi! Thêm một nhịp hiểu nhau. 💗",
    different: "Khác một chút, biết thêm về nhau một chút. 💭",
    done: "Thêm một kỷ niệm nhỏ của hai đứa. 💞",
    skip: "Để dành lá này cho lúc khác nhé. 🌷",
  };
  return <div className={`${tripStyles.trip} ${tripFont.variable} ${styles.page}`} lang="vi">
    <header className={`dalat-header ${shared.header}`}><Link href="/me/travel/dalat/games"><ArrowLeft /> Các trò chơi</Link><span>HAI ĐỨA MÌNH</span><ThemeToggle className="dalat-theme-toggle" /></header>
    <main className={shared.main}>
      {phase === "setup" ? <section className={shared.setup}>
        <p className={shared.eyebrow}>💗 MỘT TỐI CHỈ DÀNH CHO HAI ĐỨA</p><h1>Yêu nhau rồi.<br /><em>Hiểu nhau chưa?</em></h1>
        <p>{coupleCards.length} lá bài dành riêng cho hai người yêu nhau.<br />Luân phiên đoán ý, chia sẻ và làm một điều ngọt ngào.</p>
        <div className={`${shared.names} ${styles.twoNames}`}>{names.map((name, i) => <label key={i}>{i === 0 ? "Người thứ nhất" : "Người thứ hai"}<input maxLength={24} value={name} onChange={event => setNames(names.map((old, index) => index === i ? event.target.value : old))} /></label>)}</div>
        <fieldset className={styles.length}><legend>Mình chơi bao nhiêu lá?</legend>{[10,20,coupleCards.length].map(count => <label key={count} className={limit === count ? styles.chosen : ""}><input type="radio" name="length" checked={limit === count} onChange={() => setLimit(count)} />{count === coupleCards.length ? `Tất cả ${count} lá` : `${count} lá`}</label>)}</fieldset>
        <div className={styles.categories}><span>💭 Đoán ý người yêu</span><span>💌 Chuyện hai đứa</span><span>💞 Thử thách tình yêu</span></div>
        <p className={styles.note}>Trả lời miệng, cùng xác nhận kết quả. Lá nào chưa thoải mái thì bỏ qua, không phạt.</p><button className={shared.primary} onClick={start}><Shuffle /> Bắt đầu buổi hẹn</button>
      </section> : phase === "summary" ? <section className={shared.setup}>
        <p className={shared.eyebrow}>💌 CHUYỆN CỦA {names[0]} & {names[1]}</p><h1>{turns.length} lá bài.<br /><em>Gần nhau thêm chút.</em></h1>
        <div className={styles.total}><Heart fill="currentColor" /><strong>{hearts}</strong><span>tim của hai đứa</span></div>
        <div className={styles.stats}><div><strong>{guessTurns.filter(turn => turn.outcome === "match").length}/{guessTurns.length}</strong><span>lần đoán đúng ý</span></div><div><strong>{turns.filter(turn => turn.card.kind === "share" && turn.outcome === "done").length}</strong><span>chuyện đã chia sẻ</span></div><div><strong>{turns.filter(turn => turn.card.kind === "dare" && turn.outcome === "done").length}</strong><span>thử thách hoàn thành</span></div></div>
        <p className={styles.note}>Tim là những khoảnh khắc vui trong game, không phải thước đo tình yêu nhé.</p><button className={shared.primary} onClick={() => setPhase("setup")}><RotateCcw /> Chơi thêm một buổi hẹn</button>
      </section> : card && kind && <div className={shared.playLayout}>
        <aside className={shared.sidebar}><p className={shared.eyebrow}>LÁ {index + 1} / {deck.length}</p><h2>{names[player]}</h2><p>{card.kind === "guess" ? `Đoán ý ${partner}` : "Tới lượt bạn mở lòng"}</p><div className={shared.players}>{names.map((name,i) => <div key={i} className={player === i ? shared.activePlayer : ""}><span>{name}{player === i && <small>Đang chơi</small>}</span><Heart size={24} /></div>)}</div><div className={styles.pairScore}><Heart fill="currentColor" /><strong>{hearts}</strong><span>tim chung</span></div><button className={shared.reset} onClick={() => setPhase("summary")}>Kết thúc & xem kỷ niệm <ArrowRight size={18} /></button></aside>
        <div ref={stage} tabIndex={-1} className={cards.stage}>
          {!revealed ? <button className={`${cards.deck} ${styles.loveDeck}`} onClick={() => { setRevealed(true); focusStage(); }} aria-label={`${names[player]}, bốc một lá cho hai đứa`}><span className={cards.corner}>♡ ✦</span><span className={cards.deckIcon}>💌</span><strong>Một lá bài.<br />Một chút yêu.</strong><span className={cards.drawLabel}>BỐC CHO HAI ĐỨA <ArrowRight /></span><span className={cards.cornerBottom}>✦ ♡</span></button> : <article className={`${cards.face} ${styles.loveFace}`}><div className={cards.faceTop}><span>{kind.icon} {kind.name}</span><small>LÁ {index + 1}</small></div><p className={cards.subtitle}>{kind.hint}</p><div className={cards.prompt} aria-live="polite"><h1>{formatCouplePrompt(card.text, partner)}</h1></div>
            {outcome === null ? <>{card.kind === "guess" ? <div className={styles.actions}><button className={shared.primary} onClick={() => finish("match")}><Heart /> Đúng ý · +1 tim</button><button className={shared.secondary} onClick={() => finish("different")}>Chưa trùng ý</button></div> : <button className={shared.primary} onClick={() => finish("done")}><Check /> {card.kind === "share" ? "Đã chia sẻ" : "Đã thực hiện"} · +1 tim</button>}<button className={cards.skip} onClick={() => finish("skip")}><SkipForward size={20} /> Để dành lá này · không phạt</button></> : <div className={styles.outcome} aria-live="polite"><p>{messages[outcome]}</p><button className={shared.primary} onClick={next}>{turns.length === deck.length ? "Xem kỷ niệm của hai đứa" : `Tới ${names[turns.length % 2]}`}<ArrowRight /></button></div>}
          </article>}
        </div>
      </div>}
    </main>
  </div>;
}
